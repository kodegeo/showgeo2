# Frontend Update Functions Report

**Generated:** 2024-12-09  
**Scope:** Search for update-related functions and patterns in `frontend/src`

---

## Summary

Found **35 matches** across **15 files** for the following patterns:
- `useUpdateUserProfile` - 4 matches
- `updateProfile` - 3 matches  
- `handleSubmit` - 8 matches
- `onSubmit` - 12 matches (form attributes)
- `updateEntity` - 1 match (service method)
- `useUpdateEntity` - 2 matches
- `mutation.mutate` / `mutation.mutateAsync` - Multiple matches

---

## 1. `useUpdateUserProfile` Hook

### File: `frontend/src/hooks/useUsers.ts`

**Lines:** 53-67

```typescript
export function useUpdateUserProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateUserProfileRequest }) =>
      usersService.updateProfile(id, data),
    onSuccess: (data, variables) => {
      queryClient.setQueryData(["users", variables.id], data);
      queryClient.invalidateQueries({ queryKey: ["users", variables.id] });
      queryClient.invalidateQueries({ queryKey: ["users"] });
      // Invalidate auth query to refresh user profile in auth context
      queryClient.invalidateQueries({ queryKey: ["auth", "me"] });
    },
  });
}
```

**Status:** ✅ Hook definition - No changes needed

---

### File: `frontend/src/pages/ProfileSetupPage.tsx`

**Lines:** 1-170

```typescript
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useUpdateUserProfile } from "@/hooks/useUsers";
import Navigation from "@/components/Navigation/Navigation";
import { Footer } from "@/components/Footer";
import { AvatarUpload } from "@/components/uploads/AvatarUpload";
import { UserRole } from "@shared/types";
import { Sparkles } from "lucide-react";

export function ProfileSetupPage() {
  const navigate = useNavigate();
  const { user, refetchUser } = useAuth();
  const updateProfile = useUpdateUserProfile();

  const [formData, setFormData] = useState({
    username: "",
    firstName: "",
    lastName: "",
    bio: "",
    location: "",
    timezone: "",
    website: "",
    avatarUrl: "",
    visibility: "public" as "public" | "private",
  });

  const [socialLinks, setSocialLinks] = useState<Record<string, string>>({
    twitter: "",
    instagram: "",
    facebook: "",
    youtube: "",
    tiktok: "",
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Load existing profile data
  useEffect(() => {
    if (user?.profile) {
      setFormData({
        username: user.profile.username || "",
        firstName: user.profile.firstName || "",
        lastName: user.profile.lastName || "",
        bio: user.profile.bio || "",
        location: user.profile.location || "",
        timezone: user.profile.timezone || "",
        website: user.profile.website || "",
        avatarUrl: user.profile.avatarUrl || "",
        visibility: user.profile.visibility || "public",
      });

      if (user.profile.socialLinks) {
        setSocialLinks({
          twitter: user.profile.socialLinks.twitter || "",
          instagram: user.profile.socialLinks.instagram || "",
          facebook: user.profile.socialLinks.facebook || "",
          youtube: user.profile.socialLinks.youtube || "",
          tiktok: user.profile.socialLinks.tiktok || "",
        });
      }
    }
  }, [user]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    // Clear error for this field
    if (errors[name]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[name];
        return next;
      });
    }
  };

  const handleSocialLinkChange = (platform: string, value: string) => {
    setSocialLinks((prev) => ({
      ...prev,
      [platform]: value,
    }));
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};

    if (formData.username && formData.username.length > 50) {
      newErrors.username = "Username must be 50 characters or less";
    }

    if (formData.firstName && formData.firstName.length > 100) {
      newErrors.firstName = "First name must be 100 characters or less";
    }

    if (formData.lastName && formData.lastName.length > 100) {
      newErrors.lastName = "Last name must be 100 characters or less";
    }

    if (formData.bio && formData.bio.length > 500) {
      newErrors.bio = "Bio must be 500 characters or less";
    }

    if (formData.location && formData.location.length > 200) {
      newErrors.location = "Location must be 200 characters or less";
    }

    if (formData.website && !/^https?:\/\/.+/.test(formData.website)) {
      newErrors.website = "Website must be a valid URL (starting with http:// or https://)";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    if (!validate()) {
      return;
    }

    if (!user) {
      return;
    }

    setIsSubmitting(true);

    try {
      // Filter out empty social links
      const filteredSocialLinks = Object.fromEntries(
        Object.entries(socialLinks).filter(([_, value]) => value.trim() !== "")
      );

      await updateProfile.mutateAsync({
        id: user.id,
        data: {
          ...formData,
          avatarUrl: formData.avatarUrl || undefined,
          socialLinks: Object.keys(filteredSocialLinks).length > 0 ? filteredSocialLinks : undefined,
        },
      });

      // Refetch user data to update auth state
      await refetchUser();

      // Redirect to profile page
      navigate("/profile", { replace: true });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to update profile. Please try again.";
      setErrors({ submit: message });
    } finally {
      setIsSubmitting(false);
    }
  };
```

