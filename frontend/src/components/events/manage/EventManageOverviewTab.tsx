import { Link } from "react-router-dom";
import {
  Calendar,
  Image as ImageIcon,
  Layers,
  Ticket,
  MessageSquare,
  Settings,
} from "lucide-react";
import type { Event } from "@/types/event.types";

export interface EventManageOverviewTabProps {
  eventId: string;
  event: Event;
}

export function EventManageOverviewTab({ eventId, event }: EventManageOverviewTabProps) {
  const manage = (path: string) => `/studio/events/${eventId}/manage${path}`;
  const branding = event.customBranding as Record<string, unknown> | undefined;
  const thumbnail = event.thumbnail;
  const bannerUrl = typeof branding?.bannerUrl === "string" ? branding.bannerUrl : null;

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-white/10 bg-white/[0.03] p-6">
        <h2 className="text-lg font-semibold text-white mb-4">Event summary</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex items-start gap-3">
            <Calendar className="w-5 h-5 text-[#CD000E] shrink-0 mt-0.5" />
            <div>
              <p className="text-xs text-white/45 uppercase tracking-wide">Status / phase</p>
              <p className="text-white/90">
                {event.status} · {event.phase}
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <Calendar className="w-5 h-5 text-[#CD000E] shrink-0 mt-0.5" />
            <div>
              <p className="text-xs text-white/45 uppercase tracking-wide">Starts</p>
              <p className="text-white/90">
                {new Date(event.startTime).toLocaleString(undefined, {
                  dateStyle: "full",
                  timeStyle: "short",
                })}
              </p>
            </div>
          </div>
        </div>
        {(thumbnail || bannerUrl) && (
          <div className="mt-6 flex flex-wrap gap-4">
            <div className="flex items-center gap-2 text-sm text-white/70">
              <ImageIcon className="w-4 h-4" />
              Media on file
            </div>
            <div className="flex gap-3 flex-wrap">
              {thumbnail && (
                <div className="w-32 aspect-video rounded-lg overflow-hidden border border-white/10 bg-white/5">
                  <img src={thumbnail} alt="" className="w-full h-full object-cover" />
                </div>
              )}
              {bannerUrl && (
                <div className="w-48 h-14 rounded-lg overflow-hidden border border-white/10 bg-white/5">
                  <img src={bannerUrl} alt="" className="w-full h-full object-cover" />
                </div>
              )}
            </div>
          </div>
        )}
      </section>

      <section className="rounded-xl border border-white/10 bg-white/[0.03] p-6">
        <h2 className="text-lg font-semibold text-white mb-2">Quick actions</h2>
        <p className="text-sm text-white/55 mb-4">
          Jump to the right tab without leaving this page.
        </p>
        <ul className="grid gap-2 sm:grid-cols-2 max-w-2xl">
          <li>
            <Link
              to={manage("?tab=audience")}
              className="flex items-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-sm text-white/90 hover:bg-white/5"
            >
              <Layers className="w-4 h-4 text-[#CD000E]" />
              Distribute access
            </Link>
          </li>
          <li>
            <Link
              to={manage("?tab=tickets")}
              className="flex items-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-sm text-white/90 hover:bg-white/5"
            >
              <Ticket className="w-4 h-4 text-[#CD000E]" />
              Ticket inventory
            </Link>
          </li>
          <li>
            <Link
              to={manage("?tab=messaging")}
              className="flex items-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-sm text-white/90 hover:bg-white/5"
            >
              <MessageSquare className="w-4 h-4 text-[#CD000E]" />
              Message audience
            </Link>
          </li>
          <li>
            <Link
              to={manage("?tab=settings")}
              className="flex items-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-sm text-white/90 hover:bg-white/5"
            >
              <Settings className="w-4 h-4 text-[#CD000E]" />
              Event settings
            </Link>
          </li>
        </ul>
      </section>

      <section className="rounded-xl border border-dashed border-white/20 bg-white/[0.02] p-6">
        <h2 className="text-lg font-semibold text-white/80 mb-2">Pre-live checklist</h2>
        <ul className="text-sm text-white/50 space-y-2 list-disc list-inside max-w-xl">
          <li>Confirm ticket types and pricing in the Tickets tab.</li>
          <li>Send invites or share your registration link from Audience.</li>
          <li>Review date, visibility, and geo rules in Settings.</li>
        </ul>
      </section>
    </div>
  );
}
