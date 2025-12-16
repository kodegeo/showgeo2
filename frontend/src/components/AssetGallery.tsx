import { useState } from "react";
import { useAssets, useDeleteAsset } from "@/hooks/useAssets";
import { useEntityContext } from "@/hooks/useEntityContext";
import { useAuth } from "@/hooks/useAuth";
import { AssetType, AssetOwnerType } from "../../../packages/shared/types";
import type { Asset } from "../../../packages/shared/types";
import { AssetPreview } from "./AssetPreview";

interface AssetGalleryProps {
  ownerType?: AssetOwnerType;
  ownerId?: string;
  type?: AssetType;
  isPublic?: boolean;
  showUpload?: boolean;
  onSelect?: (asset: Asset) => void;
  className?: string;
}

export function AssetGallery({
  ownerType: propOwnerType,
  ownerId: propOwnerId,
  type,
  isPublic,
  showUpload: _showUpload,
  onSelect,
  className = "",
}: AssetGalleryProps) {
  const { user } = useAuth();
  const { currentEntity } = useEntityContext();
  const deleteMutation = useDeleteAsset();

  // Determine ownerType and ownerId
  const ownerType: AssetOwnerType = propOwnerType || (currentEntity ? AssetOwnerType.ENTITY : AssetOwnerType.USER);
  const ownerId = propOwnerId || currentEntity?.id || user?.id || "";

  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);

  const { data, isLoading, error } = useAssets({
    ownerType,
    ownerId,
    type,
    isPublic,
    page: 1,
    limit: 50,
  });

  const handleAssetClick = (asset: Asset) => {
    setSelectedAsset(asset);
    onSelect?.(asset);
  };

  const handleDelete = async (assetId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm("Are you sure you want to delete this asset?")) {
      try {
        await deleteMutation.mutateAsync(assetId);
      } catch (error) {
        console.error("Failed to delete asset:", error);
      }
    }
  };

  if (!user && !isPublic) {
    return null;
  }

  if (isLoading) {
    return (
      <div className={`${className} flex items-center justify-center p-8`}>
        <div className="text-gray-500 dark:text-gray-400">Loading assets...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`${className} flex items-center justify-center p-8`}>
        <div className="text-red-600 dark:text-red-400">
          Failed to load assets: {error instanceof Error ? error.message : "Unknown error"}
        </div>
      </div>
    );
  }

  const assets = data?.data || [];

  return (
    <div className={className}>
      {assets.length === 0 ? (
        <div className="text-center p-8 text-gray-500 dark:text-gray-400">
          No assets found
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {assets.map((asset) => (
            <div
              key={asset.id}
              className="relative group cursor-pointer"
              onClick={() => handleAssetClick(asset)}
            >
              <div className="aspect-square rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                {asset.type === "IMAGE" ? (
                  <img
                    src={asset.url}
                    alt={asset.path}
                    className="w-full h-full object-cover"
                  />
                ) : asset.type === "VIDEO" ? (
                  <video
                    src={asset.url}
                    className="w-full h-full object-cover"
                    muted
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
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
                        d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
                      />
                    </svg>
                  </div>
                )}
              </div>
              <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100">
                <button
                  onClick={(e) => handleDelete(asset.id, e)}
                  className="px-3 py-1 bg-red-600 text-white rounded-md hover:bg-red-700 text-sm font-medium"
                  disabled={deleteMutation.isPending}
                >
                  Delete
                </button>
              </div>
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-2 rounded-b-lg">
                <div className="text-xs text-white truncate">{asset.path.split("/").pop()}</div>
                {asset.size && (
                  <div className="text-xs text-white/80">
                    {(asset.size / 1024 / 1024).toFixed(2)} MB
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {selectedAsset && (
        <AssetPreview
          asset={selectedAsset}
          onClose={() => setSelectedAsset(null)}
          onDelete={handleDelete}
        />
      )}
    </div>
  );
}

