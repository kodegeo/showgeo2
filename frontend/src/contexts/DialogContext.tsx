import { createContext, useContext, useState, useCallback, ReactNode } from "react";

interface DialogContextType {
  openDialog: (content: ReactNode, options?: { title?: string; onClose?: () => void }) => void;
  closeDialog: () => void;
  isOpen: boolean;
  dialogContent: ReactNode | null;
  dialogTitle?: string;
}

const DialogContext = createContext<DialogContextType | undefined>(undefined);

export function DialogProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [dialogContent, setDialogContent] = useState<ReactNode | null>(null);
  const [dialogTitle, setDialogTitle] = useState<string | undefined>(undefined);
  const [onCloseCallback, setOnCloseCallback] = useState<(() => void) | undefined>(undefined);

  const openDialog = useCallback((content: ReactNode, options?: { title?: string; onClose?: () => void }) => {
    setDialogContent(content);
    setDialogTitle(options?.title);
    setOnCloseCallback(() => options?.onClose);
    setIsOpen(true);
  }, []);

  const closeDialog = useCallback(() => {
    if (onCloseCallback) {
      onCloseCallback();
    }
    setIsOpen(false);
    setDialogContent(null);
    setDialogTitle(undefined);
    setOnCloseCallback(undefined);
  }, [onCloseCallback]);

  return (
    <DialogContext.Provider value={{ openDialog, closeDialog, isOpen, dialogContent, dialogTitle }}>
      {children}
    </DialogContext.Provider>
  );
}

export function useDialog() {
  const context = useContext(DialogContext);
  if (!context) {
    throw new Error("useDialog must be used within DialogProvider");
  }
  return context;
}






