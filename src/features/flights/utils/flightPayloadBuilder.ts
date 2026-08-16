// utils/flightPayloadBuilder.ts
import { parseLocation } from './utils';

export const buildFlightSearchPayload = (
  searchParams: any,
  cursor?: string | null,
  itemsPerPage?: number,
  sortBy?: string,
  sortOrder?: 'asc' | 'desc',
) => {
  const travelerDetails = searchParams.travelerDetails || {
    adults: 1,
    children: 0,
    infants: 0,
  };

  const basePayload = {
    cabinClass: searchParams.class?.toUpperCase() || 'ECONOMY',
    paxInfo: {
      ADULT: travelerDetails.adults,
      CHILD: travelerDetails.children,
      INFANT: travelerDetails.infants,
    },
    routeInfos: [
      {
        fromCityOrAirport: { code: parseLocation(searchParams.from).code },
        toCityOrAirport: { code: parseLocation(searchParams.to).code },
        travelDate: searchParams.departureDate,
      },
    ],
    searchModifiers: {
      isDirectFlight: true,
      isConnectingFlight: true,
      pft: '',
    },
  };

  // If pagination params provided, add them
  if (cursor !== undefined && itemsPerPage !== undefined && sortBy && sortOrder) {
    const getSortByField = (sort: string): string => {
      switch (sort) {
        case 'cheapest':
          return 'price';
        case 'quickest':
          return 'duration';
        case 'earliest':
          return 'departureTime';
        default:
          return 'price';
      }
    };

    return {
      ...basePayload,
      limit: itemsPerPage,
      sortBy: getSortByField(sortBy),
      sortOrder: sortOrder,
      ...(cursor && { cursor }),
    };
  }

  return basePayload;
};
