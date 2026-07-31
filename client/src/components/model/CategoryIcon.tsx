import {
  Brain,
  Film,
  Image as ImageIcon,
  BookOpen,
  Scale,
  Shuffle,
  Waypoints,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { CATEGORY_META } from "@/lib/utils";

const icons: Record<string, LucideIcon> = {
  brain: Brain,
  scale: Scale,
  zap: Zap,
  "book-open": BookOpen,
  image: ImageIcon,
  film: Film,
  vector: Waypoints,
  shuffle: Shuffle,
};

export function CategoryIcon({ role, className = "h-3.5 w-3.5" }: { role: string; className?: string }) {
  const Icon = icons[CATEGORY_META[role]?.icon ?? "brain"] ?? Brain;
  return <Icon className={className} aria-hidden="true" />;
}
