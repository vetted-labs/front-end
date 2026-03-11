export {
  getCandidateNotificationIcon,
  getCandidateNotificationColor,
  formatTimeAgo,
  buildGenericNotificationUrl as buildCandidateNotificationUrlGeneric,
} from "@/lib/notification-helpers";
import { buildGenericNotificationUrl } from "@/lib/notification-helpers";
import type { CandidateNotification } from "@/types";

const FALLBACK_URL = "/candidate/notifications";

export function buildCandidateNotificationUrl(notification: CandidateNotification): string {
  return buildGenericNotificationUrl(notification, FALLBACK_URL);
}
