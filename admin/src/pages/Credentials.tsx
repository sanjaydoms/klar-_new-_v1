import { CheckCircle2, Plug, Trash2, XCircle } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";

import { ConfirmDialog } from "@/components/ConfirmDialog";
import { Field, TextInput } from "@/components/Fields";
import { PageHeader } from "@/components/PageHeader";
import { Button, Card, ErrorNotice, SectionHeader } from "@/components/Primitives";
import { api, errorMessage } from "@/lib/api";
import { absoluteTime, duration, relativeTime } from "@/lib/format";
import type { Environment, Provider } from "@/lib/types";

interface MaskedField {
  key: string;
  label: string;
  type: "text" | "secret" | "url";
  required: boolean;
  configured: boolean;
  value: string;
  helpText?: string;
}

interface CredentialView {
  providerSlug: string;
  environment: Environment;
  configured: boolean;
  fields: MaskedField[];
  updatedAt?: string;
  updatedBy?: string;
  lastRotatedAt?: string | null;
  lastTestedAt?: string | null;
  lastTestOk?: boolean | null;
}

interface TestResult {
  ok: boolean;
  category: string;
  message: string;
  httpStatus?: number;
  durationMs: number;
  environment: Environment;
  baseUrl?: string;
  testedAt: string;
}

/**
 * Credentials (§14, §15, §16).
 *
 * The form is populated with MASKED values. Editing a field replaces it;
 * leaving it alone sends the mask straight back, which the backend recognises
 * as "unchanged". That is why the input shows bullets rather than being empty:
 * an empty field would read as "no key configured" when one very much is.
 */
