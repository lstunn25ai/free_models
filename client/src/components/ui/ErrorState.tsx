/**
 * ErrorState — error message with retry action.
 *
 * Props:
 *  - message: what went wrong
 *  - onRetry: callback for retry button
 *  - fullHeight: center vertically in container
 */

import { AlertTriangle, RefreshCw } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "./Button";

interface ErrorStateProps {
  message?: string;
  onRetry?: () => void;
  fullHeight?: boolean;
}

export function ErrorState({
  message = "Something went wrong",
  onRetry,
  fullHeight = false,
}: ErrorStateProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
      className={`flex flex-col items-center justify-center px-4 text-center ${
        fullHeight ? "min-h-[200px]" : "py-12"
      }`}
      role="alert"
    >
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-danger/10 border border-danger/20">
        <AlertTriangle className="h-6 w-6 text-danger" aria-hidden="true" />
      </div>
      <p className="text-sm text-ink-300 mb-4 max-w-sm">{message}</p>
      {onRetry && (
        <Button
          variant="secondary"
          size="sm"
          leftIcon={<RefreshCw className="h-3.5 w-3.5" />}
          onClick={onRetry}
        >
          Retry
        </Button>
      )}
    </motion.div>
  );
}
