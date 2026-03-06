import { useEffect, useState, FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { toast } from "react-toastify";

export default function ResetPassword() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then((res) => {
      console.log("RESET SESSION:", res);
    });
  }, []);

  const handleReset = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation
    if (!password) {
      setError("Password is required");
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setIsLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    
    if (error) {
      setError(error.message);
      toast.error(error.message);
      setIsLoading(false);
    } else {
      setDone(true);
      toast.success("Password updated successfully! You can now sign in.");
      // Redirect to login after a short delay
      setTimeout(() => {
        navigate("/login", { replace: true });
      }, 2000);
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
              Reset Password
            </h1>
            <p className="text-[#9A9A9A] font-body">
              {done ? "Password updated successfully!" : "Enter your new password"}
            </p>
          </div>

          {/* Reset Password Form */}
          {!done ? (
            <form 
              className="space-y-6 bg-[#0B0B0B]/90 backdrop-blur-sm border border-gray-800 p-8 rounded-lg shadow-2xl" 
              onSubmit={handleReset}
            >
              {error && (
                <div className="bg-red-900/30 border border-[#CD000E] text-[#CD000E] px-4 py-3 rounded-md text-sm font-body">
                  {error}
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <label htmlFor="password" className="block text-sm font-heading font-semibold text-white mb-2 uppercase text-xs tracking-wider">
                    New Password
                  </label>
                  <input
                    id="password"
                    name="password"
                    type="password"
                    autoComplete="new-password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="appearance-none relative block w-full px-4 py-3 border border-gray-700 bg-[#0B0B0B] placeholder-[#9A9A9A] text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-[#CD000E] focus:border-[#CD000E] transition-colors font-body"
                    placeholder="Enter new password"
                  />
                  <p className="mt-1 text-xs text-[#9A9A9A] font-body">
                    Must be at least 8 characters
                  </p>
                </div>

                <div>
                  <label htmlFor="confirmPassword" className="block text-sm font-heading font-semibold text-white mb-2 uppercase text-xs tracking-wider">
                    Confirm Password
                  </label>
                  <input
                    id="confirmPassword"
                    name="confirmPassword"
                    type="password"
                    autoComplete="new-password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="appearance-none relative block w-full px-4 py-3 border border-gray-700 bg-[#0B0B0B] placeholder-[#9A9A9A] text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-[#CD000E] focus:border-[#CD000E] transition-colors font-body"
                    placeholder="Confirm new password"
                  />
                </div>
              </div>

              <div>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-heading font-semibold rounded-lg text-white bg-[#CD000E] hover:bg-[#860005] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#CD000E] disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 uppercase tracking-wider shadow-lg hover:shadow-[#CD000E]/50 hover:scale-105"
                >
                  <span className="relative z-10">
                    {isLoading ? "Updating..." : "Update Password"}
                  </span>
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"></div>
                </button>
              </div>

              <div className="text-center text-sm text-[#9A9A9A] font-body">
                Remember your password?{" "}
                <Link
                  to="/login"
                  className="font-medium text-[#CD000E] hover:text-[#860005] transition-colors"
                >
                  Sign in
                </Link>
              </div>
            </form>
          ) : (
            <div className="bg-[#0B0B0B]/90 backdrop-blur-sm border border-gray-800 p-8 rounded-lg shadow-2xl text-center space-y-6">
              <div className="flex justify-center">
                <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center">
                  <svg
                    className="w-8 h-8 text-green-500"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                </div>
              </div>
              <div>
                <h2 className="text-2xl font-heading font-bold text-white mb-2 uppercase tracking-tighter">
                  Password Updated!
                </h2>
                <p className="text-[#9A9A9A] font-body mb-4">
                  Your password has been successfully updated. Redirecting to sign in...
                </p>
                <Link
                  to="/login"
                  className="inline-block text-sm font-medium text-[#CD000E] hover:text-[#860005] transition-colors"
                >
                  Go to Sign In →
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
