import { type ReactNode } from "react";
import { ModalProvider } from "@/state/creator/modalContext";
import { ToastProvider } from "@/hooks/creator/useToast";
import { ToastContainer } from "@/components/creator/ToastContainer";
import { CodeOfConductModal } from "@/modals/common";

/**
 * Minimal providers for public fan watch routes (`/events/:id/watch`, `/events/:id/live`).
 * `EventWatchPage` uses `useModalContext` for Code of Conduct consent before token retry.
 */
export function FanWatchProviders({ children }: { children: ReactNode }) {
  return (
    <ToastProvider>
      <ModalProvider>
        {children}
        <CodeOfConductModal />
        <ToastContainer />
      </ModalProvider>
    </ToastProvider>
  );
}
