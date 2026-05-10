"use client";

import JobDetailPage from "@/components/jobs/JobDetailPage";

/**
 * Public-facing job detail page (`/browse/jobs/<id>`). Shares its layout with
 * the redesigned dashboard `JobDetailPage`; the public-mode flag enables the
 * apply CTA + guild-membership flow in the right rail and hides the
 * applicants tab.
 */
export default function JobDetailView() {
  return <JobDetailPage publicContext />;
}
