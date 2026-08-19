import { Request, Response } from "express";

import { Environment, isEnvironment } from "../constants/status";
import * as connectionTest from "../services/connection-test.service";
import * as credentials from "../services/credential.service";
import { ProviderError } from "../services/provider.service";

/** Express 5 types a route param as string | string[]; these are always single. */
const param = (v: string | string[] | undefined): string =>
  Array.isArray(v) ? (v[0] ?? "") : (v ?? "");

const fail = (res: Response, err: unknown, context: string) => {
  if (err instanceof ProviderError) {
    return res
      .status(err.status)
      .json({ success: false, message: err.message, code: err.code });
  }
  // Deliberately opaque. A credential-path error can carry a key in its
  // message; only the server log gets the detail.
  console.error(`[credentials] ${context}:`, (err as any)?.message ?? err);
  return res.status(500).json({ success: false, message: "Something went wrong." });
};

/**
 * Resolve and validate the environment.
 *
 * Rejects anything that is not exactly "production" or "test" rather than
 * defaulting, because a typo that silently fell back to production would write
 * test keys over live ones (§14, §50).
 */
const environmentOf = (req: Request, res: Response): Environment | null => {
  const raw = param(req.params.environment);
  if (!isEnvironment(raw)) {
    res.status(400).json({
      success: false,
      message: 'environment must be "production" or "test".',
    });
    return null;
  }
  return raw;
};

export const view = async (req: Request, res: Response) => {
  try {
    const environment = environmentOf(req, res);
    if (!environment) return;
    res.json({
      success: true,
      data: await credentials.view(param(req.params.slug), environment),
    });
  } catch (err) {
    fail(res, err, "view");
  }
};

export const save = async (req: Request, res: Response) => {
  try {
    const environment = environmentOf(req, res);
    if (!environment) return;
    const data = await credentials.save(req, param(req.params.slug), environment, {
      values: req.body?.values ?? {},
      reason: req.body?.reason ?? "",
      rotation: Boolean(req.body?.rotation),
    });
    res.json({ success: true, data });
  } catch (err) {
    fail(res, err, "save");
  }
};

export const remove = async (req: Request, res: Response) => {
  try {
    const environment = environmentOf(req, res);
    if (!environment) return;
    await credentials.remove(
      req,
      param(req.params.slug),
      environment,
      req.body?.reason ?? "",
    );
    res.json({ success: true });
  } catch (err) {
    fail(res, err, "remove");
  }
};

export const test = async (req: Request, res: Response) => {
  try {
    const environment = environmentOf(req, res);
    if (!environment) return;
    const result = await connectionTest.test(param(req.params.slug), environment);
    // 200 even when the test failed: the REQUEST succeeded, and the result is
    // the answer. A non-2xx here would make "the supplier is down" and "the
    // admin API is broken" indistinguishable to the UI.
    res.json({ success: true, data: result });
  } catch (err) {
    fail(res, err, "test");
  }
};

/**
 * Decrypted credentials for another KLAR service.
 *
 * Behind the internal shared secret, mounted on the internal router — never
 * reachable from the admin surface a browser talks to.
 */
export const forService = async (req: Request, res: Response) => {
  try {
    const environment = environmentOf(req, res);
    if (!environment) return;
    const values = await credentials.forService(param(req.params.slug), environment);
    res.json({ success: true, data: values });
  } catch (err) {
    fail(res, err, "forService");
  }
};
