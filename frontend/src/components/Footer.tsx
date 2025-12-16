import { Link } from "react-router-dom";

export function Footer() {
  return (
    <footer className="bg-[#0B0B0B] text-[#9A9A9A] border-t border-gray-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12">
          {/* Brand */}
          <div className="col-span-1 md:col-span-2">
            <Link to="/" className="flex items-center space-x-2 mb-6">
              <img
                src="/assets/branding/logo-red.svg"
                alt="Showgeo"
                className="h-16 md:h-20 lg:h-24 w-auto"
                style={{ minWidth: "200px" }}
              />
            </Link>
            <p className="text-sm text-[#9A9A9A] max-w-md font-body leading-relaxed">
              Empowering artists and fans to connect through live experiences.
              Join the community of creators and discover amazing events.
            </p>
          </div>

          {/* Links */}
          <div>
            <h3 className="text-white font-heading font-semibold mb-6 uppercase tracking-tight text-sm">
              Platform
            </h3>
            <ul className="space-y-3">
              <li>
                <Link
                  to="/events"
                  className="hover:text-[#CD000E] transition-colors text-sm font-body text-[#9A9A9A]"
                >
                  Events
                </Link>
              </li>
              <li>
                <Link
                  to="/entities"
                  className="hover:text-[#CD000E] transition-colors text-sm font-body text-[#9A9A9A]"
                >
                  Creators
                </Link>
              </li>
              <li>
                <Link
                  to="/how-it-works"
                  className="hover:text-[#CD000E] transition-colors text-sm font-body text-[#9A9A9A]"
                >
                  How It Works
                </Link>
              </li>
            </ul>
          </div>

          {/* Support */}
          <div>
            <h3 className="text-white font-heading font-semibold mb-6 uppercase tracking-tight text-sm">
              Support
            </h3>
            <ul className="space-y-3">
              <li>
                <Link
                  to="/help"
                  className="hover:text-[#CD000E] transition-colors text-sm font-body text-[#9A9A9A]"
                >
                  Help Center
                </Link>
              </li>
              <li>
                <Link
                  to="/contact"
                  className="hover:text-[#CD000E] transition-colors text-sm font-body text-[#9A9A9A]"
                >
                  Contact
                </Link>
              </li>
              <li>
                <Link
                  to="/terms"
                  className="hover:text-[#CD000E] transition-colors text-sm font-body text-[#9A9A9A]"
                >
                  Terms of Service
                </Link>
              </li>
              <li>
                <Link
                  to="/privacy"
                  className="hover:text-[#CD000E] transition-colors text-sm font-body text-[#9A9A9A]"
                >
                  Privacy Policy
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Copyright */}
        <div className="mt-12 pt-8 border-t border-gray-800 text-center text-sm text-[#9A9A9A] font-body">
          <p>&copy; {new Date().getFullYear()} Showgeo. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}

