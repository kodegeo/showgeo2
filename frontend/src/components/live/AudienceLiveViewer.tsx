import { useSearchParams } from "react-router-dom";
import { useEventExperienceJoin } from "@/hooks/useEventExperienceJoin";
import { useLiveKitConnection } from "@/hooks/useLiveKitConnection";
import { useStreaming } from "@/hooks/useStreaming";
import { EventExperienceShell } from "./EventExperienceShell";
import { StreamingLiveLayout } from "@/components/streaming/StreamingLiveLayout";
import { EventExperience } from "@/components/events/EventExperience";

interface Props {
  eventId: string;
}

/**
 * Audience-facing live viewer. Reads the unified handshake hook and only
 * renders the LiveKit stage + tap/chat panel after READY.
 */
export function AudienceLiveViewer({ eventId }: Props) {
  // Tickets can arrive via URL params from claim links / mailbox / share links.
  const [searchParams] = useSearchParams();
  const ticketId = searchParams.get("ticketId") ?? searchParams.get("ticket") ?? undefined;
  const accessCode = searchParams.get("accessCode") ?? searchParams.get("code") ?? undefined;

  const experience = useEventExperienceJoin(eventId, "audience", {
    ticketId,
    accessCode,
    streamRole: "VIEWER",
  });

  const { session } = useStreaming(eventId);

  return (
    <EventExperienceShell
      eventId={eventId}
      experience={experience}
      backHref={`/events/${eventId}`}
      renderReady={({ event, token, livekitUrl }) => (
        <AudienceReadyView
          event={event}
          eventId={eventId}
          token={token}
          livekitUrl={livekitUrl}
          session={session}
        />
      )}
    />
  );
}

function AudienceReadyView({
  event,
  eventId,
  token,
  livekitUrl,
  session,
}: {
  event: ReturnType<typeof useEventExperienceJoin>["data"]["event"];
  eventId: string;
  token: string | null;
  livekitUrl: string | null;
  session: ReturnType<typeof useStreaming>["session"];
}) {
  const { room, connected, connecting, error } = useLiveKitConnection(token, livekitUrl);

  return (
    <div className="min-h-screen bg-[#0B0B0B] flex flex-col">
      {/* LiveKit player on top, tap/chat panel below.
          The LiveKit stage is hidden until connected to avoid layout shift. */}
      {room && connected && session ? (
        <div className="flex-1">
          <StreamingLiveLayout room={room} session={session} isBroadcaster={false} />
        </div>
      ) : (
        <div className="aspect-video w-full bg-black flex items-center justify-center text-white/50 text-sm">
          {connecting && "Connecting to LiveKit…"}
          {error && <span className="text-red-400">{error}</span>}
          {!connecting && !error && !session && "Waiting for stream session…"}
        </div>
      )}

      {/* Audience interaction layer — taps + chat. Always visible once event is loaded. */}
      <div className="border-t border-white/10 p-4 bg-black">
        {event && <EventExperience event={event} />}
      </div>

      <p className="text-[10px] text-white/30 text-center pb-2 px-4">
        Your access is tied to your account. Sharing this page does not grant access — each viewer
        needs their own ticket. (event {eventId})
      </p>
    </div>
  );
}
