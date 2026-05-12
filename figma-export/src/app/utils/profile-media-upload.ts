import { ChunkedUploader, type UploadProgress, validateArtworkFile } from './chunked-uploader';
import { getAuthStorageSnapshot, getStoredAccessToken } from './auth-session';

export interface ProfileMediaUploadResult {
  url: string;
  path: string;
}

function getAccessToken() {
  const token = getStoredAccessToken();

  if (!token) {
    const snapshot = getAuthStorageSnapshot();
    throw new Error(
      `Your session has expired. Sign in again to upload files. Session token: ${snapshot.hasSessionStorageToken ? 'present' : 'missing'}, persisted session: ${snapshot.hasPersistedSupabaseSession ? 'present' : 'missing'}.`
    );
  }

  return token;
}

export async function uploadProfileMedia(
  file: File,
  onProgress?: (progress: UploadProgress) => void,
): Promise<ProfileMediaUploadResult> {
  const validation = validateArtworkFile(file);
  if (!validation.valid) {
    throw new Error(validation.error || 'Invalid image file.');
  }

  const uploader = new ChunkedUploader(file, 'artwork', getAccessToken(), {
    onProgress,
  });

  const result = await uploader.upload();
  return {
    url: result.url,
    path: result.path,
  };
}