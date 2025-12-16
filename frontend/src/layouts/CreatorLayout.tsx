import { Outlet } from "react-router-dom";

export function CreatorLayout() {
  return (
    <div className="min-h-screen bg-[#0B0B0B] text-white">
      {/* Header */}
      <header className="h-14 border-b border-white/10 flex items-center px-6">
        <h1 className="text-lg font-semibold">Creator</h1>
      </header>

      <div className="flex">
        {/* Sidebar */}
        <aside className="w-60 border-r border-white/10 p-4">
          <nav className="space-y-2 text-sm">
            <a href="/creator/dashboard" className="block text-white/70 hover:text-white">Dashboard</a>
            <a href="/creator/events" className="block text-white/70 hover:text-white">Events</a>
            <a href="/creator/store" className="block text-white/70 hover:text-white">Store</a>
            <a href="/creator/analytics" className="block text-white/70 hover:text-white">Analytics</a>
            <a href="/creator/settings" className="block text-white/70 hover:text-white">Settings</a>
          </nav>
        </aside>

        {/* Main content */}
        <main className="flex-1 p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
