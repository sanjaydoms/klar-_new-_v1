import React from 'react';

const AboutUsHeading: React.FC = () => {
  // Industry card data with dedicated visual images
  const industries = [
    {
      name: 'IT & Technology',
      image: 'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=600&q=80',
    },
    {
      name: 'Healthcare',
      image: 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&w=600&q=80',
    },
    {
      name: 'Manufacturing',
      image: 'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?auto=format&fit=crop&w=600&q=80',
    },
    {
      name: 'Consulting',
      image: 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?auto=format&fit=crop&w=600&q=80',
    },
    {
      name: 'Finance',
      image: 'https://images.unsplash.com/photo-1590283603385-17ffb3a7f29f?auto=format&fit=crop&w=600&q=80',
    },
    {
      name: 'Startups',
      image: 'https://images.unsplash.com/photo-1559136555-9303baea8ebd?auto=format&fit=crop&w=600&q=80',
    },
    {
      name: 'Educational Institutions',
      image: '/images/educational_institutions_about_us.jpg',
    },
    {
      name: 'Government Organizations',
      image: 'https://images.unsplash.com/photo-1541872703-74c5e44368f9?auto=format&fit=crop&w=600&q=80',
    },
  ];

  return (
    <div className="w-full px-4 sm:px-6 md:px-8 lg:px-[45px] mt-6 sm:mt-8 md:mt-12 lg:mt-16 xl:mt-20 2xl:mt-24 font-['DM_Sans',sans-serif]">
      {/* Top Heading Row */}
      <section className="flex flex-col sm:flex-row items-start sm:items-center justify-between w-full gap-4 sm:gap-6 md:gap-8">
        <h1
          className="text-left w-full sm:w-auto"
          style={{
            fontFamily: "'Playfair Display', serif",
            fontWeight: 500,
            fontSize: "clamp(36px, 10vw, 108px)",
            lineHeight: 0.9,
            letterSpacing: "-1.5px",
            textTransform: "uppercase",
            background: "linear-gradient(90deg, #272E7C 0%, #050B4B 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
            margin: 0,
            padding: 0,
          }}
        >
          About Us
        </h1>

        <p
          className="text-left sm:text-right w-full sm:w-auto sm:ml-4 md:ml-6 lg:ml-8"
          style={{
            fontFamily: "'DM Sans', sans-serif",
            fontWeight: 400,
            fontSize: "clamp(13px, 1.8vw, 18px)",
            lineHeight: "1.6",
            letterSpacing: "0px",
            color: "#57534D",
            margin: 0,
            maxWidth: "100% sm:max-w-[280px] md:max-w-[320px] lg:max-w-[340px]",
          }}
        >
          A trusted travel partner delivering seamless journeys across the world.
        </p>
      </section>

      {/* Main Hero Image */}
      <div className="w-full mt-4 sm:mt-6 md:mt-8 lg:mt-10 xl:mt-12">
        <img
          src="/images/aboutus_hero_img.png"
          alt="About Us Hero"
          className="w-full object-cover shadow-xs"
          style={{
            height: "clamp(180px, 35vw, 562.5px)",
            borderRadius: "clamp(12px, 1.5vw, 18px)",
          }}
          loading="lazy"
        />
      </div>

      {/* --- CONTENT SECTIONS WITH IMAGES --- */}
      <div className="mt-12 sm:mt-16 md:mt-24 space-y-16 md:space-y-28">

        {/* SECTION 1: India's Trusted Corporate & Leisure Travel Partner */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
          <div className="lg:col-span-6 space-y-4">
            <span className="text-xs font-bold tracking-widest uppercase text-[#272E7C] bg-[#272E7C]/10 px-3 py-1 rounded-full">
              About Klar Travels
            </span>
            <h2 
              className="text-2xl sm:text-3xl lg:text-4xl font-semibold text-[#050B4B] leading-tight"
              style={{ fontFamily: "'Playfair Display', serif" }}
            >
              India's Trusted Corporate & Leisure Travel Partner
            </h2>
            <div className="space-y-3 text-[#57534D] text-sm sm:text-base leading-relaxed">
              <p>
                At Klar Travels, we are building the future of travel by combining intelligent technology with exceptional human service.
              </p>
              <p>
                Businesses today need more than a booking portal. They need a reliable travel partner that understands budgets, compliance, changing schedules, and the importance of immediate assistance. That is exactly what Klar Travels delivers.
              </p>
              <p>
                From executive business travel and international conferences to family vacations and luxury holidays, we provide complete travel management under one roof.
              </p>
            </div>

            {/* Our Services List */}
            <div className="pt-2">
              <h3 className="text-sm font-bold text-[#050B4B] uppercase tracking-wide mb-3">Our Services</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs sm:text-sm text-[#57534D]">
                {[
                  'Corporate Travel Management',
                  'Business Travel Solutions',
                  'Flights & Hotels',
                  'Holiday Packages',
                  'Luxury Travel',
                  'MICE',
                  'Visa & Documentation',
                  'Airport Transfers',
                  'Cruise Holidays',
                ].map((service) => (
                  <div key={service} className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#272E7C] shrink-0" />
                    <span>{service}</span>
                  </div>
                ))}
              </div>
            </div>

            <p className="text-xs sm:text-sm text-[#57534D] pt-2 italic border-t border-slate-100">
              Our commitment is simple—transparent pricing, fast response, personalized service, and memorable travel experiences.<br />
              <strong className="text-[#050B4B] not-italic font-semibold">One Partner. Every Journey.</strong>
            </p>
          </div>

          {/* Section 1 Image */}
          <div className="lg:col-span-6">
            <img
              src="/images/about_us_trusted_corporate.jpg"
              alt="Corporate and Leisure Travel"
              className="w-full h-[320px] sm:h-[420px] object-cover rounded-2xl shadow-md border border-slate-100"
            />
          </div>
        </section>

        {/* SECTION 2: Experience the Klar Difference */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
          {/* Section 2 Image */}
          <div className="lg:col-span-6 order-2 lg:order-1">
            <img
              src="/images/experience_about_us.jpg"
              alt="Concierge Team Working"
              className="w-full h-[320px] sm:h-[420px] object-cover rounded-2xl shadow-md border border-slate-100"
            />
          </div>

          <div className="lg:col-span-6 space-y-4 order-1 lg:order-2">
            <span className="text-xs font-bold tracking-widest uppercase text-[#272E7C] bg-[#272E7C]/10 px-3 py-1 rounded-full">
              About Klar Travels
            </span>
            <h2 
              className="text-2xl sm:text-3xl lg:text-4xl font-semibold text-[#050B4B] leading-tight"
              style={{ fontFamily: "'Playfair Display', serif" }}
            >
              Experience the Klar Difference
            </h2>
            <div className="space-y-3 text-[#57534D] text-sm sm:text-base leading-relaxed">
              <p>
                Klar Travels was founded with one mission: make travel effortless for businesses and individuals.
              </p>
              <p>
                Every year, companies lose valuable time managing travel through multiple vendors, inconsistent pricing, and poor customer support. We solve this through a concierge-first approach backed by extensive travel inventory and experienced travel specialists.
              </p>
              <p>
                Whether you are planning a business trip, organizing a corporate event, or creating your dream holiday, Klar Travels delivers end-to-end travel solutions tailored to your needs.
              </p>
            </div>

            {/* Four Pillars */}
            <div className="pt-2">
              <h3 className="text-sm font-bold text-[#050B4B] uppercase tracking-wide mb-3">Our Promise is Built on Four Pillars</h3>
              <div className="grid grid-cols-2 gap-2 text-xs sm:text-sm text-[#57534D]">
                {['Trust', 'Transparency', 'Responsiveness', 'Excellence'].map((pillar) => (
                  <div key={pillar} className="flex items-center gap-2 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                    <span className="w-2 h-2 rounded-full bg-[#272E7C] shrink-0" />
                    <span className="font-medium text-[#050B4B]">{pillar}</span>
                  </div>
                ))}
              </div>
            </div>

            <p className="text-xs sm:text-sm text-[#57534D] pt-2">
              When you travel with Klar Travels, you gain more than a booking—you gain a dependable travel partner committed to every journey.<br />
              <strong className="text-[#050B4B] font-semibold">Travel with Confidence. Travel with Klar.</strong>
            </p>
          </div>
        </section>

        {/* SECTION 3: Industries We Serve (Image Cards Grid) */}
        <section className="bg-slate-50/80 rounded-2xl p-6 sm:p-8 lg:p-10 border border-slate-200/60">
          <div className="mb-6 sm:mb-8 text-center lg:text-left">
            <span className="text-xs font-bold tracking-widest uppercase text-[#272E7C] bg-[#272E7C]/10 px-3 py-1 rounded-full">
              Our Expertise
            </span>
            <h3 
              className="text-2xl sm:text-3xl lg:text-4xl font-semibold text-[#050B4B] mt-3"
              style={{ fontFamily: "'Playfair Display', serif" }}
            >
              Industries We Serve
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            {industries.map((item) => (
              <div 
                key={item.name} 
                className="bg-white rounded-2xl overflow-hidden border border-slate-200/80 shadow-xs hover:shadow-md hover:-translate-y-1 transition-all duration-300 flex flex-col"
              >
                {/* Image on top */}
                <div className="h-36 sm:h-40 w-full overflow-hidden bg-slate-100">
                  <img 
                    src={item.image} 
                    alt={item.name} 
                    className="w-full h-full object-cover hover:scale-105 transition-transform duration-500"
                    loading="lazy"
                  />
                </div>
                {/* Text underneath */}
                <div className="p-4 flex items-center justify-between grow">
                  <span className="text-sm sm:text-base font-semibold text-[#050B4B]">
                    {item.name}
                  </span>
                  <span className="w-2 h-2 rounded-full bg-[#272E7C] shrink-0 ml-2" />
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* SECTION 4: Travel Beyond Bookings & Why Klar Travels? */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
          <div className="lg:col-span-6 space-y-4">
            <span className="text-xs font-bold tracking-widest uppercase text-[#272E7C] bg-[#272E7C]/10 px-3 py-1 rounded-full">
              About Klar Travels
            </span>
            <h2 
              className="text-2xl sm:text-3xl lg:text-4xl font-semibold text-[#050B4B] leading-tight"
              style={{ fontFamily: "'Playfair Display', serif" }}
            >
              Travel Beyond Bookings
            </h2>
            <div className="space-y-3 text-[#57534D] text-sm sm:text-base leading-relaxed">
              <p>
                Klar Travels is a modern travel management company helping businesses and travelers plan journeys with confidence. We combine technology, transparent pricing, and dedicated concierge support to deliver seamless domestic and international travel experiences.
              </p>
              <p>
                Our expertise spans corporate travel, holidays, group travel, MICE, visa assistance, hotels, flights, travel insurance, and customized itineraries. Whether you are a startup, SME, enterprise, or an individual traveler, we focus on making every journey efficient, cost-effective, and stress-free.
              </p>
            </div>

            {/* Why Klar Travels List */}
            <div className="pt-2">
              <h3 className="text-sm font-bold text-[#050B4B] uppercase tracking-wide mb-3">Why Klar Travels?</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs sm:text-sm text-[#57534D]">
                {[
                  'Corporate Travel Management',
                  'Domestic & International Flight Booking',
                  'Hotel Reservations Worldwide',
                  'Holiday Packages',
                  'MICE & Group Travel',
                  'Visa Assistance',
                  'Travel Insurance',
                  '24x7 Dedicated Support',
                  'Concierge-Level Service',
                ].map((reason) => (
                  <div key={reason} className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#272E7C] shrink-0" />
                    <span>{reason}</span>
                  </div>
                ))}
              </div>
            </div>

            <p className="text-xs sm:text-sm text-[#57534D] pt-2 italic border-t border-slate-100">
              We believe every trip should create value---not complications. Our team stays with you before, during, and after your journey to ensure a smooth travel experience.<br />
              <strong className="text-[#050B4B] not-italic font-semibold">Klar Travels -- Travel Smarter. Travel Better.</strong>
            </p>
          </div>

          {/* Section 4 Image */}
          <div className="lg:col-span-6">
            <img
              src="https://images.unsplash.com/photo-1488646953014-85cb44e25828?auto=format&fit=crop&w=1000&q=80"
              alt="Global Travel Experiences"
              className="w-full h-[320px] sm:h-[420px] object-cover rounded-2xl shadow-md border border-slate-100"
            />
          </div>
        </section>

      </div>
    </div>
  );
};

export default AboutUsHeading;