import { describe, expect, it } from 'vitest';
import { countryCode } from '../../domain/shared/brand.js';
import type { HttpRequest, HttpResponse, HttpTransport } from '../common/http.js';
import { createNationalityResolver } from './nationality.js';

const IN = countryCode('IN');
const BR = countryCode('BR');

/** A transport whose answer can be changed between calls. */
function scripted(answers: readonly HttpResponse[]): HttpTransport & { calls: number } {
  const state = { calls: 0 };
  return {
    get calls() {
      return state.calls;
    },
    request: (_req: HttpRequest): Promise<HttpResponse> => {
      const answer = answers[Math.min(state.calls, answers.length - 1)] as HttpResponse;
      state.calls += 1;
      return Promise.resolve(answer);
    },
  };
}

const table = (entries: ReadonlyArray<{ isoCode: string; countryId: string }>): HttpResponse => ({
  status: 200,
  ok: true,
  body: { nationalityInfos: entries },
});

const DOWN: HttpResponse = { status: 503, ok: false, body: { message: 'unavailable' } };

describe('the TripJack nationality table', () => {
  it('resolves an ISO code to TripJack’s own country id', async () => {
    // TripJack does not take "IN". It takes "106", from its own table.
    const transport = scripted([table([{ isoCode: 'IN', countryId: '106' }])]);
    const resolve = createNationalityResolver({ transport });

    expect(await resolve(IN)).toBe('106');
  });

  it('fetches the table once and reuses it', async () => {
    const transport = scripted([table([{ isoCode: 'IN', countryId: '106' }])]);
    const resolve = createNationalityResolver({ transport });

    await resolve(IN);
    await resolve(IN);
    await resolve(IN);
    expect(transport.calls).toBe(1);
  });

  /**
   * The failure must not be memoised.
   *
   * A non-ok response returned an EMPTY table rather than throwing, and the
   * empty table was cached for the life of the process — so one 503 from
   * `/nationality-info` at boot pinned the supplier to the 14 recorded
   * countries for ever, and every traveller from anywhere else was refused.
   */
  it('retries after the table endpoint fails, rather than caching the failure', async () => {
    const transport = scripted([DOWN, table([{ isoCode: 'BR', countryId: '30' }])]);
    const resolve = createNationalityResolver({ transport });

    // Brazil is not in the recorded fallback, so the first attempt cannot answer.
    await expect(resolve(BR)).rejects.toThrow(/no country id/);

    // The second attempt fetches again and succeeds.
    expect(await resolve(BR)).toBe('30');
    expect(transport.calls).toBe(2);
  });

  it('falls back to the recorded table while the endpoint is down', async () => {
    const transport = scripted([DOWN]);
    const resolve = createNationalityResolver({ transport });

    // India is recorded, so a degraded lookup still serves the common case.
    expect(await resolve(IN)).toBe('106');
  });

  /**
   * The reference defaulted an unknown country to India's id, which prices a
   * Brazilian traveller as an Indian one and looks exactly like a working
   * search — A-5's failure mode.
   */
  it('refuses a country it cannot resolve rather than defaulting one', async () => {
    const transport = scripted([table([{ isoCode: 'IN', countryId: '106' }])]);
    const resolve = createNationalityResolver({ transport });

    await expect(resolve(BR)).rejects.toThrow(/BR/);
  });

  it('prefers the live table over the recorded one', async () => {
    // The recorded value for India is 106; if TripJack revises it, the live
    // table wins.
    const transport = scripted([table([{ isoCode: 'IN', countryId: '999' }])]);
    const resolve = createNationalityResolver({ transport });

    expect(await resolve(IN)).toBe('999');
  });
});
