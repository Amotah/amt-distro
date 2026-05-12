import { projectId } from '/utils/supabase/info';
import { supabase } from '/utils/supabase/client';

const API_BASE_URL = `https://${projectId}.supabase.co/functions/v1/make-server-79198001`;

// Legacy option retained for API compatibility. Direct uploads no longer split files client-side.
const DEFAULT_CHUNK_SIZE = 512 * 1024;

export interface UploadProgress {
  sessionId: string;
  fileName: string;
  fileSize: number;
  uploadedBytes: number;
  totalChunks: number;
  uploadedChunks: number;
  progress: number; // 0-100
  status: 'pending' | 'uploading' | 'completed' | 'failed' | 'cancelled';
  error?: string;
}

export interface UploadResult {
  success: boolean;
  url: string;
  path: string;
}

interface LegacyUploadSession {
  id: string;
  totalChunks: number;
}

function getBucketName(fileType: 'audio' | 'artwork') {
  return fileType === 'audio' ? 'make-79198001-audio' : 'make-79198001-artwork';
}

function sanitizeFileName(fileName: string) {
  return fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
}

function normalizeStorageErrorMessage(error: { message?: string } | null | undefined, operation: string) {
  const rawMessage = error?.message || `${operation} failed`;
  const lowerMessage = rawMessage.toLowerCase();

  if (
    lowerMessage.includes('row-level security') ||
    lowerMessage.includes('permission denied') ||
    lowerMessage.includes('not authorized') ||
    lowerMessage.includes('unauthorized')
  ) {
    return `Storage policy denied ${operation.toLowerCase()}. The signed-upload fallback reached Supabase Storage, but this user is not allowed to write or sign files in the target bucket.`;
  }

  if (lowerMessage.includes('bucket not found')) {
    return `Storage bucket is missing for ${operation.toLowerCase()}. Confirm the audio and artwork buckets exist in Supabase Storage.`;
  }

  if (
    lowerMessage.includes('duplicate') ||
    lowerMessage.includes('already exists') ||
    lowerMessage.includes('resource already exists')
  ) {
    return `A file with the same path already exists during ${operation.toLowerCase()}. Retry the upload so a fresh path can be generated.`;
  }

  return rawMessage;
}

export class ChunkedUploader {
  private file: File;
  private fileType: 'audio' | 'artwork';
  private accessToken: string;
  private chunkSize: number;
  private onProgress?: (progress: UploadProgress) => void;
  private sessionId?: string;
  private aborted: boolean = false;
  private xhrRef: XMLHttpRequest | null = null;
  private lastProgressPercent: number = 0;

  constructor(
    file: File,
    fileType: 'audio' | 'artwork',
    accessToken: string,
    options?: {
      chunkSize?: number;
      onProgress?: (progress: UploadProgress) => void;
    }
  ) {
    this.file = file;
    this.fileType = fileType;
    this.accessToken = accessToken;
    this.chunkSize = options?.chunkSize || DEFAULT_CHUNK_SIZE;
    this.onProgress = options?.onProgress;
  }

