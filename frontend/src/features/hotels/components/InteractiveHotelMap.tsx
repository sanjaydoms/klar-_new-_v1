import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  GoogleMap,
  useJsApiLoader,
  MarkerF,
  DirectionsRenderer,
  InfoWindowF,
} from '@react-google-maps/api';
import { Utensils, Landmark, ShoppingBag, Train, MapPin } from 'lucide-react';

const containerStyle = {
  width: '100%',
  height: '100%',
};

const defaultCenter = {
  lat: 20.5937,
  lng: 78.9629, // Center of India as fallback
};

const GOOGLE_MAPS_LIBRARIES: 'places'[] = ['places'];

export interface NearbyPlace {
  name: string;
  dist: string;
  type: string;
  lat: number;
  lng: number;
}

interface InteractiveHotelMapProps {
  hotelData: any;
  selectedAttraction: string | null;
  nearbyPlaces?: NearbyPlace[];
  onPlacesFetched?: (places: NearbyPlace[]) => void;
}

// Custom SVG paths for inner icons (24x24 viewBox)
const CATEGORY_PATHS: Record<string, string> = {
  Restaurants:
    '<path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2" /><path d="M7 2v20" /><path d="M21 15V2v0a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7" />',
  'Monuments & Tourist Attractions':
    '<line x1="3" x2="21" y1="22" y2="22" /><line x1="6" x2="6" y1="18" y2="11" /><line x1="10" x2="10" y1="18" y2="11" /><line x1="14" x2="14" y1="18" y2="11" /><line x1="18" x2="18" y1="18" y2="11" /><polygon points="12 2 20 7 4 7" />',
  'Shopping Malls':
    '<path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" /><path d="M3 6h18" /><path d="M16 10a4 4 0 0 1-8 0" />',
  'Transportation (Airports / Metro / Transit)':
    '<rect width="16" height="16" x="4" y="3" rx="2" /><path d="M4 11h16" /><path d="M12 3v8" /><path d="m8 19-2 3" /><path d="m18 22-2-3" /><path d="M8 15h0" /><path d="M16 15h0" />',
};

// Custom SVG pin for nearby places – coloured by category
const CATEGORY_COLORS: Record<string, string> = {
  Restaurants: '#dc2626',
  'Monuments & Tourist Attractions': '#6d28d9',
  'Shopping Malls': '#d97706',
  'Transportation (Airports / Metro / Transit)': '#2563eb',
};

