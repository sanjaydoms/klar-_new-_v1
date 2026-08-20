import { NextFunction, Request, Response } from "express";

/**
 * The last line of defence for anything a route did not catch (§40).
 *
 * NEVER returns a stack trace, and never echoes the error's message — not even
 * in development. In this service an uncaught error can have come from the
 * credential path, where the message can carry a key, or from axios, whose
 * errors carry the request headers. The detail goes to the server log; the
 * caller gets a sentence.
 */
export const notFound = (req: Request, res: Response): void => {
  res.status(404).json({
    success: false,
    message: `No such endpoint: ${req.method} ${req.path}`,
  });
};

export const errorHandler = (
  err: any,
  _req: Request,
  res: Response,
  next: NextFunction,
): void => {
  if (res.headersSent) {
    // Express cannot help once the response has started; handing it back lets
    // the default handler close the connection rather than corrupt the body.
    next(err);
    return;
  }

  // A malformed JSON body is the caller's mistake, not ours, and saying so is
  // more useful than a generic 500.
  if (err?.type === "entity.parse.failed" || err instanceof SyntaxError) {
    res.status(400).json({ success: false, message: "Malformed JSON body." });
    return;
  }

  if (err?.type === "entity.too.large") {
    res.status(413).json({ success: false, message: "Request body too large." });
    return;
  }

  console.error("[unhandled]", err?.stack ?? err);
  res.status(500).json({ success: false, message: "Something went wrong." });
};
