import { useState, useCallback } from "react";
import { useUploadAsset } from "@/hooks/useAssets";
import { useEntityContext } from "@/hooks/useEntityContext";
import { useAuth } from "@/hooks/useAuth";
import { AssetType, AssetOwnerType } from "../../../../packages/shared/types";

interface AssetUploadProps {
  onUploadComplete?: (assetId: string) => void;
  onError?: (error: Error) => void;
  ownerType?: AssetOwnerType;
  ownerId?: string;
  defaultType?: AssetType;
  isPublic?: boolean;
  className?: string;
  accept?: string;
  maxSize?: number; // in bytes
  purpose?: "avatar" | "banner" | "cover" | "other";

}

export function AssetUpload({
  onUploadComplete,
  onError,
  ownerType: propOwnerType,
  ownerId: propOwnerId,
  defaultType = AssetType.IMAGE,
  isPublic = false,
  className = "",
  accept,
  maxSize,
  purpose = "other",
}: AssetUploadProps) {
  const { user } = useAuth();
  const { currentEntity } = useEntityContext();
  const uploadMutation = useUploadAsset();

  const [dragActive, setDragActive] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [type, setType] = useState<AssetType>(defaultType);
  const [preview, setPreview] = useState<string | null>(null);

  // Determine ownerType and ownerId
  const ownerType: AssetOwnerType = propOwnerType || (currentEntity ? AssetOwnerType.ENTITY : AssetOwnerType.USER);
  const ownerId = propOwnerId || currentEntity?.id || user?.id || "";

  const handleFileSelect = useCallback(
    (selectedFile: File) => {
      // Validate file size
      if (maxSize && selectedFile.size > maxSize) {
        const error = new Error(
          `File size exceeds maximum allowed size (${Math.round(maxSize / 1024 / 1024)}MB)`,
        );
        onError?.(error);
        return;
      }

      setFile(selectedFile);

      // Create preview for images
      if (selectedFile.type.startsWith("image/")) {
        const reader = new FileReader();
        reader.onloadend = () => {
          setPreview(reader.result as string);
        };
        reader.readAsDataURL(selectedFile);
      } else {
        setPreview(null);
      }

      // Auto-detect type based on MIME type
      if (selectedFile.type.startsWith("image/")) {
        setType(AssetType.IMAGE);
      } else if (selectedFile.type.startsWith("audio/")) {
        setType(AssetType.AUDIO);
      } else if (selectedFile.type.startsWith("video/")) {
        setType(AssetType.VIDEO);
      } else if (
        selectedFile.type.includes("pdf") ||
        selectedFile.type.includes("document") ||
        selectedFile.type.includes("text")
      ) {
        setType(AssetType.DOCUMENT);
      }
    },
    [maxSize, onError],
  );

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setDragActive(false);

      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
        handleFileSelect(e.dataTransfer.files[0]);
      }
    },
    [handleFileSelect],
  );

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files[0]) {
        handleFileSelect(e.target.files[0]);
      }
    },
    [handleFileSelect],
  );

  const handleUpload = useCallback(async () => {
    if (!file || !ownerId) {
      const error = new Error("File and owner ID are required");
      onError?.(error);
      return;
    }

    try {
      const asset = await uploadMutation.mutateAsync({
        file,
        type,
        ownerType,
        ownerId,
        isPublic,
        metadata: {
          purpose,
        },
      });

      setFile(null);
      setPreview(null);
      onUploadComplete?.(asset.id);
    } catch (error) {
      const err = error instanceof Error ? error : new Error("Upload failed");
      onError?.(err);
    }
  }, [file, type, ownerType, ownerId, isPublic, uploadMutation, onUploadComplete, onError]);

  const handleRemove = useCallback(() => {
    setFile(null);
    setPreview(null);
  }, []);

  if (!user) {
    return null;
  }

  return (
    <div className={className}>
      <div
        className={`relative border-2 border-dashed rounded-lg p-6 transition-colors ${
          dragActive
            ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
            : "border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800"
        }`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        {!file ? (
          <div className="text-center">
            <input
              type="file"
              id="asset-upload"
              className="hidden"
              accept={accept}
              onChange={handleFileInput}
            />
            <label
              htmlFor="asset-upload"
              className="cursor-pointer flex flex-col items-center gap-2"
            >
              <svg
                className="w-12 h-12 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                />
              </svg>
              <div className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Click to upload or drag and drop
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">
                {maxSize ? `Max size: ${Math.round(maxSize / 1024 / 1024)}MB` : "Upload file"}
              </div>
            </label>
          </div>
        ) : (
          <div className="space-y-4">
            {preview && (
              <div className="flex justify-center">
                <img
                  src={preview}
                  alt="Preview"
                  className="max-h-48 max-w-full rounded-lg"
                />
              </div>
            )}
            <div className="text-center">
              <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                {file.name}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">
                {(file.size / 1024 / 1024).toFixed(2)} MB
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <select
                value={type}
                onChange={(e) => setType(e.target.value as AssetType)}
                className="px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-800 text-sm"
              >
                <option value="IMAGE">Image</option>
                <option value="AUDIO">Audio</option>
                <option value="VIDEO">Video</option>
                <option value="DOCUMENT">Document</option>
                <option value="OTHER">Other</option>
              </select>
              <div className="flex gap-2">
                <button
                  onClick={handleUpload}
                  disabled={uploadMutation.isPending}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium"
                >
                  {uploadMutation.isPending ? "Uploading..." : "Upload"}
                </button>
                <button
                  onClick={handleRemove}
                  disabled={uploadMutation.isPending}
                  className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-300 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium"
                >
                  Remove
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
      {uploadMutation.isError && (
        <div className="mt-2 text-sm text-red-600 dark:text-red-400">
          {uploadMutation.error instanceof Error
            ? uploadMutation.error.message
            : "Upload failed"}
        </div>
      )}
    </div>
  );
}

