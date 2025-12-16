import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

export function RegisterPage() {
  const navigate = useNavigate();
  const { registerAsync, registerLoading, registerError } = useAuth();

  const [formData, setFormData] = useState({
    email: "",
    password: "",
    confirmPassword: "",
    firstName: "",
    lastName: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const errors: Record<string, string> = {};

    if (!formData.email) {
      errors.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = "Invalid email address";
    }

    if (!formData.password) {
      errors.password = "Password is required";
    } else if (formData.password.length < 8) {
      errors.password = "Password must be at least 8 characters";
    }

    if (formData.password !== formData.confirmPassword) {
      errors.confirmPassword = "Passwords do not match";
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    // Clear validation error for this field
    if (validationErrors[name]) {
      setValidationErrors((prev) => {
        const next = { ...prev };
        delete next[name];
        return next;
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!validate()) {
      return;
    }

    try {
      const result = await registerAsync({
        email: formData.email,
        password: formData.password,
        firstName: formData.firstName || undefined,
        lastName: formData.lastName || undefined,
        role: "USER",
      });
      
      // Check if email confirmation is required (no session returned)
      if (!result.session) {
        // Show success message with email confirmation notice
        setError(null);
        // Show a success message instead of error
        alert(
          "Account created successfully! Please check your email to confirm your account before signing in."
        );
        // Redirect to login page
        navigate("/login", { 
          replace: true,
          state: { 
            message: "Please check your email to confirm your account before signing in.",
            email: formData.email 
          }
        });
      } else {
        // Email confirmation not required, user is logged in
        navigate("/profile/setup", { replace: true });
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to register. Please try again.";
      setError(message);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative bg-white overflow-hidden py-12">
      {/* Background Image */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: "url('/assets/images/bg_signup.jpg')",
        }}
      />
      
      {/* Light overlay for readability */}
      <div className="absolute inset-0 bg-gradient-to-b from-white/70 via-white/60 to-white/70"></div>

      <div className="relative z-10 max-w-md w-full px-4 sm:px-6 lg:px-8">
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
            <h1 className="text-4xl md:text-5xl font-heading font-bold text-[#0B0B0B] mb-2 uppercase tracking-tighter">
              Create Account
            </h1>
            <p className="text-[#9A9A9A] font-body">Join the Showgeo community</p>
          </div>

          {/* Register Form */}
          <form className="space-y-6 bg-white/95 backdrop-blur-sm border border-gray-200 p-8 rounded-lg shadow-2xl" onSubmit={handleSubmit}>
            {error && (
              <div className="bg-red-50 border border-[#CD000E] text-[#CD000E] px-4 py-3 rounded-md text-sm font-body">
                {error}
              </div>
            )}

            {registerError && (
              <div className="bg-red-50 border border-[#CD000E] text-[#CD000E] px-4 py-3 rounded-md text-sm font-body">
                {registerError}
              </div>
            )}

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="firstName" className="block text-sm font-heading font-semibold text-[#0B0B0B] mb-2 uppercase text-xs tracking-wider">
                    First name
                  </label>
                  <input
                    id="firstName"
                    name="firstName"
                    type="text"
                    autoComplete="given-name"
                    value={formData.firstName}
                    onChange={handleChange}
                    className="appearance-none relative block w-full px-4 py-3 border border-gray-300 bg-white placeholder-[#9A9A9A] text-[#0B0B0B] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#CD000E] focus:border-[#CD000E] transition-colors font-body"
                    placeholder="John"
                  />
                </div>

                <div>
                  <label htmlFor="lastName" className="block text-sm font-heading font-semibold text-[#0B0B0B] mb-2 uppercase text-xs tracking-wider">
                    Last name
                  </label>
                  <input
                    id="lastName"
                    name="lastName"
                    type="text"
                    autoComplete="family-name"
                    value={formData.lastName}
                    onChange={handleChange}
                    className="appearance-none relative block w-full px-4 py-3 border border-gray-300 bg-white placeholder-[#9A9A9A] text-[#0B0B0B] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#CD000E] focus:border-[#CD000E] transition-colors font-body"
                    placeholder="Doe"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="email" className="block text-sm font-heading font-semibold text-[#0B0B0B] mb-2 uppercase text-xs tracking-wider">
                  Email address
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={formData.email}
                  onChange={handleChange}
                  className={`appearance-none relative block w-full px-4 py-3 border ${
                    validationErrors.email
                      ? "border-[#CD000E]"
                      : "border-gray-300"
                  } bg-white placeholder-[#9A9A9A] text-[#0B0B0B] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#CD000E] focus:border-[#CD000E] transition-colors font-body`}
                  placeholder="you@example.com"
                />
                {validationErrors.email && (
                  <p className="mt-1 text-sm text-[#CD000E] font-body">{validationErrors.email}</p>
                )}
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-heading font-semibold text-[#0B0B0B] mb-2 uppercase text-xs tracking-wider">
                  Password
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="new-password"
                  required
                  value={formData.password}
                  onChange={handleChange}
                  className={`appearance-none relative block w-full px-4 py-3 border ${
                    validationErrors.password
                      ? "border-[#CD000E]"
                      : "border-gray-300"
                  } bg-white placeholder-[#9A9A9A] text-[#0B0B0B] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#CD000E] focus:border-[#CD000E] transition-colors font-body`}
                  placeholder="••••••••"
                />
                {validationErrors.password && (
                  <p className="mt-1 text-sm text-[#CD000E] font-body">{validationErrors.password}</p>
                )}
                <p className="mt-1 text-xs text-[#9A9A9A] font-body">
                  Must be at least 8 characters
                </p>
              </div>

              <div>
                <label
                  htmlFor="confirmPassword"
                  className="block text-sm font-heading font-semibold text-[#0B0B0B] mb-2 uppercase text-xs tracking-wider"
                >
                  Confirm password
                </label>
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  autoComplete="new-password"
                  required
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  className={`appearance-none relative block w-full px-4 py-3 border ${
                    validationErrors.confirmPassword
                      ? "border-[#CD000E]"
                      : "border-gray-300"
                  } bg-white placeholder-[#9A9A9A] text-[#0B0B0B] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#CD000E] focus:border-[#CD000E] transition-colors font-body`}
                  placeholder="••••••••"
                />
                {validationErrors.confirmPassword && (
                  <p className="mt-1 text-sm text-[#CD000E] font-body">
                    {validationErrors.confirmPassword}
                  </p>
                )}
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={registerLoading}
                className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-heading font-semibold rounded-lg text-white bg-[#CD000E] hover:bg-[#860005] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#CD000E] disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 uppercase tracking-wider shadow-lg hover:shadow-[#CD000E]/50 hover:scale-105"
              >
                <span className="relative z-10">{registerLoading ? "Creating account..." : "Create Account"}</span>
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"></div>
              </button>
            </div>

            <div className="text-center text-sm text-[#9A9A9A] font-body">
              Already have an account?{" "}
              <Link
                to="/login"
                className="font-medium text-[#CD000E] hover:text-[#860005] transition-colors"
              >
                Sign in
              </Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
