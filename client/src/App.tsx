/**
 * App — root component.
 *
 * Manages page navigation (Dashboard / Admin) with animated transitions.
 * Wraps everything in ToastProvider for global toast access.
 * Renders the mesh-gradient background and floating Navbar.
 */

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Navbar } from "@/components/layout/Navbar";
import { Dashboard } from "@/pages/Dashboard";
import { AdminPanel } from "@/pages/AdminPanel";
import { ToastProvider } from "@/components/ui/Toast";

type Page = "dashboard" | "admin";

const pageVariants = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
};

const pageTransition = {
  duration: 0.3,
  ease: [0.16, 1, 0.3, 1] as const,
};

export default function App() {
  const [page, setPage] = useState<Page>(() => window.location.pathname === "/admin" ? "admin" : "dashboard");

  const navigate = (nextPage: Page) => {
    setPage(nextPage);
    window.history.pushState({}, "", nextPage === "admin" ? "/admin" : "/");
  };

  return (
    <ToastProvider>
      {/* Background mesh gradient — fixed, non-interactive */}
      <div
        className="fixed inset-0 bg-mesh pointer-events-none"
        aria-hidden="true"
      />

      {/* Navbar */}
      <Navbar current={page} onNavigate={navigate} />

      {/* Page content */}
      <main className="relative">
        <AnimatePresence mode="wait">
          <motion.div
            key={page}
            variants={pageVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={pageTransition}
          >
            {page === "dashboard" ? <Dashboard /> : <AdminPanel />}
          </motion.div>
        </AnimatePresence>
      </main>
    </ToastProvider>
  );
}
