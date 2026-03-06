import { useQuery } from "@tanstack/react-query";
import { mailboxService, MailboxItem } from "@/services/mailbox.service";

export function useMailbox() {
  return useQuery({
    queryKey: ["mailbox"],
    queryFn: () => mailboxService.getMailbox(),
    staleTime: 30000, // 30 seconds
  });
}

export type { MailboxItem } from "@/services/mailbox.service";


