import { ReactNode } from "react";
import Navigation from "@/components/Navigation/Navigation";
import { Footer } from "@/components/Footer";
import { SettingsSidebar } from "./SettingsSidebar";

interface SettingsLayoutProps {
  children: ReactNode;
}

/**
 * Layout wrapper for all settings pages
 * Provides consistent sidebar and content area structure
 */
export function SettingsLayout({ children }: SettingsLayoutProps) {
  return (
    <div className="min-h-screen bg-[#0B0B0B] text-white flex flex-col">
      <Navigation />
      <div className="flex-1 flex pt-20 md:pt-24">
        {/* Sidebar - 25% width on desktop */}
        <aside className="hidden md:block w-64 flex-shrink-0 border-r border-gray-800">
          <SettingsSidebar />
        </aside>

        {/* Main Content - 75% width on desktop */}
        <main className="flex-1 overflow-y-auto">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {children}
          </div>
        </main>
      </div>
      <Footer />
    </div>
  );
}

