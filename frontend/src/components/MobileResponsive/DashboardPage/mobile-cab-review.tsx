import React, { useState, useRef, useEffect } from 'react';
import { Users, Search, ArrowLeftRight, ChevronDown, Minus, Plus, ArrowLeft, Shield, Calendar, Lock, Tag, Plane, Building, Mountain, Clock, MessageCircle, MapPin, Car, User, CheckCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import CabLocationAutocomplete from '@/features/cabs/components/CabLocationAutocomplete';
import BottomNav from './BottomNav';
import { getMyCabBookings } from '@/api/cabs.api';
import { useAuth } from '@/features/authentication/hooks/useAuth';

const MobileCabReview: React.FC = () => {
    const navigate = useNavigate();
    const [cabMode, setCabMode] = useState<'airport' | 'outstation' | 'local'>('airport');
    const [from, setFrom] = useState('');
    const [to, setTo] = useState('');
    const [fromPoints, setFromPoints] = useState(null);
    const [toPoints, setToPoints] = useState(null);
    const [fromCity, setFromCity] = useState(undefined);
    const [showGlobalError, setShowGlobalError] = useState(false);

const featuredRoutes = [
    {
      city: 'Dubai',
      country: 'UAE',
      from: 'Dubai Intl Airport (DXB)',
      to: 'Burj Khalifa',
      coords: {
        origin: { lat: 25.2532, long: 55.3657 },
        destination: { lat: 25.1972, long: 55.2744 },
      },
      image:
        'https://images.unsplash.com/photo-1512453979798-5ea266f8880c?auto=format&fit=crop&q=80&w=600',
    },
    {
      city: 'London',
      country: 'UK',
      from: 'Heathrow Airport (LHR)',
      to: 'Piccadilly Circus',
      coords: {
        origin: { lat: 51.47, long: -0.4543 },
        destination: { lat: 51.5101, long: -0.1342 },
      },
      image:
        'https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?auto=format&fit=crop&q=80&w=600',
    },
    {
      city: 'Singapore',
      country: 'Singapore',
      from: 'Changi Airport (SIN)',
      to: 'Marina Bay Sands',
      coords: {
        origin: { lat: 1.3644, long: 103.9915 },
        destination: { lat: 1.2847, long: 103.861 },
      },
      image:
        'https://images.unsplash.com/photo-1525596662741-e94ff9f26de1?auto=format&fit=crop&q=80&w=600',
    },
    {
      city: 'Paris',
      country: 'France',
      from: 'Charles de Gaulle (CDG)',
      to: 'Eiffel Tower',
      coords: {
        origin: { lat: 49.0097, long: 2.5479 },
        destination: { lat: 48.8584, long: 2.2945 },
      },
      image:
        'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?auto=format&fit=crop&q=80&w=600',
    },
    {
      city: 'New Delhi',
      country: 'India',
      from: 'IGI Airport (DEL)',
      to: 'Connaught Place',
      coords: {
        origin: { lat: 28.5562, long: 77.1 },
        destination: { lat: 28.6304, long: 77.2177 },
      },
      image:
        'https://wallpaperaccess.com/full/1896207.jpg',
    },
    {
      city: 'Mumbai',
      country: 'India',
      from: 'CSM International (BOM)',
      to: 'Marine Drive',
      coords: {
        origin: { lat: 19.0896, long: 72.8656 },
        destination: { lat: 18.9431, long: 72.823 },
      },
      image:
        'https://wallpapercave.com/wp/wp3023590.jpg',
    },
    {
      city: 'Bangalore',
      country: 'India',
      from: 'Kempegowda (BLR)',
      to: 'Whitefield',
      coords: {
        origin: { lat: 13.1986, long: 77.7066 },
        destination: { lat: 12.9698, long: 77.75 },
      },
      image:
        'https://cdn.britannica.com/91/189791-050-4CE6663A/Bangalore-Palace-Bengaluru-India.jpg',
    },
    {
      city: 'Pune',
      country: 'India',
      from: 'Pune Airport (PNQ)',
      to: 'Koregaon Park',
      coords: {
        origin: { lat: 18.5793, long: 73.9089 },
        destination: { lat: 18.5362, long: 73.894 },
      },
      image:
        'https://hblimg.mmtcdn.com/content/hubble/img/dest_img/mmt/activities/m_Pune_dest_landscape_l_1181_1784.jpg',
    },
    {
      city: 'Jaipur',
      country: 'India',
      from: 'Jaipur Airport (JAI)',
      to: 'Hawa Mahal',
      coords: {
        origin: { lat: 26.8289, long: 75.8056 },
        destination: { lat: 26.9239, long: 75.8267 },
      },
      image:
        'https://images.unsplash.com/photo-1599661046289-e31897846e41?auto=format&fit=crop&q=80&w=600',
    },
    {
      city: 'Kochi',
      country: 'India',
      from: 'Kochi Airport (COK)',
      to: 'Fort Kochi',
      coords: {
        origin: { lat: 10.1518, long: 76.393 },
        destination: { lat: 9.9658, long: 76.2421 },
      },
      image:
        'https://images.unsplash.com/photo-1602216056096-3b40cc0c9944?auto=format&fit=crop&q=80&w=600',
    },
    {
      city: 'Tokyo',
      country: 'Japan',
      from: 'Narita Airport (NRT)',
      to: 'Shinjuku Station',
      coords: {
        origin: { lat: 35.7767, long: 140.3189 },
        destination: { lat: 35.6909, long: 139.7003 },
      },
      image:
        'https://images.unsplash.com/photo-1503899036084-c55cdd92da26?auto=format&fit=crop&q=80&w=600',
    },
    {
      city: 'Sydney',
      country: 'Australia',
      from: 'Sydney Airport (SYD)',
      to: 'Opera House',
      coords: {
        origin: { lat: -33.9399, long: 151.1753 },
        destination: { lat: -33.8568, long: 151.2153 },
      },
      image:
        'https://images.unsplash.com/photo-1506973035872-a4ec16b8e8d9?auto=format&fit=crop&q=80&w=600',
    },
  ];
const faqs = [
    {
      category: 'About TJ Cabs',
      question: 'Is there a free trial available?',
      answer:
        "yes, you can try us for free for 30 days. If you want, we'll provide you with a free, personalized 30-minute onboarding call to get you up and running as soon as possible.",
    },
    {
      category: 'Booking Process',
      question: 'Can I change my plan later?',
      answer: 'Yes, you can upgrade or downgrade your plan at any time from your settings.',
    },
    {
      category: 'Pricing & Commission',
      question: 'What is your cancellation policy?',
      answer:
        'Cancellations made 24 hours prior to the trip start time are eligible for a full refund. Specific operator policies may vary.',
    },
    {
      category: 'Vehicle Options & Features',
      question: 'Can other info be added to an invoice?',
      answer:
        'Yes, you can add GST numbers and other corporate details during the booking process or from your profile.',
    },
  ];
const formatDateShort = (dateString: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: '2-digit',
      year: 'numeric',
    });
  };
