import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  MapPin,
  Users,
  Search,
  Info,
  Clock,
  Minus,
  Plus,
  Loader2,
  X,
  Calendar,
  Upload,
} from 'lucide-react';
import airportData from 'airport-codes/airports.json';
import { searchInsurancePackages } from '@/api/insuranceService.api';

// --- ISO Country Setup ---
import countries from 'i18n-iso-countries';
import enLocale from 'i18n-iso-countries/langs/en.json';
import { notifyError, notifyInfo } from '@/utils/notify';
countries.registerLocale(enLocale);

// --- Types ---
export interface Airport {
  city: string;
  code: string;
  country: string;
  countryIso: string;
  name: string;
}

type TabType = 'International' | 'Annual Multi Trip' | 'Students' | 'Group';

interface Traveller {
  dob: string;
  age: string;
}

interface FormData {
  destination: string;
  destinationCode: string;
  startDate: string;
  endDate: string;
  travellerDetails: Traveller[];
  region: string;
  duration: string;
  coverageDuration: string;
}

interface FormErrors {
  startDate?: string;
  endDate?: string;
  travellers?: string;
}

const searchAirports = async (query: string): Promise<Airport[]> => {
  if (!query) return [];
  const lowerQuery = query.toLowerCase();

  const results = (airportData as any[])
    .filter((a) => {
      const cityName = (a.city || '').toLowerCase();
      const airportName = (a.name || '').toLowerCase();
      const iataCode = (a.iata || '').toLowerCase();

      return (
        iataCode.includes(lowerQuery) ||
        cityName.includes(lowerQuery) ||
        airportName.includes(lowerQuery)
      );
    })
    .slice(0, 15)
    .map((a) => {
      const iso2 = countries.getAlpha2Code(a.country, 'en');

      return {
        city: a.city || '',
        code: a.iata || '',
        country: a.country || '',
        countryIso: iso2 || 'UN',
        name: a.name || '',
      };
    });

  return results;
};

