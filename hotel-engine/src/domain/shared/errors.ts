/**
 * Domain errors signal a broken invariant — a bug in our own code or in a
 * boundary parser that let bad data through. They are never used for expected
 * business outcomes (sold out, price changed, supplier down); those are
 * modelled as values.
 */
export class DomainError extends Error {
  readonly code: string;
  readonly details: Readonly<Record<string, unknown>>;

  constructor(code: string, message: string, details: Record<string, unknown> = {}) {
    super(message);
    this.name = 'DomainError';
    this.code = code;
    this.details = Object.freeze({ ...details });
  }
}

export function invariant(
  condition: unknown,
  code: string,
  message: string,
  details: Record<string, unknown> = {},
): asserts condition {
  if (!condition) throw new DomainError(code, message, details);
}
