import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ChevronLeft, Loader2, AlertCircle } from 'lucide-react';
import InsuranceNavbar from './InsuranceNavbar';
import { reviewInsurancePlan } from '@/api/insuranceService.api';
import { notifyError } from '@/utils/notify';

interface InsurancePlan {
  id: string;
  plid: string;
  name: string;
  tier: string;
  assistance: string;
  travelCoverAmount: string;
  price: number;
  earnPoints: number;
  benefits: string[];
  totalBenefitsCount: number;
  provider: string;
}

const InsuranceSearchPage: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const [plans, setPlans] = useState<InsurancePlan[]>([]);
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    const apiResponse = location.state;
    const pliData = apiResponse?.body?.isr?.iinfo?.pli;

    if (pliData && Array.isArray(pliData)) {
      const allFormattedPlans: InsurancePlan[] = [];

      pliData.forEach((pliItem: any) => {
        const packageListId = pliItem.plid;

        if (pliItem.pi && Array.isArray(pliItem.pi)) {
          pliItem.pi.forEach((plan: any) => {
            allFormattedPlans.push({
              id: plan.pid,
              plid: packageListId,
              name: plan.pi || 'Classic Plan',
              tier: (plan.pi || 'SILVER').toUpperCase(),
              assistance: '24/7 Assistance',
              travelCoverAmount: plan.pn || '$50,000',
              price: plan.ptf || 0,
              earnPoints: Math.floor((plan.ptf || 0) * 0.05),
              provider: plan.ip === 'ABHI' ? 'Aditya Birla Health Insurance' : plan.ip,
              totalBenefitsCount: plan.pbft?.length || 0,
              benefits: plan.pbft?.map((b: any) => b.name) || [],
            });
          });
        }
      });

      setPlans(allFormattedPlans);
      setIsLoading(false);
    } else {
      setIsLoading(false);
    }
  }, [location.state]);

  const handleProceedToDetails = async () => {
    const selectedPlan = plans.find((p) => p.id === selectedPlanId);
    if (!selectedPlan) return;

    setIsProcessing(true);

    const payload = {
      pli: [
        {
          plid: selectedPlan.plid,
          pi: [{ pid: selectedPlan.id }],
        },
      ],
    };

    try {
      const response = await reviewInsurancePlan(payload);
      if (response.status === true || response.statusCode === 200) {
        navigate('/insurance/dossier', {
          state: {
            reviewData: response.body,
            selectedPlan,
            bookingId: response.bookingId,
          },
        });
      } else {
        notifyError(response.message || 'Plan no longer available. Please refresh search.');
      }
    } catch (error: any) {
      console.error('Review Error:', error);
      notifyError(error.response?.data?.message || 'Plan session expired. Please re-search.');
    } finally {
      setIsProcessing(false);
    }
  };

  // --- FIGMA GRADIENT GENERATOR FOR THE HEADER BARS ONLY ---
  const getFigmaHeaderStyle = (tier: string) => {
    const t = tier.toUpperCase();
    if (t.includes('TITANIUM')) {
      return { background: '#FFFFFF' };
    }
    if (t.includes('GOLD PLUS')) {
      return { background: 'linear-gradient(90deg, #FFFFFF 79.49%, #FFCB30 180.29%)' };
    }
    if (t.includes('GOLD') || t.includes('CLASSIC GOLD')) {
      return {
        background:
          'linear-gradient(90deg, rgba(248, 169, 13, 0.7) 0%, rgba(248, 169, 13, 0.7) 42.79%, rgba(239, 194, 105, 0.7) 100%)',
      };
    }
    if (t.includes('PLATINUM')) {
      return {
        background: 'linear-gradient(90deg, #FFFFFF 83.64%, #11B3D8 119.53%, #2F52E0 126.66%)',
      };
    }
    // Default Classic Silver / Silver Plus
    return { background: 'linear-gradient(90deg, #FFFFFF 70%, #9F9F9F 118.4%)' };
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#F5F7FA] font-sans">
        <Loader2 className="animate-spin text-[#272E7C] mb-4" size={40} />
        <p className="text-gray-400 text-xs font-bold uppercase tracking-wider">
          Fetching available packages...
        </p>
      </div>
    );
  }

  if (plans.length === 0) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#F5F7FA] p-6 font-sans">
        <AlertCircle className="text-red-500 mb-3" size={48} />
        <h2 className="text-gray-800 font-bold text-xl">No Plans Available</h2>
        <p className="text-gray-500 text-sm text-center mt-1 mb-6 max-w-xs">
          Try adjusting your tracking configurations or location criteria.
        </p>
        <button
          onClick={() => navigate(-1)}
          className="bg-[#272E7C] text-white px-8 py-3 rounded-xl font-bold text-xs shadow-md"
        >
          GO BACK
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F5F7FA] pb-24 font-sans antialiased">
      <InsuranceNavbar />

      {/* Hero Header Strip Context */}
      <div className="w-full bg-[#272E7C] text-white py-4 px-6 mb-6">
        <div className="max-w-6xl mx-auto flex items-center justify-between text-xs font-semibold">
          <span className="text-sm tracking-wide">Choose Your Coverage Plan</span>
          <div className="flex items-center gap-1.5 opacity-60">
            <span className="cursor-pointer hover:underline" onClick={() => navigate('/')}>
              Home
            </span>
            <span>&gt;</span>
            <span>Select insurance</span>
          </div>
        </div>
      </div>

      <main className="max-w-6xl mx-auto px-4 space-y-6">
        {plans.map((plan) => {
          const headerStyle = getFigmaHeaderStyle(plan.tier);

          return (
            <div
              key={plan.id}
              className="bg-white rounded-xl shadow-sm border border-gray-200/80 overflow-hidden flex flex-col transition-all hover:shadow-md"
            >
              {/* Header Tier Banner Row (Applies Figma Gradients Safely Here) */}
              <div
                style={headerStyle}
                className="px-6 py-3.5 flex flex-wrap justify-between items-center border-b border-gray-100"
              >
                <div className="flex items-center gap-2">
                  <span className="text-[15px] font-bold tracking-tight text-[#1A1F4D] uppercase">
                    {plan.name}
                  </span>
                </div>
                <div className="flex items-center gap-4 mt-1 sm:mt-0">
                  {plan.earnPoints > 0 && (
                    <span className="bg-[#E7FFE3] text-[#59595C] px-2.5 py-1 rounded-md text-[11px] font-semibold border border-green-200/50">
                      Earn {plan.earnPoints}*
                    </span>
                  )}
                  <span className="text-base font-bold text-[#1A1F4D]">
                    ₹{plan.price.toLocaleString()}{' '}
                    <span className="text-xs font-normal opacity-70">Inc. GST</span>
                  </span>
                </div>
              </div>

              {/* White Container Information Content Body */}
              <div className="p-6 grid grid-cols-1 md:grid-cols-12 gap-6 items-center bg-white">
                {/* Column 1: Assistance Parameters */}
                <div className="md:col-span-4 space-y-2 text-left">
                  <h3 className="text-sm font-bold text-[#1A1F4D]">{plan.assistance}</h3>
                  <p className="text-xs text-gray-400">Assistance by Across Assist and Klar</p>
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {plan.benefits.slice(0, 3).map((benefit, bIdx) => (
                      <span
                        key={bIdx}
                        className="bg-gray-50 border border-gray-100 text-gray-600 px-2 py-1 rounded-md text-[10px] inline-flex items-center gap-1 shadow-sm max-w-[160px] truncate"
                      >
                        ✓ {benefit}
                      </span>
                    ))}
                  </div>
                  <button className="text-[11px] font-bold text-blue-600 hover:underline block pt-1">
                    View all {plan.totalBenefitsCount || 57} benefits &gt;
                  </button>
                </div>

                {/* Column 2: Protection Scope Limit */}
                <div className="md:col-span-5 border-t md:border-t-0 md:border-l border-gray-100 pt-4 md:pt-0 md:pl-6 text-left">
                  <h3 className="text-sm font-bold text-[#1A1F4D]">
                    {plan.travelCoverAmount} Travel Cover
                  </h3>
                  <p className="text-xs text-gray-400 mt-0.5">Insurance by {plan.provider}</p>
                  <div className="flex flex-col gap-1.5 mt-3 text-[11px] text-gray-600">
                    <div className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                      <span>Emergency medical expenses up to {plan.travelCoverAmount}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                      <span>Trip cancellation, delay, or missed connection coverages</span>
                    </div>
                  </div>
                </div>

                {/* Column 3: Selection Toggle Handler */}
                <div className="md:col-span-3 flex justify-end items-center border-t md:border-t-0 border-gray-100 pt-4 md:pt-0">
                  <button
                    type="button"
                    onClick={() => setSelectedPlanId(plan.id === selectedPlanId ? null : plan.id)}
                    className={`w-full md:w-auto px-8 py-2 rounded-lg text-xs font-bold tracking-wider uppercase transition-all border-2 flex items-center justify-center gap-1 h-9 ${
                      selectedPlanId === plan.id
                        ? 'bg-green-600 border-green-600 text-white shadow-sm'
                        : 'bg-[#1A1F4D] border-[#1A1F4D] text-white hover:bg-[#272E7C] hover:border-[#272E7C]'
                    }`}
                  >
                    {selectedPlanId === plan.id ? '✓ Added' : '⊕ Add'}
                  </button>
                </div>
              </div>

              {/* Bottom Provider Disclaimer Strip */}
              <div className="px-6 py-2 bg-gray-50/50 border-t border-gray-100 text-left text-gray-400">
                <p className="text-[10px]">
                  *Agent earnings are on non-insurance products | Insurance is through a group
                  master policy with Aditya Birla Health Insurance.
                </p>
              </div>
            </div>
          );
        })}
      </main>

      {/* Persistent Flow Handler Bottom Bar */}
      <footer className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 py-4 px-6 shadow-[0_-10px_30px_rgba(0,0,0,0.05)] z-40">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <button
            onClick={() => navigate(-1)}
            disabled={isProcessing}
            className="px-6 py-2 border-2 border-gray-300 text-gray-600 font-bold rounded-lg text-xs tracking-wider uppercase hover:border-[#272E7C] hover:text-[#272E7C] transition-colors"
          >
            &laquo; Back
          </button>
          <button
            onClick={handleProceedToDetails}
            disabled={!selectedPlanId || isProcessing}
            className="px-8 py-2.5 bg-[#272E7C] text-white font-bold rounded-lg text-xs tracking-wider uppercase hover:bg-[#1f2462] disabled:opacity-20 disabled:cursor-not-allowed transition-all shadow-md flex items-center gap-2"
          >
            {isProcessing ? (
              <>
                Processing... <Loader2 className="animate-spin" size={14} />
              </>
            ) : (
              <>Continue &raquo;</>
            )}
          </button>
        </div>
      </footer>
    </div>
  );
};

export default InsuranceSearchPage;
