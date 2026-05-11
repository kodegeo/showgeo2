import { ReactNode } from "react";
import { ProfileSidebar } from "@/components/profile/ProfileSidebar";
import { ProfileHeader } from "@/components/profile/ProfileHeader";
import { Footer } from "@/components/Footer";

interface ProfileLayoutProps {
  children: ReactNode;
}

export function ProfileLayout({ children }: ProfileLayoutProps) {
  return (
    <div className="min-h-screen bg-black text-white flex flex-col">
      <ProfileHeader />

      <div className="flex flex-1 min-h-0 pt-16 md:pt-20">
        <ProfileSidebar />

        <main className="flex-1 min-h-0 overflow-y-auto flex flex-col bg-[#0B0B0B]">{children}</main>
      </div>

      <Footer />
    </div>
  );
}
