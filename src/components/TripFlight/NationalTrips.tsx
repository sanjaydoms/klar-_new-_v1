import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import TripFlightGrid from './TripFlightGrid';
import type { Flight } from './TripFlightGrid';

// Indian Airports Data
const INDIAN_AIRPORTS = [
  { code: 'BOM', name: 'Mumbai', city: 'Mumbai' },
  { code: 'DEL', name: 'Delhi', city: 'Delhi' },
  { code: 'BLR', name: 'Bengaluru', city: 'Bengaluru' },
  { code: 'MAA', name: 'Chennai', city: 'Chennai' },
  { code: 'CCU', name: 'Kolkata', city: 'Kolkata' },
  { code: 'HYD', name: 'Hyderabad', city: 'Hyderabad' },
  { code: 'AMD', name: 'Ahmedabad', city: 'Ahmedabad' },
  { code: 'PNQ', name: 'Pune', city: 'Pune' },
  { code: 'GOI', name: 'Goa', city: 'Goa' },
  { code: 'JAI', name: 'Jaipur', city: 'Jaipur' },
  { code: 'LKO', name: 'Lucknow', city: 'Lucknow' },
  { code: 'COK', name: 'Cochin', city: 'Cochin' },
  { code: 'ATQ', name: 'Amritsar', city: 'Amritsar' },
  { code: 'GAU', name: 'Guwahati', city: 'Guwahati' },
  { code: 'BBI', name: 'Bhubaneswar', city: 'Bhubaneswar' },
  { code: 'IXC', name: 'Chandigarh', city: 'Chandigarh' },
  { code: 'NAG', name: 'Nagpur', city: 'Nagpur' },
  { code: 'IDR', name: 'Indore', city: 'Indore' },
  { code: 'PAT', name: 'Patna', city: 'Patna' },
  { code: 'BDQ', name: 'Vadodara', city: 'Vadodara' },
];

// National Trip Data with from locations
const nationalFlights: Flight[] = [
  { 
    id: 1, 
    from: 'Mumbai',
    fromCode: 'BOM',
    destination: 'Delhi', 
    price: 3999,
    badge: 'Popular',
    imageUrl: '/images/Delhi2.jpg'
  },
  { 
    id: 2, 
    from: 'Mumbai',
    fromCode: 'BOM',
    destination: 'Bengaluru', 
    price: 4499,
    badge: 'Best Deal',
    imageUrl: '/images/Bangalore2.jpg'
  },
  { 
    id: 3, 
    from: 'Mumbai',
    fromCode: 'BOM',
    destination: 'Chennai', 
    price: 4299,
    imageUrl: '/images/Chennai2.jpg'
  },
  { 
    id: 4, 
    from: 'Mumbai',
    fromCode: 'BOM',
    destination: 'Kolkata', 
    price: 5199,
    imageUrl: '/images/Kolkata2.jpg'
  },
  { 
    id: 5, 
    from: 'Mumbai',
    fromCode: 'BOM',
    destination: 'Hyderabad', 
    price: 3899,
    imageUrl: '/images/Hyderabad2.jpg'
  },
  { 
    id: 6, 
    from: 'Mumbai',
    fromCode: 'BOM',
    destination: 'Jaipur', 
    price: 3599,
    badge: 'Limited Time',
    imageUrl: '/images/Jaipur2.jpg'
  },
  { 
    id: 7, 
    from: 'Mumbai',
    fromCode: 'BOM',
    destination: 'Goa', 
    price: 5999,
    imageUrl: '/images/Goa2.jpg'
  },
  { 
    id: 8, 
    from: 'Mumbai',
    fromCode: 'BOM',
    destination: 'Varanasi', 
    price: 4799,
    imageUrl: '/images/Varanasi2.jpg'
  },
  { 
    id: 9, 
    from: 'Delhi',
    fromCode: 'DEL',
    destination: 'Mumbai', 
    price: 4299,
    badge: 'Popular',
    imageUrl: '/images/Mumbai.jpg'
  },
  { 
    id: 10, 
    from: 'Delhi',
    fromCode: 'DEL',
    destination: 'Goa', 
    price: 6499,
    imageUrl: '/images/Goa2.jpg'
  },
  { 
    id: 11, 
    from: 'Delhi',
    fromCode: 'DEL',
    destination: 'Bengaluru', 
    price: 4999,
    imageUrl: '/images/Bangalore2.jpg'
  },
  { 
    id: 12, 
    from: 'Delhi',
    fromCode: 'DEL',
    destination: 'Chennai', 
    price: 4799,
    imageUrl: '/images/Chennai2.jpg'
  },
  { 
    id: 13, 
    from: 'Bengaluru',
    fromCode: 'BLR',
    destination: 'Mumbai', 
    price: 4499,
    badge: 'Best Deal',
    imageUrl: '/images/Mumbai.jpg'
  },
  { 
    id: 14, 
    from: 'Bengaluru',
    fromCode: 'BLR',
    destination: 'Delhi', 
    price: 5199,
    imageUrl: '/images/Delhi2.jpg'
  },
  { 
    id: 15, 
    from: 'Bengaluru',
    fromCode: 'BLR',
    destination: 'Goa', 
    price: 3999,
    imageUrl: '/images/Goa2.jpg'
  },
  { 
    id: 16, 
    from: 'Chennai',
    fromCode: 'MAA',
    destination: 'Mumbai', 
    price: 4299,
    imageUrl: '/images/Mumbai.jpg'
  },
  { 
    id: 17, 
    from: 'Chennai',
    fromCode: 'MAA',
    destination: 'Delhi', 
    price: 5499,
    imageUrl: '/images/Delhi2.jpg'
  },
  { 
    id: 18, 
    from: 'Kolkata',
    fromCode: 'CCU',
    destination: 'Mumbai', 
    price: 5199,
    imageUrl: '/images/Mumbai.jpg'
  },
  { 
    id: 19, 
    from: 'Hyderabad',
    fromCode: 'HYD',
    destination: 'Mumbai', 
    price: 3899,
    imageUrl: '/images/Mumbai.jpg'
  },
  { 
    id: 20, 
    from: 'Hyderabad',
    fromCode: 'HYD',
    destination: 'Delhi', 
    price: 4599,
    imageUrl: '/images/Delhi2.jpg'
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
  const uniqueFrom = new Set(nationalFlights.map(flight => flight.from));
  return ['All Airports', ...Array.from(uniqueFrom).sort()];
};

// Get airport display name with code
const getAirportDisplay = (cityName: string) => {
  const airport = INDIAN_AIRPORTS.find(a => a.city === cityName);
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

interface NationalTripsProps {
  onFlightClick?: (flight: Flight) => void;
  className?: string;
}

export default function NationalTrips({ 
  onFlightClick, 
  className = '' 
}: NationalTripsProps) {
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
      return nationalFlights;
    }
    // Extract city name from display string (e.g., "Mumbai (BOM)" -> "Mumbai")
    const cityName = selectedFrom.split(' (')[0];
    return nationalFlights.filter(flight => flight.from === cityName);
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
    return `Discover ${totalFlights} amazing domestic destinations from ${fromDisplay} at unbeatable prices`;
  };

  return (
    <TripFlightGrid
      flights={filteredFlights}
      title="Explore India"
      subtitle={getSubtitle()}
      className={className}
      columns={{ mobile: 1, tablet: 2, desktop: 3 }}
      showFromSelector={true}
      selectedFrom={selectedFrom}
      onFromChange={handleFromChange}
      fromOptions={fromOptions}
      fromType="domestic"
      onFlightClick={handleFlightClick}
    />
  );
}