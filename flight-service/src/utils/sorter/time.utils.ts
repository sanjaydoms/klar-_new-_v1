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
