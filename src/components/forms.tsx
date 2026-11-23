"use client";

import { useActionState } from "react";
import { authenticate } from "@/app/actions/auth";
import { workspaceAction } from "@/app/actions/workspace";

export function AccountForm({ mode }: { mode: "login" | "signup" }) {
  const [state, action, busy] = useActionState(authenticate.bind(null, mode), {});
  return <form action={action} className="form-stack">
    <label>Username<input name="username" autoComplete="username" required maxLength={30} /></label>
    <label>Password<input name="password" type="password" autoComplete={mode === "signup" ? "new-password" : "current-password"} required minLength={mode === "signup" ? 10 : undefined} maxLength={128} /></label>
    {state.error && <p role="alert" className="error">{state.error}</p>}
    <button className="button primary" disabled={busy}>{busy ? "Please wait…" : mode === "signup" ? "Create account" : "Sign in"}</button>
  </form>;
}

export function WorkspaceForm({ operation, children, confirm, className = "form-stack" }: {
  operation: string; children: React.ReactNode; confirm?: string; className?: string;
}) {
  const [state, action, busy] = useActionState(workspaceAction.bind(null, operation), {});
  const shareUrl = state.token ? window.location.origin + "/share/" + state.token : "";
  return <form action={action} className={className} onSubmit={(event) => {
    if (confirm && !window.confirm(confirm)) event.preventDefault();
  }}>
    <fieldset disabled={busy}>{children}</fieldset>
    {state.error && <p role="alert" className="error">{state.error}</p>}
    {state.message && <p role="status" className="muted">{state.message}</p>}
    {shareUrl && <label>Copy this link now<input readOnly value={shareUrl} onFocus={(event) => event.target.select()} /></label>}
  </form>;
}
