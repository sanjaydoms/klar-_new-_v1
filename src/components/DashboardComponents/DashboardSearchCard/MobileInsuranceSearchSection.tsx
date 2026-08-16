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
  ChevronDown,
  ChevronLeft,
  MoreHorizontal,
  Briefcase,
  ShieldCheck,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import airportData from 'airport-codes/airports.json';
import { searchInsurancePackages } from '@/api/insuranceService.api';
import InsuranceFooter from '@/components/Insurance/InsuranceFooter/InsuranceFooter';

import countries from 'i18n-iso-countries';
import enLocale from 'i18n-iso-countries/langs/en.json';
import { notifyError } from '@/utils/notify';
countries.registerLocale(enLocale);

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

  return (airportData as any[])
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
};

const AirportAutocomplete: React.FC<{
  value: string;
  onSelect: (airport: Airport) => void;
  placeholder?: string;
}> = ({ value, onSelect, placeholder = 'Destination' }) => {
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

  return (
    <div ref={wrapperRef} className="relative w-full">
      <div className="flex items-center gap-3 w-full">
        <MapPin size={20} className="text-[#620404]" />
        <input
          type="text"
          placeholder={placeholder}
          value={query}
          onChange={(e) => handleSearch(e.target.value)}
          className="w-full bg-transparent outline-none text-[16px] font-bold text-gray-900 placeholder:text-gray-400 placeholder:font-normal"
        />
      </div>

      {isOpen && (
        <div className="absolute left-0 right-0 z-[100] mt-3 bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100 max-h-[250px] overflow-y-auto">
          {loading ? (
            <div className="p-4 flex justify-center">
              <Loader2 className="animate-spin text-[#620404]" size={20} />
            </div>
          ) : suggestions.length > 0 ? (
            suggestions.map((airport) => (
              <div
                key={`${airport.code}-${airport.countryIso}`}
                onClick={() => {
                  onSelect(airport);
                  setIsOpen(false);
                }}
                className="px-4 py-3 hover:bg-gray-50 cursor-pointer border-b border-gray-50 last:border-0 flex flex-col"
              >
                <div className="flex items-center gap-2 text-sm font-bold text-gray-900">
                  <span>{airport.city}</span>
                  <span className="text-xs text-gray-400">({airport.code})</span>
                </div>
                <span className="text-[11px] text-gray-400 truncate">{airport.name}</span>
              </div>
            ))
          ) : (
            <div className="p-4 text-center text-gray-400 text-xs italic">
              No matching results found
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const MobileInsuranceSearchSection: React.FC = () => {
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
      destination: airport.city,
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
    newDetails[index][field] = value;
    if (field === 'dob' && value) {
      newDetails[index].age = calculateAge(value, formData.startDate);
      setErrors((prev) => ({ ...prev, travellers: undefined }));
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
      localErrors.startDate = 'Required';
    }
    if (activeTab !== 'Students' && !formData.endDate) {
      localErrors.endDate = 'Required';
    }
    const hasEmptyDob = formData.travellerDetails.some((t) => !t.dob);
    if (hasEmptyDob) {
      localErrors.travellers = 'Please enter Date of Birth for all travellers.';
      setShowTravellerDropdown(true);
    }

    if (Object.keys(localErrors).length > 0) {
      setErrors(localErrors);
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = buildIsqPayload();
      const response = await searchInsurancePackages(payload);
      if (response) {
        navigate('/insurance/search', { state: response });
      }
    } catch (error) {
      console.error('Search failed:', error);
      notifyError('Search failed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full min-h-screen bg-gray-50 flex flex-col font-sans max-w-md mx-auto overflow-x-hidden pb-20">
      
      {/* Hero Banner Section */}
      <div 
        className="w-full h-56 bg-cover bg-center relative p-5 flex flex-col justify-between text-white"
        style={{ backgroundImage: `url('/images/insurance_mobile_ota_background_img.jpg')` }}
      >
        <div className="flex justify-between items-center w-full">
          <button onClick={() => navigate(-1)} className="p-2 rounded-full bg-black/20 backdrop-blur-sm active:scale-95 transition-transform">
            <ChevronLeft size={20} />
          </button>
          <span className="text-lg font-bold tracking-wide text-[#060E49]">Insurance</span>
          <button className="p-2 rounded-full bg-black/20 backdrop-blur-sm active:scale-95 transition-transform">
            <MoreHorizontal size={20} />
          </button>
        </div>
        <div className="mb-4 text-center">
          <h1 className="text-2xl font-extrabold leading-tight text-[#060E49]">Travel worry-free with Klar</h1>
          <p className="text-xs opacity-90 mt-1 text-[#060E49] mb-16">Trusted protection for every journey with Klar</p>
        </div>
      </div>

      {/* Main Container Layer */}
      <div className="px-4 -mt-6 relative z-10 w-full">
        <div className="bg-white rounded-[24px] shadow-lg p-5 border border-gray-100/80 w-full text-left">
          
          {/* Tab Selection List Grid */}
          <div className="grid grid-cols-2 gap-y-4 gap-x-2 mb-6">
            {(['International', 'Annual Multi Trip', 'Students', 'Group'] as TabType[]).map((tab) => (
              <label key={tab} className="flex items-center gap-2.5 cursor-pointer select-none">
                <div className="relative flex items-center justify-center">
                  <input
                    type="radio"
                    checked={activeTab === tab}
                    onChange={() => {
                      setActiveTab(tab);
                      setErrors({});
                    }}
                    className="w-[18px] h-[18px] appearance-none border border-gray-300 rounded-full checked:border-[#620404] transition-all"
                  />
                  {activeTab === tab && (
                    <div className="absolute w-2.5 h-2.5 bg-[#620404] rounded-full" />
                  )}
                </div>
                <span className={`text-xs font-semibold tracking-wide ${activeTab === tab ? 'text-gray-900 font-bold' : 'text-gray-500'}`}>
                  {tab === 'Annual Multi Trip' ? 'Annual Trip' : tab}
                </span>
              </label>
            ))}
          </div>

          {/* Dynamic Form Content Slots */}
          <div className="space-y-4">
            
            {/* Conditional Display Field: Region Selection */}
            {activeTab === 'Annual Multi Trip' && (
              <div className="border border-gray-200 rounded-xl p-3 bg-white">
                <span className="text-[10px] font-bold text-gray-400 block uppercase tracking-wider mb-0.5">Where are you travelling?</span>
                <select
                  value={formData.region}
                  onChange={(e) => handleInputChange('region', e.target.value)}
                  className="w-full bg-transparent font-bold text-sm text-gray-800 outline-none cursor-pointer appearance-none"
                >
                  <option value="Worldwide">Worldwide</option>
                  <option value="Worldwide excl US & Canada">Worldwide excl US & Canada</option>
                </select>
              </div>
            )}

            {/* Destination Search Box */}
            {activeTab !== 'Annual Multi Trip' && (
              <div className="border border-gray-200 rounded-xl p-3 bg-white transition-all focus-within:border-[#620404]">
                <span className="text-[10px] font-bold text-gray-400 block uppercase tracking-wider mb-0.5">Destination</span>
                <AirportAutocomplete value={formData.destination} onSelect={handleAirportSelect} placeholder="Where to?" />
              </div>
            )}

            {/* Date Picker Split Fields Row */}
            <div className="grid grid-cols-2 gap-3">
              <div className={`border rounded-xl p-3 bg-white relative ${errors.startDate ? 'border-red-400' : 'border-gray-200'}`}>
                <span className="text-[10px] font-bold text-gray-400 block uppercase tracking-wider mb-0.5">
                  {activeTab === 'Annual Multi Trip' ? 'Start Date' : 'Departure Date'}
                </span>
                <div className="flex items-center justify-between text-gray-800">
                  <input
                    type="date"
                    value={formData.startDate}
                    min={todayStr}
                    onChange={(e) => handleInputChange('startDate', e.target.value)}
                    className="w-full bg-transparent font-bold text-xs outline-none uppercase"
                  />
                  <Calendar size={14} className="text-gray-400 ml-1 pointer-events-none" />
                </div>
                {errors.startDate && <span className="text-[9px] font-bold text-red-500 absolute bottom-1 right-2">{errors.startDate}</span>}
              </div>

              {activeTab !== 'Students' ? (
                <div className={`border rounded-xl p-3 bg-white relative ${errors.endDate ? 'border-red-400' : 'border-gray-200'}`}>
                  <span className="text-[10px] font-bold text-gray-400 block uppercase tracking-wider mb-0.5">
                    {activeTab === 'Annual Multi Trip' ? 'End Date' : 'Return Date'}
                  </span>
                  <div className="flex items-center justify-between text-gray-800">
                    <input
                      type="date"
                      value={formData.endDate}
                      min={formData.startDate || todayStr}
                      onChange={(e) => handleInputChange('endDate', e.target.value)}
                      className="w-full bg-transparent font-bold text-xs outline-none uppercase"
                    />
                    <Calendar size={14} className="text-gray-400 ml-1 pointer-events-none" />
                  </div>
                  {errors.endDate && <span className="text-[9px] font-bold text-red-500 absolute bottom-1 right-2">{errors.endDate}</span>}
                </div>
              ) : (
                <div className="border border-gray-200 rounded-xl p-3 bg-white">
                  <span className="text-[10px] font-bold text-gray-400 block uppercase tracking-wider mb-0.5">Coverage</span>
                  <div className="flex items-center justify-between text-gray-800">
                    <select
                      value={formData.coverageDuration}
                      onChange={(e) => handleInputChange('coverageDuration', e.target.value)}
                      className="w-full bg-transparent font-bold text-xs outline-none appearance-none cursor-pointer"
                    >
                      <option value="30">1 Month</option>
                      <option value="180">6 Months</option>
                      <option value="365">1 Year</option>
                    </select>
                    <Clock size={14} className="text-gray-400" />
                  </div>
                </div>
              )}
            </div>

            {/* Max Duration Slot for Annual Trip */}
            {activeTab === 'Annual Multi Trip' && (
              <div className="border border-gray-200 rounded-xl p-3 bg-white">
                <span className="text-[10px] font-bold text-gray-400 block uppercase tracking-wider mb-0.5 flex items-center gap-1">
                  Max Trip Duration <Info size={10} />
                </span>
                <select
                  value={formData.duration}
                  onChange={(e) => handleInputChange('duration', e.target.value)}
                  className="w-full bg-transparent font-bold text-sm text-gray-800 outline-none cursor-pointer appearance-none"
                >
                  <option value="30 Days">30 Days</option>
                  <option value="45 Days">45 Days</option>
                  <option value="60 Days">60 Days</option>
                  <option value="90 Days">90 Days</option>
                </select>
              </div>
            )}

            {/* Passanger Selector Field Base Frame */}
            <div className="relative">
              <div 
                onClick={() => setShowTravellerDropdown(!showTravellerDropdown)}
                className={`border rounded-xl p-3 bg-white flex items-center justify-between cursor-pointer ${errors.travellers ? 'border-red-400' : 'border-gray-200'}`}
              >
                <div className="text-left">
                  <span className="text-[10px] font-bold text-gray-400 block uppercase tracking-wider mb-0.5">
                    {activeTab === 'Group' ? 'Members' : activeTab === 'Students' ? 'No. of Students' : 'Travellers'}
                  </span>
                  <div className="flex items-center gap-2">
                    <Users size={16} className="text-gray-400" />
                    <span className="font-bold text-sm text-gray-800">
                      {formData.travellerDetails.length} {formData.travellerDetails.length === 1 ? 'Adult' : 'Travellers'}
                      {formData.travellerDetails[0]?.age && ` (${formData.travellerDetails[0].age} yrs)`}
                    </span>
                  </div>
                </div>
                <ChevronDown size={16} className={`text-gray-400 transition-transform ${showTravellerDropdown ? 'rotate-180' : ''}`} />
              </div>

              {/* Passenger Input Overlay Dropdown Card */}
              {showTravellerDropdown && (
                <div className="absolute left-0 right-0 z-[120] mt-2 bg-white rounded-2xl shadow-2xl border border-gray-100 p-4 text-left animate-in slide-in-from-top-2 duration-150">
                  <div className="flex justify-between items-center mb-4 border-b pb-2 border-gray-100">
                    <span className="font-bold text-gray-800 text-xs uppercase tracking-wide flex items-center gap-1.5">
                      Select {activeTab === 'Group' ? 'Members' : 'Travellers'}
                    </span>
                    <div className="flex items-center gap-3 border rounded-lg px-2 py-1 bg-gray-50">
                      <button
                        type="button"
                        onClick={() => handleTravellerCountChange(Math.max(1, formData.travellerDetails.length - 1))}
                        className="text-gray-500 hover:text-red-600"
                      >
                        <Minus size={14} />
                      </button>
                      <span className="font-bold text-xs w-4 text-center select-none">{formData.travellerDetails.length}</span>
                      <button
                        type="button"
                        onClick={() => handleTravellerCountChange(formData.travellerDetails.length + 1)}
                        className="text-gray-500 hover:text-blue-600"
                      >
                        <Plus size={14} />
                      </button>
                    </div>
                  </div>

                  {errors.travellers && (
                    <div className="mb-3 p-2 bg-red-50 border border-red-100 text-red-600 rounded-xl text-[11px] font-medium flex items-center gap-1">
                      <AlertCircle size={12} />
                      {errors.travellers}
                    </div>
                  )}

                  <div className="space-y-3 max-h-[190px] overflow-y-auto pr-1">
                    {formData.travellerDetails.map((traveller, index) => (
                      <div key={index} className={`p-2.5 border rounded-xl bg-white space-y-2 ${errors.travellers && !traveller.dob ? 'border-red-200 bg-red-50/10' : 'border-gray-100'}`}>
                        <p className="text-[10px] font-bold text-[#620404] uppercase tracking-wide">
                          {activeTab === 'Group' ? 'Member' : 'Traveller'} {index + 1}
                        </p>
                        <div className="flex flex-col gap-1.5">
                          <label className="text-[10px] font-medium text-gray-400">Date of Birth</label>
                          <div className="flex items-center gap-2">
                            <input
                              type="date"
                              value={traveller.dob}
                              onChange={(e) => updateTraveller(index, 'dob', e.target.value)}
                              className="w-full bg-gray-50 border border-gray-200 rounded-lg p-1.5 text-xs outline-none focus:border-[#620404]"
                            />
                            <span className="text-[8px] font-bold text-gray-300">OR</span>
                            <select
                              value={traveller.age}
                              onChange={(e) => updateTraveller(index, 'age', e.target.value)}
                              className="w-full bg-gray-50 border border-gray-200 rounded-lg p-1.5 text-xs outline-none focus:border-[#620404]"
                            >
                              <option value="">Age</option>
                              {[...Array(120)].map((_, i) => (
                                <option key={i} value={i + 1}>{i + 1} yrs</option>
                              ))}
                            </select>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-3 flex justify-end border-t pt-2 border-gray-100">
                    <button
                      type="button"
                      onClick={() => setShowTravellerDropdown(false)}
                      className="bg-[#620404] text-white px-4 py-1.5 rounded-lg text-xs font-bold active:scale-95 transition-transform"
                    >
                      Done
                    </button>
                  </div>
                </div>
              )}
            </div>

          </div>

          {/* Core Search Action Button */}
          <button
            onClick={handleSearch}
            disabled={isSubmitting}
            className="w-full mt-5 bg-[#620404] hover:bg-[#4E0404] text-white font-bold py-3.5 rounded-xl flex justify-center items-center gap-2 shadow-md transition-all active:scale-[0.98] disabled:opacity-75"
          >
            {isSubmitting ? (
              <Loader2 className="animate-spin w-4 h-4" />
            ) : (
              <span className="text-sm font-semibold tracking-wide flex items-center gap-2">
                Search Plans <Search size={14} className="rotate-90" />
              </span>
            )}
          </button>

          {/* Footer Feature Trust Indicators Row */}
          <div className="grid grid-cols-3 gap-1 mt-5 pt-4 border-t border-gray-100 text-center text-[10px] font-bold text-gray-500">
            <div className="flex flex-col items-center gap-1">
              <ShieldCheck size={14} className="text-amber-600" />
              <span>100% Trust Guarantee</span>
            </div>
            <div className="flex flex-col items-center gap-1">
              <Calendar size={14} className="text-amber-600" />
              <span>Flexible Booking</span>
            </div>
            <div className="flex flex-col items-center gap-1">
              <Briefcase size={14} className="text-amber-600" />
              <span>Secure Payments</span>
            </div>
          </div>

        </div>
      </div>

      {/* Selling Point / Trust Propositions section */}
      <div className="mt-8 px-4 text-center">
        <h3 className="text-sm font-bold text-gray-800 tracking-wide">Why Buy Insurance with Klar?</h3>
        <div className="w-12 h-0.5 bg-amber-500 mx-auto mt-1.5 mb-4 rounded-full" />
        
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white p-4 rounded-2xl border border-gray-100 text-left space-y-1.5 shadow-sm">
            <div className="w-7 h-7 bg-red-50 rounded-lg flex items-center justify-center text-red-700">
              <Briefcase size={16} />
            </div>
            <h4 className="text-xs font-bold text-gray-900">Cashless Treatment</h4>
            <p className="text-[10px] text-gray-400 leading-normal">Global network of partner hospitals.</p>
          </div>
          
          <div className="bg-white p-4 rounded-2xl border border-gray-100 text-left space-y-1.5 shadow-sm">
            <div className="w-7 h-7 bg-red-50 rounded-lg flex items-center justify-center text-red-700">
              <ShieldCheck size={16} />
            </div>
            <h4 className="text-xs font-bold text-gray-900">Easy Claims</h4>
            <p className="text-[10px] text-gray-400 leading-normal">Digitized processing through app.</p>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-gray-100 text-left space-y-1.5 shadow-sm">
            <div className="w-7 h-7 bg-red-50 rounded-lg flex items-center justify-center text-red-700">
              <MapPin size={16} />
            </div>
            <h4 className="text-xs font-bold text-gray-900">Global Coverage</h4>
            <p className="text-[10px] text-gray-400 leading-normal">Valid protection across all continents.</p>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-gray-100 text-left space-y-1.5 shadow-sm">
            <div className="w-7 h-7 bg-red-50 rounded-lg flex items-center justify-center text-red-700">
              <ShieldCheck size={16} fill="currentColor" fillOpacity={0.1} />
            </div>
            <h4 className="text-xs font-bold text-gray-900">Secure Reliable</h4>
            <p className="text-[10px] text-gray-400 leading-normal">Backed by top tier underwriters.</p>
          </div>
        </div>
      </div>

      {/* Suggested Insurance Matrix Cards */}
      <div className="mt-8 px-4 text-center">
        <h3 className="text-sm font-bold text-gray-800 tracking-wide">Recommended Plans</h3>
        <div className="w-12 h-0.5 bg-amber-500 mx-auto mt-1.5 mb-5 rounded-full" />

        <div className="space-y-4">
          
          {/* Card Component Item 1 */}
          <div className="bg-white border border-gray-200/80 rounded-2xl p-5 shadow-sm relative text-left">
            <span className="absolute top-0 right-4 -translate-y-1/2 bg-black text-white text-[9px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider">
              Popular
            </span>
            <h4 className="text-sm font-bold text-gray-900">Standard Safe</h4>
            <p className="text-[11px] text-gray-400 mt-0.5">Ideal for short leisure trips</p>
            
            <div className="mt-4 space-y-2">
              <div className="flex items-center gap-2 text-[11px] text-gray-600 font-medium">
                <CheckCircle2 size={14} className="text-red-700" fill="currentColor" fillOpacity={0.1} />
                <span>Emergency Medical US$50,000</span>
              </div>
              <div className="flex items-center gap-2 text-[11px] text-gray-600 font-medium">
                <CheckCircle2 size={14} className="text-red-700" fill="currentColor" fillOpacity={0.1} />
                <span>Trip Cancellation included</span>
              </div>
              <div className="flex items-center gap-2 text-[11px] text-gray-300 line-through font-medium">
                <CheckCircle2 size={14} className="text-gray-200" />
                <span>Adventure Sports Cover</span>
              </div>
            </div>

            <div className="mt-5 pt-4 border-t border-gray-150 flex items-center justify-between">
              <div>
                <span className="text-base font-extrabold text-gray-900">$24</span>
                <span className="text-[10px] text-gray-400 font-medium ml-0.5">/ Trip</span>
              </div>
              <button className="bg-[#0D1B3E] text-white text-xs font-bold px-5 py-2 rounded-xl active:scale-95 transition-transform">
                View Plan
              </button>
            </div>
          </div>

          {/* Card Component Item 2 */}
          <div className="bg-white border border-gray-200/80 rounded-2xl p-5 shadow-sm text-left">
            <h4 className="text-sm font-bold text-gray-900">Premium Plus</h4>
            <p className="text-[11px] text-gray-400 mt-0.5">For the frequent explorer</p>
            
            <div className="mt-4 space-y-2">
              <div className="flex items-center gap-2 text-[11px] text-gray-600 font-medium">
                <CheckCircle2 size={14} className="text-red-700" fill="currentColor" fillOpacity={0.1} />
                <span>Emergency Medical US$200,000</span>
              </div>
              <div className="flex items-center gap-2 text-[11px] text-gray-600 font-medium">
                <CheckCircle2 size={14} className="text-red-700" fill="currentColor" fillOpacity={0.1} />
                <span>Baggage Delay Cover</span>
              </div>
              <div className="flex items-center gap-2 text-[11px] text-gray-600 font-medium">
                <CheckCircle2 size={14} className="text-red-700" fill="currentColor" fillOpacity={0.1} />
                <span>Adventure Sports Cover</span>
              </div>
            </div>

            <div className="mt-5 pt-4 border-t border-gray-150 flex items-center justify-between">
              <div>
                <span className="text-base font-extrabold text-gray-900">$48</span>
                <span className="text-[10px] text-gray-400 font-medium ml-0.5">/ Trip</span>
              </div>
              <button className="bg-[#0D1B3E] text-white text-xs font-bold px-5 py-2 rounded-xl active:scale-95 transition-transform">
                View Plan
              </button>
            </div>
          </div>

        </div>
      </div>
<InsuranceFooter />
      {/* Persistent Bottom Tab Bar Navigation Row */}
      <div className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-white border-t border-gray-200 h-16 flex items-center justify-around z-50 px-2">
        <div className="flex flex-col items-center justify-center cursor-pointer text-[#620404]">
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z"/></svg>
          <span className="text-[10px] font-bold mt-0.5">Home</span>
        </div>
        <div className="flex flex-col items-center justify-center cursor-pointer text-gray-400 hover:text-gray-600">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
          <span className="text-[10px] font-semibold mt-0.5">Bookings</span>
        </div>
        <div className="flex flex-col items-center justify-center cursor-pointer text-gray-400 hover:text-gray-600">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M7 7h.01M6 20a1 1 0 02-1-1v-8.5a1 1 0 02.293-.707l7.5-7.5a1 1 0 021.414 0l5.5 5.5a1 1 0 020 1.414l-7.5 7.5a1 1 0 02-.707.293H6.5a1 1 0 02-1-1z"/></svg>
          <span className="text-[10px] font-semibold mt-0.5">Offers</span>
        </div>
        <div className="flex flex-col items-center justify-center cursor-pointer text-gray-400 hover:text-gray-600">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"/></svg>
          <span className="text-[10px] font-semibold mt-0.5">Trips</span>
        </div>
        <div className="flex flex-col items-center justify-center cursor-pointer text-gray-400 hover:text-gray-600">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg>
          <span className="text-[10px] font-semibold mt-0.5">Profile</span>
        </div>
      </div>
        
    </div>
  );
};

export default MobileInsuranceSearchSection;