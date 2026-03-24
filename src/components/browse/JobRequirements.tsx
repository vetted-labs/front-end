import type { Job } from "@/types";

interface JobRequirementsProps {
  job: Job;
}

export default function JobRequirements({ job }: JobRequirementsProps) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-foreground mb-3">
          About the Role
        </h2>
        <p className="text-card-foreground whitespace-pre-wrap">
          {job.description}
        </p>
      </div>

      {job.requirements && job.requirements.length > 0 && (
        <div>
          <h2 className="text-xl font-semibold text-foreground mb-3">
            Requirements
          </h2>
          <ul className="space-y-2">
            {job.requirements.map((req, index) => (
              <li key={index} className="flex items-start gap-2 text-card-foreground">
                <span className="text-primary mt-1">&bull;</span>
                <span>{req}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {job.skills && job.skills.length > 0 && (
        <div>
          <h2 className="text-xl font-semibold text-foreground mb-3">
            Skills
          </h2>
          <div className="flex flex-wrap gap-2">
            {job.skills.map((skill, index) => (
              <span
                key={index}
                className="px-3 py-1 bg-muted/50 text-foreground border border-border/60 rounded-full text-sm font-medium"
              >
                {skill}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
