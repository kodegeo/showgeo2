import { useNavigate } from "react-router-dom";
import Navigation from "@/components/Navigation/Navigation";
import { Footer } from "@/components/Footer";
import { Clock, XCircle, Ban } from "lucide-react";

export default function CreatorStatusPage() {
  const navigate = useNavigate();

  // Placeholder logic - will be replaced with real data later
  const status = "pending"; // "pending" | "rejected" | "banned"

  const getStatusContent = () => {
    switch (status) {
      case "pending":
        return {
          icon: Clock,
          iconColor: "text-yellow-500",
          iconBg: "bg-yellow-500/20",
          title: "Your application is under review",
          description: "We're currently reviewing your creator application. This process typically takes a few business days. You'll receive a notification once a decision has been made.",
        };
      case "rejected":
        return {
          icon: XCircle,
          iconColor: "text-red-500",
          iconBg: "bg-red-500/20",
          title: "Your application was rejected",
          description: "Your creator application was not approved at this time. You may submit a new application after reviewing our guidelines and making any necessary adjustments.",
        };
      case "banned":
        return {
          icon: Ban,
          iconColor: "text-red-500",
          iconBg: "bg-red-500/20",
          title: "Your account has been banned from applying",
          description: "You are not eligible to apply as a creator on this platform. This decision is final. If you believe this is an error, please contact support.",
        };
      default:
        return {
          icon: Clock,
          iconColor: "text-yellow-500",
          iconBg: "bg-yellow-500/20",
          title: "Your application is under review",
          description: "We're currently reviewing your creator application. This process typically takes a few business days. You'll receive a notification once a decision has been made.",
        };
    }
  };

  const statusContent = getStatusContent();
  const Icon = statusContent.icon;

  return (
    <div className="min-h-screen bg-[#0B0B0B] text-white flex flex-col">
      <Navigation />
      <main className="flex-1 pt-20 md:pt-24 flex items-center justify-center px-4">
        <div className="max-w-2xl w-full">
          <div className="bg-[#0B0B0B]/90 backdrop-blur-sm border border-gray-800 rounded-lg shadow-lg p-12">
            {/* Icon */}
            <div className="mb-6 flex justify-center">
              <div className={`w-20 h-20 ${statusContent.iconBg} rounded-full flex items-center justify-center`}>
                <Icon className={`w-12 h-12 ${statusContent.iconColor}`} />
              </div>
            </div>

            {/* Title */}
            <h1 className="text-3xl md:text-4xl font-heading font-bold text-white mb-4 text-center uppercase tracking-tighter">
              Creator Application Status
            </h1>

            {/* Description */}
            <p className="text-[#9A9A9A] font-body text-base mb-6 text-center">
              Your creator application is being reviewed by our team. We carefully evaluate each application to ensure quality and compliance with our platform standards.
            </p>

            {/* Status Message */}
            <div className="bg-white/5 rounded-lg p-6 mb-8">
              <h2 className="text-xl font-heading font-semibold text-white mb-2 text-center">
                {statusContent.title}
              </h2>
              <p className="text-[#9A9A9A] font-body text-sm text-center mt-2">
                {statusContent.description}
              </p>
            </div>

            {/* Action Button */}
            <div className="flex justify-center">
              <button
                onClick={() => navigate("/profile")}
                className="px-6 py-3 border border-gray-700 hover:border-[#CD000E] text-white font-heading font-semibold rounded-lg uppercase tracking-wider transition-all duration-300"
              >
                Return to Profile
              </button>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
