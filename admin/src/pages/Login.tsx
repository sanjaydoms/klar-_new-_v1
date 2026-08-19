import { useState } from "react";
import type { FormEvent } from "react";

import { Button, ErrorNotice } from "@/components/Primitives";
import { authApi, errorMessage } from "@/lib/api";
import { useSession } from "@/lib/session";

/**
 * Sign in.
 *
 * Posts to auth-service, which sets an httpOnly cookie. This app never
 * receives, stores or forwards a token — it asks who it is afterwards.
 */
export function Login() {
  const { refresh } = useSession();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await authApi.post("/auth/login", { email, password });
      await refresh();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex h-full items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <div className="mb-7">
          <h1 className="text-lg font-semibold tracking-tight text-ink-50">
            KLAR Operations
          </h1>
          <p className="mt-1 text-[13px] text-ink-400">
            Integration Control Center. Staff access only.
          </p>
        </div>

        <form onSubmit={submit} className="space-y-3">
          <label className="block">
            <span className="mb-1.5 block text-[13px] font-medium text-ink-200">
              Email
            </span>
            <input
              type="email"
              required
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-ink-800 bg-ink-900 px-3 py-2 text-[14px] text-ink-50 outline-none focus:border-brand-500"
            />
          </label>

          <label className="block">
            <span className="mb-1.5 block text-[13px] font-medium text-ink-200">
              Password
            </span>
            <input
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-ink-800 bg-ink-900 px-3 py-2 text-[14px] text-ink-50 outline-none focus:border-brand-500"
            />
          </label>

          {error && <ErrorNotice message={error} />}

          <Button
            type="submit"
            variant="primary"
            disabled={busy}
            className="w-full py-2"
          >
            {busy ? "Signing in…" : "Sign in"}
          </Button>
        </form>
      </div>
    </div>
  );
}
