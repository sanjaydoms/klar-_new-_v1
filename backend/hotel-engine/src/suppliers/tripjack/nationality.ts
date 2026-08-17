import type { CountryCode } from '../../domain/shared/brand.js';
import type { HttpTransport } from '../common/http.js';
import { asRecord, readArray, readString } from '../common/parse.js';
import type { NationalityResolver } from './request.js';

/**
 * ISO 3166-1 alpha-2 → TripJack's own country id.
 *
 * TripJack does not take `"IN"`. It takes `"106"`, from the table its
 * `/hms/v3/nationality-info` endpoint publishes, and the id reaches every
 * listing, pricing and booking call. The composition root was passing the ISO
 * code straight through — marked `TODO(phase-8)` on the assumption that only
 * booking cared — but nationality decides price and availability at SEARCH
 * time too, which is the A-5 defect: quoting for a traveller nobody described.
 *
 * The table is fetched once and cached for the life of the process. It is a
 * reference list that changes when TripJack revises its API, so a per-request
 * lookup would put a round trip in front of every search for nothing.
 *
 * **An unknown country is refused, not defaulted.** The reference fell back to
 * India's id for anything it could not resolve, which prices a Brazilian
 * traveller as an Indian one and looks exactly like a working search. The
 * adapter already has a path for a resolver that refuses: the supplier is
 * reported as unable to serve the request, which is true.
 */
export interface NationalityResolverDeps {
  readonly transport: HttpTransport;
  /** Injected so a lookup cannot outlive the request that needed it. */
  readonly timeoutMs?: number;
}

/**
 * Recorded from the reference implementation's working integration.
 *
 * Used only when TripJack's own table cannot be fetched — at which point a
 * search is degraded anyway — and deliberately partial: a code that is not here
 * and not in the live table is refused rather than guessed.
 */
const RECORDED: Readonly<Record<string, string>> = {
  IN: '106',
  US: '232',
  GB: '235',
  AE: '231',
  SG: '200',
  MY: '131',
  AU: '14',
  CA: '40',
  DE: '83',
  FR: '76',
  JP: '112',
  CN: '45',
  NZ: '157',
  ZA: '204',
};

export function createNationalityResolver(deps: NationalityResolverDeps): NationalityResolver {
  let table: Promise<Map<string, string>> | null = null;

  const fetchTable = async (): Promise<Map<string, string>> => {
    const controller = new AbortController();
    const response = await deps.transport.request(
      { method: 'GET', path: '/hms/v3/nationality-info' },
      { signal: controller.signal, timeoutMs: deps.timeoutMs ?? 10_000 },
    );

    // Thrown, not returned empty. A 503 or a 429 from the table endpoint is
    // exactly the transient failure the caller's `.catch` exists to un-memoise;
    // returning an empty map instead memoised the failure, and the process
    // stayed pinned to the 14 recorded countries for its whole life.
    if (!response.ok) {
      throw new Error(`nationality-info answered ${response.status}`);
    }

    const out = new Map<string, string>();

    const infos = [
      ...readArray(response.body, 'nationalityInfos'),
      ...readArray(response.body, 'nationalities'),
    ];
    for (const entry of infos) {
      const record = asRecord(entry);
      const iso = readString(record, 'isoCode', 'code');
      const id = readString(record, 'countryId', 'id');
      if (iso !== undefined && id !== undefined) out.set(iso.toUpperCase(), id);
    }
    return out;
  };

  return async (country: CountryCode): Promise<string> => {
    const code = String(country).toUpperCase();

    // A failed fetch is not memoised: one blip would otherwise pin the process
    // to the recorded table for its lifetime.
    table ??= fetchTable().catch(() => {
      table = null;
      return new Map<string, string>();
    });

    const resolved = (await table).get(code) ?? RECORDED[code];
    if (resolved === undefined) {
      throw new Error(`TripJack has no country id for "${code}"`);
    }
    return resolved;
  };
}
