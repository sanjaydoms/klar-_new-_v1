import { useMemo, useState, useEffect, useRef } from 'react';
import {
  FaSearch,
  FaMapMarkerAlt,
  FaStar,
  FaMoneyBillWave,
  FaMapPin,
  FaBuilding,
  FaConciergeBell,
  FaUtensils,
  FaLayerGroup,
  FaTimes,
} from 'react-icons/fa';
import { MdHotel } from 'react-icons/md';
import { useLocation } from 'react-router-dom';
import type { Hotel } from '@/features/hotels/types/hotelTypes';
import HotelMapModal from './HotelMapModal';
import { calculateNights } from '@/utils/hotelUtils';

export interface FilterState {
  starRatings: number[];
  priceRange: [number, number];
  priceRanges?: Array<[number, number]>;
  mealTypes: string[];
  propertyTypes: string[];
  amenities: string[];
  searchText: string;
  showOnlyAltDeals: boolean;
  providers: string[];
}

// Represents one price range bucket generated dynamically from actual hotel prices
interface PriceBucket {
  id: string; // e.g. "bucket_0"
  label: string; // e.g. "₹1,810 – ₹2,500"
  min: number;
  max: number;
  count: number;
}

interface HotelFiltersProps {
  hotels: Hotel[];
  isLoading?: boolean;
  filteredHotels?: Hotel[];
  hotelsForPriceCounts?: Hotel[];
  onFilterChange?: (filters: FilterState) => void;
  activeFilters?: FilterState;
  topLocations?: { name: string; count: number }[];
  selectedLocations?: string[];
  onLocationToggle?: (loc: string) => void;
  onClearLocations?: () => void;
  facets?: any;
  nights?: number;
}

const SkeletonHotelFilters = () => (
  <div className="w-full lg:w-[280px] flex flex-col gap-4 animate-pulse">
    {[...Array(4)].map((_, idx) => (
      <div
        key={idx}
        className="w-full lg:w-[280px] h-[200px] border border-gray-200 rounded-[8px] bg-white p-4"
      >
        <div className="h-5 bg-gray-200 rounded w-28 mb-4"></div>
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-4 bg-gray-100 rounded w-40"></div>
          ))}
        </div>
      </div>
    ))}
  </div>
);

