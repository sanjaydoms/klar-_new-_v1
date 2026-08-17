import { Star, ShieldCheck, Headphones, Award, MapPin } from 'lucide-react';

export default function MobileLandingContent() {
  return (
    <div className="bg-white md:hidden pb-24 w-full overflow-x-hidden">
      {/* Recommended for you */}
      <section className="px-4 py-8 max-w-full">
        <div className="flex justify-between items-end mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Recommended for you</h2>
          <a
            href="#"
            className="text-sm font-semibold text-red-900 border-b-2 border-red-900 pb-0.5"
          >
            View all
          </a>
        </div>
        <div className="space-y-6">
          {/* Card 1 */}
          <div className="rounded-2xl overflow-hidden border border-gray-100 shadow-sm relative">
            <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-sm px-2 py-1 rounded-full flex items-center gap-1 z-10 shadow-sm">
              <Star className="w-3 h-3 fill-current text-gray-800" />
              <span className="text-xs font-bold text-gray-800">4.9</span>
            </div>
            <img
              src="https://images.unsplash.com/photo-1522792065601-5e6e7d8481fc?q=80&w=600"
              alt="Alpine Sanctuary"
              className="w-full h-44 object-cover"
            />
            <div className="p-4 bg-white">
              <h3 className="font-bold text-[22px] text-gray-900 mb-1">Alpine Sanctuary</h3>
              <p className="text-sm text-gray-500 flex items-center gap-1">
                <MapPin className="w-3 h-3" /> Zermatt, Switzerland
              </p>
            </div>
          </div>
          {/* Card 2 */}
          <div className="rounded-2xl overflow-hidden border border-gray-100 shadow-sm relative">
            <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-sm px-2 py-1 rounded-full flex items-center gap-1 z-10 shadow-sm">
              <Star className="w-3 h-3 fill-current text-gray-800" />
              <span className="text-xs font-bold text-gray-800">4.8</span>
            </div>
            <img
              src="https://images.unsplash.com/photo-1499793983690-e29da59ef1c2?q=80&w=600"
              alt="Azure Retreat"
              className="w-full h-44 object-cover"
            />
            <div className="p-4 bg-white">
              <h3 className="font-bold text-[22px] text-gray-900 mb-1">Azure Retreat</h3>
              <p className="text-sm text-gray-500 flex items-center gap-1">
                <MapPin className="w-3 h-3" /> North Male, Maldives
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Premium Stays */}
      <section className="py-10 bg-gray-50 mt-4">
        <div className="text-center mb-8 px-4">
          <h2 className="text-[28px] font-bold text-gray-900 mb-2">Premium Stays</h2>
          <p className="text-xs font-bold uppercase tracking-wider text-[#4b4b8f]">
            Indulge in premium stays handpicked by travel experts
          </p>
        </div>
        <div className="space-y-6 px-4">
          {/* Card 1 */}
          <div className="rounded-2xl overflow-hidden shadow-[0_4px_20px_rgba(0,0,0,0.08)] bg-white border border-gray-100">
            <div className="relative">
              <div className="absolute top-3 left-3 bg-[#4b4b8f] text-white text-[10px] font-bold px-3 py-1 rounded shadow-md z-10">
                PREMIUM
              </div>
              <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-sm px-2 py-1 rounded-full flex items-center gap-1 z-10 shadow-sm">
                <Star className="w-3 h-3 fill-current text-gray-800" />
                <span className="text-xs font-bold text-gray-800">4.9</span>
              </div>
              <img
                src="https://images.unsplash.com/photo-1540541338287-41700207dee6?q=80&w=600"
                alt="Private Overwater Villa"
                className="w-full h-52 object-cover"
              />
            </div>
            <div className="p-5">
              <h3 className="font-bold text-xl text-gray-900 mb-1">Private Overwater Villa</h3>
              <p className="text-sm text-gray-500 mb-3 flex items-center gap-1">
                <MapPin className="w-3 h-3" /> Maldives
              </p>
              <p className="text-[11px] text-gray-400 mb-2 uppercase tracking-wide font-medium">
                Base city • 2 Travelers
              </p>
              <div className="flex items-baseline gap-1">
                <span className="font-bold text-[22px] text-gray-900">$850</span>
                <span className="text-xs text-gray-500 font-medium">/ night</span>
              </div>
            </div>
          </div>
          {/* Card 2 */}
          <div className="rounded-2xl overflow-hidden shadow-[0_4px_20px_rgba(0,0,0,0.08)] bg-white border border-gray-100">
            <div className="relative">
              <div className="absolute top-3 left-3 bg-[#4b4b8f] text-white text-[10px] font-bold px-3 py-1 rounded shadow-md z-10">
                PREMIUM
              </div>
              <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-sm px-2 py-1 rounded-full flex items-center gap-1 z-10 shadow-sm">
                <Star className="w-3 h-3 fill-current text-gray-800" />
                <span className="text-xs font-bold text-gray-800">4.8</span>
              </div>
              <img
                src="https://images.unsplash.com/photo-1571896349842-33c89424de2d?q=80&w=600"
                alt="Infinity Edge Resort"
                className="w-full h-52 object-cover"
              />
            </div>
            <div className="p-5">
              <h3 className="font-bold text-xl text-gray-900 mb-1">Infinity Edge Resort</h3>
              <p className="text-sm text-gray-500 mb-3 flex items-center gap-1">
                <MapPin className="w-3 h-3" /> Bali, Indonesia
              </p>
              <p className="text-[11px] text-gray-400 mb-2 uppercase tracking-wide font-medium">
                Luxury suite • 2 Travelers
              </p>
              <div className="flex items-baseline gap-1">
                <span className="font-bold text-[22px] text-gray-900">$420</span>
                <span className="text-xs text-gray-500 font-medium">/ night</span>
              </div>
            </div>
          </div>

          <button className="w-full py-4 bg-[#3a1a1a] text-white rounded-[14px] font-bold mt-6 shadow-md hover:bg-[#2a1212] transition-colors">
            View All Properties &gt;
          </button>
        </div>
      </section>

      {/* Why Choose Klar */}
      <section className="px-4 py-16">
        <div className="text-center mb-10">
          <h2 className="text-[28px] font-bold text-gray-900 mb-3">Why Choose Klar</h2>
          <p className="text-xs text-[#4b4b8f] font-bold leading-relaxed px-4">
            Thoughtfully crafted experiences. Unrivaled luxury curates a peace of mind
          </p>
        </div>
        <div className="space-y-5">
          <div className="bg-[#fcf8ec] py-8 px-6 rounded-2xl text-center shadow-sm">
            <ShieldCheck className="w-10 h-10 text-[#d4af37] mx-auto mb-4" />
            <h3 className="font-bold text-lg text-gray-900 mb-2">Hand Picked Luxury</h3>
            <p className="text-[13px] text-gray-600 px-2 leading-relaxed">
              Every stay and experience is personally selected by our travel experts
            </p>
          </div>
          <div className="bg-[#fcf8ec] py-8 px-6 rounded-2xl text-center shadow-sm">
            <Headphones className="w-10 h-10 text-[#d4af37] mx-auto mb-4" />
            <h3 className="font-bold text-lg text-gray-900 mb-2">Concierge Support</h3>
            <p className="text-[13px] text-gray-600 px-2 leading-relaxed">
              24/7 dedicated support for a seamless and stress-free journey
            </p>
          </div>
          <div className="bg-[#fcf8ec] py-8 px-6 rounded-2xl text-center shadow-sm">
            <Award className="w-10 h-10 text-[#d4af37] mx-auto mb-4" />
            <h3 className="font-bold text-lg text-gray-900 mb-2">Verified Experience</h3>
            <p className="text-[13px] text-gray-600 px-2 leading-relaxed">
              We partner only with rigorously trusted luxury providers
            </p>
          </div>
        </div>
      </section>

      {/* Footer CTA */}
      <section className="px-5 py-14 bg-[#4b4b8f] text-center mx-3 rounded-3xl mb-8 shadow-xl relative overflow-hidden">
        {/* Subtle background pattern/overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent"></div>

        <div className="relative z-10">
          <div className="inline-block bg-white/10 backdrop-blur-sm px-4 py-1.5 rounded-full mb-6 border border-white/10">
            <span className="text-[10px] font-bold text-[#e5d0a5] uppercase tracking-[0.15em] flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 bg-[#e5d0a5] rounded-full inline-block"></span>
              JOIN 5000+ LUXURY TRAVELERS
            </span>
          </div>
          <h2
            className="text-[32px] leading-[1.2] font-bold text-white mb-5"
            style={{ fontFamily: "'Playfair Display', serif" }}
          >
            Ready to Start Your
            <br />
            Dream Journey?
          </h2>
          <p className="text-[13px] leading-relaxed text-white/80 mb-8 px-2">
            Start planning your dream getaway with exclusive offers, personalized service, and
            unforgettable experiences.
          </p>
          <div className="space-y-3.5">
            <button className="w-full bg-white text-[#4b4b8f] font-bold py-4 rounded-[14px] shadow-lg hover:bg-gray-50 transition-colors">
              Start Planning
            </button>
            <button className="w-full bg-transparent border-2 border-white/20 text-white font-bold py-4 rounded-[14px] hover:bg-white/10 transition-colors">
              Explore Offers
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
