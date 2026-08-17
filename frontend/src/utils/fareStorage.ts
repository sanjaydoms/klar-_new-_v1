// utils/fareStorage.ts

export interface StoredFareData {
  fromLocation: { code: string; city: string };
  toLocation: { code: string; city: string };
  selectedFareId: string;
  fareType: string;
  totalFare: number;
  currency: string;
  flight?: any;
}

// Get all stored fare IDs
export const getStoredFareIds = (): string[] => {
  try {
    const stored = sessionStorage.getItem('selectedFareIds');
    if (stored) {
      return JSON.parse(stored);
    }

    // Fallback: get from selectedMultiCityFares
    const fares = sessionStorage.getItem('selectedMultiCityFares');
    if (fares) {
      const parsedFares = JSON.parse(fares);
      return parsedFares.map((fare: StoredFareData) => fare.selectedFareId);
    }
  } catch (error) {
    console.error('Error getting stored fare IDs:', error);
  }
  return [];
};

// Get all stored fare data
export const getStoredFares = (): StoredFareData[] => {
  try {
    const stored = sessionStorage.getItem('selectedMultiCityFares');
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error('Error getting stored fares:', error);
    return [];
  }
};

// Clear all stored fare data
export const clearStoredFares = (): void => {
  sessionStorage.removeItem('selectedMultiCityFares');
  sessionStorage.removeItem('selectedFareIds');
  sessionStorage.removeItem('priceAvailabilityResponse');
  sessionStorage.removeItem('multiCityBookingData');
};

// Add a fare selection
export const addFareSelection = (fareData: StoredFareData): void => {
  const existing = getStoredFares();

  // Remove existing selection for same route
  const filtered = existing.filter(
    (f) =>
      !(
        f.fromLocation?.code === fareData.fromLocation?.code &&
        f.toLocation?.code === fareData.toLocation?.code
      ),
  );

  filtered.push(fareData);
  sessionStorage.setItem('selectedMultiCityFares', JSON.stringify(filtered));

  // Update fare IDs
  const fareIds = filtered.map((f) => f.selectedFareId);
  sessionStorage.setItem('selectedFareIds', JSON.stringify(fareIds));
};