export const parseAmenities = (amenities: any[] | undefined | null): string[] => {
  if (!amenities || !Array.isArray(amenities)) return [];
  const flat: string[] = [];
  for (const item of amenities) {
    if (typeof item === 'string') {
      const trimmed = item.trim();
      if (trimmed.startsWith('[')) {
        try {
          const parsed = JSON.parse(trimmed);
          if (Array.isArray(parsed)) {
            parsed.forEach((p) => {
              if (typeof p === 'string' && p.trim()) flat.push(p.trim());
            });
            continue;
          }
        } catch (e) {
          const cleaned = trimmed.replace(/^\[|\]$/g, '');
          cleaned.split(',').forEach((part) => {
            const cleanPart = part.replace(/^["'\s]+|["'\s]+$/g, '');
            if (cleanPart) flat.push(cleanPart);
          });
          continue;
        }
      }
      if (trimmed) flat.push(trimmed);
    } else if (Array.isArray(item)) {
      item.forEach((sub) => {
        if (typeof sub === 'string' && sub.trim()) flat.push(sub.trim());
      });
    }
  }
  return Array.from(new Set(flat));
};

// Known property type keywords for normalization
/**
 * Locality names come off the supplier semicolon-delimited ("Colva;"). The raw
 * value stays the filter key — only the visible label is tidied, so toggling
 * still matches the hotel records.
 */
const cleanLocationLabel = (name: string) =>
  (name || '')
    .split(';')
    .map((p) => p.trim())
    .filter(Boolean)
    .join(', ');

/**
 * Board-basis codes as they arrive from the suppliers. Anything that is still a
 * bare code after this map is bucketed as "Other" rather than shown raw — a
 * stray "Co" in the meal filter is meaningless, and guessing at a meal plan the
 * customer is not actually buying would be worse than saying nothing.
 *
 * NOTE: "CO" is RateGain's fallback default (see rateGainAdapter.ts), not a
 * confirmed meal plan — leave it unmapped until the supplier confirms it.
 */
const BOARD_LABELS: Record<string, string> = {
  AI: 'All Inclusive',
  FB: 'Full Board',
  HB: 'Half Board',
  BB: 'Breakfast Included',
  RO: 'Room Only',
  EP: 'Room Only',
};

/**
 * Display names for supplier codes, for the localhost-only supplier panel.
 *
 * Presentation only — which suppliers EXIST comes from the backend's registry
 * via `providerCounts`, never from this map. An unlisted code degrades to the
 * code itself, so registering a supplier never leaves the filter blank or stale.
 */
const PROVIDER_LABELS: Record<string, string> = {
  TJ: 'TripJack',
  RG: 'RateGain',
};

const providerLabel = (code: string) => PROVIDER_LABELS[code] ?? code;

const cleanMealPlanLabel = (label: string) => {
  const raw = (label || '').trim();
  if (!raw) return 'Other';
  const mapped = BOARD_LABELS[raw.toUpperCase()];
  if (mapped) return mapped;
  // Still a bare code (no spaces, very short) => not presentable to a customer.
  return raw.length <= 3 && !raw.includes(' ') ? 'Other' : raw;
};

const PROPERTY_TYPE_KEYWORDS: Record<string, string> = {
  resort: 'Resort',
  hotel: 'Hotel',
  apartment: 'Apartment',
  villa: 'Villa',
  hostel: 'Hostel',
  guesthouse: 'Guesthouse',
  'b&b': 'B&B',
  motel: 'Motel',
  lodge: 'Lodge',
  camp: 'Camp',
  tent: 'Tent',
  cabin: 'Cabin',
  cottage: 'Cottage',
  palace: 'Hotel',
};

export const getPropertyTypeLabel = (hotel: any): string => {
  const explicit = hotel.accTypeDesc || hotel.accMultiDesc;
  if (explicit && typeof explicit === 'string' && explicit.trim().length > 2) {
    const clean = explicit.trim();
    for (const [key, label] of Object.entries(PROPERTY_TYPE_KEYWORDS)) {
      if (clean.toLowerCase().includes(key)) return label;
    }
    return clean.charAt(0).toUpperCase() + clean.slice(1).toLowerCase();
  }

  // First scan specific sources (name, distinct descriptors) for non-hotel unique keywords
  const specificSources = [
    hotel.accTypeDesc,
    hotel.accMultiDesc,
    hotel.name || '',
    ...(hotel.amenities || []),
    ...(hotel.features || []),
  ];

  // Specific keywords to check before settling for generic 'Hotel'
  const specificEntries = Object.entries(PROPERTY_TYPE_KEYWORDS).filter(([key]) => key !== 'hotel');

  for (const src of specificSources) {
    const text = Array.isArray(src) ? src.join(' ') : String(src || '');
    const lower = text.toLowerCase();
    for (const [key, label] of specificEntries) {
      if (lower.includes(key)) return label;
    }
  }

  // Fallback to segment if it contains anything other than just 'Hotel'
  if (hotel.hotelSegment && typeof hotel.hotelSegment === 'string') {
    const cleanSeg = hotel.hotelSegment.trim();
    if (cleanSeg.toLowerCase() !== 'hotel') {
      for (const [key, label] of Object.entries(PROPERTY_TYPE_KEYWORDS)) {
        if (cleanSeg.toLowerCase().includes(key)) return label;
      }
      return cleanSeg;
    }
  }

  return 'Hotel';
};

const HotelFilters = ({
  hotels = [],
  isLoading = false,
  filteredHotels = [],
  hotelsForPriceCounts,
  onFilterChange,
  activeFilters,
  topLocations = [],
  selectedLocations = [],
  onLocationToggle,
  onClearLocations,
  facets,
  nights: nightsProp = 1,
}: HotelFiltersProps) => {
  const [selectedPrices, setSelectedPrices] = useState<string[]>([]);
  const [selectedStars, setSelectedStars] = useState<number[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>([]);
  const [selectedMealPlans, setSelectedMealPlans] = useState<string[]>([]);
  const [selectedProviders, setSelectedProviders] = useState<string[]>([]);
  const [isMapOpen, setIsMapOpen] = useState(false);
  const [amenitySearch, setAmenitySearch] = useState('');

  const [showAllLocations, setShowAllLocations] = useState(false);
  const [showAllStayTypes, setShowAllStayTypes] = useState(false);
  const [showAllAmenities, setShowAllAmenities] = useState(false);
  const [showAllMealPlans, setShowAllMealPlans] = useState(false);

  const filterStateRef = useRef({
    prices: [] as string[],
    stars: [] as number[],
    categories: [] as string[],
    amenities: [] as string[],
    mealPlans: [] as string[],
    providers: [] as string[],
  });

  // nights is passed from the parent HotelSearchPage which has accurate date info.
  // Fallback to reading from sessionStorage if not provided.
  const nights = useMemo(() => {
    if (nightsProp && nightsProp > 1) return nightsProp;
    try {
      const stored = sessionStorage.getItem('hotelSearchParams');
      if (stored) {
        const p = JSON.parse(stored);
        if (p.checkIn && p.checkOut) {
          const d1 = new Date(p.checkIn);
          const d2 = new Date(p.checkOut);
          const n = Math.round((d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24));
          if (n > 0) return n;
        }
      }
    } catch { }
    return 1;
  }, [nightsProp]);

  // ── Stable Price Bucket Boundaries ──────────────────────────────────────────
  const [bucketBoundaries, setBucketBoundaries] = useState<Omit<PriceBucket, 'count'>[]>([]);

  useEffect(() => {
    // Only redefine bucket boundaries if there are no price filters active
    // This ensures boundaries remain stable while filtering.
    if (filterStateRef.current.prices.length === 0 && hotels.length > 0) {
      const prices = hotels
        .map((h) => {
          const effectiveBasePrice = h.basePrice ?? h.price;
          return effectiveBasePrice ? Math.round(effectiveBasePrice / nights) : 0;
        })
        .filter((p) => p > 0);

      if (prices.length === 0) {
        setBucketBoundaries([]);
        return;
      }

      let minPrice = Math.min(...prices);
      let maxPrice = Math.max(...prices);

      // If facets exist from backend, use them to compute the global min/max price for the entire dataset
      if (facets && typeof facets.minPrice === 'number' && typeof facets.maxPrice === 'number') {
        const globalMin = Math.round(facets.minPrice / nights);
        const globalMax = Math.round(facets.maxPrice / nights);
        if (globalMax > 0) {
          minPrice = Math.min(minPrice, globalMin);
          maxPrice = Math.max(maxPrice, globalMax);
        }
      }

      if (minPrice === maxPrice) {
        setBucketBoundaries([
          {
            id: 'bucket_0',
            label: `₹${Math.round(minPrice).toLocaleString('en-IN')}`,
            min: minPrice,
            max: maxPrice,
          },
        ]);
        return;
      }

      const sortedPrices = [...prices].sort((a, b) => a - b);
      const p80 = sortedPrices[Math.floor(sortedPrices.length * 0.8)] || maxPrice;
      const rangeForStep = Math.max(p80 - minPrice, 1000);

      const rawStep = rangeForStep / 3;
      const niceSteps = [500, 1000, 2000, 3000, 5000, 10000, 15000, 20000, 50000, 100000];
      let step = niceSteps.find((s) => s >= rawStep) || niceSteps[niceSteps.length - 1];

      let currentMin = Math.floor(minPrice / step) * step;

      const boundaries = [];
      let i = 0;

      while (currentMin < maxPrice && i < 4) {
        let currentMax = currentMin + step;

        const isFirst = i === 0;
        const isLast = i === 3 || currentMax >= maxPrice;

        let actualMin = isFirst ? currentMin : currentMin + 1;

        let label = '';
        if (isFirst && actualMin <= 0) {
          actualMin = 0;
          label = `Up to ₹${currentMax.toLocaleString('en-IN')}`;
        } else if (isLast && currentMax < maxPrice) {
          label = `₹${actualMin.toLocaleString('en-IN')} & Above`;
          currentMax = Number.MAX_SAFE_INTEGER;
        } else {
          label = `₹${actualMin.toLocaleString('en-IN')} – ₹${currentMax.toLocaleString('en-IN')}`;
        }

        boundaries.push({
          id: `bucket_${i}`,
          label,
          min: actualMin,
          max: currentMax,
        });

        currentMin = currentMax;
        i++;
      }
      setBucketBoundaries(boundaries);
    }
  }, [hotels, nights, facets]); // only updates when hotels change AND no price filter is active

  // ── Dynamic Price Buckets (Stable Boundaries + Dynamic Counts) ────────────────
  const priceBuckets = useMemo((): PriceBucket[] => {
    const listToUse = hotelsForPriceCounts || hotels;
    const currentPrices = listToUse
      .map((h) => {
        const effectiveBasePrice = h.basePrice ?? h.price;
        return effectiveBasePrice ? Math.round(effectiveBasePrice / nights) : 0;
      })
      .filter((p) => p > 0);

    return bucketBoundaries.map((b, i) => {
      const count = currentPrices.filter((p) => p >= b.min && p <= b.max).length;
      return { ...b, count };
    });
  }, [bucketBoundaries, hotels, hotelsForPriceCounts, nights]);

  const googleMapsApiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

  // Dynamic Provider counts. The backend seeds these from its supplier registry
  // (facets.service.ts), so the keys ARE the registered supplier codes — which
  // is what makes the supplier list below data-driven rather than a hardcoded pair.
  const providerCounts = useMemo(() => {
    if (facets && facets.providerCounts) return facets.providerCounts;
    // No facets (older response, or a cache miss): fall back to whatever the
    // results themselves report. Shows only suppliers that returned a hotel.
    const counts: Record<string, number> = {};
    hotels.forEach((h) => {
      if (h.source) {
        counts[h.source] = (counts[h.source] || 0) + 1;
      }
    });
    return counts;
  }, [hotels, facets]);

  // Dynamic Star Rating counts and list
  const starRatingCounts = useMemo(() => {
    if (facets && facets.starRatingCounts) return facets.starRatingCounts;
    const counts: Record<number, number> = {};
    hotels.forEach((h) => {
      const rating = h.starRating || 0;
      const r = Math.round(Number(rating));
      if (r >= 1 && r <= 5) {
        counts[r] = (counts[r] || 0) + 1;
      }
    });
    return counts;
  }, [hotels, facets]);

  const availableStars = useMemo(() => {
    return Object.keys(starRatingCounts)
      .map(Number)
      .sort((a, b) => b - a);
  }, [starRatingCounts]);

  // Dynamic Property Type (Hotel Category) counts and list
  const propertyTypeCounts = useMemo(() => {
    if (facets && facets.propertyTypeCounts) return facets.propertyTypeCounts;
    const counts: Record<string, number> = {};
    hotels.forEach((h) => {
      const label = getPropertyTypeLabel(h);
      if (label) {
        counts[label] = (counts[label] || 0) + 1;
      }
    });
    return counts;
  }, [hotels, facets]);

  const propertyTypesList = useMemo(() => {
    return Object.keys(propertyTypeCounts).sort();
  }, [propertyTypeCounts]);

  // Dynamic Amenity counts and lists
  const allAmenitiesWithCounts = useMemo(() => {
    if (facets && facets.amenityCounts) {
      return Object.entries(facets.amenityCounts as Record<string, number>).map(([name, count]) => ({ name, count }));
    }
    const counts: Record<string, number> = {};
    hotels.forEach((h) => {
      const parsed = parseAmenities(h.amenities);
      parsed.forEach((amenity) => {
        const normalized = amenity
          .trim()
          .split(/\s+/)
          .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
          .join(' ');
        if (normalized) {
          counts[normalized] = (counts[normalized] || 0) + 1;
        }
      });
    });
    return Object.entries(counts).map(([name, count]) => ({ name, count }));
  }, [hotels, facets]);

  const filteredAmenitiesList = useMemo(() => {
    let list = allAmenitiesWithCounts;
    if (amenitySearch.trim()) {
      const query = amenitySearch.toLowerCase();
      list = list.filter((item) => item.name.toLowerCase().includes(query));
    }
    return list.sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
  }, [allAmenitiesWithCounts, amenitySearch]);

  // Dynamic Meal Plan/Board counts from hotelBoards and mealBasis (works for both RG and TJ)
  const mealTypeCounts = useMemo(() => {
    if (facets && facets.mealTypeCounts) return facets.mealTypeCounts;
    const counts: Record<string, number> = {};
    hotels.forEach((h) => {
      (h.hotelBoards || []).forEach((board) => {
        if (typeof board === 'string' && board.trim()) {
          const label = board
            .trim()
            .split(' ')
            .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
            .join(' ');
          counts[label] = (counts[label] || 0) + 1;
        }
      });
      if (h.mealBasis && typeof h.mealBasis === 'string' && h.mealBasis.trim()) {
        const label = h.mealBasis
          .trim()
          .split(' ')
          .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
          .join(' ');
        counts[label] = (counts[label] || 0) + 1;
      }
    });
    return counts;
  }, [hotels, facets]);

  const displayMealPlans = useMemo(() => {
    const standard = [
      'Room Only',
      'Breakfast Included',
      'Half Board',
      'Full Board',
      'All Inclusive',
    ];
    const dynamicMeals = Object.keys(mealTypeCounts);
    const all = [...standard];
    dynamicMeals.forEach((meal) => {
      if (!all.includes(meal)) {
        all.push(meal);
      }
    });
    return all.filter((meal) => (mealTypeCounts[meal] || 0) > 0);
  }, [mealTypeCounts]);

  // Sync state from activeFilters when they change externally (e.g. on reset or clear)
  useEffect(() => {
    if (!activeFilters) return;

    // Price range sync — only reset checkboxes on a true external reset ([0,0]).
    // Do NOT reverse-map [min,max] → checkbox IDs on every filter change: that
    // mapping is lossy and would incorrectly re-check boxes the user just unchecked.
    const priceRange = activeFilters.priceRange || [0, 0];
    if (priceRange[0] === 0 && priceRange[1] === 0) {
      setSelectedPrices([]);
      filterStateRef.current.prices = [];
    }

    // Star rating sync
    setSelectedStars(activeFilters.starRatings || []);

    // Hotel categories sync (sync propertyTypes array directly now)
    setSelectedCategories(activeFilters.propertyTypes || []);

    // Amenities sync
    setSelectedAmenities(activeFilters.amenities || []);

    // Meal plans sync
    setSelectedMealPlans(activeFilters.mealTypes || []);

    // Providers sync
    setSelectedProviders(activeFilters.providers || []);

    filterStateRef.current = {
      prices: filterStateRef.current.prices,
      stars: activeFilters.starRatings || [],
      categories: activeFilters.propertyTypes || [],
      amenities: activeFilters.amenities || [],
      mealPlans: activeFilters.mealTypes || [],
      providers: activeFilters.providers || [],
    };
  }, [activeFilters]);

  const toggle = (list: string[], item: string) =>
    list.includes(item) ? list.filter((x) => x !== item) : [...list, item];

  const applyChanges = () => {
    const prices = filterStateRef.current.prices;
    const starRatings = filterStateRef.current.stars;
    const categories = filterStateRef.current.categories;
    const amenitiesList = filterStateRef.current.amenities;
    const mealPlans = filterStateRef.current.mealPlans;
    const providers = filterStateRef.current.providers;

    // 1. Calculate price range from selected dynamic buckets
    // Store per-night [min, max] from the bucket boundaries — these are compared
    // against per-night hotel prices in filteredHotels (client-side).
    let priceRanges: Array<[number, number]> = [];
    if (prices.length > 0) {
      const selectedBuckets = priceBuckets.filter((b) => prices.includes(b.id));
      if (selectedBuckets.length > 0) {
        priceRanges = selectedBuckets.map((b) => [b.min, b.max] as [number, number]);
      }
    }

    // 2. Calculate property types
    const propertyTypes = categories;

    // 3. Calculate amenities
    const amenities = amenitiesList;

    const updater = (prevFilters: FilterState): FilterState => ({
      ...prevFilters,
      starRatings,
      priceRange: priceRanges.length > 0 ? priceRanges[0] : [0, 0],
      priceRanges,
      mealTypes: mealPlans,
      propertyTypes,
      amenities,
      providers,
    });

    // We cast to any because onFilterChange might not be typed to accept an updater,
    // but we know setActiveFilters in HotelSearchPage accepts it.
    (onFilterChange as any)?.(updater);
  };

  const handlePriceToggle = (id: string) => {
    const next = toggle(filterStateRef.current.prices, id);
    filterStateRef.current.prices = next;
    setSelectedPrices(next);
    applyChanges();
  };

  const handleCategoryToggle = (id: string) => {
    const next = toggle(filterStateRef.current.categories, id);
    filterStateRef.current.categories = next;
    setSelectedCategories(next);
    applyChanges();
  };

  const handleAmenityToggle = (id: string) => {
    const next = toggle(filterStateRef.current.amenities, id);
    filterStateRef.current.amenities = next;
    setSelectedAmenities(next);
    applyChanges();
  };

  const handleMealPlanToggle = (id: string) => {
    const next = toggle(filterStateRef.current.mealPlans, id);
    filterStateRef.current.mealPlans = next;
    setSelectedMealPlans(next);
    applyChanges();
  };

  const handleStarToggle = (star: number) => {
    const next = filterStateRef.current.stars.includes(star)
      ? filterStateRef.current.stars.filter((s) => s !== star)
      : [...filterStateRef.current.stars, star];
    filterStateRef.current.stars = next;
    setSelectedStars(next);
    applyChanges();
  };

  const handleProviderToggle = (id: string) => {
    const next = toggle(filterStateRef.current.providers, id);
    filterStateRef.current.providers = next;
    setSelectedProviders(next);
    applyChanges();
  };

  const handleClearAll = () => {
    setSelectedPrices([]);
    setSelectedStars([]);
    setSelectedCategories([]);
    setSelectedAmenities([]);
    setSelectedMealPlans([]);
    setSelectedProviders([]);
    filterStateRef.current = {
      prices: [],
      stars: [],
      categories: [],
      amenities: [],
      mealPlans: [],
      providers: [],
    };
    onClearLocations?.();

    const cleared: FilterState = {
      starRatings: [],
      priceRange: [0, 0],
      mealTypes: [],
      propertyTypes: [],
      amenities: [],
      searchText: '',
      showOnlyAltDeals: false,
      providers: [],
    };
    onFilterChange?.(cleared);
  };

  // Compute applied filters for chips
  const appliedChips = useMemo(() => {
    const chips: { label: string; id: string | number; type: string }[] = [];
    selectedLocations.forEach((loc) => chips.push({ label: loc, id: loc, type: 'location' }));
    selectedPrices.forEach((p) => {
      const bucket = priceBuckets.find((b) => b.id === p);
      if (bucket) chips.push({ label: bucket.label, id: p, type: 'price' });
    });
    selectedStars.forEach((s) => chips.push({ label: `${s} Star`, id: s, type: 'star' }));
    selectedCategories.forEach((c) => chips.push({ label: c, id: c, type: 'category' }));
    selectedAmenities.forEach((a) => chips.push({ label: a, id: a, type: 'amenity' }));
    selectedMealPlans.forEach((m) => chips.push({ label: m, id: m, type: 'meal' }));
    selectedProviders.forEach((p) =>
      chips.push({ label: providerLabel(p), id: p, type: 'provider' }),
    );
    return chips;
  }, [
    selectedLocations,
    selectedPrices,
    selectedStars,
    selectedCategories,
    selectedAmenities,
    selectedMealPlans,
    selectedProviders,
  ]);

  const removeChip = (chip: { label: string; id: string | number; type: string }) => {
    if (chip.type === 'location') onLocationToggle?.(String(chip.id));
    if (chip.type === 'price') handlePriceToggle(String(chip.id));
    if (chip.type === 'star') handleStarToggle(Number(chip.id));
    if (chip.type === 'category') handleCategoryToggle(String(chip.id));
    if (chip.type === 'amenity') handleAmenityToggle(String(chip.id));
    if (chip.type === 'meal') handleMealPlanToggle(String(chip.id));
    if (chip.type === 'provider') handleProviderToggle(String(chip.id));
  };

  const suggestedFilters = [
    { label: '5 Star', type: 'star', id: 5 },
    { label: '4 Star', type: 'star', id: 4 },
    { label: 'Breakfast Included', type: 'meal', id: 'Breakfast Included' },
    { label: 'Free Wi-Fi', type: 'amenity', id: 'Free Wi-Fi' },
    { label: 'Unmarried Couples Allowed', type: 'amenity', id: 'Unmarried Couples Allowed' },
  ];

  const validSuggested = suggestedFilters.filter((s) => {
    if (s.type === 'star') return starRatingCounts[s.id as number] > 0;
    if (s.type === 'meal') return mealTypeCounts[s.id as string] > 0;
    if (s.type === 'amenity')
      return allAmenitiesWithCounts.some(
        (a) => a.name.toLowerCase() === (s.id as string).toLowerCase() && a.count > 0,
      );
    return false;
  });

  if (isLoading) return <SkeletonHotelFilters />;

  return (
    <div className="w-full lg:w-[280px] flex flex-col select-none">
      {/* Header */}
      <div className="flex justify-between items-center mb-6 px-1">
        <h3 className="font-bold text-gray-900 text-[18px]">Filters</h3>
        <button
          onClick={handleClearAll}
          className="text-[#008cff] text-[13px] font-bold hover:underline uppercase"
        >
          Clear All
        </button>
      </div>

      {/* Map Widget */}
      {hotels.some((h) => h.latitude && h.longitude) &&
        (googleMapsApiKey ? (
          <div
            onClick={() => setIsMapOpen(true)}
            className="relative w-full h-24 rounded-lg overflow-hidden border border-gray-200 cursor-pointer group flex flex-col justify-end p-2 mb-5"
          >
            <img
              src={`https://maps.googleapis.com/maps/api/staticmap?center=${hotels.find((h) => h.latitude)?.latitude},${hotels.find((h) => h.longitude)?.longitude}&zoom=13&size=600x400&maptype=satellite&key=${googleMapsApiKey}`}
              alt="Satellite Map Background"
              className="absolute inset-0 w-full h-full object-cover opacity-80 group-hover:scale-110 transition-transform duration-700 bg-blue-50"
            />
            <button className="relative z-10 bg-white text-[#008cff] font-extrabold border border-[#008cff] rounded px-3 py-1.5 text-[11px] shadow-sm uppercase tracking-wider hover:bg-[#f0f8ff] transition w-full flex items-center justify-center gap-1.5">
              EXPLORE ON MAP <FaMapMarkerAlt size={12} />
            </button>
          </div>
        ) : (
          <div className="w-full h-24 rounded-lg border border-gray-200 bg-gray-50 flex items-center justify-center mb-5">
            <span className="text-gray-500 text-[13px] font-medium">Map preview unavailable</span>
          </div>
        ))}

      {/* ── Applied Filters ── */}
      {appliedChips.length > 0 && (
        <div className="w-full pb-4 flex flex-col gap-3">
          <div className="flex justify-between items-center">
            <h4
              className="font-bold text-[15px] text-gray-900"
              style={{ fontFamily: 'Inter, sans-serif' }}
            >
              Applied Filters
            </h4>
          </div>
          <div className="flex flex-wrap gap-2">
            {appliedChips.map((chip) => (
              <div
                key={`${chip.type}-${chip.id}`}
                className="flex items-center gap-1.5 bg-blue-50 border border-blue-200 text-blue-700 px-2.5 py-1 rounded-full text-[12px] font-medium"
              >
                {chip.label}
                <button
                  onClick={() => removeChip(chip)}
                  className="text-blue-500 hover:text-blue-700 focus:outline-none"
                >
                  <FaTimes size={10} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Suggested For You ── */}
      {validSuggested.length > 0 && (
        <div className="w-full py-4 border-t border-gray-200 flex flex-col gap-3">
          <h4
            className="font-bold text-[15px] text-gray-900 mb-1"
            style={{ fontFamily: 'Inter, sans-serif' }}
          >
            Suggested For You
          </h4>
          <div className="flex flex-col gap-3">
            {validSuggested.map((opt) => {
              let checked = false;
              let onChange = () => { };
              let count = 0;

              if (opt.type === 'star') {
                checked = selectedStars.includes(opt.id as number);
                onChange = () => handleStarToggle(opt.id as number);
                count = starRatingCounts[opt.id as number] || 0;
              } else if (opt.type === 'meal') {
                checked = selectedMealPlans.includes(opt.id as string);
                onChange = () => handleMealPlanToggle(opt.id as string);
                count = mealTypeCounts[opt.id as string] || 0;
              } else if (opt.type === 'amenity') {
                checked = selectedAmenities.includes(opt.id as string);
                onChange = () => handleAmenityToggle(opt.id as string);
                const am = allAmenitiesWithCounts.find(
                  (a) => a.name.toLowerCase() === (opt.id as string).toLowerCase(),
                );
                count = am ? am.count : 0;
              }

              return (
                <label
                  key={`${opt.type}-${opt.id}`}
                  className="flex items-center gap-3 cursor-pointer group"
                  style={{ fontFamily: 'Inter, sans-serif' }}
                >
                  <span
                    className={`w-4 h-4 rounded-[3px] border flex items-center justify-center shrink-0 transition-all duration-150 ${checked ? 'bg-[#008cff] border-[#008cff]' : 'border-gray-400 bg-white group-hover:border-[#008cff]'}`}
                  >
                    {checked && (
                      <svg
                        className="w-2.5 h-2.5 text-white"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={3}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                    )}
                  </span>
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={onChange}
                    className="sr-only"
                  />
                  <span
                    className={`text-[14px] transition-colors ${checked ? 'text-gray-900 font-medium' : 'text-gray-700'}`}
                  >
                    {opt.label}
                  </span>
                </label>
              );
            })}
          </div>
        </div>
      )}

      {/* ── 1. Price Range (Dynamic) ── */}
      <div className="w-full py-4 border-t border-gray-200 flex flex-col gap-3">
        <h4
          className="font-bold text-[15px] text-gray-900 mb-1"
          style={{ fontFamily: 'Inter, sans-serif' }}
        >
          Price Range
        </h4>
        {priceBuckets.length === 0 ? (
          <p className="text-gray-400 text-[13px]">No prices available</p>
        ) : (
          priceBuckets.map((bucket) => {
            const checked = selectedPrices.includes(bucket.id);
            return (
              <label
                key={bucket.id}
                className="flex items-center gap-3 cursor-pointer group"
                style={{ fontFamily: 'Inter, sans-serif' }}
              >
                <span
                  className={`w-4 h-4 rounded-[3px] border flex items-center justify-center shrink-0 transition-all duration-150 ${checked ? 'bg-[#008cff] border-[#008cff]' : 'border-gray-400 bg-white group-hover:border-[#008cff]'}`}
                >
                  {checked && (
                    <svg
                      className="w-2.5 h-2.5 text-white"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={3}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  )}
                </span>
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => handlePriceToggle(bucket.id)}
                  className="sr-only"
                />
                <span
                  className={`text-[14px] transition-colors ${checked ? 'text-gray-900 font-medium' : 'text-gray-700'}`}
                >
                  {bucket.label}
                </span>
              </label>
            );
          })
        )}
      </div>

      {/* ── Top Locations ── */}
      {topLocations && topLocations.length > 0 && (
        <div className="w-full py-4 border-t border-gray-200 flex flex-col gap-3">
          <h4
            className="font-bold text-[15px] text-gray-900 mb-1"
            style={{ fontFamily: 'Inter, sans-serif' }}
          >
            Top Locations
          </h4>
          <div className="flex flex-col gap-3">
            {topLocations.slice(0, showAllLocations ? topLocations.length : 5).map((loc) => {
              const checked = selectedLocations.includes(loc.name);
              return (
                <label
                  key={loc.name}
                  className="flex items-center gap-3 cursor-pointer group"
                  style={{ fontFamily: 'Inter, sans-serif' }}
                >
                  <span
                    className={`w-4 h-4 rounded-[3px] border flex items-center justify-center shrink-0 transition-all duration-150 ${checked ? 'bg-[#008cff] border-[#008cff]' : 'border-gray-400 bg-white group-hover:border-[#008cff]'}`}
                  >
                    {checked && (
                      <svg
                        className="w-2.5 h-2.5 text-white"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={3}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                    )}
                  </span>
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => onLocationToggle?.(loc.name)}
                    className="sr-only"
                  />
                  <span
                    className={`text-[14px] truncate transition-colors ${checked ? 'text-gray-900 font-medium' : 'text-gray-700'}`}
                    title={cleanLocationLabel(loc.name)}
                  >
                    {loc.name}
                  </span>
                </label>
              );
            })}
          </div>
          {topLocations.length > 5 && (
            <button
              onClick={() => setShowAllLocations(!showAllLocations)}
              className="text-[#008cff] text-[13px] font-medium text-left mt-1 hover:underline shrink-0"
            >
              {showAllLocations ? '- Show Less' : `+ ${topLocations.length - 5} More`}
            </button>
          )}
          {selectedLocations.length > 0 && (
            <button
              onClick={onClearLocations}
              className="text-gray-500 text-[12px] hover:underline text-left mt-1 shrink-0"
            >
              Clear locations
            </button>
          )}
        </div>
      )}

      {/* ── 2. Star Category ── */}
      <div className="w-full py-4 border-t border-gray-200 flex flex-col gap-3">
        <h4
          className="font-bold text-[15px] text-gray-900 mb-1"
          style={{ fontFamily: 'Inter, sans-serif' }}
        >
          Star Category
        </h4>
        {availableStars.length === 0 ? (
          <p className="text-gray-400 text-[13px]">No ratings available</p>
        ) : (
          availableStars.map((star) => {
            const checked = selectedStars.includes(star);
            return (
              <label
                key={star}
                className="flex items-center gap-3 cursor-pointer group"
                style={{ fontFamily: 'Inter, sans-serif' }}
              >
                <span
                  className={`w-4 h-4 rounded-[3px] border flex items-center justify-center shrink-0 transition-all duration-150 ${checked ? 'bg-[#008cff] border-[#008cff]' : 'border-gray-400 bg-white group-hover:border-[#008cff]'}`}
                >
                  {checked && (
                    <svg
                      className="w-2.5 h-2.5 text-white"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={3}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  )}
                </span>
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => handleStarToggle(star)}
                  className="sr-only"
                />
                <span
                  className={`text-[14px] flex items-center gap-1 transition-colors ${checked ? 'text-gray-900 font-medium' : 'text-gray-700'}`}
                >
                  {[...Array(star)].map((_, i) => (
                    <FaStar key={i} className="text-amber-400 w-3 h-3" />
                  ))}
                </span>
              </label>
            );
          })
        )}
      </div>

      {/* ── 3. Stay Type ── */}
      <div className="w-full py-4 border-t border-gray-200 flex flex-col gap-3">
        <h4
          className="font-bold text-[15px] text-gray-900 mb-1"
          style={{ fontFamily: 'Inter, sans-serif' }}
        >
          Property Type
        </h4>
        <div className="flex flex-col gap-3">
          {propertyTypesList.length === 0 ? (
            <p className="text-gray-400 text-[13px]">No stay types available</p>
          ) : (
            propertyTypesList
              .slice(0, showAllStayTypes ? propertyTypesList.length : 5)
              .map((type) => {
                const checked = selectedCategories.includes(type);
                return (
                  <label
                    key={type}
                    className="flex items-center gap-3 cursor-pointer group"
                    style={{ fontFamily: 'Inter, sans-serif' }}
                  >
                    <span
                      className={`w-4 h-4 rounded-[3px] border flex items-center justify-center shrink-0 transition-all duration-150 ${checked ? 'bg-[#008cff] border-[#008cff]' : 'border-gray-400 bg-white group-hover:border-[#008cff]'}`}
                    >
                      {checked && (
                        <svg
                          className="w-2.5 h-2.5 text-white"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={3}
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                      )}
                    </span>
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => handleCategoryToggle(type)}
                      className="sr-only"
                    />
                    <span
                      className={`text-[14px] transition-colors ${checked ? 'text-gray-900 font-medium' : 'text-gray-700'}`}
                    >
                      {type}
                    </span>
                  </label>
                );
              })
          )}
        </div>
        {propertyTypesList.length > 5 && (
          <button
            onClick={() => setShowAllStayTypes(!showAllStayTypes)}
            className="text-[#008cff] text-[13px] font-medium text-left mt-1 hover:underline shrink-0"
          >
            {showAllStayTypes ? '- Show Less' : `+ ${propertyTypesList.length - 5} More`}
          </button>
        )}
      </div>

      {/* ── 4. Amenities ── */}
      <div className="w-full py-4 border-t border-gray-200 flex flex-col gap-3">
        <h4
          className="font-bold text-[15px] text-gray-900 mb-1"
          style={{ fontFamily: 'Inter, sans-serif' }}
        >
          Amenities
        </h4>
        <div className="relative mb-1 shrink-0">
          <input
            type="text"
            placeholder="Search amenities..."
            value={amenitySearch}
            onChange={(e) => setAmenitySearch(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 text-[13px] border border-gray-200 rounded focus:outline-none focus:border-[#008cff] bg-gray-50"
            style={{ fontFamily: 'Inter, sans-serif' }}
          />
          <FaSearch className="absolute left-2.5 top-2.5 text-gray-400 w-3 h-3" />
        </div>
        <div className="flex flex-col gap-3">
          {filteredAmenitiesList.length === 0 ? (
            <p className="text-gray-400 text-[13px]">No amenities found</p>
          ) : (
            filteredAmenitiesList
              .slice(0, showAllAmenities || amenitySearch ? filteredAmenitiesList.length : 6)
              .map((opt) => {
                const checked = selectedAmenities.includes(opt.name);
                return (
                  <label
                    key={opt.name}
                    className="flex items-center gap-3 cursor-pointer group"
                    style={{ fontFamily: 'Inter, sans-serif' }}
                  >
                    <span
                      className={`w-4 h-4 rounded-[3px] border flex items-center justify-center shrink-0 transition-all duration-150 ${checked ? 'bg-[#008cff] border-[#008cff]' : 'border-gray-400 bg-white group-hover:border-[#008cff]'}`}
                    >
                      {checked && (
                        <svg
                          className="w-2.5 h-2.5 text-white"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={3}
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                      )}
                    </span>
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => handleAmenityToggle(opt.name)}
                      className="sr-only"
                    />
                    <span
                      className={`text-[14px] transition-colors truncate pr-2 ${checked ? 'text-gray-900 font-medium' : 'text-gray-700'}`}
                    >
                      {opt.name}
                    </span>
                  </label>
                );
              })
          )}
        </div>
        {filteredAmenitiesList.length > 6 && !amenitySearch && (
          <button
            onClick={() => setShowAllAmenities(!showAllAmenities)}
            className="text-[#008cff] text-[13px] font-medium text-left mt-1 hover:underline shrink-0"
          >
            {showAllAmenities ? '- Show Less' : `+ ${filteredAmenitiesList.length - 6} More`}
          </button>
        )}
      </div>

      {/* ── 5. Meal Plans ── */}
      <div className="w-full py-4 border-t border-b border-gray-200 flex flex-col gap-3 mb-10">
        <h4
          className="font-bold text-[15px] text-gray-900 mb-1"
          style={{ fontFamily: 'Inter, sans-serif' }}
        >
          Meal Plans
        </h4>
        <div className="flex flex-col gap-3">
          {displayMealPlans.slice(0, showAllMealPlans ? displayMealPlans.length : 5).map((meal) => {
            const checked = selectedMealPlans.includes(meal);
            return (
              <label
                key={meal}
                className="flex items-center gap-3 cursor-pointer group"
                style={{ fontFamily: 'Inter, sans-serif' }}
              >
                <span
                  className={`w-4 h-4 rounded-[3px] border flex items-center justify-center shrink-0 transition-all duration-150 ${checked ? 'bg-[#008cff] border-[#008cff]' : 'border-gray-400 bg-white group-hover:border-[#008cff]'}`}
                >
                  {checked && (
                    <svg
                      className="w-2.5 h-2.5 text-white"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={3}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  )}
                </span>
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => handleMealPlanToggle(meal)}
                  className="sr-only"
                />
                <span
                  className={`text-[14px] transition-colors ${checked ? 'text-gray-900 font-medium' : 'text-gray-700'}`}
                >
                  {meal}
                </span>
              </label>
            );
          })}
        </div>
        {displayMealPlans.length > 5 && (
          <button
            onClick={() => setShowAllMealPlans(!showAllMealPlans)}
            className="text-[#008cff] text-[13px] font-medium text-left mt-1 hover:underline shrink-0"
          >
            {showAllMealPlans ? '- Show Less' : `+ ${displayMealPlans.length - 5} More`}
          </button>
        )}
      </div>

      {/* ── Suppliers (Local Only) ── */}
      {window.location.hostname === 'localhost' && (
        <div className="w-full py-4 border-t border-gray-200 flex flex-col gap-3">
          <h4
            className="font-bold text-[15px] text-gray-900 mb-1"
            style={{ fontFamily: 'Inter, sans-serif' }}
          >
            Suppliers (Local Only)
          </h4>
          {/* Suppliers come from the backend registry via providerCounts, so a
              newly registered supplier appears here with no frontend change. */}
          {Object.keys(providerCounts)
            .sort()
            .map((id) => ({ id, label: `${providerLabel(id)} (${id})` }))
            .map((opt) => {
            const checked = selectedProviders.includes(opt.id);
            return (
              <label
                key={opt.id}
                className="flex items-center gap-3 cursor-pointer group"
                style={{ fontFamily: 'Inter, sans-serif' }}
              >
                <span
                  className={`w-4 h-4 rounded-[3px] border flex items-center justify-center shrink-0 transition-all duration-150 ${checked ? 'bg-[#008cff] border-[#008cff]' : 'border-gray-400 bg-white group-hover:border-[#008cff]'}`}
                >
                  {checked && (
                    <svg
                      className="w-2.5 h-2.5 text-white"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={3}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  )}
                </span>
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => handleProviderToggle(opt.id)}
                  className="sr-only"
                />
                <span
                  className={`text-[14px] transition-colors ${checked ? 'text-gray-900 font-medium' : 'text-gray-700'}`}
                >
                  {opt.label}
                </span>
              </label>
            );
          })}
        </div>
      )}

      {/* Map Modal Overlay */}
      <HotelMapModal
        hotels={filteredHotels.length > 0 ? filteredHotels : hotels}
        isOpen={isMapOpen}
        onClose={() => setIsMapOpen(false)}
      />
    </div>
  );
};

export default HotelFilters;
