import { useEffect, useState, FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useCreatorApplication } from "@/hooks/useEntities";
import { toast } from "react-toastify";

type TabIndex = 0 | 1 | 2 | 3 | 4 | 5;

const CREATOR_CATEGORIES = [
  { value: "musician", label: "Musician" },
  { value: "comedian", label: "Comedian" },
  { value: "speaker", label: "Speaker" },
  { value: "dancer", label: "Dancer" },
  { value: "fitness", label: "Fitness / Wellness" },
];

type SocialLinks = {
  instagram: string;
  tiktok: string;
  youtube: string;
  facebook: string;
  twitch: string;
  website: string;
};

type VerificationDraft = {
  businessDocs: string; // URLs or description
  trademarkDocs: string;
  pressLinks: string;
  awards: string;
  notes: string;
};

type CreatorForm = {
  brandName: string;
  category: string;
  purpose: string;
  website: string;
  thumbnail: string;
  bannerImage: string;
  socialLinks: SocialLinks;
  verification: VerificationDraft;
  termsAccepted: boolean;
};

export function SettingsCreatorPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const creatorApplication = useCreatorApplication();

  const [activeTab, setActiveTab] = useState<TabIndex>(0);
  const [form, setForm] = useState<CreatorForm>({
    brandName: "",
    category: "",
    purpose: "",
    website: "",
    thumbnail: "",
    bannerImage: "",
    socialLinks: {
      instagram: "",
      tiktok: "",
      youtube: "",
      facebook: "",
      twitch: "",
      website: "",
    },
    verification: {
      businessDocs: "",
      trademarkDocs: "",
      pressLinks: "",
      awards: "",
      notes: "",
    },
    termsAccepted: false,
  });

  // ---- DRAFT PERSISTENCE (localStorage for now) ----
  useEffect(() => {
    if (!user) return;
    const key = `creatorDraft:${user.id}`;
    const raw = localStorage.getItem(key);
    if (!raw) return;

    try {
      const parsed = JSON.parse(raw);
      setForm((prev) => ({ ...prev, ...parsed }));
    } catch (e) {
      console.warn("Failed to parse creator draft from localStorage", e);
    }
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const key = `creatorDraft:${user.id}`;
    localStorage.setItem(key, JSON.stringify(form));
  }, [user, form]);

  if (!user) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-heading text-white">Creator Application</h1>
        <p className="text-gray-400">Loading your account…</p>
      </div>
    );
  }

  const isSubmitting = creatorApplication.isPending;

  // ---------- Generic change handlers ----------

  const handleBasicChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSocialChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const { name, value } = e.target;
    setForm((prev) => ({
      ...prev,
      socialLinks: {
        ...prev.socialLinks,
        [name]: value,
      },
    }));
  };

  const handleVerificationChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setForm((prev) => ({
      ...prev,
      verification: {
        ...prev.verification,
        [name]: value,
      },
    }));
  };

  const handleTermsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((prev) => ({
      ...prev,
      termsAccepted: e.target.checked,
    }));
  };

  // ---------- Navigation helpers ----------

  const goToTab = (index: TabIndex) => setActiveTab(index);

  const handleNext = () => {
    setActiveTab((prev) => (prev < 5 ? ((prev + 1) as TabIndex) : prev));
  };

  const handlePrev = () => {
    setActiveTab((prev) => (prev > 0 ? ((prev - 1) as TabIndex) : prev));
  };

  // ---------- Submit ----------

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!form.brandName.trim()) {
      toast.error("Please provide a brand or stage name.");
      setActiveTab(0);
      return;
    }

    if (!form.category) {
      toast.error("Please select a category.");
      setActiveTab(0);
      return;
    }

    if (!form.purpose.trim()) {
      toast.error("Please describe your purpose or what you create.");
      setActiveTab(0);
      return;
    }

    if (!form.termsAccepted) {
      toast.error("You must accept the terms and conditions before submitting.");
      setActiveTab(4);
      return;
    }

    try {
      const socialLinks: Record<string, string> = {};
      Object.entries(form.socialLinks).forEach(([key, value]) => {
        const trimmed = value.trim();
        if (trimmed) {
          socialLinks[key] = trimmed;
        }
      });

      await creatorApplication.mutateAsync({
        brandName: form.brandName.trim(),
        category: (form.category ||
          "musician") as
          | "musician"
          | "comedian"
          | "speaker"
          | "dancer"
          | "fitness",
        purpose: form.purpose.trim(),
        socialLinks: Object.keys(socialLinks).length ? socialLinks : undefined,
        website: form.website.trim() || undefined,
        thumbnail: form.thumbnail.trim() || undefined,
        bannerImage: form.bannerImage.trim() || undefined,
        termsAccepted: form.termsAccepted,
      });

      // clear draft
      localStorage.removeItem(`creatorDraft:${user.id}`);

      toast.success("Creator application submitted! Your status is now pending.");
      navigate("/settings"); // back to settings home where card shows "Pending"
    } catch (err: any) {
      console.error("Creator application error", err);
      const message =
        err?.response?.data?.message ||
        "Failed to submit your application. Please try again or contact support.";
      toast.error(message);
    }
  };

  // ---------- Tabs Definition ----------

  const tabs = [
    "Brand Info",
    "Media",
    "Social Links",
    "Social Proof",
    "Legal",
    "Review & Submit",
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl md:text-4xl font-heading font-bold text-white tracking-tight mb-2">
          Creator Application
        </h1>
        <p className="text-gray-400 max-w-2xl">
          Tell us about your brand, your work, and how we can verify you. You can
          move between tabs and your progress is saved as a draft in your browser.
        </p>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-800 flex flex-wrap gap-2">
        {tabs.map((label, index) => {
          const i = index as TabIndex;
          const isActive = activeTab === i;
          return (
            <button
              key={label}
              type="button"
              onClick={() => goToTab(i)}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                isActive
                  ? "border-[#CD000E] text-white"
                  : "border-transparent text-gray-400 hover:text-white hover:border-gray-600"
              }`}
            >
              {label}
            </button>
          );
        })}
      </div>

      {/* Form (covers all tabs) */}
      <form
        onSubmit={handleSubmit}
        className="bg-[#0B0B0B]/90 border border-gray-800 rounded-lg shadow-lg p-6 md:p-8 space-y-6"
      >
        {/* TAB 1: BRAND INFO */}
        {activeTab === 0 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-heading text-white mb-1">
                Brand / Stage Identity
              </h2>
              <p className="text-sm text-gray-400">
                This is how your creator profile will appear across the platform.
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-200 mb-1">
                Brand / Stage Name
              </label>
              <input
                name="brandName"
                value={form.brandName}
                onChange={handleBasicChange}
                className="w-full rounded-md bg-black/60 border border-gray-700 px-3 py-2 text-sm text-white"
                placeholder="Example: Showgeo Live, DJ Signal, etc."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-200 mb-1">
                Category
              </label>
              <select
                name="category"
                value={form.category}
                onChange={handleBasicChange}
                className="w-full rounded-md bg-black/60 border border-gray-700 px-3 py-2 text-sm text-white"
              >
                <option value="">Select a category</option>
                {CREATOR_CATEGORIES.map((cat) => (
                  <option key={cat.value} value={cat.value}>
                    {cat.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-200 mb-1">
                What do you create? (Purpose)
              </label>
              <textarea
                name="purpose"
                value={form.purpose}
                onChange={handleBasicChange}
                rows={4}
                className="w-full rounded-md bg-black/60 border border-gray-700 px-3 py-2 text-sm text-white"
                placeholder="Describe your shows, content, or performances."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-200 mb-1">
                Website (optional)
              </label>
              <input
                name="website"
                value={form.website}
                onChange={handleBasicChange}
                className="w-full rounded-md bg-black/60 border border-gray-700 px-3 py-2 text-sm text-white"
                placeholder="https://your-site.com"
              />
            </div>
          </div>
        )}

        {/* TAB 2: MEDIA */}
        {activeTab === 1 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-heading text-white mb-1">
                Brand Media
              </h2>
              <p className="text-sm text-gray-400">
                Add images that represent your brand. In the future this will
                support direct uploads and galleries.
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-200 mb-1">
                Thumbnail Image URL
              </label>
              <input
                name="thumbnail"
                value={form.thumbnail}
                onChange={handleBasicChange}
                className="w-full rounded-md bg-black/60 border border-gray-700 px-3 py-2 text-sm text-white"
                placeholder="https://… (square or 1:1 image)"
              />
              <p className="text-xs text-gray-500 mt-1">
                This appears in lists and small cards.
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-200 mb-1">
                Banner Image URL
              </label>
              <input
                name="bannerImage"
                value={form.bannerImage}
                onChange={handleBasicChange}
                className="w-full rounded-md bg-black/60 border border-gray-700 px-3 py-2 text-sm text-white"
                placeholder="https://… (wide image for headers)"
              />
              <p className="text-xs text-gray-500 mt-1">
                This appears at the top of your creator profile.
              </p>
            </div>
          </div>
        )}

        {/* TAB 3: SOCIAL LINKS */}
        {activeTab === 2 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-heading text-white mb-1">
                Social Links
              </h2>
              <p className="text-sm text-gray-400">
                Connect your existing audience so fans can find you across
                platforms.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {["instagram", "tiktok", "youtube", "facebook", "twitch"].map(
                (platform) => (
                  <div key={platform}>
                    <label className="block text-sm font-medium text-gray-200 mb-1 capitalize">
                      {platform}
                    </label>
                    <input
                      name={platform}
                      value={(form.socialLinks as any)[platform]}
                      onChange={handleSocialChange}
                      className="w-full rounded-md bg-black/60 border border-gray-700 px-3 py-2 text-sm text-white"
                      placeholder={`https://${platform}.com/your-handle`}
                    />
                  </div>
                )
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-200 mb-1">
                Preferred Website (override)
              </label>
              <input
                name="website"
                value={form.socialLinks.website}
                onChange={handleSocialChange}
                className="w-full rounded-md bg-black/60 border border-gray-700 px-3 py-2 text-sm text-white"
                placeholder="If different from your main website"
              />
            </div>
          </div>
        )}

        {/* TAB 4: SOCIAL PROOF */}
        {activeTab === 3 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-heading text-white mb-1">
                Social Proof & Verification
              </h2>
              <p className="text-sm text-gray-400">
                Help us verify that you are who you say you are. You can provide
                links or upload supporting documentation. This ensures creator
                authenticity and accelerates approval.
              </p>
            </div>

            {/* BUSINESS VERIFICATION */}
            <div>
              <label className="block text-sm font-medium text-gray-200 mb-1">
                Business Verification (web link or attachment)
              </label>

              <input
                type="text"
                name="businessDocs"
                value={form.verification.businessDocs}
                onChange={handleVerificationChange}
                className="w-full rounded-md bg-black/60 border border-gray-700 px-3 py-2 text-sm text-white mb-2"
                placeholder="Link to your LLC filing, EIN registration, or business listing"
              />

              <input
                type="file"
                accept="image/*,.pdf"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  // Store filename for now – upload system can be added later
                  setForm((prev) => ({
                    ...prev,
                    verification: {
                      ...prev.verification,
                      businessDocs: `${prev.verification.businessDocs || ""} | FILE: ${file.name}`,
                    },
                  }));
                }}
                className="block text-sm text-gray-300"
              />

              <p className="text-xs text-gray-500 mt-1">
                You may provide a link OR upload a document.
              </p>
            </div>

            {/* TRADEMARK / IP VERIFICATION */}
            <div>
              <label className="block text-sm font-medium text-gray-200 mb-1">
                Trademark / IP Verification (web link or attachment)
              </label>

              <input
                type="text"
                name="trademarkDocs"
                value={form.verification.trademarkDocs}
                onChange={handleVerificationChange}
                className="w-full rounded-md bg-black/60 border border-gray-700 px-3 py-2 text-sm text-white mb-2"
                placeholder="Link to USPTO / WIPO record, copyright page, etc."
              />

              <input
                type="file"
                accept="image/*,.pdf"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  setForm((prev) => ({
                    ...prev,
                    verification: {
                      ...prev.verification,
                      trademarkDocs: `${prev.verification.trademarkDocs || ""} | FILE: ${file.name}`,
                    },
                  }));
                }}
                className="block text-sm text-gray-300"
              />

              <p className="text-xs text-gray-500 mt-1">
                You may provide a link OR upload a document.
              </p>
            </div>

            {/* CONTACT FOR CALL VERIFICATION */}
            <div>
              <label className="block text-sm font-medium text-gray-200 mb-1">
                Contact Phone Number for Verification
              </label>

              <input
                type="text"
                name="verificationPhone"
                value={(form.verification as any).verificationPhone || ""}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    verification: {
                      ...prev.verification,
                      verificationPhone: e.target.value,
                    },
                  }))
                }
                className="w-full rounded-md bg-black/60 border border-gray-700 px-3 py-2 text-sm text-white"
                placeholder="Example: +1 (555) 123-4567"
              />

              <p className="text-xs text-gray-500 mt-1">
                We may contact you briefly to confirm identity or business association.
              </p>
            </div>
          </div>
        )}

        {/* TAB 5: LEGAL */}
        {activeTab === 4 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-heading text-white mb-1">
                Legal & Terms
              </h2>
              <p className="text-sm text-gray-400">
                Please review the key points of the Creator Program before
                submitting your application.
              </p>
            </div>

            <div className="max-h-96 overflow-y-auto bg-black/40 border border-gray-800 rounded-md p-4 text-sm text-gray-300 space-y-4">
            {/* 1. Acceptance of Terms */}
            <div>
              <h3 className="font-semibold text-gray-100 mb-1">
                1. Acceptance of Terms
              </h3>
              <p>
                By creating an account, accessing the Showgeo platform, or submitting a Creator
                Application, you agree to be bound by these Terms &amp; Conditions (&quot;Terms&quot;),
                our Community Guidelines, Privacy Policy, and any additional policies referenced
                or presented to you (collectively, the &quot;Agreement&quot;). If you do not agree
                to these Terms, you may not use the platform or submit a Creator Application.
              </p>
            </div>

            {/* 2. Eligibility */}
            <div>
              <h3 className="font-semibold text-gray-100 mb-1">
                2. Eligibility
              </h3>
              <p>
                You must be at least 18 years old (or the age of legal majority in your
                jurisdiction) to apply as a creator or to monetize content on Showgeo. By
                using the platform, you represent and warrant that you meet these requirements
                and that you have the full right, power, and authority to enter into this Agreement.
                If you are applying on behalf of a business or organization, you represent that you
                are authorized to bind that entity.
              </p>
            </div>

            {/* 3. Account Registration & Security */}
            <div>
              <h3 className="font-semibold text-gray-100 mb-1">
                3. Account Registration &amp; Security
              </h3>
              <p>
                You agree to provide accurate, current, and complete information during registration
                and application, including your legal name, contact details, and any verification
                information we request. You are responsible for maintaining the confidentiality
                of your login credentials and for all activity that occurs under your account. You
                agree to notify Showgeo immediately of any unauthorized use of your account or any
                other breach of security.
              </p>
            </div>

            {/* 4. Content Ownership & License to Showgeo */}
            <div>
              <h3 className="font-semibold text-gray-100 mb-1">
                4. Content Ownership &amp; License to Showgeo
              </h3>
              <p className="mb-2">
                You retain ownership of all content you create and upload to the platform,
                including performances, streams, recordings, images, branding, and other materials
                (&quot;Creator Content&quot;). However, by uploading, streaming, or otherwise
                making Creator Content available on Showgeo, you grant Showgeo a worldwide,
                non-exclusive, royalty-free, sublicensable and transferable license to host,
                store, reproduce, adapt, modify (solely for technical formatting purposes),
                distribute, publicly perform, publicly display, and promote your Creator Content
                in connection with operating, marketing, and improving the platform.
              </p>
              <p>
                You represent and warrant that you have all rights, licenses, and permissions
                necessary to grant this license and that your Creator Content does not infringe
                the rights of any third party.
              </p>
            </div>

            {/* 5. Prohibited Content & Conduct */}
            <div>
              <h3 className="font-semibold text-gray-100 mb-1">
                5. Prohibited Content &amp; Conduct
              </h3>
              <p className="mb-2">
                You may not use Showgeo to upload, stream, promote, or facilitate any of the
                following:
              </p>
              <ul className="list-disc list-inside space-y-1">
                <li>Pornographic or sexually explicit material.</li>
                <li>Content involving exploitation, abuse, or endangerment of minors.</li>
                <li>Illegal drugs, trafficking, or controlled substances-related activity.</li>
                <li>Violent, hateful, or harassing content directed at individuals or groups.</li>
                <li>Content that promotes self-harm, suicide, or dangerous activities.</li>
                <li>Incitement to violence, terrorism, or criminal acts.</li>
                <li>
                  Unlicensed or infringing use of copyrighted music, video, images, or other
                  protected works.
                </li>
                <li>
                  Misleading, fraudulent, or deceptive practices, including impersonation or
                  passing off others’ work as your own.
                </li>
                <li>
                  Content that violates privacy, publicity, or other personal rights (including
                  unauthorized use of names, likenesses, or private information).
                </li>
              </ul>
              <p className="mt-2">
                Showgeo may, at its sole discretion, remove content, restrict features, suspend
                accounts, or terminate access for violations of these rules or for conduct it
                deems harmful to the community or the platform.
              </p>
            </div>

            {/* 6. Use of the Platform & Live Experiences */}
            <div>
              <h3 className="font-semibold text-gray-100 mb-1">
                6. Use of the Platform &amp; Live Experiences
              </h3>
              <p>
                Showgeo is designed for live and recorded performances, events, and related
                experiences. You agree to use the platform only for lawful purposes and in
                accordance with this Agreement. When using physical venues, you must comply
                with venue rules, safety standards, and any third-party partner policies.
                Showgeo is not responsible for disputes between you and venues, agents, or
                other third parties, but may suspend or terminate features if such disputes
                impact the platform or its users.
              </p>
            </div>

            {/* 7. Payments, Monetization & Fees */}
            <div>
              <h3 className="font-semibold text-gray-100 mb-1">
                7. Payments, Monetization &amp; Fees
              </h3>
              <p className="mb-2">
                If you are eligible for monetization (for example, through ticket sales,
                tips, subscriptions, or revenue share), you understand that:
              </p>
              <ul className="list-disc list-inside space-y-1">
                <li>
                  Payouts may require identity verification, tax documentation, and additional
                  compliance checks.
                </li>
                <li>
                  Showgeo may use third-party payment processors, and your use of those
                  services may be subject to their separate terms and fees.
                </li>
                <li>
                  Showgeo may withhold or delay payments if there is suspected fraud, policy
                  violations, chargebacks, or legal/compliance issues.
                </li>
                <li>
                  You are responsible for all taxes, fees, and reporting obligations related
                  to your earnings on the platform.
                </li>
              </ul>
            </div>

            {/* 8. Data, Privacy & Communications */}
            <div>
              <h3 className="font-semibold text-gray-100 mb-1">
                8. Data, Privacy &amp; Communications
              </h3>
              <p className="mb-2">
                Showgeo collects and processes certain personal and usage data in accordance
                with its Privacy Policy. By using the platform, you consent to this collection,
                use, and disclosure of information as described in that policy. We may contact
                you with service announcements, account updates, security alerts, and promotional
                messages; you may manage marketing preferences where legally required, but some
                service-related communications are mandatory.
              </p>
              <p>
                You agree not to misuse other users’ data or contact information obtained
                through the platform and not to scrape, harvest, or sell user data.
              </p>
            </div>

            {/* 9. Intellectual Property, DMCA & Takedowns */}
            <div>
              <h3 className="font-semibold text-gray-100 mb-1">
                9. Intellectual Property, DMCA &amp; Takedowns
              </h3>
              <p className="mb-2">
                Showgeo respects the intellectual property rights of others and expects you to
                do the same. If we receive a valid DMCA notice or other IP complaint, we may
                remove or disable access to the allegedly infringing content and may notify the
                account holder. Repeat infringement or abusive behavior may result in account
                termination. If you believe content has been removed in error, you may submit
                a counter-notice in accordance with our DMCA or takedown procedures.
              </p>
            </div>

            {/* 10. Social Proof & Verification */}
            <div>
              <h3 className="font-semibold text-gray-100 mb-1">
                10. Social Proof &amp; Verification
              </h3>
              <p className="mb-2">
                As part of the Creator Application, you may be asked to provide business
                verification (such as a website, business registration, or corporate entity
                documents), trademark or IP verification (such as registration records or
                license agreements), and a contact number for call verification.
              </p>
              <p>
                By submitting verification materials, you confirm that they are accurate and
                that you have the authority to represent the business, brand, or identity in
                question. Showgeo may rely on this information when deciding whether to
                approve or revoke creator status.
              </p>
            </div>

            {/* 11. Representations & Warranties */}
            <div>
              <h3 className="font-semibold text-gray-100 mb-1">
                11. Representations &amp; Warranties
              </h3>
              <p className="mb-2">
                You represent and warrant that:
              </p>
              <ul className="list-disc list-inside space-y-1">
                <li>
                  All information you provide to Showgeo is true, accurate, and not misleading.
                </li>
                <li>
                  You have all necessary rights and permissions in your Creator Content.
                </li>
                <li>
                  Your use of the platform and your content will comply with all applicable
                  laws and this Agreement.
                </li>
                <li>
                  You will not knowingly introduce malware, bots, or other harmful code into
                  the platform.
                </li>
              </ul>
            </div>

            {/* 12. Indemnification */}
            <div>
              <h3 className="font-semibold text-gray-100 mb-1">
                12. Indemnification
              </h3>
              <p>
                You agree to indemnify, defend, and hold harmless Showgeo, its affiliates,
                owners, officers, employees, and partners from and against any claims, damages,
                liabilities, losses, costs, and expenses (including reasonable attorneys&apos;
                fees) arising out of or related to (a) your Creator Content, (b) your use or
                misuse of the platform, (c) your violation of this Agreement, or (d) your
                violation of any third-party rights, including intellectual property or
                privacy rights.
              </p>
            </div>

            {/* 13. Limitation of Liability */}
            <div>
              <h3 className="font-semibold text-gray-100 mb-1">
                13. Limitation of Liability
              </h3>
              <p>
                To the maximum extent permitted by law, Showgeo and its affiliates shall not
                be liable for any indirect, incidental, consequential, special, or punitive
                damages, or any loss of profits or revenues, whether incurred directly or
                indirectly, arising from or related to your use of the platform. Showgeo&apos;s
                total aggregate liability for any claim arising out of or relating to this
                Agreement or the platform shall be limited to the amount paid to you by
                Showgeo (if any) in the twelve (12) months preceding the event giving rise to
                the claim.
              </p>
            </div>

            {/* 14. Suspension, Termination & Enforcement */}
            <div>
              <h3 className="font-semibold text-gray-100 mb-1">
                14. Suspension, Termination &amp; Enforcement
              </h3>
              <p className="mb-2">
                Showgeo may, at its sole discretion and without prior notice, remove content,
                restrict features, suspend your account, or terminate your access to the
                platform if:
              </p>
              <ul className="list-disc list-inside space-y-1">
                <li>You violate these Terms or any applicable policies.</li>
                <li>
                  You engage in conduct that is fraudulent, abusive, harmful, or that may
                  expose Showgeo or others to legal or reputational risk.
                </li>
                <li>
                  We receive valid complaints or repeated IP takedown notices related to your
                  content.
                </li>
              </ul>
              <p className="mt-2">
                We may also preserve or disclose information as required by law or as
                reasonably necessary to protect the rights, property, or safety of Showgeo,
                our users, or the public.
              </p>
            </div>

            {/* 15. Changes to Terms & Governing Law */}
            <div>
              <h3 className="font-semibold text-gray-100 mb-1">
                15. Changes to Terms &amp; Governing Law
              </h3>
              <p className="mb-2">
                Showgeo may update these Terms from time to time. When we make material
                changes, we will provide notice by updating the &quot;Last Updated&quot; date,
                through the platform, or via email. Your continued use of the platform after
                changes become effective constitutes your acceptance of the revised Terms.
              </p>
              <p>
                These Terms shall be governed by and construed in accordance with the laws of
                Colorado, without regard to its conflict
                of law principles. Any disputes arising under or relating to this Agreement
                shall be resolved in the courts or arbitration forum designated by Showgeo in
                its then-current Terms.
              </p>
            </div>

            {/* Footer Note */}
            <p className="text-xs text-gray-500">
              This summary is not personalized legal advice. You should consult your own
              attorney to review and finalize your platform&apos;s Terms &amp; Conditions. We reserve the right to remove an account for violations or inappropriate use.
            </p>
          </div>

            <label className="flex items-start gap-2 text-sm text-gray-200">
              <input
                type="checkbox"
                checked={form.termsAccepted}
                onChange={handleTermsChange}
                className="mt-1"
              />
              <span>
                I have read and agree to the Creator Program terms and conditions.
              </span>
            </label>
          </div>
        )}

        {/* TAB 6: REVIEW & SUBMIT */}
        {activeTab === 5 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-heading text-white mb-1">
                Review & Submit
              </h2>
              <p className="text-sm text-gray-400">
                Confirm your details before you submit. You’ll be able to see
                your application status in Settings once it’s submitted.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm text-gray-200">
              <div className="space-y-2">
                <h3 className="font-semibold text-white">Brand</h3>
                <p>
                  <span className="text-gray-400">Name:</span>{" "}
                  {form.brandName || "Not set"}
                </p>
                <p>
                  <span className="text-gray-400">Category:</span>{" "}
                  {form.category || "Not set"}
                </p>
                <p>
                  <span className="text-gray-400">Website:</span>{" "}
                  {form.website || "Not set"}
                </p>
              </div>

              <div className="space-y-2">
                <h3 className="font-semibold text-white">Media</h3>
                <p>
                  <span className="text-gray-400">Thumbnail:</span>{" "}
                  {form.thumbnail || "Not set"}
                </p>
                <p>
                  <span className="text-gray-400">Banner:</span>{" "}
                  {form.bannerImage || "Not set"}
                </p>
              </div>

              <div className="space-y-2">
                <h3 className="font-semibold text-white">Social Links</h3>
                {Object.entries(form.socialLinks).map(([key, value]) => (
                  <p key={key}>
                    <span className="text-gray-400 capitalize">{key}:</span>{" "}
                    {value || "Not set"}
                  </p>
                ))}
              </div>

              <div className="space-y-2">
                <h3 className="font-semibold text-white">Verification</h3>
                <p>
                  <span className="text-gray-400">Business:</span>{" "}
                  {form.verification.businessDocs || "Not set"}
                </p>
                <p>
                  <span className="text-gray-400">Trademark:</span>{" "}
                  {form.verification.trademarkDocs || "Not set"}
                </p>
                <p>
                  <span className="text-gray-400">Press:</span>{" "}
                  {form.verification.pressLinks || "Not set"}
                </p>
                <p>
                  <span className="text-gray-400">Awards:</span>{" "}
                  {form.verification.awards || "Not set"}
                </p>
              </div>
            </div>

            {!form.termsAccepted && (
              <p className="text-xs text-yellow-400">
                You must accept the terms on the Legal tab before you can
                submit.
              </p>
            )}
          </div>
        )}

        {/* Footer Navigation */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 pt-6 border-t border-gray-800">
          <div className="text-xs text-gray-500">
            Progress is saved locally as a draft. You can come back and finish
            later.
          </div>

          <div className="flex items-center gap-3">
            {activeTab > 0 && (
              <button
                type="button"
                onClick={handlePrev}
                className="px-4 py-2 rounded-md border border-gray-700 text-sm text-gray-200 hover:bg-gray-800"
              >
                Back
              </button>
            )}

            {activeTab < 5 && (
              <button
                type="button"
                onClick={handleNext}
                className="px-4 py-2 rounded-md bg-purple-600 text-sm font-medium text-white hover:bg-purple-500"
              >
                Save & Continue
              </button>
            )}

            {activeTab === 5 && (
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-4 py-2 rounded-md bg-[#CD000E] text-sm font-medium text-white hover:bg-red-700 disabled:opacity-60"
              >
                {isSubmitting ? "Submitting…" : "Submit Application"}
              </button>
            )}
          </div>
        </div>
      </form>
    </div>
  );
}
