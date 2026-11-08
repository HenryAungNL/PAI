import {
  BrainCircuit,
  Briefcase,
  Code2,
  GraduationCap,
  Languages,
  LineChart,
  Megaphone,
  Palette,
  Sparkles,
  type LucideIcon,
} from "lucide-react";

const iconMap: Record<string, LucideIcon> = {
  Code2,
  Briefcase,
  Palette,
  Megaphone,
  BrainCircuit,
  Sparkles,
  LineChart,
  Languages,
  GraduationCap,
};

/**
 * Maps a category's stored Lucide icon name to a component. Falls back to a
 * graduation cap so a renamed/unknown icon never renders blank.
 */
export function CategoryIcon({ name, className }: { name?: string; className?: string }) {
  const Icon = (name && iconMap[name]) || GraduationCap;
  return <Icon className={className} aria-hidden />;
}
