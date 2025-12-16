import { createContext, useContext, useState, ReactNode } from "react";

type ModalType =
  | "createEvent"
  | "uploadMedia"
  | "startStream"
  | "createPost"
  | "addProduct"
  | "manageFan"
  | "confirmDelete"
  | null;

interface ModalContextType {
  openModal: (type: ModalType, data?: any) => void;
  closeModal: () => void;
  currentModal: ModalType;
  modalData: any;
}

const ModalContext = createContext<ModalContextType | undefined>(undefined);

export function ModalProvider({ children }: { children: ReactNode }) {
  const [currentModal, setCurrentModal] = useState<ModalType>(null);
  const [modalData, setModalData] = useState<any>(null);

  const openModal = (type: ModalType, data?: any) => {
    setCurrentModal(type);
    setModalData(data || null);
  };

  const closeModal = () => {
    setCurrentModal(null);
    setModalData(null);
  };

  return (
    <ModalContext.Provider value={{ openModal, closeModal, currentModal, modalData }}>
      {children}
    </ModalContext.Provider>
  );
}

export function useModalContext() {
  const context = useContext(ModalContext);
  if (!context) {
    throw new Error("useModalContext must be used within ModalProvider");
  }
  return context;
}






