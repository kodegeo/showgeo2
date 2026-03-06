/**
 * Production Console Layout
 * 
 * Main layout wrapper for the Producer Console
 * Provides consistent structure across all console views
 */

interface ProductionConsoleLayoutProps {
  children: React.ReactNode;
}

export function ProductionConsoleLayout({ children }: ProductionConsoleLayoutProps) {
  return (
    <div className="min-h-screen bg-[#0B0B0B] text-white">
      {/* Header */}
      <header className="h-14 border-b border-white/10 flex items-center px-6">
        <div className="flex items-center gap-4">
          <a href="/studio/events" className="text-white/70 hover:text-white text-sm">
            ← Back to Events
          </a>
          <span className="text-white/30">|</span>
          <h1 className="text-lg font-semibold">Production Console</h1>
        </div>
      </header>

      {/* Main content */}
      <main className="p-6 max-w-7xl mx-auto">
        {children}
      </main>
    </div>
  );
}

