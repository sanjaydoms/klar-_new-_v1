import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import TripFlightGrid from './TripFlightGrid';
import type { Flight } from './TripFlightGrid';

// International Airports Data
const INTERNATIONAL_AIRPORTS = [
  { code: 'BOM', name: 'Mumbai', city: 'Mumbai', country: 'India' },
  { code: 'DEL', name: 'Delhi', city: 'Delhi', country: 'India' },
  { code: 'BLR', name: 'Bengaluru', city: 'Bengaluru', country: 'India' },
  { code: 'MAA', name: 'Chennai', city: 'Chennai', country: 'India' },
  { code: 'CCU', name: 'Kolkata', city: 'Kolkata', country: 'India' },
  { code: 'DXB', name: 'Dubai International', city: 'Dubai', country: 'UAE' },
  { code: 'BKK', name: 'Suvarnabhumi', city: 'Bangkok', country: 'Thailand' },
  { code: 'SIN', name: 'Changi', city: 'Singapore', country: 'Singapore' },
  { code: 'LHR', name: 'Heathrow', city: 'London', country: 'UK' },
  { code: 'KTM', name: 'Tribhuvan', city: 'Kathmandu', country: 'Nepal' },
  { code: 'CMB', name: 'Bandaranaike', city: 'Colombo', country: 'Sri Lanka' },
  { code: 'JFK', name: 'John F. Kennedy', city: 'New York', country: 'USA' },
  { code: 'HKG', name: 'Hong Kong International', city: 'Hong Kong', country: 'China' },
  { code: 'AUH', name: 'Abu Dhabi International', city: 'Abu Dhabi', country: 'UAE' },
];

// International Trip Data with from locations
const internationalFlights: Flight[] = [
  { 
    id: 1, 
    from: 'Mumbai',
    fromCode: 'BOM',
    destination: 'Dubai', 
    price: 25618,
    badge: 'Popular',
    imageUrl: '/images/Dubai2.webp'
  },
  { 
    id: 2, 
    from: 'Mumbai',
    fromCode: 'BOM',
    destination: 'Bangkok', 
    price: 21719,
    imageUrl: '/images/Bangkok2.webp'
  },
  { 
    id: 3, 
    from: 'Mumbai',
    fromCode: 'BOM',
    destination: 'Singapore', 
    price: 26886,
    badge: 'Best Deal',
    imageUrl: '/images/Singapore2.webp'
  },
  { 
    id: 4, 
    from: 'Mumbai',
    fromCode: 'BOM',
    destination: 'London', 
    price: 55404,
    imageUrl: '/images/London2.webp'
  },
  { 
    id: 5, 
    from: 'Mumbai',
    fromCode: 'BOM',
    destination: 'Kathmandu', 
    price: 17832,
    imageUrl: '/images/Kathmandu2.webp'
  },
  { 
    id: 6, 
    from: 'Mumbai',
    fromCode: 'BOM',
    destination: 'Colombo', 
    price: 30065,
    imageUrl: '/images/Colombo2.webp'
  },
  { 
    id: 7, 
    from: 'Mumbai',
    fromCode: 'BOM',
    destination: 'New York', 
    price: 67153,
    badge: 'Limited Time',
    imageUrl: '/images/NewYork.webp'
  },
  { 
    id: 8, 
    from: 'Mumbai',
    fromCode: 'BOM',
    destination: 'Hong Kong', 
    price: 28617,
    imageUrl: '/images/Hongkong.webp'
  },
  { 
    id: 9, 
    from: 'Mumbai',
    fromCode: 'BOM',
    destination: 'Abu Dhabi', 
    price: 28269,
    imageUrl: '/images/Abudabii.webp'
  },
  // Delhi departures
  { 
    id: 10, 
    from: 'Delhi',
    fromCode: 'DEL',
    destination: 'Dubai', 
    price: 24118,
    badge: 'Popular',
    imageUrl: '/images/Dubai2.webp'
  },
  { 
    id: 11, 
    from: 'Delhi',
    fromCode: 'DEL',
    destination: 'Bangkok', 
    price: 20719,
    imageUrl: '/images/Bangkok2.webp'
  },
  { 
    id: 12, 
    from: 'Delhi',
    fromCode: 'DEL',
    destination: 'Singapore', 
    price: 25886,
    badge: 'Best Deal',
    imageUrl: '/images/Singapore2.webp'
  },
  { 
    id: 13, 
    from: 'Delhi',
    fromCode: 'DEL',
    destination: 'London', 
    price: 54404,
    imageUrl: '/images/London2.webp'
  },
  { 
    id: 14, 
    from: 'Delhi',
    fromCode: 'DEL',
    destination: 'Kathmandu', 
    price: 16832,
    imageUrl: '/images/Kathmandu2.webp'
  },
  { 
    id: 15, 
    from: 'Delhi',
    fromCode: 'DEL',
    destination: 'New York', 
    price: 66153,
    badge: 'Limited Time',
    imageUrl: '/images/NewYork.webp'
  },
  // Bengaluru departures
  { 
    id: 16, 
    from: 'Bengaluru',
    fromCode: 'BLR',
    destination: 'Dubai', 
    price: 23118,
    imageUrl: '/images/Dubai2.webp'
  },
  { 
    id: 17, 
    from: 'Bengaluru',
    fromCode: 'BLR',
    destination: 'Singapore', 
    price: 23886,
    badge: 'Best Deal',
    imageUrl: '/images/Singapore2.webp'
  },
  { 
    id: 18, 
    from: 'Bengaluru',
    fromCode: 'BLR',
    destination: 'London', 
    price: 52404,
    imageUrl: '/images/London2.webp'
  },
  // Chennai departures
  { 
    id: 19, 
    from: 'Chennai',
    fromCode: 'MAA',
    destination: 'Dubai', 
    price: 22618,
    imageUrl: '/images/Dubai2.webp'
  },
  { 
    id: 20, 
    from: 'Chennai',
    fromCode: 'MAA',
    destination: 'Singapore', 
    price: 22886,
    badge: 'Popular',
    imageUrl: '/images/Singapore2.webp'
  },
  // Kolkata departures
  { 
    id: 21, 
    from: 'Kolkata',
    fromCode: 'CCU',
    destination: 'Dubai', 
    price: 24618,
    imageUrl: '/images/Dubai2.webp'
  },
  { 
    id: 22, 
    from: 'Kolkata',
    fromCode: 'CCU',
    destination: 'Bangkok', 
    price: 19719,
    badge: 'Best Deal',
    imageUrl: '/images/Bangkok2.webp'
  },
  { 
    id: 23, 
    from: 'Kolkata',
    fromCode: 'CCU',
    destination: 'Singapore', 
    price: 25886,
    imageUrl: '/images/Singapore2.webp'
  },
  // Hyderabad departures
  { 
    id: 24, 
    from: 'Hyderabad',
    fromCode: 'HYD',
    destination: 'Dubai', 
    price: 22118,
    imageUrl: '/images/Dubai2.webp'
  },
  { 
    id: 25, 
    from: 'Hyderabad',
    fromCode: 'HYD',
    destination: 'Singapore', 
    price: 24886,
    imageUrl: '/images/Singapore2.webp'
  },
];

