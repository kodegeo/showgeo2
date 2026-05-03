import { useCallback, useEffect, useRef } from "react";
import { useEventExperienceJoin } from "@/hooks/useEventExperienceJoin";
import { getLiveKitAttemptKey, useLiveKitConnection } from "@/hooks/useLiveKitConnection";
import { useStreaming } from "@/hooks/useStreaming";
import { EventExperienceShell } from "./EventExperienceShell";
import { StreamingLiveLayout } from "@/components/streaming/StreamingLiveLayout";
import { CreatorExperience } from "@/components/events/CreatorExperience";
import { ConnectionState } from "livekit-client";
import { supabase } from "@/lib/supabase";
import { streamingService } from "@/services/streaming.service";

interface Props {
  eventId: string;
}

/**
 * Creator / broadcaster studio live surface. Uses the same join handshake as
 * audience and coordinator, with BROADCASTER token and local publish.
 * Mount only outside CreatorDashboardLayout (full viewport), same routing pattern as EventLivePage.
 */
export function CreatorLiveViewer({ eventId }: Props) {
  const experience = useEventExperienceJoin(eventId, "creator", {
    streamRole: "BROADCASTER",
  });

  const { session, createSession, getActiveSession, refetch } = useStreaming(eventId);

  return (
    <EventExperienceShell
      eventId={eventId}
      experience={experience}
      canControlPhase
      backHref={`/studio/events/${eventId}/dashboard`}
      renderReady={({ token, livekitUrl }) => (
        <CreatorReadyView
          eventId={eventId}
          token={token}
          livekitUrl={livekitUrl}
          session={session}
          createSession={createSession}
          getActiveSession={getActiveSession}
          refetch={refetch}
        />
      )}
    />
  );
}

function CreatorReadyView({
  eventId,
  token,
  livekitUrl,
  session,
  createSession,
  getActiveSession,
  refetch,
}: {
  eventId: string;
  token: string | null;
  livekitUrl: string | null;
  session: ReturnType<typeof useStreaming>["session"];
  createSession: ReturnType<typeof useStreaming>["createSession"];
  getActiveSession: ReturnType<typeof useStreaming>["getActiveSession"];
  refetch: ReturnType<typeof useStreaming>["refetch"];
}) {
  const { room, connected, connecting, error } = useLiveKitConnection(token, livekitUrl);

  const sessionIdRef = useRef<string | null>(null);
  const accessTokenRef = useRef<string | null>(null);

  useEffect(() => {
    sessionIdRef.current = session?.id ?? null;
  }, [session?.id]);

  useEffect(() => {
    void supabase.auth.getSession().then(({ data }) => {
      accessTokenRef.current = data.session?.access_token ?? null;
    });
  }, [token, session?.id]);

  const endSessionSafe = useCallback(() => {
    const sid = sessionIdRef.current;
    if (!sid) return;
    void streamingService.endSession(sid).catch(() => {});
  }, []);

  useEffect(() => {
    const onBeforeUnload = () => {
      endSessionSafe();
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", onBeforeUnload);
      endSessionSafe();
    };
  }, [endSessionSafe]);

  // Ensure a streaming session exists for this event (creator broadcast).
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const active = await getActiveSession();
        if (cancelled) return;
        if (active?.active) {
          await refetch();
          return;
        }
        await createSession();
        if (!cancelled) await refetch();
      } catch {
        if (!cancelled) await refetch();
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [createSession, getActiveSession, refetch]);

  const liveKitReady =
    !!room && room.state === ConnectionState.Connected && connected && !!session;

  if (!liveKitReady) {
    return (
      <div className="min-h-screen bg-[#0B0B0B] flex items-center justify-center text-white/60 p-6">
        <div className="text-center space-y-2">
          <div className="animate-pulse">
            {!session
              ? "Preparing session…"
              : connecting || (room && room.state !== ConnectionState.Connected)
                ? "Connecting to LiveKit…"
                : "Preparing broadcast…"}
          </div>
          {error && <p className="text-red-400 text-sm">{error}</p>}
        </div>
      </div>
    );
  }

  const attemptKey = token && livekitUrl ? getLiveKitAttemptKey(token, livekitUrl) : null;
  const roomSid = (room as unknown as { sid?: string }).sid;
  console.log("[CreatorLiveViewer] using room instance", {
    attemptKey,
    roomName: room.name,
    state: room.state,
    sid: roomSid,
  });

  return (
    <div className="min-h-screen bg-[#0B0B0B] flex flex-col">
      <div className="flex-1">
        <StreamingLiveLayout
          room={room}
          session={session}
          isBroadcaster
          showViewerSidebar={false}
        />
      </div>

      <div className="border-t border-white/10 p-4 bg-black">
        <CreatorExperience eventId={eventId} />
      </div>
    </div>
  );
}
