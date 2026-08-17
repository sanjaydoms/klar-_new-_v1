import React, { useState, useEffect, useRef } from 'react';
import { Search, Globe, Loader2, AlertCircle, ChevronDown, FileText } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';

// ─── ISO Country Setup ──────────────────────────────────────────────────────

import countries from "i18n-iso-countries";
import enLocale from "i18n-iso-countries/langs/en.json";
countries.registerLocale(enLocale);

// ─── Types ───────────────────────────────────────────────────────────────────

export interface CountryItem {
  name: string;
  iso2: string;
}

const VISA_TYPES = [
  'Tourist Visa',
  'Business Visa',
  'Student Visa',
  'Dependent Visa',
  'Transit Visa',
  'Family Visa',
];

// ─── Country Search Function ────────────────────────────────────────────────

const searchCountries = (query: string): CountryItem[] => {
  if (!query) return [];
  const lowerQuery = query.toLowerCase().trim();

  const allCountriesObj = countries.getNames('en', { select: 'official' });
  const results: CountryItem[] = [];

  for (const [code, name] of Object.entries(allCountriesObj)) {
    if (name.toLowerCase().includes(lowerQuery) || code.toLowerCase() === lowerQuery) {
      results.push({
        name,
        iso2: code,
      });
    }
    if (results.length >= 10) break; // Limit suggestions list to top 10 matches
  }

  return results;
};

// ─── Main Visa Search Section ────────────────────────────────────────────────

interface VisaSearchSectionProps {
  activeTab?: string;
}

