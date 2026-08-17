import { useState, useEffect } from 'react';

export interface LocationData {
  city: string | null;
  error: string | null;
  loading: boolean;
}

export const useUserLocation = (): LocationData => {
  const [city, setCity] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser');
      setCity('Delhi'); // Fallback
      setLoading(false);
      return;
    }

    const success = async (position: GeolocationPosition) => {
      try {
        const { latitude, longitude } = position.coords;
        // Using OpenStreetMap Nominatim for free reverse geocoding
        const response = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=10&addressdetails=1`
        );
        const data = await response.json();
        
        // Try to get city, town, or village from the address
        const foundCity =
          data.address?.city ||
          data.address?.town ||
          data.address?.village ||
          data.address?.state_district ||
          'Delhi'; // Fallback if no specific city found

        setCity(foundCity);
      } catch (err) {
        console.error('Error fetching city name from coordinates', err);
        setCity('Delhi'); // Fallback on API error
        setError('Failed to fetch city name');
      } finally {
        setLoading(false);
      }
    };

    const handleError = (err: GeolocationPositionError) => {
      console.warn(`Geolocation error (${err.code}): ${err.message}`);
      setCity('Delhi'); // Fallback on permission denied/error
      setError(err.message);
      setLoading(false);
    };

    navigator.geolocation.getCurrentPosition(success, handleError, {
      timeout: 10000,
      maximumAge: 60000,
    });
  }, []);

  return { city, error, loading };
};
