import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { JobAnalyticsWorkspace } from "@/components/dashboard/analytics/JobAnalyticsWorkspace";
import { jobAnalyticsFixture } from "@/components/dashboard/analytics/job-detail-fixture";

describe("JobAnalyticsWorkspace", () => {
  it("renders the pilot analytics workspace with ranking, evidence, and locked outcome readiness", () => {
    render(<JobAnalyticsWorkspace data={jobAnalyticsFixture} isFixtureMode />);

    expect(screen.getByText("Role intelligence")).toBeInTheDocument();
    expect(
      screen.getAllByText("Senior Back-end Developer").length,
    ).toBeGreaterThan(0);
    expect(screen.getAllByText("Ronan Webb").length).toBeGreaterThan(0);
    expect(screen.getByText("Selected endorser amount")).toBeInTheDocument();
    expect(screen.getByText("Fixture until persisted")).toBeInTheDocument();
    expect(screen.getByText("What predicts success here?")).toBeInTheDocument();
    expect(
      screen.getByText("2 of 5 tracked hire outcomes collected"),
    ).toBeInTheDocument();
  });
});
