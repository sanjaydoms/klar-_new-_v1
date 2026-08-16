/**
 * One definition of "HH:MM" → minutes since midnight.
 *
 * There were five identical copies of this across the filters and sorters, each
 * doing `time.split(':').map(Number)` with nothing checking the result. On a
 * missing or malformed value that yields `NaN`, and `NaN` compares false against
 * everything — so in the filters a flight with a bad time was silently dropped
 * from the results rather than reported, and no log said why.
 *
 * Returning `null` instead of `NaN` makes the unreadable case a value the caller
 * has to decide about, which is the whole point: "keep it" and "drop it" are
 * different answers in different places, and neither should happen by accident.
 */

/** Minutes since midnight, or null when `time` is not a readable "HH:MM". */
export function timeToMinutes(time: string): number | null {
    if (typeof time !== 'string') return null;

    const match = /^([0-1]?[0-9]|2[0-3]):([0-5][0-9])$/.exec(time.trim());
    if (match === null) return null;

    return (Number(match[1]) * 60) + Number(match[2]);
}

/**
 * Order two times of day. Returns 0 when they are equal *or* when neither can be
 * read, so callers keep their own tie-break (usually the date).
 *
 * **Never returns NaN**, which is the point. `Array.prototype.sort` requires a
 * consistent comparator, and NaN is not a valid answer to "which of these comes
 * first" — the damage is not confined to the offending record. One unreadable
 * time made every comparison involving it indeterminate, so the sort could leave
 * the *whole* list in an arbitrary order while looking like it had worked.
 *
 * An unreadable time sorts after a readable one. Callers that invert the result
 * for a descending sort will therefore surface those records first; that is
 * accepted here rather than threading sort direction through every comparator,
 * because a record with no usable time is a normalizer defect to be fixed at the
 * source, not ordered around.
 */
export function compareTimes(timeA: string, timeB: string): number {
    const a = timeToMinutes(timeA);
    const b = timeToMinutes(timeB);

    if (a === null || b === null) {
        if (a === b) return 0;
        return a === null ? 1 : -1;
    }

    return a - b;
}
