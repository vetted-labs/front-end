import { CompanyForm } from "@/components/CompanyForm";

// Disable static generation for this page since it requires client-side context
export const dynamic = "force-dynamic";

export default function Company() {
  return <CompanyForm />;
}
