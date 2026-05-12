import { useState, useRef } from 'react';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { Upload, X, CheckCircle, AlertCircle, Music, Image } from 'lucide-react';
import {
  ChunkedUploader,
  UploadProgress,
  validateAudioFile,
  validateArtworkFile,
  formatBytes,
} from '../../utils/chunked-uploader';

interface ChunkedFileUploadProps {
  type: 'audio' | 'artwork';
  accessToken: string;
  onUploadComplete: (url: string, path: string) => void;
  onError?: (error: string) => void;
  maxSize?: number;
  accept?: string;
  label?: string;
  description?: string;
}

export function ChunkedFileUpload({
  type,
  accessToken,
  onUploadComplete,
  onError,
  label,
  description,
}: ChunkedFileUploadProps) {
  const [file, setFile] = useState<File | null>(null);
  const [progress, setProgress] = useState<UploadProgress | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const uploaderRef = useRef<ChunkedUploader | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const accept = type === 'audio' ? '.wav,.flac' : '.jpg,.jpeg,.png,.webp';

  const handleFileSelect = (selectedFile: File) => {
    setError(null);
    setProgress(null);

    // Validate file
    const validation = type === 'audio' 
      ? validateAudioFile(selectedFile)
      : validateArtworkFile(selectedFile);

    if (!validation.valid) {
      setError(validation.error || 'Invalid file');
      onError?.(validation.error || 'Invalid file');
      return;
    }

    setFile(selectedFile);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      handleFileSelect(selectedFile);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const droppedFile = e.dataTransfer.files?.[0];
    if (droppedFile) {
      handleFileSelect(droppedFile);
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    setError(null);
    
    const uploader = new ChunkedUploader(file, type, accessToken, {
      onProgress: setProgress,
    });

    uploaderRef.current = uploader;

    try {
      const result = await uploader.upload();
      onUploadComplete(result.url, result.path);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Upload failed';
      setError(errorMsg);
      onError?.(errorMsg);
    }
  };

  const handleCancel = async () => {
    if (uploaderRef.current) {
      await uploaderRef.current.cancel();
    }
    setFile(null);
    setProgress(null);
    setError(null);
  };

  const handleRemove = () => {
    setFile(null);
    setProgress(null);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const isUploading = progress?.status === 'uploading' || progress?.status === 'pending';
  const isCompleted = progress?.status === 'completed';

  return (
    <div className="space-y-4">
      {label && (
        <div>
          <label className="block text-sm font-medium mb-1">{label}</label>
          {description && (
            <p className="text-sm text-[#B3B3B3]">{description}</p>
          )}
        </div>
      )}

      {!file && (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
            isDragging
              ? 'border-[#FF6B00] bg-[#FF6B00]/10'
              : 'border-[#FF6B00]/20 hover:border-[#FF6B00]/50'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept={accept}
            onChange={handleFileChange}
            className="hidden"
            id={`file-upload-${type}`}
          />
          <label
            htmlFor={`file-upload-${type}`}
            className="cursor-pointer flex flex-col items-center"
          >
            <div className="w-16 h-16 bg-[#FF6B00]/10 rounded-full flex items-center justify-center mb-4">
              {type === 'audio' ? (
                <Music className="w-8 h-8 text-[#FF6B00]" />
              ) : (
                <Image className="w-8 h-8 text-[#FF6B00]" />
              )}
            </div>
            <p className="text-lg font-medium mb-2">
              {isDragging ? 'Drop file here' : 'Click to upload or drag and drop'}
            </p>
            <p className="text-sm text-[#B3B3B3]">
              {type === 'audio' 
                ? 'WAV or FLAC (max 500MB)'
                : 'JPEG, PNG or WebP (min 3000×3000px, max 10MB)'}
            </p>
          </label>
        </div>
      )}

      {file && !isCompleted && (
        <Card className="p-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-[#FF6B00]/10 rounded-lg flex items-center justify-center flex-shrink-0">
              {type === 'audio' ? (
                <Music className="w-6 h-6 text-[#FF6B00]" />
              ) : (
                <Image className="w-6 h-6 text-[#FF6B00]" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-4 mb-2">
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{file.name}</p>
                  <p className="text-sm text-[#B3B3B3]">{formatBytes(file.size)}</p>
                </div>
                {!isUploading && (
                  <button
                    onClick={handleRemove}
                    className="text-[#666] hover:text-[#B3B3B3]"
                  >
                    <X className="w-5 h-5" />
                  </button>
                )}
              </div>

              {progress && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-[#B3B3B3]">
                      {progress.status === 'pending' && 'Preparing upload...'}
                      {progress.status === 'uploading' && `Uploading ${progress.uploadedChunks}/${progress.totalChunks} chunks`}
                      {progress.status === 'failed' && 'Upload failed'}
                    </span>
                    <span className="font-medium">{progress.progress}%</span>
                  </div>
                  <div className="w-full bg-[#333] rounded-full h-2">
                    <div
                      className={`h-2 rounded-full transition-all ${
                        progress.status === 'failed' ? 'bg-red-500' : 'bg-[#FF6B00]'
                      }`}
                      style={{ width: `${progress.progress}%` }}
                    />
                  </div>
                </div>
              )}

              {error && (
                <div className="mt-3 flex items-start gap-2 text-sm text-red-600">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              <div className="mt-4 flex gap-2">
                {!isUploading && !progress && (
                  <Button onClick={handleUpload} size="sm">
                    <Upload className="w-4 h-4 mr-2" />
                    Start Upload
                  </Button>
                )}
                {isUploading && (
                  <Button onClick={handleCancel} variant="outline" size="sm">
                    Cancel
                  </Button>
                )}
                {error && (
                  <Button onClick={handleUpload} size="sm">
                    Retry
                  </Button>
                )}
              </div>
            </div>
          </div>
        </Card>
      )}

      {isCompleted && (
        <Card className="p-6 bg-green-900/20 border-green-500/30">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
            <div className="flex-1">
              <p className="font-medium text-green-900">Upload completed successfully</p>
              <p className="text-sm text-green-700">{file?.name}</p>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
