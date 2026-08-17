import React, { useState, useEffect, useRef } from 'react';
import AsyncSelect from 'react-select/async';
import { MapPin, Loader2, LocateFixed } from 'lucide-react';
import { searchCabLocations, getCabLatLong } from '@/api/cabs.api';
import { notifyError } from '@/utils/notify';

interface CabLocationAutocompleteProps {
  value: string;
  onChange: (
    value: string,
    details?: { lat: number; long: number; city?: string; country?: string },
  ) => void;
  placeholder?: string;
  className?: string;
  contextCity?: string;
  showLocateMe?: boolean;
}

/**
 * CabLocationAutocomplete - Local Proxy version (Powered by TripJack)
 * Uses the local cabs-service as a proxy to avoid CORS/503 issues and billing.
 */
export default function CabLocationAutocomplete({
  value,
  onChange,
  placeholder = 'Search location...',
  className = '',
  showLocateMe = true,
}: CabLocationAutocompleteProps) {
  const [valueState, setValueState] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Bug 1.37 fix: guard on non-empty value to prevent re-sync loop on empty string reset
  useEffect(() => {
    if (value && (!valueState || valueState.label !== value)) {
      setValueState({ label: value, value: null });
    }
    if (!value) {
      setValueState(null);
    }
  }, [value]);

  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  /**
   * Fetches suggestions via the local cabs-service proxy with a small debounce
   */
  const loadOptions = (inputValue: string, callback: (options: any[]) => void) => {
    if (inputValue.length < 3) {
      callback([]);
      return;
    }

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    setIsLoading(true);

    timeoutRef.current = setTimeout(async () => {
      try {
        const response = await searchCabLocations(inputValue);

        if (!response.success || !response.data?.places) {
          callback([]);
          return;
        }

        const options = response.data.places.map((place: any) => ({
          label: place.displayLabel || place.name,
          value: place.value || place.id,
        }));
        callback(options);
      } catch (error) {
        console.error('[Autocomplete] Search error:', error);
        callback([]);
      } finally {
        setIsLoading(false);
      }
    }, 500);
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  /**
   * Handles selection and resolves lat/long via local backend
   */
  const handleSelect = async (selection: any) => {
    if (!selection) {
      setValueState(null);
      onChange('');
      return;
    }

    setValueState(selection);
    const placeId = selection.value;
    const description = selection.label;

    if (!placeId) {
      onChange(description);
      return;
    }

    setIsLoading(true);
    try {
      const response = await getCabLatLong(placeId);

      if (response.success && response.data) {
        const { location, address } = response.data;
        onChange(description, {
          lat: location.lat,
          long: location.lng || location.long,
          city: address?.city || '',
          country: address?.country || '',
        });
      } else {
        console.warn('[Autocomplete] Lat/Long resolution failed:', response);
        onChange(description);
      }
    } catch (error) {
      console.error('[Autocomplete] Selection error:', error);
      onChange(description);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLocateMe = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (!navigator.geolocation) {
      notifyError('Geolocation is not supported by your browser');
      return;
    }
    setIsLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        let placeName = 'Current Location';
        try {
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&accept-language=en`);
          const data = await res.json();
          if (data && data.address) {
            placeName = data.address.suburb || data.address.neighbourhood || data.address.city_district || data.name || data.address.city || 'Current Location';
          }
        } catch (error) {
          console.error('Reverse geocoding failed:', error);
        }
        
        setIsLoading(false);
        setValueState({ label: placeName, value: 'current_location' });
        onChange(placeName, {
          lat: latitude,
          long: longitude,
        });
      },
      (error) => {
        setIsLoading(false);
        console.error('Error getting location:', error);
        notifyError('Could not get your location. Please check your permissions.');
      }
    );
  };

  return (
    <div className={`relative w-full ${className}`}>
      <div className="absolute left-0 top-1/2 -translate-y-1/2 z-10 pl-1 pointer-events-none">
        {isLoading ? (
          <Loader2 className="w-4 h-4 text-orange-500 animate-spin" />
        ) : (
          <MapPin className="w-4 h-4 text-gray-400" />
        )}
      </div>
      {showLocateMe && (
        <button
          type="button"
          onClick={handleLocateMe}
          className="absolute right-2 top-1/2 -translate-y-1/2 z-10 flex items-center justify-center p-1.5 text-orange-600 bg-orange-50 hover:bg-orange-100 hover:text-orange-700 border border-orange-200 rounded-full transition-colors group cursor-pointer shadow-sm"
          title="Detect my location"
        >
          <LocateFixed className="w-4 h-4 group-hover:scale-110 transition-transform" />
        </button>
      )}
      <AsyncSelect
        loadOptions={loadOptions}
        value={valueState}
        onChange={handleSelect}
        noOptionsMessage={({ inputValue }) => {
          if (inputValue.length < 3) return 'Type at least 3 characters...';
          return 'No locations found';
        }}
        placeholder={placeholder}
        isClearable
        className="local-proxy-autocomplete"
        classNamePrefix="react-select"
        styles={{
          input: (provided) => ({
            ...provided,
            color: '#374151',
            fontSize: '14px',
            fontWeight: '500',
            paddingLeft: '24px',
          }),
          placeholder: (provided) => ({
            ...provided,
            color: '#9ca3af',
            fontSize: '14px',
            fontWeight: '500',
            paddingLeft: '24px',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }),
          control: (provided) => ({
            ...provided,
            backgroundColor: 'transparent',
            border: 'none',
            boxShadow: 'none',
            minHeight: '40px',
          }),
          valueContainer: (provided) => ({
            ...provided,
            paddingRight: showLocateMe ? '40px' : '8px',
            flexWrap: 'nowrap',
          }),
          singleValue: (provided) => ({
            ...provided,
            color: '#374151',
            fontSize: '14px',
            fontWeight: '600',
            paddingLeft: '24px',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }),
          menu: (provided) => ({
            ...provided,
            borderRadius: '12px',
            marginTop: '8px',
            boxShadow: '0 20px 50px rgba(0,0,0,0.15)',
            border: '1px solid #f3f4f6',
            zIndex: 100,
            padding: '8px',
            backgroundColor: '#ffffff',
          }),
          option: (provided, state) => ({
            ...provided,
            backgroundColor: state.isFocused ? '#fff7ed' : 'transparent',
            color: state.isFocused ? '#f97316' : '#374151',
            fontSize: '13px',
            fontWeight: '600',
            borderRadius: '8px',
            cursor: 'pointer',
            padding: '12px 16px',
            transition: 'all 0.2s ease',
            '&:active': {
              backgroundColor: '#ffedd5',
            },
          }),
          noOptionsMessage: (provided) => ({
            ...provided,
            fontSize: '12px',
            color: '#9ca3af',
            fontWeight: '500',
          }),
          loadingIndicator: () => ({ display: 'none' }),
          dropdownIndicator: () => ({ display: 'none' }),
          indicatorSeparator: () => ({ display: 'none' }),
        }}
      />{' '}
    </div>
  );
}
