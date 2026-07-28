/**
 * FeedbackButtons — 👍 / 👎 voting with optimistic updates.
 *
 * Sends feedback to POST /api/feedback, invalidates the feedback query.
 * Shows a brief scale animation on click.
 *
 * Props:
 *  - providerModelId: the link to vote on
 *  - disabled: when racing or offline
 */

import { useState } from "react";
import { motion } from "framer-motion";
import { ThumbsUp, ThumbsDown } from "lucide-react";
import { useCreateFeedback } from "@/hooks/useApi";
import { useToast } from "@/components/ui/Toast";
import { cn } from "@/lib/utils";

interface FeedbackButtonsProps {
  providerModelId: string;
  disabled?: boolean;
}

export function FeedbackButtons({
  providerModelId,
  disabled = false,
}: FeedbackButtonsProps) {
  const createFeedback = useCreateFeedback();
  const { showToast } = useToast();
  const [voted, setVoted] = useState<"UP" | "DOWN" | null>(null);

  const handleVote = (type: "UP" | "DOWN") => {
    if (disabled || createFeedback.isPending) return;

    setVoted(type);
    createFeedback.mutate(
      { providerModelId, type },
      {
        onSuccess: () => {
          showToast({
            title: type === "UP" ? "Thanks for the feedback" : "Feedback recorded",
            variant: "success",
          });
          setTimeout(() => setVoted(null), 1000);
        },
        onError: () => {
          showToast({
            title: "Failed to submit feedback",
            variant: "error",
          });
          setVoted(null);
        },
      },
    );
  };

  return (
    <div className="flex items-center gap-1">
      <motion.button
        whileTap={{ scale: 0.85 }}
        transition={{ type: "spring", stiffness: 600, damping: 20 }}
        onClick={() => handleVote("UP")}
        disabled={disabled || createFeedback.isPending}
        className={cn(
          "flex h-7 w-7 items-center justify-center rounded-lg transition-colors",
          "text-ink-400 hover:text-success hover:bg-success/10",
          "disabled:opacity-40 disabled:cursor-not-allowed",
          voted === "UP" && "text-success bg-success/15",
        )}
        aria-label="Thumbs up"
        aria-pressed={voted === "UP"}
      >
        <ThumbsUp className="h-3.5 w-3.5" />
      </motion.button>
      <motion.button
        whileTap={{ scale: 0.85 }}
        transition={{ type: "spring", stiffness: 600, damping: 20 }}
        onClick={() => handleVote("DOWN")}
        disabled={disabled || createFeedback.isPending}
        className={cn(
          "flex h-7 w-7 items-center justify-center rounded-lg transition-colors",
          "text-ink-400 hover:text-danger hover:bg-danger/10",
          "disabled:opacity-40 disabled:cursor-not-allowed",
          voted === "DOWN" && "text-danger bg-danger/15",
        )}
        aria-label="Thumbs down"
        aria-pressed={voted === "DOWN"}
      >
        <ThumbsDown className="h-3.5 w-3.5" />
      </motion.button>
    </div>
  );
}
