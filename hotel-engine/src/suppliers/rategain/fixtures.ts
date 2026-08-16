/**
 * RateGain payloads taken from the Smart Distribution API Specification v1.5.3
 * (23 Jan 2026) — §3 GetBestProperty, §4 GetAllProducts, §6 PreCheckReservation,
 * §7 CommitReservation, §8 CancelReservation.
 *
 * Shapes, casing and value formats follow the spec's own samples: prices as
 * strings, `categoryCode` as "5S", taxes repeated across currencies, and fees
 * carried separately with their own included/excluded flag.
 */

/**
 * §3. Note what is NOT here: no rate key, no room list. A `bestproperties`
 * hotel carries a single indicative `price` and nothing bookable.
 */
export const RG_BEST_PROPERTIES_RESPONSE = {
  body: [
    {
      propertyId: 'ChIJCYQhdhVDXz4R5lEANKNzFlA',
      propertyName: 'Sunset Beach Resort',
      description: 'A luxury beachfront resort offering panoramic ocean views.',
      images: [
        'https://images.rategain.example/sunset-resort-front.jpg',
        'sunset-resort-pool.jpg',
      ],
      propertyCode: 'HTL001',
      countryCode: 'IN',
      countryName: 'India',
      destinationCode: 'GOA',
      destinationName: 'Goa',
      longitude: 73.9189,
      latitude: 15.2597,
      // A string, not a number — reading it numerically loses every star rating.
      categoryCode: '5S',
      categoryName: '5 Star',
      chainCode: 'CH001',
      chainName: 'Global Resorts',
      accomodationType: 'Resort',
      address: '123 Beach Road, Benaulim, Goa',
      city: 'Goa',
      postalCode: '403716',
      brandCode: 'SEI6SEI6SEI=',
      hotelSegments: [
        { code: 'SEG1', name: 'Luxury' },
        { code: 'SEG2', name: 'Beachfront' },
      ],
      hotelBoard: [
        { code: 'RO', name: 'Room Only' },
        { code: 'BB', name: 'Bed & Breakfast' },
      ],
      hotelFacility: [
        {
          facilityGroupName: 'Wellness',
          facilityInfo: [
            { facilityName: 'Spa', facilityDescription: 'Full-service spa' },
            { facilityName: 'Fitness Center', facilityDescription: '24/7 gym' },
          ],
        },
      ],
      hotelAmenities: ['Free WiFi', 'Swimming Pool', 'Private Beach Access'],
      currency: 'INR',
      phone: '+91-832-000-0000',
      price: 11500.0,
    },
    {
      propertyId: 'QMY285',
      propertyName: 'No Amenities Hotel',
      images: [],
      propertyCode: 'HTL002',
      countryCode: 'IN',
      destinationCode: 'GOA',
      longitude: 73.9226,
      latitude: 15.2793,
      categoryCode: '3S',
      address: 'Colva Beach Road, Goa',
      city: 'Goa',
      brandCode: 'UN',
      // No hotelAmenities and no hotelFacility. The adapter must report none
      // rather than synthesising a plausible list from the star rating.
      currency: 'INR',
      price: 5200.0,
    },
  ],
  status: true,
  description: '',
  // Matches the two properties above, so a single supplier page covers the
  // result set. Multi-page fetching is exercised separately.
  totalRecord: 2,
  statusCode: 200,
};

/**
 * A destination with more inventory than one KLAR page can consume: 120
 * records at ten per page outlasts the four supplier pages a KLAR page pulls,
 * so `hasMore` stays true.
 */
export const RG_BEST_PROPERTIES_PAGED = {
  ...RG_BEST_PROPERTIES_RESPONSE,
  totalRecord: 120,
};

/**
 * §4. Rates live at `body.products[].rate[]`. The room name and code are on the
 * PRODUCT, not on the rate.
 */
