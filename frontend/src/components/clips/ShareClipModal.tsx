import { useQuery } from "@tanstack/react-query";
import { clipsService } from "@/services/clips.service";
import { X, Link2, Twitter, Facebook, Linkedin, Download } from "lucide-react";

interface ShareClipModalProps {
  clipId: string;
  open: boolean;
  onClose: () => void;
}

export function ShareClipModal({ clipId, open, onClose }: ShareClipModalProps) {
  const { data: meta, isLoading } = useQuery({
    queryKey: ["clip-share", clipId],
    queryFn: () => clipsService.getShareMetadata(clipId),
    enabled: open && !!clipId,
  });

  const copyLink = () => {
    if (!meta?.clipUrl) return;
    navigator.clipboard.writeText(meta.clipUrl);
    onClose();
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70"
      onClick={onClose}
    >
      <div
        className="bg-gray-900 border border-gray-700 rounded-xl max-w-md w-full p-6 shadow-xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-white">Share clip</h3>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded text-white/60 hover:text-white"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {isLoading && <p className="text-white/60 text-sm">Loading…</p>}

        {meta && !isLoading && (
          <div className="space-y-4">
            <button
              type="button"
              onClick={copyLink}
              className="w-full flex items-center gap-2 px-4 py-3 rounded-lg bg-gray-800 hover:bg-gray-700 text-white"
            >
              <Link2 className="w-4 h-4" />
              Copy Link
            </button>
            <a
              href={meta.shareLinks.twitter}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full flex items-center gap-2 px-4 py-3 rounded-lg bg-gray-800 hover:bg-gray-700 text-white"
            >
              <Twitter className="w-4 h-4" />
              Share to X
            </a>
            <a
              href={meta.shareLinks.facebook}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full flex items-center gap-2 px-4 py-3 rounded-lg bg-gray-800 hover:bg-gray-700 text-white"
            >
              <Facebook className="w-4 h-4" />
              Share to Facebook
            </a>
            <a
              href={meta.shareLinks.linkedin}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full flex items-center gap-2 px-4 py-3 rounded-lg bg-gray-800 hover:bg-gray-700 text-white"
            >
              <Linkedin className="w-4 h-4" />
              Share to LinkedIn
            </a>
            <p className="text-white/50 text-xs flex items-center gap-1">
              <Download className="w-3 h-3" />
              Download clip — coming soon
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
