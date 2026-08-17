export const formatFlightSearchPayload = (params: any) => {
  const toNumber = (value: any): number => {
    if (typeof value === 'number') return value;
    if (typeof value === 'string') return parseInt(value) || 0;
    return 0;
  };

  const searchQuery = params.searchQuery || params;

  const paxInfo = {
    ADULT: toNumber(searchQuery.paxInfo?.ADULT ?? 1),
    CHILD: toNumber(searchQuery.paxInfo?.CHILD ?? 0),
    INFANT: toNumber(searchQuery.paxInfo?.INFANT ?? 0),
  };

  const routeInfos = Array.isArray(searchQuery.routeInfos)
    ? searchQuery.routeInfos.map((r: any) => ({
        fromCityOrAirport: { code: r.fromCityOrAirport?.code },
        toCityOrAirport: { code: r.toCityOrAirport?.code },
        travelDate: r.travelDate,
      }))
    : [];

  const formattedPayload: any = {
    searchQuery: {
      cabinClass: searchQuery.cabinClass?.toUpperCase() || '',
      paxInfo,
      routeInfos,
    },
  };
  return formattedPayload;
};
