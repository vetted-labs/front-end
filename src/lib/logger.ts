import { toast } from "sonner";

const isDebug =
  typeof window !== "undefined"
    ? process.env.NEXT_PUBLIC_DEBUG === "true"
    : process.env.NEXT_PUBLIC_DEBUG === "true";

interface LogOptions {
  component?: string;
  silent?: boolean;
  toast?: string;
}

function formatPrefix(level: string, component?: string): string {
  const tag = component ? `[${component}]` : "";
  return `[${level}]${tag}`;
}

function extractMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  return "An unexpected error occurred";
}

export const logger = {
  debug(message: string, data?: unknown): void {
    if (!isDebug) return;
    if (data !== undefined) {
      console.debug(formatPrefix("DEBUG"), message, data);
    } else {
      console.debug(formatPrefix("DEBUG"), message);
    }
  },

  info(message: string, data?: unknown): void {
    if (!isDebug) return;
    if (data !== undefined) {
      console.info(formatPrefix("INFO"), message, data);
    } else {
      console.info(formatPrefix("INFO"), message);
    }
  },

  warn(message: string, data?: unknown, opts?: LogOptions): void {
    if (isDebug) {
      console.warn(formatPrefix("WARN", opts?.component), message, data ?? "");
    }
    if (!opts?.silent) {
      toast.warning(opts?.toast ?? message);
    }
  },

  error(message: string, error?: unknown, opts?: LogOptions): void {
    if (isDebug) {
      console.error(
        formatPrefix("ERROR", opts?.component),
        message,
        error ?? ""
      );
    } else {
      console.error(formatPrefix("ERROR", opts?.component), message);
    }

    if (!opts?.silent) {
      toast.error(opts?.toast ?? extractMessage(error) ?? message);
    }
  },
};
