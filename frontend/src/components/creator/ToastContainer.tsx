import { useToast } from "@/hooks/creator/useToast";
import { CheckCircle, XCircle, AlertTriangle, Info, X } from "lucide-react";

const toastConfig = {
  success: { icon: CheckCircle, color: "#00C853", bgColor: "bg-green-500/10", borderColor: "border-green-500/50" },
  error: { icon: XCircle, color: "#CD000E", bgColor: "bg-red-500/10", borderColor: "border-red-500/50" },
  warning: { icon: AlertTriangle, color: "#F49600", bgColor: "bg-yellow-500/10", borderColor: "border-yellow-500/50" },
  info: { icon: Info, color: "#1FB5FC", bgColor: "bg-blue-500/10", borderColor: "border-blue-500/50" },
};

export function ToastContainer() {
  const { toasts, dismissToast } = useToast();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-2 max-w-md">
      {toasts.map((toast) => {
        const config = toastConfig[toast.type];
        const Icon = config.icon;

        return (
          <div
            key={toast.id}
            className={`
              ${config.bgColor} ${config.borderColor}
              border rounded-lg p-4 shadow-lg
              backdrop-blur-sm
              animate-in slide-in-from-top-5 fade-in
              flex items-start gap-3
              min-w-[300px]
            `}
            style={{ backgroundColor: "#0B0B0B", borderColor: config.color + "50" }}
          >
            <Icon className="w-5 h-5 flex-shrink-0" style={{ color: config.color }} />
            <div className="flex-1 min-w-0">
              <p className="text-white font-semibold text-sm">{toast.title}</p>
              {toast.description && (
                <p className="text-[#9A9A9A] text-xs mt-1">{toast.description}</p>
              )}
            </div>
            <button
              onClick={() => dismissToast(toast.id)}
              className="text-[#9A9A9A] hover:text-white transition-colors flex-shrink-0"
              aria-label="Dismiss toast"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
}

