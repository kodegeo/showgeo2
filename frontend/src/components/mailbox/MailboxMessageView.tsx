import type { MailboxItem } from "@/hooks/useMailbox";
import { MailboxItemCard } from "@/components/mailbox/MailboxItemCard";
import { Mail } from "lucide-react";

interface MailboxMessageViewProps {
  item: MailboxItem | null;
  onBack?: () => void;
}

export function MailboxMessageView({ item, onBack }: MailboxMessageViewProps) {
  if (!item) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-8">
        <div className="max-w-[480px] w-full mx-auto text-center">
          <Mail className="w-14 h-14 text-gray-600 mx-auto mb-4" aria-hidden />
          <p className="text-lg font-medium text-gray-300">Select a message</p>
          <p className="text-sm text-gray-500 mt-2">
            Choose a message from the list to view details.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {onBack && (
        <div className="flex md:hidden flex-shrink-0 border-b border-white/10 px-4 py-2">
          <button
            type="button"
            onClick={onBack}
            className="text-sm text-gray-400 hover:text-white flex items-center gap-1"
          >
            ← Back to list
          </button>
        </div>
      )}
      <div className="flex-1 overflow-y-auto p-4 md:p-6">
        <MailboxItemCard item={item} />
      </div>
    </div>
  );
}
