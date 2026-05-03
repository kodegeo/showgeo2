import type { MailboxItem } from "@/hooks/useMailbox";

function formatTime(dateString: string): string {
  const d = new Date(dateString);
  const now = new Date();
  const isToday = d.toDateString() === now.toDateString();
  if (isToday) {
    return d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  }
  const isThisYear = d.getFullYear() === now.getFullYear();
  if (isThisYear) {
    return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  }
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function preview(text: string, maxLen: number = 60): string {
  if (!text || !text.trim()) return "";
  const t = text.trim().replace(/\s+/g, " ");
  return t.length <= maxLen ? t : t.slice(0, maxLen) + "…";
}

interface MailboxListCardProps {
  item: MailboxItem;
  isSelected: boolean;
  onClick: () => void;
}

export function MailboxListCard({ item, isSelected, onClick }: MailboxListCardProps) {
  const metadata = item.metadata || {};
  const sender =
    item._senderEntityName ??
    metadata.entityName ??
    metadata.senderName ??
    (item._messageClassification === "system_message" ? "System" : "Showgeo");
  const subject = item.title ?? "No subject";
  const previewText = preview(item.message ?? "", 60);

  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full text-left rounded-lg px-3 py-3 transition-colors border border-transparent hover:bg-white/5 ${
        isSelected ? "bg-white/10 border-white/10" : ""
      }`}
      aria-pressed={isSelected}
    >
      <div className="flex gap-3">
        <div className="flex-shrink-0 mt-0.5">
          {!item.isRead && <span className="w-2 h-2 rounded-full bg-[#CD000E] block" aria-hidden />}
          {item.isRead && <span className="w-2 h-2 block" aria-hidden />}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between gap-2">
            <span className="text-sm font-medium text-white truncate">{sender}</span>
            <span className="text-xs text-gray-500 flex-shrink-0">
              {formatTime(item.createdAt)}
            </span>
          </div>
          <p className="text-sm font-medium text-gray-200 truncate mt-0.5">{subject}</p>
          {previewText && <p className="text-xs text-gray-500 truncate mt-0.5">{previewText}</p>}
        </div>
      </div>
    </button>
  );
}
