import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("next/navigation", () => ({
  useParams: () => ({ jobId: "job-google-backend-pilot" }),
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock("@/lib/hooks/useFetch", () => ({
  useFetch: vi.fn(() => ({
    data: null,
    isLoading: false,
    error: null,
    refetch: vi.fn(),
  })),
}));

describe("JobAnalyticsPage fixture mode", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("renders the fixture workspace locally without requiring job/applications data", async () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("NEXT_PUBLIC_ANALYTICS_FIXTURE_MODE", "true");

    const { default: JobAnalyticsPage } = await import("@/components/dashboard/JobAnalyticsPage");
    render(<JobAnalyticsPage />);

    expect(screen.getByText(/Fixture preview/)).toBeInTheDocument();
    expect(screen.getByText("Role intelligence")).toBeInTheDocument();
    expect(screen.getAllByText("Ronan Webb").length).toBeGreaterThan(0);
  });
});
