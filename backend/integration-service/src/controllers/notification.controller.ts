import { Request, Response } from "express";

import { ALL_ALERT_EVENTS } from "../constants/alerts";
import { availableChannels } from "../services/channels";
import * as notifications from "../services/notification.service";
import { ProviderError } from "../services/provider.service";

const param = (v: string | string[] | undefined): string =>
  Array.isArray(v) ? (v[0] ?? "") : (v ?? "");

const fail = (res: Response, err: unknown, context: string) => {
  if (err instanceof ProviderError) {
    return res
      .status(err.status)
      .json({ success: false, message: err.message, code: err.code });
  }
  // Opaque: an error on this path can carry a webhook URL.
  console.error(`[alerts] ${context}:`, (err as any)?.message ?? err);
  return res.status(500).json({ success: false, message: "Something went wrong." });
};

/**
 * What the console builds its forms from.
 *
 * Served rather than duplicated in the frontend, so a channel added to the
 * registry appears in the UI with its own fields and no frontend release.
 */
export const options = async (_req: Request, res: Response) => {
  res.json({
    success: true,
    data: { channels: availableChannels(), events: ALL_ALERT_EVENTS },
  });
};

export const list = async (_req: Request, res: Response) => {
  try {
    res.json({ success: true, data: await notifications.list() });
  } catch (err) {
    fail(res, err, "list");
  }
};

export const create = async (req: Request, res: Response) => {
  try {
    res.status(201).json({ success: true, data: await notifications.create(req, req.body ?? {}) });
  } catch (err) {
    fail(res, err, "create");
  }
};

export const update = async (req: Request, res: Response) => {
  try {
    res.json({
      success: true,
      data: await notifications.update(req, param(req.params.id), req.body ?? {}),
    });
  } catch (err) {
    fail(res, err, "update");
  }
};

export const remove = async (req: Request, res: Response) => {
  try {
    await notifications.remove(req, param(req.params.id));
    res.json({ success: true });
  } catch (err) {
    fail(res, err, "remove");
  }
};

export const test = async (req: Request, res: Response) => {
  try {
    // 200 even when delivery failed: the REQUEST succeeded and the result is
    // the answer. A non-2xx would make "the webhook is broken" and "the admin
    // API is broken" indistinguishable.
    res.json({ success: true, data: await notifications.test(req, param(req.params.id)) });
  } catch (err) {
    fail(res, err, "test");
  }
};

export const deliveries = async (req: Request, res: Response) => {
  try {
    const limit = req.query.limit ? Number(req.query.limit) : undefined;
    res.json({ success: true, data: await notifications.deliveries(limit) });
  } catch (err) {
    fail(res, err, "deliveries");
  }
};
