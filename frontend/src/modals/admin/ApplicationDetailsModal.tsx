import { Modal } from "@/components/creator/Modal";
import { CheckCircle, XCircle, Ban } from "lucide-react";
import type { EntityApplication } from "@/services/admin.service";

/**
 * StatusBadge - Reusable status badge component
 */
interface StatusBadgeProps {
  status: { label: string; variant: "danger" | "success" | "warning" };
}

function StatusBadge({ status }: StatusBadgeProps) {
  return (
    <span
      className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
        status.variant === "danger"
          ? "bg-red-500/20 text-red-400"
          : status.variant === "success"
          ? "bg-green-500/20 text-green-400"
          : "bg-yellow-500/20 text-yellow-400"
      }`}
    >
      {status.label}
    </span>
  );
}

interface ApplicationDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  application: EntityApplication | null;
  onAction: (action: "acceptApplication" | "rejectApplication" | "banApplication", application: EntityApplication) => void;
  isActionDisabled?: boolean;
  getApplicationStatus: (application: EntityApplication) => { label: string; variant: "danger" | "success" | "warning" };
}

/**
 * ApplicationDetailsModal - Displays detailed information about an entity application
 * 
 * Shows:
 * - Entity details (name, slug, bio, tags)
 * - Applicant information
 * - Application status and dates
 * - Reason (if present)
 * - Proof section (renders JSON key/value or URLs as links)
 * 
 * Includes action buttons (Accept/Reject/Ban) based on application status.
 */
export function ApplicationDetailsModal({
  isOpen,
  onClose,
  application,
  onAction,
  isActionDisabled = false,
  getApplicationStatus,
}: ApplicationDetailsModalProps) {
  if (!application) return null;

  const status = getApplicationStatus(application);
  const canAccept = application.status === "PENDING" || application.status === "REJECTED";
  const canReject = application.status === "PENDING";
  const canBan = application.status !== "BANNED";

  // Render proof section
  const renderProof = () => {
    if (!application.proof) {
      return <p className="text-white/40 text-sm">No proof provided</p>;
    }

    // If proof is an object, render as key/value pairs
    if (typeof application.proof === "object" && application.proof !== null) {
      const proofObj = application.proof as Record<string, any>;
      const entries = Object.entries(proofObj);

      if (entries.length === 0) {
        return <p className="text-white/40 text-sm">No proof provided</p>;
      }

      return (
        <div className="space-y-2">
          {entries.map(([key, value]) => {
            // Check if value is a URL
            const isUrl = typeof value === "string" && (
              value.startsWith("http://") ||
              value.startsWith("https://") ||
              value.startsWith("www.")
            );

            return (
              <div key={key} className="flex items-start space-x-2">
                <span className="text-white/60 text-sm font-medium min-w-[100px] capitalize">
                  {key.replace(/([A-Z])/g, " $1").trim()}:
                </span>
                <div className="flex-1">
                  {isUrl ? (
                    <a
                      href={value.startsWith("www.") ? `https://${value}` : value}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-400 hover:text-blue-300 underline text-sm break-all"
                    >
                      {value}
                    </a>
                  ) : (
                    <span className="text-white text-sm">{String(value)}</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      );
    }

    // If proof is a string, try to detect URLs
    const proofStr = String(application.proof);
    const urlRegex = /(https?:\/\/[^\s]+|www\.[^\s]+)/g;
    const urls = proofStr.match(urlRegex);

    if (urls && urls.length > 0) {
      let lastIndex = 0;
      const parts: React.ReactNode[] = [];

      urls.forEach((url, idx) => {
        const urlIndex = proofStr.indexOf(url, lastIndex);
        if (urlIndex > lastIndex) {
          parts.push(proofStr.substring(lastIndex, urlIndex));
        }
        parts.push(
          <a
            key={idx}
            href={url.startsWith("www.") ? `https://${url}` : url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-400 hover:text-blue-300 underline"
          >
            {url}
          </a>
        );
        lastIndex = urlIndex + url.length;
      });

      if (lastIndex < proofStr.length) {
        parts.push(proofStr.substring(lastIndex));
      }

      return <p className="text-white text-sm">{parts}</p>;
    }

    return <p className="text-white text-sm">{proofStr}</p>;
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Application Details"
      description={`View details for application from ${application.ownerEmail || "applicant"}`}
      size="lg"
    >
      <div className="space-y-6">
        {/* Entity Information */}
        <div>
          <h3 className="text-sm font-semibold text-white mb-3 uppercase tracking-wider">Entity Information</h3>
          <div className="space-y-3 bg-white/5 rounded-lg p-4">
            <div>
              <span className="text-white/60 text-sm">Name:</span>
              <p className="text-white font-medium">{application.entityName || "Unknown"}</p>
            </div>
            {application.entitySlug && (
              <div>
                <span className="text-white/60 text-sm">Slug:</span>
                <p className="text-white font-mono text-sm">@{application.entitySlug}</p>
              </div>
            )}
            {application.entityBio && (
              <div>
                <span className="text-white/60 text-sm">Bio:</span>
                <p className="text-white text-sm whitespace-pre-wrap">{application.entityBio}</p>
              </div>
            )}
            {application.entityTags && application.entityTags.length > 0 && (
              <div>
                <span className="text-white/60 text-sm">Tags:</span>
                <div className="flex flex-wrap gap-2 mt-1">
                  {application.entityTags.map((tag, idx) => (
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
          </div>
        </div>

        {/* Applicant Information */}
        <div>
          <h3 className="text-sm font-semibold text-white mb-3 uppercase tracking-wider">Applicant Information</h3>
          <div className="space-y-3 bg-white/5 rounded-lg p-4">
            <div>
              <span className="text-white/60 text-sm">Email:</span>
              <p className="text-white">{application.ownerEmail || "Unknown"}</p>
            </div>
            {application.ownerRole && (
              <div>
                <span className="text-white/60 text-sm">Role:</span>
                <p className="text-white">{application.ownerRole}</p>
              </div>
            )}
          </div>
        </div>

        {/* Application Status */}
        <div>
          <h3 className="text-sm font-semibold text-white mb-3 uppercase tracking-wider">Application Status</h3>
          <div className="space-y-3 bg-white/5 rounded-lg p-4">
            <div>
              <span className="text-white/60 text-sm">Status:</span>
              <div className="mt-1">
                <StatusBadge status={status} />
              </div>
            </div>
            <div>
              <span className="text-white/60 text-sm">Submitted:</span>
              <p className="text-white text-sm">
                {new Date(application.createdAt).toLocaleString()}
              </p>
            </div>
            {application.reason && (
              <div>
                <span className="text-white/60 text-sm">Reason:</span>
                <p className="text-white text-sm whitespace-pre-wrap mt-1">{application.reason}</p>
              </div>
            )}
          </div>
        </div>

        {/* Proof Section */}
        <div>
          <h3 className="text-sm font-semibold text-white mb-3 uppercase tracking-wider">Proof / Evidence</h3>
          <div className="bg-white/5 rounded-lg p-4">
            {renderProof()}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end space-x-3 pt-4 border-t border-gray-800">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-300 bg-gray-800 border border-gray-700 rounded-lg hover:bg-gray-700 transition-colors"
          >
            Close
          </button>
          
          {canAccept && (
            <button
              type="button"
              onClick={() => {
                onAction("acceptApplication", application);
                onClose();
              }}
              disabled={isActionDisabled}
              className="px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
              title={isActionDisabled ? "Another action is in progress" : undefined}
            >
              <CheckCircle className="w-4 h-4" />
              <span>Accept</span>
            </button>
          )}
          
          {canReject && (
            <button
              type="button"
              onClick={() => {
                onAction("rejectApplication", application);
                onClose();
              }}
              disabled={isActionDisabled}
              className="px-4 py-2 text-sm font-medium text-white bg-yellow-600 hover:bg-yellow-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
              title={isActionDisabled ? "Another action is in progress" : undefined}
            >
              <XCircle className="w-4 h-4" />
              <span>Reject</span>
            </button>
          )}
          
          {canBan && (
            <button
              type="button"
              onClick={() => {
                onAction("banApplication", application);
                onClose();
              }}
              disabled={isActionDisabled}
              className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
              title={isActionDisabled ? "Another action is in progress" : undefined}
            >
              <Ban className="w-4 h-4" />
              <span>Ban</span>
            </button>
          )}
        </div>
      </div>
    </Modal>
  );
}

