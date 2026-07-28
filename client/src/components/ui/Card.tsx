/**
 * Card — Double-Bezel nested architecture.
 *
 * Outer shell: gradient hairline border + padding
 * Inner core: actual surface with inner highlight shadow
 *
 * This is the fundamental container for all content blocks.
 * DO NOT nest cards inside cards.
 *
 * Props:
 *  - hover: enables hover elevation + border glow
 *  - interactive: adds cursor-pointer + whileTap scale
 *  - padding: "none" | "sm" | "md" | "lg"
 */

import { forwardRef, type ReactNode } from "react";
import { motion, type HTMLMotionProps } from "framer-motion";
import { cn } from "@/lib/utils";

type Padding = "none" | "sm" | "md" | "lg";

interface CardProps extends Omit<HTMLMotionProps<"div">, "children"> {
  hover?: boolean;
  interactive?: boolean;
  padding?: Padding;
  children: ReactNode;
}

const paddingStyles: Record<Padding, string> = {
  none: "",
  sm: "p-3",
  md: "p-5",
  lg: "p-7",
};

export const Card = forwardRef<HTMLDivElement, CardProps>(
  (
    {
      hover = false,
      interactive = false,
      padding = "md",
      className,
      children,
      ...props
    },
    ref,
  ) => {
    return (
      <motion.div
        ref={ref}
        {...(interactive
          ? {
              whileHover: { y: -2 },
              whileTap: { scale: 0.99 },
              transition: { type: "spring", stiffness: 400, damping: 25 },
            }
          : {})}
        className={cn(
          // Outer shell — the bezel
          "bezel-outer",
          hover && "transition-shadow duration-300 ease-fluid",
          hover && "hover:shadow-glow",
          className,
        )}
        {...props}
      >
        {/* Inner core — the actual surface */}
        <div
          className={cn(
            "rounded-[calc(14px-1.5px)] bg-ink-900/60 shadow-inner-highlight",
            paddingStyles[padding],
          )}
        >
          {children}
        </div>
      </motion.div>
    );
  },
);

Card.displayName = "Card";
