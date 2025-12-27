// frontend/src/components/streaming/ReactionOverlay.tsx
import { useEffect, useState } from "react";
import type { Room } from "livekit-client";
import { DataPacket_Kind } from "livekit-client";

type ReactionOverlayProps = {
  room: Room;
};

type Reaction = {
  id: string;
  emoji: string;
  x: number;
  y: number;
  timestamp: number;
};

type ReactionData = {
  type: "reaction";
  emoji: string;
  userId?: string;
};

export function ReactionOverlay({ room }: ReactionOverlayProps) {
  const [reactions, setReactions] = useState<Reaction[]>([]);

  useEffect(() => {
    if (!room) return;

    const handleData = (payload: Uint8Array, kind?: DataPacket_Kind) => {
      try {
        const decoder = new TextDecoder();
        const text = decoder.decode(payload);
        const data: ReactionData = JSON.parse(text);

        if (data.type === "reaction" && data.emoji) {
          // Random position for floating animation
          const x = Math.random() * 80 + 10; // 10-90% of width
          const y = Math.random() * 60 + 20; // 20-80% of height

          const reaction: Reaction = {
            id: `${Date.now()}-${Math.random()}`,
            emoji: data.emoji,
            x,
            y,
            timestamp: Date.now(),
          };

          setReactions((prev) => [...prev, reaction]);

          // Remove reaction after animation completes (3 seconds)
          setTimeout(() => {
            setReactions((prev) => prev.filter((r) => r.id !== reaction.id));
          }, 3000);
        }
      } catch (error) {
        console.error("[ReactionOverlay] Failed to parse reaction data:", error);
      }
    };

    room.on("dataReceived", handleData);

    return () => {
      room.off("dataReceived", handleData);
    };
  }, [room]);

  const sendReaction = (emoji: string) => {
    if (!room) return;

    try {
      const data: ReactionData = {
        type: "reaction",
        emoji,
        userId: room.localParticipant?.identity,
      };

      const encoder = new TextEncoder();
      const payload = encoder.encode(JSON.stringify(data));

      room.localParticipant?.publishData(payload, DataPacket_Kind.RELIABLE);
    } catch (error) {
      console.error("[ReactionOverlay] Failed to send reaction:", error);
    }
  };

  return (
    <>
      {/* Floating Reactions */}
      <div className="absolute inset-0 pointer-events-none z-40 overflow-hidden">
        {reactions.map((reaction) => (
          <ReactionAnimation key={reaction.id} reaction={reaction} />
        ))}
      </div>

      {/* Reaction Button (for viewers) - Bottom Right */}
      <div className="absolute bottom-4 right-4 z-50 pointer-events-auto">
        <div className="flex gap-2">
          {["❤️", "🔥", "👏", "🎉"].map((emoji) => (
            <button
              key={emoji}
              onClick={() => sendReaction(emoji)}
              className="w-12 h-12 rounded-full bg-black/60 backdrop-blur-sm border border-gray-700 hover:bg-black/80 flex items-center justify-center text-2xl transition-all hover:scale-110 active:scale-95"
              title={`Send ${emoji} reaction`}
            >
              {emoji}
            </button>
          ))}
        </div>
      </div>
    </>
  );
}

function ReactionAnimation({ reaction }: { reaction: Reaction }) {
  return (
    <div
      className="absolute text-4xl animate-reaction-float"
      style={{
        left: `${reaction.x}%`,
        top: `${reaction.y}%`,
      }}
    >
      {reaction.emoji}
    </div>
  );
}

