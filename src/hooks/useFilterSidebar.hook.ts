import { useState, useEffect } from 'react';

export const useFilters = () => {
  const [primarySort, setPrimarySort] = useState<string>('');
  const [secondarySort, setSecondarySort] = useState<string>('');
  const [selectedStops, setSelectedStops] = useState<string[]>([]);
  const [minPrice, setMinPrice] = useState<number>(0);
  const [maxPrice, setMaxPrice] = useState<number>(100000);
  const [selectedArrivalTimes, setSelectedArrivalTimes] = useState<string[]>([]);
  const [selectedAirlines, setSelectedAirlines] = useState<string[]>([]);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    const hasActiveFilters =
      primarySort !== '' ||
      secondarySort !== '' ||
      selectedStops.length > 0 ||
      minPrice > 0 ||
      maxPrice < 100000 ||
      selectedArrivalTimes.length > 0 ||
      selectedAirlines.length > 0;
    setHasChanges(hasActiveFilters);
  }, [
    primarySort,
    secondarySort,
    selectedStops,
    minPrice,
    maxPrice,
    selectedArrivalTimes,
    selectedAirlines,
  ]);

  const handleSortSelect = (sortKey: string) => {
    if (primarySort === sortKey) {
      setPrimarySort('');
      setSecondarySort('');
    } else {
      setPrimarySort(sortKey);
      if (sortKey === 'PRICE') {
        setSecondarySort('LOW_TO_HIGH');
      } else if (sortKey === 'AIRLINE') {
        setSecondarySort('A_TO_Z');
      } else {
        setSecondarySort('NONE');
      }
    }
  };

  const handleSecondarySortSelect = (value: string) => {
    if (secondarySort === value) {
      setSecondarySort('');
    } else {
      setSecondarySort(value);
    }
  };

  const handleStopChange = (stop: string) => {
    setSelectedStops((prev) =>
      prev.includes(stop) ? prev.filter((s) => s !== stop) : [...prev, stop],
    );
  };

  const handleAirlineChange = (airline: string) => {
    setSelectedAirlines((prev) =>
      prev.includes(airline) ? prev.filter((a) => a !== airline) : [...prev, airline],
    );
  };

  const handleArrivalTimeChange = (time: string) => {
    setSelectedArrivalTimes((prev) =>
      prev.includes(time) ? prev.filter((t) => t !== time) : [...prev, time],
    );
  };

  const resetFilters = () => {
    setPrimarySort('');
    setSecondarySort('');
    setSelectedStops([]);
    setMinPrice(0);
    setMaxPrice(100000);
    setSelectedArrivalTimes([]);
    setSelectedAirlines([]);
  };

  return {
    // State
    primarySort,
    secondarySort,
    selectedStops,
    minPrice,
    maxPrice,
    selectedArrivalTimes,
    selectedAirlines,
    hasChanges,
    // Setters
    setMinPrice,
    setMaxPrice,
    // Handlers
    handleSortSelect,
    handleSecondarySortSelect,
    handleStopChange,
    handleAirlineChange,
    handleArrivalTimeChange,
    resetFilters,
  };
};
