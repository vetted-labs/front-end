"use client";
import { ExpertNavbar } from "@/components/ExpertNavbar";
import { ExpertProfile } from "@/components/ExpertProfile";

export default function ProfilePage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted">
      <ExpertNavbar />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <ExpertProfile />
      </div>
    </div>
  );
}
