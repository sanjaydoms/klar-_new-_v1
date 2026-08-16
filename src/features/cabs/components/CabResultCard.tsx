import React from 'react';
import { Users, Briefcase, Info, Check, ShieldCheck, Star, Car } from 'lucide-react';

interface CabResultCardProps {
  cab: {
    cabId: string;
    vehicleName: string;
    vehicleType: string;
    vehicleCategory?: string;
    provider: string;
    rating?: number | null;
    seats: number;
    bags: number;
    price: number;
    originalPrice?: number;
    tax?: number;
    image: string;
    features: string[];
    cancellationPolicy: string;
    waitingTime?: string;
    fuelType?: string;
  };
  onSelect: (cab: any) => void;
}

export default function CabResultCard({ cab, onSelect }: CabResultCardProps) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden group">
      <div className="flex flex-col md:flex-row p-6 gap-6">
        {/* Car Image Section */}
        <div className="w-full md:w-56 h-40 bg-gray-50 rounded-xl overflow-hidden flex items-center justify-center p-4 relative shrink-0">
          {cab.image ? (
            <img
              src={cab.image}
              alt={cab.vehicleName}
              className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-500"
            />
          ) : (
            <Car className="w-16 h-16 text-gray-300" />
          )}
          {cab.rating != null && (
            <div className="absolute top-2 left-2 px-2 py-1 bg-white/90 backdrop-blur shadow-sm rounded-lg flex items-center gap-1">
              <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
              <span className="text-[10px] font-bold text-gray-700">{cab.rating.toFixed(1)}</span>
            </div>
          )}
        </div>

        {/* Content Section */}
        <div className="flex-1 flex flex-col justify-between">
          <div>
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-3">
              <div>
                <h3 className="text-base sm:text-lg font-bold text-gray-900 group-hover:text-blue-600 transition-colors uppercase tracking-tight">
                  {cab.vehicleName}
                </h3>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest flex flex-wrap items-center gap-x-2 gap-y-1">
                  <span>{cab.vehicleType} {cab.vehicleCategory && `(${cab.vehicleCategory})`}</span> •{' '}
                  <span className="text-blue-500">{cab.provider}</span>
                </p>
              </div>
              <div className="flex flex-row sm:flex-col items-center sm:items-end gap-2 flex-wrap">
                <div className="flex items-center gap-2">
                  {cab.fuelType && (
                    <div className={`flex items-center gap-1 px-2 py-1 rounded-lg ${
                      cab.fuelType.toUpperCase() === 'ELECTRIC' || cab.fuelType.toUpperCase() === 'EV' ? 'bg-blue-50 text-blue-700' :
                      cab.fuelType.toUpperCase() === 'CNG' ? 'bg-green-50 text-green-700' :
                      cab.fuelType.toUpperCase() === 'PETROL' ? 'bg-yellow-50 text-yellow-700' :
                      cab.fuelType.toUpperCase() === 'DIESEL' ? 'bg-gray-100 text-gray-800' :
                      'bg-gray-50 text-gray-600'
                    }`}>
                      <span className="text-[10px] font-bold uppercase">{cab.fuelType === 'ELECTRIC' ? 'EV' : cab.fuelType}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-1 bg-green-50 text-green-700 px-2 py-1 rounded-lg">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span className="text-[10px] font-bold uppercase">Safe Carrier</span>
                  </div>
                </div>
                {cab.waitingTime && (
                  <span className="text-[10px] font-medium text-gray-500 bg-gray-100 px-2 py-1 rounded-lg">
                    {cab.waitingTime}
                  </span>
                )}
              </div>
            </div>

            <div className="flex flex-wrap gap-4 mb-4">
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 rounded-lg border border-gray-100">
                <Users className="w-4 h-4 text-gray-400" />
                <span className="text-xs font-bold text-gray-700">{cab.seats} Seats</span>
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 rounded-lg border border-gray-100">
                <Briefcase className="w-4 h-4 text-gray-400" />
                <span className="text-xs font-bold text-gray-700">{cab.bags} Bags</span>
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 rounded-lg border border-blue-100 max-w-xs">
                <Check className="w-4 h-4 text-blue-500 shrink-0" />
                <span
                  className="text-[11px] font-bold text-blue-700 break-words whitespace-normal"
                  title={cab.cancellationPolicy}
                >
                  {cab.cancellationPolicy}
                </span>
              </div>
            </div>

            {cab.features && cab.features.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-2">
                {cab.features.slice(0, 3).map((feature, idx) => (
                  <span
                    key={idx}
                    className="text-[10px] font-medium text-gray-500 bg-gray-50 px-2 py-1 rounded-md border border-gray-100"
                  >
                    {feature}
                  </span>
                ))}
                {cab.features.length > 3 && (
                  <span className="text-[10px] font-medium text-gray-500 bg-gray-50 px-2 py-1 rounded-md border border-gray-100">
                    +{cab.features.length - 3} more
                  </span>
                )}
              </div>
            )}
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-gray-50 mt-2">
            <div className="flex flex-col">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1">
                Inclusive of Taxes <Info className="w-3 h-3" />
              </p>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-black text-gray-900">
                  ₹{cab.price.toLocaleString()}
                </span>
                {cab.originalPrice && cab.originalPrice > cab.price && (
                  <span className="text-xs font-medium text-gray-400 line-through">
                    ₹{cab.originalPrice.toLocaleString()}
                  </span>
                )}
              </div>
            </div>
            <button
              onClick={() => onSelect(cab)}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-8 py-3 rounded-xl shadow-lg hover:shadow-blue-200 transition-all active:scale-95"
            >
              Book Now
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
