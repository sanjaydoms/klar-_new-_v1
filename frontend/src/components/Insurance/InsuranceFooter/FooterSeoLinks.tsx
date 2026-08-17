import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, Users, X, ArrowRight, Minus, Plus } from 'lucide-react';
import { searchInsurancePackages } from '@/api/insuranceService.api';
import { notifyError } from '@/utils/notify';

interface LinkItem {
  label: string;
  href?: string;
  destinationCode?: string;
}

interface Traveller {
  dob: string;
  age: string;
}

// const ourProducts: LinkItem[] = [
//   { label: 'International Flights', href: '#' },
//   { label: 'Hotels', href: '#' },
//   { label: 'International Hotels', href: '#' },
//   { label: 'Travel Insurance', href: '#' },
//   { label: 'International Travel Insurance', href: '#' },
//   { label: 'Cab Booking', href: '#' },
//   { label: 'Student Travel Insurance', href: '#' },
//   { label: 'Senior Citizen Travel Insurance', href: '#' },
//   { label: 'Baggage Insurance', href: '#' },
//   { label: 'Single Trip Travel Insurance', href: '#' },
// ];

const travelInsuranceFor: LinkItem[] = [
  { label: 'Travel Insurance Dubai', destinationCode: 'AE' },
  { label: 'Travel Insurance Bali', destinationCode: 'ID' },
  { label: 'Travel Insurance Australia', destinationCode: 'AU' },
  { label: 'Travel Insurance Germany', destinationCode: 'DE' },
  { label: 'Travel Insurance Malaysia', destinationCode: 'MY' },
  { label: 'Travel Insurance Japan', destinationCode: 'JP' },
  { label: 'Travel Insurance for Bhutan', destinationCode: 'BT' },
  { label: 'Travel Insurance Maldives', destinationCode: 'MV' },
  { label: 'Travel Insurance Spain', destinationCode: 'ES' },
  { label: 'Travel Insurance Sri Lanka', destinationCode: 'LK' },
  { label: 'Travel Insurance Indonesia', destinationCode: 'ID' },
  { label: 'Travel Insurance Italy', destinationCode: 'IT' },
  { label: 'Travel Insurance New Zealand', destinationCode: 'NZ' },
  { label: 'Travel Insurance for Switzerland', destinationCode: 'CH' },
  { label: 'Travel Insurance for Ireland', destinationCode: 'IE' },
  { label: 'Travel Insurance China', destinationCode: 'CN' },
  { label: 'Travel Insurance for Hong Kong', destinationCode: 'HK' },
  { label: 'Travel Insurance for Nepal', destinationCode: 'NP' },
  { label: 'Travel Insurance for Philippines', destinationCode: 'PH' },
  { label: 'Travel Insurance for Azerbaijan', destinationCode: 'AZ' },
  { label: 'Travel Insurance for France', destinationCode: 'FR' },
  { label: 'Travel Insurance Georgia', destinationCode: 'GE' },
  { label: 'Travel Insurance for Greece', destinationCode: 'GR' },
  { label: 'Travel Insurance for Jamaica', destinationCode: 'JM' },
  { label: 'Travel Insurance for Kenya', destinationCode: 'KE' },
  { label: 'Travel Insurance for Mauritius', destinationCode: 'MU' },
  { label: 'Travel Insurance for Mexico', destinationCode: 'MX' },
  { label: 'Travel Insurance for Netherlands', destinationCode: 'NL' },
  { label: 'Travel Insurance for Oman', destinationCode: 'OM' },
  { label: 'Travel Insurance Poland', destinationCode: 'PL' },
  { label: 'Travel Insurance for Portugal', destinationCode: 'PT' },
  { label: 'Travel Insurance for South Africa', destinationCode: 'ZA' },
  { label: 'Travel Insurance for South Korea', destinationCode: 'KR' },
];

const corporateTravel: LinkItem[] = [
  { label: 'Corporate Travel', href: 'https://corporate.klartravels.com/' },
  { label: 'Corporate Travel Management', href: 'https://corporate.klartravels.com/' },
  { label: 'Corporate Travel Solution', href: 'https://corporate.klartravels.com/' },
  { label: 'Corporate Hotel Booking', href: 'https://corporate.klartravels.com/' },
  { label: 'Corporate Flight Booking', href: 'https://corporate.klartravels.com/' },
];