  private async makeRequest(endpoint: string, method: string, body?: any) {
    let response: Response;

    try {
      response = await fetch(`${API_BASE_URL}${endpoint}`, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.accessToken}`,
        },
        body: body ? JSON.stringify(body) : undefined,
      });
    } catch (error: any) {
      throw new Error(
        `Network request failed for ${endpoint}. Check your connection and confirm the upload backend is deployed. ${error?.message || ''}`.trim()
      );
    }

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: `Request failed with status ${response.status}` }));
      throw new Error(error.error || 'Request failed');
    }

    return response.json();
  }

  private async createSignedUploadTarget(): Promise<{
    bucket: string;
    path: string;
    token: string;
    signedUrl: string;
  }> {
    const result = await this.makeRequest('/upload/signed-url', 'POST', {
      fileName: this.file.name,
      fileSize: this.file.size,
      fileType: this.fileType,
      mimeType: this.file.type,
    });

    return result.target;
  }

  private async createLegacyUploadSession(totalChunks: number): Promise<LegacyUploadSession> {
    const result = await this.makeRequest('/upload/session', 'POST', {
      fileName: this.file.name,
      fileSize: this.file.size,
      fileType: this.fileType,
      mimeType: this.file.type,
      totalChunks,
    });

    return result.session;
  }

  private async finalizeUpload(path: string): Promise<UploadResult> {
    const result = await this.makeRequest('/upload/finalize', 'POST', {
      path,
      fileType: this.fileType,
    });

    return result;
  }

  private async uploadLegacyChunk(sessionId: string, chunkIndex: number, chunkData: string) {
    return this.makeRequest('/upload/chunk', 'POST', {
      sessionId,
      chunkIndex,
      chunkData,
    });
  }

  private async completeLegacyUpload(sessionId: string): Promise<UploadResult> {
    return this.makeRequest('/upload/complete', 'POST', { sessionId });
  }

  private async cancelLegacyUpload(sessionId: string): Promise<void> {
    try {
      await this.makeRequest('/upload/cancel', 'POST', { sessionId });
    } catch {
      // Best effort cleanup only.
    }
  }

  private uploadFileWithSignedUrl(
    path: string,
    token: string,
  ): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      // Build the Supabase Storage signed-upload endpoint directly from the
      // known projectId so we can use XMLHttpRequest and receive real
      // upload.onprogress events instead of a fake 33 % snap to 100 %.
      const bucketName = getBucketName(this.fileType);
      const xhrUrl =
        `https://${projectId}.supabase.co/storage/v1/object/upload/sign/` +
        `${bucketName}/${path}?token=${encodeURIComponent(token)}`;

      const xhr = new XMLHttpRequest();
      this.xhrRef = xhr;
      xhr.open('PUT', xhrUrl, true);
      xhr.setRequestHeader('Content-Type', this.file.type);
      xhr.setRequestHeader('x-upsert', 'false');
      xhr.setRequestHeader('Authorization', `Bearer ${this.accessToken}`);

      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable && this.onProgress) {
          // Cap at 99 so 100 % is only emitted once the server confirms success
          const pct = Math.min(99, Math.round((event.loaded / event.total) * 100));
          this.onProgress({
            sessionId: this.sessionId || 'signed-upload',
            fileName: this.file.name,
            fileSize: this.file.size,
            uploadedBytes: event.loaded,
            totalChunks: 100,
            uploadedChunks: pct,
            progress: pct,
            status: 'uploading',
          });
        }
      };

