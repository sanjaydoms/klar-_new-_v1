import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Shield, ArrowLeft, CheckCircle, Loader2 } from 'lucide-react';
import MainNavbar from '@/components/layout/Navbar/MainNavbar';
import { getVisaPlans } from '@/api/visaService.api';

// ─── COUNTRY BADGE MAPPING ──────────────────────────────────────────────────

const countryBadgeMapping: Record<string, string> = {
  'Dubai': 'UAE Government',
  'UAE': 'UAE Government',
  'United Arab Emirates': 'UAE Government',
  'USA': 'US Government',
  'United States': 'US Government',
  'United States of America': 'US Government',
  'US': 'US Government',
  'UK': 'UK Government',
  'United Kingdom': 'UK Government',
  'India': 'Indian Government',
  'Canada': 'Canadian Government',
  'Australia': 'Australian Government',
  'Singapore': 'Singapore Government',
  'Thailand': 'Thai Government',
  'Malaysia': 'Malaysian Government',
  'France': 'French Government',
  'Germany': 'German Government',
  'Italy': 'Italian Government',
  'Spain': 'Spanish Government',
  'Japan': 'Japanese Government',
  'South Korea': 'South Korean Government',
  'China': 'Chinese Government',
  'New Zealand': 'New Zealand Government',
  'Brazil': 'Brazilian Government',
};

// ─── VISA DATA TYPES ────────────────────────────────────────────────────────

interface VisaCard {
  _id?: string;
  id: string;
  title: string;
  isPopular?: boolean;
  processingTime: string;
  stayPeriod: string;
  validity: string;
  entry: string;
  fees?: string; // Optional since DB fields don't require it
  country: string;
  countryAliases?: string[];
}

// ─── HELPER TO GENERATE BACKUP DYNAMIC PLANS ───────────────────────────────

const generateDynamicPlans = (countryName: string): VisaCard[] => {
  return [
    {
      id: `dynamic-${countryName.toLowerCase()}-tourist`,
      title: 'Standard Tourist Visa',
      isPopular: true,
      processingTime: '4-7 Working Days',
      stayPeriod: '30 Days',
      validity: '90 Days',
      entry: 'Single Entry',
      country: countryName,
    },
    {
      id: `dynamic-${countryName.toLowerCase()}-business`,
      title: 'Commercial Business Visa',
      processingTime: '5-10 Working Days',
      stayPeriod: '90 Days',
      validity: '180 Days',
      entry: 'Multiple Entry',
      country: countryName,
    }
  ];
};

// ─── MAIN COMPONENT ──────────────────────────────────────────────────────────

