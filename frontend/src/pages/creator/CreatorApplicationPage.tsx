import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { entitiesService } from "@/services/entities.service";
import { useUploadAsset } from "@/hooks/useAssets";
import { AssetType, AssetOwnerType } from "../../../../packages/shared/types/asset.types";
import Navigation from "@/components/Navigation/Navigation";
import { Footer } from "@/components/Footer";
import { Upload, Loader2, CheckCircle, X } from "lucide-react";

type CreatorCategory = "musician" | "comedian" | "speaker" | "dancer" | "fitness";

export function CreatorApplicationPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const uploadAsset = useUploadAsset();

  const [formData, setFormData] = useState({
    brandName: "",
    category: "musician" as CreatorCategory,
    bio: "",
    website: "",
    socialLinks: {
      twitter: "",
      instagram: "",
      facebook: "",
      youtube: "",
      tiktok: "",
    },
  });

  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);
  const [bannerUrl, setBannerUrl] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const thumbnailInputRef = useRef<HTMLInputElement>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    if (name.startsWith("social.")) {
      const socialKey = name.split(".")[1];
      setFormData((prev) => ({
        ...prev,
        socialLinks: {
          ...prev.socialLinks,
          [socialKey]: value,
        },
      }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
    // Clear error for this field
    if (errors[name]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[name];
        return next;
      });
    }
  };

  const handleThumbnailChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      setErrors((prev) => ({ ...prev, thumbnail: "Please select an image file" }));
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setErrors((prev) => ({ ...prev, thumbnail: "Image must be less than 5MB" }));
      return;
    }

    setThumbnailFile(file);
    const url = URL.createObjectURL(file);
    setThumbnailUrl(url);
  };

  const handleBannerChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      setErrors((prev) => ({ ...prev, bannerImage: "Please select an image file" }));
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      setErrors((prev) => ({ ...prev, bannerImage: "Image must be less than 10MB" }));
      return;
    }

    setBannerFile(file);
    const url = URL.createObjectURL(file);
    setBannerUrl(url);
  };

  const removeThumbnail = () => {
    setThumbnailFile(null);
    setThumbnailUrl(null);
    if (thumbnailInputRef.current) {
      thumbnailInputRef.current.value = "";
    }
  };

  const removeBanner = () => {
    setBannerFile(null);
    setBannerUrl(null);
    if (bannerInputRef.current) {
      bannerInputRef.current.value = "";
    }
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.brandName.trim()) {
      newErrors.brandName = "Brand name is required";
    } else if (formData.brandName.length < 2) {
      newErrors.brandName = "Brand name must be at least 2 characters";
    } else if (formData.brandName.length > 200) {
      newErrors.brandName = "Brand name must be less than 200 characters";
    }

    if (!formData.category) {
      newErrors.category = "Category is required";
    }

    if (formData.bio && formData.bio.length > 2000) {
      newErrors.bio = "Bio must be less than 2000 characters";
    }

    if (formData.website && formData.website.length > 500) {
      newErrors.website = "Website URL must be less than 500 characters";
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

  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-[#0B0B0B] text-white flex flex-col">
        <Navigation />
        <main className="flex-1 pt-20 md:pt-24 flex items-center justify-center px-4">
          <div className="max-w-2xl w-full text-center">
            <div className="bg-[#0B0B0B]/90 backdrop-blur-sm border border-gray-800 rounded-lg shadow-lg p-12">
              <div className="mb-6 flex justify-center">
                <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center">
                  <CheckCircle className="w-12 h-12 text-green-500" />
                </div>
              </div>
              <h1 className="text-3xl md:text-4xl font-heading font-bold text-white mb-4 uppercase tracking-tighter">
                Application Submitted!
              </h1>
              <p className="text-[#9A9A9A] font-body text-lg mb-8">
                Your creator application has been submitted successfully. Our team will review it and get back to you soon.
              </p>
              <p className="text-[#9A9A9A] font-body text-sm mb-8">
                You'll receive a notification once your application has been reviewed.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <button
                  onClick={() => navigate("/dashboard")}
                  className="px-6 py-3 bg-[#CD000E] hover:bg-[#860005] text-white font-heading font-semibold rounded-lg uppercase tracking-wider transition-all duration-300 shadow-lg hover:shadow-[#CD000E]/50"
                >
                  Go to Dashboard
                </button>
                <button
                  onClick={() => navigate("/profile")}
                  className="px-6 py-3 border border-gray-700 hover:border-[#CD000E] text-white font-heading font-semibold rounded-lg uppercase tracking-wider transition-all duration-300"
                >
                  View Profile
                </button>
              </div>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0B0B0B] text-white flex flex-col">
      <Navigation />
      <main className="flex-1 pt-20 md:pt-24">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="mb-8">
            <h1 className="text-4xl md:text-5xl font-heading font-bold text-white mb-2 uppercase tracking-tighter">
              Become a Creator
            </h1>
            <p className="text-[#9A9A9A] font-body">
              Apply to become a creator and start sharing your content with the world
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-8">
            {errors.submit && (
              <div className="bg-red-900/30 border border-[#CD000E] text-[#CD000E] px-4 py-3 rounded-md text-sm font-body">
                {errors.submit}
              </div>
            )}

            {/* Brand Name */}
            <div className="bg-[#0B0B0B]/90 backdrop-blur-sm border border-gray-800 rounded-lg shadow-lg p-8">
              <h2 className="text-2xl font-heading font-semibold text-white mb-6 uppercase tracking-tight border-b border-gray-800 pb-3">
                Brand Information
              </h2>

              <div className="space-y-6">
                <div>
                  <label htmlFor="brandName" className="block text-sm font-heading font-semibold text-white mb-2 uppercase text-xs tracking-wider">
                    Brand Name <span className="text-[#CD000E]">*</span>
                  </label>
                  <input
                    id="brandName"
                    name="brandName"
                    type="text"
                    required
                    value={formData.brandName}
                    onChange={handleChange}
                    maxLength={200}
                    className="w-full px-4 py-3 border border-gray-700 bg-[#0B0B0B] placeholder-[#9A9A9A] text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-[#CD000E] focus:border-[#CD000E] transition-colors font-body"
                    placeholder="Your brand or artist name"
                  />
                  {errors.brandName && (
                    <p className="mt-1 text-sm text-[#CD000E] font-body">{errors.brandName}</p>
                  )}
                  <p className="mt-1 text-xs text-[#9A9A9A] font-body">
                    This will be your public creator name. Choose something unique and memorable.
                  </p>
                </div>

                <div>
                  <label htmlFor="category" className="block text-sm font-heading font-semibold text-white mb-2 uppercase text-xs tracking-wider">
                    Category <span className="text-[#CD000E]">*</span>
                  </label>
                  <select
                    id="category"
                    name="category"
                    required
                    value={formData.category}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-700 bg-[#0B0B0B] text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-[#CD000E] focus:border-[#CD000E] transition-colors font-body"
                  >
                    <option value="musician">Musician</option>
                    <option value="comedian">Comedian</option>
                    <option value="speaker">Speaker</option>
                    <option value="dancer">Dancer</option>
                    <option value="fitness">Fitness</option>
                  </select>
                  {errors.category && (
                    <p className="mt-1 text-sm text-[#CD000E] font-body">{errors.category}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="bio" className="block text-sm font-heading font-semibold text-white mb-2 uppercase text-xs tracking-wider">
                    About / Bio
                  </label>
                  <textarea
                    id="bio"
                    name="bio"
                    value={formData.bio}
                    onChange={handleChange}
                    maxLength={2000}
                    rows={6}
                    className="w-full px-4 py-3 border border-gray-700 bg-[#0B0B0B] placeholder-[#9A9A9A] text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-[#CD000E] focus:border-[#CD000E] transition-colors font-body resize-none"
                    placeholder="Tell us about yourself and your brand..."
                  />
                  <p className="mt-1 text-xs text-[#9A9A9A] font-body">
                    {formData.bio.length}/2000 characters
                  </p>
                  {errors.bio && (
                    <p className="mt-1 text-sm text-[#CD000E] font-body">{errors.bio}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Images */}
            <div className="bg-[#0B0B0B]/90 backdrop-blur-sm border border-gray-800 rounded-lg shadow-lg p-8">
              <h2 className="text-2xl font-heading font-semibold text-white mb-6 uppercase tracking-tight border-b border-gray-800 pb-3">
                Images
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Thumbnail */}
                <div>
                  <label className="block text-sm font-heading font-semibold text-white mb-2 uppercase text-xs tracking-wider">
                    Thumbnail Image
                  </label>
                  {thumbnailUrl ? (
                    <div className="relative">
                      <img
                        src={thumbnailUrl}
                        alt="Thumbnail preview"
                        className="w-full h-48 object-cover rounded-lg border border-gray-700"
                      />
                      <button
                        type="button"
                        onClick={removeThumbnail}
                        className="absolute top-2 right-2 p-2 bg-red-500 hover:bg-red-600 text-white rounded-full transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <div
                      onClick={() => thumbnailInputRef.current?.click()}
                      className="w-full h-48 border-2 border-dashed border-gray-700 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-[#CD000E] transition-colors"
                    >
                      <Upload className="w-8 h-8 text-[#9A9A9A] mb-2" />
                      <p className="text-sm text-[#9A9A9A] font-body">Click to upload thumbnail</p>
                      <p className="text-xs text-[#9A9A9A] font-body mt-1">Max 5MB</p>
                    </div>
                  )}
                  <input
                    ref={thumbnailInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleThumbnailChange}
                    className="hidden"
                  />
                  {errors.thumbnail && (
                    <p className="mt-1 text-sm text-[#CD000E] font-body">{errors.thumbnail}</p>
                  )}
                </div>

                {/* Banner */}
                <div>
                  <label className="block text-sm font-heading font-semibold text-white mb-2 uppercase text-xs tracking-wider">
                    Banner Image
                  </label>
                  {bannerUrl ? (
                    <div className="relative">
                      <img
                        src={bannerUrl}
                        alt="Banner preview"
                        className="w-full h-48 object-cover rounded-lg border border-gray-700"
                      />
                      <button
                        type="button"
                        onClick={removeBanner}
                        className="absolute top-2 right-2 p-2 bg-red-500 hover:bg-red-600 text-white rounded-full transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <div
                      onClick={() => bannerInputRef.current?.click()}
                      className="w-full h-48 border-2 border-dashed border-gray-700 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-[#CD000E] transition-colors"
                    >
                      <Upload className="w-8 h-8 text-[#9A9A9A] mb-2" />
                      <p className="text-sm text-[#9A9A9A] font-body">Click to upload banner</p>
                      <p className="text-xs text-[#9A9A9A] font-body mt-1">Max 10MB</p>
                    </div>
                  )}
                  <input
                    ref={bannerInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleBannerChange}
                    className="hidden"
                  />
                  {errors.bannerImage && (
                    <p className="mt-1 text-sm text-[#CD000E] font-body">{errors.bannerImage}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Links */}
            <div className="bg-[#0B0B0B]/90 backdrop-blur-sm border border-gray-800 rounded-lg shadow-lg p-8">
              <h2 className="text-2xl font-heading font-semibold text-white mb-6 uppercase tracking-tight border-b border-gray-800 pb-3">
                Links
              </h2>

              <div className="space-y-4">
                <div>
                  <label htmlFor="website" className="block text-sm font-heading font-semibold text-white mb-2 uppercase text-xs tracking-wider">
                    Website
                  </label>
                  <input
                    id="website"
                    name="website"
                    type="url"
                    value={formData.website}
                    onChange={handleChange}
                    maxLength={500}
                    className="w-full px-4 py-3 border border-gray-700 bg-[#0B0B0B] placeholder-[#9A9A9A] text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-[#CD000E] focus:border-[#CD000E] transition-colors font-body"
                    placeholder="https://yourwebsite.com"
                  />
                  {errors.website && (
                    <p className="mt-1 text-sm text-[#CD000E] font-body">{errors.website}</p>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="social.twitter" className="block text-sm font-heading font-semibold text-white mb-2 uppercase text-xs tracking-wider">
                      Twitter
                    </label>
                    <input
                      id="social.twitter"
                      name="social.twitter"
                      type="url"
                      value={formData.socialLinks.twitter}
                      onChange={handleChange}
                      className="w-full px-4 py-3 border border-gray-700 bg-[#0B0B0B] placeholder-[#9A9A9A] text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-[#CD000E] focus:border-[#CD000E] transition-colors font-body"
                      placeholder="https://twitter.com/username"
                    />
                  </div>

                  <div>
                    <label htmlFor="social.instagram" className="block text-sm font-heading font-semibold text-white mb-2 uppercase text-xs tracking-wider">
                      Instagram
                    </label>
                    <input
                      id="social.instagram"
                      name="social.instagram"
                      type="url"
                      value={formData.socialLinks.instagram}
                      onChange={handleChange}
                      className="w-full px-4 py-3 border border-gray-700 bg-[#0B0B0B] placeholder-[#9A9A9A] text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-[#CD000E] focus:border-[#CD000E] transition-colors font-body"
                      placeholder="https://instagram.com/username"
                    />
                  </div>

                  <div>
                    <label htmlFor="social.facebook" className="block text-sm font-heading font-semibold text-white mb-2 uppercase text-xs tracking-wider">
                      Facebook
                    </label>
                    <input
                      id="social.facebook"
                      name="social.facebook"
                      type="url"
                      value={formData.socialLinks.facebook}
                      onChange={handleChange}
                      className="w-full px-4 py-3 border border-gray-700 bg-[#0B0B0B] placeholder-[#9A9A9A] text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-[#CD000E] focus:border-[#CD000E] transition-colors font-body"
                      placeholder="https://facebook.com/username"
                    />
                  </div>

                  <div>
                    <label htmlFor="social.youtube" className="block text-sm font-heading font-semibold text-white mb-2 uppercase text-xs tracking-wider">
                      YouTube
                    </label>
                    <input
                      id="social.youtube"
                      name="social.youtube"
                      type="url"
                      value={formData.socialLinks.youtube}
                      onChange={handleChange}
                      className="w-full px-4 py-3 border border-gray-700 bg-[#0B0B0B] placeholder-[#9A9A9A] text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-[#CD000E] focus:border-[#CD000E] transition-colors font-body"
                      placeholder="https://youtube.com/@username"
                    />
                  </div>

                  <div>
                    <label htmlFor="social.tiktok" className="block text-sm font-heading font-semibold text-white mb-2 uppercase text-xs tracking-wider">
                      TikTok
                    </label>
                    <input
                      id="social.tiktok"
                      name="social.tiktok"
                      type="url"
                      value={formData.socialLinks.tiktok}
                      onChange={handleChange}
                      className="w-full px-4 py-3 border border-gray-700 bg-[#0B0B0B] placeholder-[#9A9A9A] text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-[#CD000E] focus:border-[#CD000E] transition-colors font-body"
                      placeholder="https://tiktok.com/@username"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Acknowledgment */}
            <div className="bg-[#0B0B0B]/90 backdrop-blur-sm border border-gray-800 rounded-lg shadow-lg p-8">
              <h2 className="text-2xl font-heading font-semibold text-white mb-4 uppercase tracking-tight border-b border-gray-800 pb-3">
                Acknowledgment
              </h2>
              <div className="space-y-3 text-sm text-[#9A9A9A] font-body">
                <p>By submitting this application, you acknowledge:</p>
                <ul className="list-disc list-inside space-y-2 ml-4">
                  <li>You are providing truthful and accurate information</li>
                  <li>You are responsible for the brand name and content you submit</li>
                  <li>You agree to comply with Showgeo's platform safety policies</li>
                  <li>Your application may be rejected if the brand is found to be fraudulent</li>
                </ul>
              </div>
            </div>

            {/* Submit Button */}
            <div className="flex flex-col sm:flex-row gap-4 justify-end">
              <button
                type="button"
                onClick={() => navigate("/profile/setup")}
                className="px-6 py-3 border border-gray-700 hover:border-[#CD000E] text-white font-heading font-semibold rounded-lg uppercase tracking-wider transition-all duration-300"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting || uploadAsset.isPending}
                className="px-6 py-3 bg-[#CD000E] hover:bg-[#860005] text-white font-heading font-semibold rounded-lg uppercase tracking-wider transition-all duration-300 shadow-lg hover:shadow-[#CD000E]/50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isSubmitting || uploadAsset.isPending ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  "Submit Application"
                )}
              </button>
            </div>
          </form>
        </div>
      </main>
      <Footer />
    </div>
  );
}

