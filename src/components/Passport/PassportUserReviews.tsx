import React from 'react';
import { Star } from 'lucide-react';

interface Review {
  id: string;
  rating: number;
  quote: string;
  name: string;
  location: string;
  initial: string;
}

export const PassportUserReviews: React.FC = () => {
  const reviews: Review[] = [
    {
      id: '1',
      rating: 5,
      quote:
        '“The team handled my Tatkaal renewal end to end. Appointment was booked within a day and every document was checked twice before submission.”',
      name: 'Meera Nair',
      location: 'Kochi',
      initial: 'M',
    },
    {
      id: '2',
      rating: 5,
      quote:
        '“Very helpful staff. They explained exactly which address proof to use and filled the form correctly the first time. No rejections at the PSK.”',
      name: 'Rahul Deshpande',
      location: 'Pune',
      initial: 'R',
    },
    {
      id: '3',
      rating: 5,
      quote:
        '“Applied for my daughter\'s minor passport. The annexure paperwork was the confusing part and their expert sorted it out completely.”',
      name: 'Fatima Sheikh',
      location: 'Hyderabad',
      initial: 'F',
    },
    {
      id: '4',
      rating: 4,
      quote:
        '“Smooth documentation and good communication throughout. Received regular updates on the police verification stage.”',
      name: 'Anand Krishnan',
      location: 'Chennai',
      initial: 'A',
    },
  ];

  return (
    <section className="w-full bg-[#FFF0F2] py-12 md:py-16 font-sans">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Header and Rating Badge Bar */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10 md:mb-12">
          
          {/* Section Title */}
          <div className="flex flex-col gap-2 max-w-2xl">
            <div className="flex items-center space-x-2">
              <span className="w-6 h-[2px] bg-amber-400 rounded-full inline-block"></span>
              <span className="text-xs sm:text-sm font-bold text-[#5A0C1A] uppercase tracking-wider">
                Customer reviews
              </span>
            </div>

            <h2 className="text-2xl sm:text-3xl md:text-4xl font-serif font-bold text-slate-900 tracking-tight">
              What applicants say about the process
            </h2>
          </div>

          {/* Overall Rating Box */}
          <div className="bg-white rounded-2xl p-4 sm:p-5 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 flex items-center space-x-4 self-start md:self-auto shrink-0">
            <span className="text-3xl sm:text-4xl font-serif font-bold text-slate-900 leading-none">
              4.8
            </span>
            <div className="flex flex-col">
              <div className="flex text-amber-400 space-x-0.5 mb-1">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-4 h-4 fill-amber-400 stroke-amber-400" />
                ))}
              </div>
              <span className="text-xs text-sky-700 font-medium">
                12,000+ applicants served
              </span>
            </div>
          </div>

        </div>

        {/* Reviews Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 lg:gap-6">
          {reviews.map((review) => (
            <div
              key={review.id}
              className="relative bg-white rounded-2xl p-6 sm:p-7 border border-slate-100 shadow-[0_4px_20px_rgb(0,0,0,0.03)] flex flex-col justify-between overflow-hidden"
            >
              {/* Decorative Background Quote Mark */}
              <div 
                className="absolute top-2 right-5 text-6xl font-serif text-rose-100/70 select-none pointer-events-none leading-none"
                aria-hidden="true"
              >
                ”
              </div>

              <div>
                {/* Star Rating */}
                <div className="flex text-amber-400 space-x-1 mb-4 relative z-10">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      className={`w-4 h-4 ${
                        i < review.rating
                          ? 'fill-amber-400 stroke-amber-400'
                          : 'fill-transparent stroke-amber-300'
                      }`}
                    />
                  ))}
                </div>

                {/* Review Text */}
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed mb-6 font-medium relative z-10">
                  {review.quote}
                </p>
              </div>

              {/* User Profile Footer */}
              <div className="flex items-center space-x-3 pt-4 border-t border-slate-100/80 relative z-10">
                <div className="w-10 h-10 rounded-full bg-[#1A2E40] text-white font-bold text-sm flex items-center justify-center shrink-0">
                  {review.initial}
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-bold text-slate-900 leading-snug">
                    {review.name}
                  </span>
                  <span className="text-xs text-sky-600 font-medium">
                    {review.location}
                  </span>
                </div>
              </div>

            </div>
          ))}
        </div>

      </div>
    </section>
  );
};

export default PassportUserReviews;