import { AsyncLocalStorage } from "node:async_hooks";
import { randomUUID } from "node:crypto";
import { NextFunction, Request, Response } from "express";

/**
 * What operation the current request is, and what ties its supplier calls
 * together.
 *
 * WHY A CONTEXT RATHER THAN AN ARGUMENT
 * -------------------------------------
 * This service reaches TripJack from more than a dozen services, every one of
 * them calling the global axios directly with a full URL. There is no client
 * to instrument and no signature to thread an operation through that would not
 * mean touching all of them — and being silently wrong the first time somebody
 * added another.
 *
 * The route mount already knows which operation it is. It sets it once; the
 * observer below reads it. AsyncLocalStorage follows the promise chain in
 * between, and is stdlib.
 */

interface Context {
  operation: string;
  correlationId: string;
}

const storage = new AsyncLocalStorage<Context>();

export const newCorrelationId = (): string =>
  `KLAR-REQ-${randomUUID().replace(/-/g, "").slice(0, 12).toUpperCase()}`;

export const newRequestId = (providerCode: string): string =>
  `${providerCode}-${randomUUID().replace(/-/g, "").slice(0, 10).toUpperCase()}`;

export const currentContext = (): Context | null => storage.getStore() ?? null;

export const runWith = <T>(context: Context, fn: () => T): T =>
  storage.run(context, fn);

/**
 * Label every supplier call made while handling this route.
 *
 * Reuses an inbound `x-correlation-id` when one is present, so a search and the
 * booking that follows it can be traced as one customer journey once the
 * frontend passes it along. Absent, a fresh id is minted — the calls are still
 * correlated to each other, just not to what came before.
 */
export const observing =
  (operation: string) =>
  (req: Request, _res: Response, next: NextFunction): void => {
    const inbound = req.headers["x-correlation-id"];
    const correlationId =
      typeof inbound === "string" && inbound.length <= 64
        ? inbound
        : newCorrelationId();
    storage.enterWith({ operation, correlationId });
    next();
  };