export default function InteractiveHotelMap({
  hotelData,
  selectedAttraction,
  nearbyPlaces = [],
  onPlacesFetched,
}: InteractiveHotelMapProps) {
  const { isLoaded, loadError } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey:
      import.meta.env.VITE_GOOGLE_MAPS_API_KEY || 'AIzaSyCJQ2BOwkC6OL58ctcZRXwmLBqWuJ2Q1mg',
    libraries: GOOGLE_MAPS_LIBRARIES,
  });

  const [directions, setDirections] = useState<google.maps.DirectionsResult | null>(null);
  const [authError, setAuthError] = useState(false);
  const [activeInfoWindow, setActiveInfoWindow] = useState<string | null>(null);
  const [mapRef, setMapRef] = useState<google.maps.Map | null>(null);

  useEffect(() => {
    (window as any).gm_authFailure = () => setAuthError(true);

    const originalConsoleError = console.error;
    console.error = (...args) => {
      const errorString = args
        .map((arg) => {
          if (typeof arg === 'string') return arg;
          if (arg instanceof Error) return arg.message + ' ' + arg.name;
          try {
            return JSON.stringify(arg);
          } catch (e) {
            return String(arg);
          }
        })
        .join(' ');
      if (errorString.includes('ApiTargetBlockedMapError')) setAuthError(true);
      originalConsoleError.apply(console, args);
    };

    return () => {
      console.error = originalConsoleError;
    };
  }, []);

  const center = useMemo(() => {
    if (hotelData?.latitude && hotelData?.longitude) {
      return {
        lat: parseFloat(hotelData.latitude),
        lng: parseFloat(hotelData.longitude),
      };
    }
    return defaultCenter;
  }, [hotelData]);

  const [resolvedCenter, setResolvedCenter] = useState<google.maps.LatLngLiteral>(center);
  const [isGeocoding, setIsGeocoding] = useState(false);

  // If we don't have valid coords, try to geocode the hotel name + city
  useEffect(() => {
    if (center.lat !== defaultCenter.lat) {
      setResolvedCenter(center);
      return;
    }

    if (!isLoaded || !hotelData) return;

    const query = `${hotelData.name || ''} ${hotelData.address || hotelData.city || ''}`.trim();
    if (!query) {
      setResolvedCenter(defaultCenter);
      return;
    }

    setIsGeocoding(true);
    const geocoder = new window.google.maps.Geocoder();
    geocoder.geocode({ address: query }, (results, status) => {
      if (status === 'OK' && results && results[0]) {
        const loc = results[0].geometry.location;
        setResolvedCenter({ lat: loc.lat(), lng: loc.lng() });
      }
      setIsGeocoding(false);
    });
  }, [center, hotelData, isLoaded]);

  const onMapLoad = useCallback((map: google.maps.Map) => {
    setMapRef(map);
  }, []);

  // Keep places fetched callback in a ref to prevent infinite loops due to inline closures
  const onPlacesFetchedRef = useRef(onPlacesFetched);
  useEffect(() => {
    onPlacesFetchedRef.current = onPlacesFetched;
  }, [onPlacesFetched]);

  // ------- Fetch nearby places via Places API -------
  useEffect(() => {
    if (!isLoaded || !onPlacesFetchedRef.current || resolvedCenter.lat === defaultCenter.lat) return;

    const dummyDiv = document.createElement('div');
    const map = new window.google.maps.Map(dummyDiv, { center: resolvedCenter, zoom: 15 });
    const service = new window.google.maps.places.PlacesService(map);

    const typesToFetch = [
      { gType: 'restaurant', label: 'Restaurants' },
      { gType: 'tourist_attraction', label: 'Monuments & Tourist Attractions' },
      { gType: 'museum', label: 'Monuments & Tourist Attractions' },
      { gType: 'shopping_mall', label: 'Shopping Malls' },
      { gType: 'train_station', label: 'Transportation (Airports / Metro / Transit)' },
      { gType: 'subway_station', label: 'Transportation (Airports / Metro / Transit)' },
      { gType: 'airport', label: 'Transportation (Airports / Metro / Transit)' },
    ];

    const accumulator: NearbyPlace[] = [];
    let completed = 0;

    typesToFetch.forEach(({ gType, label }) => {
      service.nearbySearch({ location: resolvedCenter, radius: 3000, type: gType }, (results, status) => {
        completed++;
        if (status === window.google.maps.places.PlacesServiceStatus.OK && results) {
          results.slice(0, 4).forEach((place) => {
            if (!place.name || !place.geometry?.location) return;

            const plat = place.geometry.location.lat();
            const plng = place.geometry.location.lng();

            // Haversine distance
            const R = 6371;
            const dLat = ((plat - resolvedCenter.lat) * Math.PI) / 180;
            const dLng = ((plng - resolvedCenter.lng) * Math.PI) / 180;
            const a =
              Math.sin(dLat / 2) ** 2 +
              Math.cos((resolvedCenter.lat * Math.PI) / 180) *
                Math.cos((plat * Math.PI) / 180) *
                Math.sin(dLng / 2) ** 2;
            const distKm = parseFloat(
              (R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))).toFixed(1),
            );

            accumulator.push({
              name: place.name,
              dist: `${distKm} km`,
              type: label,
              lat: plat,
              lng: plng,
            });
          });
        }

        if (completed === typesToFetch.length) {
          accumulator.sort((a, b) => parseFloat(a.dist) - parseFloat(b.dist));
          const unique = accumulator.filter(
            (v, i, arr) => arr.findIndex((t) => t.name === v.name) === i,
          );
          onPlacesFetchedRef.current?.(unique);
        }
      });
    });
  }, [isLoaded, resolvedCenter]);

  // ------- Directions to selected attraction -------
  useEffect(() => {
    if (!isLoaded || !selectedAttraction) {
      setDirections(null);
      return;
    }

    // Find the place with coordinates
    const place = nearbyPlaces.find((p) => p.name === selectedAttraction);

    const directionsService = new window.google.maps.DirectionsService();

    const origin: google.maps.LatLngLiteral =
      resolvedCenter.lat !== defaultCenter.lat
        ? resolvedCenter
        : { lat: defaultCenter.lat, lng: defaultCenter.lng };

    const destination: google.maps.LatLngLiteral | string = place
      ? { lat: place.lat, lng: place.lng }
      : `${selectedAttraction} ${hotelData?.city || ''}`;

    directionsService.route(
      { origin, destination, travelMode: window.google.maps.TravelMode.DRIVING },
      (result, status) => {
        if (status === window.google.maps.DirectionsStatus.OK && result) {
          setDirections(result);
        } else {
          console.error(`Directions error: ${status}`);
          setDirections(null);
        }
      },
    );
  }, [isLoaded, selectedAttraction, resolvedCenter, hotelData, nearbyPlaces]);

  // ------- Pan map to selected place -------
  useEffect(() => {
    if (!mapRef || !selectedAttraction) return;
    const place = nearbyPlaces.find((p) => p.name === selectedAttraction);
    if (place) {
      mapRef.panTo({ lat: place.lat, lng: place.lng });
      setActiveInfoWindow(place.name);
    }
  }, [selectedAttraction, nearbyPlaces, mapRef]);

  // ------- Fallback iframe -------
  if (
    loadError ||
    authError ||
    !import.meta.env.VITE_GOOGLE_MAPS_API_KEY ||
    (resolvedCenter.lat === defaultCenter.lat && !isGeocoding)
  ) {
    return (
      <iframe
        width="100%"
        height="100%"
        style={{ border: 0 }}
        loading="lazy"
        allowFullScreen
        referrerPolicy="no-referrer-when-downgrade"
        src={`https://maps.google.com/maps?q=${

          selectedAttraction
            ? encodeURIComponent((hotelData?.city || '') + ' ' + selectedAttraction)
            : hotelData?.latitude && hotelData?.longitude
              ? `${hotelData.latitude},${hotelData.longitude}`
              : encodeURIComponent(
                  (hotelData?.name || '') + ' ' + (hotelData?.address || hotelData?.city || ''),
                )
        }&hl=en&z=15&output=embed`}
      />
    );
  }

  if (!isLoaded || isGeocoding) {
    return (
      <div className="w-full h-full bg-gray-100 animate-pulse flex items-center justify-center text-gray-500 font-medium text-sm">
        {isGeocoding ? 'Locating property...' : 'Loading map...'}
      </div>
    );
  }

  return (
    <GoogleMap
      mapContainerStyle={containerStyle}
      center={resolvedCenter}
      zoom={14}
      onLoad={onMapLoad}
      options={{
        disableDefaultUI: false,
        zoomControl: true,
        streetViewControl: false,
        mapTypeControl: false,
        fullscreenControl: true,
        styles: [
          { featureType: 'poi', elementType: 'labels.text.fill', stylers: [{ color: '#747474' }] },
          { featureType: 'poi.business', stylers: [{ visibility: 'off' }] },
          { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#ffffff' }] },
          { featureType: 'road', elementType: 'geometry.stroke', stylers: [{ color: '#e0e0e0' }] },
          { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#e9f2fa' }] },
        ],
      }}
    >
      {/* Hotel pin (only shown if no directions active) */}
      {!directions && resolvedCenter.lat !== defaultCenter.lat && (
        <MarkerF
          position={resolvedCenter}
          title={hotelData?.name}
          icon={{
            url:
              'data:image/svg+xml;charset=UTF-8,' +
              encodeURIComponent(`
              <svg xmlns="http://www.w3.org/2000/svg" width="44" height="52" viewBox="0 0 36 44">
                <path d="M18 0C8.1 0 0 8.1 0 18c0 13.5 18 26 18 26S36 31.5 36 18C36 8.1 27.9 0 18 0z" fill="#0f172a"/>
                <circle cx="18" cy="18" r="14" fill="#1e293b"/>
                <svg x="6" y="6" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fbbf24" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z"/><path d="M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2"/><path d="M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2"/><path d="M10 6h4"/><path d="M10 10h4"/><path d="M10 14h4"/><path d="M10 18h4"/>
                </svg>
              </svg>
            `),
            scaledSize: new window.google.maps.Size(44, 52),
            anchor: new window.google.maps.Point(22, 52),
          }}
          onClick={() => setActiveInfoWindow('__hotel__')}
          zIndex={200}
        >
          {activeInfoWindow === '__hotel__' && (
            <InfoWindowF position={resolvedCenter} onCloseClick={() => setActiveInfoWindow(null)}>
              <div style={{ maxWidth: 180, padding: '4px' }}>
                <p style={{ fontWeight: 800, fontSize: 14, margin: 0, color: '#0f172a' }}>
                  {hotelData?.name || 'Hotel'}
                </p>
                <p
                  style={{
                    fontSize: 10,
                    color: '#10b981',
                    fontWeight: 'bold',
                    margin: '2px 0 4px',
                  }}
                >
                  Your Location
                </p>
                {hotelData?.address && (
                  <p style={{ fontSize: 11, color: '#475569', margin: '2px 0 0', lineHeight: 1.2 }}>
                    {hotelData.address}
                  </p>
                )}
              </div>
            </InfoWindowF>
          )}
        </MarkerF>
      )}

      {/* Nearby place markers */}
      {!directions &&
        nearbyPlaces.map((place, idx) => {
          const color = CATEGORY_COLORS[place.type] || '#6B7280';
          const path =
            CATEGORY_PATHS[place.type] ||
            '<path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" /><circle cx="12" cy="10" r="3" />';
          const isSelected = selectedAttraction === place.name;

          let IconComponent = MapPin;
          if (place.type === 'Restaurants') IconComponent = Utensils;
          else if (place.type === 'Monuments & Tourist Attractions') IconComponent = Landmark;
          else if (place.type === 'Transportation (Airports / Metro / Transit)')
            IconComponent = Train;
          else if (place.type === 'Shopping Malls') IconComponent = ShoppingBag;

          return (
            <MarkerF
              key={`${place.name}-${idx}`}
              position={{ lat: place.lat, lng: place.lng }}
              title={place.name}
              zIndex={isSelected ? 150 : 10}
              icon={{
                url:
                  'data:image/svg+xml;charset=UTF-8,' +
                  encodeURIComponent(`
                <svg xmlns="http://www.w3.org/2000/svg" width="${isSelected ? 44 : 32}" height="${isSelected ? 52 : 38}" viewBox="0 0 40 48">
                  <path d="M20 0C9 0 0 9 0 20c0 15 20 28 20 28S40 35 40 20C40 9 31 0 20 0z" fill="${color}" opacity="${isSelected ? '1' : '0.9'}"/>
                  <circle cx="20" cy="20" r="${isSelected ? '15' : '11'}" fill="white" opacity="0.3"/>
                  <svg x="${isSelected ? '8' : '9'}" y="${isSelected ? '8' : '9'}" width="${isSelected ? '24' : '22'}" height="${isSelected ? '24' : '22'}" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                    ${path}
                  </svg>
                </svg>
              `),
                scaledSize: new window.google.maps.Size(isSelected ? 44 : 32, isSelected ? 52 : 38),
                anchor: new window.google.maps.Point(isSelected ? 22 : 16, isSelected ? 52 : 38),
              }}
              onClick={() => {
                setActiveInfoWindow(place.name);
              }}
            >
              {activeInfoWindow === place.name && (
                <InfoWindowF
                  position={{ lat: place.lat, lng: place.lng }}
                  onCloseClick={() => setActiveInfoWindow(null)}
                >
                  <div style={{ maxWidth: 200, padding: '4px' }}>
                    <p
                      style={{
                        fontWeight: 800,
                        fontSize: 13,
                        margin: 0,
                        color: '#0f172a',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                      }}
                    >
                      <IconComponent size={14} color={color} strokeWidth={2.5} /> {place.name}
                    </p>
                    <p
                      style={{
                        fontSize: 11,
                        color: '#475569',
                        margin: '4px 0 0',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                      }}
                    >
                      <MapPin size={10} /> {place.dist} from hotel
                    </p>
                    <p
                      style={{
                        fontSize: 11,
                        color: color,
                        fontWeight: 700,
                        margin: '2px 0 0',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                      }}
                    >
                      {place.type}
                    </p>
                  </div>
                </InfoWindowF>
              )}
            </MarkerF>
          );
        })}

      {/* Directions route */}
      {directions && (
        <DirectionsRenderer
          directions={directions}
          options={{
            suppressMarkers: true,
            polylineOptions: {
              strokeColor: '#3b82f6',
              strokeOpacity: 0.9,
              strokeWeight: 5,
            },
          }}
        />
      )}
    </GoogleMap>
  );
}
