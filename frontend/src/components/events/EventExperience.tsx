import { useEffect, useRef, useState, useCallback } from "react";
import { Send, Video, Zap } from "lucide-react";
import type { Event } from "@/types/event.types";
import { useEventRealtime } from "@/hooks/useEventRealtime";
import { isLivePhase } from "@/utils/isLivePhase";
import { useAuth } from "@/hooks/useAuth";

interface Props {
  event?: Event;
}

function energyGlow(energy: number): string {
  if (energy >= 75) {
    return `radial-gradient(ellipse at center, rgba(205,0,14,${energy / 200}) 0%, rgba(244,150,0,${
      energy / 300
    }) 40%, transparent 70%)`;
  }
  if (energy >= 40) {
    return `radial-gradient(ellipse at center, rgba(147,51,234,${
      energy / 200
    }) 0%, rgba(79,70,229,${energy / 300}) 50%, transparent 70%)`;
  }
  return `radial-gradient(ellipse at center, rgba(59,130,246,${energy / 200}) 0%, rgba(37,99,235,${
    energy / 300
  }) 50%, transparent 70%)`;
}

function EnergyBar({ energy }: { energy: number }) {
  const color = energy >= 75 ? "bg-[#CD000E]" : energy >= 40 ? "bg-purple-500" : "bg-blue-500";
  return (
    <div className="flex items-center gap-2">
      <Zap
        className={`w-3.5 h-3.5 shrink-0 ${
          energy >= 75 ? "text-[#F49600]" : energy >= 40 ? "text-purple-400" : "text-blue-400"
        }`}
        aria-hidden
      />
      <div className="flex-1 h-1 bg-white/10 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-300 ${color}`}
          style={{ width: `${energy}%` }}
        />
      </div>
      <span className="text-[10px] text-white/30 w-6 text-right tabular-nums">
        {Math.round(energy)}
      </span>
    </div>
  );
}

export function EventExperience({ event }: Props) {
  const { user } = useAuth();
  const { energy, messages, sendTap, sendChatMessage, sendTypingPresence } = useEventRealtime(
    event?.id,
    "audience",
    isLivePhase(event?.phase),
  );

  const [tapCount, setTapCount] = useState(0);
  const [input, setInput] = useState("");
  const [pulseKey, setPulseKey] = useState(0);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleTap = useCallback(() => {
    setTapCount(c => c + 1);
    setPulseKey(k => k + 1);
    sendTap();
  }, [sendTap]);

  const sendMessage = useCallback(() => {
    const text = input.trim();
    if (!text) return;
    const userId = user?.id ?? "anonymous";
    const displayName = user?.profile?.username ?? user?.email?.split("@")[0] ?? "You";
    sendChatMessage(text, userId, displayName);
    setInput("");
    inputRef.current?.focus();
  }, [input, sendChatMessage, user]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value);
    sendTypingPresence();
  };

  return (
    // Desktop: side-by-side. Mobile: stacked.
    <div className="flex flex-col lg:flex-row gap-3 w-full">
      {/* ── Left: Player + tap layer ────────────────────────────────────── */}
      <div className="flex-1 min-w-0 space-y-2">
        {/* Player */}
        <div className="relative rounded-xl overflow-hidden bg-black border border-white/10 aspect-video select-none">
          {/* Placeholder stream */}
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-white/30">
            <Video className="w-10 h-10" aria-hidden />
            <p className="text-sm font-medium">
              {event?.status === "LIVE" ? "🎥 Live Event Stream" : "Stream will appear when live"}
            </p>
            {/* TODO: replace with livekit-client VideoTrack once streaming token is wired */}
          </div>

          {/* Energy glow overlay — driven by realtime pulse from server */}
          <div
            key={pulseKey}
            className="absolute inset-0 pointer-events-none transition-all duration-700"
            style={{ background: energyGlow(energy) }}
            aria-hidden
          />

          {/* Pulse ring on tap */}
          {pulseKey > 0 && (
            <div
              key={`ring-${pulseKey}`}
              className="absolute inset-0 pointer-events-none flex items-center justify-center"
              aria-hidden
            >
              <span className="animate-ping absolute inline-flex h-24 w-24 rounded-full bg-white/5" />
            </div>
          )}

          {/* Tap zone — full cover, sits above glow */}
          <button
            type="button"
            aria-label="Tap to add energy"
            className="absolute inset-0 w-full h-full cursor-pointer focus:outline-none"
            onClick={handleTap}
          />

          {/* Tap counter chip — local feedback only, resets per session */}
          {tapCount > 0 && (
            <div className="absolute top-3 right-3 pointer-events-none">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-black/60 text-white/70 text-xs font-mono tabular-nums">
                ⚡ {tapCount}
              </span>
            </div>
          )}
        </div>

        {/* Energy bar — driven by AudiencePulseAggregate.energy from server */}
        <div className="px-1">
          <EnergyBar energy={energy} />
        </div>
      </div>

      {/* ── Right: Chat panel ───────────────────────────────────────────── */}
      <div className="lg:w-72 xl:w-80 flex flex-col rounded-xl border border-white/10 bg-white/[0.03] overflow-hidden min-h-[280px] lg:max-h-[calc(56.25vw*0.6)] xl:max-h-96">
        {/* Header */}
        <div className="px-4 py-3 border-b border-white/10 flex items-center gap-2 shrink-0">
          <span className="text-xs font-semibold text-white/50 uppercase tracking-wide">Chat</span>
          {/* TODO(Phase 2C): show live viewer count from event state */}
        </div>

        {/* Message list */}
        <div className="flex-1 overflow-y-auto px-3 py-2 space-y-2 scrollbar-thin">
          {messages.length === 0 && (
            <p className="text-xs text-white/20 text-center pt-4">No messages yet</p>
          )}
          {messages.map(msg => {
            const isMe = msg.userId === user?.id;
            return (
              <div key={msg.messageId} className="text-sm">
                <span className={`font-semibold mr-1 ${isMe ? "text-[#F49600]" : "text-white/60"}`}>
                  {isMe ? "You" : msg.displayName}
                </span>
                <span className="text-white/80 break-words">{msg.text}</span>
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="px-3 py-3 border-t border-white/10 flex gap-2 shrink-0">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder="Say something…"
            maxLength={200}
            className="flex-1 min-w-0 bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white placeholder-white/30 focus:outline-none focus:border-white/30"
          />
          <button
            type="button"
            onClick={sendMessage}
            disabled={!input.trim()}
            aria-label="Send message"
            className="shrink-0 p-1.5 rounded-lg bg-[#CD000E] hover:bg-[#860005] text-white disabled:opacity-30 transition-colors"
          >
            <Send className="w-4 h-4" aria-hidden />
          </button>
        </div>
      </div>
    </div>
  );
}
