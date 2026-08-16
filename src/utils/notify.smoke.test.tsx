import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { GlobalToasts, notifyError, notifySuccess, clearAllToasts } from '@/utils/notify';

beforeEach(() => act(() => clearAllToasts()));

describe('global notifier', () => {
  it('renders toasts pushed from plain function calls', () => {
    render(<GlobalToasts />);
    act(() => { notifyError('Fare not available'); notifySuccess('Booking confirmed'); });
    expect(screen.getByText('Fare not available')).toBeTruthy();
    expect(screen.getByText('Booking confirmed')).toBeTruthy();
    expect(screen.getAllByRole('alert').length).toBe(2);
  });

  it('auto-dismisses after the timeout', () => {
    vi.useFakeTimers();
    try {
      render(<GlobalToasts />);
      act(() => notifyError('transient'));
      expect(screen.getByText('transient')).toBeTruthy();
      act(() => vi.advanceTimersByTime(6001));
      expect(screen.queryByText('transient')).toBeNull();
    } finally {
      vi.useRealTimers();
    }
  });
});
