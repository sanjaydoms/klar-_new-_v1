import React, { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import PassportFeatureHighlights from './PassportFeatureHighlights';
import PassportPlans, { type SelectedPlanPayload } from './PassportPlans';
import PassportProcessSteps from './PassportProcessSteps';
import PassportDocumentsRequired from './PassportDocumentsRequired';
import PassportCompleteJourney from './PassportCompleteJourney';
import PassportImportantGuidelines from './PassportImportantGuidelines';
import PassportFaqSection from './PassportFaqSection';
import PassportUserReviews from './PassportUserReviews';
import PassportCtaBanner from './PassportCtaBanner';



interface PassportContentProps {
  onSelectPlan?: (plan: SelectedPlanPayload) => void;
}

export const PassportContent: React.FC<PassportContentProps> = ({ onSelectPlan }) => {
  const { hash } = useLocation();

  useEffect(() => {
    if (!hash) return;
    const targetId = hash.replace('#', '');
    const element = document.getElementById(targetId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [hash]);

  return (
    <div className="w-full bg-white text-gray-900 font-sans antialiased overflow-x-hidden">
      {/* Main Container Wrapper - Standard Alignment Across All Sections */}
      <main className="w-full flex flex-col items-center">
        
        {/* 1. Feature Highlights */}
        <section id="passport-top" className="w-full max-w-7xl px-4 sm:px-6 lg:px-8 py-8 md:py-12">
          <PassportFeatureHighlights />
        </section>

        {/* 2. Passport Plans & Pricing */}
        <section className="w-full max-w-7xl px-4 sm:px-6 lg:px-8 py-8 md:py-12">
          <PassportPlans onSelectPlan={onSelectPlan} />
        </section>

        {/* 3. How It Works / Process Steps */}
        <section className="w-full bg-[#FFF0F2] py-10 md:py-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <PassportProcessSteps />
          </div>
        </section>

        {/* 4. Documents Required */}
        <section className="w-full max-w-7xl px-4 sm:px-6 lg:px-8 py-10 md:py-16">
          <PassportDocumentsRequired />
        </section>

        {/* 5. Complete Journey / Stage Timeline */}
        <section className="w-full bg-[#FFF0F2] py-10 md:py-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <PassportCompleteJourney />
          </div>
        </section>

        {/* 6. Important Guidelines / Things to Know */}
        <section className="w-full max-w-7xl px-4 sm:px-6 lg:px-8 py-10 md:py-16">
          <PassportImportantGuidelines />
        </section>

        {/* 7. FAQ Section */}
        <section className="w-full max-w-7xl px-4 sm:px-6 lg:px-8 py-10 md:py-16">
          <PassportFaqSection />
        </section>

        {/* 8. User Reviews & Testimonials */}
        {/* <section className="w-full bg-[#FFF0F2] py-10 md:py-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <PassportUserReviews />
          </div>
        </section> */}

        {/* 9. Call To Action Banner */}
        <section className="w-full bg-[#400000] text-white py-8 md:py-12">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <PassportCtaBanner onSelectPlan={onSelectPlan} />
          </div>
        </section>

      </main>
    </div>
  );
};

export default PassportContent;