import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Clock, ShieldCheck, Headphones, User } from 'lucide-react';

export interface SelectedPlanPayload {
  service: 'New passport' | 'Renewal' | 'Reissue' | 'Police Clearance Certificate';
  applicant: 'Adult' | 'Minor';
}

interface PassportPlansProps {
  onSelectPlan?: (plan: SelectedPlanPayload) => void;
}

interface Plan {
  id: string;
  title: string;
  service: 'New passport' | 'Renewal' | 'Reissue' | 'Police Clearance Certificate';
  applicant: 'Adult' | 'Minor';
  processing: string;
  validity: string;
  assistance: string;
  traveller: string;
}

export const PassportPlans: React.FC<PassportPlansProps> = ({ onSelectPlan }) => {
  const navigate = useNavigate();
  const location = useLocation();

  const scrollToPassportSearch = (targetId: string) => {
    const element = document.getElementById(targetId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  // Exactly matches the 4 services in the provided image
  const plans: Plan[] = [
    {
      id: '1',
      title: 'New Passport',
      service: 'New passport',
      applicant: 'Adult',
      processing: '10–15 Days',
      validity: '10 Years',
      assistance: 'Online',
      traveller: 'Adult / Minor',
    },
    {
      id: '2',
      title: 'Passport Renewal',
      service: 'Renewal',
      applicant: 'Adult',
      processing: '10–15 Days',
      validity: '10 Years',
      assistance: 'Online',
      traveller: 'Adult / Minor',
    },
    {
      id: '3',
      title: 'Passport Reissue',
      service: 'Reissue',
      applicant: 'Adult',
      processing: '7–10 Days',
      validity: '10 Years',
      assistance: 'Online',
      traveller: 'Adult / Minor',
    },
    {
      id: '4',
      title: 'Police Clearance Certificate',
      service: 'Police Clearance Certificate',
      applicant: 'Adult',
      processing: '5–7 Days',
      validity: 'As per Govt',
      assistance: 'Online',
      traveller: 'Adult',
    },
  ];

  const handleApplyClick = (plan: Plan) => {
    const selectedPlan: SelectedPlanPayload = {
      service: plan.service,
      applicant: plan.applicant,
    };

    sessionStorage.setItem('passportSelectedPlan', JSON.stringify(selectedPlan));

    if (onSelectPlan) {
      onSelectPlan(selectedPlan);
    }

    const isMobile = window.innerWidth < 768;
    const targetPath = isMobile ? '/mobile-passport-search' : '/dashboard';
    const targetHash = isMobile ? '#passport-form' : '#passport-search';
    const fullTarget = `${targetPath}${targetHash}`;
    const navigationState = {
      activeTab: 'passport',
      planSelectionTimestamp: Date.now(),
    };

    if (location.pathname === targetPath && location.hash === targetHash) {
      navigate(fullTarget, { state: navigationState });
      scrollToPassportSearch(targetHash.replace('#', ''));
      return;
    }

    navigate(fullTarget, { state: navigationState });
  };

  return (
    <div className="w-full bg-white font-sans text-slate-800 py-6 md:py-10">
      {/* Top Section Header */}
      <div className="flex flex-col gap-2 mb-8 md:mb-10">
        <div className="flex items-center space-x-2">
          <span className="w-6 h-[2px] bg-amber-400 rounded-full inline-block"></span>
          <span className="text-xs sm:text-sm font-bold text-[#5A0C1A] uppercase tracking-wider">
            OUR PLANS
          </span>
        </div>

        <h2 className="text-2xl sm:text-3xl md:text-4xl font-serif font-bold text-slate-900 tracking-tight">
          Pick the plan that matches your travel timeline
        </h2>

        <p className="text-xs sm:text-sm text-slate-500 leading-relaxed max-w-2xl">
          Every plan includes document review, expert form filling and appointment
          scheduling at your nearest Passport Seva Kendra.
        </p>
      </div>

      {/* Service Plan Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 lg:gap-6">
        {plans.map((plan) => (
          <div
            key={plan.id}
            className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-100 shadow-[0_4px_20px_rgb(0,0,0,0.03)] hover:shadow-md transition-all duration-300 flex flex-col justify-between"
          >
            <div>
              {/* Card Header (Without Badges) */}
              <div className="mb-6 min-h-[48px]">
                <h3 className="text-base sm:text-lg font-serif font-bold text-slate-800 leading-snug">
                  {plan.title}
                </h3>
              </div>

              {/* Specs & Details */}
              <div className="space-y-3.5 mb-6 text-xs sm:text-sm">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2 text-sky-600">
                    <Clock className="w-4 h-4 stroke-[2]" />
                    <span className="font-medium">Processing</span>
                  </div>
                  <span className="font-bold text-slate-800">{plan.processing}</span>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2 text-sky-600">
                    <ShieldCheck className="w-4 h-4 stroke-[2]" />
                    <span className="font-medium">Validity</span>
                  </div>
                  <span className="font-bold text-slate-800">{plan.validity}</span>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2 text-sky-600">
                    <Headphones className="w-4 h-4 stroke-[2]" />
                    <span className="font-medium">Assistance</span>
                  </div>
                  <span className="font-bold text-slate-800">{plan.assistance}</span>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2 text-sky-600">
                    <User className="w-4 h-4 stroke-[2]" />
                    <span className="font-medium">Traveller</span>
                  </div>
                  <span className="font-bold text-slate-800">{plan.traveller}</span>
                </div>
              </div>
            </div>

            {/* Standardized Apply Button */}
            <button
              type="button"
              onClick={() => handleApplyClick(plan)}
              className="w-full py-2.5 px-4 rounded-xl text-xs sm:text-sm font-semibold border border-[#5A0C1A] text-[#5A0C1A] hover:bg-[#5A0C1A] hover:text-white transition-all duration-200 mt-2 cursor-pointer active:scale-[0.99] shadow-2xs"
            >
              Apply Now
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default PassportPlans;