const formatTimeShort = (dateString: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  };

  const { user, token, isAuthenticated } = useAuth();
  const [cabBookings, setCabBookings] = useState<any[]>([]);
  const [isLoadingBookings, setIsLoadingBookings] = useState(false);
  const [bookingError, setBookingError] = useState<string | null>(null);
  const hasFetchedBookings = useRef(false);
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [faqCategory, setFaqCategory] = useState<string>('About TJ Cabs');

  useEffect(() => {
    hasFetchedBookings.current = false;
  }, [user, token]);

  useEffect(() => {
    if (!user) return;
    if (hasFetchedBookings.current) return;
    hasFetchedBookings.current = true;

    const fetchBookings = async () => {
      setIsLoadingBookings(true);
      setBookingError(null);
      try {
        const activeToken = token || localStorage.getItem('token') || localStorage.getItem('authToken');
        const activeUser = user || JSON.parse(localStorage.getItem('user') || 'null');
        let userId = activeUser?.id || activeUser?._id || activeUser?.userId;
        if (!userId) {
          setIsLoadingBookings(false);
          return;
        }
        const cabResponse = await getMyCabBookings(userId);
        if (cabResponse?.success && Array.isArray(cabResponse.data)) {
          setCabBookings(cabResponse.data);
        }
      } catch (err: any) {
        setBookingError('Failed to load bookings.');
      } finally {
        setIsLoadingBookings(false);
      }
    };
    fetchBookings();
  }, [user, token]);

  const handleRouteClick = (route: any) => {
    const d = new Date();
    d.setDate(d.getDate() + 2);
    d.setHours(10, 0, 0, 0);

    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const pickupDateStr = `${year}-${month}-${day} 10:00`;

    const searchParams = {
      journeyType: 'airport_transfer',
      tripType: 'oneway',
      pickupDate: pickupDateStr,
      origin: route.coords.origin,
      destination: route.coords.destination,
      passengers: 1,
      bags: 2,
      from: `${route.from}, ${route.city}, ${route.country}`,
      to: `${route.to}, ${route.city}, ${route.country}`,
    };
    sessionStorage.setItem('cabSearchParams', JSON.stringify(searchParams));
    navigate('/cabs/search');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };


    const getLocalISOString = (date) => {
        const offset = date.getTimezoneOffset() * 60000;
        return new Date(date.getTime() - offset).toISOString().slice(0, 16);
    };

    const getDefaultDate = () => {
        const d = new Date();
        d.setDate(d.getDate() + 1);
        d.setHours(10, 0, 0, 0);
        return getLocalISOString(d);
    };

    const [pickupDateRaw, setPickupDateRaw] = useState(getDefaultDate());
    const [returnDateRaw, setReturnDateRaw] = useState('');
    const pickupInputRef = useRef(null);
    const returnInputRef = useRef(null);
    const [focusedField, setFocusedField] = useState(null);
    const [passengers, setPassengers] = useState(1);
    const [bags, setBags] = useState(2);
    const [showPaxDropdown, setShowPaxDropdown] = useState(false);
    const [errors, setErrors] = useState({});
    const [touched, setTouched] = useState({});

    const formatDateDisplay = (dateStr) => {
        if (!dateStr) return '';
        const date = new Date(dateStr);
        return date.toLocaleDateString('en-GB', {
            weekday: 'short',
            day: '2-digit',
            month: 'short',
            year: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
        }).replace(/,/g, '');
    };

    const inputWrapperClass = (fieldName) => `bg-white rounded-xl flex items-center px-4 py-3 shadow-sm h-[52px] w-full relative border transition-all ${focusedField === fieldName ? "border-blue-500 ring-2 ring-blue-50" : (errors[fieldName] && touched[fieldName] ? "border-red-300 bg-red-50" : "border-gray-100 hover:border-blue-400")}`;

    const validate = () => {
        const newErrors = {};
        if (!from.trim()) newErrors.from = "Pickup location is required.";
        if (!to.trim()) newErrors.to = "Destination is required.";
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
                pickupDate: pickupDateRaw.replace('T', ' '),
                passengers,
                bags,
                from,
                to,
                returnDate: returnDateRaw ? returnDateRaw.replace('T', ' ') : undefined
            };
            sessionStorage.setItem('cabSearchParams', JSON.stringify(searchParams));
            navigate('/cabs/search');
        } else {
            setShowGlobalError(true);
        }
    };

    const handleSwap = (e) => {
        e.stopPropagation();
        const temp = from;
        setFrom(to);
        setTo(temp);
    };

   const handleBack = () => {
    const fromCabResults = sessionStorage.getItem('fromCabResults') === 'true';
    
    if (fromCabResults) {
        sessionStorage.removeItem('fromCabResults');
        navigate('/cabs/search');
    } else {
        navigate('/'); // Go to dashboard/home
    }
};

    return (
        <div className="min-h-screen bg-gray-50">
            <div className="container mx-auto px-4 py-4 pb-24">
                                {/* ===== IMAGE WITH TEXT OVERLAY ===== */}
                <div className="relative -mx-4 -mt-4 mb-6 overflow-hidden h-[326px]">
                    <img 
                        src="/images/cabmobilescreen.jpg" 
                        alt="Cab banner"
                        className="w-full h-full object-cover"
                    />
                    
                    <button
                        onClick={handleBack}
                        className="absolute top-4 left-4 p-2 rounded-full bg-white/90 hover:bg-white shadow-lg transition-all z-20"
                    >
                        <ArrowLeft className="w-6 h-6 text-gray-800" />
                    </button>

                    <div className="absolute top-4 left-16 z-20">
                        <h1 className="text-3xl font-bold text-white">
                            Cabs
                        </h1>
                    </div>

                    <div className="absolute top-20 left-4 z-20">
                        <p className="text-2xl font-bold text-white/95">
                            Commute made simple
                        </p>
                    </div>

                    <div className="absolute top-[112px] left-4 z-20">
                        <p className="text-sm font-medium text-white/80">
                            Book city cabs airport transfers and
                        </p>
                        <p className="text-sm font-medium text-white/80">
                            outstation journeys
                        </p>
                    </div>

                    <div className="absolute inset-0 bg-black/30 z-10"></div>
                </div>

                <input
                    type="datetime-local"
                    ref={pickupInputRef}
                    style={{ position: 'absolute', opacity: 0, width: '1px', height: '1px', zIndex: -1 }}
                    value={pickupDateRaw}
                    onChange={(e) => setPickupDateRaw(e.target.value)}
                    min={getLocalISOString(new Date())}
                />
                <input
                    type="datetime-local"
                    ref={returnInputRef}
                    style={{ position: 'absolute', opacity: 0, width: '1px', height: '1px', zIndex: -1 }}
                    value={returnDateRaw}
                    onChange={(e) => setReturnDateRaw(e.target.value)}
                    min={pickupDateRaw || getLocalISOString(new Date())}
                />

                {/* ===== CAB MODE SELECTION - OUTSIDE WHITE BOX ===== */}
                <div className="flex items-center gap-4 mb-4 overflow-x-auto pb-2">
                    {[
                        { id: 'airport', label: 'Airport Transfers' },
                        { id: 'outstation', label: 'Outstation' },
                        { id: 'local', label: 'Local' }
                    ].map((mode) => (
                        <label key={mode.id} className="flex items-center gap-2 cursor-pointer group whitespace-nowrap">
                            <div className="relative flex items-center justify-center">
                                <input
                                    type="radio"
                                    name="cabModeMobile"
                                    checked={cabMode === mode.id}
                                    onChange={() => setCabMode(mode.id)}
                                    className="w-5 h-5 appearance-none border-2 border-gray-300 rounded-full checked:border-primary transition-all cursor-pointer"
                                />
                                {cabMode === mode.id && (
                                    <div className="absolute w-2.5 h-2.5 bg-primary rounded-full" />
                                )}
                            </div>
                            <span className={`text-sm font-medium transition-colors ${cabMode === mode.id ? 'text-gray-900' : 'text-gray-500'}`}>
                                {mode.label}
                            </span>
                        </label>
                    ))}
                </div>

                {/* ===== WHITE BOX ===== */}
                <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-4">
                    
                    {/* From and To */}
                    <div className="grid grid-cols-1 gap-2 items-start mb-2 relative z-[60]">
                        <div className="flex flex-col gap-1 w-full">
                            <div className={inputWrapperClass('from')}>
                                <CabLocationAutocomplete
                                    value={from}
                                    onFocus={() => setFocusedField('from')}
                                    onBlur={() => setFocusedField(null)}
                                    onChange={(val, details) => {
                                        setFrom(val);
                                        if (details) setFromPoints(details);
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

                    {/* Pickup and Return Dates */}
                    <div className="grid grid-cols-2 gap-2 mb-2 relative z-10">
                        <div
                            onClick={() => pickupInputRef.current?.showPicker?.()}
                            className={`${inputWrapperClass('pickupDate')} flex-col items-start py-2 h-auto`}
                        >
                            <div className="flex items-center mb-1">
                                <span className="text-[11px] text-gray-400 font-bold uppercase tracking-wider">Pickup Date</span>
                            </div>
                            <span className="text-[13px] font-bold text-gray-900 truncate w-full">
                                {formatDateDisplay(pickupDateRaw) || "Select Date"}
                            </span>
                        </div>

                        <div
                            onClick={() => returnInputRef.current?.showPicker?.()}
                            className={`${inputWrapperClass('returnDate')} flex-col items-start py-2 h-auto`}
                        >
                            <div className="flex items-center mb-1">
                                <span className="text-[11px] text-gray-400 font-bold uppercase tracking-wider">Return (Opt)</span>
                            </div>
                            <span className={`text-[13px] font-bold truncate w-full ${returnDateRaw ? 'text-gray-900' : 'text-gray-400'}`}>
                                {returnDateRaw ? formatDateDisplay(returnDateRaw) : "Select date"}
                            </span>
                        </div>
                    </div>

                    {/* Passengers */}
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
                            <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${showPaxDropdown ? 'rotate-180' : ''}`} />
                        </button>
                        {showPaxDropdown && (
                            <div className="absolute top-[110%] left-0 right-0 bg-white rounded-xl shadow-xl border border-gray-100 p-4 z-50">
                                <div className="space-y-6">
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm font-bold text-gray-900">Passengers</span>
                                        <div className="flex items-center gap-4">
                                            <button onClick={() => setPassengers(Math.max(1, passengers - 1))} className="w-8 h-8 rounded-full border border-primary/30 flex items-center justify-center text-primary hover:bg-primary/10"><Minus className="w-4 h-4" /></button>
                                            <span className="text-sm font-bold text-gray-900 min-w-[20px] text-center">{passengers}</span>
                                            <button onClick={() => setPassengers(Math.min(10, passengers + 1))} className="w-8 h-8 rounded-full border border-primary/30 flex items-center justify-center text-primary hover:bg-primary/10"><Plus className="w-4 h-4" /></button>
                                        </div>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm font-bold text-gray-900">Bags</span>
                                        <div className="flex items-center gap-4">
                                            <button onClick={() => setBags(Math.max(0, bags - 1))} className="w-8 h-8 rounded-full border border-primary/30 flex items-center justify-center text-primary hover:bg-primary/10"><Minus className="w-4 h-4" /></button>
                                            <span className="text-sm font-bold text-gray-900 min-w-[20px] text-center">{bags}</span>
                                            <button onClick={() => setBags(Math.min(10, bags + 1))} className="w-8 h-8 rounded-full border border-primary/30 flex items-center justify-center text-primary hover:bg-primary/10"><Plus className="w-4 h-4" /></button>
                                        </div>
                                    </div>
                                    <button onClick={() => setShowPaxDropdown(false)} className="w-full bg-primary text-white font-bold py-2.5 rounded-lg mt-2">Done</button>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Search Button */}
                    <div className="flex justify-center mb-4">
                        <button
                            onClick={handleSearch}
                            className="bg-primary hover:bg-[#5a0e10] text-white font-bold flex items-center gap-2 px-10 py-3 rounded-lg shadow-lg transition-all active:scale-95 whitespace-nowrap"
                        >
                            <Search className="w-5 h-5" />
                            Search Cabs
                        </button>
                    </div>

                    {/* Divider Line */}
                    <div className="border-t-2 border-primary -mx-4 mb-4"></div>

                    {/* Features */}
                    <div className="grid grid-cols-3 gap-3">
                        <div className="flex flex-col items-center p-2 rounded-lg bg-gray-50/80">
                            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center mb-1">
                                <Tag className="w-5 h-5 text-primary" />
                            </div>
                            <span className="text-[10px] font-medium text-gray-700 text-center leading-tight">Best Price</span>
                            <span className="text-[10px] font-medium text-gray-700 text-center leading-tight">Guarantee</span>
                        </div>

                        <div className="flex flex-col items-center p-2 rounded-lg bg-gray-50/80">
                            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center mb-1">
                                <Calendar className="w-5 h-5 text-primary" />
                            </div>
                            <span className="text-[10px] font-medium text-gray-700 text-center leading-tight">Flexible</span>
                            <span className="text-[10px] font-medium text-gray-700 text-center leading-tight">Booking</span>
                        </div>

                        <div className="flex flex-col items-center p-2 rounded-lg bg-gray-50/80">
                            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center mb-1">
                                <Lock className="w-5 h-5 text-primary" />
                            </div>
                            <span className="text-[10px] font-medium text-gray-700 text-center leading-tight">Secure</span>
                            <span className="text-[10px] font-medium text-gray-700 text-center leading-tight">Payments</span>
                        </div>
                    </div>
                </div>

                        {/* Featured Routes */}
        {featuredRoutes && featuredRoutes.length > 0 && (
          <div className="mt-10">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Featured Routes</h2>
            <div className="flex gap-4 overflow-x-auto pb-4 snap-x snap-mandatory thin-scrollbar">
              {featuredRoutes.map((route: any, idx: number) => (
                <button
                  key={idx}
                  onClick={() => handleRouteClick(route)}
                  className="text-left bg-white rounded-2xl shadow-sm border border-gray-100 shrink-0 w-64 overflow-hidden snap-center"
                >
                  <div className="h-32 overflow-hidden relative">
                    <img
                      src={route.image}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="p-4">
                    <div className="text-xs text-primary font-bold mb-1">
                      {route.city}, {route.country}
                    </div>
                    <div className="text-sm text-gray-900 font-bold leading-tight">
                      {route.from} &rarr; {route.to}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* My Recent Cab Bookings */}
        {isAuthenticated && cabBookings.length > 0 && (
          <div className="mt-10 mb-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">My Recent Cab Bookings</h2>
            <div className="space-y-4">
              {cabBookings.map((b: any, idx: number) => {
                const route = b.origin?.displayAddress && b.destination?.displayAddress
                  ? `${b.origin.displayAddress} to ${b.destination.displayAddress}`
                  : b.route || 'Route unavailable';
                  
                const displayDate = b.pickupDate
                  ? `${formatDateShort(b.pickupDate)} at ${formatTimeShort(b.pickupDate)}`
                  : b.date || 'Date unavailable';
                  
                const amount = b.totalAmount || b.fare || b.totalFare || 0;

                return (
                  <div key={b.bookingId || idx} className="p-4 bg-white border border-black rounded-xl shadow-sm">
                    <div className="font-bold text-gray-800">{b.bookingId || 'No ID'}</div>
                    <div className="text-sm text-gray-600">{route}</div>
                    <div className="text-sm text-gray-600">{displayDate}</div>
                    <div className="mt-2 flex gap-4">
                      <span className="text-sm font-semibold">{b.status || 'Pending'}</span>
                      <span className="text-sm font-bold text-blue-600">₹{Number(amount).toLocaleString('en-IN')}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* How It Works */}
        <div className="mt-8">
          <h2 className="text-xl font-bold text-gray-900 mb-4">How It Works</h2>
          <div className="space-y-4">
            {[
              { step: 1, title: 'Start with your route', desc: 'Enter destination and passengers.', icon: MapPin, color: 'bg-blue-100 text-blue-600' },
              { step: 2, title: 'Pick the right ride', desc: 'Choose the cab that fits your needs.', icon: Car, color: 'bg-yellow-100 text-yellow-600' },
              { step: 3, title: 'Share traveller details', desc: 'Add contact info for pickup.', icon: User, color: 'bg-red-100 text-red-600' },
              { step: 4, title: 'Confirm & relax', desc: 'Get your voucher and driver details.', icon: CheckCircle, color: 'bg-green-100 text-green-600' },
            ].map((item) => (
              <div key={item.step} className="flex items-start gap-4 p-4 bg-white rounded-xl shadow-sm border border-gray-100">
                <div className={`p-3 rounded-xl ${item.color}`}>
                  <item.icon className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Step {item.step}</div>
                  <h3 className="text-sm font-bold text-gray-900">{item.title}</h3>
                  <p className="text-xs text-gray-600 mt-1">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* FAQs */}
        <div className="mt-8 mb-8">
          <h2 className="text-xl font-bold text-gray-900 mb-4">FAQ</h2>
          <div className="flex gap-2 mb-4 overflow-x-auto pb-2 thin-scrollbar">
            {['About TJ Cabs', 'Booking Process', 'Vehicle Options & Features', 'Pricing & Commission'].map((cat) => (
              <button
                key={cat}
                onClick={() => setFaqCategory(cat)}
                className={`px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap ${cat === faqCategory ? 'bg-primary text-white' : 'bg-white text-gray-600 border border-gray-200'}`}
              >
                {cat}
              </button>
            ))}
          </div>
          <div className="space-y-3">
            {faqs && faqs.filter(f => f.category === faqCategory).map((faq: any, idx: number) => (
              <div key={idx} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <button onClick={() => setOpenFaq(openFaq === idx ? null : idx)} className="w-full p-4 flex items-center justify-between text-left">
                  <span className="font-bold text-sm text-gray-800">{faq.question}</span>
                  <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${openFaq === idx ? 'rotate-180' : ''}`}/>
                </button>
                {openFaq === idx && (
                  <div className="px-4 pb-4 text-xs text-gray-600">{faq.answer}</div>
                )}
              </div>
            ))}
          </div>
        </div>
            </div>
            <BottomNav />
        </div>
    );
};

export default MobileCabReview;