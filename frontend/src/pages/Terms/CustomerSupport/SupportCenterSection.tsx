import { Phone, Navigation, Clock } from 'lucide-react';

export default function SupportCenterSection() {
  const openGoogleMaps = () => {
    const address = encodeURIComponent(
      '3rd Floor 305, Tilak Rd, above Max Fashion Showroom, beside payal footwears, Hanuman Tekdi, Abids, Hyderabad, Telangana 500001'
    );
    window.open(`https://www.google.com/maps/search/?api=1&query=${address}`, '_blank', 'noopener,noreferrer');
  };

  return (
    <section className="w-full bg-white py-12 md:py-16">
      {/* Container aligned with the rest of the page layout */}
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-8 lg:px-16">
        {/* Header Badge & Title */}
        <div className="mb-10 text-left">
          <span
            className="inline-block px-3 py-1 mb-4 text-xs font-semibold rounded-full"
            style={{ backgroundColor: '#FDF7F4', color: '#4E0004' }}
          >
            ✦ Office locations
          </span>
          <h2
            className="text-3xl md:text-5xl font-serif font-bold mb-3"
            style={{ color: '#16255F' }}
          >
            Visit a support centre near you
          </h2>
          <p className="text-sm md:text-base" style={{ color: '#7B6A64', fontSize: '14px', lineHeight: '1.6', fontFamily: "Playfair Display" }}>
            Passport drop-offs, forex collection and package planning are best done in person.
          </p>
        </div>

        {/* Content Layout Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
          {/* Left Card: Office Details */}
          <div
            className="lg:col-span-7 flex flex-col justify-between p-6 sm:p-8 rounded-3xl border transition-all"
            style={{ backgroundColor: '#FFFCFA', borderColor: '#F5E8E2' }}
          >
            <div>
              {/* Head Office Badge */}
              <span
                className="inline-block px-3 py-1 text-xs font-semibold rounded-full text-white mb-6"
                style={{ backgroundColor: '#4E0004' }}
              >
                Head office
              </span>

              {/* Title & Address */}
              <h3
                className="text-2xl sm:text-3xl font-serif font-bold mb-3"
                style={{ color: '#16255F' }}
              >
                Hyderabad Head Office
              </h3>
              <p
                className="text-sm sm:text-base leading-relaxed mb-8 max-w-2xl"
                style={{ color: '#7B6A64', fontSize: '14px', lineHeight: '1.6', fontFamily: "Playfair Display" }}
              >
                3rd Floor 305, Tilak Rd, above Max Fashion Showroom, beside payal footwears, Hanuman Tekdi, Abids, Hyderabad, Telangana 500001
              </p>
            </div>

            {/* Actions & Timings Row */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-4 flex-wrap pt-2">
              {/* Call Button */}
              <a
                href="tel:+918099359377"
                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-full border text-sm font-semibold transition-all hover:bg-gray-50"
                style={{ borderColor: '#E2D7D2', color: '#16255F' }}
              >
                <Phone className="w-4 h-4" style={{ color: '#16255F' }} />
                +91 8099359377
              </a>

              {/* View on Map Button */}
              <button
                onClick={openGoogleMaps}
                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-full text-sm font-semibold text-white transition-all hover:opacity-90"
                style={{ backgroundColor: '#4E0004' }}
              >
                <Navigation className="w-4 h-4 text-white fill-current rotate-45" />
                View on map
              </button>

              {/* Clock Timing Info */}
              <div className="flex items-center gap-2 text-xs sm:text-sm pt-2 sm:pt-0" style={{ color: '#7B6A64' }}>
                <Clock className="w-4 h-4 flex-shrink-0" style={{ color: '#4E0004' }} />
                <span>Mon–Sat · 9:00am – 7:00pm</span>
              </div>
            </div>
          </div>

          {/* Right Card: Working Hours */}
          <div
            className="lg:col-span-5 flex flex-col justify-between p-6 sm:p-8 rounded-3xl border"
            style={{ backgroundColor: '#FFFCFA', borderColor: '#F5E8E2' }}
          >
            <div>
              <h3
                className="text-xl sm:text-2xl font-serif font-bold mb-6"
                style={{ color: '#16255F' }}
              >
                Working hours
              </h3>

              {/* Hours Table Rows */}
              <div className="flex flex-col divide-y divide-[#F5E8E2]">
                <div className="flex justify-between items-center py-3.5">
                  <span className="text-xs sm:text-sm" style={{ color: '#7B6A64' }}>
                    Monday – Friday
                  </span>
                  <span className="text-xs sm:text-sm font-semibold" style={{ color: '#16255F' }}>
                    9:00am – 7:00pm
                  </span>
                </div>

                <div className="flex justify-between items-center py-3.5">
                  <span className="text-xs sm:text-sm" style={{ color: '#7B6A64' }}>
                    Saturday
                  </span>
                  <span className="text-xs sm:text-sm font-semibold" style={{ color: '#16255F' }}>
                    9:30am – 5:00pm
                  </span>
                </div>

                <div className="flex justify-between items-center py-3.5">
                  <span className="text-xs sm:text-sm" style={{ color: '#7B6A64' }}>
                    Sunday
                  </span>
                  <span className="text-xs sm:text-sm font-semibold" style={{ color: '#16255F' }}>
                    Phone & chat only
                  </span>
                </div>

                <div className="flex justify-between items-center py-3.5">
                  <span className="text-xs sm:text-sm" style={{ color: '#7B6A64' }}>
                    Public holidays
                  </span>
                  <span className="text-xs sm:text-sm font-semibold" style={{ color: '#16255F' }}>
                    Emergency desk 24/7
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}