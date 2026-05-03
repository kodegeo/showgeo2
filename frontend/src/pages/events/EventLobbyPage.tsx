import { useEffect, useState, useRef } from "react";
import { useParams, Link } from "react-router-dom";
import { socket } from "@/hooks/useRealtime";

export interface LobbyMessage {
  eventId: string;
  text?: string;
  displayName?: string;
  messageId?: string;
  userId?: string;
  timestamp?: number;
}

export function EventLobbyPage() {
  const { id: eventId } = useParams<{ id: string }>();
  const [messages, setMessages] = useState<LobbyMessage[]>([]);
  const [input, setInput] = useState("");
  const listRef = useRef<HTMLUListElement>(null);

  useEffect(() => {
    if (!eventId) return;

    socket.emit("event:join", { eventId, role: "audience" });

    const onMessage = (msg: LobbyMessage) => {
      setMessages(prev => [...prev, msg]);
    };

    socket.on("event:chat", onMessage);

    return () => {
      socket.emit("event:leave", { eventId });
      socket.off("event:chat", onMessage);
    };
  }, [eventId]);

  useEffect(() => {
    listRef.current?.scrollTo(0, listRef.current.scrollHeight);
  }, [messages]);

  const sendMessage = () => {
    if (!eventId || !input.trim()) return;
    socket.emit("event:chat", {
      eventId,
      text: input.trim(),
    });
    setInput("");
  };

  if (!eventId) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <p>Event not found.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white flex flex-col">
      <header className="border-b border-white/10 px-4 py-3">
        <Link to={`/events/${eventId}`} className="text-white/80 hover:text-white text-sm">
          ← Back to event
        </Link>
        <h1 className="text-xl font-semibold mt-2">Event Lobby</h1>
        <hr className="border-white/10 mt-3" />
      </header>

      <div className="flex-1 flex flex-col max-w-2xl mx-auto w-full p-4 overflow-hidden">
        <ul
          ref={listRef}
          className="flex-1 overflow-y-auto space-y-2 mb-4 min-h-0"
          aria-label="Lobby messages"
        >
          {messages.length === 0 && (
            <li className="text-white/50 text-sm">No messages yet. Say hello!</li>
          )}
          {messages.map((msg, i) => (
            <li key={msg.messageId ?? i} className="text-sm">
              {msg.displayName && (
                <span className="font-medium text-white/90">{msg.displayName}: </span>
              )}
              {String(msg.text ?? "")}
            </li>
          ))}
        </ul>

        <div className="flex gap-2 flex-shrink-0">
          <input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === "Enter" && sendMessage()}
            placeholder="Type a message..."
            className="flex-1 bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-white/30"
            aria-label="Message input"
          />
          <button
            type="button"
            onClick={sendMessage}
            className="px-4 py-2 bg-white text-black rounded-lg font-medium hover:bg-white/90 transition-colors"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
