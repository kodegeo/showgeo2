import { useNavigate } from "react-router-dom";
import { Activity, MessageSquare, Camera, Flag, Users } from "lucide-react";
import { useEventExperienceJoin } from "@/hooks/useEventExperienceJoin";
import { useLiveKitConnection } from "@/hooks/useLiveKitConnection";
import { useEventRealtime } from "@/hooks/useEventRealtime";
import { useStreaming } from "@/hooks/useStreaming";
import { EventExperienceShell } from "./EventExperienceShell";
import { LiveKitViewer } from "@/components/streaming/LiveKitViewer";

interface Props {
  eventId: string;
}

/**
 * Coordinator/control-room view. Shares the unified handshake with audience
 * and creator viewers but renders an operational shell instead of the
 * performer/audience UX.
 *
 * Intentionally minimal — production tools (camera switching, real moderation,
 * source mixing) are not built here. This is the structural placeholder.
 */
export function CoordinatorLiveViewer({ eventId }: Props) {
  const experience = useEventExperienceJoin(eventId, "coordinator", {
    streamRole: "VIEWER",
  });

  return (
    <EventExperienceShell
      eventId={eventId}
      experience={experience}
      canControlPhase
      backHref={`/studio/events/${eventId}/dashboard`}
      renderReady={({ event, token, livekitUrl }) => (
        <CoordinatorReadyView
          eventId={eventId}
          token={token}
          livekitUrl={livekitUrl}
          eventName={event?.name ?? "Live event"}
        />
      )}
    />
  );
}

function CoordinatorReadyView({
  eventId,
  token,
  livekitUrl,
  eventName,
}: {
  eventId: string;
  token: string | null;
  livekitUrl: string | null;
  eventName: string;
}) {
  const navigate = useNavigate();
  const { room, connected, connecting, error } = useLiveKitConnection(token, livekitUrl);
  const { energy, messages, isConnected } = useEventRealtime(eventId, "coordinator");
  const { session } = useStreaming(eventId);

  return (
    <div className="min-h-screen bg-[#050505] text-white flex flex-col">
      {/* Header */}
      <header className="border-b border-white/10 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-xs uppercase tracking-wider text-[#CD000E] font-semibold">
            Control Room
          </span>
          <span className="text-sm text-white/80">{eventName}</span>
        </div>
        <div className="flex items-center gap-3">
          <StatusDot label={isConnected ? "REALTIME" : "OFFLINE"} live={isConnected} />
          <StatusDot label={connected ? "STAGE" : "STAGE OFF"} live={connected} />
          <button
            type="button"
            onClick={() => navigate(`/studio/events/${eventId}/dashboard`)}
            className="text-xs text-white/60 hover:text-white border border-white/15 rounded px-2 py-1"
          >
            Back to dashboard
          </button>
        </div>
      </header>

      {/* Main grid: stage on left, ops panels on right */}
      <main className="flex-1 grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-3 p-3">
        <div className="space-y-3 min-w-0">
          <section className="aspect-video w-full bg-black border border-white/10 rounded-lg overflow-hidden flex items-center justify-center">
            {connecting && (
              <span className="text-white/40 text-sm animate-pulse">Connecting to stream…</span>
            )}
            {error && !connecting && <span className="text-red-400 text-sm">{error}</span>}
            {!connecting && !error && !room && (
              <span className="text-white/40 text-sm">Stream not connected</span>
            )}
            {room && connected && (
              <div className="w-full h-full">
                <LiveKitViewer room={room} />
              </div>
            )}
          </section>

          {/* Operational status row */}
          <section className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
            <Stat
              label="Energy"
              value={Math.round(energy).toString()}
              icon={<Activity className="w-3.5 h-3.5" />}
            />
            <Stat
              label="Viewers"
              value={(session?.viewers ?? 0).toString()}
              icon={<Users className="w-3.5 h-3.5" />}
            />
            <Stat
              label="Stream"
              value={session?.active ? "Active" : "Idle"}
              icon={<Camera className="w-3.5 h-3.5" />}
            />
            <Stat
              label="Messages"
              value={messages.length.toString()}
              icon={<MessageSquare className="w-3.5 h-3.5" />}
            />
          </section>
        </div>

        {/* Ops sidebar */}
        <aside className="flex flex-col gap-3 min-w-0">
          <ChatPanel messages={messages} />
          <Placeholder
            title="Camera / Source"
            icon={<Camera className="w-4 h-4" />}
            note="Source switching will land here. Coordinators will be able to mark active camera and stream source."
          />
          <Placeholder
            title="Moderation"
            icon={<Flag className="w-4 h-4" />}
            note="Report / hide message / kick controls go here."
          />
        </aside>
      </main>
    </div>
  );
}

function StatusDot({ label, live }: { label: string; live: boolean }) {
  return (
    <span className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide">
      <span
        className={`w-1.5 h-1.5 rounded-full ${
          live ? "bg-green-400 animate-pulse" : "bg-white/20"
        }`}
      />
      <span className={live ? "text-green-400" : "text-white/40"}>{label}</span>
    </span>
  );
}

function Stat({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  return (
    <div className="border border-white/10 rounded-lg p-2 bg-black/40">
      <div className="flex items-center gap-1.5 text-white/40 mb-0.5">
        {icon}
        <span className="uppercase tracking-wide">{label}</span>
      </div>
      <div className="text-white text-base tabular-nums">{value}</div>
    </div>
  );
}

function ChatPanel({ messages }: { messages: ReturnType<typeof useEventRealtime>["messages"] }) {
  return (
    <div className="border border-white/10 rounded-lg bg-black/40 flex flex-col max-h-72">
      <header className="px-3 py-2 border-b border-white/10 flex items-center gap-2">
        <MessageSquare className="w-3.5 h-3.5 text-white/40" />
        <span className="text-[11px] uppercase tracking-wide text-white/60 font-semibold">
          Live chat
        </span>
        <span className="ml-auto text-[10px] text-white/30">{messages.length}</span>
      </header>
      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-1.5 text-sm">
        {messages.length === 0 && (
          <p className="text-xs text-white/30 text-center py-4">No messages yet</p>
        )}
        {messages.map(m => (
          <div key={m.messageId} className="break-words">
            <span className="text-white/50 font-semibold mr-1.5">{m.displayName}</span>
            <span className="text-white/85">{m.text}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function Placeholder({
  title,
  icon,
  note,
}: {
  title: string;
  icon: React.ReactNode;
  note: string;
}) {
  return (
    <div className="border border-white/10 rounded-lg bg-black/40 p-3 space-y-1.5">
      <div className="flex items-center gap-2 text-white/60">
        {icon}
        <span className="text-[11px] uppercase tracking-wide font-semibold">{title}</span>
      </div>
      <p className="text-xs text-white/40 leading-relaxed">{note}</p>
    </div>
  );
}
