import { Shield } from "lucide-react";

interface ApplicationHeaderProps {
  guildName: string;
  description: string;
}

export default function ApplicationHeader({ guildName, description }: ApplicationHeaderProps) {
  return (
    <div className="bg-primary/5 border-b border-border">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex items-start gap-6">
          <div className="w-16 h-16 bg-primary/10 rounded-xl flex items-center justify-center shadow-sm">
            <Shield className="w-8 h-8 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2">
              Apply to Join {guildName}
            </h1>
            <p className="text-sm font-medium text-muted-foreground">
              {description || "Complete the application form below to join this guild"}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