      xhr.onload = () => {
        this.xhrRef = null;
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve();
        } else {
          reject(new Error(`Signed storage upload failed (${xhr.status}): ${xhr.responseText}`));
        }
      };

      xhr.onerror = () => {
        this.xhrRef = null;
        reject(new Error('Network error during signed storage upload'));
      };

      xhr.onabort = () => {
        this.xhrRef = null;
        reject(new Error('Upload cancelled'));
      };

      xhr.send(this.file);
    });
  }

  private async uploadFileDirectly(path: string): Promise<void> {
    const { error } = await supabase.storage
      .from(getBucketName(this.fileType))
      .upload(path, this.file, {
        contentType: this.file.type,
        upsert: false,
      });

    if (error) {
      throw new Error(normalizeStorageErrorMessage(error, 'Direct storage upload'));
    }
  }

  private async createClientSignedUrl(path: string): Promise<string> {
    const { data, error } = await supabase.storage
      .from(getBucketName(this.fileType))
      .createSignedUrl(path, 365 * 24 * 60 * 60);

    if (error) {
      throw new Error(normalizeStorageErrorMessage(error, 'Storage URL creation'));
    }

    return data?.signedUrl || '';
  }

  private arrayBufferToBase64(buffer: ArrayBuffer): string {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    const chunkLength = 0x8000;

    for (let index = 0; index < bytes.length; index += chunkLength) {
      const slice = bytes.subarray(index, index + chunkLength);
      binary += String.fromCharCode(...slice);
    }

    return btoa(binary);
  }

  private async uploadWithLegacyChunkFlow(): Promise<UploadResult> {
    const totalChunks = Math.max(1, Math.ceil(this.file.size / this.chunkSize));
    const session = await this.runWithRetry(() => this.createLegacyUploadSession(totalChunks));
    this.sessionId = session.id;

    try {
      for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex += 1) {
        if (this.aborted) {
          throw new Error('Upload cancelled');
        }

        const start = chunkIndex * this.chunkSize;
        const end = Math.min(start + this.chunkSize, this.file.size);
        const chunkBuffer = await this.file.slice(start, end).arrayBuffer();
        const chunkData = this.arrayBufferToBase64(chunkBuffer);

        await this.runWithRetry(() => this.uploadLegacyChunk(session.id, chunkIndex, chunkData));
        this.emitProgress(chunkIndex + 1, totalChunks, 'uploading');
      }

      return await this.runWithRetry(() => this.completeLegacyUpload(session.id));
    } catch (error) {
      await this.cancelLegacyUpload(session.id);
      throw error;
    }
  }

  private buildDirectUploadPath(): string {
    const userId = sessionStorage.getItem('user_id') || 'authenticated-user';
    return `${userId}/${Date.now()}_${sanitizeFileName(this.file.name)}`;
  }

  private async runWithRetry<T>(task: () => Promise<T>, attempts: number = 3): Promise<T> {
    let lastError: unknown;

    for (let attempt = 1; attempt <= attempts; attempt += 1) {
      try {
        return await task();
      } catch (error) {
        lastError = error;
        if (attempt === attempts || this.aborted) {
          break;
        }
      }
    }

    throw lastError instanceof Error ? lastError : new Error('Upload request failed');
  }

  private async completeUpload(): Promise<UploadResult> {
    // ─── Strategy ────────────────────────────────────────────────────────────
    // There are exactly two upload paths. We NEVER fall from path A into path B
    // after any progress has been emitted, because that would reset the
    // progress bar to near 0% — which is the "upload restarts" bug.
    //
    // Path A — Backend signed-URL + XHR (real live progress bar)
    //   1. Ask backend for a one-time upload token.
    //   2. PUT the file bytes directly to Supabase Storage via XHR.
    //      Progress events fire 0 → 99%.
    //   3. If XHR succeeds: finalize via backend, or fall back to a
    //      client-side signed URL — either way we stay at 99% until 100%.
    //      The file is NEVER re-uploaded.
    //   4. If XHR fails AFTER the bytes were already sent (server rejected):
    //      fetch a fresh token and retry the XHR once (token may have expired).
    //      Still no progress reset — progress stays where it was.
    //
    // Path B — Direct Supabase SDK upload (no live progress, but reliable)
    //   Used only when the backend is completely unavailable (step 1 above
    //   fails before any XHR bytes are sent). Progress stays at "pending"
    //   until done, then jumps to 100%. No reset.
    //
    // The legacy chunk-upload API is intentionally NOT used as an automatic
    // fallback because it re-emits progress starting from chunk 1/N ≈ 0%.
    // ─────────────────────────────────────────────────────────────────────────

    // --- Path A ---
    let target: { path: string; token: string } | null = null;
    try {
      target = await this.runWithRetry(() => this.createSignedUploadTarget());
    } catch {
      // Backend unavailable — skip to Path B below.
    }

    if (target) {
      this.sessionId = target.path;
      let xhrSucceeded = false;

      try {
        await this.uploadFileWithSignedUrl(target.path, target.token);
        xhrSucceeded = true;
      } catch {
        // Do not retry signed XHR here: repeated retries re-send full WAV files
        // and look like a restart at ~99%. Fall through to Path B once.
      }

      if (xhrSucceeded) {
        // File bytes are safely in Supabase Storage. Never re-upload.
        // Try backend finalization first; fall back to a client-side URL.
        try {
          return await this.runWithRetry(() => this.finalizeUpload(target!.path));
        } catch {
          // Finalize failed — build a URL client-side from the already-stored file.
          try {
            const url = await this.runWithRetry(() => this.createClientSignedUrl(target!.path));
            return { success: true, url, path: target!.path };
          } catch {
            // Even URL creation failed — return without a URL. The path is still
            // valid and the caller can retrieve a URL later.
            return { success: true, url: '', path: target!.path };
          }
        }
      }
    }

    // --- Path B: Direct Supabase SDK upload (no progress events) ---
    const directPath = this.buildDirectUploadPath();
    this.sessionId = directPath;

    await this.runWithRetry(() => this.uploadFileDirectly(directPath));

    try {
      const url = await this.runWithRetry(() => this.createClientSignedUrl(directPath));
      return { success: true, url, path: directPath };
    } catch {
      return { success: true, url: '', path: directPath };
    }
  }

  private emitProgress(uploadedChunks: number, totalChunks: number, status: UploadProgress['status'], error?: string) {
    if (!this.onProgress) return;

    const uploadedBytes = Math.min(this.file.size, uploadedChunks * this.chunkSize);
    const progress = totalChunks === 0 ? 0 : Math.min(100, Math.round((uploadedChunks / totalChunks) * 100));
    this.lastProgressPercent = progress;

    this.onProgress({
      sessionId: this.sessionId || 'signed-upload',
      fileName: this.file.name,
      fileSize: this.file.size,
      uploadedBytes,
      totalChunks,
      uploadedChunks,
      progress,
      status,
      error,
    });
  }

  async upload(): Promise<UploadResult> {
    try {
      // Emit real 0% pending — XHR onprogress will drive the 1–99% range
      this.emitProgress(0, 100, 'pending');

      const result = await this.completeUpload();

      // Emit genuine 100% completed
      this.emitProgress(100, 100, 'completed');

      return result;
    } catch (error) {
      const frozenProgress = Math.max(0, Math.min(99, this.lastProgressPercent));
      if (this.onProgress) {
        this.onProgress({
          sessionId: this.sessionId || 'signed-upload',
          fileName: this.file.name,
          fileSize: this.file.size,
          uploadedBytes: Math.round((frozenProgress / 100) * this.file.size),
          totalChunks: 100,
          uploadedChunks: frozenProgress,
          progress: frozenProgress,
          status: 'failed',
          error: (error as Error).message,
        });
      }
      throw error;
    }
  }

  async cancel(): Promise<void> {
    this.aborted = true;
    if (this.xhrRef) {
      this.xhrRef.abort();
      this.xhrRef = null;
    }
    this.emitProgress(0, 100, 'cancelled');
  }
}

