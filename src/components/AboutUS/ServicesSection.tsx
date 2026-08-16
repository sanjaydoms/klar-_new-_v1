import React, { useState } from 'react';

type Service = {
  id: string;
  label: string;
  heading: JSX.Element;
  description: string;
  badge: string;
};

const services: Service[] = [
  {
    id: 'flights',
    label: 'Flights',
    heading: (
      <>
        <span className='font-bold text-4xl text-black'>Tailored</span> <br /> <span className="font-semibold">Flight Bookings
        with Klar Travels</span>
      </>
    ),
    description:
      'Enjoy a seamless flight booking experience tailored to your travel needs. From the best routes and fares to flexible schedules and trusted airlines, we handle every detail so you can fly with ease and confidence.',
    badge: 'Perfect for travelers seeking a smooth, reliable, and stress-free journey.',
  },
  {
    id: 'hotels',
    label: 'Hotels',
    heading: (
      <>
        <span className='font-bold text-4xl text-black'>Curated</span> <br />  <span className="font-semibold">Hotel Stays
        with Klar Travels</span>
      </>
    ),
    description:
      'From boutique escapes to luxury resorts, we source and book accommodations that match your preferences and budget — so every stay feels like home.',
    badge: 'Ideal for travelers who value comfort and convenience.',
  },
  {
    id: 'visa',
    label: 'Visa',
    heading: (
      <>
        <span className='font-bold text-4xl text-black'>Hassle-Free</span> <br /> <span className="font-semibold">Visa Assistance
        with Klar Travels</span>
      </>
    ),
    description:
      'We guide you through every visa requirement and documentation step, ensuring your application is accurate, complete, and submitted on time.',
    badge: 'Perfect for travelers who want peace of mind before departure.',
  },
  {
    id: 'insurance',
    label: 'Insurance',
    heading: (
      <>
        <span className='font-bold text-4xl text-black'>Comprehensive</span> <br /> <span className="font-semibold">Travel Insurance
        with Klar Travels</span>
      </>
    ),
    description:
      "Travel confidently knowing you're covered. We connect you with the right insurance plans for medical emergencies, trip cancellations, and more.",
    badge: 'For travelers who prioritise safety and security on every trip.',
  },
];

