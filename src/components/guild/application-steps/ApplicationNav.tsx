import Image from "next/image";
import { ArrowLeft } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";

interface ApplicationNavProps {
  /** If provided, shows a "Back to Guild" button linking here */
  backHref?: string;
  onBack?: () => void;
}

export default function ApplicationNav({ backHref, onBack }: ApplicationNavProps) {
  return (
    <nav className="bg-card border-b border-border sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center space-x-4">
            {backHref && onBack ? (
              <button
                onClick={onBack}
                className="flex items-center text-muted-foreground hover:text-foreground transition-colors"
              >
                <ArrowLeft className="w-5 h-5 mr-2" />
                Back to Guild
              </button>
            ) : null}
            <Image
              src="/Vetted-orange.png"
              alt="Vetted Logo"
              width={32}
              height={32}
              className="w-8 h-8 rounded-lg"
            />
            <span className="text-xl font-bold text-foreground">Vetted</span>
          </div>
          <ThemeToggle />
        </div>
      </div>
    </nav>
  );
}