export const RG_GET_PRODUCTS_RESPONSE = {
  status: true,
  description: '',
  statusCode: 200,
  body: {
    products: [
      {
        roomCode: '483146225',
        name: 'DELUXE ROOM',
        nativeCurrency: 'INR',
        images: ['https://images.rategain.example/room_front.jpg'],
        rate: [
          {
            rateKey: 'rk-deluxe-refundable',
            RateCode: 'R12345',
            rateType: 'BOOKABLE',
            rateName: 'rate123',
            isMandatory: true,
            // Prices are strings.
            totalPrice: '11500.00',
            // The MSP — a floor we must sell at or above, NOT a cost.
            sellingRate: '12650.00',
            CommissionAmt: '1150.00',
            CommissionPct: '10.00',
            allotment: 5,
            rateComments: 'Rate Notes: Compulsory tourism levy payable at hotel.',
            paymentType: 'AT_WEB',
            packaging: false,
            boardCode: 'BB',
            boardName: 'BED AND BREAKFAST',
            cancellationPolicies: [
              { amount: '0.00', from: '2026-08-13 09:08:12', toDate: '2026-09-04 23:59:59' },
              { amount: '11500.00', from: '2026-09-05 00:00:00', toDate: null },
            ],
            taxes: {
              allIncluded: false,
              taxes: [
                // Already inside totalPrice.
                { included: true, amount: '900.00', currency: 'INR', clientAmount: '900.00', clientCurrency: 'INR' },
                // Charged ON TOP of totalPrice.
                { included: false, amount: '250.00', currency: 'INR', clientAmount: '250.00', clientCurrency: 'INR' },
                // The same tax restated in another currency — must not be counted twice.
                { included: false, amount: '3.00', currency: 'USD', clientAmount: '3.00', clientCurrency: 'USD' },
              ],
            },
            Fees: [
              { Name: 'Cleaning Fee', Description: 'One-time', Included: false, Amount: '500.00', Currency: 'INR' },
              { Name: 'Resort Fee', Description: 'Daily', Included: false, Amount: '200.00', Currency: 'INR' },
            ],
            rooms: 1,
            adults: 2,
            children: 0,
            offers: [{ name: 'CONTRACTED EBO 10%', type: 'Percentage', value: '10', remark: null }],
            allocationDetails: '1755061692000003B1000B1',
            status: 'Available',
          },
          {
            rateKey: 'rk-deluxe-nonref',
            RateCode: 'NRF',
            rateType: 'BOOKABLE',
            totalPrice: '10200.00',
            allotment: 2,
            rateComments: 'NON-REFUNDABLE RATE. No amendments permitted.',
            paymentType: 'AT_WEB',
            packaging: false,
            boardCode: 'RO',
            boardName: 'ROOM ONLY',
            cancellationPolicies: [{ amount: '10200.00', from: '2026-08-13 00:00:00' }],
            rooms: 1,
            adults: 2,
            children: 0,
            status: 'Available',
          },
        ],
      },
      {
        roomCode: '483146999',
        name: 'STANDARD ROOM',
        nativeCurrency: 'INR',
        rate: [
          {
            // No cancellation signal at all — refundability is genuinely unknown.
            rateKey: 'rk-standard-unknown-cxl',
            rateType: 'RECHECK',
            totalPrice: '9000.00',
            boardCode: 'RO',
            boardName: 'ROOM ONLY',
            status: 'Available',
          },
        ],
      },
    ],
    propertyId: 'ChIJCYQhdhVDXz4R5lEANKNzFlA',
    propertyName: 'Sunset Beach Resort',
    propertyCode: 'HTL001',
    brandCode: 'SEI6SEI6SEI=',
    countryCode: 'IN',
    categoryCode: '5S',
    categoryName: '5 Star Hotel',
    address: '123 Beach Road, Benaulim, Goa',
    city: 'Goa',
    latitude: 15.2597,
    longitude: 73.9189,
    hotelAmenities: ['Free WiFi', 'Swimming Pool'],
    images: ['https://images.rategain.example/hotel_front.jpg'],
  },
};

