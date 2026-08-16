/**
 * Post-booking ancillaries (SSR).
 *
 * The Fetch SSR response nests options per SEGMENT per PASSENGER — the doc
 * describes `sI[].bI.ssrInfo`, but live UAT puts them on `sI[].bI.tI[].ssrInfo`
 * and leaves the segment-level object empty. When a fare doesn't permit
 * post-booking changes the option array still comes back, carrying only
 * `{ message: "SSR modification is not allowed" }` and no `code`, so a purchasable
 * option is one that HAS a code.
 */

export type SsrCategory = "BAGGAGE" | "MEAL" | "SEAT";

export interface SsrOption {
    code: string;
    amount: number;
    description?: string;
}

export interface PaxAncillaries {
    paxId: string | number;
    name: string;
    paxType: string;
    /** Infants cannot hold SSR (doc), so they are reported but never selectable. */
    selectable: boolean;
    options: Record<SsrCategory, SsrOption[]>;
    alreadySelected: { baggage: any[]; meals: any[] };
}

export interface SegmentAncillaries {
    segmentId: string;
    tripIndex: number;
    /** False when every option came back blocked; `message` says why. */
    available: boolean;
    message?: string;
    passengers: PaxAncillaries[];
}

const toOptions = (items: any[]): SsrOption[] =>
    (items || [])
        // No code = not purchasable (blocked, or informational).
        .filter((i) => i?.code)
        .map((i) => ({
            code: i.code,
            amount: Number(i.amount ?? 0),
            description: i.desc ?? i.description,
        }));

/** Flatten a Fetch SSR response into something a UI can render directly. */
export function normalizeSsrCatalogue(response: any): SegmentAncillaries[] {
    const out: SegmentAncillaries[] = [];

    (response?.tripInfos || []).forEach((trip: any, tripIndex: number) => {
        (trip?.sI || []).forEach((segment: any) => {
            const passengers: PaxAncillaries[] = [];
            let blockedMessage: string | undefined;

            for (const pax of segment?.bI?.tI || []) {
                const raw = pax?.ssrInfo || {};

                for (const items of Object.values(raw) as any[][]) {
                    const msg = (items || []).find((i: any) => !i?.code && i?.message);
                    if (msg && !blockedMessage) blockedMessage = msg.message;
                }

                passengers.push({
                    paxId: pax?.id,
                    name: `${pax?.fN ?? ""} ${pax?.lN ?? ""}`.trim(),
                    paxType: pax?.pt,
                    selectable: pax?.pt !== "INFANT",
                    options: {
                        BAGGAGE: toOptions(raw.BAGGAGE),
                        MEAL: toOptions(raw.MEAL),
                        SEAT: toOptions(raw.SEAT),
                    },
                    alreadySelected: {
                        baggage: pax?.ssrBaggageInfos || [],
                        meals: pax?.ssrMealInfos || [],
                    },
                });
            }

            const available = passengers.some((p) =>
                Object.values(p.options).some((list) => list.length > 0)
            );

            out.push({
                segmentId: String(segment?.id),
                tripIndex,
                available,
                ...(available ? {} : { message: blockedMessage || "No ancillaries available" }),
                passengers,
            });
        });
    });

    return out;
}

/** Seat map, keyed by segment id. Empty when the fare has no seat selection. */
export function normalizeSeatMap(response: any) {
    const out: Record<string, any> = {};

    // Doc describes `tripSeatMap`; live UAT returns the seats under tripInfos[].sI[].
    const fromMap = response?.tripSeatMap || {};
    for (const [segmentId, seat] of Object.entries<any>(fromMap)) {
        out[segmentId] = {
            rows: seat?.sData?.row,
            columns: seat?.sData?.column,
            note: seat?.nt,
            seats: (seat?.sInfo || []).map(mapSeat),
        };
    }

    (response?.tripInfos || []).forEach((trip: any) => {
        (trip?.sI || []).forEach((segment: any) => {
            const id = String(segment?.id);
            if (out[id]) return;
            out[id] = {
                rows: segment?.sData?.row,
                columns: segment?.sData?.column,
                note: segment?.nt,
                seats: (segment?.sInfo || []).map(mapSeat),
            };
        });
    });

    return out;
}

const mapSeat = (s: any) => ({
    seatNo: s?.seatNo,
    code: s?.code,
    amount: Number(s?.amount ?? 0),
    isBooked: s?.isBooked === true,
    isAisle: s?.isAisle === true,
    isLegRoom: s?.isLegRoom === true,
    isExitRow: s?.isExitRow === true,
    row: s?.seatPosition?.row,
    column: s?.seatPosition?.column,
});

export interface SsrSelection {
    segmentId: string;
    paxId: string | number;
    baggageCode?: string;
    mealCode?: string;
    seatCode?: string;
}

/**
 * Build the Add SSR request from flat selections.
 *
 * TripJack wants sI[] -> bI.tI[] -> { sbi, smi, ssi }, which is easy to get
 * subtly wrong by hand. `amount` is passed per selection by the caller of this
 * function (resolved server-side from the fetched catalogue, never from the
 * client) so the total can never disagree with what is being bought.
 *
 * Baggage on a connecting journey is charged once: the doc requires SBI on every
 * segment of the journey with `amount: 0` on all but the first.
 */
export function buildAddSsrPayload(
    selections: SsrSelection[],
    priceOf: (sel: SsrSelection, category: SsrCategory) => number,
    totalAmount: number
) {
    const bySegment = new Map<string, SsrSelection[]>();
    for (const sel of selections) {
        const list = bySegment.get(sel.segmentId) || [];
        list.push(sel);
        bySegment.set(sel.segmentId, list);
    }

    // First segment that charges for a given pax's baggage; later ones ride free.
    const baggageCharged = new Set<string>();

    const sI = [...bySegment.entries()].map(([segmentId, sels]) => ({
        id: segmentId,
        bI: {
            tI: sels.map((sel) => {
                const entry: any = { id: sel.paxId };

                if (sel.baggageCode) {
                    const key = `${sel.paxId}:${sel.baggageCode}`;
                    const first = !baggageCharged.has(key);
                    baggageCharged.add(key);
                    entry.sbi = {
                        code: sel.baggageCode,
                        amount: first ? priceOf(sel, "BAGGAGE") : 0,
                    };
                }

                if (sel.mealCode) {
                    entry.smi = { code: sel.mealCode, amount: priceOf(sel, "MEAL") };
                }

                if (sel.seatCode) {
                    entry.ssi = { code: sel.seatCode, amount: priceOf(sel, "SEAT") };
                }

                return entry;
            }),
        },
    }));

    return { paymentInfos: [{ amount: totalAmount }], sI };
}
