import { useState } from "react";
import { Link2, Twitter, Facebook, Code } from "lucide-react";

const DEFAULT_ORIGIN =
  typeof window !== "undefined" ? window.location.origin : "https://showgeo.com";

export interface EventPromotionToolsProps {
  eventId: string;
  eventName?: string;
  /** Base URL for links (e.g. https://showgeo.com). Defaults to window.location.origin */
  baseUrl?: string;
}

function getEventUrl(eventId: string, baseUrl: string): string {
  return `${baseUrl.replace(/\/$/, "")}/events/${eventId}`;
}

function getEmbedCode(eventId: string, baseUrl: string): string {
  const embedUrl = `${baseUrl.replace(/\/$/, "")}/events/${eventId}/embed`;
  return `<iframe src="${embedUrl}"></iframe>`;
}

export function EventPromotionTools({
  eventId,
  eventName = "Event",
  baseUrl = DEFAULT_ORIGIN,
}: EventPromotionToolsProps) {
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedEmbed, setCopiedEmbed] = useState(false);

  const eventUrl = getEventUrl(eventId, baseUrl);
  const embedCode = getEmbedCode(eventId, baseUrl);

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(eventUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    } catch {
      // fallback for older browsers
      try {
        const ta = document.createElement("textarea");
        ta.value = eventUrl;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
        setCopiedLink(true);
        setTimeout(() => setCopiedLink(false), 2000);
      } catch {
        // ignore
      }
    }
  }

  async function copyEmbed() {
    try {
      await navigator.clipboard.writeText(embedCode);
      setCopiedEmbed(true);
      setTimeout(() => setCopiedEmbed(false), 2000);
    } catch {
      try {
        const ta = document.createElement("textarea");
        ta.value = embedCode;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
        setCopiedEmbed(true);
        setTimeout(() => setCopiedEmbed(false), 2000);
      } catch {
        // ignore
      }
    }
  }

  function openTwitterShare() {
    const text = encodeURIComponent(`Check out ${eventName} on Showgeo`);
    const url = encodeURIComponent(eventUrl);
    window.open(
      `https://twitter.com/intent/tweet?text=${text}&url=${url}`,
      "_blank",
      "noopener,noreferrer,width=550,height=420",
    );
  }

  function openFacebookShare() {
    const url = encodeURIComponent(eventUrl);
    window.open(
      `https://www.facebook.com/sharer/sharer.php?u=${url}`,
      "_blank",
      "noopener,noreferrer,width=550,height=420",
    );
  }

  return (
    <div className="rounded-lg border border-white/10 bg-white/5 p-4">
      <h3 className="text-lg font-semibold text-white mb-3">Promote Event</h3>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={copyLink}
          className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white text-sm font-medium transition"
        >
          <Link2 className="w-4 h-4" aria-hidden />
          {copiedLink ? "Copied!" : "Copy Event Link"}
        </button>
        <button
          type="button"
          onClick={openTwitterShare}
          className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white text-sm font-medium transition"
        >
          <Twitter className="w-4 h-4" aria-hidden />
          Share to Twitter
        </button>
        <button
          type="button"
          onClick={openFacebookShare}
          className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white text-sm font-medium transition"
        >
          <Facebook className="w-4 h-4" aria-hidden />
          Share to Facebook
        </button>
        <button
          type="button"
          onClick={copyEmbed}
          className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white text-sm font-medium transition"
        >
          <Code className="w-4 h-4" aria-hidden />
          {copiedEmbed ? "Copied!" : "Copy Embed Code"}
        </button>
      </div>
    </div>
  );
}
