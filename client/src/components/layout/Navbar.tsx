/**
 * Navbar — floating glass pill, detached from the top edge.
 *
 * Contains:
 *  - Brand logo + name
 *  - Navigation links (Dashboard / Admin)
 *  - Notification bell
 *
 * Mobile: collapses to logo + bell (nav links move to a compact row below)
 */

import { motion } from "framer-motion";
import { Activity } from "lucide-react";
import { cn } from "@/lib/utils";

type Page = "dashboard" | "admin";

interface NavbarProps {
  current: Page;
  onNavigate: (page: Page) => void;
}

const navItems: { key: Page; label: string }[] = [
  { key: "dashboard", label: "Dashboard" },
  { key: "admin", label: "Admin" },
];

export function Navbar({ current, onNavigate }: NavbarProps) {
  return (
    <header className="fixed top-0 left-0 right-0 z-40 flex justify-center px-4 pt-4">
      <motion.nav
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: "spring", stiffness: 300, damping: 25 }}
        className="glass-surface rounded-full px-2 py-1.5 flex items-center gap-1 shadow-ambient"
        aria-label="Primary navigation"
      >
        {/* Brand */}
        <div className="flex items-center gap-2 pl-2 pr-3">
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-accent/15">
            <Activity className="h-3.5 w-3.5 text-accent" aria-hidden="true" />
          </div>
          <span className="text-sm font-medium text-ink-100 hidden sm:inline">
            Free Models
          </span>
        </div>

        {/* Divider */}
        <div className="h-5 w-px bg-ink-700/40" />

        {/* Nav links */}
        <div className="flex items-center gap-0.5">
          {navItems.map((item) => (
            <button
              key={item.key}
              onClick={() => onNavigate(item.key)}
              className={cn(
                "relative px-3 py-1.5 text-xs font-medium rounded-full transition-colors",
                current === item.key
                  ? "text-white"
                  : "text-ink-400 hover:text-ink-200",
              )}
              aria-current={current === item.key ? "page" : undefined}
            >
              {current === item.key && (
                <motion.div
                  layoutId="nav-pill"
                  className="absolute inset-0 rounded-full bg-accent"
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                />
              )}
              <span className="relative z-10">{item.label}</span>
            </button>
          ))}
        </div>

      </motion.nav>
    </header>
  );
}
