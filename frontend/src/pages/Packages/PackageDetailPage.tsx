import { useState, useEffect } from 'react';
import ToursAndPackagesNavbar from './ToursAndPackagesNavbar';
import ToursSearchPageHeader from './ToursSearchPageHeader';
import { Waves, Heart, Mountain, Leaf, Hotel, Calendar, Star, Check, Circle } from 'lucide-react';
import { Link } from 'react-router-dom';

interface TimelineStep {
  dayNum: string;
  title: string;
  subtitle: string;
  description: string;
  thumbnail: string;
}

interface ActivityCard {
  title: string;
  bgImage: string;
  icon: string;
}

interface ReviewItem {
  id: number;
  name: string;
  rating: number;
  text: string;
  avatarUrl?: string;
}

const PackageDetailPage = () => {
  const [activeTab, setActiveTab] = useState('Overview');

  const tabs = ['Overview', 'Journey Plan', 'Stay', 'Reviews'];

  const bestForItems = [
    { id: 1, label: 'OCEAN LOVERS', icon: <Waves className="w-5 h-5 text-sky-500" /> },
    { id: 2, label: 'COUPLES', icon: <Heart className="w-5 h-5 text-rose-400" /> },
    { id: 3, label: 'ADVENTURE', icon: <Mountain className="w-5 h-5 text-amber-600" /> },
    { id: 4, label: 'SLOW TRAVEL', icon: <Leaf className="w-5 h-5 text-emerald-500" /> },
  ];

  const timelineData: TimelineStep[] = [
    {
      dayNum: '01',
      title: 'DAY 1',
      subtitle: 'Arrival & Beach Relaxation',
      description: 'Arrive in Port Blair and unwind at Radhanagar Beach with local treats.',
      thumbnail: '/images/tours_journey_plan_img_small_1.jpg',
    },
    {
      dayNum: '02',
      title: 'DAY 2',
      subtitle: 'Temple & Culture Discovery',
      description: "Explore local temples and immerse in the island's culture.",
      thumbnail: '/images/tours_journey_plan_img_small_2.jpg',
    },
    {
      dayNum: '03',
      title: 'DAY 3',
      subtitle: 'Terraces & Volcano Trek',
      description: 'Discover mud volcanoes and explore limestone caves.',
      thumbnail: '/images/tours_journey_plan_img_small_3.jpg',
    },
    {
      dayNum: '04',
      title: 'DAY 4',
      subtitle: 'Marine Life & Water Sports',
      description: 'Snorkel in vibrant coral reefs and enjoy thrilling water activities.',
      thumbnail: '/images/tours_journey_plan_img_small_4.jpg',
    },
  ];

  const activityCards: ActivityCard[] = [
    {
      title: 'SUNSET AT RADHANAGAR BEACH',
      bgImage: '/images/tours_journey_plan_img_1.jpg',
      icon: '☀️',
    },
    {
      title: 'SNORKELING IN CRYSTAL WATERS',
      bgImage: '/images/tours_journey_plan_img_2.jpg',
      icon: '🤿',
    },
    {
      title: 'EXPLORE LIMESTONE CAVES',
      bgImage: '/images/tours_journey_plan_img_3.jpg',
      icon: '⛰️',
    },
    {
      title: 'DINNER BY THE SEA',
      bgImage: '/images/tours_journey_plan_img_4.jpg',
      icon: '🌅',
    },
  ];

  const reviews: ReviewItem[] = [
    {
      id: 1,
      name: 'Sarah Johnson',
      rating: 5,
      text: 'Absolutely amazing experience! The tour was well-organized, and our guide was incredibly knowledgeable. The sunrise at Mount Batur was breathtaking. Highly recommend!',
    },
    {
      id: 2,
      name: 'Michael Chen',
      rating: 5,
      text: 'Best trip of my life! Every day was filled with amazing activities. The snorkeling was fantastic, and the temples were stunning. Great value for money.',
    },
    {
      id: 3,
      name: 'Emma Williams',
      rating: 4,
      text: 'Great tour overall. The accommodations were comfortable and the food was delicious. Would have loved one more beach day, but still had an incredible time!',
    },
  ];

  const whatsIncluded = [
    'Professional English-speaking guide',
    '4 nights accommodation',
    'Daily breakfast and 3 lunches',
    'All entrance fees',
    'Air-conditioned transportation',
    'Snorkeling equipment',
  ];

  const notIncluded = [
    'International flights',
    'Personal expenses',
    'Dinners (except as specified)',
    'Alcoholic beverages',
    'Tips and gratuities',
    'Optional activities',
  ];

  const packageInclusions = [
    'Airport transfers',
    '3 nights accommodation',
    'Daily breakfast',
    'City tour',
    'All taxes included',
    'Travel insurance',
  ];

  return (
    <div className="min-h-screen bg-white text-[#111111] font-sans">
      <ToursAndPackagesNavbar />
      <ToursSearchPageHeader />

      {/* Hero Banner Section */}
      <section className="relative w-full overflow-hidden bg-[#1c2e3d]">
        <div className="absolute inset-0 z-0">
          <img
            src="/images/tours_detailed_search_img.jpg"
            alt="Amazing Andaman"
            className="w-full h-full object-cover object-center"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-black/20 to-transparent"></div>
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 pb-24 sm:pt-20 sm:pb-32 lg:pt-28 lg:pb-36">
          <div className="flex flex-col sm:flex-row items-start justify-between gap-8 md:gap-12">
            <div className="text-white max-w-xl md:max-w-md lg:max-w-2xl mt-4 sm:mt-8">
              <style>
                {`@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@500;700&display=swap');`}
              </style>
              <h1
                className="text-4xl sm:text-5xl lg:text-[3.5rem] font-bold leading-tight tracking-tight"
                style={{ fontFamily: "'Playfair Display', serif" }}
              >
                Amazing Andaman
              </h1>
              <p className="mt-4 text-base sm:text-lg lg:text-xl text-white/90 font-medium leading-relaxed max-w-md md:max-w-xl">
                Tropical coastlines, hidden lagoons and slower island moments
              </p>
            </div>

            <div className="w-full sm:w-[280px] md:w-[300px] shrink-0 sm:mt-4">
              <div className="bg-white rounded-[24px] p-6 text-center shadow-xl border border-gray-100 flex flex-col items-center justify-center min-h-[210px] sm:min-h-[250px]">
                <span className="text-gray-500 text-[14px] font-medium tracking-wide">From</span>

                <h2 className="text-[#111111] font-extrabold text-[32px] md:text-[36px] tracking-tight mt-0.5 mb-0.5">
                  ₹25,000
                </h2>

                <span className="text-gray-400 text-[13px] font-medium font-serif italic">
                  / per person
                </span>

                <hr className="w-full max-w-[140px] my-4 border-gray-100" />

                <Link to="/package/booking">
                  <button className="w-full max-w-[180px] bg-[#1a1f43] hover:bg-[#121633] text-white font-semibold text-sm tracking-wide py-3 px-6 rounded-xl shadow-md transition-all duration-200 active:scale-[0.98]">
                    Reserve Now
                  </button>
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Navigation Tab Bar - Fully Visible on Mobile (horizontal scrolling) & Widescreen Desktop */}
        <div className="absolute bottom-4 left-0 right-0 z-20 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto overflow-x-auto scrollbar-none">
            <div className="inline-flex items-center bg-white/20 backdrop-blur-md border border-white/20 rounded-xl p-1 shadow-md whitespace-nowrap">
              {tabs.map((tab, idx) => (
                <div key={tab} className="flex items-center">
                  <button
                    onClick={() => setActiveTab(tab)}
                    className={`px-4 sm:px-5 py-2 rounded-lg text-xs sm:text-[14px] font-bold tracking-wide transition-all ${
                      activeTab === tab
                        ? 'bg-white text-[#1a1f43] shadow-sm'
                        : 'text-white hover:text-white hover:bg-white/10'
                    }`}
                  >
                    {tab}
                  </button>
                  {idx < tabs.length - 1 && (
                    <span className="text-white/40 font-light select-none px-1">|</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Master Layout Base Grid Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-14 bg-white flex flex-col gap-10 md:gap-14">
        {/* Overview & Best For Block */}
        <section className="grid grid-cols-1 md:grid-cols-12 gap-8 md:gap-12 lg:gap-16 items-start pb-4">
          {/* Left Side: Overview Text Content */}
          <div className="md:col-span-7 lg:col-span-8 space-y-3">
            <h2 className="text-[#0f1e36] font-bold text-xl sm:text-[24px] tracking-tight">
              Overview
            </h2>
            <p className="text-[#4b5c72] font-normal text-sm sm:text-[15px] md:text-[16px] leading-[1.75] tracking-wide">
              Embark on an unforgettable journey through the stunning landscapes of Andamans. From
              pristine beaches to ancient temples, this carefully curated tour blends relaxation,
              adventure and culture in perfect harmony. Every detail is handled by our experts so
              you can focus on making memories.
            </p>
          </div>

          {/* Right Side: Best For Highlight Grid */}
          <div className="md:col-span-5 lg:col-span-4 w-full md:max-w-[280px] lg:max-w-[320px]">
            <h3 className="text-[#3c4b66] font-bold text-[13px] sm:text-[14px] tracking-[0.1em] uppercase mb-4 md:mb-6 pb-2 border-b border-gray-100">
              BEST FOR
            </h3>

            <div className="grid grid-cols-2 gap-x-4 gap-y-6 md:gap-y-10 pt-1">
              {bestForItems.map((item) => (
                <div
                  key={item.id}
                  className="flex flex-col items-center justify-center text-center p-2 rounded-xl transition-all hover:bg-gray-50/50"
                >
                  <div className="flex items-center justify-center mb-2 md:mb-3">{item.icon}</div>
                  <span className="text-[#1e2a44] font-bold text-[10px] sm:text-[11px] tracking-wider leading-tight">
                    {item.label}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Journey Plan Block */}
        <section className="font-sans pt-2">
          <h2 className="text-[#0f1e36] font-bold text-xl sm:text-[26px] md:text-[30px] tracking-tight mb-6 sm:text-left md:mb-10">
            Journey Plan
          </h2>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
            {/* Left Side: Timeline */}
            <div className="lg:col-span-5 flex flex-col relative space-y-1">
              {timelineData.map((step, index) => (
                <div
                  key={step.dayNum}
                  className="flex gap-4 sm:gap-6 group relative pb-6 md:pb-8 last:pb-0 text-left"
                >
                  {index !== timelineData.length - 1 && (
                    <div className="absolute left-[13px] top-8 bottom-0 w-[1.5px] bg-gray-100 group-hover:bg-amber-400 transition-colors duration-300 z-0">
                      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-gray-200"></div>
                    </div>
                  )}

                  <div className="flex flex-col items-center z-10 shrink-0 select-none">
                    <span className="text-[#e4b231] font-bold text-[16px] sm:text-[18px] md:text-[20px] leading-none mb-1.5">
                      {step.dayNum}
                    </span>
                    <div className="w-2 h-2 rounded-full bg-[#9da8b6] group-hover:bg-[#e4b231] transition-all duration-300 ring-4 ring-white"></div>
                  </div>

                  <div className="w-[64px] h-[64px] sm:w-[76px] sm:h-[76px] md:w-[84px] md:h-[84px] rounded-[14px] sm:rounded-[18px] overflow-hidden bg-gray-100 shrink-0 shadow-sm border border-gray-100 z-10">
                    <img
                      src={step.thumbnail}
                      alt={step.subtitle}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  </div>

                  <div className="flex flex-col pt-0.5 max-w-md">
                    <span className="text-[#8897ae] font-bold text-[10px] sm:text-[11px] md:text-[12px] tracking-wider uppercase mb-0.5">
                      {step.title}
                    </span>
                    <h4 className="text-[#1c2a44] font-bold text-sm sm:text-[15px] md:text-[16px] tracking-tight leading-snug mb-1 group-hover:text-blue-700 transition-colors">
                      {step.subtitle}
                    </h4>
                    <p className="text-[#5b6c85] text-xs sm:text-[13px] md:text-[14px] leading-relaxed font-normal">
                      {step.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* Right Side: Media Highlight Grid */}
            <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
              {activityCards.map((card) => (
                <div
                  key={card.title}
                  className="group/card relative rounded-[24px] sm:rounded-[32px] overflow-hidden aspect-[4/3] sm:aspect-square w-full shadow-md bg-neutral-900 border border-neutral-100 transition-all duration-500 hover:scale-[1.015] hover:shadow-xl"
                >
                  <img
                    src={card.bgImage}
                    alt={card.title}
                    className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover/card:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-black/10 transition-opacity duration-300 group-hover/card:from-black/90"></div>
                  <div className="absolute inset-0 p-4 sm:p-6 flex flex-col justify-between z-10 text-left">
                    <div className="w-8 h-8 sm:w-10 h-10 rounded-full bg-white/20 backdrop-blur-md border border-white/20 flex items-center justify-center text-xs sm:text-sm shadow-inner self-start">
                      <span>{card.icon}</span>
                    </div>
                    <h3 className="text-white font-extrabold text-sm sm:text-[16px] md:text-[18px] tracking-wider leading-snug max-w-[220px] font-sans drop-shadow-sm">
                      {card.title}
                    </h3>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Hotel Block */}
        <section className="font-sans pt-2">
          <div className="w-full bg-white border border-gray-200 rounded-[12px] p-4 sm:p-6 shadow-sm text-left">
            <div className="flex items-center gap-2 border-l-[3px] border-[#111111] pl-3 mb-4">
              <Hotel className="w-5 h-5 sm:w-6 h-6 text-[#111111]" strokeWidth={2.5} />
              <h2 className="text-[#111111] font-extrabold text-lg sm:text-[22px] md:text-[24px] tracking-tight">
                Hotel
              </h2>
            </div>

            <div className="w-full bg-[#FFF4E5] rounded-[6px] px-3 sm:px-4 py-2.5 mb-5 sm:mb-6">
              <p className="text-[#111111] font-semibold text-xs sm:text-[14px] md:text-[15px]">
                Port Blair, Andaman & Nicobar Islands, India
              </p>
            </div>

            <div className="flex flex-col md:flex-row items-start gap-4 sm:gap-5 md:gap-6">
              <div className="w-full md:w-[240px] aspect-[16/10] md:aspect-[4/3] rounded-[8px] overflow-hidden bg-gray-100 shrink-0 border border-gray-100">
                <img
                  src="/images/tours_hotel_img.jpg"
                  alt="The Pearl Port Blair"
                  className="w-full h-full object-cover"
                />
              </div>

              <div className="flex flex-col flex-grow pt-1 w-full space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                  <h3 className="text-[#111111] font-bold text-base sm:text-[18px] md:text-[20px] tracking-tight leading-snug">
                    The Pearl Port Blair, Managed by HHI Hotels
                  </h3>
                  <div className="flex items-center gap-0.5 text-[#FFB200] shrink-0">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="w-3.5 h-3.5 sm:w-4 h-4 fill-current" />
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-2 text-gray-400 font-semibold text-xs sm:text-[13px] md:text-[14px]">
                  <Calendar className="w-4 h-4" />
                  <span>22 Dec-2025 - 25 Dec-2025</span>
                </div>

                <div className="bg-[#F8F9FA] rounded-[8px] p-4 grid grid-cols-1 sm:grid-cols-2 md:flex md:flex-col gap-2.5 border border-gray-50/50 w-full md:max-w-md">
                  <div className="flex text-xs sm:text-[14px]">
                    <span className="text-[#4b5c72] font-medium w-28 shrink-0">Room Type:</span>
                    <span className="text-[#111111] font-semibold">Standard</span>
                  </div>
                  <div className="flex text-xs sm:text-[14px]">
                    <span className="text-[#4b5c72] font-medium w-28 shrink-0">Meal Plan:</span>
                    <span className="text-[#111111] font-semibold">Breakfast Included</span>
                  </div>
                  <div className="flex text-xs sm:text-[14px]">
                    <span className="text-[#4b5c72] font-medium w-28 shrink-0">Room Included:</span>
                    <span className="text-[#111111] font-semibold">-</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Reviews Block */}
        <section className="pt-2 text-left">
          <h2 className="text-[#0f1e36] font-bold text-xl sm:text-[24px] tracking-tight mb-4 sm:mb-6">
            Reviews
          </h2>

          <div className="flex flex-col w-full">
            {reviews.map((review, index) => (
              <div
                key={review.id}
                className={`w-full py-5 sm:py-6 flex flex-col items-start ${
                  index !== reviews.length - 1 ? 'border-b border-gray-100' : ''
                }`}
              >
                <div className="flex items-center gap-3.5 mb-3">
                  <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-[#a3a3a3] shrink-0 overflow-hidden">
                    {review.avatarUrl && (
                      <img
                        src={review.avatarUrl}
                        alt={review.name}
                        className="w-full h-full object-cover"
                      />
                    )}
                  </div>

                  <div className="flex flex-col">
                    <h4 className="text-[#111111] font-bold text-sm sm:text-[16px] tracking-tight leading-snug">
                      {review.name}
                    </h4>
                    <div className="flex items-center gap-0.5 mt-0.5 text-[#FFB200]">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          className={`w-3.5 h-3.5 sm:w-4 h-4 ${i < review.rating ? 'fill-current' : 'text-gray-200'}`}
                        />
                      ))}
                    </div>
                  </div>
                </div>

                <div className="w-full pl-0 md:pl-[58px]">
                  <p className="text-[#4b5c72] font-normal text-xs sm:text-[15px] md:text-[16px] leading-[1.65] tracking-wide">
                    {review.text}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Inclusions / Exclusions Block */}
        <section className="text-[#111111] selection:bg-emerald-50 pt-2 text-left">
          {/* 1. What's Included Block */}
          <div className="mb-10 sm:mb-12">
            <h2 className="text-[#0f1e36] font-bold text-xl sm:text-[24px] tracking-tight mb-4 sm:mb-6">
              What's Included
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-12 gap-y-3.5 sm:gap-y-4">
              {whatsIncluded.map((item, index) => (
                <div key={index} className="flex items-start gap-3">
                  <Check
                    className="w-[16px] h-[16px] sm:w-[18px] sm:h-[18px] text-[#10b981] shrink-0 mt-0.5"
                    strokeWidth={2.5}
                  />
                  <span className="text-[#4b5c72] text-xs sm:text-[15px] md:text-[16px] font-medium leading-normal">
                    {item}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* 2. Not Included Block */}
          <div className="mb-10 sm:mb-12">
            <h2 className="text-[#0f1e36] font-bold text-xl sm:text-[24px] tracking-tight mb-4 sm:mb-6">
              Not Included
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-12 gap-y-3.5 sm:gap-y-4">
              {notIncluded.map((item, index) => (
                <div key={index} className="flex items-start gap-3">
                  <Circle
                    className="w-[14px] h-[14px] sm:w-[16px] sm:h-[16px] text-[#ff4d4d] shrink-0 mt-1"
                    strokeWidth={3}
                  />
                  <span className="text-[#4b5c72] text-xs sm:text-[15px] md:text-[16px] font-medium leading-normal">
                    {item}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* 3. Package Inclusions Block */}
          <div>
            <h2 className="text-[#0f1e36] font-bold text-xl sm:text-[24px] tracking-tight mb-4 sm:mb-6">
              Package Inclusions
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-12 gap-y-3.5 sm:gap-y-4">
              {packageInclusions.map((item, index) => (
                <div key={index} className="flex items-start gap-3">
                  <div className="w-[18px] h-[18px] sm:w-[22px] sm:h-[22px] rounded-full bg-[#e6f9f0] flex items-center justify-center shrink-0 mt-0.5">
                    <Check className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-[#10b981]" strokeWidth={3} />
                  </div>
                  <span className="text-[#4b5c72] text-xs sm:text-[15px] md:text-[16px] font-medium leading-normal pt-0.5 sm:pt-0">
                    {item}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
};

export default PackageDetailPage;
