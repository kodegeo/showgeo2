/**
 * @deprecated Use useUploadAsset() from @/hooks/useAssets instead.
 * This hook is kept for backward compatibility but will be removed in a future version.
 */
import { useUploadAsset } from './useAssets';
import { AssetType, AssetOwnerType } from '../../../packages/shared/types/asset.types';

export function useUploadAvatar(userId) {
  const uploadAsset = useUploadAsset();

  const uploadAvatar = async (file) => {
    try {
      const asset = await uploadAsset.mutateAsync({
        file,
        type: AssetType.IMAGE,
        ownerType: AssetOwnerType.USER,
        ownerId: userId,
        isPublic: true,
        metadata: { purpose: "avatar" },
      });

      return asset.url; // public URL
    } catch (err) {
      console.error('Avatar upload failed:', err);
      return null;
    }
  };

  return { 
    uploadAvatar, 
    loading: uploadAsset.isPending, 
    error: uploadAsset.error?.message || '' 
  };
}
