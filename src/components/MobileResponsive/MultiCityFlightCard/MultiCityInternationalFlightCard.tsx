import React from 'react';
import { PlaneTakeoff, PlaneLanding } from 'lucide-react';

interface InternationalCityAirport {
    city: string;
    airportCode: string;
    time: string;
    date: string;
    day: string;
}

interface InternationalFlightLeg {
    legIndex: number;
    flightKey: string;
    airline: string;
    airlineCode: string;
    flightNumber: string;
    cabinClass: string;
    from: InternationalCityAirport;
    to: InternationalCityAirport;
    stops: number;
    duration: string;
    price: number;
}

interface InternationalItinerary {
    itineraryKey: string;
    totalPrice: number;
    legs: InternationalFlightLeg[];
}

interface MultiCityInternationalFlightCardProps {
    itinerary: InternationalItinerary;
    isSelected?: boolean;
    isComplete?: boolean;
    isExpanded?: boolean;
    isSelecting?: boolean;
    onToggleExpand?: (key: string) => void;
    onSelect?: (itinerary: InternationalItinerary) => void;
}

const MultiCityInternationalFlightCard: React.FC<MultiCityInternationalFlightCardProps> = ({
    itinerary,
    isSelected = false,
    isComplete = false,
    isExpanded = false,
    isSelecting = false,
    onToggleExpand,
    onSelect,
}) => {
    // Safety check
    if (!itinerary || !itinerary.legs || itinerary.legs.length === 0) {
        return null;
    }

    const getStopDisplay = (leg: InternationalFlightLeg) => {
        if (leg.stops === 0) return 'Non-stop';
        if (leg.stops === 1) return '1 Stop';
        return `${leg.stops} Stops`;
    };

    const formatPrice = (price: number) => {
        return `₹ ${price.toLocaleString('en-IN')}`;
    };

    const getCabinDisplay = (cabinClass: string) => {
        const cabinMap: Record<string, string> = {
            ECONOMY: 'Economy',
            PREMIUM_ECONOMY: 'Premium Economy',
            BUSINESS: 'Business',
            FIRST: 'First Class',
        };
        return cabinMap[cabinClass] || cabinClass;
    };

    const renderFlightLeg = (leg: InternationalFlightLeg, label: string) => {
        // Safety check for leg data
        if (!leg || !leg.from || !leg.to) {
            return (
                <div className="flex-1">
                    <div className="text-[8px] sm:text-[10px] font-bold text-primary mb-0.5 uppercase">
                        {label}
                    </div>
                    <div className="text-xs text-gray-500">Flight data unavailable</div>
                </div>
            );
        }

        return (
            <div className="flex-1">
                <div className="text-[8px] sm:text-[10px] font-bold text-primary mb-0.5 uppercase">
                    {label}
                </div>

                <div className="flex items-center justify-between mb-0.5">
                    <div>
                        <span className="font-semibold text-gray-800 text-[10px] sm:text-xs">
                            {leg.airline || 'Unknown Airline'}
                        </span>
                        <span className="text-[8px] sm:text-[9px] text-gray-500 ml-1">
                            ({leg.airlineCode || 'N/A'})
                        </span>
                    </div>
                    <span className="text-[6px] sm:text-[7px] bg-blue-100 text-blue-700 px-1 sm:px-1.5 py-0.5 rounded-full font-medium">
                        {getCabinDisplay(leg.cabinClass)}
                    </span>
                </div>

                <div className="flex items-center space-x-1 mb-1 sm:mb-1.5">
                    <span className="text-[8px] sm:text-[9px] text-gray-600">{leg.flightNumber || 'N/A'}</span>
                    <span className="text-gray-400 text-[8px] sm:text-[9px]">•</span>
                    <span className="text-[8px] sm:text-[9px] text-gray-600">{leg.flightKey || 'N/A'}</span>
                </div>

                <div className="mb-0.5">
                    <div className="flex items-center gap-1">
                        <PlaneTakeoff size={12} className="text-primary" />
                        <div className="font-bold text-gray-800 text-xs sm:text-sm">{leg.from.time || 'N/A'}</div>
                    </div>
                    <div className="text-[8px] sm:text-[9px] text-gray-500 font-medium pl-5">
                        {leg.from.airportCode || 'N/A'} • {leg.from.city || 'N/A'}
                    </div>
                    <div className="text-[6px] sm:text-[7px] text-gray-400 pl-5">
                        {leg.from.day || ''}, {leg.from.date || ''}
                    </div>
                </div>

                <div className="relative my-0.5 sm:my-1">
                    <div className="border-t border-gray-300"></div>
                    <div className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white px-0.5 sm:px-1">
                        <div className="text-center">
                            <div className="text-[8px] sm:text-[9px] text-gray-400">{leg.duration || 'N/A'}</div>
                            <div className="text-[6px] sm:text-[7px] text-[#EF4444]">
                                {getStopDisplay(leg)}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="text-right mb-0.5 sm:mb-1">
                    <div className="flex items-center justify-end gap-1">
                        <div className="font-bold text-gray-800 text-xs sm:text-sm">{leg.to.time || 'N/A'}</div>
                        <PlaneLanding size={12} className="text-primary" />
                    </div>
                    <div className="text-[8px] sm:text-[9px] text-gray-500 font-medium pr-5">
                        {leg.to.airportCode || 'N/A'} • {leg.to.city || 'N/A'}
                    </div>
                    <div className="text-[6px] sm:text-[7px] text-gray-400 pr-5">
                        {leg.to.day || ''}, {leg.to.date || ''}
                    </div>
                </div>
            </div>
        );
    };

    const handleSelectClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (onSelect && !isSelected && !isComplete && !isSelecting) {
            onSelect(itinerary);
        }
    };

    const handleCardClick = () => {
        if (onToggleExpand) {
            onToggleExpand(itinerary.itineraryKey);
        }
    };

    return (
        <div
            className={`bg-white rounded-xl border ${isSelected || isComplete ? 'border-green-500 border-2' : 'border-[#0A2662]'
                } shadow-lg overflow-hidden hover:shadow-xl transition-shadow relative cursor-pointer`}
            onClick={handleCardClick}
        >
            {isComplete && (
                <div className="absolute top-2 right-2 z-10 bg-green-500 text-white text-[8px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                    ✓ COMPLETE
                </div>
            )}
            {isSelected && !isComplete && (
                <div className="absolute top-2 right-2 z-10 bg-green-500 text-white text-[8px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                    SELECTED
                </div>
            )}

            <div className="p-2 sm:p-3">
                {/* Show first leg as departure */}
                {itinerary.legs[0] && renderFlightLeg(itinerary.legs[0], 'Departure')}

                {/* Show second leg as next leg if exists */}
                {itinerary.legs[1] && (
                    <>
                        <div className="border-t border-gray-200 my-2 sm:my-3"></div>
                        {renderFlightLeg(itinerary.legs[1], `Leg 2`)}
                    </>
                )}

                {/* Show more legs if expanded */}
                {isExpanded && itinerary.legs.length > 2 && (
                    <>
                        {itinerary.legs.slice(2).map((leg, index) => (
                            <React.Fragment key={`${itinerary.itineraryKey}-leg-${index + 3}`}>
                                <div className="border-t border-gray-200 my-2 sm:my-3"></div>
                                {renderFlightLeg(leg, `Leg ${index + 3}`)}
                            </React.Fragment>
                        ))}
                    </>
                )}

                {/* Show total legs count if more than 2 and not expanded */}
                {!isExpanded && itinerary.legs.length > 2 && (
                    <div className="text-center mt-1">
                        <span className="text-[8px] sm:text-[9px] text-blue-600 font-medium">
                            + {itinerary.legs.length - 2} more leg{itinerary.legs.length - 2 > 1 ? 's' : ''} • Click to expand
                        </span>
                    </div>
                )}

                <div className="border-t border-gray-200 my-1 sm:my-2"></div>

                <div className="flex items-center justify-between">
                    <div className="text-[8px] sm:text-[9px] text-gray-500">Total Price</div>
                    <div className="text-right">
                        <div className="font-bold text-[#EF4444] text-sm sm:text-base">
                            {formatPrice(itinerary.totalPrice || 0)}
                        </div>
                        <div className="text-[6px] sm:text-[7px] text-gray-400">PER ADULT</div>
                    </div>
                </div>

                <button
                    onClick={handleSelectClick}
                    disabled={isSelected || isComplete || isSelecting}
                    className={`w-full mt-1 sm:mt-2 ${isSelected || isComplete
                            ? 'bg-green-500 cursor-default'
                            : isSelecting
                                ? 'bg-gray-400 cursor-not-allowed'
                                : 'bg-primary hover:bg-primary/90'
                        } text-white py-1 sm:py-1.5 rounded-md text-[8px] sm:text-[9px] font-medium transition-colors`}
                >
                    {isComplete ? '✓ Complete' : isSelected ? 'Selected' : isSelecting ? 'Selecting...' : 'Select'}
                </button>
            </div>
        </div>
    );
};

export default MultiCityInternationalFlightCard;