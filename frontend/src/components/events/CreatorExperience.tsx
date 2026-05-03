import { useEffect, useRef, useState } from "react";
import { Zap, Wifi, WifiOff } from "lucide-react";
import { useCreatorRealtime } from "@/hooks/useCreatorRealtime";

interface Props {
  eventId: string;
  /** Join `/events` socket only when the event is in LIVE phase (from `events.phase`). */
  joinRealtime?: boolean;
}

// ── Color thresholds ──────────────────────────────────────────────────────────

type EnergyTier = { text: string; bar: string };

function getEnergyTier(e: number): EnergyTier {
  if (e >= 80) return { text: "text-[#F49600]", bar: "bg-[#CD000E]" };
  if (e >= 60) return { text: "text-[#CD000E]", bar: "bg-[#CD000E]" };
  if (e >= 30) return { text: "text-purple-400", bar: "bg-purple-500" };
  return { text: "text-blue-400", bar: "bg-blue-500" };
}

// ── Glow layer opacities ──────────────────────────────────────────────────────
// Three fixed-color layers (blue / purple / red) crossfade as energy moves
// through ranges. Opacity transitions in CSS handle the smooth color shift.

function glowOpacities(energy: number, boost: boolean) {
  const intensity = 0.08 + (energy / 100) * 0.34 + (boost ? 0.14 : 0);

  const blueContrib = energy <= 30 ? 1 : energy <= 60 ? 1 - (energy - 30) / 30 : 0;
  const purpleContrib =
    energy < 30 ? 0 : energy <= 60 ? (energy - 30) / 30 : energy <= 80 ? 1 - (energy - 60) / 20 : 0;
  const redContrib = energy < 60 ? 0 : Math.min(1, (energy - 60) / 40);

  return {
    blue: intensity * blueContrib,
    purple: intensity * purpleContrib,
    red: intensity * redContrib,
  };
}

// ── EnergyBar ─────────────────────────────────────────────────────────────────

