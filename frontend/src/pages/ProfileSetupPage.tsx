import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useUpdateUserProfile } from "@/hooks/useUsers";
import Navigation from "@/components/Navigation/Navigation";
import { Footer } from "@/components/Footer";
import { AvatarUpload } from "@/components/uploads/AvatarUpload";

export function ProfileSetupPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
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


  localStorage.setItem("profileJustCompleted", "true");
  navigate("/profile", { replace: true });
  
  // ------------------------------------------------------------
  // Load existing profile data
  // ------------------------------------------------------------
  useEffect(() => {
    if (!user?.profile) return;

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
  }, [user]);


  // ------------------------------------------------------------
  // Handlers
  // ------------------------------------------------------------
  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));

    if (errors[name]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[name];
        return next;
      });
    }
  };

  const handleSocialLinkChange = (platform: string, value: string) => {
    setSocialLinks((prev) => ({ ...prev, [platform]: value }));
  };


 // ------------------------------------------------------------
  // Validation
  // ------------------------------------------------------------
  const validate = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.avatarUrl) newErrors.avatarUrl = "Profile image is required";
    if (!formData.firstName) newErrors.firstName = "First name is required";
    if (!formData.lastName) newErrors.lastName = "Last name is required";
    if (!formData.username) newErrors.username = "Username is required";
    if (!formData.location) newErrors.location = "Location is required";
    if (!formData.timezone) newErrors.timezone = "Timezone is required";

    if (formData.username.length > 50)
      newErrors.username = "Username must be 50 characters or less";

    if (formData.bio.length > 500)
      newErrors.bio = "Bio must be 500 characters or less";

    if (formData.website && !/^https?:\/\/.+/.test(formData.website))
      newErrors.website = "Website must be a valid URL";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // ------------------------------------------------------------
  // Submit Handler
  // ------------------------------------------------------------
  // ------------------------------------------------------------
  // Submit
  // ------------------------------------------------------------
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    if (!validate()) return;
    if (!user) return;

    setIsSubmitting(true);

    try {
      const filteredSocialLinks = Object.fromEntries(
        Object.entries(socialLinks).filter(([_, v]) => v.trim() !== "")
      );

      await updateProfile.mutateAsync({
        id: user.id,
        data: {
          ...formData,
          avatarUrl: formData.avatarUrl || undefined,
          socialLinks:
            Object.keys(filteredSocialLinks).length > 0
              ? filteredSocialLinks
              : undefined,
        },
      });
      
     } catch (error) {
       setErrors({
         submit:
           error instanceof Error
             ? error.message
             : "Failed to update profile. Please try again.",
       });
     } finally {
       setIsSubmitting(false);
     }
   };
   
  // ------------------------------------------------------------
  // Auth guard
  // ------------------------------------------------------------
  if (!user) {
    return (
      <div className="min-h-screen bg-[#0B0B0B] text-white flex items-center justify-center">
        <p className="text-[#9A9A9A] font-body">
          Please log in to edit your profile
        </p>
      </div>
    );
  }

  // ------------------------------------------------------------
  // Render (UNCHANGED UI)
  // ------------------------------------------------------------
  return (
    <div className="min-h-screen bg-[#0B0B0B] text-white flex flex-col">
      <Navigation />
      <main className="flex-1 pt-20 md:pt-24">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">          
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h1 className="text-4xl md:text-5xl font-heading font-bold text-white mb-2 uppercase tracking-tighter">
                  Setup Your Profile
                </h1>
                <p className="text-[#9A9A9A] font-body mt-2">
                  Complete your profile to get the most out of Showgeo
                </p>
              </div>
            </div>

            {/* Progress Indicator */}
            {user && (
              <div className="bg-[#0B0B0B]/90 backdrop-blur-sm border border-gray-800 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-heading font-semibold text-white uppercase tracking-wider">
                    Profile Completion
                  </span>
                  <span className="text-sm font-heading font-bold text-[#CD000E]">
                    {(() => {
                      let completed = 0;
                      let total = 8;
                      if (formData.firstName) completed++;
                      if (formData.lastName) completed++;
                      if (formData.username) completed++;
                      if (formData.bio) completed++;
                      if (formData.location) completed++;
                      if (formData.website) completed++;
                      if (Object.values(socialLinks).some((v) => v.trim())) completed++;
                      if (formData.avatarUrl) completed++;
                      return Math.round((completed / total) * 100);
                    })()}%
                  </span>
                </div>
                <div className="w-full bg-gray-800 rounded-full h-2">
                  <div
                    className="bg-[#CD000E] h-2 rounded-full transition-all duration-300"
                    style={{
                      width: `${(() => {
                        let completed = 0;
                        let total = 8;
                        if (formData.firstName) completed++;
                        if (formData.lastName) completed++;
                        if (formData.username) completed++;
                        if (formData.bio) completed++;
                        if (formData.location) completed++;
                        if (formData.website) completed++;
                        if (Object.values(socialLinks).some((v) => v.trim())) completed++;
                        if (formData.avatarUrl) completed++;
                        return Math.round((completed / total) * 100);
                      })()}%`,
                    }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Profile Setup Form */}
          <form onSubmit={handleSubmit} className="space-y-8">
            {errors.submit && (
              <div className="bg-red-900/30 border border-[#CD000E] text-[#CD000E] px-4 py-3 rounded-md text-sm font-body">
                {errors.submit}
              </div>
            )}

            {/* Basic Information */}
            <div className="bg-[#0B0B0B]/90 backdrop-blur-sm border border-gray-800 rounded-lg shadow-lg p-8">
              <h2 className="text-2xl font-heading font-semibold text-white mb-6 uppercase tracking-tight border-b border-gray-800 pb-3">
                Basic Information
              </h2>

              {/* Avatar Upload */}
              <div className="mb-6">
                <AvatarUpload
                  currentAvatarUrl={formData.avatarUrl}
                  onUploadComplete={(avatarUrl) => {
                    setFormData((prev) => ({ ...prev, avatarUrl }));
                  }}
                  userId={user?.id || ""}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="firstName" className="block text-sm font-heading font-semibold text-white mb-2 uppercase text-xs tracking-wider">
                    First Name
                  </label>
                  <input
                    id="firstName"
                    name="firstName"
                    type="text"
                    value={formData.firstName}
                    onChange={handleChange}
                    maxLength={100}
                    className="w-full px-4 py-3 border border-gray-700 bg-[#0B0B0B] placeholder-[#9A9A9A] text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-[#CD000E] focus:border-[#CD000E] transition-colors font-body"
                    placeholder="John"
                  />
                  {errors.firstName && (
                    <p className="mt-1 text-sm text-[#CD000E] font-body">{errors.firstName}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="lastName" className="block text-sm font-heading font-semibold text-white mb-2 uppercase text-xs tracking-wider">
                    Last Name
                  </label>
                  <input
                    id="lastName"
                    name="lastName"
                    type="text"
                    value={formData.lastName}
                    onChange={handleChange}
                    maxLength={100}
                    className="w-full px-4 py-3 border border-gray-700 bg-[#0B0B0B] placeholder-[#9A9A9A] text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-[#CD000E] focus:border-[#CD000E] transition-colors font-body"
                    placeholder="Doe"
                  />
                  {errors.lastName && (
                    <p className="mt-1 text-sm text-[#CD000E] font-body">{errors.lastName}</p>
                  )}
                </div>
              </div>

              <div className="mt-6">
                <label htmlFor="username" className="block text-sm font-heading font-semibold text-white mb-2 uppercase text-xs tracking-wider">
                  Username
                </label>
                <input
                  id="username"
                  name="username"
                  type="text"
                  value={formData.username}
                  onChange={handleChange}
                  maxLength={50}
                  className="w-full px-4 py-3 border border-gray-700 bg-[#0B0B0B] placeholder-[#9A9A9A] text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-[#CD000E] focus:border-[#CD000E] transition-colors font-body"
                  placeholder="johndoe"
                />
                <p className="mt-1 text-xs text-[#9A9A9A] font-body">
                  Choose a unique username for your profile
                </p>
                {errors.username && (
                  <p className="mt-1 text-sm text-[#CD000E] font-body">{errors.username}</p>
                )}
              </div>

              <div className="mt-6">
                <label htmlFor="bio" className="block text-sm font-heading font-semibold text-white mb-2 uppercase text-xs tracking-wider">
                  Bio
                </label>
                <textarea
                  id="bio"
                  name="bio"
                  value={formData.bio}
                  onChange={handleChange}
                  maxLength={500}
                  rows={4}
                  className="w-full px-4 py-3 border border-gray-700 bg-[#0B0B0B] placeholder-[#9A9A9A] text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-[#CD000E] focus:border-[#CD000E] transition-colors font-body resize-none"
                  placeholder="Tell us about yourself..."
                />
                <p className="mt-1 text-xs text-[#9A9A9A] font-body">
                  {formData.bio.length}/500 characters
                </p>
                {errors.bio && (
                  <p className="mt-1 text-sm text-[#CD000E] font-body">{errors.bio}</p>
                )}
              </div>
            </div>

            {/* Location & Contact */}
            <div className="bg-[#0B0B0B]/90 backdrop-blur-sm border border-gray-800 rounded-lg shadow-lg p-8">
              <h2 className="text-2xl font-heading font-semibold text-white mb-6 uppercase tracking-tight border-b border-gray-800 pb-3">
                Location & Contact
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="location" className="block text-sm font-heading font-semibold text-white mb-2 uppercase text-xs tracking-wider">
                    Location
                  </label>
                  <input
                    id="location"
                    name="location"
                    type="text"
                    value={formData.location}
                    onChange={handleChange}
                    maxLength={200}
                    className="w-full px-4 py-3 border border-gray-700 bg-[#0B0B0B] placeholder-[#9A9A9A] text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-[#CD000E] focus:border-[#CD000E] transition-colors font-body"
                    placeholder="Los Angeles, CA"
                  />
                  {errors.location && (
                    <p className="mt-1 text-sm text-[#CD000E] font-body">{errors.location}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="timezone" className="block text-sm font-heading font-semibold text-white mb-2 uppercase text-xs tracking-wider">
                    Timezone
                  </label>
                  <select
                    id="timezone"
                    name="timezone"
                    value={formData.timezone}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-700 bg-[#0B0B0B] text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-[#CD000E] focus:border-[#CD000E] transition-colors font-body"
                  >
                    <option value="">Select a timezone</option>
                    <optgroup label="North America">
                      <option value="America/New_York">Eastern Time (ET)</option>
                      <option value="America/Chicago">Central Time (CT)</option>
                      <option value="America/Denver">Mountain Time (MT)</option>
                      <option value="America/Los_Angeles">Pacific Time (PT)</option>
                      <option value="America/Phoenix">Arizona (MST)</option>
                      <option value="America/Anchorage">Alaska Time (AKT)</option>
                      <option value="Pacific/Honolulu">Hawaii Time (HST)</option>
                      <option value="America/Toronto">Toronto (ET)</option>
                      <option value="America/Vancouver">Vancouver (PT)</option>
                      <option value="America/Mexico_City">Mexico City (CST)</option>
                    </optgroup>
                    <optgroup label="Europe">
                      <option value="Europe/London">London (GMT/BST)</option>
                      <option value="Europe/Paris">Paris (CET/CEST)</option>
                      <option value="Europe/Berlin">Berlin (CET/CEST)</option>
                      <option value="Europe/Rome">Rome (CET/CEST)</option>
                      <option value="Europe/Madrid">Madrid (CET/CEST)</option>
                      <option value="Europe/Amsterdam">Amsterdam (CET/CEST)</option>
                      <option value="Europe/Stockholm">Stockholm (CET/CEST)</option>
                      <option value="Europe/Dublin">Dublin (GMT/IST)</option>
                      <option value="Europe/Lisbon">Lisbon (WET/WEST)</option>
                      <option value="Europe/Athens">Athens (EET/EEST)</option>
                      <option value="Europe/Moscow">Moscow (MSK)</option>
                    </optgroup>
                    <optgroup label="Asia">
                      <option value="Asia/Tokyo">Tokyo (JST)</option>
                      <option value="Asia/Shanghai">Shanghai (CST)</option>
                      <option value="Asia/Hong_Kong">Hong Kong (HKT)</option>
                      <option value="Asia/Singapore">Singapore (SGT)</option>
                      <option value="Asia/Seoul">Seoul (KST)</option>
                      <option value="Asia/Dubai">Dubai (GST)</option>
                      <option value="Asia/Kolkata">Mumbai/New Delhi (IST)</option>
                      <option value="Asia/Bangkok">Bangkok (ICT)</option>
                      <option value="Asia/Jakarta">Jakarta (WIB)</option>
                      <option value="Asia/Manila">Manila (PHT)</option>
                    </optgroup>
                    <optgroup label="Australia & Pacific">
                      <option value="Australia/Sydney">Sydney (AEDT/AEST)</option>
                      <option value="Australia/Melbourne">Melbourne (AEDT/AEST)</option>
                      <option value="Australia/Brisbane">Brisbane (AEST)</option>
                      <option value="Australia/Perth">Perth (AWST)</option>
                      <option value="Pacific/Auckland">Auckland (NZDT/NZST)</option>
                    </optgroup>
                    <optgroup label="South America">
                      <option value="America/Sao_Paulo">São Paulo (BRT/BRST)</option>
                      <option value="America/Buenos_Aires">Buenos Aires (ART)</option>
                      <option value="America/Lima">Lima (PET)</option>
                      <option value="America/Bogota">Bogotá (COT)</option>
                      <option value="America/Santiago">Santiago (CLT/CLST)</option>
                    </optgroup>
                    <optgroup label="Africa">
                      <option value="Africa/Cairo">Cairo (EET)</option>
                      <option value="Africa/Johannesburg">Johannesburg (SAST)</option>
                      <option value="Africa/Lagos">Lagos (WAT)</option>
                      <option value="Africa/Nairobi">Nairobi (EAT)</option>
                    </optgroup>
                  </select>
                  <p className="mt-1 text-xs text-[#9A9A9A] font-body">
                    Select your timezone for accurate event scheduling
                  </p>
                </div>
              </div>

              <div className="mt-6">
                <label htmlFor="website" className="block text-sm font-heading font-semibold text-white mb-2 uppercase text-xs tracking-wider">
                  Website
                </label>
                <input
                  id="website"
                  name="website"
                  type="url"
                  value={formData.website}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-700 bg-[#0B0B0B] placeholder-[#9A9A9A] text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-[#CD000E] focus:border-[#CD000E] transition-colors font-body"
                  placeholder="https://example.com"
                />
                {errors.website && (
                  <p className="mt-1 text-sm text-[#CD000E] font-body">{errors.website}</p>
                )}
              </div>
            </div>

            {/* Social Links */}
            <div className="bg-[#0B0B0B]/90 backdrop-blur-sm border border-gray-800 rounded-lg shadow-lg p-8">
              <h2 className="text-2xl font-heading font-semibold text-white mb-6 uppercase tracking-tight border-b border-gray-800 pb-3">
                Social Links
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {Object.entries(socialLinks).map(([platform, value]) => (
                  <div key={platform}>
                    <label
                      htmlFor={`social-${platform}`}
                      className="block text-sm font-heading font-semibold text-white mb-2 uppercase text-xs tracking-wider capitalize"
                    >
                      {platform}
                    </label>
                    <input
                      id={`social-${platform}`}
                      type="text"
                      value={value}
                      onChange={(e) => handleSocialLinkChange(platform, e.target.value)}
                      className="w-full px-4 py-3 border border-gray-700 bg-[#0B0B0B] placeholder-[#9A9A9A] text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-[#CD000E] focus:border-[#CD000E] transition-colors font-body"
                      placeholder={`@${platform}username`}
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Privacy Settings */}
            <div className="bg-[#0B0B0B]/90 backdrop-blur-sm border border-gray-800 rounded-lg shadow-lg p-8">
              <h2 className="text-2xl font-heading font-semibold text-white mb-6 uppercase tracking-tight border-b border-gray-800 pb-3">
                Privacy Settings
              </h2>

              <div>
                <label htmlFor="visibility" className="block text-sm font-heading font-semibold text-white mb-2 uppercase text-xs tracking-wider">
                  Profile Visibility
                </label>
                <select
                  id="visibility"
                  name="visibility"
                  value={formData.visibility}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-700 bg-[#0B0B0B] text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-[#CD000E] focus:border-[#CD000E] transition-colors font-body"
                >
                  <option value="public">Public</option>
                  <option value="private">Private</option>
                </select>
                <p className="mt-1 text-xs text-[#9A9A9A] font-body">
                  {formData.visibility === "public"
                    ? "Your profile is visible to everyone"
                    : "Your profile is only visible to you"}
                </p>
              </div>
            </div>

            {/* Form Actions */}
            <div className="flex flex-col sm:flex-row gap-4 justify-end">
              <button
                type="button"
                disabled={!user?.profile}
                onClick={() => navigate("/profile")}
                className="px-6 py-3 border border-gray-700 hover:border-[#CD000E] text-white font-heading font-semibold rounded-lg uppercase tracking-wider transition-all duration-300"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={isSubmitting || updateProfile.isPending}
                className="px-6 py-3 bg-[#CD000E] hover:bg-[#860005] text-white font-heading font-semibold rounded-lg uppercase tracking-wider transition-all duration-300 shadow-lg hover:shadow-[#CD000E]/50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting || updateProfile.isPending ? "Saving..." : "Save Profile"}
              </button>
            </div>
          </form>
        </div>
      </main>
      <Footer />
    </div>
  );
}

