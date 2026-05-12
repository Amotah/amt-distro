import { createClient } from 'jsr:@supabase/supabase-js@2';
import * as kv from './kv_store.tsx';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

// Storage bucket names
const AUDIO_BUCKET = 'make-79198001-audio';
const ARTWORK_BUCKET = 'make-79198001-artwork';

// Initialize storage buckets
export async function initializeStorageBuckets() {
  const { data: buckets } = await supabase.storage.listBuckets();
  
  // Create audio bucket if it doesn't exist
  const audioBucketExists = buckets?.some(bucket => bucket.name === AUDIO_BUCKET);
  if (!audioBucketExists) {
    await supabase.storage.createBucket(AUDIO_BUCKET, { public: false });
    console.log(`Created bucket: ${AUDIO_BUCKET}`);
  }

  // Create artwork bucket if it doesn't exist
  const artworkBucketExists = buckets?.some(bucket => bucket.name === ARTWORK_BUCKET);
  if (!artworkBucketExists) {
    await supabase.storage.createBucket(ARTWORK_BUCKET, { public: false });
    console.log(`Created bucket: ${ARTWORK_BUCKET}`);
  }
}

export interface UploadSession {
  id: string;
  userId: string;
  fileName: string;
  fileSize: number;
  fileType: 'audio' | 'artwork';
  mimeType: string;
  totalChunks: number;
  uploadedChunks: number[];
  status: 'pending' | 'uploading' | 'completed' | 'failed';
  finalPath?: string;
  createdAt: string;
  updatedAt: string;
  expiresAt: string;
}

function getBucketName(fileType: 'audio' | 'artwork') {
  return fileType === 'audio' ? AUDIO_BUCKET : ARTWORK_BUCKET;
}

function sanitizeFileName(fileName: string) {
  return fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
}

export async function createSignedUploadTarget(
  userId: string,
  fileName: string,
  fileType: 'audio' | 'artwork'
): Promise<{ bucket: string; path: string; token: string; signedUrl: string }> {
  const bucket = getBucketName(fileType);
  const path = `${userId}/${Date.now()}_${sanitizeFileName(fileName)}`;

  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUploadUrl(path);

  if (error || !data?.token) {
    throw new Error(`Failed to create signed upload target: ${error?.message || 'No upload token returned'}`);
  }

  return {
    bucket,
    path,
    token: data.token,
    signedUrl: data.signedUrl,
  };
}

export async function finalizeSignedUpload(
  userId: string,
  path: string,
  fileType: 'audio' | 'artwork'
): Promise<{ success: boolean; url: string; path: string }> {
  if (!path || !path.startsWith(`${userId}/`)) {
    throw new Error('Unauthorized upload path');
  }

  const bucket = getBucketName(fileType);
  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(path, 365 * 24 * 60 * 60);

  if (error) {
    throw new Error(`Failed to create signed URL: ${error.message}`);
  }

  return {
    success: true,
    url: data?.signedUrl || '',
    path,
  };
}

// Create upload session for chunked uploads
export async function createUploadSession(
  userId: string,
  fileName: string,
  fileSize: number,
  fileType: 'audio' | 'artwork',
  mimeType: string,
  totalChunks: number
): Promise<UploadSession> {
  const id = crypto.randomUUID();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24 hours

  const session: UploadSession = {
    id,
    userId,
    fileName,
    fileSize,
    fileType,
    mimeType,
    totalChunks,
    uploadedChunks: [],
    status: 'pending',
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
    expiresAt: expiresAt.toISOString(),
  };

  await kv.set(`upload:session:${id}`, session);
  return session;
}

// Get upload session
export async function getUploadSession(sessionId: string): Promise<UploadSession | null> {
  return await kv.get(`upload:session:${sessionId}`);
}

// Upload a chunk
export async function uploadChunk(
  sessionId: string,
  chunkIndex: number,
  chunkData: ArrayBuffer
): Promise<{ success: boolean; uploadedChunks: number; totalChunks: number }> {
  const session = await getUploadSession(sessionId);
  if (!session) {
    throw new Error('Upload session not found');
  }

  if (session.status === 'completed') {
    throw new Error('Upload already completed');
  }

  if (session.status === 'failed') {
    throw new Error('Upload session failed');
  }

  // Store chunk temporarily
  const chunkPath = `/tmp/${sessionId}_chunk_${chunkIndex}`;
  await Deno.writeFile(chunkPath, new Uint8Array(chunkData));

  // Update session
  if (!session.uploadedChunks.includes(chunkIndex)) {
    session.uploadedChunks.push(chunkIndex);
    session.uploadedChunks.sort((a, b) => a - b);
  }
  session.status = 'uploading';
  session.updatedAt = new Date().toISOString();

  await kv.set(`upload:session:${sessionId}`, session);

  return {
    success: true,
    uploadedChunks: session.uploadedChunks.length,
    totalChunks: session.totalChunks,
  };
}

