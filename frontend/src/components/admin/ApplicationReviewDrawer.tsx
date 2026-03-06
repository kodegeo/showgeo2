import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { X, User, Mail, Building2, FileText, Tag, Phone } from "lucide-react";
import { useAdminEntityApplication } from "@/hooks/useAdmin";

interface ApplicationReviewDrawerProps {
  applicationId: string | null;
  isOpen: boolean;
  onClose: () => void;
}

/**
 * ApplicationReviewDrawer - Read-only review drawer for entity applications
 * 
 * Accepts applicationId and lazy-fetches:
 * - Application row (from entity_applications)
 * - Entity details (via entity_id)
 * - Applicant details (via owner_id)
 * 
 * This is a read-only review surface - no approve/reject/ban actions.
 */
export function ApplicationReviewDrawer({
  applicationId,
  isOpen,
  onClose,
}: ApplicationReviewDrawerProps) {
  const [internalNotes, setInternalNotes] = useState("");

  // Fetch single application by ID (includes enriched entity and applicant data)
  const { data: applicationData, isLoading: applicationLoading } = useAdminEntityApplication(applicationId);
  
  // Extract telephone number from applicationData
  // Priority: 1) applicant.phone (from entity_applications.phone), 2) telephoneNumber (top-level), 3) proof field (legacy)
  const getTelephoneNumber = (): string | null => {
    if (!applicationData) return null;
    
    // Primary: Get from applicant.phone (from entity_applications.phone column)
    if (applicationData.applicant?.phone) {
      return applicationData.applicant.phone;
    }
    
    // Secondary: Check if telephoneNumber is directly on applicationData (from admin query)
    if ((applicationData as any).telephoneNumber) {
      return (applicationData as any).telephoneNumber;
    }
    
    // Fallback: extract from proof field if it's an object (legacy support)
    if (applicationData.proof && typeof applicationData.proof === "object" && applicationData.proof !== null) {
      const proofObj = applicationData.proof as Record<string, any>;
      return proofObj.verificationPhone || proofObj.telephone || proofObj.phone || proofObj.telephoneNumber || null;
    }
    
    return null;
  };

  const telephoneNumber = getTelephoneNumber();
  
  // Debug: Log application data to check telephone number
  useEffect(() => {
    if (applicationData) {
      console.log("[ApplicationReviewDrawer] Application data:", applicationData);
      console.log("[ApplicationReviewDrawer] Telephone number (direct):", (applicationData as any).telephoneNumber);
      console.log("[ApplicationReviewDrawer] Telephone number (extracted):", telephoneNumber);
      console.log("[ApplicationReviewDrawer] Proof field:", applicationData.proof);
    }
  }, [applicationData, telephoneNumber]);

  // Load internal notes from localStorage when applicationId changes
  useEffect(() => {
    if (applicationId) {
      const savedNotes = localStorage.getItem(`app_review_notes_${applicationId}`);
      if (savedNotes) {
        setInternalNotes(savedNotes);
      } else {
        setInternalNotes("");
      }
    }
  }, [applicationId]);

  // Save internal notes to localStorage
  useEffect(() => {
    if (applicationId && internalNotes) {
      localStorage.setItem(`app_review_notes_${applicationId}`, internalNotes);
    }
  }, [applicationId, internalNotes]);

  // Handle ESC key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [isOpen, onClose]);

  // Render proof section
  // Proof can be:
  // 1. A JSON object with document URLs: { proof: "url", businessDoc: "url", trademarkDoc: "url" }
  // 2. A URL string (legacy single file) - display as downloadable link
  // 3. A plain string - display as text
  const renderProof = () => {
    if (!applicationData?.proof) {
      return <p className="text-white/40 text-sm">No document uploaded</p>;
    }

    const proof = applicationData.proof;

    // Helper to render a single document
    const renderDocument = (url: string, label: string, key: string) => {
      // Extract filename from URL if possible
      const urlParts = url.split("/");
      const filename = urlParts[urlParts.length - 1] || `${label.toLowerCase()}-document`;
      
      // Determine file type from URL extension
      const extension = filename.split(".").pop()?.toLowerCase() || "";
      const isImage = ["jpg", "jpeg", "png", "gif", "webp"].includes(extension);
      const isPdf = extension === "pdf";

      return (
        <div key={key} className="space-y-3 p-4 bg-white/5 rounded-lg border border-white/10">
          <div className="flex items-center space-x-3">
            <FileText className="w-5 h-5 text-blue-400 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-white text-sm font-medium truncate">{filename}</p>
              <p className="text-white/60 text-xs">{label}</p>
            </div>
          </div>
          
          {/* Preview for images */}
          {isImage && (
            <div className="mt-3">
              <img
                src={url}
                alt={`${label} preview`}
                className="max-w-full h-auto rounded-lg border border-white/10"
                onError={(e) => {
                  // Hide image if it fails to load
                  (e.target as HTMLImageElement).style.display = "none";
                }}
              />
            </div>
          )}

          {/* Download links */}
          <div className="mt-3 flex items-center space-x-3">
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center space-x-2 px-4 py-2 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 rounded-lg transition-colors text-sm font-medium"
            >
              <FileText className="w-4 h-4" />
              <span>{isPdf ? "View PDF" : isImage ? "View Image" : "View Document"}</span>
            </a>
            <a
              href={url}
              download
              className="inline-flex items-center space-x-2 px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors text-sm font-medium"
            >
              <span>Download</span>
            </a>
          </div>
        </div>
      );
    };

    // Handle JSON object format (new multi-document format)
    if (typeof proof === "object" && proof !== null) {
      const proofObj = proof as Record<string, any>;
      
      // Document labels mapping
      const documentLabels: Record<string, string> = {
        proof: "Proof Document",
        businessDoc: "Business Verification Document",
        trademarkDoc: "Trademark / IP Verification Document",
      };

      // Filter to only document URLs (ignore other fields)
      const documentEntries = Object.entries(proofObj).filter(([key, value]) => 
        documentLabels[key] && typeof value === "string" && (
          value.startsWith("http://") || value.startsWith("https://")
        )
      );

      if (documentEntries.length === 0) {
        // Fallback: show other fields if no document URLs found
        const otherEntries = Object.entries(proofObj).filter(([key]) => !documentLabels[key]);
        if (otherEntries.length === 0) {
          return <p className="text-white/40 text-sm">No documents uploaded</p>;
        }
        
        return (
          <div className="space-y-3">
            {otherEntries.map(([key, value]) => (
              <div key={key} className="flex flex-col space-y-1">
                <span className="text-white/60 text-xs font-medium uppercase tracking-wider">
                  {key.replace(/([A-Z])/g, " $1").trim()}
                </span>
                <div className="flex-1">
                  {typeof value === "string" && (value.startsWith("http://") || value.startsWith("https://")) ? (
                    <a
                      href={value}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-400 hover:text-blue-300 underline text-sm"
                    >
                      {value}
                    </a>
                  ) : (
                    <p className="text-white text-sm">{String(value)}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        );
      }

      // Render all document URLs
      return (
        <div className="space-y-4">
          {documentEntries.map(([key, url]) => (
            renderDocument(url, documentLabels[key] || key, key)
          ))}
        </div>
      );
    }

    // Legacy: Handle single URL string
    if (typeof proof === "string" && (proof.startsWith("http://") || proof.startsWith("https://"))) {
      return renderDocument(proof, "Proof Document", "proof");
    }

    // Fallback: plain string
    return (
      <div className="p-3 bg-white/5 rounded-lg border border-white/10">
        <p className="text-white text-sm">{String(proof)}</p>
      </div>
    );
  };

  const status = applicationData?.status;

  // Always render portal to document.body to escape parent overflow/z-index issues
  return createPortal(
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 bg-black/60 z-[9998] transition-opacity ${
          isOpen && applicationId ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
        onClick={onClose}
      />

      {/* Drawer */}
      <div
        className={`fixed top-0 right-0 h-screen w-[420px] bg-[#0B0B0B] border-l border-white/10 z-[9999] transform transition-transform duration-300 ${
          isOpen && applicationId ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-white/10">
            <div>
              <h2 className="text-xl font-bold text-white">Application Review</h2>
              <p className="text-sm text-white/60 mt-1">
                {applicationData?.entity?.name || "Loading..."}
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-white/60 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Scrollable Content */}
          <div className="flex-1 overflow-y-auto">
            {applicationLoading || !applicationData ? (
              <div className="p-6 text-center text-white/60">
                <p>{applicationLoading ? "Loading application details..." : "Application not found"}</p>
              </div>
            ) : (
            <div className="p-6 space-y-6">
              {/* Applicant Info */}
              <div>
                <h3 className="text-sm font-semibold text-white mb-3 uppercase tracking-wider flex items-center space-x-2">
                  <User className="w-4 h-4" />
                  <span>Applicant Information</span>
                </h3>
                <div className="space-y-3 bg-white/5 rounded-lg p-4">
                  <div className="flex items-center space-x-2">
                    <Mail className="w-4 h-4 text-white/40" />
                    <div>
                      <span className="text-white/60 text-xs">Email</span>
                      <p className="text-white text-sm">{applicationData.applicant?.email || "Unknown"}</p>
                    </div>
                  </div>
                  {telephoneNumber && (
                    <div className="flex items-center space-x-2">
                      <Phone className="w-4 h-4 text-white/40" />
                      <div>
                        <span className="text-white/60 text-xs">Telephone</span>
                        <p className="text-white text-sm">{telephoneNumber}</p>
                      </div>
                    </div>
                  )}
                  {applicationData.applicant?.id && (
                    <div>
                      <span className="text-white/60 text-xs">User ID</span>
                      <p className="text-white text-sm font-mono">{applicationData.applicant.id}</p>
                    </div>
                  )}
                  {applicationData.applicant?.role && (
                    <div>
                      <span className="text-white/60 text-xs">Role</span>
                      <p className="text-white text-sm">{applicationData.applicant.role}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Entity / Application Info */}
              <div>
                <h3 className="text-sm font-semibold text-white mb-3 uppercase tracking-wider flex items-center space-x-2">
                  <Building2 className="w-4 h-4" />
                  <span>Entity / Application Info</span>
                </h3>
                <div className="space-y-3 bg-white/5 rounded-lg p-4">
                  <div>
                    <span className="text-white/60 text-xs">Entity Name</span>
                    <p className="text-white font-medium">{applicationData.entity?.name || "Unknown"}</p>
                  </div>
                  {applicationData.entity?.slug && (
                    <div>
                      <span className="text-white/60 text-xs">Slug</span>
                      <p className="text-white text-sm font-mono">@{applicationData.entity.slug}</p>
                    </div>
                  )}
                  <div>
                    <span className="text-white/60 text-xs">Status</span>
                    <div className="mt-1">
                      <span
                        className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          status === "ACCEPTED"
                            ? "bg-green-500/20 text-green-400"
                            : status === "REJECTED"
                            ? "bg-yellow-500/20 text-yellow-400"
                            : status === "BANNED"
                            ? "bg-red-500/20 text-red-400"
                            : "bg-yellow-500/20 text-yellow-400"
                        }`}
                      >
                        {status || "PENDING"}
                      </span>
                    </div>
                  </div>
                  {applicationData.entity?.tags && applicationData.entity.tags.length > 0 && (
                    <div>
                      <span className="text-white/60 text-xs flex items-center space-x-1 mb-2">
                        <Tag className="w-3 h-3" />
                        <span>Tags</span>
                      </span>
                      <div className="flex flex-wrap gap-2">
                        {applicationData.entity.tags.map((tag: string, idx: number) => (
                          <span
                            key={idx}
                            className="px-2 py-1 bg-white/10 text-white text-xs rounded-full"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  {applicationData.createdAt && (
                    <div>
                      <span className="text-white/60 text-xs">Submitted</span>
                      <p className="text-white text-sm">
                        {new Date(applicationData.createdAt).toLocaleDateString("en-US", {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Submitted Application Details */}
              <div>
                <h3 className="text-sm font-semibold text-white mb-3 uppercase tracking-wider flex items-center space-x-2">
                  <FileText className="w-4 h-4" />
                  <span>Submitted Application Details</span>
                </h3>
                <div className="bg-white/5 rounded-lg p-4 space-y-4">
                  {applicationData.entity?.bio && (
                    <div>
                      <span className="text-white/60 text-xs">Bio</span>
                      <p className="text-white text-sm whitespace-pre-wrap break-words mt-1">
                        {applicationData.entity.bio}
                      </p>
                    </div>
                  )}
                  {applicationData.reason && (
                    <div>
                      <span className="text-white/60 text-xs">Reason</span>
                      <p className="text-white text-sm whitespace-pre-wrap break-words mt-1">
                        {applicationData.reason}
                      </p>
                    </div>
                  )}
                  <div>
                    <span className="text-white/60 text-xs mb-2 block">Proof / Evidence</span>
                    <div className="mt-1">{renderProof()}</div>
                  </div>
                </div>
              </div>

              {/* Internal Notes (Admin-only) */}
              <div>
                <h3 className="text-sm font-semibold text-white mb-3 uppercase tracking-wider">
                  Internal Notes
                </h3>
                <textarea
                  value={internalNotes}
                  onChange={(e) => setInternalNotes(e.target.value)}
                  placeholder="Internal notes (not visible to applicant)"
                  className="w-full h-32 px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                />
                <p className="text-xs text-white/40 mt-2">
                  Notes are saved locally and not visible to applicants
                </p>
              </div>
            </div>
            )}
          </div>

          {/* Close Button (Bottom-fixed) */}
          <div className="border-t border-white/10 bg-[#0B0B0B] p-6">
            <button
              onClick={onClose}
              className="w-full px-4 py-3 text-sm font-medium text-white bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </>,
    document.body
  );
}
