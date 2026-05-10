"use client";

import { useState } from "react";
import { KeyRound, ShieldCheck, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert } from "@/components/ui/alert";
import { useApi } from "@/lib/hooks/useFetch";
import { companyApi } from "@/lib/api";
import { SessionsList } from "./SessionsList";

interface PasswordForm {
  current: string;
  next: string;
  confirm: string;
}

const EMPTY_FORM: PasswordForm = { current: "", next: "", confirm: "" };

export function SecuritySection() {
  const [form, setForm] = useState<PasswordForm>(EMPTY_FORM);
  const [errors, setErrors] = useState<Partial<Record<keyof PasswordForm, string>>>({});
  const { execute, isLoading, error } = useApi<{ success: true }>();

  const validate = (): boolean => {
    const next: Partial<Record<keyof PasswordForm, string>> = {};
    if (!form.current) next.current = "Required";
    if (form.next.length < 8) next.next = "Use at least 8 characters";
    if (form.next.length > 128) next.next = "Must be 128 characters or fewer";
    if (form.next && form.next === form.current) {
      next.next = "Choose a password different from your current one";
    }
    if (form.confirm !== form.next) next.confirm = "Passwords don't match";
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    execute(() => companyApi.changePassword(form.current, form.next), {
      onSuccess: () => {
        toast.success("Password updated. Other devices have been signed out.");
        setForm(EMPTY_FORM);
        setErrors({});
      },
      onError: (msg) => toast.error(msg || "Failed to update password"),
    });
  };

  return (
    <div className="space-y-6">
      {/* Password card */}
      <section className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="px-5 py-3.5 border-b border-border flex items-center gap-3">
          <h2 className="text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground flex items-center gap-2">
            <span className="text-primary">
              <KeyRound className="w-4 h-4" />
            </span>
            Password
          </h2>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <p className="text-sm text-muted-foreground leading-relaxed">
            Choose a long, unique password. Updating it will sign you out of every
            other device.
          </p>

          {error && <Alert variant="error">{error}</Alert>}

          <div className="grid gap-4 max-w-md">
            <Input
              type="password"
              label="Current password"
              autoComplete="current-password"
              value={form.current}
              onChange={(e) =>
                setForm((f) => ({ ...f, current: e.target.value }))
              }
              error={errors.current}
            />
            <Input
              type="password"
              label="New password"
              autoComplete="new-password"
              description="At least 8 characters."
              value={form.next}
              onChange={(e) =>
                setForm((f) => ({ ...f, next: e.target.value }))
              }
              error={errors.next}
            />
            <Input
              type="password"
              label="Confirm new password"
              autoComplete="new-password"
              value={form.confirm}
              onChange={(e) =>
                setForm((f) => ({ ...f, confirm: e.target.value }))
              }
              error={errors.confirm}
            />
          </div>

          <div className="flex justify-end pt-1">
            <Button type="submit" isLoading={isLoading} disabled={isLoading}>
              Update password
            </Button>
          </div>
        </form>
      </section>

      {/* Sessions card */}
      <SessionsList />

      {/* 2FA placeholder */}
      <section className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="px-5 py-3.5 border-b border-border flex items-center gap-3">
          <h2 className="text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground flex items-center gap-2">
            <span className="text-primary">
              <ShieldCheck className="w-4 h-4" />
            </span>
            Two-factor authentication
          </h2>
        </div>
        <div className="p-5 flex items-start gap-3">
          <span className="w-9 h-9 rounded-lg bg-primary/10 text-primary grid place-items-center flex-shrink-0">
            <Sparkles className="w-4 h-4" />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-foreground">
              Coming soon
            </p>
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
              Authenticator-app and hardware-key support are on the roadmap.
              We&apos;ll let you know when it&apos;s ready to enable.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
