import {
  setItemWithTTL,
  getItemWithTTL,
  removeItem as removeTTLItem,
} from '@/utils/localStorageWithTTL';
import {
  Bell,
  MapPin,
  Search,
  Car,
  User,
  CheckCircle,
  ChevronDown,
  Plus,
  Globe,
  ArrowRight,
  Star,
  ChevronRight,
  Check,
  Clock,
  X,
} from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { searchCabLocations, getCabLatLong, getMyCabBookings } from '@/api/cabs.api';
import { useAuth } from '@/features/authentication/hooks/useAuth';
import WhyTravelWithKlar from '../../flights/components/WhyTravelWithKlar';
import CabSearchSection from '@/components/DashboardComponents/DashboardSearchCard/CabSearchSection';

export default function CabsContent() {
  const navigate = useNavigate();
  const { user, token, isAuthenticated } = useAuth();
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [faqCategory, setFaqCategory] = useState<string>('About TJ Cabs');
  const [cabBookings, setCabBookings] = useState<any[]>([]);
  const [isLoadingBookings, setIsLoadingBookings] = useState(false);
  const [bookingError, setBookingError] = useState<string | null>(null);
  const [isAddingCab, setIsAddingCab] = useState<string | null>(null);
  const [selectedRouteForSearch, setSelectedRouteForSearch] = useState<any | null>(null);

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

  const handleRouteClick = (route: any) => {
    setSelectedRouteForSearch(route);
  };

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

  const getPassengerNames = (travellerInfo: any[]) => {
    if (!travellerInfo || travellerInfo.length === 0) return 'N/A';
    return travellerInfo
      .map((t: any) => `${t.ti || ''} ${t.fN || ''} ${t.lN || ''}`.trim())
      .join(', ');
  };

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

  const hasFetchedBookings = useRef(false);

  // Reset ref on auth change
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
        // Use token and user from useAuth() first, fallback to localStorage
        // Check both 'token' and 'authToken' as different app parts use different keys
        const activeToken = token || getItemWithTTL('token') || localStorage.getItem('authToken');
        const activeUser = user || JSON.parse(localStorage.getItem('user') || 'null');

        let userId = activeUser?.id || activeUser?._id || activeUser?.userId;

        console.log('[CabsContent] Fetching bookings for User ID:', userId);

        if (!userId) {
          setBookingError('Please log in to view your real bookings.');
          setIsLoadingBookings(false);
          return;
        }

        // Fetch Cab bookings
        console.log('[CabsContent] Fetching cab bookings for User ID:', userId);
        const cabResponse = await getMyCabBookings(userId);
        if (cabResponse?.success && Array.isArray(cabResponse.data)) {
          setCabBookings(cabResponse.data);
        }
      } catch (err: any) {
        console.error('[CabsContent] Error fetching bookings:', err);
        setBookingError('Failed to load bookings. ' + (err.message || ''));
      } finally {
        setIsLoadingBookings(false);
      }
    };

    fetchBookings();
  }, [user, token]);

  return (
    <div className="bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <WhyTravelWithKlar />
        
        {/* Featured Verified Routes - MOVED TO TOP FOR VISIBILITY */}
        {featuredRoutes.length > 0 && (
          <section className="mb-20">
            <h2 className="text-2xl font-bold text-gray-900 mb-8 font-outfit">Featured Routes</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {featuredRoutes.map((route, idx) => (
                <button
                  key={idx}
                  onClick={() => handleRouteClick(route)}
                  className="text-left bg-white rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-all overflow-hidden flex flex-col group"
                >
                  <div className="h-32 overflow-hidden relative">
                    <img
                      src={route.image}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  </div>
                  <div className="p-4">
                    <div className="text-xs text-blue-600 font-bold mb-1">
                      {route.city}, {route.country}
                    </div>
                    <div className="text-sm text-gray-900 font-bold leading-tight">
                      {route.from} &rarr; {route.to}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </section>
        )}
        {/* My Recent Cab Bookings */}
        {isAuthenticated && cabBookings.length > 0 && (
          <section className="mb-20">
            <h2 className="text-2xl font-bold text-gray-900 mb-8 font-outfit">
              My Recent Cab Bookings
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {cabBookings.map((b: any, idx: number) => {
                const route = b.origin?.displayAddress && b.destination?.displayAddress
                  ? `${b.origin.displayAddress} to ${b.destination.displayAddress}`
                  : b.route || 'Route unavailable';
                  
                const displayDate = b.pickupDate
                  ? `${formatDateShort(b.pickupDate)} at ${formatTimeShort(b.pickupDate)}`
                  : b.date || 'Date unavailable';
                  
                const amount = b.totalAmount || b.fare || b.totalFare || 0;

                return (
                  <div
                    key={b.bookingId || idx}
                    className="p-4 bg-white border border-gray-200 rounded-xl shadow-sm"
                  >
                    <div className="font-bold text-gray-800">{b.bookingId || 'No ID'}</div>
                    <div className="text-sm text-gray-600">{route}</div>
                    <div className="text-sm text-gray-600">{displayDate}</div>
                    <div className="mt-2 flex gap-4">
                      <span className="text-sm font-semibold">{b.status || 'Pending'}</span>
                      <span className="text-sm font-bold text-blue-600">
                        ₹{Number(amount).toLocaleString('en-IN')}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}{' '}
        {/* How It Works Section */}
        <div className="mb-20">
          <h2 className="text-2xl font-bold text-gray-900 mb-2 font-outfit">
            How It Works – Booking Made Simple!
          </h2>
          <p className="text-gray-500 mb-10 max-w-2xl text-sm font-medium">
            TripJack brings you a smooth and reliable cab booking experience with a wide network of
            trusted operators across India.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {[
              {
                step: 1,
                title: 'Start with your route',
                desc: 'Enter the destination and number of passengers to see the best cab options.',
                color: 'bg-blue-100',
                iconColor: 'text-blue-500',
                icon: MapPin,
              },
              {
                step: 2,
                title: 'Pick the right ride',
                desc: "Scroll through and choose the cab that best fits your traveller's comfort and needs. Simple!",
                color: 'bg-yellow-50',
                iconColor: 'text-yellow-600',
                icon: Car,
              },
              {
                step: 3,
                title: 'Share traveller details',
                desc: "Add the traveller's contact info for pickup coordination. Special requests can be added on the review screen.",
                color: 'bg-red-50',
                iconColor: 'text-red-500',
                icon: User,
              },
              {
                step: 4,
                title: 'Confirm & relax',
                desc: "After you pay, we'll send your voucher. Driver details will follow 24 hours prior.",
                color: 'bg-green-100',
                iconColor: 'text-green-600',
                icon: CheckCircle,
              },
            ].map((item) => (
              <div
                key={item.step}
                className={`${item.color} rounded-2xl p-8 border border-white/50 backdrop-blur-sm shadow-sm transition-all hover:scale-105 duration-300`}
              >
                <div className={`${item.iconColor} mb-4`}>
                  <item.icon className="w-10 h-10" />
                </div>
                <div className="inline-block bg-white/60 px-3 py-1 rounded-lg text-[10px] font-bold text-gray-700 mb-4 uppercase tracking-widest">
                  Step {item.step}
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-3">{item.title}</h3>
                <p className="text-xs text-gray-600 leading-relaxed font-medium">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
        {/* FAQ Section */}
        <div className="mb-20 max-w-4xl">
          <h2 className="text-2xl font-bold text-gray-900 mb-8 font-outfit">
            Frequently Asked Questions
          </h2>
          <div className="flex gap-4 mb-10 overflow-x-auto pb-2 thin-scrollbar">
            {[
              'About TJ Cabs',
              'Booking Process',
              'Vehicle Options & Features',
              'Pricing & Commission',
            ].map((cat, idx) => (
              <button
                key={cat}
                onClick={() => setFaqCategory(cat)}
                className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all whitespace-nowrap shadow-sm ${cat === faqCategory ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-500 border border-gray-100 hover:bg-gray-50'}`}
              >
                {cat}
              </button>
            ))}
          </div>

          <div className="space-y-4">
            {faqs
              .filter((item) => item.category === faqCategory)
              .map((faq, idx) => (
                <div
                  key={idx}
                  className="bg-white rounded-2xl border border-gray-100 overflow-hidden transition-all shadow-sm"
                >
                  <button
                    onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
                    className="w-full px-8 py-6 flex items-center justify-between group transition-colors hover:bg-gray-50/50"
                  >
                    <span className="font-bold text-gray-800 text-left group-hover:text-blue-600 transition-colors">
                      {faq.question}
                    </span>
                    <div
                      className={`p-1 rounded-full border transition-all ${openFaq === idx ? 'border-orange-500 bg-orange-50 text-orange-500 rotate-180' : 'border-gray-200 text-gray-400 group-hover:border-gray-400'}`}
                    >
                      <Plus
                        className={`w-4 h-4 transition-transform ${openFaq === idx ? 'rotate-45' : ''}`}
                      />
                    </div>
                  </button>
                  {openFaq === idx && (
                    <div className="px-8 pb-8 text-sm text-gray-600 leading-relaxed animate-in slide-in-from-top-2 duration-300 font-medium">
                      {faq.answer}
                    </div>
                  )}
                </div>
              ))}
          </div>
        </div>
      </div>
      {selectedRouteForSearch && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-gray-50 rounded-2xl w-full max-w-5xl relative p-8 shadow-2xl animate-in fade-in zoom-in duration-300">
            <button 
              onClick={() => setSelectedRouteForSearch(null)} 
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-800 bg-white p-2 rounded-full shadow-sm hover:shadow-md transition-all z-[110]"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="mb-6">
              <h3 className="text-2xl font-bold text-gray-900 font-outfit">Complete your booking</h3>
              <p className="text-gray-500 mt-1">Select date and passengers for {selectedRouteForSearch.city}</p>
            </div>
            <div className="w-full">
               <CabSearchSection 
                 initialFrom={`${selectedRouteForSearch.from}`}
                 initialTo={`${selectedRouteForSearch.to}`}
                 initialFromPoints={{ ...selectedRouteForSearch.coords.origin, city: selectedRouteForSearch.city, country: selectedRouteForSearch.country }}
                 initialToPoints={{ ...selectedRouteForSearch.coords.destination, city: selectedRouteForSearch.city, country: selectedRouteForSearch.country }}
               />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
