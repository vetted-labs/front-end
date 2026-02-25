"use client";

interface PillTab<T extends string> {
  value: T;
  label: string;
}

interface PillTabsProps<T extends string> {
  tabs: PillTab<T>[];
  activeTab: T;
  onTabChange: (tab: T) => void;
  className?: string;
}

export function PillTabs<T extends string>({
  tabs,
  activeTab,
  onTabChange,
  className,
}: PillTabsProps<T>) {
  return (
    <div className={`flex flex-wrap gap-2 overflow-x-auto ${className ?? ""}`}>
      {tabs.map((tab) => (
        <button
          key={tab.value}
          onClick={() => onTabChange(tab.value)}
          className={`px-4 py-2 rounded-full border text-sm font-medium transition-all ${
            activeTab === tab.value
              ? "bg-primary/20 text-primary border-primary/40 dark:shadow-[0_0_20px_rgba(255,122,0,0.15)]"
              : "bg-transparent text-muted-foreground border-border hover:text-foreground hover:border-primary/30"
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