**Status:** ✅ Uses `updateProfile.mutateAsync()` - No changes needed

---

### File: `frontend/src/components/uploads/AvatarUpload.tsx`

**Lines:** 1-91

```typescript
import { useState, useRef } from "react";
import { Upload, X, Loader2 } from "lucide-react";
import { useUploadAsset } from "@/hooks/useAssets";
import { useUpdateUserProfile } from "@/hooks/useUsers";
import { AssetType, AssetOwnerType } from "@shared/types";

interface AvatarUploadProps {
  currentAvatarUrl?: string;
  onUploadComplete: (avatarUrl: string) => void;
  className?: string;
  userId: string;   // ADD THIS
}

export function AvatarUpload({
  currentAvatarUrl,
  onUploadComplete,
  className = "",
  userId,
}: AvatarUploadProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(
    currentAvatarUrl || null
  );
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadAsset = useUploadAsset();
  const updateUser = useUpdateUserProfile();

  const handleFileSelect = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      setError("Please select an image file");
      return;
    }

    // Validate size < 5 MB
    if (file.size > 5 * 1024 * 1024) {
      setError("Image must be under 5MB");
      return;
    }

    setError(null);

    // Local preview
    const localPreview = URL.createObjectURL(file);
    setPreviewUrl(localPreview);

    try {
      // Upload via the shared hook (uses assets.service.ts pattern)
      const asset = await uploadAsset.mutateAsync({
        file,
        type: AssetType.IMAGE,
        ownerType: AssetOwnerType.USER,
        ownerId: userId,
        isPublic: true,
        metadata: { purpose: "avatar" },
      });

      const publicUrl = asset.url;

      // Notify parent
      onUploadComplete(publicUrl);
    } catch (err: any) {
      console.error(err);
      setError(
        err.response?.data?.message ||
          "Could not upload image. Please try again."
      );
      setPreviewUrl(currentAvatarUrl || null);
    }
  };

  const handleRemove = async () => {
    setPreviewUrl(null);

    try {
      await updateUser.mutateAsync({
        id: userId,
        data: {
          avatarUrl: "",
        },
      });
      onUploadComplete("");
    } catch {
      setError("Failed to remove avatar");
    }
  };
```

**Status:** ✅ Uses `updateUser.mutateAsync()` - No changes needed

---

### File: `frontend/src/components/profile/ProfileBanner.tsx`

**Lines:** 1-90

```typescript
import { useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useUpdateUserProfile } from "@/hooks/useUsers";
import { useUploadAsset } from "@/hooks/useAssets";
import { AssetType, AssetOwnerType } from "@shared/types";
import { Camera, Loader2 } from "lucide-react";

function waitForImage(url: string, retries = 10, delay = 300): Promise<void> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve();
    img.onerror = () => {
      if (retries <= 0) {
        return reject(new Error("Image failed to load after retries"));
      }
      setTimeout(
        () => waitForImage(url + `?cb=${Date.now()}`, retries - 1, delay).then(resolve).catch(reject),
        delay
      );
    };
    img.src = url + `?cb=${Date.now()}`;
  });
}

export function ProfileBanner() {
  const { user, refetchUser } = useAuth();
  const updateUser = useUpdateUserProfile();
  const uploadAsset = useUploadAsset();

  const bannerInputRef = useRef<HTMLInputElement>(null);

  if (!user) return null;

  // Default banner
  const defaultBanner = "/assets/defaults/profile-banner.png";
  const bannerUrl =
    (user.profile as any)?.bannerUrl || defaultBanner;

  const handleBannerChange = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    if (!file.type.startsWith("image/")) {
      alert("Please upload an image file");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      alert("Image size must be < 10MB");
      return;
    }

    try {
      // Upload via the shared hook (uses assets.service.ts pattern)
      const asset = await uploadAsset.mutateAsync({
        file,
        type: AssetType.IMAGE,
        ownerType: AssetOwnerType.USER,
        ownerId: user.id,
        isPublic: true,
        metadata: { purpose: "banner" },
      });

      const newBannerUrl = asset.url;

      // 👇 NEW: Wait for CDN propagation before updating UI
      await waitForImage(newBannerUrl);
      
      // Update user's profile in DB
      await updateUser.mutateAsync({
        id: user.id,
        data: {
          bannerUrl: newBannerUrl,
        },
      });

      // Refresh local user
      await refetchUser();
    } catch (err) {
      console.error("Banner upload failed:", err);
      alert("Banner upload failed. Try again.");
    } finally {
      // reset input so same file can be re-selected
      if (bannerInputRef.current) {
        bannerInputRef.current.value = "";
      }
    }
  };
```