/** §6. The confirmed rate sits at `body.preCheckResponse.rooms[].rates[]`. */
export const RG_PRECHECK_RESPONSE = {
  body: {
    preCheckResponse: {
      checkin: '2026-09-10',
      checkout: '2026-09-13',
      propertyCode: 'HTL001',
      hotelName: 'Sunset Beach Resort',
      categoryCode: '5S',
      rooms: [
        {
          RoomCode: 'DBL.ST',
          name: 'DELUXE ROOM',
          status: null,
          paxes: null,
          rates: [
            {
              rateKey: 'rk-deluxe-refundable',
              RateCode: 'NOR',
              rateType: 'BOOKABLE',
              totalPrice: '11500.00',
              isMandatory: true,
              sellingRate: '12650.00',
              CommissionAmt: '1150.00',
              CommissionPct: '10.00',
              allotment: 10,
              paymentType: 'AT_WEB',
              packaging: false,
              boardCode: 'BB',
              boardName: 'BED AND BREAKFAST',
              cancellationPolicies: [
                { amount: '0.00', from: '2026-08-13T00:00:00+05:30' },
                { amount: '11500.00', from: '2026-09-05T00:00:00+05:30' },
              ],
              taxes: {
                allIncluded: false,
                taxes: [
                  { included: true, amount: '900.00', currency: 'INR', clientAmount: '900.00', clientCurrency: 'INR' },
                ],
              },
              rooms: 1,
              adults: 2,
              children: 0,
              allocationDetails: '1755061692000463B1003B1',
              status: 'Available',
            },
          ],
        },
      ],
      currency: 'INR',
      totalNet: '11500.00',
      sellingRate: '12650.00',
      CommissionAmt: '1150.00',
      CommissionPct: '10.00',
      paymentDataRequired: false,
      modificationPolicies: { cancellation: true, modification: true },
    },
    booking: null,
  },
  status: true,
  description: null,
  statusCode: 200,
};

/** §7. The booking is at `body.booking`, and `confirmationNumber` is lower-camel. */
export const RG_COMMIT_RESPONSE = {
  body: {
    preCheakResponse: null,
    booking: {
      confirmationNumber: 'O1HJB58#MTUMJLV',
      echotoken: 'Ech011113',
      creationDate: '2026-08-13',
      status: 'Confirmed',
      modificationPolicies: { cancellation: true, modification: false },
      holder: { name: 'ASHA', surname: 'RAO', email: null, phone: null },
      hotel: {
        checkIn: '2026-09-10',
        checkout: '2026-09-13',
        code: 6855,
        brandCode: 'SEI6SEI6SEI=',
        hotelName: 'Sunset Beach Resort',
        rooms: [{ RoomCode: 'DBL.ST', name: 'DELUXE ROOM', status: 'CONFIRMED' }],
      },
      totalNet: 11500.0,
      sellingRate: 12650.0,
      CommissionAmt: '1150.0',
      CommissionPct: '10.00',
      currency: 'INR',
      reservationId: '02afb037-6f3b-4ce3-aebd-c2cc3d3dba14',
    },
  },
  status: true,
  description: null,
  statusCode: 200,
};

/** §8. The cancellation number is at `body.cancellationNumber`. */
export const RG_CANCEL_RESPONSE = {
  body: {
    cancellationNumber: 'KZ2VZSPYXUO6ZV',
    confirmationNumber: 'O1HJB58#MTUMJLV',
    status: 'CANCELLED',
    hotelName: 'Sunset Beach Resort',
    roomType: 'DELUXE ROOM',
    totalAmount: '11500.00',
    currency: 'INR',
    numberOfRooms: 1,
    numberOfAdults: 2,
    numberOfChildren: 0,
  },
  status: true,
  description: null,
  statusCode: 200,
};

/** RateGain reports business failures with `status: false` and a coded message. */
export const RG_FAILURE_RESPONSE = {
  status: false,
  description: 'Message:Rate not available ; ErrorCode:1999',
  statusCode: 200,
  body: null,
};

export const RG_DESTINATIONS_RESPONSE = {
  body: [
    { destCode: 'T16FPL', destName: 'Dehradun India', countryCode: 'IN', countryName: 'India' },
    { destCode: 'GOA', destName: 'Goa India', countryCode: 'IN', countryName: 'India' },
  ],
};
