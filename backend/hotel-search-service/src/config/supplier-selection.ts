/**
 * Which suppliers a search actually calls.
 *
 * Four rules decide this, and each one inverts into a serious bug if it is
 * wrong: a kill switch that fans out instead of stopping, a control plane that
 * switches on a supplier an env var had silenced, a circuit breaker that
 * blacks out search instead of speeding it up. They lived inline in the search
 * orchestrator, where none of them could be tested. They live here so they can
 * be.
 *
 * Pure: no registry, no network, no clock. The caller supplies the candidates
 * and a predicate for the circuit state.
 */

export interface SelectionInput {
  /**
   * Supplier codes the registry considers eligible, after HOTEL_PROVIDER_MODE
   * and direct-search targeting.
   */
  eligible: string[];
  /**
   * What the administrator routed for this operation.
   *
   * `null` means unconfigured — no opinion, so local behaviour stands. An
   * EMPTY ARRAY means an administrator deliberately left nothing routable, and
   * is the opposite instruction. Conflating them is how a kill switch turns
   * into a fan-out.
   */
  routed: string[] | null;
  /** The caller's own `providers` filter, which can only narrow further. */
  requested: string[] | undefined;
  /** False when a supplier's circuit is open. */
  canAttempt: (code: string) => boolean;
}

export interface Selection {
  /** The codes to call, in the order the router preferred. */
  codes: string[];
  /** Serve nothing: an administrator has left this operation with no provider. */
  serveNothing: boolean;
  /** Eligible and routed, but skipped because a circuit is open. */
  shortCircuited: string[];
  /** True when every candidate was short-circuited and they were called anyway. */
  ignoredCircuits: boolean;
}

export const selectSuppliers = (input: SelectionInput): Selection => {
  const { eligible, routed, requested, canAttempt } = input;

  // An administrator left nothing routable. This is checked BEFORE any
  // intersection, because every downstream step treats an empty list as
  // "no filter" and would quietly widen it back to everyone.
  if (routed && routed.length === 0) {
    return { codes: [], serveNothing: true, shortCircuited: [], ignoredCircuits: false };
  }

  /**
   * Routing narrows what is already eligible; it never adds to it.
   *
   * Deploying the control center must not be able to send live traffic to a
   * supplier HOTEL_PROVIDER_MODE had switched off — that surprise arrives as
   * requests to a supplier somebody deliberately silenced.
   *
   * The ORDER comes from routing when routing has an opinion, so a
   * priority-one provider is called first; otherwise registration order stands.
   */
  let candidates = routed
    ? routed.filter((code) => eligible.includes(code))
    : [...eligible];

  if (requested && requested.length > 0) {
    candidates = candidates.filter((code) => requested.includes(code));
  }

  const admissible = candidates.filter(canAttempt);
  const shortCircuited = candidates.filter((code) => !canAttempt(code));

  /**
   * Every candidate is short-circuited.
   *
   * Call them anyway. The breaker exists to stop a search WAITING on a
   * supplier that will not answer while another one can — it is a latency
   * optimisation over a fan-out that already tolerates failure. With nothing
   * left to protect, honouring it would turn "slow" into "no hotels", which is
   * strictly worse for the customer.
   */
  if (candidates.length > 0 && admissible.length === 0) {
    return {
      codes: candidates,
      serveNothing: false,
      shortCircuited,
      ignoredCircuits: true,
    };
  }

  return {
    codes: admissible,
    // An empty result HERE means no supplier was eligible in the first place —
    // an unknown destination, a mode that excludes everyone — which is not the
    // administrator saying stop. The orchestrator returns an empty page either
    // way; the flag exists so logs can tell the two apart.
    serveNothing: false,
    shortCircuited,
    ignoredCircuits: false,
  };
};
