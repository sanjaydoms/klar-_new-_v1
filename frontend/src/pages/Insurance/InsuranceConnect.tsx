// src/components/Insurance/InsuranceConnect.tsx
import React from 'react';
import { Star, Heart, Plane, Briefcase, Headphones, Check, Crown } from 'lucide-react';
import { useNavigate } from 'react-router-dom'; 
import InsuranceFooter from '@/components/Insurance/InsuranceFooter/InsuranceFooter';

export const InsuranceConnect: React.FC = () => {
    const navigate = useNavigate();
  const benefits = [
    {
      id: 1,
      icon: <Heart className="w-5 h-5" style={{ color: '#D4AF37' }} />,
      title: 'Medical Coverage',
      description: 'Up to ₹50 Lakhs',
    },
    {
      id: 2,
      icon: <Plane className="w-5 h-5" style={{ color: '#D4AF37' }} />,
      title: 'Trip Cancellation',
      description: 'Reimbursement for unexpected cancellations',
    },
    {
      id: 3,
      icon: <Briefcase className="w-5 h-5" style={{ color: '#D4AF37' }} />,
      title: 'Baggage Protection',
      description: 'Compensation for lost, delayed or damaged baggage',
    },
    {
      id: 4,
      icon: <Headphones className="w-5 h-5" style={{ color: '#D4AF37' }} />,
      title: '24/7 Assistance',
      description: 'Round-the-clock support anytime, anywhere',
    },
  ];

  const plans = [
    {
      id: 'basic',
      name: 'Basic',
      price: 499,
      description: 'Essential coverage for a safe trip',
      features: [
        { name: 'Medical Cover', value: 'Up to ₹10,00,000' },
        { name: 'Trip Cancellation', value: 'Up to ₹10,000' },
        { name: 'Baggage Loss', value: 'Up to ₹10,000' },
        { name: '24/7 Assistance', value: '' },
      ],
      buttonText: 'Select Plan',
    },
    {
      id: 'standard',
      name: 'Standard',
      price: 899,
      description: 'Essential coverage for a safe trip',
      isPopular: true,
      features: [
        { name: 'Medical Cover', value: 'Up to ₹25,00,000' },
        { name: 'Trip Cancellation', value: 'Up to ₹25,000' },
        { name: 'Baggage Loss', value: 'Up to ₹25,000' },
        { name: 'Flight Delay Cover', value: '' },
        { name: '24/7 Assistance', value: '' },
      ],
      buttonText: 'Select Plan',
    },
    {
      id: 'premium',
      name: 'Premium',
      price: 1499,
      description: 'Essential coverage for a safe trip',
      features: [
        { name: 'Medical Cover', value: 'Up to ₹50,00,000' },
        { name: 'Trip Cancellation', value: 'Up to ₹50,000' },
        { name: 'Baggage Loss', value: 'Up to ₹50,000' },
        { name: 'Flight Delay Cover', value: '' },
        { name: 'Personal Liability', value: '' },
        { name: '24/7 Assistance', value: '' },
      ],
      buttonText: 'Select Plan',
    },
  ];

  return (
    <div className="w-full mx-auto">
      <div className="w-full mt-6">
        <div className="flex flex-col items-center justify-center px-6 py-8 text-center">
          {/* Badge - SIMPLE SECURE RELIABLE */}
          <div
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-[#1A1F4D] mb-3"
            style={{
              background:
                'radial-gradient(50% 100% at 50% 50%, rgba(255, 255, 255, 0.217) 0%, rgba(212, 175, 55, 0.175) 100%)',
            }}
          >
            <span className="text-[#1A1F4D] text-xs font-bold uppercase tracking-wider">
              SIMPLE SECURE RELIABLE
            </span>
          </div>

          {/* Main Heading */}
          <h2 
            className="font-bold mb-1.5"
            style={{
              fontSize: 'clamp(1.2rem, 3vw, 2rem)',
              letterSpacing: '0px',
              color: '#000000',
            }}
          >
            Travel with complete Peace of Mind
          </h2>

          {/* Sub Description */}
          <p 
            className="font-light mb-3"
            style={{
              fontSize: 'clamp(0.8rem, 1.2vw, 1rem)',
              letterSpacing: '0px',
              color: '#000000',
            }}
          >
            Travel confidently with coverage you can trust.
          </p>

          {/* Divider Line with Gold Stars */}
          <div className="flex items-center justify-center gap-4 mb-8 w-full max-w-md">
            <div className="flex-1 h-px" style={{ background: '#D4AF37' }}></div>
            <div className="flex flex-col items-center gap-0">
              <Star className="w-3 h-3" style={{ color: '#D4AF37', fill: '#D4AF37' }} />
              <Star className="w-2 h-2" style={{ color: '#D4AF37', fill: '#D4AF37' }} />
            </div>
            <div className="flex-1 h-px" style={{ background: '#D4AF37' }}></div>
          </div>

          {/* Benefits Box with Gold Border */}
          <div 
            className="w-full rounded-2xl p-6"
            style={{
              border: '1px solid #D4AF37',
              background: 'transparent',
            }}
          >
            <div 
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 w-full"
              style={{
                rowGap: '32px',
                columnGap: '32px',
              }}
            >
              {benefits.map((benefit) => (
                <div 
                  key={benefit.id}
                  className="flex flex-col items-start text-left"
                >
                  {/* Icon with Gold Circle */}
                  <div 
                    className="flex items-center justify-center mb-3"
                    style={{
                      width: '48px',
                      height: '48px',
                      borderRadius: '50%',
                      border: '2px solid #D4AF37',
                      background: 'transparent',
                    }}
                  >
                    {benefit.icon}
                  </div>
                  
                  {/* Title */}
                  <h4 
                    className="font-semibold text-base mb-1"
                    style={{
                      color: '#1A1F4D',
                      fontFamily: "'Inter', sans-serif",
                    }}
                  >
                    {benefit.title}
                  </h4>
                  
                  {/* Description */}
                  <p 
                    className="text-sm"
                    style={{
                      color: '#45556C',
                      fontFamily: "'Inter', sans-serif",
                      fontWeight: 400,
                    }}
                  >
                    {benefit.description}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* ========== PLANS SECTION ========== */}
          
          {/* Plans Header */}
          <div className="text-center mt-12 mb-8 w-full">
            <h2 
              className="font-bold mb-2"
              style={{
                fontSize: 'clamp(1.5rem, 3vw, 2.5rem)',
                color: '#1A1F4D',
                fontFamily: "'Playfair Display', serif",
              }}
            >
              Choose the Plan That Suits You
            </h2>
            <p 
              className="text-sm"
              style={{
                color: '#45556C',
                fontFamily: "'Inter', sans-serif",
              }}
            >
              All plans come with 24/7 support and cashless claim assistance.
            </p>
          </div>

          {/* Plans Grid - 3 Columns */}
          <div 
            className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full"
            style={{ gap: '8px' }}
          >
            {plans.map((plan) => (
              <div
                key={plan.id}
                className="relative rounded-2xl p-6 flex flex-col text-left"
                style={{
                  border: plan.isPopular ? '2px solid #D4AF37' : '1px solid #E5E7EB',
                  background: plan.isPopular ? '#FFFDF5' : '#FFFFFF',
                  boxShadow: plan.isPopular ? '0 4px 20px rgba(212, 175, 55, 0.15)' : 'none',
                }}
              >
                {/* Most Popular Badge */}
                {plan.isPopular && (
                  <div 
                    className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full flex items-center gap-1"
                    style={{
                      background: '#D4AF37',
                      color: '#FFFFFF',
                    }}
                  >
                    <Crown className="w-3 h-3" />
                    <span className="text-[10px] font-bold uppercase tracking-wider">Most Popular</span>
                  </div>
                )}

                {/* Plan Name */}
                <h3 
                  className="text-lg font-bold mb-1"
                  style={{
                    color: '#1A1F4D',
                    fontFamily: "'Inter', sans-serif",
                  }}
                >
                  {plan.name}
                </h3>

                {/* Description */}
                <p 
                  className="text-sm mb-4"
                  style={{
                    color: '#45556C',
                    fontFamily: "'Inter', sans-serif",
                  }}
                >
                  {plan.description}
                </p>

                {/* Price */}
                <div className="mb-4">
                  <span 
                    className="font-bold"
                    style={{
                      fontSize: 'clamp(1.5rem, 2vw, 2rem)',
                      color: '#1A1F4D',
                    }}
                  >
                    ₹{plan.price}
                  </span>
                  <span 
                    className="text-sm ml-1"
                    style={{
                      color: '#45556C',
                    }}
                  >
                    /trip
                  </span>
                </div>

                {/* Features List */}
                <div className="flex-1 space-y-3 mb-6">
                  {plan.features.map((feature, index) => (
                    <div key={index} className="flex items-start gap-2">
                      <Check 
                        className="w-4 h-4 mt-0.5 shrink-0" 
                        style={{ color: '#D4AF37' }} 
                      />
                      <div>
                        <span 
                          className="text-sm font-medium"
                          style={{
                            color: '#1A1F4D',
                            fontFamily: "'Inter', sans-serif",
                          }}
                        >
                          {feature.name}
                        </span>
                        {feature.value && (
                          <span 
                            className="text-xs block"
                            style={{
                              color: '#45556C',
                              fontFamily: "'Inter', sans-serif",
                            }}
                          >
                            {feature.value}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Select Plan Button - COMMENTED OUT */}
                {/* <button
                  className="w-full py-2.5 rounded-lg font-semibold text-sm transition-all hover:opacity-80"
                  style={{
                    background: plan.isPopular ? '#D4AF37' : '#1A1F4D',
                    color: '#FFFFFF',
                  }}
                >
                  {plan.buttonText}
                </button> */}
              </div>
            ))}
          </div>

          {/* ========== CTA SECTION - GET PERSONALIZED HELP ========== */}
          <div className="w-full mt-16 pt-8 border-t border-gray-200">
            <h3 
              className="font-bold mb-2 tracking-wider"
              style={{
                fontSize: 'clamp(0.8rem, 1.2vw, 1rem)',
                color: '#000000',
                letterSpacing: '2px',
                fontFamily: "'Inter', sans-serif",
              }}
            >
              GET PERSONALIZED HELP
            </h3>
            
            <h2 
              className="font-bold mb-3"
              style={{
                fontSize: 'clamp(1.5rem, 2.5vw, 2.2rem)',
                color: '#1A1F4D',
                fontFamily: "'Playfair Display', serif",
              }}
            >
              Not sure how to travel ?
            </h2>
            
            <p 
              className="text-sm mb-6 max-w-2xl mx-auto"
              style={{
                color: '#45556C',
                fontFamily: "'Inter', sans-serif",
                fontWeight: 400,
                lineHeight: '1.6',
              }}
            >
              Our luxury travel experts are ready to curate the perfect escape based on
              your preferences.
            </p>
            
            <button
            onClick={() => navigate('/insurance/search')}
            
              className="px-8 py-3 rounded-lg font-semibold text-sm transition-all hover:opacity-80 text-white"
              style={{
                background: '#000000',
              }}
            >
              Plan My Travel
            </button>
          </div>

        </div>
      </div>
      <InsuranceFooter />
    </div>
  );
};

export default InsuranceConnect;