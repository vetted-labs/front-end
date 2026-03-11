export {
  getCompanyNotificationIcon,
  getCompanyNotificationColor,
  formatTimeAgo,
  buildGenericNotificationUrl as buildCompanyNotificationUrlGeneric,
} from "@/lib/notification-helpers";
import { buildGenericNotificationUrl } from "@/lib/notification-helpers";
import type { CompanyNotification } from "@/types";

const FALLBACK_URL = "/dashboard/notifications";

export function buildCompanyNotificationUrl(notification: CompanyNotification): string {
  return buildGenericNotificationUrl(notification, FALLBACK_URL);
}
