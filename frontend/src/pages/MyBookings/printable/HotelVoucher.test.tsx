import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';

import { HotelVoucher } from './HotelVoucher';

/**
 * The voucher is a document a guest may hand to a front desk. It must never
 * assert something we did not verify.
 *
 * It used to read `booking.tripJackResponse.*` / `booking.rateGainRequest.*`.
 * Those blobs are persisted for audit but stripped by both endpoints
 * (bookings.service.ts:300-334, list.service.ts:49-75), so they never reach the
 * browser — every voucher, TripJack and RateGain alike, printed "Hotel Name",
 * "Address not available", "N/A", "N/A" and a fake breakdown of base == total
 * with zero tax.
 *
 * The fixtures below are the DETAILS DTO shape the component is actually handed
 * (MyBookingsPage.tsx:3616 -> getHotelBookingDetails -> response.data.body),
 * not the Mongo document and not a supplier payload.
 */

/** Fields both commit paths write, as they survive the details DTO. */
const dto = (over: Record<string, unknown> = {}) => ({
  klarBookingId: 'KLAR-HTL-00042',
  hotelName: 'The Leela Palace',
  hotelAddress: 'Diplomatic Enclave, Chanakyapuri',
  city: 'New Delhi',
  guestName: 'Arjun Mehta',
  guestEmail: 'arjun.mehta@example.com',
  guestMobile: '+91 98765 43210',
  checkIn: '2026-09-15',
  checkOut: '2026-09-17',
  createdAt: '2026-08-14T10:00:00.000Z',
  totalAmount: 24500,
  currencyCode: 'INR',
  rooms: [{ roomType: 'Deluxe King', boardType: 'Breakfast', guests: 2, price: 24500 }],
  ...over,
});

const text = () => document.body.textContent ?? '';

describe('HotelVoucher renders from the booking record', () => {
  it('shows real hotel and guest details for a TripJack booking', () => {
    render(<HotelVoucher booking={dto({ provider: 'TJ', propertyId: 'TJ:100000001234' })} />);

    expect(screen.getByText('The Leela Palace')).toBeTruthy();
    expect(text()).toContain('Diplomatic Enclave, Chanakyapuri, New Delhi');
    expect(screen.getByText('Arjun Mehta')).toBeTruthy();
    expect(text()).toContain('arjun.mehta@example.com');
    expect(text()).toContain('+91 98765 43210');
  });

  it('shows the same for a RateGain booking — the component is supplier-blind', () => {
    render(<HotelVoucher booking={dto({ provider: 'RG', propertyId: 'RG:ChIJabc123' })} />);

    expect(screen.getByText('The Leela Palace')).toBeTruthy();
    expect(text()).toContain('New Delhi');
    expect(text()).toContain('arjun.mehta@example.com');
  });

  it('never prints the old placeholders when the record has data', () => {
    render(<HotelVoucher booking={dto()} />);
    const body = text();

    expect(body).not.toContain('Hotel Name');
    expect(body).not.toContain('Address not available');
    expect(body).not.toContain('N/A');
  });
});

describe('HotelVoucher omits rather than fabricates', () => {
  it('drops the phone row when guestMobile is absent (e.g. an anonymous caller)', () => {
    render(<HotelVoucher booking={dto({ guestMobile: undefined })} />);

    expect(text()).not.toContain('Phone:');
    expect(text()).not.toContain('N/A');
    // The rest of the document still renders.
    expect(screen.getByText('The Leela Palace')).toBeTruthy();
  });

  it('drops the meal-plan column when boardType is empty', () => {
    // boardType is empty for BOTH suppliers today — commit.service.ts:909 reads
    // room.MealPlan while the transformer writes BoardName. Until that backend
    // bug is fixed the voucher must not claim "Room Only".
    render(<HotelVoucher booking={dto({ rooms: [{ roomType: 'Deluxe King', price: 24500 }] })} />);

    expect(text()).not.toContain('Meal Plan');
    expect(text()).not.toContain('Room Only');
  });

  it('drops the guest count rather than inventing 2 adults', () => {
    render(<HotelVoucher booking={dto({ rooms: [{ roomType: 'Deluxe King', price: 24500 }] })} />);
    expect(text()).not.toMatch(/Guests:/);
  });
});

describe('HotelVoucher pricing is one honest number', () => {
  it('shows the amount paid and no invented breakdown', () => {
    render(<HotelVoucher booking={dto()} />);
    const body = text();

    expect(body).toContain('INR 24,500.00');
    expect(body).toContain('Total Amount Paid');

    // Base fare and taxes are never persisted for either supplier, so the old
    // three-line breakdown always asserted base == total and zero tax.
    expect(body).not.toContain('Base Fare');
    expect(body).not.toContain('Taxes & Fees');
  });

  it('never renders NaN', () => {
    // netAmount is not on the DTO; the old code did Number(booking.netAmount)
    // and printed the literal string "NaN".
    render(<HotelVoucher booking={dto({ totalAmount: undefined })} />);
    expect(text()).not.toContain('NaN');
  });

  it('honours the currency on the record', () => {
    render(<HotelVoucher booking={dto({ currencyCode: 'AED', totalAmount: 1200 })} />);
    expect(text()).toContain('AED 1,200.00');
  });
});