// Helper to extract airport code from "City (CODE)" format
const extractAirportCode = (locationString: string): string => {
  if (!locationString) return '';
  const match = locationString.match(/\(([A-Z]{3})\)/);
  return match ? match[1] : locationString.trim();
};

// Helper to format location for search
const formatLocationForSearch = (city: string, code: string): string => {
  return `${city} (${code})`;
};

// Get unique departure cities for dropdown
const getDepartureOptions = () => {
  const uniqueFrom = new Set(internationalFlights.map(flight => flight.from));
  return ['All Airports', ...Array.from(uniqueFrom).sort()];
};

// Get airport display name with code
const getAirportDisplay = (cityName: string) => {
  const airport = INTERNATIONAL_AIRPORTS.find(a => a.city === cityName);
  if (airport) {
    return `${airport.city} (${airport.code})`;
  }
  return cityName;
};

// Helper to clear session storage (same as footer)
const clearSessionStorage = () => {
  const keysToKeep = ['footerRouteData'];
  const allKeys = Object.keys(sessionStorage);
  allKeys.forEach(key => {
    if (!keysToKeep.includes(key)) {
      sessionStorage.removeItem(key);
    }
  });
};

interface InternationalTripsProps {
  onFlightClick?: (flight: Flight) => void;
  className?: string;
}

export default function InternationalTrips({ 
  onFlightClick, 
  className = '' 
}: InternationalTripsProps) {
  const navigate = useNavigate();
  const [selectedFrom, setSelectedFrom] = useState('All Airports');
  
  // Get unique departure cities for dropdown with display names
  const fromOptions = useMemo(() => {
    const options = getDepartureOptions();
    return options.map(option => 
      option === 'All Airports' ? option : getAirportDisplay(option)
    );
  }, []);

  // Filter flights based on selected departure city
  const filteredFlights = useMemo(() => {
    if (selectedFrom === 'All Airports') {
      return internationalFlights;
    }
    // Extract city name from display string (e.g., "Mumbai (BOM)" -> "Mumbai")
    const cityName = selectedFrom.split(' (')[0];
    return internationalFlights.filter(flight => flight.from === cityName);
  }, [selectedFrom]);

  // Handle from location change
  const handleFromChange = (value: string) => {
    setSelectedFrom(value);
  };

  // Handle flight card click to navigate to search
  const handleFlightClick = (flight: Flight) => {
    // If there's an external onFlightClick prop, use it
    if (onFlightClick) {
      onFlightClick(flight);
      return;
    }

    // Clear session storage (for consistency)
    clearSessionStorage();

    // Extract airport codes
    const fromCode = flight.fromCode || extractAirportCode(flight.from || '');
    const toCode = extractAirportCode(flight.destination);

    // Navigate to flights page with state
    navigate('/flights/oneway', { 
      state: {
        from: flight.from || '',
        to: flight.destination,
        fromCode: fromCode,
        toCode: toCode,
        tripType: 'oneway',
        departureDate: new Date().toISOString().split('T')[0],
        adults: '1',
        children: '0',
        infants: '0'
      }
    });
  };

  // Get subtitle with flight count
  const getSubtitle = () => {
    const totalFlights = filteredFlights.length;
    const fromDisplay = selectedFrom === 'All Airports' ? 'all airports' : selectedFrom;
    return `Fly to ${totalFlights} international destinations from ${fromDisplay} with exclusive offers`;
  };

  return (
    <TripFlightGrid
      flights={filteredFlights}
      title="International Flights"
      subtitle={getSubtitle()}
      className={className}
      columns={{ mobile: 1, tablet: 2, desktop: 3 }}
      showFromSelector={true}
      selectedFrom={selectedFrom}
      onFromChange={handleFromChange}
      fromOptions={fromOptions}
      fromType="international"
      onFlightClick={handleFlightClick}
    />
  );
}