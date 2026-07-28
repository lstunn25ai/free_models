/**
 * EmptyState — helpful message + optional action when no data exists.
 *
 * Props:
 *  - icon: Lucide icon component
 *  - title: short headline
 *  - description: helpful guidance
 *  - action: optional ReactNode (usually a Button)
 */

import { type LucideIcon } from "lucide-react";
import { type ReactNode } from "react";
import { motion } from "framer-motion";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: ReactNode;
}

export function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
      className="flex flex-col items-center justify-center py-16 px-4 text-center"
    >
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-ink-800/50 border border-ink-700/30">
        <Icon className="h-6 w-6 text-ink-400" aria-hidden="true" />
      </div>
      <h3 className="text-base font-medium text-ink-200 mb-1.5">{title}</h3>
      <p className="text-sm text-ink-400 max-w-sm text-pretty mb-5">
        {description}
      </p>
      {action}
    </motion.div>
  );
}
