import { useAuth } from "@/hooks/useAuth";
import Navigation from "@/components/Navigation/Navigation";
import { Footer } from "@/components/Footer";

export function DashboardPage() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-[#0B0B0B] text-white flex flex-col">
      <Navigation />
      <main className="flex-1 pt-20 md:pt-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="mb-8">
            <h1 className="text-4xl md:text-5xl font-heading font-bold text-white mb-2 uppercase tracking-tighter">
              Dashboard
            </h1>
            <p className="text-[#9A9A9A] font-body mt-2">
              Welcome, {user?.email || "User"}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Dashboard cards */}
            <div className="bg-[#0B0B0B]/90 backdrop-blur-sm border border-gray-800 rounded-lg shadow-lg p-6 hover:border-[#CD000E]/50 transition-colors">
              <h2 className="text-xl font-heading font-semibold text-white mb-2 uppercase tracking-tight">
                Your Profile
              </h2>
              <p className="text-[#9A9A9A] font-body">
                Manage your profile and settings
              </p>
            </div>

            <div className="bg-[#0B0B0B]/90 backdrop-blur-sm border border-gray-800 rounded-lg shadow-lg p-6 hover:border-[#CD000E]/50 transition-colors">
              <h2 className="text-xl font-heading font-semibold text-white mb-2 uppercase tracking-tight">
                Events
              </h2>
              <p className="text-[#9A9A9A] font-body">
                View and manage your events
              </p>
            </div>

            <div className="bg-[#0B0B0B]/90 backdrop-blur-sm border border-gray-800 rounded-lg shadow-lg p-6 hover:border-[#CD000E]/50 transition-colors">
              <h2 className="text-xl font-heading font-semibold text-white mb-2 uppercase tracking-tight">
                Analytics
              </h2>
              <p className="text-[#9A9A9A] font-body">
                Track your performance
              </p>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}

