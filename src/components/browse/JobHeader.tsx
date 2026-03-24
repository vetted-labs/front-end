import {
  Building2,
  MapPin,
  Briefcase,
  Calendar,
  Star,
  Users,
  Eye,
} from "lucide-react";
import { getAssetUrl } from "@/lib/api";
import type { Job } from "@/types";

interface JobHeaderProps {
  job: Job;
}

export default function JobHeader({ job }: JobHeaderProps) {
  return (
    <div className="border-b border-border pb-6 mb-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between mb-4">
        <div className="flex-1">
          <h1 className="text-3xl font-bold text-foreground mb-2">
            {job.title}
          </h1>
          <div className="flex flex-wrap items-center gap-3 text-muted-foreground">
            <span className="flex items-center gap-2">
              <Building2 className="w-4 h-4" />
              <span className="font-medium">{job.companyName || "Company"}</span>
            </span>
            <span className="flex items-center gap-1">
              <MapPin className="w-4 h-4" />
              {job.location}
            </span>
            <span className="flex items-center gap-1">
              <Briefcase className="w-4 h-4" />
              {job.type}
            </span>
          </div>
        </div>
        {job.companyLogo && (
          <img
            src={getAssetUrl(job.companyLogo)}
            alt={job.companyName || "Company"}
            className="w-20 h-20 sm:w-24 sm:h-24 rounded-xl object-cover border-2 border-border shadow-md sm:ml-6 flex-shrink-0"
            onError={(e) => {
              e.currentTarget.style.display = "none";
            }}
          />
        )}
      </div>

      <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
        <span className="flex items-center gap-1">
          <Calendar className="w-4 h-4" />
          Posted {new Date(job.createdAt).toLocaleDateString()}
        </span>
        {job.featured && (
          <span className="flex items-center gap-1 px-2 py-1 bg-gradient-to-r from-amber-400 to-orange-500 text-white rounded-full text-xs font-bold">
            <Star className="w-3 h-3 fill-white" />
            FEATURED
          </span>
        )}
        <span className="flex items-center gap-1">
          <Users className="w-4 h-4" />
          {job.applicants} applicants
        </span>
        <span className="flex items-center gap-1">
          <Eye className="w-4 h-4" />
          {job.views} views
        </span>
      </div>
    </div>
  );
}