**Status:** ✅ Uses `updateUser.mutateAsync()` - No changes needed

---

## 2. `updateProfile` Service Method

### File: `frontend/src/services/users.service.ts`

**Lines:** 96-108

```typescript
  /**
   * Update user profile
   */
  async updateProfile(
    id: string,
    data: UpdateUserProfileRequest,
  ): Promise<User & { profile?: UserProfile }> {
    const response = await apiClient.patch<User & { profile?: UserProfile }>(
      `/users/${id}`,
      data,
    );
    return response.data;
  },
```

**Status:** ✅ Service method - No changes needed

---

## 3. `useUpdateEntity` Hook

### File: `frontend/src/hooks/useEntities.ts`

**Lines:** 44-56

```typescript
export function useUpdateEntity() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateEntityRequest }) =>
      entitiesService.update(id, data),
    onSuccess: (data, variables) => {
      queryClient.setQueryData(["entities", variables.id], data);
      queryClient.invalidateQueries({ queryKey: ["entities", variables.id] });
      queryClient.invalidateQueries({ queryKey: ["entities"] });
    },
  });
}
```

**Status:** ✅ Hook definition - No changes needed

---

### File: `frontend/src/hooks/index.ts`

**Lines:** 1-27

```typescript
// ... imports ...

export {
  // User hooks
  useUsers,
  useUser,
  useUserByUsername,
  useUserEntities,
  useCreateUserProfile,
  useUpdateUserProfile,
  // ... other exports ...
  useUpdateEntity,
  // ... more exports ...
};
```

**Status:** ✅ Export - No changes needed

---

## 4. `updateEntity` Service Method

### File: `frontend/src/services/entities.service.ts`

**Lines:** 71-77

```typescript
  /**
   * Update entity
   */
  async update(id: string, data: UpdateEntityRequest): Promise<Entity> {
    const response = await apiClient.patch<Entity>(`/entities/${id}`, data);
    return response.data;
  },
```

**Status:** ✅ Service method - No changes needed

---

## 5. `handleSubmit` Functions

### File: `frontend/src/pages/ProfileSetupPage.tsx`

**Lines:** 120-160 (Already shown above)

**Status:** ✅ Uses `updateProfile.mutateAsync()` - No changes needed

---

### File: `frontend/src/pages/creator/CreatorApplicationPage.tsx`

**Lines:** 152-221

```typescript
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    if (!validate()) {
      return;
    }

    if (!user) {
      setErrors({ submit: "You must be logged in to apply" });
      return;
    }

    setIsSubmitting(true);

    try {
      // Upload thumbnail if provided
      let thumbnailUrl: string | undefined;
      if (thumbnailFile) {
        const asset = await uploadAsset.mutateAsync({
          file: thumbnailFile,
          type: AssetType.IMAGE,
          ownerType: AssetOwnerType.USER,
          ownerId: user.id,
          isPublic: false,
          metadata: { purpose: "creator-thumbnail" },
        });
        thumbnailUrl = asset.url;
      }

      // Upload banner if provided
      let bannerUrl: string | undefined;
      if (bannerFile) {
        const asset = await uploadAsset.mutateAsync({
          file: bannerFile,
          type: AssetType.IMAGE,
          ownerType: AssetOwnerType.USER,
          ownerId: user.id,
          isPublic: false,
          metadata: { purpose: "creator-banner" },
        });
        bannerUrl = asset.url;
      }

      // Filter out empty social links
      const socialLinks = Object.fromEntries(
        Object.entries(formData.socialLinks).filter(([_, value]) => value.trim() !== "")
      );

      // Submit application
      await entitiesService.creatorApply({
        brandName: formData.brandName.trim(),
        category: formData.category,
        bio: formData.bio.trim() || undefined,
        website: formData.website.trim() || undefined,
        socialLinks: Object.keys(socialLinks).length > 0 ? socialLinks : undefined,
        thumbnail: thumbnailUrl,
        bannerImage: bannerUrl,
      });

      setIsSubmitted(true);
    } catch (error: any) {
      console.error("Creator application error:", error);
      const errorMessage =
        error.response?.data?.message || error.message || "Failed to submit application. Please try again.";
      setErrors({ submit: errorMessage });
    } finally {
      setIsSubmitting(false);
    }
  };
```