const ServicesSection: React.FC = () => {
  const [active, setActive] = useState<string>('flights');
  const current = services.find((s) => s.id === active)!;

  return (
    <section
      className="w-full flex flex-col px-4 sm:px-6 md:px-8 lg:px-[54px]"
      style={{
        paddingTop: "clamp(40px, 8vw, 72px)",
        paddingBottom: "clamp(40px, 6vw, 80px)",
        gap: "clamp(32px, 6vw, 72px)",
        maxWidth: "100%",
        boxSizing: "border-box",
        margin: "0 auto",
      }}
    >
      {/* ── Section Header ── */}
      <div className="flex flex-col items-center gap-3 px-2">
        <div className="flex items-center gap-2">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="#1B2A6B">
            <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26" />
          </svg>
          <span
            style={{
              fontFamily: "'DM Sans', sans-serif",
              fontWeight: 600,
              fontSize: "clamp(11px, 1vw, 12px)",
              letterSpacing: "2px",
              color: "#1B2A6B",
              textTransform: "uppercase",
            }}
          >
            Services
          </span>
        </div>

        <h2
          style={{
            fontFamily: "'Playfair Display', serif",
            fontWeight: 700,
            fontSize: "clamp(28px, 5vw, 52px)",
            color: "#1B2A6B",
            margin: 0,
            textAlign: "center",
          }}
        >
          What we offer?
        </h2>

        <p
          style={{
            fontFamily: "'DM Sans', sans-serif",
            fontWeight: 400,
            fontSize: "clamp(14px, 1.2vw, 16px)",
            color: "#78716C",
            textAlign: "center",
            maxWidth: "min(520px, 90%)",
            lineHeight: 1.7,
            margin: "0 auto",
          }}
        >
          From individual business trips to complex, multi-city itineraries, we
          provide the right booking solution tailored to your travel needs.
        </p>
      </div>

      {/* ── Responsive Card Row ── */}
      <div
        className="flex flex-col lg:flex-row w-full"
        style={{
          gap: "clamp(16px, 2vw, 24px)",
        }}
      >
        {/* LEFT — Tab List - Responsive */}
        <div
          className="flex flex-row lg:flex-col shrink-0 rounded-3xl w-full lg:w-[290px]"
          style={{
            gap: "9px",
            background: "linear-gradient(180deg, #272E7C 0%, #0C114A 100%)",
            padding: "clamp(12px, 1.5vw, 18px)",
            overflowX: "auto",
          }}
        >
          {services.map((s) => (
            <button
              key={s.id}
              onClick={() => setActive(s.id)}
              className="w-full text-left rounded-2xl px-4 sm:px-6 py-3 sm:py-4 transition-all duration-200 whitespace-nowrap lg:whitespace-normal flex-shrink-0 lg:flex-shrink"
              style={{
                fontFamily: "'DM Sans', sans-serif",
                fontWeight: 600,
                fontSize: "clamp(14px, 1.2vw, 16px)",
                background:
                  active === s.id
                    ? "rgba(255,255,255,0.15)"
                    : "rgba(255,255,255,0.08)",
                color: active === s.id ? "#ffffff" : "rgba(255,255,255,0.5)",
                border: "none",
                cursor: "pointer",
                boxShadow:
                  active === s.id
                    ? "0 4px 20px rgba(0,0,0,0.3)"
                    : "none",
                minWidth: "80px",
              }}
            >
              {s.label}
            </button>
          ))}
        </div>

        {/* MIDDLE — Image - Responsive */}
        <div
          className="w-full lg:w-[502px] flex-shrink-0"
          style={{
            height: "clamp(200px, 40vw, 562.5px)",
            borderRadius: "clamp(16px, 2vw, 27px)",
            overflow: "hidden",
          }}
        >
          <img
            src="/About-US/Service-Middle.jpg"
            alt="Service scenery"
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
            }}
            loading="lazy"
          />
        </div>

        {/* RIGHT — Info Card - Responsive */}
        <div
          className="flex-1 flex flex-col justify-center gap-4 sm:gap-5 lg:gap-6 p-4 sm:p-6 md:p-8"
          style={{
            minHeight: "clamp(280px, 40vw, 562.5px)",
            background: "#EEF0F8",
            borderRadius: "clamp(16px, 2vw, 27px)",
          }}
        >
          <h3
            style={{
              fontFamily: "'DM Sans', sans-serif",
              fontWeight: 700,
              fontSize: "clamp(20px, 2.5vw, 26px)",
              color: "#1B2A6B",
              lineHeight: 1.35,
              margin: 0,
            }}
          >
            {current.heading}
          </h3>

          <p
            style={{
              fontFamily: "'DM Sans', sans-serif",
              fontWeight: 400,
              fontSize: "clamp(14px, 1.1vw, 15px)",
              color: "#57534D",
              lineHeight: 1.75,
              margin: 0,
            }}
          >
            {current.description}
          </p>

          {/* Badge - Responsive */}
          <div
            className="flex items-start gap-3 rounded-2xl p-3 sm:p-4"
            style={{ background: "rgba(255,255,255,0.6)" }}
          >
            <div
              className="shrink-0 flex items-center justify-center rounded-full"
              style={{
                width: "clamp(28px, 3vw, 32px)",
                height: "clamp(28px, 3vw, 32px)",
                background: "#1B2A6B",
                marginTop: "2px",
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="#ffffff">
                <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26" />
              </svg>
            </div>
            <p
              style={{
                fontFamily: "'DM Sans', sans-serif",
                fontWeight: 400,
                fontSize: "clamp(13px, 1vw, 14px)",
                color: "#1B2A6B",
                lineHeight: 1.6,
                margin: 0,
              }}
            >
              <strong>{current.badge.split(",")[0]},</strong>
              {current.badge.includes(",")
                ? current.badge.slice(current.badge.indexOf(",") + 1)
                : ""}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ServicesSection;