// Complete upload and assemble chunks
export async function completeUpload(
  sessionId: string
): Promise<{ success: boolean; url: string; path: string }> {
  const session = await getUploadSession(sessionId);
  if (!session) {
    throw new Error('Upload session not found');
  }

  // Verify all chunks are uploaded
  if (session.uploadedChunks.length !== session.totalChunks) {
    throw new Error(`Missing chunks: ${session.uploadedChunks.length}/${session.totalChunks} uploaded`);
  }

  // Assemble chunks
  const chunks: Uint8Array[] = [];
  for (let i = 0; i < session.totalChunks; i++) {
    const chunkPath = `/tmp/${sessionId}_chunk_${i}`;
    try {
      const chunkData = await Deno.readFile(chunkPath);
      chunks.push(chunkData);
    } catch (error) {
      session.status = 'failed';
      await kv.set(`upload:session:${sessionId}`, session);
      throw new Error(`Failed to read chunk ${i}: ${error.message}`);
    }
  }

  // Combine all chunks
  const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
  const completeFile = new Uint8Array(totalLength);
  let offset = 0;
  for (const chunk of chunks) {
    completeFile.set(chunk, offset);
    offset += chunk.length;
  }

  // Determine bucket and path
  const bucket = session.fileType === 'audio' ? AUDIO_BUCKET : ARTWORK_BUCKET;
  const sanitizedFileName = session.fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
  const path = `${session.userId}/${Date.now()}_${sanitizedFileName}`;

  // Upload to Supabase Storage
  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(path, completeFile, {
      contentType: session.mimeType,
      upsert: false,
    });

  if (error) {
    session.status = 'failed';
    await kv.set(`upload:session:${sessionId}`, session);
    throw new Error(`Storage upload failed: ${error.message}`);
  }

  // Create signed URL (valid for 1 year)
  const { data: signedData } = await supabase.storage
    .from(bucket)
    .createSignedUrl(path, 365 * 24 * 60 * 60);

  // Clean up temporary chunks
  for (let i = 0; i < session.totalChunks; i++) {
    const chunkPath = `/tmp/${sessionId}_chunk_${i}`;
    try {
      await Deno.remove(chunkPath);
    } catch {
      // Ignore cleanup errors
    }
  }

  // Update session
  session.status = 'completed';
  session.finalPath = path;
  session.updatedAt = new Date().toISOString();
  await kv.set(`upload:session:${sessionId}`, session);

  return {
    success: true,
    url: signedData?.signedUrl || '',
    path,
  };
}

// Cancel upload and clean up
export async function cancelUpload(sessionId: string): Promise<boolean> {
  const session = await getUploadSession(sessionId);
  if (!session) return false;

  // Clean up temporary chunks
  for (let i = 0; i < session.totalChunks; i++) {
    const chunkPath = `/tmp/${sessionId}_chunk_${i}`;
    try {
      await Deno.remove(chunkPath);
    } catch {
      // Ignore cleanup errors
    }
  }

  // Mark as failed
  session.status = 'failed';
  session.updatedAt = new Date().toISOString();
  await kv.set(`upload:session:${sessionId}`, session);

  return true;
}

// Get signed URL for existing file
export async function getSignedUrl(
  fileType: 'audio' | 'artwork',
  path: string,
  expiresIn: number = 3600
): Promise<string> {
  const bucket = getBucketName(fileType);
  const { data } = await supabase.storage
    .from(bucket)
    .createSignedUrl(path, expiresIn);

  return data?.signedUrl || '';
}

// Delete file from storage
export async function deleteFile(fileType: 'audio' | 'artwork', path: string): Promise<boolean> {
  const bucket = getBucketName(fileType);
  const { error } = await supabase.storage.from(bucket).remove([path]);
  return !error;
}
