import {
  Linkedin,
  Github,
  Twitter,
  Globe,
  Palette,
  BarChart3,
  Link,
  type LucideIcon,
} from "lucide-react";
import { SOCIAL_PLATFORMS } from "@/config/constants";

const PLATFORM_ICONS: Record<string, LucideIcon> = {
  linkedin: Linkedin,
  github: Github,
  twitter: Twitter,
  portfolio: Globe,
  dribbble: Palette,
  behance: Palette,
  kaggle: BarChart3,
  other: Link,
};

export function getPlatformIcon(platform: string): LucideIcon {
  return PLATFORM_ICONS[platform] || Link;
}

export function getPlatformLabel(platform: string): string {
  const entry = SOCIAL_PLATFORMS.find((p) => p.value === platform);
  return entry?.label ?? platform;
}

export function getPlatformPlaceholder(platform: string): string {
  const entry = SOCIAL_PLATFORMS.find((p) => p.value === platform);
  return entry?.placeholder ?? "https://...";
}
