/**
 * Circuit breaker (§46).
 *
 * WHY THIS RUNS IN THIS PROCESS
 * -----------------------------
 * A breaker exists to avoid a call. One that has to ask a remote service for
 * permission has already made the network round trip it was supposed to save,
 * and stops working precisely when the platform is unhealthy. So the STATE is
 * local and the CONFIGURATION is remote: the admin owns the numbers, this
 * process owns the decision.
 *
 * WHAT IT IS FOR HERE
 * -------------------
 * KLAR's hotel search fans out to every supplier in parallel and merges. A
 * failing supplier does not break the search — the other one still answers —
 * but it does make every search wait out its timeout. Opening the circuit
 * removes that wait. The win is latency, not availability, and that is worth
 * being precise about: this does not make search more likely to succeed, it
 * makes it stop paying for a supplier that is not going to answer.
 *
 * CONSECUTIVE FAILURES, NOT A RATE
 * --------------------------------
 * A breaker has to react in seconds. An error rate over a window is still
 * averaging in old successes while every current request is failing. Five in a
 * row is not bad luck.
 */

export type BreakerState = "CLOSED" | "OPEN" | "HALF_OPEN";

interface Circuit {
  state: BreakerState;
  consecutiveFailures: number;
  consecutiveProbeSuccesses: number;
  since: Date;
  openedUntil: number;
  lastReason?: string;
}

export interface BreakerConfig {
  enabled: boolean;
  failureThreshold: number;
  cooldownSeconds: number;
  probeSuccesses: number;
}

/**
 * Until the first routing snapshot arrives this is what the breaker uses.
 *
 * Disabled by default on purpose: a process that has never spoken to the admin
 * plane should behave exactly as it did before the breaker existed, rather
 * than start withholding traffic from suppliers using numbers nobody chose.
 */
let config: BreakerConfig = {
  enabled: false,
  failureThreshold: 5,
  cooldownSeconds: 60,
  probeSuccesses: 2,
};

const circuits = new Map<string, Circuit>();

const key = (providerCode: string, service: string, operation: string) =>
  `${providerCode}:${service}:${operation}`;

const circuitFor = (k: string): Circuit => {
  let circuit = circuits.get(k);
  if (!circuit) {
    circuit = {
      state: "CLOSED",
      consecutiveFailures: 0,
      consecutiveProbeSuccesses: 0,
      since: new Date(),
      openedUntil: 0,
    };
    circuits.set(k, circuit);
  }
  return circuit;
};

export const configure = (next: Partial<BreakerConfig>): void => {
  config = { ...config, ...next };
};

export const currentConfig = (): BreakerConfig => config;

/**
 * May this supplier be called right now?
 *
 * Also performs the OPEN -> HALF_OPEN transition, because the cooldown expiring
 * is only observable at the moment somebody asks. A separate timer would fire
 * for circuits nobody is using any more.
 */
export const canAttempt = (
  providerCode: string,
  service: string,
  operation: string,
): boolean => {
  if (!config.enabled) return true;

  const circuit = circuitFor(key(providerCode, service, operation));

  if (circuit.state === "OPEN") {
    if (Date.now() < circuit.openedUntil) return false;
    // Cooldown elapsed: let a probe through and see.
    circuit.state = "HALF_OPEN";
    circuit.since = new Date();
    circuit.consecutiveProbeSuccesses = 0;
    console.warn(
      `[breaker] ${key(providerCode, service, operation)} half-open — probing`,
    );
    return true;
  }

  return true;
};

export const recordSuccess = (
  providerCode: string,
  service: string,
  operation: string,
): void => {
  const k = key(providerCode, service, operation);
  const circuit = circuitFor(k);
  circuit.consecutiveFailures = 0;

  if (circuit.state === "HALF_OPEN") {
    circuit.consecutiveProbeSuccesses++;
    // Several probes, not one. A single success during an outage is common —
    // closing on it puts the full load straight back onto a supplier that is
    // still struggling, which is how a breaker turns into an oscillator.
    if (circuit.consecutiveProbeSuccesses >= config.probeSuccesses) {
      circuit.state = "CLOSED";
      circuit.since = new Date();
      circuit.lastReason = undefined;
      console.log(`[breaker] ${k} closed — supplier recovered`);
    }
  }
};

export const recordFailure = (
  providerCode: string,
  service: string,
  operation: string,
  reason: string,
): void => {
  const k = key(providerCode, service, operation);
  const circuit = circuitFor(k);
  circuit.consecutiveFailures++;
  circuit.consecutiveProbeSuccesses = 0;
  circuit.lastReason = reason;

  const shouldOpen =
    circuit.state === "HALF_OPEN" ||
    circuit.consecutiveFailures >= config.failureThreshold;

  if (config.enabled && shouldOpen && circuit.state !== "OPEN") {
    circuit.state = "OPEN";
    circuit.since = new Date();
    circuit.openedUntil = Date.now() + config.cooldownSeconds * 1_000;
    console.warn(
      `[breaker] ${k} OPEN for ${config.cooldownSeconds}s after ${circuit.consecutiveFailures} failures: ${reason}`,
    );
  } else if (circuit.state === "OPEN") {
    // A failure while open means the probe failed. Restart the cooldown so the
    // next probe is not sent immediately.
    circuit.openedUntil = Date.now() + config.cooldownSeconds * 1_000;
  }
};

export interface BreakerSnapshot {
  providerSlug: string;
  service: string;
  operation: string;
  state: BreakerState;
  since: Date;
  consecutiveFailures: number;
  lastReason?: string;
}

/**
 * Every circuit's state, for reporting.
 *
 * CLOSED circuits are included so the admin plane can clear a stale OPEN it
 * was told about earlier — silence would leave the dashboard claiming a
 * supplier is out of rotation long after it came back.
 */
export const snapshot = (
  slugForCode: (code: string) => string,
): BreakerSnapshot[] =>
  [...circuits.entries()].map(([k, circuit]) => {
    const [code, service, operation] = k.split(":");
    return {
      providerSlug: slugForCode(code),
      service,
      operation,
      state: circuit.state,
      since: circuit.since,
      consecutiveFailures: circuit.consecutiveFailures,
      lastReason: circuit.lastReason,
    };
  });

/** Test seam. */
export const __resetBreakersForTests = (): void => {
  circuits.clear();
  config = {
    enabled: false,
    failureThreshold: 5,
    cooldownSeconds: 60,
    probeSuccesses: 2,
  };
};
