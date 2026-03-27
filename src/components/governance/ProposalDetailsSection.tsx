import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ScrollText } from "lucide-react";

interface ProposalDetailsSectionProps {
  title: string;
  description: string;
  onTitleChange: (value: string) => void;
  onDescriptionChange: (value: string) => void;
}

export function ProposalDetailsSection({
  title,
  description,
  onTitleChange,
  onDescriptionChange,
}: ProposalDetailsSectionProps) {
  return (
    <div className="p-6 sm:p-8 space-y-6">
      <div className="flex items-center gap-3 mb-6 pb-4 border-b border-border">
        <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
          <ScrollText className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h3 className="text-xl font-bold text-foreground">
            Proposal Details
          </h3>
          <p className="text-sm text-muted-foreground">
            Describe the change you want to propose
          </p>
        </div>
      </div>

      <Input
        label="Title"
        required
        value={title}
        onChange={(e) => onTitleChange(e.target.value)}
        placeholder="A concise title for your proposal"
      />

      <Textarea
        label="Description"
        required
        value={description}
        onChange={(e) => onDescriptionChange(e.target.value)}
        placeholder="Describe your proposal in detail. What change do you propose and why?"
        rows={5}
        showCounter
        minLength={20}
        maxLength={2000}
      />
    </div>
  );
}