**Status:** ✅ Uses `entitiesService.creatorApply()` - No changes needed

---

## 6. `onSubmit` Form Attributes

### File: `frontend/src/pages/ProfileSetupPage.tsx`

**Line:** 238

```typescript
          <form onSubmit={handleSubmit} className="space-y-8">
```

**Status:** ✅ Form attribute - No changes needed

---

### File: `frontend/src/pages/creator/CreatorApplicationPage.tsx`

**Line:** 280

```typescript
          <form onSubmit={handleSubmit} className="space-y-8">
```

**Status:** ✅ Form attribute - No changes needed

---

### Other `onSubmit` matches (form attributes only):
- `frontend/src/pages/RegisterPage.tsx:131`
- `frontend/src/pages/LoginPage.tsx:92`
- `frontend/src/modals/creator/*.tsx` (multiple modal forms)
- `frontend/src/components/profile/ProfileSearchBar.tsx:20`

**Status:** ✅ All are form `onSubmit` attributes - No changes needed

---

## 7. Settings Pages (Placeholders)

### File: `frontend/src/pages/settings/SettingsProfilePage.tsx`

**Lines:** 1-36

```typescript
/**
 * Profile Settings Page
 * 
 * Allows users to edit their profile information:
 * - First name, Last name
 * - Username
 * - Bio
 * - Avatar image upload
 * - Banner image upload
 * - Location
 * - Website
 * - Social links
 * - Visibility (public/private)
 * 
 * TODO: Implement form logic and API integration
 */
export function SettingsProfilePage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-4xl md:text-5xl font-heading font-bold text-white mb-2 uppercase tracking-tighter">
          Profile Settings
        </h1>
        <p className="text-[#9A9A9A] font-body">
          Update your profile information and preferences
        </p>
      </div>

      <div className="bg-[#0B0B0B]/90 backdrop-blur-sm border border-gray-800 rounded-lg shadow-lg p-8">
        <p className="text-[#9A9A9A] font-body">
          Profile settings form will be implemented here.
        </p>
      </div>
    </div>
  );
}
```

**Status:** ⚠️ **TODO** - Needs implementation (can reuse `ProfileSetupPage` logic)

---

### File: `frontend/src/pages/settings/SettingsCreatorPage.tsx`

**Lines:** 1-38

```typescript
/**
 * Creator Settings Page
 * 
 * This replaces /creator/apply
 * 
 * States:
 * 1. No application yet - Show application form
 * 2. Application Submitted (PENDING) - Show pending status
 * 3. Approved - Show success message with link to creator dashboard
 * 4. Rejected - Show rejection reason and allow reapplication
 * 
 * TODO: 
 * - Integrate with existing CreatorApplicationPage logic
 * - Fetch creator status from API
 * - Handle different states based on entity status
 * - Move CreatorApplicationPage component here or reuse it
 */
export function SettingsCreatorPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-4xl md:text-5xl font-heading font-bold text-white mb-2 uppercase tracking-tighter">
          Become a Creator
        </h1>
        <p className="text-[#9A9A9A] font-body">
          Apply to become a creator and unlock advanced features
        </p>
      </div>

      <div className="bg-[#0B0B0B]/90 backdrop-blur-sm border border-gray-800 rounded-lg shadow-lg p-8">
        <p className="text-[#9A9A9A] font-body">
          Creator application form will be implemented here.
          This will integrate with the existing CreatorApplicationPage component.
        </p>
      </div>
    </div>
  );
}
```

**Status:** ⚠️ **TODO** - Needs implementation (can reuse `CreatorApplicationPage` logic)

---

## Summary

### ✅ Working Code (No Changes Needed)

1. **`useUpdateUserProfile` hook** - Properly implemented and used in:
   - `ProfileSetupPage.tsx`
   - `AvatarUpload.tsx`
   - `ProfileBanner.tsx`

2. **`useUpdateEntity` hook** - Properly implemented (not yet used in components)

3. **Service methods** - `updateProfile` and `updateEntity` are correctly implemented

4. **Form handlers** - All `handleSubmit` functions properly use mutations

### ⚠️ TODO Items

1. **`SettingsProfilePage.tsx`** - Needs implementation (can reuse `ProfileSetupPage` logic)
2. **`SettingsCreatorPage.tsx`** - Needs implementation (can reuse `CreatorApplicationPage` logic)

### 📝 Notes

- All update functions use React Query mutations correctly
- All mutations properly invalidate query cache
- No direct API calls found - all go through service layer
- Form submissions use `mutateAsync` for async/await pattern
- Error handling is implemented in all handlers



