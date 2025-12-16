import { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { loginAsync, loginLoading, loginError } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);

  // Get redirect path from location state or default to profile
  const from = (location.state as { from?: string })?.from || "/profile";
  
  // Check for registration message in location state
  useEffect(() => {
    const state = location.state as { message?: string; email?: string } | null;
    if (state?.message) {
      setInfoMessage(state.message);
      if (state.email) {
        setEmail(state.email);
      }
    }
  }, [location.state]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    try {
      const result = await loginAsync({ email, password });
      
      // Wait a bit to ensure auth state is updated before navigating
      // This prevents race conditions where ProtectedRoute checks auth before state is set
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // Check if profile is complete - if not, redirect to setup
      // For now, always go to /profile and let ProfileSetupGuard handle the redirect
      const targetPath = from === "/profile" ? "/profile" : from;
      navigate(targetPath, { replace: true });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to login. Please try again.";
      setError(message);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative bg-[#0B0B0B] overflow-hidden">
      {/* Background Image */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: "url('/assets/images/bg_signup.jpg')",
        }}
      />
      
      {/* Dark overlay for readability */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-black/70 to-black/80"></div>
      
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

      <div className="relative z-10 max-w-md w-full px-4 sm:px-6 lg:px-8 py-12">
        <div className="space-y-8">
          {/* Logo/Header */}
          <div className="text-center">
            <div className="mb-6 flex justify-center">
              <img
                src="/assets/branding/logo-red-tagline.svg"
                alt="Showgeo"
                className="h-16 md:h-20 w-auto mx-auto drop-shadow-lg"
                style={{ minWidth: "200px" }}
              />
            </div>
            <h1 className="text-4xl md:text-5xl font-heading font-bold text-white mb-2 uppercase tracking-tighter drop-shadow-lg">
              Sign In
            </h1>
            <p className="text-[#9A9A9A] font-body">Sign in to your account</p>
          </div>

          {/* Login Form */}
          <form className="space-y-6 bg-[#0B0B0B]/90 backdrop-blur-sm border border-gray-800 p-8 rounded-lg shadow-2xl" onSubmit={handleSubmit}>
            {infoMessage && (
              <div className="bg-blue-900/30 border border-blue-500 text-blue-300 px-4 py-3 rounded-md text-sm font-body">
                {infoMessage}
              </div>
            )}
            
            {error && (
              <div className="bg-red-900/30 border border-[#CD000E] text-[#CD000E] px-4 py-3 rounded-md text-sm font-body">
                {error}
              </div>
            )}

            {loginError && (
              <div className="bg-red-900/30 border border-[#CD000E] text-[#CD000E] px-4 py-3 rounded-md text-sm font-body">
                {loginError}
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-sm font-heading font-semibold text-white mb-2 uppercase text-xs tracking-wider">
                  Email address
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="appearance-none relative block w-full px-4 py-3 border border-gray-700 bg-[#0B0B0B] placeholder-[#9A9A9A] text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-[#CD000E] focus:border-[#CD000E] transition-colors font-body"
                  placeholder="you@example.com"
                />
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-heading font-semibold text-white mb-2 uppercase text-xs tracking-wider">
                  Password
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="appearance-none relative block w-full px-4 py-3 border border-gray-700 bg-[#0B0B0B] placeholder-[#9A9A9A] text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-[#CD000E] focus:border-[#CD000E] transition-colors font-body"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="text-sm">
                <Link
                  to="/forgot-password"
                  className="font-body text-[#9A9A9A] hover:text-[#CD000E] transition-colors"
                >
                  Forgot password?
                </Link>
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={loginLoading}
                className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-heading font-semibold rounded-lg text-white bg-[#CD000E] hover:bg-[#860005] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#CD000E] disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 uppercase tracking-wider shadow-lg hover:shadow-[#CD000E]/50 hover:scale-105"
              >
                <span className="relative z-10">{loginLoading ? "Signing in..." : "Sign In"}</span>
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"></div>
              </button>
            </div>

            <div className="text-center text-sm text-[#9A9A9A] font-body">
              Don't have an account?{" "}
              <Link
                to="/register"
                className="font-medium text-[#CD000E] hover:text-[#860005] transition-colors"
              >
                Sign up
              </Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
