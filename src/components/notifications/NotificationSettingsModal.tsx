"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { useApi } from "@/lib/hooks/useFetch";
import { toast } from "sonner";

interface NotificationPreference {
  key: string;
  label: string;
  description: string;
  enabled: boolean;
}

const DEFAULT_PREFERENCES: NotificationPreference[] = [
  { key: "reviews", label: "Review Assignments", description: "When you're assigned a new application to review", enabled: true },
  { key: "governance", label: "Governance Proposals", description: "New proposals and voting deadlines", enabled: true },
  { key: "endorsements", label: "Endorsement Updates", description: "Bidding results, hire outcomes, slashing alerts", enabled: true },
  { key: "earnings", label: "Earnings & Rewards", description: "When rewards are distributed or claimable", enabled: true },
  { key: "guild", label: "Guild Activity", description: "New members, rank changes, feed posts", enabled: true },
  { key: "system", label: "System Announcements", description: "Platform updates and maintenance notices", enabled: true },
];

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export function NotificationSettingsModal({ isOpen, onClose }: Props) {
  const [prefs, setPrefs] = useState<NotificationPreference[]>(DEFAULT_PREFERENCES);
  const { execute: save, isLoading: saving } = useApi();

  const toggle = (key: string) => {
    setPrefs(p => p.map(pref => pref.key === key ? { ...pref, enabled: !pref.enabled } : pref));
  };

  const handleSave = () => {
    save(
      () => Promise.reject(new Error("Notification preferences API not available yet")),
      {
        onSuccess: () => { toast.success("Preferences saved"); onClose(); },
        onError: (err) => toast.error(err),
      }
    );
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Notification Preferences" size="md">
      <div className="space-y-1">
        {prefs.map(pref => (
          <div key={pref.key} className="flex items-center justify-between py-3 border-b border-border/50 last:border-0">
            <div className="pr-4">
              <div className="text-sm font-medium">{pref.label}</div>
              <div className="text-xs text-muted-foreground">{pref.description}</div>
            </div>
            <button
              type="button"
              onClick={() => toggle(pref.key)}
              className={`relative w-10 h-5 rounded-full transition-colors flex-shrink-0 ${pref.enabled ? 'bg-primary' : 'bg-muted'}`}
              role="switch"
              aria-checked={pref.enabled}
            >
              <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-transform ${pref.enabled ? 'translate-x-5' : 'translate-x-0.5'}`} />
            </button>
          </div>
        ))}
      </div>
      <div className="flex justify-end gap-3 mt-4 pt-4 border-t">
        <Button variant="outline" onClick={onClose}>Cancel</Button>
        <Button onClick={handleSave} disabled={saving}>{saving ? "Saving..." : "Save Preferences"}</Button>
      </div>
    </Modal>
  );
}