export function Credentials() {
  const [params, setParams] = useSearchParams();
  const [providers, setProviders] = useState<Provider[]>([]);
  const [error, setError] = useState<string | null>(null);

  const slug = params.get("provider") ?? "";
  const environment = (params.get("environment") as Environment) || "test";

  useEffect(() => {
    api
      .get("/providers")
      .then((res) => {
        setProviders(res.data.data);
        if (!params.get("provider") && res.data.data[0]) {
          setParams({ provider: res.data.data[0].slug, environment }, { replace: true });
        }
      })
      .catch((err) => setError(errorMessage(err)));
    // Runs once: the provider list does not change while this page is open.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const provider = providers.find((p) => p.slug === slug);

  return (
    <>
      <PageHeader
        title="Credentials"
        description="Stored encrypted, shown masked, and testable against the real supplier."
      />

      {error && (
        <div className="mb-5">
          <ErrorNotice message={error} />
        </div>
      )}

      <div className="mb-5 flex flex-wrap items-center gap-2">
        {providers.map((p) => (
          <button
            key={p.slug}
            onClick={() => setParams({ provider: p.slug, environment })}
            className={`rounded-lg px-3 py-1.5 text-[13px] font-medium transition-colors ${
              p.slug === slug
                ? "bg-brand-500/15 text-brand-400 ring-1 ring-brand-500/30 ring-inset"
                : "bg-ink-850 text-ink-400 hover:text-ink-200"
            }`}
          >
            {p.name}
          </button>
        ))}
      </div>

      {provider && (
        <div className="mb-5 flex gap-2">
          {(["test", "production"] as Environment[]).map((env) => (
            <button
              key={env}
              onClick={() => setParams({ provider: slug, environment: env })}
              className={`rounded-lg px-4 py-2 text-[13px] font-semibold transition-colors ${
                env === environment
                  ? env === "production"
                    ? "bg-warn-500/15 text-warn-500 ring-1 ring-warn-500/40 ring-inset"
                    : "bg-ink-800 text-ink-50 ring-1 ring-ink-600 ring-inset"
                  : "bg-ink-900 text-ink-400 hover:text-ink-200"
              }`}
            >
              {env === "production" ? "PRODUCTION" : "Test"}
              {provider.activeEnvironment === env && (
                <span className="ml-2 text-[11px] font-normal opacity-70">live</span>
              )}
            </button>
          ))}
        </div>
      )}

      {provider && (
        <CredentialForm
          key={`${slug}/${environment}`}
          provider={provider}
          environment={environment}
        />
      )}
    </>
  );
}

function CredentialForm({
  provider,
  environment,
}: {
  provider: Provider;
  environment: Environment;
}) {
  const [view, setView] = useState<CredentialView | null>(null);
  const [values, setValues] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [result, setResult] = useState<TestResult | null>(null);
  const [dialog, setDialog] = useState<null | "save" | "rotate" | "delete">(null);
  const [dialogError, setDialogError] = useState<string | null>(null);

  const path = `/providers/${provider.slug}/credentials/${environment}`;

  const load = useCallback(async () => {
    try {
      const res = await api.get(path);
      const data: CredentialView = res.data.data;
      setView(data);
      setValues(Object.fromEntries(data.fields.map((f) => [f.key, f.value])));
      setError(null);
    } catch (err) {
      setError(errorMessage(err));
    }
  }, [path]);

  useEffect(() => {
    void load();
    setResult(null);
  }, [load]);

  const save = async (reason: string, rotation: boolean) => {
    setBusy("save");
    setDialogError(null);
    try {
      await api.put(path, { values, reason, rotation });
      setDialog(null);
      // A credential change invalidates the last test result, so drop it
      // rather than leaving a green tick beside a key nobody has tried.
      setResult(null);
      await load();
    } catch (err) {
      setDialogError(errorMessage(err));
    } finally {
      setBusy(null);
    }
  };

  const remove = async (reason: string) => {
    setBusy("delete");
    setDialogError(null);
    try {
      await api.delete(path, { data: { reason } });
      setDialog(null);
      setResult(null);
      await load();
    } catch (err) {
      setDialogError(errorMessage(err));
    } finally {
      setBusy(null);
    }
  };

  const test = async () => {
    setBusy("test");
    setResult(null);
    try {
      const res = await api.post(`${path}/test`);
      setResult(res.data.data);
      await load();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(null);
    }
  };

  if (error && !view) return <ErrorNotice message={error} />;
  if (!view) return null;

  const isProduction = environment === "production";

  return (
    <>
      {isProduction && (
        <div className="mb-5 rounded-lg border border-warn-500/30 bg-warn-500/10 px-4 py-3 text-[13px] text-warn-500">
          These are <strong>PRODUCTION</strong> credentials. Testing them spends
          a real request against KLAR's live supplier account.
        </div>
      )}

      <Card>
        <SectionHeader
          title={`${provider.name} · ${isProduction ? "Production" : "Test"}`}
          description={
            view.configured
              ? `Last updated ${relativeTime(view.updatedAt)} by ${view.updatedBy ?? "unknown"}`
              : "Nothing configured for this environment yet."
          }
          action={
            <div className="flex items-center gap-2">
              <Button onClick={() => void test()} disabled={busy === "test"}>
                <Plug className="size-3.5" />
                {busy === "test" ? "Testing…" : "Test connection"}
              </Button>
              {view.configured && (
                <Button variant="danger" onClick={() => setDialog("delete")}>
                  <Trash2 className="size-3.5" />
                  Delete
                </Button>
              )}
            </div>
          }
        />

        {result && <TestResultBanner result={result} />}

        {!result && view.lastTestedAt && (
          <div className="border-b border-ink-800 px-5 py-2.5 text-[12px] text-ink-400">
            Last tested {relativeTime(view.lastTestedAt)} —{" "}
            {view.lastTestOk ? "succeeded" : "failed"}
          </div>
        )}

        <div className="grid gap-4 px-5 py-4 lg:grid-cols-2">
          {view.fields.map((field) => (
            <Field
              key={field.key}
              label={`${field.label}${field.required ? "" : " (optional)"}`}
              hint={
                field.helpText ??
                (field.type === "secret" && field.configured
                  ? "Stored encrypted. Leave as-is to keep the current value."
                  : undefined)
              }
            >
              <TextInput
                value={values[field.key] ?? ""}
                spellCheck={false}
                autoComplete="off"
                placeholder={field.type === "secret" ? "not set" : "https://…"}
                onChange={(e) =>
                  setValues({ ...values, [field.key]: e.target.value })
                }
              />
            </Field>
          ))}
        </div>

        {error && (
          <div className="px-5 pb-4">
            <ErrorNotice message={error} />
          </div>
        )}

        <div className="flex items-center justify-between border-t border-ink-800 px-5 py-3">
          <span className="text-[12px] text-ink-600">
            {view.lastRotatedAt
              ? `Last rotated ${absoluteTime(view.lastRotatedAt)}`
              : "Never rotated"}
          </span>
          <div className="flex gap-2">
            <Button onClick={() => setDialog("rotate")}>Save as rotation</Button>
            <Button variant="primary" onClick={() => setDialog("save")}>
              Save
            </Button>
          </div>
        </div>
      </Card>

      {(dialog === "save" || dialog === "rotate") && (
        <ConfirmDialog
          title={dialog === "rotate" ? "Rotate credentials?" : "Save credentials?"}
          description={
            isProduction
              ? "These are production credentials — wrong values take the provider off-sale."
              : "Fields left untouched keep their current value."
          }
          phrase={isProduction ? "UPDATE PRODUCTION" : undefined}
          confirmLabel={dialog === "rotate" ? "Rotate" : "Save"}
          variant={isProduction ? "danger" : "primary"}
          busy={busy === "save"}
          error={dialogError}
          onClose={() => setDialog(null)}
          onConfirm={(reason) => void save(reason, dialog === "rotate")}
        />
      )}

      {dialog === "delete" && (
        <ConfirmDialog
          title={`Delete ${environment} credentials?`}
          description="The environment is switched off, so routing stops choosing this provider for it."
          phrase={`DELETE ${provider.name.toUpperCase()}`}
          confirmLabel="Delete credentials"
          busy={busy === "delete"}
          error={dialogError}
          onClose={() => setDialog(null)}
          onConfirm={(reason) => void remove(reason)}
        />
      )}
    </>
  );
}

/**
 * The outcome of a real supplier call.
 *
 * Shows the category, not just pass or fail: "the supplier rejected these
 * credentials" and "we could not reach the supplier" send an admin to two
 * completely different places.
 */
function TestResultBanner({ result }: { result: TestResult }) {
  const tone = result.ok
    ? "border-ok-500/30 bg-ok-500/10 text-ok-500"
    : result.category === "NOT_CONFIGURED"
      ? "border-ink-800 bg-ink-950 text-ink-400"
      : "border-critical-500/30 bg-critical-500/10 text-critical-500";
  const Icon = result.ok ? CheckCircle2 : XCircle;

  return (
    <div className={`border-b px-5 py-3 ${tone}`}>
      <div className="flex items-center gap-2 text-[13px] font-semibold">
        <Icon className="size-4" />
        {result.message}
      </div>
      <div className="mt-1 flex flex-wrap gap-x-5 gap-y-1 text-[12px] opacity-90">
        <span>{result.category}</span>
        {result.httpStatus !== undefined && <span>HTTP {result.httpStatus}</span>}
        <span>{duration(result.durationMs)}</span>
        {result.baseUrl && <span>{result.baseUrl}</span>}
        <span>{absoluteTime(result.testedAt)}</span>
      </div>
    </div>
  );
}
