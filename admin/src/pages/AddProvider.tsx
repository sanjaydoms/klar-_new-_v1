import { ArrowLeft, Plus, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import { Field, TextInput } from "@/components/Fields";
import { PageHeader } from "@/components/PageHeader";
import { Button, Card, ErrorNotice, SectionHeader } from "@/components/Primitives";
import { api, errorMessage } from "@/lib/api";
import { humanise } from "@/lib/format";
import type { CredentialField } from "@/lib/types";

/**
 * Registering a supplier (§52).
 *
 * WHY THREE STEPS AND NOT EIGHT
 * -----------------------------
 * §52 describes eight: information, services, capabilities, environment,
 * credentials, test connection, routing, activate. The last five already have
 * screens — and better ones than a wizard could hold, because they have to
 * work for the other ninety-nine percent of a provider's life too.
 *
 * So this collects the three things that only exist at creation — who the
 * provider is, what it can do, and what credentials it needs — and then hands
 * over to those screens with a checklist. Rebuilding credentials, Test
 * Connection and routing inside a modal would mean two implementations of each
 * and a wizard that goes stale the first time one of them changes.
 *
 * The provider is created DISABLED with both environments off, whatever is
 * entered here. It goes live from its own page, deliberately, after somebody
 * has proved the credentials work.
 */

interface ServiceDraft {
  service: string;
  operations: string[];
}

const slugify = (name: string) =>
  name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

export function AddProvider() {
  const navigate = useNavigate();
  const [catalogue, setCatalogue] = useState<{ service: string; operations: string[] }[]>([]);
  const [step, setStep] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [code, setCode] = useState("");
  const [description, setDescription] = useState("");
  const [services, setServices] = useState<ServiceDraft[]>([]);
  const [fields, setFields] = useState<CredentialField[]>([
    { key: "BASE_URL", label: "Base URL", type: "url", required: true },
    { key: "API_KEY", label: "API Key", type: "secret", required: true },
  ]);

  useEffect(() => {
    api
      .get("/catalogue")
      .then((res) => setCatalogue(res.data.data))
      .catch((err) => setError(errorMessage(err)));
  }, []);

  const toggleService = (service: string) => {
    setServices((current) =>
      current.some((s) => s.service === service)
        ? current.filter((s) => s.service !== service)
        : [...current, { service, operations: [] }],
    );
  };

  const toggleOperation = (service: string, operation: string) => {
    setServices((current) =>
      current.map((s) =>
        s.service !== service
          ? s
          : {
              ...s,
              operations: s.operations.includes(operation)
                ? s.operations.filter((o) => o !== operation)
                : [...s.operations, operation],
            },
      ),
    );
  };

  const create = async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await api.post("/providers", {
        slug,
        code: code.toUpperCase(),
        name,
        description: description || undefined,
        types: services.map((s) => s.service),
        services: services.map((s) => ({
          service: s.service,
          operations: s.operations,
        })),
        credentialSchema: fields.filter((f) => f.key && f.label),
      });
      navigate(`/providers/${res.data.data.slug}?created=1`);
    } catch (err) {
      setError(errorMessage(err));
      setBusy(false);
    }
  };

  const step1Ready = name.trim() && slug.trim() && code.trim();
  const step2Ready = services.length > 0 && services.every((s) => s.operations.length > 0);
  const step3Ready = fields.some((f) => f.key && f.label);

  return (
    <>
      <Link
        to="/providers"
        className="mb-3 inline-flex items-center gap-1.5 text-[13px] text-ink-400 hover:text-ink-200"
      >
        <ArrowLeft className="size-3.5" />
        Providers
      </Link>

      <PageHeader
        title="Add a provider"
        description="Registered inactive. It goes live from its own page once its credentials are proved."
      />

      <div className="mb-5 flex gap-2">
        {["Identity", "Capabilities", "Credentials"].map((label, i) => (
          <div
            key={label}
            className={`flex-1 rounded-lg border px-4 py-2.5 text-[13px] ${
              step === i + 1
                ? "border-brand-500/40 bg-brand-500/10 text-brand-400"
                : step > i + 1
                  ? "border-ink-800 bg-ink-900 text-ink-400"
                  : "border-ink-800 bg-ink-950 text-ink-600"
            }`}
          >
            <span className="font-medium">
              {i + 1}. {label}
            </span>
          </div>
        ))}
      </div>

      {error && (
        <div className="mb-5">
          <ErrorNotice message={error} />
        </div>
      )}

      {step === 1 && (
        <Card>
          <SectionHeader
            title="Identity"
            description="The slug is referenced by routing, credentials, logs and health. It cannot be changed later."
          />
          <div className="grid gap-4 px-5 py-4 lg:grid-cols-2">
            <Field label="Name">
              <TextInput
                value={name}
                autoFocus
                onChange={(e) => {
                  setName(e.target.value);
                  if (!slugTouched) setSlug(slugify(e.target.value));
                }}
                placeholder="Acme Travel"
              />
            </Field>
            <Field label="Slug" hint="Lowercase, stable, permanent.">
              <TextInput
                value={slug}
                onChange={(e) => {
                  setSlugTouched(true);
                  setSlug(slugify(e.target.value));
                }}
                placeholder="acme"
              />
            </Field>
            <Field
              label="Adapter code"
              hint="Must match the `code` on the supplier adapter in the calling service — TJ, RG."
            >
              <TextInput
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="AC"
                maxLength={6}
              />
            </Field>
            <Field label="Description (optional)">
              <TextInput
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Hotel-only aggregator"
              />
            </Field>
          </div>
          <div className="flex justify-end border-t border-ink-800 px-5 py-3">
            <Button variant="primary" disabled={!step1Ready} onClick={() => setStep(2)}>
              Continue
            </Button>
          </div>
        </Card>
      )}

      {step === 2 && (
        <Card>
          <SectionHeader
            title="Capabilities"
            description="Tick only what the adapter actually implements. Everything else is recorded unsupported, and the router will never select it."
          />
          <div className="space-y-4 px-5 py-4">
            {catalogue.map(({ service, operations }) => {
              const draft = services.find((s) => s.service === service);
              return (
                <div
                  key={service}
                  className={`rounded-lg border px-4 py-3 ${
                    draft ? "border-ink-600 bg-ink-950" : "border-ink-800"
                  }`}
                >
                  <label className="flex items-center gap-2.5">
                    <input
                      type="checkbox"
                      checked={Boolean(draft)}
                      onChange={() => toggleService(service)}
                    />
                    <span className="text-[13px] font-medium text-ink-50">
                      {humanise(service)}
                    </span>
                  </label>

                  {draft && (
                    <div className="mt-3 flex flex-wrap gap-2 border-t border-ink-800 pt-3">
                      {operations.map((operation) => (
                        <label
                          key={operation}
                          className={`flex cursor-pointer items-center gap-1.5 rounded-lg px-2.5 py-1 text-[12px] ${
                            draft.operations.includes(operation)
                              ? "bg-brand-500/15 text-brand-400"
                              : "bg-ink-900 text-ink-400"
                          }`}
                        >
                          <input
                            type="checkbox"
                            className="sr-only"
                            checked={draft.operations.includes(operation)}
                            onChange={() => toggleOperation(service, operation)}
                          />
                          {humanise(operation)}
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          <div className="flex justify-between border-t border-ink-800 px-5 py-3">
            <Button onClick={() => setStep(1)}>Back</Button>
            <Button variant="primary" disabled={!step2Ready} onClick={() => setStep(3)}>
              Continue
            </Button>
          </div>
        </Card>
      )}

      {step === 3 && (
        <Card>
          <SectionHeader
            title="Credential fields"
            description="What this supplier needs. The credentials screen renders itself from this, so no frontend change is needed however unusual the fields are."
          />
          <div className="space-y-2 px-5 py-4">
            <div className="grid grid-cols-[1fr_1fr_140px_90px_40px] gap-2 text-[12px] text-ink-400">
              <span>Key</span>
              <span>Label</span>
              <span>Type</span>
              <span>Required</span>
              <span />
            </div>
            {fields.map((field, i) => (
              <div
                key={i}
                className="grid grid-cols-[1fr_1fr_140px_90px_40px] items-center gap-2"
              >
                <TextInput
                  value={field.key}
                  placeholder="API_KEY"
                  onChange={(e) => {
                    const next = [...fields];
                    next[i] = { ...field, key: e.target.value.toUpperCase() };
                    setFields(next);
                  }}
                />
                <TextInput
                  value={field.label}
                  placeholder="API Key"
                  onChange={(e) => {
                    const next = [...fields];
                    next[i] = { ...field, label: e.target.value };
                    setFields(next);
                  }}
                />
                <select
                  value={field.type}
                  onChange={(e) => {
                    const next = [...fields];
                    next[i] = { ...field, type: e.target.value as CredentialField["type"] };
                    setFields(next);
                  }}
                  className="rounded-lg border border-ink-800 bg-ink-950 px-3 py-2 text-[13px] text-ink-50 outline-none focus:border-brand-500"
                >
                  <option value="secret">Secret</option>
                  <option value="text">Text</option>
                  <option value="url">URL</option>
                </select>
                <label className="flex items-center gap-2 text-[12px] text-ink-400">
                  <input
                    type="checkbox"
                    checked={field.required}
                    onChange={(e) => {
                      const next = [...fields];
                      next[i] = { ...field, required: e.target.checked };
                      setFields(next);
                    }}
                  />
                  Required
                </label>
                <button
                  onClick={() => setFields(fields.filter((_, j) => j !== i))}
                  aria-label={`Remove ${field.key || "field"}`}
                  className="rounded p-1.5 text-ink-400 hover:bg-ink-850 hover:text-critical-500"
                >
                  <Trash2 className="size-3.5" />
                </button>
              </div>
            ))}
            <Button
              onClick={() =>
                setFields([...fields, { key: "", label: "", type: "secret", required: false }])
              }
            >
              <Plus className="size-3.5" />
              Add field
            </Button>
            <p className="pt-1 text-[12px] text-ink-600">
              Secrets are encrypted at rest and only ever shown masked. Text and
              URL fields are configuration and are shown in full — masking a base
              URL would only stop somebody checking they typed the right host.
            </p>
          </div>
          <div className="flex justify-between border-t border-ink-800 px-5 py-3">
            <Button onClick={() => setStep(2)}>Back</Button>
            <Button variant="primary" disabled={!step3Ready || busy} onClick={() => void create()}>
              {busy ? "Registering…" : "Register provider"}
            </Button>
          </div>
        </Card>
      )}
    </>
  );
}
