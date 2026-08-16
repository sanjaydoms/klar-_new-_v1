import React from 'react';
import { Plane } from 'lucide-react';
import { FlightOption } from '../../types/types.multiCityFlight';
import FlightCard from './FlightCard';

interface FlightListProps {
  currentSegment: number;
  flights: FlightOption[];
  isLoading: boolean;
  selectedFlightId?: string;
  onSelectFlight: (flight: FlightOption) => void;
  onViewDetails: (flight: FlightOption) => void;
  getFlightPrice: (flight: FlightOption) => number;

  // Pagination
  currentPage: number;
  itemsPerPage: number;
  totalFlights: number;
  onPageChange: (page: number) => void;
  onItemsPerPageChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
}

export default function FlightList({
  currentSegment,
  flights,
  isLoading,
  selectedFlightId,
  onSelectFlight,
  onViewDetails,
  getFlightPrice,
  currentPage,
  itemsPerPage,
  totalFlights,
  onPageChange,
  onItemsPerPageChange,
}: FlightListProps) {
  const totalPages = Math.ceil((totalFlights || 0) / itemsPerPage);

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-gray-900">
          Choose Segment {currentSegment + 1} Flight
        </h2>
        <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg shadow-sm border border-gray-100">
          <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
          <span className="text-xs font-bold text-gray-600 truncate">
            {flights.length} Flights Available
          </span>
        </div>
      </div>

      <div className="space-y-4">
        {isLoading ? (
          <div className="bg-white rounded-2xl p-12 text-center shadow-sm border border-gray-100">
            <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600 font-medium">Finding the best flights for you...</p>
          </div>
        ) : flights.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 text-center shadow-sm border border-gray-100">
            <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <Plane className="w-8 h-8 text-gray-300" />
            </div>
            <p className="text-gray-900 font-bold mb-1">No flights found</p>
            <p className="text-gray-500 text-sm">
              Try adjusting your search or search for a different date.
            </p>
          </div>
        ) : (
          <>
            {flights.map((flight) => (
              <FlightCard
                key={flight.flightId}
                flight={flight}
                // The selection is a fare VARIANT of this card, not always its
                // cheapest one.
                isSelected={(flight.variants ?? [flight]).some(
                  (v) => v.flightId === selectedFlightId,
                )}
                onSelect={(chosen) => onSelectFlight(chosen ?? flight)}
                onViewDetails={() => onViewDetails(flight)}
                getFlightPrice={getFlightPrice}
                legIndex={currentSegment}
              />
            ))}

            {/* Pagination Controls */}
            {/* {totalPages > 1 && (
              <div className="flex items-center justify-center gap-4 py-4 bg-white rounded-lg shadow-sm">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-600">Items per page:</span>
                  <select
                    value={itemsPerPage}
                    onChange={onItemsPerPageChange}
                    className="border rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="10">10</option>
                    <option value="20">20</option>
                    <option value="50">50</option>
                  </select>
                </div>

                <div className="text-sm text-gray-600">
                  Page <span className="font-bold">{currentPage}</span> of{' '}
                  <span className="font-bold">{totalPages}</span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => onPageChange(1)}
                    disabled={currentPage === 1}
                    className="p-2 hover:bg-gray-100 rounded-full disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    title="First Page"
                  >
                    <ArrowLeft className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => onPageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="p-2 hover:bg-gray-100 rounded-full disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    title="Previous Page"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>

                  <div className="flex items-center gap-1">
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      let pageNum;
                      if (totalPages <= 5) {
                        pageNum = i + 1;
                      } else if (currentPage <= 3) {
                        pageNum = i + 1;
                      } else if (currentPage >= totalPages - 2) {
                        pageNum = totalPages - 4 + i;
                      } else {
                        pageNum = currentPage - 2 + i;
                      }

                      return (
                        <button
                          key={pageNum}
                          onClick={() => onPageChange(pageNum)}
                          className={`w-8 h-8 rounded-full text-sm font-medium transition-all ${
                            currentPage === pageNum
                              ? 'bg-blue-600 text-white shadow-md'
                              : 'hover:bg-gray-100 text-gray-700'
                          }`}
                        >
                          {pageNum}
                        </button>
                      );
                    })}
                  </div>

                  <button
                    onClick={() => onPageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className="p-2 hover:bg-gray-100 rounded-full disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    title="Next Page"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => onPageChange(totalPages)}
                    disabled={currentPage === totalPages}
                    className="p-2 hover:bg-gray-100 rounded-full disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    title="Last Page"
                  >
                    <ArrowUpCircle className="w-4 h-4 rotate-90" />
                  </button>
                </div>
              </div>
            )} */}
          </>
        )}
      </div>
    </div>
  );
}
