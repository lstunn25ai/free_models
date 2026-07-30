import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Navbar } from "@/components/layout/Navbar";
import { Dashboard } from "@/pages/Dashboard";
import { AdminPanel } from "@/pages/AdminPanel";
import { Statistics } from "@/pages/Statistics";
import { ToastProvider } from "@/components/ui/Toast";
import { useAdminSession } from "@/hooks/useApi";

export type Page = "rating" | "selection" | "statistics";
const routes: Record<Page, string> = { rating: "/", selection: "/selection", statistics: "/statistics" };
function initialPage(): Page { return window.location.pathname === "/statistics" ? "statistics" : window.location.pathname === "/selection" || window.location.pathname === "/admin" ? "selection" : "rating"; }

function Shell() {
  const [page, setPage] = useState<Page>(initialPage); const session = useAdminSession();
  const navigate = (next: Page) => { setPage(next); window.history.pushState({}, "", routes[next]); };
  if (session.isLoading) return <div className="min-h-screen bg-mesh" />;
  if (!session.data?.authenticated) return <AdminPanel />;
  return <><div className="fixed inset-0 bg-mesh pointer-events-none" aria-hidden="true" /><Navbar current={page} onNavigate={navigate} /><main className="relative"><AnimatePresence mode="wait"><motion.div key={page} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.25 }}>{page === "rating" ? <Dashboard /> : page === "selection" ? <AdminPanel /> : <Statistics />}</motion.div></AnimatePresence></main></>;
}
export default function App() { return <ToastProvider><Shell /></ToastProvider>; }