export default function VisaPlans(): React.ReactElement {
  const navigate = useNavigate();
  const location = useLocation();
  
  const [visaCards, setVisaCards] = useState<VisaCard[]>([]);
  const [displayCountry, setDisplayCountry] = useState<string>('');
  const [badgeText, setBadgeText] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  
  useEffect(() => {
    const fetchPlansFromAPI = async () => {
      const state = location.state as { destinationCountry?: string } | null;
      let searchedCountry = '';
      
      if (state?.destinationCountry) {
        searchedCountry = state.destinationCountry;
        sessionStorage.setItem('visaCountry', searchedCountry);
      } else {
        const savedCountry = sessionStorage.getItem('visaCountry');
        if (savedCountry) {
          searchedCountry = savedCountry;
        }
      }
      
      if (searchedCountry) {
        const cleanCountry = searchedCountry.trim();
        const searchLower = cleanCountry.toLowerCase();
        setDisplayCountry(cleanCountry);
        setLoading(true);

        try {
          // ─── CALL GET API FUNCTION ───
          const apiResponse = await getVisaPlans();
          console.log("Visa Plans API Response:", apiResponse);
          let plansList: VisaCard[] = [];
          if (apiResponse && apiResponse.success && Array.isArray(apiResponse.data)) {
            plansList = apiResponse.data;
          }

          // Fallback to dynamic structural cards if API returns an empty array
          if (plansList.length === 0) {
            plansList = generateDynamicPlans(cleanCountry);
          }

          setVisaCards(plansList);
        } catch (error) {
          console.error('Failed to resolve custom visa plans array via api endpoint, triggering fallbacks:', error);
          setVisaCards(generateDynamicPlans(cleanCountry));
        } finally {
          setLoading(false);
        }
        
        // Setup structural regulatory agency badges
        let govName = countryBadgeMapping[cleanCountry];
        if (!govName) {
          const matchedKey = Object.keys(countryBadgeMapping).find(
            (key) => key.toLowerCase() === searchLower
          );
          if (matchedKey) {
            govName = countryBadgeMapping[matchedKey];
          }
        }
        
        if (govName) {
          setBadgeText(`Authorised Visa Agent - Official Partner of ${govName}`);
        } else {
          setBadgeText(`Authorised Visa Agent - Official ${cleanCountry} Travel Partner`);
        }
      } else {
        setVisaCards([]);
        setDisplayCountry('');
        setBadgeText('');
        setLoading(false);
      }
    };

    fetchPlansFromAPI();
  }, [location]);

  const handleBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate('/');
    }
  };

  const handleApplyNow = (card: VisaCard) => {
    // Determine the unique database string ID fallback
    const targetPlanId = card._id || card.id;
    console.log('🔑 Selected Visa Plan ID:', targetPlanId);
    
    // ✅ Store the ID and Plan Details in Storage for future validation layers
    sessionStorage.setItem('redirectAfterLogin', '/visa/form');
    sessionStorage.setItem('selectedVisaPlanId', targetPlanId);
    sessionStorage.setItem('selectedVisa', JSON.stringify(card));
    sessionStorage.setItem('selectedCountry', displayCountry);
    
    // Navigate forwarding parameters to multi-step configuration wizard
    navigate('/visa/form', {
      state: {
        visaPlanId: targetPlanId, // Pass ID to target application form component
        visaDetails: card,
        destinationCountry: displayCountry,
        visaType: card.title 
      },
    });
  };

  return (
    <>
      <MainNavbar activeService="visa" />

      {/* ─── MOBILE ONLY: HERO SECTION ─── */}
      <div className="block md:hidden relative w-full overflow-hidden" style={{ height: '220px' }}>
        <div 
          className="absolute inset-0 w-full h-full bg-cover bg-center"
          style={{
            backgroundImage: `url('/images/visa_bg.jpeg')`,
            backgroundColor: '#1a1a2e',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat',
          }}
        ></div>
        
        <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/20 to-black/30"></div>
        
        <button
          onClick={handleBack}
          className="absolute top-4 left-4 z-20 p-2 rounded-full bg-white/20 backdrop-blur-sm hover:bg-white/30 transition-all"
        >
          <ArrowLeft className="w-5 h-5 text-white" />
        </button>
        
        <div className="absolute inset-0 flex flex-col justify-center px-6">
          <div className="text-white">
            <p className="text-[10px] font-semibold text-white/70 tracking-[0.2em] uppercase mb-1">
              VISA PLANS
            </p>
            <h1 className="text-2xl font-bold text-white leading-tight">
              {displayCountry || 'Destination'} Plans
            </h1>
            <p className="text-sm text-white/80">
              Find the perfect visa for your journey.
            </p>
          </div>
        </div>
      </div>

      {/* ─── PAGE CONTENT ─── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 bg-gray-50 min-h-screen pt-20">
        
        {/* ─── LOADING SPIN LAYER ─── */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-32 space-y-4">
            <Loader2 className="w-12 h-12 text-[#1F2A6B] animate-spin" />
            <p className="text-gray-500 font-medium text-sm">Fetching verified visa configurations...</p>
          </div>
        ) : (
          <>
            {/* ─── VISA PLANS HEADER ─── */}
            {displayCountry && visaCards.length > 0 ? (
              <div className="text-center mb-6 mt-6">
                <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 mb-2">
                  <span className="text-[#1F2A6B]">{displayCountry}</span> Visa Plans
                </h1>
                
                <div className="mt-4 inline-flex items-center gap-2 bg-green-50 text-green-700 px-4 py-2 rounded-full text-sm font-semibold">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  99.2% Visas Approved before Time
                </div>
                
                {badgeText && (
                  <div className="mt-3 text-sm text-gray-600 font-medium">
                    {badgeText}
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-12 bg-white rounded-xl border border-gray-100 mt-6">
                <Shield className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-gray-700 mb-2">No Country Selected</h3>
                <p className="text-gray-500">
                  Please return to the main dashboard page and search for a destination country.
                </p>
              </div>
            )}

            {/* ─── VISA CARDS GRID ─── */}
            {displayCountry && visaCards.length > 0 && (
              <div className="mb-8">
                <h2 className="text-lg md:text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <Shield className="w-4 h-4 md:w-5 md:h-5 text-[#1F2A6B]" />
                  Available Visa Plans for {displayCountry}
                </h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {visaCards.map((card) => (
                    <div
                      key={card._id || card.id}
                      className="bg-white rounded-xl shadow-md border border-gray-100 overflow-hidden hover:shadow-lg transition-shadow duration-300"
                    >
                      <div className="p-5 md:p-6">
                        <div className="flex items-start justify-between mb-3">
                          <h3 className="text-lg font-bold text-gray-900">
                            {card.title}
                          </h3>
                          {card.isPopular && (
                            <span className="bg-gradient-to-r from-yellow-400 to-yellow-500 text-white text-xs font-bold px-3 py-1 rounded-full shadow-md whitespace-nowrap ml-2">
                              POPULAR
                            </span>
                          )}
                        </div>
                        
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between py-1 border-b border-gray-50">
                            <span className="text-gray-500">Processing time</span>
                            <span className="font-medium text-gray-800">{card.processingTime}</span>
                          </div>
                          <div className="flex justify-between py-1 border-b border-gray-50">
                            <span className="text-gray-500">Stay period</span>
                            <span className="font-medium text-gray-800">{card.stayPeriod}</span>
                          </div>
                          <div className="flex justify-between py-1 border-b border-gray-50">
                            <span className="text-gray-500">Validity</span>
                            <span className="font-medium text-gray-800">{card.validity}</span>
                          </div>
                          <div className="flex justify-between py-1 border-b border-gray-50">
                            <span className="text-gray-500">Entry</span>
                            <span className="font-medium text-gray-800">{card.entry}</span>
                          </div>
                        </div>
                        
                        <button
                          onClick={() => handleApplyNow(card)}
                          className="w-full mt-4 bg-[#1F2A6B] hover:bg-[#162055] text-white font-semibold py-2.5 rounded-lg transition-colors duration-200 text-sm"
                        >
                          Apply Now
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {/* ─── CALL TO ACTION BOX ─── */}
        <div className="bg-gradient-to-r from-[#1F2A6B] to-[#2A3B8A] rounded-2xl p-6 md:p-8 text-center text-white mt-12">
          <h3 className="text-lg md:text-xl font-bold mb-2">Not sure which visa to choose?</h3>
          <p className="text-white/80 text-xs md:text-sm mb-4">
            Let our visa experts guide you through the process and find the best option for your travel needs.
          </p>
          <button
            onClick={() => {
              sessionStorage.setItem('redirectAfterLogin', '/visa/form');
              navigate('/visa/form', { state: { destinationCountry: displayCountry } });
            }}
            className="bg-white text-[#1F2A6B] hover:bg-gray-100 font-semibold px-6 md:px-8 py-2 md:py-2.5 rounded-lg transition-colors duration-200 inline-flex items-center gap-2 text-sm md:text-base"
          >
            Contact Expert
            <span>→</span>
          </button>
        </div>
      </div>
    </>
  );
}