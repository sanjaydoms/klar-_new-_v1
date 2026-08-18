import {
  MapPin,
  Calendar,
  Users,
  Briefcase,
  Search,
  ArrowLeftRight,
  ChevronDown,
  Minus,
  Plus,
  X,
} from 'lucide-react';
import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import CabLocationAutocomplete from '@/features/cabs/components/CabLocationAutocomplete';

interface CabSearchSectionProps {
  initialFrom?: string;
  initialTo?: string;
  initialFromPoints?: { lat: number; long: number; city?: string; country?: string };
  initialToPoints?: { lat: number; long: number; city?: string; country?: string };
}

export default function CabSearchSection({ initialFrom, initialTo, initialFromPoints, initialToPoints }: CabSearchSectionProps) {
  const navigate = useNavigate();
  const [cabMode, setCabMode] = useState<'airport' | 'outstation' | 'local'>('airport');
  const [from, setFrom] = useState(initialFrom || '');
  const [to, setTo] = useState(initialTo || '');
  const [fromPoints, setFromPoints] = useState<{
    lat: number;
    long: number;
    city?: string;
    country?: string;
  } | null>(initialFromPoints || null);
  const [toPoints, setToPoints] = useState<{
    lat: number;
    long: number;
    city?: string;
    country?: string;
  } | null>(initialToPoints || null);
  const [fromCity, setFromCity] = useState<string | undefined>(undefined);
  const [showGlobalError, setShowGlobalError] = useState(false);

  // Initialize with a date in the future (e.g., tomorrow at 10 AM)
  const getLocalISOString = (date: Date) => {
    const offset = date.getTimezoneOffset() * 60000;
    return new Date(date.getTime() - offset).toISOString().slice(0, 16);
  };

  const getMinPickupDate = () => {
    const d = new Date();
    d.setHours(d.getHours() + 2);
    return getLocalISOString(d);
  };

  const getDefaultDate = () => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    d.setHours(10, 0, 0, 0);
    return getLocalISOString(d);
  };

  const [pickupDateRaw, setPickupDateRaw] = useState(getDefaultDate());
  const [returnDateRaw, setReturnDateRaw] = useState('');
  const pickupInputRef = useRef<HTMLInputElement>(null);
  const returnInputRef = useRef<HTMLInputElement>(null);
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [passengers, setPassengers] = useState(1);
  const [bags, setBags] = useState(2);
  const [showPaxDropdown, setShowPaxDropdown] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const formatDateDisplay = (dateStr: string) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date
      .toLocaleDateString('en-GB', {
        weekday: 'short',
        day: '2-digit',
        month: 'short',
        year: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      })
      .replace(/,/g, '');
  };

  const inputWrapperClass = (fieldName: string) =>
    `bg-white rounded-xl flex items-center px-4 py-3 shadow-sm h-[52px] w-full relative border transition-all ${
      focusedField === fieldName
        ? 'border-blue-500 ring-2 ring-blue-50'
        : errors[fieldName] && touched[fieldName]
          ? 'border-red-300 bg-red-50'
          : 'border-gray-100 hover:border-blue-400'
    }`;

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!from.trim()) newErrors.from = 'Pickup location is required.';
    if (!to.trim()) newErrors.to = 'Destination is required.';
    if (!fromPoints) newErrors.from = 'Please select a location from the dropdown.';
    if (!toPoints) newErrors.to = 'Please select a location from the dropdown.';
    if (pickupDateRaw < getMinPickupDate()) {
      newErrors.global = 'Pickup time must be at least 2 hours from now.';
    }
    if (returnDateRaw) {
      const pickupDateObj = new Date(pickupDateRaw);
      const returnDateObj = new Date(returnDateRaw);
      const diffInMinutes = (returnDateObj.getTime() - pickupDateObj.getTime()) / 60000;
      if (diffInMinutes < 30) {
        newErrors.global = 'Return time must be at least 30 minutes after pickup time.';
      }
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSearch = () => {
    setTouched({ from: true, to: true });
    const isValid = validate();
    if (isValid) {
      const searchParams = {
        journeyType: cabMode === 'airport' ? 'airport_transfer' : cabMode.toLowerCase(),
        tripType: returnDateRaw ? 'roundtrip' : 'oneway',
        pickupDate: pickupDateRaw.replace('T', ' '), // Format: 2025-05-24 10:00
        origin: fromPoints
          ? {
              type: 'location',
              lat: fromPoints.lat.toString(),
              long: fromPoints.long.toString(),
              displayAddress: from,
              address: {
                city: fromPoints.city || '',
                country: fromPoints.country || 'India', // Default to India if not specified
              },
            }
          : null,
        destination: toPoints
          ? {
              type: 'location',
              lat: toPoints.lat.toString(),
              long: toPoints.long.toString(),
              displayAddress: to,
              address: {
                city: toPoints.city || '',
                country: toPoints.country || 'India',
              },
            }
          : null,
        passengers,
        bags,
        from,
        to,
        returnDate: returnDateRaw ? returnDateRaw.replace('T', ' ') : undefined,
      };
      sessionStorage.setItem('cabSearchParams', JSON.stringify(searchParams));
      navigate('/cabs/search');
    } else {
      setShowGlobalError(true);
    }
  };

  const handleSwap = (e: React.MouseEvent) => {
    e.stopPropagation();
    const temp = from;
    const tempCoords = fromPoints;
    const tempCity = fromCity;
    setFrom(to);
    setFromPoints(toPoints);
    setFromCity(undefined); // Reset city context on swap to be safe
    setTo(temp);
    setToPoints(tempCoords);
  };

  return (
    <div className="flex-1 flex flex-col mt-4 relative">
      <input
        type="datetime-local"
        ref={pickupInputRef}
        style={{ position: 'absolute', opacity: 0, width: '1px', height: '1px', zIndex: -1 }}
        value={pickupDateRaw}
        onChange={(e) => setPickupDateRaw(e.target.value)}
        min={getMinPickupDate()}
      />
      <input
        type="datetime-local"
        ref={returnInputRef}
        style={{ position: 'absolute', opacity: 0, width: '1px', height: '1px', zIndex: -1 }}
        value={returnDateRaw}
        onChange={(e) => setReturnDateRaw(e.target.value)}
        min={pickupDateRaw || getLocalISOString(new Date())}
      />
      {/* Global Error Toast */}
      {showGlobalError && (
        <div className="absolute -top-12 right-0 bg-red-100 border border-red-200 text-red-600 px-4 py-2 rounded-lg flex items-center gap-3 shadow-md z-50 animate-in slide-in-from-top-2 duration-300">
          <span className="text-sm font-medium">{errors.global || 'Errors here'}</span>
          <button
            onClick={() => setShowGlobalError(false)}
            className="hover:bg-red-200 p-0.5 rounded transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* MOBILE VIEW */}
      <div className="flex flex-col relative lg:hidden mt-2">
        {/* Cab Mode Selection */}
        <div className="flex items-center gap-4 mb-2 overflow-x-auto pb-2">
          {[
            { id: 'airport', label: 'Airport Transfers' },
            { id: 'outstation', label: 'Outstation' },
            { id: 'local', label: 'Local' },
          ].map((mode) => (
            <label
              key={mode.id}
              className="flex items-center gap-2 cursor-pointer group whitespace-nowrap"
            >
              <div className="relative flex items-center justify-center">
                <input
                  type="radio"
                  name="cabModeMobile"
                  checked={cabMode === mode.id}
                  onChange={() => setCabMode(mode.id as any)}
                  className="w-5 h-5 appearance-none border-2 border-gray-300 rounded-full checked:border-orange-500 transition-all cursor-pointer"
                />
                {cabMode === mode.id && (
                  <div className="absolute w-2.5 h-2.5 bg-orange-500 rounded-full" />
                )}
              </div>
              <span
                className={`text-sm font-medium transition-colors ${cabMode === mode.id ? 'text-gray-900' : 'text-gray-500'}`}
              >
                {mode.label}
              </span>
            </label>
          ))}
        </div>

        <div className="text-[11px] text-orange-600 font-medium mb-3 px-1 italic">
          * Note: {cabMode === 'airport' ? 'Airport transfers require a 2-hour advance booking, and one location should be an airport.' : 'Bookings require a 2-hour advance booking.'}
        </div>

        <div className="grid grid-cols-1 gap-2 items-start mb-2 relative z-[60]">
          <div className="flex flex-col gap-1 w-full">
            <div className={inputWrapperClass('from')}>
              <CabLocationAutocomplete
                value={from}
                onFocus={() => setFocusedField('from')}
                onBlur={() => setFocusedField(null)}
                onChange={(val, details) => {
                  setFrom(val);
                  if (details) {
                    setFromPoints(details);
                    if (details.city) setFromCity(details.city);
                  }
                  if (touched.from) validate();
                }}
                placeholder="Where from?"
              />
            </div>
            {errors.from && touched.from && (
              <p className="text-[11px] text-red-500 font-medium ml-1">{errors.from}</p>
            )}
          </div>

          <div className="flex justify-center -my-3 relative z-10">
            <button
              onClick={handleSwap}
              className="bg-white p-1.5 rounded-full border border-gray-200 shadow-sm text-gray-500"
            >
              <ArrowLeftRight className="w-4 h-4 rotate-90" />
            </button>
          </div>

          <div className="flex flex-col gap-1 w-full">
            <div className={inputWrapperClass('to')}>
              <CabLocationAutocomplete
                value={to}
                contextCity={fromCity}
                onFocus={() => setFocusedField('to')}
                onBlur={() => setFocusedField(null)}
                onChange={(val, details) => {
                  setTo(val);
                  if (details) setToPoints(details);
                  if (touched.to) validate();
                }}
                placeholder="Where to?"
                showLocateMe={false}
              />
            </div>
            {errors.to && touched.to && (
              <p className="text-[11px] text-red-500 font-medium ml-1">{errors.to}</p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 mb-2 relative z-10">
          <div
            onClick={() => (pickupInputRef.current as any)?.showPicker?.()}
            className={`${inputWrapperClass('pickupDate')} flex-col items-start py-2 h-auto`}
          >
            <div className="flex items-center mb-1">
              <span className="text-[11px] text-gray-400 font-bold uppercase tracking-wider">
                Pickup Date
              </span>
            </div>
            <span className="text-[13px] font-bold text-gray-900 truncate w-full">
              {formatDateDisplay(pickupDateRaw) || 'Select Date'}
            </span>
          </div>

          <div
            onClick={() => (returnInputRef.current as any)?.showPicker?.()}
            className={`${inputWrapperClass('returnDate')} flex-col items-start py-2 h-auto`}
          >
            <div className="flex items-center mb-1">
              <span className="text-[11px] text-gray-400 font-bold uppercase tracking-wider">
                Return (Opt)
              </span>
            </div>
            <span
              className={`text-[13px] font-bold truncate w-full ${returnDateRaw ? 'text-gray-900' : 'text-gray-400'}`}
            >
              {returnDateRaw ? formatDateDisplay(returnDateRaw) : 'Select date'}
            </span>
          </div>
        </div>

        <div className="relative mb-4">
          <button
            onClick={() => setShowPaxDropdown(!showPaxDropdown)}
            className={`${inputWrapperClass('passengers')} justify-between text-left`}
          >
            <div className="flex items-center">
              <Users className="w-5 h-5 text-gray-400 shrink-0 mr-3" />
              <span className="text-sm font-bold text-gray-800">
                {passengers} Pass, {bags} Bags
              </span>
            </div>
            <ChevronDown
              className={`w-4 h-4 text-gray-400 transition-transform ${showPaxDropdown ? 'rotate-180' : ''}`}
            />
          </button>
          {showPaxDropdown && (
            <div className="absolute top-[110%] left-0 right-0 bg-white rounded-xl shadow-xl border border-gray-100 p-4 z-50 animate-in fade-in zoom-in duration-200">
              {/* Same dropdown content as before */}
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="flex flex-col">
                    <span className="text-sm font-bold text-gray-900">Passengers</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <button
                      onClick={() => setPassengers(Math.max(1, passengers - 1))}
                      className="w-8 h-8 rounded-full border border-orange-200 flex items-center justify-center text-orange-500 hover:bg-orange-50"
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                    <span className="text-sm font-bold text-gray-900 min-w-[20px] text-center">
                      {passengers}
                    </span>
                    <button
                      onClick={() => setPassengers(Math.min(10, passengers + 1))}
                      className="w-8 h-8 rounded-full border border-orange-200 flex items-center justify-center text-orange-500 hover:bg-orange-50"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex flex-col">
                    <span className="text-sm font-bold text-gray-900">Bags</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <button
                      onClick={() => setBags(Math.max(0, bags - 1))}
                      className="w-8 h-8 rounded-full border border-orange-200 flex items-center justify-center text-orange-500 hover:bg-orange-50"
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                    <span className="text-sm font-bold text-gray-900 min-w-[20px] text-center">
                      {bags}
                    </span>
                    <button
                      onClick={() => setBags(Math.min(10, bags + 1))}
                      className="w-8 h-8 rounded-full border border-orange-200 flex items-center justify-center text-orange-500 hover:bg-orange-50"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <button
                  onClick={() => setShowPaxDropdown(false)}
                  className="w-full bg-orange-500 text-white font-bold py-2.5 rounded-lg mt-2"
                >
                  Done
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-center">
          <button
            onClick={handleSearch}
            className="bg-orange-500 hover:bg-orange-600 text-white font-bold flex items-center gap-2 px-10 py-3 rounded-lg shadow-lg transition-all active:scale-95 whitespace-nowrap"
          >
            <Search className="w-5 h-5" />
            Search Cabs
          </button>
        </div>
      </div>

      {/* DESKTOP VIEW */}
      <div className="hidden lg:flex flex-col items-center relative w-full h-full">
        {/* Cab Mode Selection */}
        <div className="flex items-center justify-start gap-6 mb-2 w-full max-w-[1050px] mx-auto mt-4">
          {[
            { id: 'airport', label: 'Airport Transfers' },
            { id: 'outstation', label: 'Outstation' },
            { id: 'local', label: 'Local' },
          ].map((mode) => (
            <label key={mode.id} className="flex items-center gap-2 cursor-pointer group">
              <div className="relative flex items-center justify-center">
                <input
                  type="radio"
                  name="cabModeDesktop"
                  checked={cabMode === mode.id}
                  onChange={() => setCabMode(mode.id as any)}
                  className="w-4 h-4 appearance-none border border-gray-400 rounded-full checked:border-blue-600 transition-all cursor-pointer"
                />
                {cabMode === mode.id && (
                  <div className="absolute w-2 h-2 bg-blue-600 rounded-full" />
                )}
              </div>
              <span
                className={`text-[15px] font-semibold transition-colors ${cabMode === mode.id ? 'text-[#2c3e50]' : 'text-gray-500 hover:text-gray-800'}`}
              >
                {mode.label}
              </span>
            </label>
          ))}
        </div>

        <div className="text-[12px] text-orange-600 font-medium w-full max-w-[1050px] mx-auto text-left -mt-1 mb-2 pl-1 italic">
          * Note: {cabMode === 'airport' ? 'Airport transfers require a 2-hour advance booking, and one location should be an airport.' : 'Bookings require a 2-hour advance booking.'}
        </div>

        <div
          className="flex items-center justify-between bg-white relative mx-auto w-full max-w-[1050px]"
          style={{
            height: '140px',
            borderRadius: '16px',
            borderWidth: '0.67px',
            borderColor: '#e5d9c5',
            marginTop: '22px',
            boxShadow: '0px 4px 20px rgba(0,0,0,0.05)',
          }}
        >
          {/* From */}
          <div className="w-[26%] px-6 border-r border-[#e5d9c5] h-[80px] flex items-center relative">
            <div className="flex flex-col justify-center h-full w-full">
              <span className="text-[13px] text-gray-500 font-medium mb-1">From</span>
              <CabLocationAutocomplete
                value={from}
                onFocus={() => setFocusedField('from')}
                onBlur={() => setFocusedField(null)}
                onChange={(val, details) => {
                  setFrom(val);
                  if (details) {
                    setFromPoints(details);
                    if (details.city) setFromCity(details.city);
                  }
                  if (touched.from) validate();
                }}
                placeholder="Where from?"
                className="!text-[18px] font-semibold !bg-transparent !py-0.5 !px-1 -ml-1 !h-auto !border-none !shadow-none text-[#2c3e50] focus:!ring-2 focus:!ring-blue-400 focus:!bg-blue-50/50 focus:rounded-md focus:!outline-none transition-all"
              />
            </div>
          </div>

          <div
            onClick={handleSwap}
            className="w-8 h-8 rounded-full border border-[#e5d9c5] flex items-center justify-center absolute left-[22%] bg-white z-10 cursor-pointer shadow-sm hover:bg-gray-50"
          >
            <ArrowLeftRight className="w-4 h-4 text-gray-500" />
          </div>

          {/* To */}
          <div className="w-[26%] px-6 border-r border-[#e5d9c5] h-[80px] flex items-center relative pl-8">
            <div className="flex flex-col justify-center h-full w-full">
              <span className="text-[13px] text-gray-500 font-medium mb-1">To</span>
              <CabLocationAutocomplete
                value={to}
                contextCity={fromCity}
                onFocus={() => setFocusedField('to')}
                onBlur={() => setFocusedField(null)}
                onChange={(val, details) => {
                  setTo(val);
                  if (details) setToPoints(details);
                  if (touched.to) validate();
                }}
                placeholder="Where to?"
                showLocateMe={false}
                className="!text-[18px] font-semibold !bg-transparent !py-0.5 !px-1 -ml-1 !h-auto !border-none !shadow-none text-[#2c3e50] focus:!ring-2 focus:!ring-blue-400 focus:!bg-blue-50/50 focus:rounded-md focus:!outline-none transition-all"
              />
            </div>
          </div>

          {/* Pickup Date */}
          <div
            className="w-[20%] px-4 border-r border-[#e5d9c5] h-[80px] flex items-center relative cursor-pointer"
            onClick={() => (pickupInputRef.current as any)?.showPicker?.()}
          >
            <div className="flex flex-col justify-center h-full w-full">
              <span className="text-[13px] text-gray-500 font-medium mb-1">Pickup Date</span>
              <span className="text-[15px] font-semibold text-[#2c3e50] truncate">
                {formatDateDisplay(pickupDateRaw) || 'Select'}
              </span>
            </div>
          </div>

          {/* Return Date */}
          <div
            className="w-[20%] px-4 border-r border-[#e5d9c5] h-[80px] flex items-center relative cursor-pointer"
            onClick={() => (returnInputRef.current as any)?.showPicker?.()}
          >
            <div className="flex flex-col justify-center h-full w-full">
              <span className="text-[13px] text-gray-500 font-medium mb-1">Return Date</span>
              <div className="flex items-center justify-between w-full">
                <span className="text-[15px] font-semibold text-[#2c3e50] truncate">
                  {returnDateRaw ? formatDateDisplay(returnDateRaw) : 'Optional'}
                </span>
                {returnDateRaw && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setReturnDateRaw('');
                    }}
                    className="text-gray-400 hover:text-gray-600 bg-gray-100 rounded-full p-0.5"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Passengers */}
          <div
            className="w-[16%] px-6 h-[80px] flex items-center relative cursor-pointer"
            onClick={() => setShowPaxDropdown(!showPaxDropdown)}
          >
            <div className="flex flex-col justify-center h-full">
              <span className="text-[13px] text-gray-500 font-medium mb-1">Passengers</span>
              <span className="text-[16px] font-semibold text-[#2c3e50] truncate">
                {passengers} Pax, {bags} Bags
              </span>
            </div>
            {showPaxDropdown && (
              <div
                className="absolute top-[80px] left-0 right-0 bg-white rounded-xl shadow-xl border border-gray-100 p-4 z-50"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-gray-900">Pax</span>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => setPassengers(Math.max(1, passengers - 1))}
                        className="w-6 h-6 rounded-full border flex justify-center items-center"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="w-4 text-center font-bold">{passengers}</span>
                      <button
                        onClick={() => setPassengers(Math.min(10, passengers + 1))}
                        className="w-6 h-6 rounded-full border flex justify-center items-center"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-gray-900">Bags</span>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => setBags(Math.max(0, bags - 1))}
                        className="w-6 h-6 rounded-full border flex justify-center items-center"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="w-4 text-center font-bold">{bags}</span>
                      <button
                        onClick={() => setBags(Math.min(10, bags + 1))}
                        className="w-6 h-6 rounded-full border flex justify-center items-center"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowPaxDropdown(false)}
                    className="w-full bg-[var(--color-brand-red)] hover:bg-[var(--color-brand-red)]/90 text-white py-2 rounded-lg text-sm font-bold"
                  >
                    Done
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Search Button */}
        <button
          onClick={handleSearch}
          className="bg-[var(--color-brand-red)] hover:bg-[var(--color-brand-red)]/90 text-white font-semibold flex items-center justify-center gap-2 rounded-xl shadow-[0_14px_30px_-12px_rgba(224,36,47,0.8)] transition-all duration-200 mx-auto mt-6"
          style={{ width: '190px', height: '46px', position: 'relative', zIndex: 10 }}
        >
          <Search className="w-5 h-5" />
          <span className="text-[16px]">Search Cabs</span>
        </button>
      </div>
    </div>
  );
}
