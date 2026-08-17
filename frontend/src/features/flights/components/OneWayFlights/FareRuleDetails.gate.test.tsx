import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

vi.mock('@/api/flightService.api', () => ({ getReviewDetails: vi.fn() }));

import { getReviewDetails } from '@/api/flightService.api';
import { GlobalToasts, clearAllToasts } from '@/utils/notify';
import FareRulesPage from './FareRuleDetails';

/**
 * The review gate used to report every failure via alert(); failures now go
 * through the global notifier and render as role="alert" toasts.
 */

const fareRuleData = { fareRule: { 'DEL-BOM': { tfr: {} } }, status: 'ok' };

function renderGate() {
  return render(
    <MemoryRouter
      initialEntries={[{ pathname: '/fare-rules', state: { fareRuleData, fareId: 'F1' } }]}
    >
      <GlobalToasts />
      <Routes>
        <Route path="/fare-rules" element={<FareRulesPage />} />
        <Route path="/booking/traveller-info" element={<div>traveller info</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.mocked(getReviewDetails).mockReset();
  sessionStorage.clear();
  act(() => clearAllToasts());
});

describe('review gate errors surface as toasts, never via alert()', () => {
  it('shows the API failure message with its error code', async () => {
    vi.mocked(getReviewDetails).mockResolvedValue({
      success: false,
      message: 'Fare no longer available',
      errorCode: 'TJ-409',
    });
    renderGate();

    fireEvent.click(screen.getByText('Confirm & Proceed to Booking'));

    const toast = await screen.findByRole('alert');
    expect(toast.textContent).toContain('Fare no longer available');
    expect(toast.textContent).toContain('TJ-409');
  });

  it('shows a toast when the response is missing booking data', async () => {
    vi.mocked(getReviewDetails).mockResolvedValue({ data: { mappedData: {} } });
    renderGate();

    fireEvent.click(screen.getByText('Confirm & Proceed to Booking'));

    const toast = await screen.findByRole('alert');
    expect(toast.textContent).toContain('Booking ID not received');
  });

  it('still navigates on success, with no error toast', async () => {
    vi.mocked(getReviewDetails).mockResolvedValue({
      data: { sessionId: 'S1', mappedData: { bookingId: 'B1' } },
    });
    renderGate();

    fireEvent.click(screen.getByText('Confirm & Proceed to Booking'));

    await screen.findByText('traveller info');
    expect(sessionStorage.getItem('bookingId')).toBe('B1');
    expect(screen.queryByRole('alert')).toBeNull();
  });
});
