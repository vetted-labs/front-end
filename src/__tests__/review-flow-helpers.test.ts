import { describe, expect, it } from "vitest";
import { buildNotificationUrl } from "@/lib/notification-helpers";
import { getReviewQueueUrl } from "@/lib/review-routing";
import { validateReviewScores } from "@/lib/review-validation";
import type { GuildApplication } from "@/types";

describe("review flow routing helpers", () => {
  it("routes the review queue to the expert voting page", () => {
    const app = {
      id: "expert-app-1",
      guild_id: "guild-1",
      item_type: "expert_application",
    } as GuildApplication;

    expect(getReviewQueueUrl(app)).toBe(
      "/expert/voting?reviewAppId=expert-app-1&reviewType=expert&guildId=guild-1"
    );
  });

  it("uses applicationId and applicantType for candidate review auto-open", () => {
    const app = {
      id: "candidate-app-1",
      guild_id: "guild-1",
      item_type: "guild_application",
    } as GuildApplication;

    expect(getReviewQueueUrl(app)).toBe(
      "/expert/voting?reviewAppId=candidate-app-1&reviewType=candidate&guildId=guild-1"
    );
  });

  it("routes proposal assignments to the expert voting detail page", () => {
    const app = {
      id: "proposal-1",
      guild_id: "guild-1",
      item_type: "proposal",
    } as GuildApplication;

    expect(getReviewQueueUrl(app)).toBe("/expert/voting/applications/proposal-1");
  });
});

describe("notification deep links", () => {
  it("adds candidate applicantType to candidate guild application notifications", () => {
    const url = buildNotificationUrl({
      id: "notif-1",
      expertId: "expert-1",
      type: "guild_application",
      title: "New candidate application",
      message: "Review this candidate",
      applicationId: "candidate-app-1",
      applicantType: "candidate",
      link: "/expert/guild/guild-1",
      isRead: false,
      createdAt: "2026-04-28T10:00:00Z",
    });

    expect(url).toBe(
      "/expert/voting?reviewAppId=candidate-app-1&reviewType=candidate&guildId=guild-1"
    );
  });

  it("normalizes legacy candidate application notification query params", () => {
    const url = buildNotificationUrl({
      id: "notif-2",
      expertId: "expert-1",
      type: "guild_application",
      title: "New candidate application",
      message: "Review this candidate",
      link: "/expert/guild/guild-1?tab=applications&candidateApplicationId=candidate-app-2",
      isRead: false,
      createdAt: "2026-04-28T10:00:00Z",
    } as Parameters<typeof buildNotificationUrl>[0] & { candidateApplicationId?: string });

    expect(url).toBe(
      "/expert/voting?reviewAppId=candidate-app-2&reviewType=candidate&guildId=guild-1"
    );
  });

  it("builds a guild review URL when the notification has no link", () => {
    const url = buildNotificationUrl({
      id: "notif-3",
      expertId: "expert-1",
      type: "guild_application",
      title: "New expert application",
      message: "Review this expert",
      guildId: "guild-1",
      applicationId: "expert-app-1",
      applicantType: "expert",
      link: "",
      isRead: false,
      createdAt: "2026-04-28T10:00:00Z",
    });

    expect(url).toBe(
      "/expert/voting?reviewAppId=expert-app-1&reviewType=expert&guildId=guild-1"
    );
  });

  it("preserves no-link applicationId even when applicantType is missing", () => {
    const url = buildNotificationUrl({
      id: "notif-4",
      expertId: "expert-1",
      type: "guild_application",
      title: "New application",
      message: "Review this application",
      guildId: "guild-1",
      applicationId: "application-1",
      link: "",
      isRead: false,
      createdAt: "2026-04-28T10:00:00Z",
    });

    expect(url).toBe(
      "/expert/voting?reviewAppId=application-1&reviewType=expert&guildId=guild-1"
    );
  });

  it("canonicalizes stale guild application notification paths when guild metadata exists", () => {
    const url = buildNotificationUrl({
      id: "notif-5",
      expertId: "expert-1",
      type: "guild_application",
      title: "New expert application",
      message: "Review this expert",
      guildId: "guild-1",
      applicationId: "expert-app-2",
      applicantType: "expert",
      link: "/expert/applications?tab=applications",
      isRead: false,
      createdAt: "2026-04-28T10:00:00Z",
    });

    expect(url).toBe(
      "/expert/voting?reviewAppId=expert-app-2&reviewType=expert&guildId=guild-1"
    );
  });
});

describe("review score validation", () => {
  it("rejects an unselected general rubric criterion", () => {
    const result = validateReviewScores({
      generalRubricQuestions: {
        motivation: {
          criteria: [{ id: "clarity", label: "Clarity", maxPoints: 5 }],
        },
      },
      generalScores: {},
      topicList: [],
      topicScores: {},
    });

    expect(result.valid).toBe(false);
    expect(result.message).toContain("Clarity");
    expect(result.generalErrors["motivation.clarity"]).toContain("Clarity");
  });

  it("allows an explicitly selected zero score", () => {
    const result = validateReviewScores({
      generalRubricQuestions: {
        motivation: {
          criteria: [{ id: "clarity", label: "Clarity", maxPoints: 5 }],
        },
      },
      generalScores: { motivation: { clarity: 0 } },
      topicList: [{ id: "architecture", title: "Architecture" }],
      topicScores: { architecture: 0 },
    });

    expect(result.valid).toBe(true);
  });

  it("fails closed when general rubric questions are not rendered by the modal", () => {
    const result = validateReviewScores({
      generalRubricQuestions: {
        visible: {
          criteria: [{ id: "clarity", label: "Clarity", maxPoints: 5 }],
        },
        hidden: {
          criteria: [{ id: "depth", label: "Depth", maxPoints: 5 }],
        },
      },
      generalQuestionIds: ["visible"],
      generalScores: { visible: { clarity: 3 } },
      topicList: [],
      topicScores: {},
    });

    expect(result.valid).toBe(false);
    expect(result.message).toContain("missing a matching question");
  });
});
