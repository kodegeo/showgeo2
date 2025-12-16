import { Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import Navigation from "@/components/Navigation/Navigation";
import { Footer } from "@/components/Footer";

export function HomePage() {
  const { isAuthenticated, isLoading } = useAuth();

  // Don't block render while auth is loading - show page with default (unauthenticated) state
  // The page will update when auth state resolves
  const showAuthenticated = !isLoading && isAuthenticated;

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900 pt-20 md:pt-24">
      <Navigation />

      {/* Hero Section */}
      <section className="relative bg-brand-dark text-white overflow-hidden min-h-[600px] flex items-center">
        {/* Background Image */}
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{
            backgroundImage: "url('/assets/images/bg_home.png')",
          }}
        />
        
        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-[#860005]/70 to-black/80 mix-blend-multiply"></div>
        
        {/* Watermark Background */}
        <div
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage: "url('/assets/branding/Watermark-Red.png')",
            backgroundSize: "cover",
            backgroundPosition: "center",
            backgroundRepeat: "no-repeat",
          }}
        />
        
        {/* Content */}
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 lg:py-32 w-full">
          <div className="text-center animate-fade-in">
            {/* Logo */}
            <div className="mb-8 flex justify-center animate-slide-down">
              <img
                src="/assets/branding/logo-red-tagline.svg"
                alt="Showgeo"
                className="h-24 md:h-28 lg:h-32 w-auto mx-auto drop-shadow-2xl filter brightness-110"
                style={{ minWidth: "200px" }}
              />
            </div>

            <h1 className="text-5xl md:text-6xl lg:text-7xl font-heading font-bold mb-6 tracking-tighter uppercase drop-shadow-2xl animate-fade-in-up">
              Live Events.
              <br />
              <span className="text-brand-red drop-shadow-[0_0_20px_rgba(205,0,14,0.5)]">
                Real Connections.
              </span>
            </h1>
            <p className="text-xl md:text-2xl text-gray-200 mb-10 max-w-2xl mx-auto font-body drop-shadow-lg leading-relaxed animate-fade-in-up delay-100">
              Empowering artists and fans to connect through immersive live experiences.
              Stream, engage, and monetize your events like never before.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center animate-fade-in-up delay-200">
              {!showAuthenticated ? (
                <>
                  <Link
                    to="/register"
                    className="px-8 py-4 bg-brand-red text-white rounded-lg hover:bg-brand-red/90 transition-all duration-300 font-heading font-semibold text-lg shadow-2xl hover:shadow-brand-red/50 transform hover:scale-105 hover:-translate-y-1 uppercase tracking-wider relative overflow-hidden group"
                  >
                    <span className="relative z-10">Get Started</span>
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"></div>
                  </Link>
                  <Link
                    to="/login"
                    className="px-8 py-4 bg-transparent text-white border-2 border-white rounded-lg hover:bg-white hover:text-gray-900 transition-all duration-300 font-heading font-semibold text-lg uppercase tracking-wider shadow-lg hover:shadow-xl hover:scale-105"
                  >
                    Sign In
                  </Link>
                </>
              ) : (
                <Link
                  to="/dashboard"
                  className="px-8 py-4 bg-brand-red text-white rounded-lg hover:bg-brand-red/90 transition-all duration-300 font-heading font-semibold text-lg shadow-2xl hover:shadow-brand-red/50 transform hover:scale-105 hover:-translate-y-1 uppercase tracking-wider relative overflow-hidden group"
                >
                  <span className="relative z-10">Go to Dashboard</span>
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"></div>
                </Link>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24 lg:py-32 bg-gradient-to-b from-white to-gray-50 dark:from-gray-900 dark:to-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16 lg:mb-20">
            <h2 className="text-4xl md:text-5xl font-heading font-bold text-gray-900 dark:text-white mb-4 uppercase tracking-tight">
              Everything You Need to Succeed
            </h2>
            <p className="text-xl text-gray-brand max-w-2xl mx-auto font-body">
              Powerful tools designed for creators, built for fans
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 lg:gap-10">
            {/* Feature 1 */}
            <div className="group p-8 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:border-brand-red/50 hover:shadow-2xl hover:shadow-brand-red/10 transition-all duration-300 transform hover:-translate-y-2">
              <div className="w-14 h-14 bg-gradient-to-br from-red-100 to-red-200 dark:from-red-900/30 dark:to-red-900/50 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                <svg
                  className="w-7 h-7 text-brand-red"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                  />
                </svg>
              </div>
              <h3 className="text-xl font-heading font-semibold text-gray-900 dark:text-white mb-3">
                Live Streaming
              </h3>
              <p className="text-gray-600 dark:text-gray-400 font-body leading-relaxed">
                Broadcast your events in real-time with high-quality streaming. Engage with your audience through interactive chat and reactions.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="group p-8 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:border-brand-red/50 hover:shadow-2xl hover:shadow-brand-red/10 transition-all duration-300 transform hover:-translate-y-2">
              <div className="w-14 h-14 bg-gradient-to-br from-red-100 to-red-200 dark:from-red-900/30 dark:to-red-900/50 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                <svg
                  className="w-7 h-7 text-brand-red"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                  />
                </svg>
              </div>
              <h3 className="text-xl font-heading font-semibold text-gray-900 dark:text-white mb-3">
                Community Building
              </h3>
              <p className="text-gray-600 dark:text-gray-400 font-body leading-relaxed">
                Grow your following and build a community around your brand. Connect with fans and keep them engaged with notifications.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="group p-8 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:border-brand-red/50 hover:shadow-2xl hover:shadow-brand-red/10 transition-all duration-300 transform hover:-translate-y-2">
              <div className="w-14 h-14 bg-gradient-to-br from-red-100 to-red-200 dark:from-red-900/30 dark:to-red-900/50 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                <svg
                  className="w-7 h-7 text-brand-red"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
                  />
                </svg>
              </div>
              <h3 className="text-xl font-heading font-semibold text-gray-900 dark:text-white mb-3">
                Monetization
              </h3>
              <p className="text-gray-600 dark:text-gray-400 font-body leading-relaxed">
                Sell tickets, merchandise, and digital products directly through your storefront. Get paid instantly with secure payment processing.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative py-24 lg:py-32 bg-gradient-to-br from-brand-red via-brand-red to-brand-red-dark text-white overflow-hidden">
        {/* Watermark Background */}
        <div
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage: "url('/assets/branding/Watermark-Gold.png')",
            backgroundSize: "cover",
            backgroundPosition: "center",
            backgroundRepeat: "no-repeat",
          }}
        />
        
        {/* Subtle Pattern Overlay */}
        <div className="absolute inset-0 opacity-5" style={{
          backgroundImage: "radial-gradient(circle, white 1px, transparent 1px)",
          backgroundSize: "30px 30px"
        }}></div>
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl md:text-5xl font-heading font-bold mb-6 uppercase tracking-tight drop-shadow-lg">
            Ready to Get Started?
          </h2>
          <p className="text-xl md:text-2xl text-red-50 mb-10 max-w-2xl mx-auto font-body leading-relaxed drop-shadow-md">
            Join thousands of creators who are already using Showgeo to build their community and monetize their content.
          </p>
          {!showAuthenticated && (
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                to="/register"
                className="px-8 py-4 bg-white text-brand-red rounded-lg hover:bg-gray-100 transition-all duration-300 font-heading font-semibold text-lg shadow-2xl hover:shadow-white/30 transform hover:scale-105 hover:-translate-y-1 uppercase tracking-wider relative overflow-hidden group"
              >
                <span className="relative z-10">Create Your Account</span>
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-brand-red/10 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"></div>
              </Link>
              <Link
                to="/events"
                className="px-8 py-4 bg-transparent text-white border-2 border-white rounded-lg hover:bg-white hover:text-brand-red transition-all duration-300 font-heading font-semibold text-lg uppercase tracking-wider shadow-lg hover:shadow-xl hover:scale-105"
              >
                Browse Events
              </Link>
            </div>
          )}
        </div>
      </section>

      <Footer />
    </div>
  );
}
