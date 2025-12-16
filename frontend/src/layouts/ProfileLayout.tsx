import { ReactNode } from "react";
import { ProfileSidebar } from "@/components/profile/ProfileSidebar";
import { ProfileHeader } from "@/components/profile/ProfileHeader";
import { Footer } from "@/components/Footer";

interface ProfileLayoutProps {
  children: ReactNode;

  // Capability flags
  isEntity?: boolean;
  isOwner?: boolean;

  // Optional creator controls (CTA row, buttons, etc.)
  creatorActions?: ReactNode;
}

export function ProfileLayout({
  children,
  isEntity = false,
  isOwner = false,
  creatorActions,
}: ProfileLayoutProps) {
  return (
    <div className="min-h-screen bg-[#0B0B0B] text-white flex flex-col">
      <ProfileHeader />

      <div
        className="flex-1 flex relative overflow-y-auto"
        style={{ paddingTop: "80px" }}
      >
        <ProfileSidebar />

        <main className="flex-1 w-full">
          {/* Creator action bar */}
          {isEntity && isOwner && creatorActions && (
            <div className="border-b border-white/10 bg-black/60 backdrop-blur px-6 py-4">
              {creatorActions}
            </div>
          )}

          {children}
        </main>
      </div>

      <Footer />
    </div>
  );
}