export const FooterSeoLinks: React.FC = () => {
  const navigate = useNavigate();
  const [selectedDestination, setSelectedDestination] = useState<LinkItem | null>(null);

  // Default dates: Today & +7 Days
  const todayStr = new Date().toISOString().split('T')[0];
  const nextWeekStr = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  const [startDate, setStartDate] = useState(todayStr);
  const [endDate, setEndDate] = useState(nextWeekStr);
  const [travellers, setTravellers] = useState<Traveller[]>([{ dob: '', age: '22' }]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Max DOB calculation (>= 18 years old)
  const refDate = new Date();
  const maxYear = refDate.getFullYear() - 18;
  const maxDobStr = `${maxYear}-${String(refDate.getMonth() + 1).padStart(2, '0')}-${String(refDate.getDate()).padStart(2, '0')}`;

  const calculateAge = (dob: string, refDateStr: string): string => {
    if (!dob) return '';
    const birthDate = new Date(dob);
    const targetDate = refDateStr ? new Date(refDateStr) : new Date();
    let age = targetDate.getFullYear() - birthDate.getFullYear();
    const m = targetDate.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && targetDate.getDate() < birthDate.getDate())) age--;
    return age.toString();
  };

  const handleDestinationClick = (item: LinkItem, e: React.MouseEvent) => {
    e.preventDefault();
    setSelectedDestination(item);
    setErrorMsg(null);
  };

  const handleTravellerCountChange = (count: number) => {
    let updated = [...travellers];
    if (count > updated.length) {
      for (let i = updated.length; i < count; i++) {
        updated.push({ dob: '', age: '22' });
      }
    } else {
      updated = updated.slice(0, count);
    }
    setTravellers(updated);
  };

  const updateTraveller = (index: number, field: keyof Traveller, value: string) => {
    const newDetails = [...travellers];

    if (field === 'dob') {
      if (value) {
        const calculatedAge = parseInt(calculateAge(value, startDate) || '0');
        if (calculatedAge < 18) {
          setErrorMsg('Travellers must be 18 years or older.');
          return;
        }
        newDetails[index].dob = value;
        newDetails[index].age = calculatedAge.toString();
        setErrorMsg(null);
      } else {
        newDetails[index].dob = '';
      }
    }

    if (field === 'age') {
      if (value) {
        const ageNum = parseInt(value);
        if (ageNum < 18) return;

        newDetails[index].age = value;
        const refD = startDate ? new Date(startDate) : new Date();
        const birthYear = refD.getFullYear() - ageNum;
        const month = String(refD.getMonth() + 1).padStart(2, '0');
        const day = String(refD.getDate()).padStart(2, '0');

        newDetails[index].dob = `${birthYear}-${month}-${day}`;
        setErrorMsg(null);
      } else {
        newDetails[index].age = '';
        newDetails[index].dob = '';
      }
    }

    setTravellers(newDetails);
  };

  const handleQuickSearch = async () => {
    if (!selectedDestination) return;

    const hasEmptyDob = travellers.some((t) => !t.dob);
    if (hasEmptyDob) {
      setErrorMsg('Please select or enter the Date of Birth for all travellers.');
      return;
    }

    setLoading(true);

    const payload = {
      isq: {
        sd: startDate,
        ed: endDate,
        cd: '180',
        ict: 'International',
        isc: {
          iri: [{ rkey: selectedDestination.destinationCode || 'US', rt: 'COUNTRY' }],
        },
        iti: travellers.map((t) => ({ age: parseInt(t.age || '22') })),
      },
    };

    try {
      const response = await searchInsurancePackages(payload);
      sessionStorage.setItem('insurance_initial_travellers', JSON.stringify(travellers));
      navigate('/insurance/search', { state: response });
    } catch (err) {
      console.error('Failed to search plans:', err);
      notifyError('Failed to search plans. Please check your data and try again.');
    } finally {
      setLoading(false);
      setSelectedDestination(null);
    }
  };

  return (
    <div className="w-full pb-8 font-sans space-y-10 tracking-tight">
      {/* OUR PRODUCT */}
      {/* <div>
        <h4 className="font-bold text-gray-800 mb-4 text-base sm:text-lg uppercase tracking-wider font-[Roboto]">
          OUR PRODUCT
        </h4>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-x-6 gap-y-3 text-sm sm:text-[15px] leading-snug">
          {ourProducts.map((item, index) => (
            <a
              key={index}
              href={item.href}
              className="text-gray-700 hover:underline hover:decoration-blue-600 hover:text-blue-600 transition-colors"
            >
              {item.label}
            </a>
          ))}
        </div>
      </div> */}

      {/* TRAVEL INSURANCE FOR */}
      <div>
        <h4 className="font-bold text-gray-800 mb-4 text-base sm:text-lg uppercase tracking-wider font-[Roboto]">
          TRAVEL INSURANCE FOR
        </h4>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-x-6 gap-y-3 text-sm sm:text-[15px] leading-snug">
          {travelInsuranceFor.map((item, index) => (
            <a
              key={index}
              href="#"
              onClick={(e) => handleDestinationClick(item, e)}
              className="text-gray-700 hover:underline hover:decoration-blue-600 hover:text-blue-600 transition-colors font-[Roboto]"
            >
              {item.label}
            </a>
          ))}
        </div>
      </div>

      {/* CORPORATE TRAVEL */}
      <div>
        <h4 className="font-bold text-gray-800 mb-4 text-base sm:text-lg uppercase tracking-wider font-[Roboto]">
          CORPORATE TRAVEL
        </h4>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-x-6 gap-y-3 text-sm sm:text-[15px] leading-snug">
          {corporateTravel.map((item, index) => (
            <a
              key={index}
              href={item.href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-700 hover:text-blue-600 hover:underline hover:decoration-blue-600 transition-colors"
            >
              {item.label}
            </a>
          ))}
        </div>
      </div>

      {/* QUICK SEARCH MODAL */}
      {selectedDestination && (
        <div className="fixed inset-0 z-[500] bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-lg relative animate-in fade-in zoom-in-95 duration-150 text-left">
            <button
              onClick={() => setSelectedDestination(null)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
            >
              <X size={20} />
            </button>

            <h3 className="font-bold text-gray-800 text-lg mb-1 font-[Roboto] tracking-wider">
              {selectedDestination.label}
            </h3>
            <p className="text-xs text-gray-500 mb-4 font-[Roboto] tracking-wider">
              Select trip dates and traveller details to view insurance plans
            </p>

            <div className="space-y-4">
              {/* Dates */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-gray-600 block mb-1">Start Date</label>
                  <input
                    type="date"
                    value={startDate}
                    min={todayStr}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full border rounded-xl p-2.5 text-xs outline-none focus:border-blue-500 font-[Roboto] tracking-wider"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-600 block mb-1">End Date</label>
                  <input
                    type="date"
                    value={endDate}
                    min={startDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full border rounded-xl p-2.5 text-xs outline-none focus:border-blue-500 font-[Roboto] tracking-wider"
                  />
                </div>
              </div>

              {/* Number of Travellers Counter */}
              <div className="flex justify-between items-center bg-gray-50 p-3 rounded-xl border border-gray-100">
                <span className="font-bold text-gray-800 text-xs sm:text-sm flex items-center gap-1.5 font-[Roboto] tracking-wider">
                  <Users size={16} /> Number of Travellers
                </span>
                <div className="flex items-center gap-3 border rounded-xl px-2.5 py-1 bg-white">
                  <button
                    type="button"
                    onClick={() => handleTravellerCountChange(Math.max(1, travellers.length - 1))}
                    className="text-gray-500 hover:text-red-600"
                  >
                    <Minus size={14} />
                  </button>
                  <span className="font-bold text-xs w-4 text-center select-none">
                    {travellers.length}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleTravellerCountChange(travellers.length + 1)}
                    className="text-gray-500 hover:text-blue-600"
                  >
                    <Plus size={14} />
                  </button>
                </div>
              </div>

              {errorMsg && (
                <div className="p-2 bg-red-50 border border-red-100 text-red-600 rounded-lg text-xs font-medium">
                  {errorMsg}
                </div>
              )}

              {/* Individual Traveller Inputs */}
              <div className="space-y-3 max-h-[200px] overflow-y-auto pr-1">
                {travellers.map((traveller, index) => (
                  <div key={index} className="p-3 border rounded-xl bg-white space-y-2 border-gray-100 shadow-sm">
                    <p className="text-[10px] font-bold text-[#600508] uppercase tracking-wide">
                      Traveller {index + 1}
                    </p>
                    <div className="flex items-center gap-2">
                      <div className="flex-1">
                        <label className="text-[10px] font-medium text-gray-500 block mb-0.5">
                          Date of Birth
                        </label>
                        <input
                          type="date"
                          value={traveller.dob}
                          max={maxDobStr}
                          onChange={(e) => updateTraveller(index, 'dob', e.target.value)}
                          className="w-full bg-gray-50 border rounded-lg p-1.5 text-xs outline-none focus:border-blue-500"
                        />
                      </div>
                      <span className="text-[10px] font-bold text-gray-400 self-end pb-2">OR</span>
                      <div className="w-28">
                        <label className="text-[10px] font-medium text-gray-500 block mb-0.5">
                          Age
                        </label>
                        <select
                          value={traveller.age}
                          onChange={(e) => updateTraveller(index, 'age', e.target.value)}
                          className="w-full bg-gray-50 border rounded-lg p-1.5 text-xs outline-none focus:border-blue-500"
                        >
                          <option value="">Select</option>
                          {[...Array(83)].map((_, i) => (
                            <option key={i + 18} value={i + 18}>
                              {i + 18} yrs
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <button
                onClick={handleQuickSearch}
                disabled={loading}
                className="w-full mt-2 bg-[#830509] hover:bg-[#600508] text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 text-sm transition-all shadow-md"
              >
                {loading ? 'Searching...' : 'View Plans'} <ArrowRight size={16} />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};