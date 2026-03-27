"use client";

import { ReactNode, useState } from "react";
import { motion } from "framer-motion";
import { ChevronDown } from "lucide-react";
import { Expand } from "@/lib/motion";
import { cn } from "@/lib/utils";

interface AccordionItemProps {
  title: string | ReactNode;
  children: ReactNode;
  defaultOpen?: boolean;
  className?: string;
}

export function AccordionItem({ title, children, defaultOpen = false, className }: AccordionItemProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  return (
    <div className={cn("border-b border-border/40 last:border-b-0", className)}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center justify-between py-3 text-left text-sm font-medium hover:text-primary transition-colors"
      >
        {typeof title === "string" ? <span>{title}</span> : title}
        <motion.div animate={{ rotate: isOpen ? 180 : 0 }} transition={{ duration: 0.2 }}>
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        </motion.div>
      </button>
      <Expand isOpen={isOpen}>
        <div className="pb-3">{children}</div>
      </Expand>
    </div>
  );
}

interface AccordionProps {
  children: ReactNode;
  className?: string;
}

export function Accordion({ children, className }: AccordionProps) {
  return <div className={cn("divide-y divide-border/40", className)}>{children}</div>;
}
