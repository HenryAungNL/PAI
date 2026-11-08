import { cn } from "@/lib/utils";

interface TabsProps {
  tabs: { value: string; label: string; count?: number }[];
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

export function Tabs({ tabs, value, onChange, className }: TabsProps) {
  return (
    <div className={cn("flex flex-wrap gap-1 border-b border-border", className)} role="tablist">
      {tabs.map((tab) => {
        const active = tab.value === value;
        return (
          <button
            key={tab.value}
            role="tab"
            aria-selected={active}
            onClick={() => onChange(tab.value)}
            className={cn(
              "relative -mb-px rounded-t-lg px-4 py-2.5 text-sm font-medium transition-colors",
              active ? "border-b-2 border-primary text-primary" : "border-b-2 border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            {tab.label}
            {typeof tab.count === "number" && (
              <span className={cn("ml-2 rounded-full px-1.5 py-0.5 text-xs", active ? "bg-primary-50 text-primary-700" : "bg-neutral-100 text-neutral-600")}>
                {tab.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