export default function VisaSearchSection({ activeTab = 'visas' }: VisaSearchSectionProps) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Search state parameters
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<CountryItem[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selectedCountry, setSelectedCountry] = useState<CountryItem | null>(null);

  // Visa type dropdown states
  const [selectedVisaType, setSelectedVisaType] = useState('');
  const [isTypeDropdownOpen, setIsTypeDropdownOpen] = useState(false);

  // Validation errors
  const [error, setError] = useState('');

  const wrapperRef = useRef<HTMLDivElement>(null);
  const typeDropdownRef = useRef<HTMLDivElement>(null);

  // Sync Visa Type from URL params (e.g. from VisaFooter clicks)
  useEffect(() => {
    const typeFromUrl = searchParams.get('type');
    if (typeFromUrl && VISA_TYPES.includes(typeFromUrl)) {
      setSelectedVisaType(typeFromUrl);
      setError('');
    }
  }, [searchParams]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
      if (typeDropdownRef.current && !typeDropdownRef.current.contains(event.target as Node)) {
        setIsTypeDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSearchChange = (text: string) => {
    setQuery(text);
    setSelectedCountry(null);
    setError('');

    if (text.trim().length > 0) {
      setLoading(true);
      const data = searchCountries(text);
      setSuggestions(data);
      setIsOpen(true);
      setLoading(false);
    } else {
      setIsOpen(false);
      setSuggestions([]);
    }
  };

  const handleSelectCountry = (country: CountryItem) => {
    setQuery(country.name);
    setSelectedCountry(country);
    setError('');
    setIsOpen(false);
  };

  const handleSelectVisaType = (type: string) => {
    setSelectedVisaType(type);
    setError('');
    setIsTypeDropdownOpen(false);
  };

  const handleSearchSubmit = () => {
    if (!selectedCountry) {
      setError('Please select a valid destination country from the suggestions list.');
      return;
    }
    if (!selectedVisaType) {
      setError('Please select a valid Visa Type from the dropdown list.');
      return;
    }

    const redirectUrl = '/visa-plans';
    sessionStorage.setItem('redirectAfterLogin', redirectUrl);
    sessionStorage.setItem('visaRedirectKey', redirectUrl);
    sessionStorage.setItem('visaCountry', selectedCountry.name);
    sessionStorage.setItem('selectedVisaType', selectedVisaType);

    console.log('🔑 Country selected:', selectedCountry.name, '| Type:', selectedVisaType);

    navigate('/visa-plans', {
      state: {
        destinationCountry: selectedCountry.name,
        destinationCode: selectedCountry.iso2,
        visaType: selectedVisaType,
      },
    });
  };

  return (
    <div id="visa-search-section" className="w-full max-w-4xl mx-auto px-3 sm:px-4">
      <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6 sm:p-8 space-y-6">
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          
          {/* DESTINATION COUNTRY INPUT */}
          <div className="relative" ref={wrapperRef}>
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-2">
              Destination Country
            </label>

            <div className="relative flex items-center">
              <div className="absolute left-4 text-gray-400">
                <Globe className="w-5 h-5" />
              </div>

              <input
                type="text"
                placeholder="Where are you traveling to?"
                value={query}
                onChange={(e) => handleSearchChange(e.target.value)}
                className={`w-full bg-[#F7F8FA] pl-12 pr-12 py-3.5 rounded-xl outline-none text-gray-800 border transition-all font-medium text-sm placeholder:text-gray-400 ${
                  error && !selectedCountry
                    ? 'border-red-500 focus:border-red-500 focus:ring-4 focus:ring-red-500/10'
                    : 'border-gray-200 focus:border-[#1F2A6B] focus:ring-4 focus:ring-[#1F2A6B]/10'
                }`}
              />

              {loading && (
                <div className="absolute right-4">
                  <Loader2 className="text-gray-400 animate-spin" size={18} />
                </div>
              )}
            </div>

            {/* COUNTRY SUGGESTIONS DROPDOWN */}
            {isOpen && suggestions.length > 0 && (
              <div className="absolute z-[999] w-full mt-2 bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden max-h-[200px] overflow-y-auto">
                {suggestions.map((country) => (
                  <div
                    key={country.iso2}
                    onClick={() => handleSelectCountry(country)}
                    className="px-5 py-3 hover:bg-blue-50/70 cursor-pointer border-b border-gray-100 last:border-0 flex items-center justify-between transition-colors"
                  >
                    <span className="font-bold text-gray-900 text-sm">
                      {country.name}
                    </span>
                    <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded shrink-0">
                      {country.iso2}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {isOpen && suggestions.length === 0 && query.trim().length > 0 && !loading && (
              <div className="absolute z-[999] w-full mt-2 bg-white rounded-xl shadow-2xl border border-gray-200 p-4 text-center text-sm text-gray-500">
                No countries found matching "{query}".
              </div>
            )}
          </div>

          {/* VISA TYPE DROPDOWN */}
          <div className="relative" ref={typeDropdownRef}>
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-2">
              Visa Type
            </label>

            <button
              type="button"
              onClick={() => setIsTypeDropdownOpen(!isTypeDropdownOpen)}
              className={`w-full bg-[#F7F8FA] px-4 py-3.5 rounded-xl outline-none text-left flex items-center justify-between border transition-all text-sm font-medium ${
                error && !selectedVisaType
                  ? 'border-red-500 focus:border-red-500 focus:ring-4 focus:ring-red-500/10'
                  : 'border-gray-200 focus:border-[#1F2A6B] focus:ring-4 focus:ring-[#1F2A6B]/10'
              }`}
            >
              <div className="flex items-center gap-3">
                <FileText className="w-5 h-5 text-gray-400 shrink-0" />
                <span className={selectedVisaType ? 'text-gray-800' : 'text-gray-400'}>
                  {selectedVisaType || 'Select visa type...'}
                </span>
              </div>
              <ChevronDown
                className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${
                  isTypeDropdownOpen ? 'rotate-180' : ''
                }`}
              />
            </button>

            {isTypeDropdownOpen && (
              <div className="absolute z-[999] w-full mt-2 bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden max-h-[240px] overflow-y-auto">
                {VISA_TYPES.map((type) => (
                  <div
                    key={type}
                    onClick={() => handleSelectVisaType(type)}
                    className={`px-5 py-3 hover:bg-blue-50/70 cursor-pointer border-b border-gray-100 last:border-0 text-sm font-medium text-gray-700 transition-colors ${
                      selectedVisaType === type ? 'bg-blue-50/40 text-[#1F2A6B] font-semibold' : ''
                    }`}
                  >
                    {type}
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

        {error && (
          <div className="flex items-center gap-1.5 text-sm text-red-600 font-medium animate-fadeIn">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="flex justify-center pt-2">
          <button
            onClick={handleSearchSubmit}
            className="w-full sm:w-auto bg-[#7A1315] hover:bg-[#5a0e10] text-white font-bold flex items-center justify-center gap-2 px-12 py-3.5 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 active:scale-[0.98] text-sm"
          >
            <Search className="w-4 h-4" />
            <span>Check Requirements</span>
          </button>
        </div>

      </div>
    </div>
  );
}