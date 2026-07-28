/**
 * Button — production-grade button with variants, loading state, and a11y.
 *
 * Props:
 *  - variant: "primary" | "secondary" | "ghost" | "danger"
 *  - size: "sm" | "md" | "lg"
 *  - isLoading: shows spinner, disables interaction
 *  - leftIcon / rightIcon: Lucide icon components
 *  - fullWidth: stretches to container
 *
 * Uses Framer Motion for press feedback (scale 0.98 spring).
 */

import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";
import { motion } from "framer-motion";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  isLoading?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  fullWidth?: boolean;
}

const variantStyles: Record<Variant, string> = {
  primary:
    "bg-accent text-white hover:bg-accent-hover shadow-glow",
  secondary:
    "bg-ink-800/60 text-ink-100 hover:bg-ink-700/60 border border-ink-700/40",
  ghost:
    "bg-transparent text-ink-300 hover:text-ink-100 hover:bg-ink-800/40",
  danger:
    "bg-danger/10 text-danger hover:bg-danger/20 border border-danger/20",
};

const sizeStyles: Record<Size, string> = {
  sm: "h-8 px-3 text-xs gap-1.5",
  md: "h-10 px-4 text-sm gap-2",
  lg: "h-12 px-6 text-base gap-2.5",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = "primary",
      size = "md",
      isLoading = false,
      leftIcon,
      rightIcon,
      fullWidth = false,
      className,
      children,
      disabled,
      ...props
    },
    ref,
  ) => {
    return (
      <motion.button
        ref={ref}
        whileTap={{ scale: 0.98 }}
        transition={{ type: "spring", stiffness: 400, damping: 25 }}
        className={cn(
          "inline-flex items-center justify-center rounded-full font-medium",
          "transition-colors duration-200 ease-fluid",
          "disabled:opacity-40 disabled:cursor-not-allowed disabled:pointer-events-none",
          "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
          variantStyles[variant],
          sizeStyles[size],
          fullWidth && "w-full",
          className,
        )}
        disabled={disabled || isLoading}
        aria-busy={isLoading}
        {...(props as any)}
      >
        {isLoading ? (
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
        ) : (
          leftIcon
        )}
        {children}
        {!isLoading && rightIcon}
      </motion.button>
    );
  },
);

Button.displayName = "Button";