function EnergyBar({ energy, barColor }: { energy: number; barColor: string }) {
  const pct = Math.min(100, Math.max(0, energy));
  return (
    <div className="h-2 bg-white/10 rounded-full overflow-hidden">
      <div
        className={`h-full rounded-full transition-all duration-500 ${barColor}`}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

// ── MomentumArrow ─────────────────────────────────────────────────────────────

type Momentum = "rising" | "falling" | "stable";

function MomentumArrow({ momentum }: { momentum: Momentum }) {
  const map: Record<Momentum, { symbol: string; color: string }> = {
    rising: { symbol: "↑", color: "text-green-400" },
    falling: { symbol: "↓", color: "text-white/25" },
    stable: { symbol: "—", color: "text-white/20" },
  };
  const { symbol, color } = map[momentum];
  return (
    <span className={`text-xl font-bold transition-colors duration-400 ${color}`}>{symbol}</span>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function CreatorExperience({ eventId, joinRealtime = true }: Props) {
  const { energy, messages, isConnected } = useCreatorRealtime(eventId, joinRealtime);

  const [pulseKey, setPulseKey] = useState(0);
  const [momentum, setMomentum] = useState<Momentum>("stable");
  const [chatBoost, setChatBoost] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const prevEnergyRef = useRef(0);
  const lastPulseTimeRef = useRef(0);
  const energyHistoryRef = useRef<number[]>([]);
  const chatBoostTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Auto-scroll chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Pulse trigger + momentum tracking — both driven by energy changes
  useEffect(() => {
    const now = Date.now();
    const delta = energy - prevEnergyRef.current;

    // Pulse ring: fire when energy jumps by > 5, max once per 300ms
    if (delta > 5 && now - lastPulseTimeRef.current > 300) {
      setPulseKey(k => k + 1);
      lastPulseTimeRef.current = now;
    }
    prevEnergyRef.current = energy;

    // Momentum: track last 3 values
    energyHistoryRef.current = [...energyHistoryRef.current, energy].slice(-3);
    const hist = energyHistoryRef.current;
    if (hist.length >= 2) {
      const diff = hist[hist.length - 1] - hist[0];
      setMomentum(diff > 3 ? "rising" : diff < -3 ? "falling" : "stable");
    }
  }, [energy]);

  // Chat boost — brief glow intensity spike on new message (visual only)
  useEffect(() => {
    if (messages.length === 0) return;
    setChatBoost(true);
    if (chatBoostTimerRef.current) clearTimeout(chatBoostTimerRef.current);
    chatBoostTimerRef.current = setTimeout(() => setChatBoost(false), 300);
  }, [messages.length]);

  const tier = getEnergyTier(energy);
  const glow = glowOpacities(energy, chatBoost);
  const energyDisplay = Math.round(energy);

  return (
    <div className="relative bg-black border border-white/10 rounded-xl overflow-hidden">
      {/* ── Glow layers (behind all content) ────────────────────────────────── */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse at 30% 50%, rgba(59,130,246,0.9) 0%, rgba(37,99,235,0.6) 40%, transparent 70%)",
          opacity: glow.blue,
          transition: "opacity 400ms ease-out",
        }}
        aria-hidden
      />
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse at 30% 50%, rgba(147,51,234,0.9) 0%, rgba(79,70,229,0.6) 40%, transparent 70%)",
          opacity: glow.purple,
          transition: "opacity 400ms ease-out",
        }}
        aria-hidden
      />
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse at 30% 50%, rgba(205,0,14,0.9) 0%, rgba(244,150,0,0.5) 50%, transparent 75%)",
          opacity: glow.red,
          transition: "opacity 400ms ease-out",
        }}
        aria-hidden
      />

      {/* ── Content ─────────────────────────────────────────────────────────── */}
      <div className="relative">
        {/* Header */}
        <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between">
          <span className="text-sm font-semibold text-white/60 uppercase tracking-wide">
            Audience Live View
          </span>
          <div className="flex items-center gap-2">
            {isConnected ? (
              <>
                <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                <Wifi className="w-3.5 h-3.5 text-green-400" />
                <span className="text-xs text-green-400 font-medium">LIVE</span>
              </>
            ) : (
              <>
                <WifiOff className="w-3.5 h-3.5 text-white/30" />
                <span className="text-xs text-white/30 font-medium">DISCONNECTED</span>
              </>
            )}
          </div>
        </div>

        <div className="flex flex-col lg:flex-row divide-y lg:divide-y-0 lg:divide-x divide-white/10">
          {/* ── Energy panel ──────────────────────────────────────────────── */}
          <div className="relative lg:w-64 px-5 py-6 flex flex-col gap-4 shrink-0 overflow-hidden">
            {/* Pulse ring — expands and fades on energy spike */}
            {pulseKey > 0 && (
              <div
                key={`pulse-${pulseKey}`}
                className="absolute inset-0 flex items-center justify-center pointer-events-none"
                aria-hidden
              >
                <span
                  className="absolute inline-flex h-36 w-36 rounded-full border border-white/20 animate-ping"
                  style={{
                    animationIterationCount: 1,
                    animationDuration: "600ms",
                    animationTimingFunction: "cubic-bezier(0,0,0.2,1)",
                    animationFillMode: "forwards",
                  }}
                />
              </div>
            )}

            {/* Label + momentum */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-white/40">
                <Zap className="w-4 h-4" />
                <span className="text-xs uppercase tracking-wide font-semibold">Energy</span>
              </div>
              <MomentumArrow momentum={momentum} />
            </div>

            {/* Large numeric display */}
            <div
              className={`text-7xl font-black tabular-nums leading-none transition-colors duration-500 ${tier.text}`}
            >
              {energyDisplay}
            </div>

            <EnergyBar energy={energy} barColor={tier.bar} />

            <p className="text-xs text-white/25 leading-relaxed">
              Smoothed audience engagement. Rises with taps, decays when quiet.
            </p>
          </div>

          {/* ── Chat panel ────────────────────────────────────────────────── */}
          <div className="flex-1 flex flex-col min-h-[280px] max-h-96">
            <div className="px-4 py-3 border-b border-white/10 shrink-0 flex items-center gap-2">
              <span className="text-xs font-semibold text-white/40 uppercase tracking-wide">
                Live Chat
              </span>
              {messages.length > 0 && (
                <span className="text-xs text-white/20">{messages.length}</span>
              )}
            </div>

            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2 scrollbar-thin">
              {messages.length === 0 ? (
                <p className="text-xs text-white/20 text-center pt-6">
                  Chat will appear here when your audience messages
                </p>
              ) : (
                messages.map(msg => (
                  <div key={msg.messageId} className="text-sm">
                    <span className="font-semibold text-white/60 mr-1.5">{msg.displayName}</span>
                    <span className="text-white/80 break-words">{msg.text}</span>
                  </div>
                ))
              )}
              <div ref={messagesEndRef} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
