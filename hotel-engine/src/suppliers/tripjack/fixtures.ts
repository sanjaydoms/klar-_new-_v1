/**
 * Recorded-shape TripJack payloads.
 *
 * Field names, nesting and the quirks are taken from the live integration: the
 * all-in `totalPrice` with `basePrice`/`taxes`/`mf`/`mft` beneath it, images as
 * a `links` map on static-detail but bare strings on listing, and options that
 * carry no `cancellation` block at all on the listing call.
 */

export const TJ_LISTING_RESPONSE = {
  hotels: [
    {
      tjHotelId: '100000001234',
      name: 'Taj Exotica Resort & Spa',
      address: 'Calwaddo, Benaulim',
      city: 'Goa',
      country: 'IN',
      rating: 5,
      latitude: 15.2596,
      longitude: 73.9188,
      accTypeDesc: 'Resort',
      // A full URL and a bare filename in one field — both shapes occur.
      images: ['https://cdn.tripjack.example/hotels/taj-1.jpg', 'taj-2.jpg'],
      amenities: ['Swimming Pool', 'Spa', 'Restaurant'],
      options: [
        {
          id: 'opt-refundable-1',
          optionType: 'CRSN',
          mealBasis: 'Bed and Breakfast',
          pricing: {
            basePrice: 10_000,
            totalPrice: 12_000,
            taxes: 1_500,
            mf: 400,
            mft: 100,
            currency: 'INR',
          },
          roomInfo: [{ id: 'rm-deluxe', name: 'Deluxe Room', bed_config: '1 King Bed' }],
          cancellation: {
            isRefundable: true,
            penalties: [{ fromDate: '2026-09-05T00:00:00Z', amount: 12_000 }],
          },
          onHoldAllowed: true,
          compliance: { panRequired: true, passportRequired: false, gstType: 'B2C' },
        },
        {
          // Listing does not return a cancellation block, so refundability is
          // genuinely unknown here. It must not be reported as non-refundable.
          id: 'opt-unknown-cxl-1',
          mealBasis: 'Room Only',
          pricing: { basePrice: 9_000, totalPrice: 9_800, taxes: 800, currency: 'INR' },
          roomInfo: [{ id: 'rm-standard', name: 'Standard Room' }],
        },
      ],
    },
    {
      tjHotelId: '100000005678',
      name: 'No Amenities Hotel',
      address: 'Colva Beach Road',
      city: 'Goa',
      country: 'IN',
      rating: 3,
      latitude: 15.2793,
      longitude: 73.9226,
      // No `amenities` at all. The adapter must report none rather than
      // inventing a plausible list from the star rating (D-18).
      options: [
        {
          id: 'opt-bare-1',
          mealBasis: 'Room Only',
          pricing: { totalPrice: 5_000, taxes: 500, currency: 'INR' },
          roomInfo: [{ name: 'Standard Room' }],
          cancellation: { isRefundable: false, penalties: [] },
        },
      ],
    },
    {
      // Sold out on these dates: TripJack returns the property with no options.
      tjHotelId: '100000009999',
      name: 'Sold Out Inn',
      city: 'Goa',
      country: 'IN',
      rating: 3,
      latitude: 15.3,
      longitude: 73.93,
      options: [],
    },
  ],
};

export const TJ_PRICING_RESPONSE = {
  reviewHash: 'rh-abc123',
  hotelName: 'Taj Exotica Resort & Spa',
  options: [
    {
      id: 'opt-refundable-1',
      mealBasis: 'Bed and Breakfast',
      pricing: {
        basePrice: 10_000,
        totalPrice: 12_000,
        taxes: 1_500,
        mf: 400,
        mft: 100,
        currency: 'INR',
      },
      roomInfo: [{ id: 'rm-deluxe', name: 'Deluxe Room' }],
      cancellation: {
        isRefundable: true,
        penalties: [{ fromDate: '2026-09-05T00:00:00Z', amount: 12_000 }],
      },
    },
  ],
};

export const TJ_STATIC_DETAIL_RESPONSE = {
  name: 'Taj Exotica Resort & Spa',
  star_rating: '5',
  descriptions: { default: 'A beachfront resort in South Goa.' },
  locale: {
    address: { fulladdr: 'Calwaddo, Benaulim, Salcette, Goa 403716', city: 'Goa' },
    coordinates: { lat: 15.2596, long: 73.9188 },
  },
  // Static-detail nests image URLs under a per-rendition links map.
  images: [
    { links: { '1000px': { href: 'https://cdn.tripjack.example/static/taj-hero.jpg' } } },
    { links: { default: { href: 'https://cdn.tripjack.example/static/taj-pool.jpg' } } },
  ],
  // Amenities arrive keyed by id, not as an array.
  amenities: {
    '1': { name: 'Swimming Pool' },
    '2': { name: 'Spa' },
  },
  hotelInfo: { checkInTime: '14:00', checkOutTime: '11:00' },
  policies: ['Government photo ID required at check-in.'],
};

export const TJ_REVIEW_RESPONSE = {
  bookingId: 'TJ-BOOK-556677',
  status: { success: true },
  options: [
    {
      id: 'opt-refundable-1',
      mealBasis: 'Bed and Breakfast',
      pricing: { basePrice: 10_000, totalPrice: 12_000, taxes: 1_500, mf: 400, mft: 100, currency: 'INR' },
      roomInfo: [{ name: 'Deluxe Room' }],
      cancellation: {
        isRefundable: true,
        penalties: [{ fromDate: '2026-09-05T00:00:00Z', amount: 12_000 }],
      },
    },
  ],
};

export const TJ_BOOK_RESPONSE = {
  status: { success: true },
  order: { status: 'SUCCESS' },
  hotelConfirmationNumber: 'HTL-99881',
};

export const TJ_BOOKING_DETAILS_PENDING = {
  status: { success: true },
  order: { status: 'PAYMENT_SUCCESS' },
};

export const TJ_CANCEL_RESPONSE = {
  status: { success: true },
  cancellationId: 'TJ-CXL-4411',
};

/** TripJack reports its own failures inside a 200. */
export const TJ_INTERNAL_FAILURE = {
  status: { success: false, description: 'Session expired' },
  errors: [{ message: 'Rate no longer available' }],
};
