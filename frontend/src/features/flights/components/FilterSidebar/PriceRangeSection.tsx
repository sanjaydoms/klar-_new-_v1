import { SectionHeader } from './SectionHeader';
import { useState, useEffect, useRef } from 'react';

interface PriceRangeSectionProps {
  isOpen: boolean;
  onToggle: () => void;
  minPrice: number;
  maxPrice: number;
  onMinPriceChange: (value: number) => void;
  onMaxPriceChange: (value: number) => void;
  /** Real fare bounds from the current result set (like TripJack's scale). */
  dataBounds?: { min: number; max: number } | undefined;
}

export const PriceRangeSection = ({
  isOpen,
  onToggle,
  minPrice,
  maxPrice,
  onMinPriceChange,
  onMaxPriceChange,
  dataBounds,
}: PriceRangeSectionProps) => {
  /*
   * The track spans the fares actually on screen. It was hardcoded 0 to
   * 10,00,000 while a domestic search tops out near 90,000, so both handles
   * sat inside the first tenth of the track and dragging did almost nothing.
   * dataBounds is the real range from the current result set.
   */
  const MIN = Math.max(0, Math.floor(dataBounds?.min ?? 0));
  const rawMax = Math.ceil(dataBounds?.max ?? 100000);
  const MAX = rawMax > MIN ? rawMax : MIN + 1000;
  const [localMin, setLocalMin] = useState(minPrice);
  const [localMax, setLocalMax] = useState(maxPrice);
  const sliderRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setLocalMin(minPrice);
    setLocalMax(maxPrice);
  }, [minPrice, maxPrice]);

  const handleMinInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = Number(e.target.value);
    if (value < localMax) {
      setLocalMin(value);
      onMinPriceChange(value);
    }
  };

  const handleMaxInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = Number(e.target.value);
    if (value > localMin) {
      setLocalMax(value);
      onMaxPriceChange(value);
    }
  };

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'min' | 'max') => {
    const value = Number(e.target.value);

    if (type === 'min' && value < localMax) {
      setLocalMin(value);
      onMinPriceChange(value);
    } else if (type === 'max' && value > localMin) {
      setLocalMax(value);
      onMaxPriceChange(value);
    }
  };

  const handleWheel = (e: React.WheelEvent<HTMLInputElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    e.target.addEventListener(
      'wheel',
      (event) => {
        event.preventDefault();
      },
      { passive: false },
    );
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    e.target.removeEventListener('wheel', (event) => {
      event.preventDefault();
    });
  };

  const clampPercent = (value: number) =>
    Math.min(100, Math.max(0, ((value - MIN) / (MAX - MIN)) * 100));
  const getMinPercent = clampPercent(localMin);
  const getMaxPercent = clampPercent(localMax);

  return (
    <div className="mb-5 sm:mb-6 border-b border-gray-100 pb-3 sm:pb-4">
      <SectionHeader
        title="Price Range"
        isOpen={isOpen}
        onToggle={onToggle}
        icon={
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2Z"
              fill="url(#priceGradient)" />
            <path d="M12 6V18M9 9H15M9 15H15"
              stroke="white" strokeWidth="2" strokeLinecap="round" />
            <defs>
              <linearGradient id="priceGradient" x1="0" y1="0" x2="24" y2="24">
                <stop offset="0%" stopColor="#10B981" />
                <stop offset="50%" stopColor="#3B82F6" />
                <stop offset="100%" stopColor="#8B5CF6" />
              </linearGradient>
            </defs>
          </svg>
        }
      />

      {isOpen && (
        <div className="space-y-3 sm:space-y-4 w-full">
          {/* Min and Max inputs in one row */}
          <div className="flex gap-2 sm:gap-3 w-full">
            <div className="flex-1 min-w-0">
              <label className="block text-[10px] sm:text-xs text-gray-600 mb-1">Min (₹)</label>
              <input
                type="number"
                value={localMin}
                onChange={handleMinInputChange}
                onWheel={handleWheel}
                onFocus={handleFocus}
                onBlur={handleBlur}
                placeholder="0"
                min={MIN}
                max={localMax - 1}
                className="w-full px-2 py-1.5 sm:px-3 sm:py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-xs sm:text-sm"
              />
            </div>
            <div className="flex-1 min-w-0">
              <label className="block text-[10px] sm:text-xs text-gray-600 mb-1">Max (₹)</label>
              <input
                type="number"
                value={localMax}
                onChange={handleMaxInputChange}
                onWheel={handleWheel}
                onFocus={handleFocus}
                onBlur={handleBlur}
                placeholder="10,00,000"
                min={localMin + 1}
                max={MAX}
                className="w-full px-2 py-1.5 sm:px-3 sm:py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-xs sm:text-sm"
              />
            </div>
          </div>

          {/* Slider */}
          <div className="relative pt-1 pb-2 w-full">
            <div ref={sliderRef} className="relative w-full h-2 bg-gray-200 rounded-full">
              <div
                className="absolute h-full bg-[#1A1F4D] rounded-full"
                style={{
                  left: `${getMinPercent}%`,
                  right: `${100 - getMaxPercent}%`,
                }}
              />

              <input
                type="range"
                min={MIN}
                max={MAX}
                value={localMin}
                onChange={(e) => handleSliderChange(e, 'min')}
                className="absolute w-full h-2 appearance-none bg-transparent pointer-events-none"
                style={{
                  zIndex: 2,
                  WebkitAppearance: 'none',
                }}
              />

              <input
                type="range"
                min={MIN}
                max={MAX}
                value={localMax}
                onChange={(e) => handleSliderChange(e, 'max')}
                className="absolute w-full h-2 appearance-none bg-transparent pointer-events-none"
                style={{
                  zIndex: 2,
                  WebkitAppearance: 'none',
                }}
              />

              <style>{`
                input[type="range"]::-webkit-slider-thumb {
                  -webkit-appearance: none;
                  appearance: none;
                  width: 14px;
                  height: 14px;
                  background: #1A1F4D;
                  border: 2px solid white;
                  border-radius: 50%;
                  cursor: pointer;
                  pointer-events: auto;
                  box-shadow: 0 2px 4px rgba(0,0,0,0.2);
                  transition: all 0.1s ease;
                  position: relative;
                  z-index: 3;
                }
                
                input[type="range"]::-webkit-slider-thumb:hover {
                  transform: scale(1.1);
                  background: #2A2F6D;
                }
                
                input[type="range"]::-moz-range-thumb {
                  width: 14px;
                  height: 14px;
                  background: #1A1F4D;
                  border: 2px solid white;
                  border-radius: 50%;
                  cursor: pointer;
                  pointer-events: auto;
                  box-shadow: 0 2px 4px rgba(0,0,0,0.2);
                }
                
                input[type="range"]::-moz-range-track {
                  background: transparent;
                  border: none;
                }
                
                input[type="range"]:focus {
                  outline: none;
                }
              `}</style>
            </div>

            <div className="flex justify-between mt-2 text-[10px] sm:text-xs text-gray-500">
              <span>₹{MIN.toLocaleString('en-IN')}</span>
              <span>₹{MAX.toLocaleString('en-IN')}+</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};