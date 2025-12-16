import { useAssetUrl } from "@/hooks/useAssets";
import type { Asset } from "../../../packages/shared/types";

interface AssetPreviewProps {
  asset: Asset;
  onClose: () => void;
  onDelete?: (assetId: string, e: React.MouseEvent) => void;
}

export function AssetPreview({ asset, onClose, onDelete }: AssetPreviewProps) {
  const { data: url } = useAssetUrl(asset.id);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75 p-4">
      <div className="relative max-w-4xl max-h-full bg-white dark:bg-gray-800 rounded-lg overflow-hidden">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 p-2 bg-black bg-opacity-50 text-white rounded-full hover:bg-opacity-75 transition-colors"
        >
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>

        {/* Asset preview */}
        <div className="flex flex-col">
          <div className="flex-1 flex items-center justify-center p-8">
            {asset.type === "IMAGE" && url && (
              <img
                src={url}
                alt={asset.path}
                className="max-w-full max-h-[70vh] object-contain rounded-lg"
              />
            )}
            {asset.type === "VIDEO" && url && (
              <video
                src={url}
                controls
                className="max-w-full max-h-[70vh] rounded-lg"
              />
            )}
            {asset.type === "AUDIO" && url && (
              <audio src={url} controls className="w-full max-w-md" />
            )}
            {asset.type === "DOCUMENT" && url && (
              <iframe
                src={url}
                className="w-full h-[70vh] rounded-lg border border-gray-300 dark:border-gray-700"
                title={asset.path}
              />
            )}
            {asset.type === "OTHER" && (
              <div className="text-center p-8">
                <div className="text-gray-600 dark:text-gray-400 mb-4">
                  Preview not available for this file type
                </div>
                <a
                  href={url || asset.url}
                  download
                  className="inline-block px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                >
                  Download File
                </a>
              </div>
            )}
          </div>

          {/* Asset info */}
          <div className="border-t border-gray-200 dark:border-gray-700 p-4 space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium text-gray-900 dark:text-gray-100">
                  {asset.path.split("/").pop()}
                </div>
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  {asset.type} • {asset.mimeType || "Unknown type"}
                </div>
              </div>
              {onDelete && (
                <button
                  onClick={(e) => onDelete(asset.id, e)}
                  className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors text-sm font-medium"
                >
                  Delete
                </button>
              )}
            </div>
            {asset.size && (
              <div className="text-sm text-gray-500 dark:text-gray-400">
                Size: {(asset.size / 1024 / 1024).toFixed(2)} MB
                {asset.width && asset.height && ` • ${asset.width} × ${asset.height}`}
              </div>
            )}
            {asset.createdAt && (
              <div className="text-xs text-gray-400 dark:text-gray-500">
                Uploaded: {new Date(asset.createdAt).toLocaleDateString()}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}













