import { AlertCircle, CheckCircle2, Info, XCircle } from "lucide-react";
import { ReactNode } from "react";

interface AlertProps {
  variant?: "error" | "success" | "warning" | "info";
  children: ReactNode;
  onClose?: () => void;
}

export function Alert({ variant = "info", children, onClose }: AlertProps) {
  const styles = {
    error: {
      container: "bg-red-50 border-red-200 text-red-800",
      icon: <XCircle className="w-5 h-5 text-red-600" />
    },
    success: {
      container: "bg-green-50 border-green-200 text-green-800",
      icon: <CheckCircle2 className="w-5 h-5 text-green-600" />
    },
    warning: {
      container: "bg-yellow-50 border-yellow-200 text-yellow-800",
      icon: <AlertCircle className="w-5 h-5 text-yellow-600" />
    },
    info: {
      container: "bg-blue-50 border-blue-200 text-blue-800",
      icon: <Info className="w-5 h-5 text-blue-600" />
    }
  };

  const { container, icon } = styles[variant];

  return (
    <div className={`p-4 border rounded-lg flex items-start gap-3 ${container}`}>
      <div className="flex-shrink-0">{icon}</div>
      <div className="flex-1 text-sm">{children}</div>
      {onClose && (
        <button
          onClick={onClose}
          className="flex-shrink-0 text-current opacity-70 hover:opacity-100"
        >
          <XCircle className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}
