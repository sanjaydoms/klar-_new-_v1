import { MobileSectionHeader } from './MobileSectionHeader';
import { useState, useEffect, useRef } from 'react';

interface MobilePriceRangeSectionProps {
  isOpen: boolean;
  onToggle: () => void;
  minPrice: number;
  maxPrice: number;
  onMinPriceChange: (value: number) => void;
  onMaxPriceChange: (value: number) => void;
}

export const MobilePriceRangeSection = ({
  isOpen,
  onToggle,
  minPrice,
  maxPrice,
  onMinPriceChange,
  onMaxPriceChange,
}: MobilePriceRangeSectionProps) => {
  const MIN = 0;
  const MAX = 1000000;
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

  const getMinPercent = ((localMin - MIN) / (MAX - MIN)) * 100;
  const getMaxPercent = ((localMax - MIN) / (MAX - MIN)) * 100;

  return (
    <div className="mb-4 pb-4 border-b border-gray-100">
      <MobileSectionHeader
        title="Price Range"
        isOpen={isOpen}
        onToggle={onToggle}
        icon={
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none">
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
        <div className="space-y-4 px-1">
          {/* Min and Max inputs */}
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="block text-xs text-gray-600 mb-1.5">Min (₹)</label>
              <input
                type="number"
                value={localMin}
                onChange={handleMinInputChange}
                placeholder="0"
                min={MIN}
                max={localMax - 1}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
              />
            </div>
            <div className="flex-1">
              <label className="block text-xs text-gray-600 mb-1.5">Max (₹)</label>
              <input
                type="number"
                value={localMax}
                onChange={handleMaxInputChange}
                placeholder="10,00,000"
                min={localMin + 1}
                max={MAX}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
              />
            </div>
          </div>

          {/* Slider */}
          <div className="relative pt-2 pb-1">
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
                  width: 20px;
                  height: 20px;
                  background: #1A1F4D;
                  border: 2px solid white;
                  border-radius: 50%;
                  cursor: pointer;
                  pointer-events: auto;
                  box-shadow: 0 2px 4px rgba(0,0,0,0.2);
                  position: relative;
                  z-index: 3;
                }
                
                input[type="range"]::-webkit-slider-thumb:hover {
                  transform: scale(1.1);
                }
                
                input[type="range"]::-moz-range-thumb {
                  width: 20px;
                  height: 20px;
                  background: #1A1F4D;
                  border: 2px solid white;
                  border-radius: 50%;
                  cursor: pointer;
                  pointer-events: auto;
                  box-shadow: 0 2px 4px rgba(0,0,0,0.2);
                }
                
                input[type="range"]:focus {
                  outline: none;
                }
              `}</style>
            </div>

            <div className="flex justify-between mt-2 text-xs text-gray-500">
              <span>₹{localMin.toLocaleString()}</span>
              <span>₹{localMax.toLocaleString()}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};