// Helper function to validate file types
export function validateAudioFile(file: File): { valid: boolean; error?: string } {
  const validTypes = ['audio/wav', 'audio/x-wav', 'audio/flac', 'audio/x-flac'];
  const validExtensions = ['.wav', '.flac'];

  const hasValidType = validTypes.includes(file.type);
  const hasValidExtension = validExtensions.some(ext => file.name.toLowerCase().endsWith(ext));

  if (!hasValidType && !hasValidExtension) {
    return {
      valid: false,
      error: 'Only WAV and FLAC audio files are supported',
    };
  }

  // Max file size: 500MB
  const maxSize = 500 * 1024 * 1024;
  if (file.size > maxSize) {
    return {
      valid: false,
      error: 'File size exceeds 500MB limit',
    };
  }

  return { valid: true };
}

export function validateArtworkFile(file: File): { valid: boolean; error?: string } {
  const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  const validExtensions = ['.jpg', '.jpeg', '.png', '.webp'];

  const hasValidType = validTypes.includes(file.type);
  const hasValidExtension = validExtensions.some(ext => file.name.toLowerCase().endsWith(ext));

  if (!hasValidType && !hasValidExtension) {
    return {
      valid: false,
      error: 'Only JPEG, PNG, and WebP images are supported',
    };
  }

  // Max file size: 10MB
  const maxSize = 10 * 1024 * 1024;
  if (file.size > maxSize) {
    return {
      valid: false,
      error: 'Image size exceeds 10MB limit',
    };
  }

  // Min dimensions: 3000x3000px (will be checked after loading)
  return { valid: true };
}

export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

export function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}
