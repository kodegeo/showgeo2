import { ReactNode } from "react";
import { ModalProvider } from "@/state/creator/modalContext";
import { ToastProvider } from "@/hooks/creator/useToast";
import { ToastContainer } from "./ToastContainer";
import {
  CreateEventModal,
  UploadMediaModal,
  StartStreamModal,
  CreatePostModal,
  AddProductModal,
  ManageFanModal,
  ConfirmDeleteModal,
} from "@/modals/creator";

/**
 * Provider wrapper for all Creator routes
 * Ensures ModalProvider and ToastProvider are available throughout the creator route tree
 */
export function CreatorProviders({ children }: { children: ReactNode }) {
  return (
    <ToastProvider>
      <ModalProvider>
        {children}
        {/* Global modals available to all creator routes */}
        <CreateEventModal />
        <UploadMediaModal />
        <StartStreamModal />
        <CreatePostModal />
        <AddProductModal />
        <ManageFanModal />
        <ConfirmDeleteModal />
        {/* Global toast container */}
        <ToastContainer />
      </ModalProvider>
    </ToastProvider>
  );
}






