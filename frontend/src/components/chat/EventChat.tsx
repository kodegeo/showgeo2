import { useEffect, useRef, useState } from "react";
import type { Socket } from "socket.io-client";
import { MessageCircle, Send, Loader2 } from "lucide-react";
import { chatService, type ChatMessage } from "@/services/chat.service";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import { createSocketIoClient, getSocketIoOrigin } from "@/lib/apiBase";

const FALLBACK_POLL_INTERVAL_MS = 5000;

type EventChatProps = {
  eventId: string;
  className?: string;
};

export function EventChat({ eventId, className = "" }: EventChatProps) {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [useSocket, setUseSocket] = useState(false);
  const listEndRef = useRef<HTMLDivElement>(null);
  const wasAtBottomRef = useRef(true);
  const listRef = useRef<HTMLDivElement>(null);
  const socketRef = useRef<Socket | null>(null);
  const { isAuthenticated } = useAuth();

  const fetchMessages = async () => {
    try {
      const res = await chatService.getMessages(eventId);
      setMessages(res.data ?? []);
      setError(null);
    } catch (e) {
      setError("Could not load chat");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!eventId) return;

    let pollInterval: ReturnType<typeof setInterval> | null = null;

    const init = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const token = session?.access_token ?? null;
      const socketOrigin = getSocketIoOrigin();

      // Initial load via HTTP (kept for fallback and history)
      await fetchMessages();

      if (socketOrigin && token) {
        const socket = createSocketIoClient({
          auth: { token },
          reconnection: true,
        });

        socket.on("connect", () => {
          setUseSocket(true);
          socket.emit("join_event", { eventId });
        });

        socket.on("new_message", (msg: ChatMessage) => {
          setMessages(prev => {
            if (prev.some(m => m.id === msg.id)) return prev;
            return [...prev, msg];
          });
          wasAtBottomRef.current = true;
        });

        socket.on("send_message_error", () => {
          setSending(false);
        });

        socketRef.current = socket;
      } else {
        setUseSocket(false);
        pollInterval = setInterval(fetchMessages, FALLBACK_POLL_INTERVAL_MS);
      }
    };

    init();

    return () => {
      if (pollInterval) clearInterval(pollInterval);
      const socket = socketRef.current;
      if (socket?.connected) {
        socket.emit("leave_event", { eventId });
        socket.disconnect();
      }
      socketRef.current = null;
      setUseSocket(false);
    };
  }, [eventId]);

  useEffect(() => {
    if (!listRef.current || !listEndRef.current) return;
    if (wasAtBottomRef.current) {
      listEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  const checkScrollPosition = () => {
    if (!listRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = listRef.current;
    wasAtBottomRef.current = scrollHeight - scrollTop - clientHeight < 80;
  };

  const handleSend = async () => {
    const text = input.trim();
    if (!text || sending || !isAuthenticated) return;

    setSending(true);
    setInput("");

    const socket = socketRef.current;
    if (socket?.connected && useSocket) {
      socket.emit("send_message", { eventId, message: text });
      setSending(false);
      wasAtBottomRef.current = true;
      listEndRef.current?.scrollIntoView({ behavior: "smooth" });
      return;
    }

    try {
      const res = await chatService.sendMessage(eventId, text);
      if (res.data) {
        setMessages(prev => [...prev, res.data!]);
        wasAtBottomRef.current = true;
        listEndRef.current?.scrollIntoView({ behavior: "smooth" });
      }
    } catch {
      setInput(text);
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div
      className={`flex flex-col bg-gray-900/95 border-l border-gray-800 rounded-l-lg overflow-hidden ${className}`}
      style={{ minHeight: 200 }}
    >
      <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-800">
        <MessageCircle className="w-5 h-5 text-[#CD000E]" aria-hidden />
        <h3 className="font-semibold text-white uppercase tracking-wider text-sm">Live Chat</h3>
        {useSocket && (
          <span className="ml-auto text-xs text-green-400" title="Real-time">
            Live
          </span>
        )}
      </div>

      <div
        ref={listRef}
        onScroll={checkScrollPosition}
        className="flex-1 overflow-y-auto min-h-[200px] max-h-[50vh] p-3 space-y-2"
      >
        {loading && (
          <div className="flex items-center justify-center py-8 text-gray-400">
            <Loader2 className="w-6 h-6 animate-spin" aria-hidden />
          </div>
        )}
        {error && !loading && <p className="text-sm text-red-400 px-2 py-4">{error}</p>}
        {!loading && !error && messages.length === 0 && (
          <p className="text-sm text-gray-500 px-2 py-4">No messages yet. Say hi!</p>
        )}
        {!loading &&
          messages.map(m => (
            <div key={m.id} className="text-sm">
              <span className="text-gray-400 font-medium">{m.displayName}: </span>
              <span className="text-gray-200 break-words">{m.message}</span>
            </div>
          ))}
        <div ref={listEndRef} />
      </div>

      <div className="p-3 border-t border-gray-800">
        {!isAuthenticated ? (
          <p className="text-xs text-gray-500">Log in to send messages.</p>
        ) : (
          <div className="flex gap-2">
            <input
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Send a message..."
              maxLength={2000}
              className="flex-1 px-3 py-2 rounded-lg bg-gray-800 text-white placeholder-gray-500 border border-gray-700 focus:border-[#CD000E] focus:outline-none text-sm"
              disabled={sending}
              aria-label="Chat message"
            />
            <button
              type="button"
              onClick={handleSend}
              disabled={!input.trim() || sending}
              className="px-4 py-2 rounded-lg bg-[#CD000E] text-white hover:bg-[#860005] disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-1"
              aria-label="Send message"
            >
              {sending ? (
                <Loader2 className="w-4 h-4 animate-spin" aria-hidden />
              ) : (
                <Send className="w-4 h-4" aria-hidden />
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
