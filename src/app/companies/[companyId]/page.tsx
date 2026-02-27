import CompanyPublicProfilePage from "@/components/company/CompanyPublicProfilePage";

export default function CompanyPublicPage({ params }: { params: Promise<{ companyId: string }> }) {
  return <CompanyPublicProfilePage params={params} />;
}