// --- Autocomplete Component ---
const AirportAutocomplete: React.FC<{
  value: string;
  onSelect: (airport: Airport) => void;
  placeholder?: string;
  isDesktopInline?: boolean;
}> = ({ value, onSelect, placeholder = 'Destination', isDesktopInline = false }) => {
  const [query, setQuery] = useState(value);
  const [suggestions, setSuggestions] = useState<Airport[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => setQuery(value), [value]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node))
        setIsOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSearch = async (text: string) => {
    setQuery(text);
    if (text.length > 1) {
      setLoading(true);
      const data = await searchAirports(text);
      setSuggestions(data);
      setIsOpen(true);
      setLoading(false);
    } else {
      setIsOpen(false);
    }
  };

  if (isDesktopInline) {
    return (
      <div ref={wrapperRef} className="relative w-full">
        <input
          type="text"
          placeholder={placeholder}
          value={query}
          onChange={(e) => handleSearch(e.target.value)}
          className="w-full bg-transparent text-[16px] font-semibold text-[#2c3e50] outline-none placeholder:text-gray-400 placeholder:font-normal truncate"
        />
        {isOpen && (
          <div className="absolute left-[-16px] z-[200] w-[320px] mt-4 bg-white rounded-2xl shadow-2xl overflow-hidden border border-gray-100 text-left">
            <div className="bg-[#1A2B3D] text-white px-4 py-2 flex justify-between items-center text-[11px] font-medium">
              <span>Airports / Cities</span>
              <X
                size={12}
                className="cursor-pointer opacity-70 hover:opacity-100"
                onClick={() => setIsOpen(false)}
              />
            </div>
            <div className="max-h-[250px] overflow-y-auto">
              {loading ? (
                <div className="p-4 flex justify-center">
                  <Loader2 className="animate-spin text-blue-500" size={16} />
                </div>
              ) : suggestions.length > 0 ? (
                suggestions.map((airport) => (
                  <div
                    key={`${airport.code}-${airport.countryIso}`}
                    onClick={() => {
                      onSelect(airport);
                      setIsOpen(false);
                    }}
                    className="px-4 py-2.5 hover:bg-blue-50 cursor-pointer flex flex-col border-b border-gray-50 last:border-0"
                  >
                    <div className="flex items-center gap-1.5 text-xs">
                      <span className="font-bold text-gray-900">{airport.city}</span>
                      <span className="bg-blue-100 text-blue-700 px-1 rounded text-[9px] font-bold uppercase">
                        {airport.code}
                      </span>
                    </div>
                    <span className="text-[10px] text-gray-400 truncate">{airport.name}</span>
                  </div>
                ))
              ) : (
                <div className="p-4 text-center text-gray-400 text-xs italic">
                  No matching results found
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div ref={wrapperRef} className="relative w-full">
      <div className="relative group">
        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
          <MapPin size={20} />
        </div>
        <input
          type="text"
          placeholder={placeholder}
          value={query}
          onChange={(e) => handleSearch(e.target.value)}
          className="w-full bg-[#F3F5F7] p-4 pl-12 rounded-2xl outline-none text-gray-800 border-2 border-transparent focus:border-blue-500 focus:bg-white transition-all shadow-sm"
        />
        <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
      </div>

      {isOpen && (
        <div className="absolute z-[100] w-full mt-2 bg-white rounded-3xl shadow-2xl overflow-hidden border border-gray-100 animate-in slide-in-from-top-2 duration-200">
          <div className="bg-[#1A2B3D] text-white px-5 py-2 flex justify-between items-center text-xs font-medium">
            <span>Search international cities or airports</span>
            <X
              size={14}
              className="cursor-pointer opacity-70 hover:opacity-100"
              onClick={() => setIsOpen(false)}
            />
          </div>

          <div className="max-h-[300px] overflow-y-auto">
            {loading ? (
              <div className="p-10 flex justify-center">
                <Loader2 className="animate-spin text-blue-500" />
              </div>
            ) : suggestions.length > 0 ? (
              suggestions.map((airport) => (
                <div
                  key={`${airport.code}-${airport.countryIso}`}
                  onClick={() => {
                    onSelect(airport);
                    setIsOpen(false);
                  }}
                  className="px-5 py-4 hover:bg-blue-50 cursor-pointer flex items-start gap-4 transition-colors group border-b border-gray-50 last:border-0"
                >
                  <div className="mt-1 bg-blue-100 p-2 rounded-full text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                    <MapPin size={16} fill="currentColor" fillOpacity={0.2} />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-gray-900">{airport.city}</span>
                      <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider">
                        {airport.code}
                      </span>
                      <span className="ml-auto text-[10px] bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded font-bold">
                        {airport.countryIso}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{airport.name}</p>
                    <p className="text-[10px] text-gray-400 font-medium uppercase tracking-tight mt-1">
                      {airport.country}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-8 text-center text-gray-400 text-sm italic">
                No matching results found
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// --- Main Form Component ---
const InsuranceSearchSection: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabType>('International');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showTravellerDropdown, setShowTravellerDropdown] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});

  const todayStr = new Date().toISOString().split('T')[0];

  const [formData, setFormData] = useState<FormData>({
    destination: '',
    destinationCode: '',
    startDate: todayStr,
    endDate: '',
    travellerDetails: [{ dob: '', age: '22' }],
    region: 'Worldwide',
    duration: '30 Days',
    coverageDuration: '180',
  });

  const handleInputChange = (field: keyof FormData, value: string | number) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (field === 'startDate') setErrors((prev) => ({ ...prev, startDate: undefined }));
    if (field === 'endDate') setErrors((prev) => ({ ...prev, endDate: undefined }));
  };

  const handleAirportSelect = (airport: Airport) => {
    setFormData((prev) => ({
      ...prev,
      destination: `${airport.city} (${airport.code})`,
      destinationCode: airport.countryIso,
    }));
  };

  const calculateAge = (dob: string, refDate: string): string => {
    if (!dob) return '';
    const birthDate = new Date(dob);
    const targetDate = refDate ? new Date(refDate) : new Date();
    let age = targetDate.getFullYear() - birthDate.getFullYear();
    const m = targetDate.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && targetDate.getDate() < birthDate.getDate())) age--;
    return age.toString();
  };

  const handleTravellerCountChange = (count: number) => {
    let newDetails = [...formData.travellerDetails];
    if (count > newDetails.length) {
      for (let i = newDetails.length; i < count; i++) {
        newDetails.push({ dob: '', age: '22' });
      }
    } else {
      newDetails = newDetails.slice(0, count);
    }
    setFormData((prev) => ({ ...prev, travellerDetails: newDetails }));
  };

  const updateTraveller = (index: number, field: keyof Traveller, value: string) => {
    const newDetails = [...formData.travellerDetails];

    if (field === 'dob') {
      if (value) {
        const calculatedAge = parseInt(calculateAge(value, formData.startDate) || '0');

        // Prevent selecting a DOB that results in an age under 18
        if (calculatedAge < 18) {
          setErrors((prev) => ({ ...prev, travellers: 'Travellers must be 18 years or older.' }));
          return;
        }

        newDetails[index].dob = value;
        newDetails[index].age = calculatedAge.toString();
        setErrors((prev) => ({ ...prev, travellers: undefined }));
      } else {
        newDetails[index].dob = '';
      }
    }

    if (field === 'age') {
      if (value) {
        const ageNum = parseInt(value);
        if (ageNum < 18) return; 

        newDetails[index].age = value;

        // Calculate precise approximate DOB using the selected age and travel start date reference
        const refDate = formData.startDate ? new Date(formData.startDate) : new Date();
        const birthYear = refDate.getFullYear() - ageNum;

        const month = String(refDate.getMonth() + 1).padStart(2, '0');
        const day = String(refDate.getDate()).padStart(2, '0');

        newDetails[index].dob = `${birthYear}-${month}-${day}`;
        setErrors((prev) => ({ ...prev, travellers: undefined }));
      } else {
        newDetails[index].age = '';
        newDetails[index].dob = '';
      }
    }

    setFormData((prev) => ({ ...prev, travellerDetails: newDetails }));
  };

  const buildIsqPayload = () => {
    let ictValue = activeTab === 'Students' ? 'STUDENT' : activeTab;

    const baseIsq: any = {
      sd: formData.startDate,
      cd: formData.coverageDuration || '180',
      ict: ictValue,
      isc: {
        iri: [{ rkey: formData.destinationCode || 'US', rt: 'COUNTRY' }],
      },
      iti: formData.travellerDetails.map((t) => ({ age: parseInt(t.age || '22') })),
    };

    if (activeTab !== 'Students') {
      baseIsq.ed = formData.endDate;
    }

    return { isq: baseIsq };
  };

  const handleSearch = async () => {
    let localErrors: FormErrors = {};

    if (!formData.startDate) {
      localErrors.startDate = 'Please select a start date.';
    }

    if (activeTab !== 'Students' && !formData.endDate) {
      localErrors.endDate = 'Please select an end date.';
    }

    const hasEmptyDob = formData.travellerDetails.some((t) => !t.dob);
    if (hasEmptyDob) {
      localErrors.travellers = 'Please enter the Date of Birth for all travellers.';
      setShowTravellerDropdown(true);
    }

    if (Object.keys(localErrors).length > 0) {
      setErrors(localErrors);
      return;
    }

    setIsSubmitting(true);

    // 
    try {
      const payload = buildIsqPayload();
      const response = await searchInsurancePackages(payload);
      console.log('InsuranceSearchSection Insurance Search Response:', response);
      if (response) {
        // ⬇️ ADD THIS LINE: Caches the inputted traveler DOBs and ages to session memory
        sessionStorage.setItem('insurance_initial_travellers', JSON.stringify(formData.travellerDetails));
        
        navigate('/insurance/search', { state: response });
      }
    }
    catch (error) {
      console.error('Search failed:', error);
      notifyError('Search failed. Please check your data and try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Mobile Field Renderer
  const renderMobileForm = () => {
    switch (activeTab) {
      case 'Annual Multi Trip':
        return (
          <div className="space-y-4 animate-in fade-in duration-300">
            <div>
              <p className="text-gray-600 text-sm mb-1.5 font-medium flex items-center gap-1">
                Where are you travelling?
              </p>
              <select
                value={formData.region}
                onChange={(e) => handleInputChange('region', e.target.value)}
                className="w-full bg-[#F3F5F7] p-3.5 rounded-xl outline-none font-semibold text-gray-800 appearance-none border border-transparent"
              >
                <option value="Worldwide">Worldwide</option>
                <option value="Worldwide excl US & Canada">Worldwide excl US & Canada</option>
              </select>
            </div>
            <div>
              <p className="text-gray-600 text-sm mb-1.5 font-medium flex items-center gap-1">
                Max trip duration <Info size={14} />
              </p>
              <select
                value={formData.duration}
                onChange={(e) => handleInputChange('duration', e.target.value)}
                className="w-full bg-[#F3F5F7] p-3.5 rounded-xl outline-none font-semibold text-gray-800 appearance-none border border-transparent"
              >
                <option value="30 Days">30 Days</option>
                <option value="45 Days">45 Days</option>
                <option value="60 Days">60 Days</option>
                <option value="90 Days">90 Days</option>
              </select>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <DateInput
                label="Start Date"
                value={formData.startDate}
                min={todayStr}
                error={errors.startDate}
                onChange={(val) => handleInputChange('startDate', val)}
              />
              <DateInput
                label="End Date"
                value={formData.endDate}
                min={formData.startDate || todayStr}
                error={errors.endDate}
                onChange={(val) => handleInputChange('endDate', val)}
              />
            </div>
            <TravellerSelector
              travellerDetails={formData.travellerDetails}
              onTravellerCountChange={handleTravellerCountChange}
              onUpdateTraveller={updateTraveller}
              showDropdown={showTravellerDropdown}
              setShowDropdown={setShowTravellerDropdown}
              error={errors.travellers}
              label="Travellers"
            />
          </div>
        );

      case 'Students':
        return (
          <div className="space-y-4 animate-in fade-in duration-300">
            <AirportAutocomplete value={formData.destination} onSelect={handleAirportSelect} />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <DateInput
                label="Start Date"
                value={formData.startDate}
                min={todayStr}
                error={errors.startDate}
                onChange={(val) => handleInputChange('startDate', val)}
              />
              <div className="relative">
                <div className="absolute left-4 top-2.5 text-[10px] font-bold text-blue-600 uppercase tracking-wider z-10">
                  Coverage Period
                </div>
                <Clock
                  className="absolute left-4 top-[65%] -translate-y-1/2 text-gray-400"
                  size={18}
                />
                <select
                  value={formData.coverageDuration}
                  onChange={(e) => handleInputChange('coverageDuration', e.target.value)}
                  className="w-full bg-[#F3F5F7] p-4 pl-11 pt-6 rounded-2xl outline-none appearance-none font-medium text-gray-800"
                >
                  <option value="30">1 Month</option>
                  <option value="180">6 Months</option>
                  <option value="365">1 Year</option>
                </select>
              </div>
            </div>
            <TravellerSelector
              travellerDetails={formData.travellerDetails}
              onTravellerCountChange={handleTravellerCountChange}
              onUpdateTraveller={updateTraveller}
              showDropdown={showTravellerDropdown}
              setShowDropdown={setShowTravellerDropdown}
              error={errors.travellers}
              label="No. of Students"
            />
          </div>
        );

      default:
        return (
          <div className="space-y-4 animate-in fade-in duration-300">
            <AirportAutocomplete value={formData.destination} onSelect={handleAirportSelect} />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <DateInput
                label="Start Date"
                value={formData.startDate}
                min={todayStr}
                error={errors.startDate}
                onChange={(val) => handleInputChange('startDate', val)}
              />
              <DateInput
                label="End Date"
                value={formData.endDate}
                min={formData.startDate || todayStr}
                error={errors.endDate}
                onChange={(val) => handleInputChange('endDate', val)}
              />
            </div>
            <TravellerSelector
              travellerDetails={formData.travellerDetails}
              onTravellerCountChange={handleTravellerCountChange}
              onUpdateTraveller={updateTraveller}
              showDropdown={showTravellerDropdown}
              setShowDropdown={setShowTravellerDropdown}
              error={errors.travellers}
              label={activeTab === 'Group' ? 'No. of Members' : 'No. of Travelers'}
            />
          </div>
        );
    }
  };

  // Desktop Responsive Form Fields
  const renderDesktopForm = () => {
    switch (activeTab) {
      case 'Annual Multi Trip':
        return (
          <div className="w-full grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 h-full items-center gap-y-4 md:gap-y-0 py-2 md:py-0">
            <div className="px-4 border-r border-[#e5d9c5] h-[55px] flex flex-col justify-center text-left">
              <span className="text-[12px] text-gray-400 font-medium mb-0.5">Region</span>
              <select
                value={formData.region}
                onChange={(e) => handleInputChange('region', e.target.value)}
                className="w-full bg-transparent text-[15px] font-semibold text-[#2c3e50] outline-none appearance-none cursor-pointer"
              >
                <option value="Worldwide">Worldwide</option>
                <option value="Worldwide excl US & Canada">Excl US & CA</option>
              </select>
            </div>
            <div className="px-4 border-r border-[#e5d9c5] h-[55px] flex flex-col justify-center text-left">
              <span className="text-[12px] text-gray-400 font-medium mb-0.5">Duration</span>
              <select
                value={formData.duration}
                onChange={(e) => handleInputChange('duration', e.target.value)}
                className="w-full bg-transparent text-[15px] font-semibold text-[#2c3e50] outline-none appearance-none cursor-pointer"
              >
                <option value="30 Days">30 Days</option>
                <option value="45 Days">45 Days</option>
                <option value="60 Days">60 Days</option>
                <option value="90 Days">90 Days</option>
              </select>
            </div>
            <div className="px-4 border-r border-[#e5d9c5] h-[55px] flex flex-col justify-center text-left relative">
              <span className="text-[12px] text-gray-400 font-medium mb-0.5">Start Date</span>
              <input
                type="date"
                value={formData.startDate}
                min={todayStr}
                onChange={(e) => handleInputChange('startDate', e.target.value)}
                className="w-full bg-transparent text-[15px] font-semibold text-[#2c3e50] outline-none cursor-pointer"
              />
              {errors.startDate && (
                <span className="absolute bottom-[-16px] left-4 text-[10px] text-red-500 font-medium whitespace-nowrap">
                  {errors.startDate}
                </span>
              )}
            </div>
            <div className="px-4 md:border-r lg:border-r border-[#e5d9c5] h-[55px] flex flex-col justify-center text-left relative">
              <span className="text-[12px] text-gray-400 font-medium mb-0.5">End Date</span>
              <input
                type="date"
                value={formData.endDate}
                min={formData.startDate || todayStr}
                onChange={(e) => handleInputChange('endDate', e.target.value)}
                className="w-full bg-transparent text-[15px] font-semibold text-[#2c3e50] outline-none cursor-pointer"
              />
              {errors.endDate && (
                <span className="absolute bottom-[-16px] left-4 text-[10px] text-red-500 font-medium whitespace-nowrap">
                  {errors.endDate}
                </span>
              )}
            </div>
            <div className="px-4 h-[55px] flex flex-col justify-center col-span-2 md:col-span-2 lg:col-span-1 text-left relative">
              <span className="text-[12px] text-gray-400 font-medium mb-0.5">Travellers</span>
              <TravellerSelector
                travellerDetails={formData.travellerDetails}
                onTravellerCountChange={handleTravellerCountChange}
                onUpdateTraveller={updateTraveller}
                showDropdown={showTravellerDropdown}
                setShowDropdown={setShowTravellerDropdown}
                error={errors.travellers}
                label="Travellers"
                isDesktopInline={true}
              />
            </div>
          </div>
        );

      case 'Students':
        return (
          <div className="w-full grid grid-cols-2 lg:grid-cols-4 h-full items-center gap-y-4 md:gap-y-0 py-2 md:py-0">
            <div className="px-4 border-r border-[#e5d9c5] h-[55px] flex flex-col justify-center text-left">
              <span className="text-[12px] text-gray-400 font-medium mb-0.5">Destination</span>
              <AirportAutocomplete
                value={formData.destination}
                onSelect={handleAirportSelect}
                placeholder="Where to?"
                isDesktopInline={true}
              />
            </div>
            <div className="px-4 border-r border-[#e5d9c5] h-[55px] flex flex-col justify-center text-left relative">
              <span className="text-[12px] text-gray-400 font-medium mb-0.5">Start Date</span>
              <input
                type="date"
                value={formData.startDate}
                min={todayStr}
                onChange={(e) => handleInputChange('startDate', e.target.value)}
                className="w-full bg-transparent text-[15px] font-semibold text-[#2c3e50] outline-none cursor-pointer"
              />
              {errors.startDate && (
                <span className="absolute bottom-[-16px] left-4 text-[10px] text-red-500 font-medium whitespace-nowrap">
                  {errors.startDate}
                </span>
              )}
            </div>
            <div className="px-4 md:border-r border-[#e5d9c5] h-[55px] flex flex-col justify-center text-left">
              <span className="text-[12px] text-gray-400 font-medium mb-0.5">Coverage Period</span>
              <select
                value={formData.coverageDuration}
                onChange={(e) => handleInputChange('coverageDuration', e.target.value)}
                className="w-full bg-transparent text-[15px] font-semibold text-[#2c3e50] outline-none appearance-none cursor-pointer"
              >
                <option value="30">1 Month</option>
                <option value="180">6 Months</option>
                <option value="365">1 Year</option>
              </select>
            </div>
            <div className="px-4 h-[55px] flex flex-col justify-center text-left relative">
              <span className="text-[12px] text-gray-400 font-medium mb-0.5">Students</span>
              <TravellerSelector
                travellerDetails={formData.travellerDetails}
                onTravellerCountChange={handleTravellerCountChange}
                onUpdateTraveller={updateTraveller}
                showDropdown={showTravellerDropdown}
                setShowDropdown={setShowTravellerDropdown}
                error={errors.travellers}
                label="Students"
                isDesktopInline={true}
              />
            </div>
          </div>
        );

      default:
        return (
          <div className="w-full grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 h-full items-center gap-y-4 md:gap-y-0 py-2 md:py-0">
            <div className="px-4 border-r border-[#e5d9c5] h-[55px] flex flex-col justify-center text-left">
              <span className="text-[12px] text-gray-400 font-medium mb-0.5">Destination</span>
              <AirportAutocomplete
                value={formData.destination}
                onSelect={handleAirportSelect}
                placeholder="Where to?"
                isDesktopInline={true}
              />
            </div>
            <div className="px-4 border-r border-[#e5d9c5] h-[55px] flex flex-col justify-center text-left relative">
              <span className="text-[12px] text-gray-400 font-medium mb-0.5">Start Date</span>
              <input
                type="date"
                value={formData.startDate}
                min={todayStr}
                onChange={(e) => handleInputChange('startDate', e.target.value)}
                className="w-full bg-transparent text-[15px] font-semibold text-[#2c3e50] outline-none cursor-pointer"
              />
              {errors.startDate && (
                <span className="absolute bottom-[-16px] left-4 text-[10px] text-red-500 font-medium whitespace-nowrap">
                  {errors.startDate}
                </span>
              )}
            </div>
            <div className="px-4 border-r border-[#e5d9c5] h-[55px] flex flex-col justify-center text-left relative">
              <span className="text-[12px] text-gray-400 font-medium mb-0.5">End Date</span>
              <input
                type="date"
                value={formData.endDate}
                min={formData.startDate || todayStr}
                onChange={(e) => handleInputChange('endDate', e.target.value)}
                className="w-full bg-transparent text-[15px] font-semibold text-[#2c3e50] outline-none cursor-pointer"
              />
              {errors.endDate && (
                <span className="absolute bottom-[-16px] left-4 text-[10px] text-red-500 font-medium whitespace-nowrap">
                  {errors.endDate}
                </span>
              )}
            </div>
            <div className="px-4 h-[55px] flex flex-col justify-center text-left relative">
              <span className="text-[12px] text-gray-400 font-medium mb-0.5">
                {activeTab === 'Group' ? 'Members' : 'Travellers'}
              </span>
              <TravellerSelector
                travellerDetails={formData.travellerDetails}
                onTravellerCountChange={handleTravellerCountChange}
                onUpdateTraveller={updateTraveller}
                showDropdown={showTravellerDropdown}
                setShowDropdown={setShowTravellerDropdown}
                error={errors.travellers}
                label={activeTab === 'Group' ? 'Members' : 'Travellers'}
                isDesktopInline={true}
              />
            </div>
          </div>
        );
    }
  };

  return (
    <div className="w-full max-w-6xl mx-auto px-4 sm:px-6 relative">
      {/* MOBILE FORM VIEW (< 768px Breakpoint Context) */}
      <div className="flex flex-col md:hidden mt-2">
        <div className="flex items-center gap-4 mb-4 overflow-x-auto pb-2 scrollbar-none">
          {(['International', 'Annual Multi Trip', 'Students', 'Group'] as TabType[]).map((tab) => (
            <label
              key={tab}
              className="flex items-center gap-2 cursor-pointer group whitespace-nowrap"
            >
              <div className="relative flex items-center justify-center">
                <input
                  type="radio"
                  checked={activeTab === tab}
                  onChange={() => setActiveTab(tab)}
                  className="w-5 h-5 appearance-none border-2 border-gray-300 rounded-full checked:border-red-500 transition-all cursor-pointer"
                />
                {activeTab === tab && (
                  <div className="absolute w-2.5 h-2.5 bg-red-500 rounded-full" />
                )}
              </div>
              <span
                className={`text-sm font-medium transition-colors ${activeTab === tab ? 'text-gray-900 font-bold' : 'text-gray-500'}`}
              >
                {tab}
              </span>
            </label>
          ))}
        </div>
        <div className="bg-white rounded-2xl shadow-xl p-5 border border-gray-100 text-left">
          {renderMobileForm()}
          <button
            onClick={handleSearch}
            disabled={isSubmitting}
            className="w-full mt-5 bg-orange-500 hover:bg-orange-600 disabled:opacity-70 text-white font-bold py-3.5 rounded-xl flex justify-center items-center gap-2 shadow-lg transition-all active:scale-95"
          >
            {isSubmitting ? <Loader2 className="animate-spin" size={20} /> : <Search size={20} />}
            Search Insurance
          </button>
        </div>
      </div>

      {/* TABLET, LAPTOP & DESKTOP MULTI-BREAKPOINT MATRIX (>= 768px Breakpoint Framework) */}
      <div className="hidden md:flex flex-col items-center w-full relative">
        {/* Navigation Mode Container */}
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 mb-3 w-full max-w-[1050px] justify-start px-2">
          {(['International', 'Annual Multi Trip', 'Students', 'Group'] as TabType[]).map((tab) => (
            <label key={tab} className="flex items-center gap-2 cursor-pointer group">
              <div className="relative flex items-center justify-center">
                <input
                  type="radio"
                  checked={activeTab === tab}
                  onChange={() => setActiveTab(tab)}
                  className="w-4 h-4 appearance-none border border-gray-300 rounded-full checked:border-blue-500 transition-all cursor-pointer"
                />
                {activeTab === tab && <div className="absolute w-2 h-2 bg-blue-500 rounded-full" />}
              </div>
              <span
                className={`text-[14px] font-semibold transition-colors ${activeTab === tab ? 'text-gray-900 font-bold' : 'text-gray-500 group-hover:text-gray-800'}`}
              >
                {tab}
              </span>
            </label>
          ))}
        </div>

        {/* Dynamic Card Area */}
        <div
          className="bg-white relative w-full max-w-[1050px] flex items-center px-4 md:px-6 py-4 md:py-3 lg:py-4 transition-all duration-200 h-auto md:min-h-[90px] lg:min-h-[110px]"
          style={{
            borderRadius: '20px',
            borderWidth: '1px',
            borderColor: '#e5d9c5',
            boxShadow: '0px 10px 30px rgba(0,0,0,0.08)',
          }}
        >
          {renderDesktopForm()}
        </div>

        <div className="flex justify-center mt-6">
          <button
            onClick={handleSearch}
            disabled={isSubmitting}
            className="bg-[var(--color-brand-red)] text-white font-semibold flex items-center justify-center gap-2 px-8 sm:px-10 h-12 rounded-2xl shadow-[0_14px_30px_-12px_rgba(224,36,47,0.8)] transition-all duration-200 disabled:opacity-70 disabled:cursor-not-allowed text-sm select-none hover:bg-[var(--color-brand-red)]/90 active:scale-[0.98] min-w-[160px]"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Searching...</span>
              </>
            ) : (
              <>
                <Search className="w-4 h-4 text-white opacity-90" />
                <span>Search Insurance</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

// --- UI Helper Sub-components ---
const DateInput = ({
  label,
  value,
  min,
  error,
  onChange,
}: {
  label: string;
  value: string;
  min?: string;
  error?: string;
  onChange: (v: string) => void;
}) => (
  <div className="relative group w-full text-left flex flex-col">
    <div className="relative w-full">
      <div className="absolute left-4 top-2.5 text-[10px] font-bold text-blue-600 uppercase tracking-wider z-10">
        {label}
      </div>
      <Calendar className="absolute left-4 top-[65%] -translate-y-1/2 text-gray-400" size={18} />
      <input
        type="date"
        value={value}
        min={min}
        onChange={(e) => onChange(e.target.value)}
        className={`w-full bg-[#F3F5F7] p-4 pl-11 pt-6 rounded-2xl outline-none text-gray-800 border-2 transition-all font-medium text-sm ${error ? 'border-red-500 focus:border-red-500' : 'border-transparent focus:border-blue-500 focus:bg-white'}`}
      />
    </div>
    {error && <span className="text-[11px] text-red-500 font-medium mt-1 pl-2">{error}</span>}
  </div>
);

// --- Traveller Selector Component ---
const TravellerSelector: React.FC<{
  travellerDetails: Traveller[];
  onTravellerCountChange: (count: number) => void;
  onUpdateTraveller: (index: number, field: keyof Traveller, value: string) => void;
  showDropdown: boolean;
  setShowDropdown: (show: boolean) => void;
  error?: string;
  label?: string;
  isDesktopInline?: boolean;
}> = ({
  travellerDetails,
  onTravellerCountChange,
  onUpdateTraveller,
  showDropdown,
  setShowDropdown,
  error,
  label = 'Travellers',
  isDesktopInline = false,
}) => {
  const wrapperRef = useRef<HTMLDivElement>(null);

  const refDate = new Date();
  const maxYear = refDate.getFullYear() - 18;
  const maxDobStr = `${maxYear}-${String(refDate.getMonth() + 1).padStart(2, '0')}-${String(refDate.getDate()).padStart(2, '0')}`;

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [setShowDropdown]);

  const handlePassportUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      notifyInfo('Passport upload feature coming soon!');
    }
  };

  if (isDesktopInline) {
    return (
      <div ref={wrapperRef} className="w-full relative">
        <div
          onClick={() => setShowDropdown(!showDropdown)}
          className={`text-[16px] font-semibold text-[#2c3e50] cursor-pointer select-none truncate ${error ? 'text-red-500 border-b-2 border-dashed border-red-500 pb-0.5' : ''}`}
        >
          {travellerDetails.length} {label}
        </div>
        {error && (
          <span className="absolute bottom-[-16px] left-0 text-[10px] text-red-500 font-medium whitespace-nowrap">
            DOB Required
          </span>
        )}

        {showDropdown && (
          <div
            onClick={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
            className="absolute z-[300] left-1/2 -translate-x-1/2 lg:left-auto lg:translate-x-0 lg:right-[-20px] top-[45px] w-[290px] sm:w-[350px] md:w-[420px] bg-white rounded-2xl shadow-2xl border border-gray-100 p-4 sm:p-5 text-left animate-in slide-in-from-top-2 duration-200"
          >
            <div className="flex justify-between items-center mb-4">
              <span className="font-bold text-gray-800 text-sm sm:text-md flex items-center gap-1.5">
                <Users size={18} /> Select {label}
              </span>
              <div className="flex items-center gap-3 border rounded-xl px-2.5 py-1 bg-gray-50">
                <button
                  type="button"
                  onClick={() => onTravellerCountChange(Math.max(1, travellerDetails.length - 1))}
                  className="text-gray-500 hover:text-red-600"
                >
                  <Minus size={16} />
                </button>
                <span className="font-bold text-sm w-4 text-center select-none">
                  {travellerDetails.length}
                </span>
                <button
                  type="button"
                  onClick={() => onTravellerCountChange(travellerDetails.length + 1)}
                  className="text-gray-500 hover:text-blue-600"
                >
                  <Plus size={16} />
                </button>
              </div>
            </div>

            {error && (
              <div className="mb-3 px-3 py-1.5 bg-red-50 border border-red-100 text-red-600 rounded-xl text-xs font-medium">
                {error}
              </div>
            )}

            <div className="space-y-3 max-h-[220px] overflow-y-auto pr-1">
              {travellerDetails.map((traveller, index) => (
                <div
                  key={index}
                  className={`p-3 border rounded-xl bg-white shadow-sm space-y-2 ${error && !traveller.dob ? 'border-red-200 bg-red-50/20' : 'border-gray-100'}`}
                >
                  <p className="text-[10px] font-bold text-blue-600 uppercase tracking-wide">
                    {label.endsWith('s') ? label.slice(0, -1) : label} {index + 1}
                  </p>
                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] font-medium text-gray-500">Date of Birth</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="date"
                        value={traveller.dob}
                        max={maxDobStr}
                        onChange={(e) => onUpdateTraveller(index, 'dob', e.target.value)}
                        className={`w-full bg-gray-50 border rounded-lg p-1.5 text-xs outline-none focus:border-blue-500 ${error && !traveller.dob ? 'border-red-400' : ''}`}
                      />
                      <span className="text-[9px] font-bold text-gray-400">OR</span>
                      <select
                        value={traveller.age}
                        onChange={(e) => onUpdateTraveller(index, 'age', e.target.value)}
                        className="w-full bg-gray-50 border rounded-lg p-1.5 text-xs outline-none focus:border-blue-500"
                      >
                        <option value="">Age</option>
                        {[...Array(83)].map((_, i) => {
                          const ageOption = i + 18; 
                          return (
                            <option key={ageOption} value={ageOption}>
                              {ageOption} yrs
                            </option>
                          );
                        })}
                      </select>
                    </div>
                  </div>
                  {traveller.dob && traveller.age && (
                    <p className="text-[11px] text-green-600 font-medium">
                      ✓ Calculated: {traveller.age} years
                    </p>
                  )}
                </div>
              ))}
            </div>

            <div className="mt-4 flex justify-end">
              <button
                type="button"
                onClick={() => setShowDropdown(false)}
                className="bg-blue-600 text-white px-4 py-1.5 rounded-lg text-xs font-bold hover:bg-blue-700"
              >
                Done
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div ref={wrapperRef} className="relative w-full text-left flex flex-col">
      <div
        onClick={() => setShowDropdown(!showDropdown)}
        className={`w-full bg-[#F3F5F7] p-4 rounded-2xl flex items-center justify-between cursor-pointer border-2 transition-all ${error ? 'border-red-500' : 'border-transparent hover:border-blue-400'}`}
      >
        <div className="flex items-center gap-3">
          <Users className={error ? 'text-red-400' : 'text-gray-400'} size={20} />
          <span className={`font-medium ${error ? 'text-red-600' : 'text-gray-700'}`}>
            {travellerDetails.length} {label}
          </span>
        </div>
        <Search size={18} className={error ? 'text-red-400' : 'text-gray-400'} />
      </div>
      {error && <span className="text-[11px] text-red-500 font-medium mt-1 pl-2">{error}</span>}

      {showDropdown && (
        <div
          onClick={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
          className="absolute z-[150] left-0 right-0 mt-2 w-full bg-white rounded-3xl shadow-2xl border border-gray-100 p-4 sm:p-6 animate-in slide-in-from-top-2 duration-200"
          style={{ maxWidth: 'calc(100vw - 32px)' }}
        >
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-y-3 mb-5 border-b pb-3 border-gray-100">
            <span className="font-bold text-gray-800 text-base sm:text-lg flex items-center gap-2">
              <Users size={20} /> Select {label}
            </span>
            <div className="flex items-center gap-4 border rounded-xl px-3 py-1.5 bg-gray-50 self-stretch sm:self-auto justify-between sm:justify-start">
              <button
                type="button"
                onClick={() => onTravellerCountChange(Math.max(1, travellerDetails.length - 1))}
                className="text-gray-500 hover:text-red-600 transition-colors p-1"
              >
                <Minus size={18} />
              </button>
              <span className="font-bold w-6 text-center text-sm select-none">
                {travellerDetails.length}
              </span>
              <button
                type="button"
                onClick={() => onTravellerCountChange(travellerDetails.length + 1)}
                className="text-gray-500 hover:text-blue-600 transition-colors p-1"
              >
                <Plus size={18} />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 max-h-[260px] overflow-y-auto pr-1">
            {travellerDetails.map((traveller, index) => (
              <div
                key={index}
                className={`space-y-3 p-3 border rounded-xl bg-white shadow-sm ${error && !traveller.dob ? 'border-red-200 bg-red-50/20' : 'border-gray-100'}`}
              >
                <p className="text-[11px] font-bold text-blue-600 uppercase tracking-wide">
                  {label.endsWith('s') ? label.slice(0, -1) : label} {index + 1}
                </p>
                <div className="flex flex-col gap-2">
                  <div className="w-full flex flex-col gap-1">
                    <label className="text-[11px] font-medium text-gray-500">Date of Birth</label>
                    <input
                      type="date"
                      value={traveller.dob}
                      max={maxDobStr}
                      onChange={(e) => onUpdateTraveller(index, 'dob', e.target.value)}
                      className={`w-full bg-gray-50 border rounded-xl p-2.5 text-xs outline-none focus:border-blue-500 ${error && !traveller.dob ? 'border-red-400' : ''}`}
                    />
                  </div>
                  <div className="text-center text-[10px] font-bold text-gray-400 select-none uppercase tracking-wider py-0.5">
                    OR
                  </div>
                  <div className="w-full">
                    <select
                      value={traveller.age}
                      onChange={(e) => onUpdateTraveller(index, 'age', e.target.value)}
                      className="w-full bg-gray-50 border rounded-xl p-2.5 text-xs outline-none focus:border-blue-500 bg-white"
                    >
                      <option value="">Select Age</option>
                      {[...Array(83)].map((_, i) => {
                        const ageOption = i + 18;
                        return (
                          <option key={ageOption} value={ageOption}>
                            {ageOption} yrs
                          </option>
                        );
                      })}
                    </select>
                  </div>
                </div>
                {traveller.dob && traveller.age && (
                  <p className="text-xs text-green-600 mt-1 font-medium">
                    ✓ Age calculated: {traveller.age} years
                  </p>
                )}
              </div>
            ))}

            <div
              className="border-2 border-dashed border-gray-200 rounded-2xl p-4 flex flex-col items-center justify-center text-center hover:bg-blue-50 transition-colors cursor-pointer group mt-1"
              onClick={() => document.getElementById('passport-upload-input-mobile')?.click()}
            >
              <div className="bg-gray-100 p-2.5 rounded-full text-gray-500 group-hover:bg-blue-600 group-hover:text-white transition-all mb-2">
                <Upload size={18} />
              </div>
              <p className="text-xs font-bold text-gray-700">Upload passports?</p>
              <p className="text-[10px] text-gray-400">Auto-fill traveller data</p>
              <input
                type="file"
                id="passport-upload-input-mobile"
                className="hidden"
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={handlePassportUpload}
              />
            </div>
          </div>

          <div className="mt-5 flex justify-end border-t pt-3 border-gray-50">
            <button
              type="button"
              onClick={() => setShowDropdown(false)}
              className="w-full sm:w-auto bg-[var(--color-brand-red)] text-white px-8 py-2.5 rounded-xl font-bold text-sm hover:bg-[var(--color-brand-red)]/90 transition-all shadow-[0_14px_30px_-12px_rgba(224,36,47,0.8)]"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default InsuranceSearchSection;