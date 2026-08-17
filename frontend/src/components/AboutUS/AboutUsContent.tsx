import React from 'react';

const AboutUsContent: React.FC = () => {
  return (
    <div className="w-full px-4 sm:px-6 md:px-8 lg:px-[45px] mt-8 sm:mt-10 md:mt-12 lg:mt-14 xl:mt-16">
      {/* ── Main Row: Left (big) + Right (tall image) ── */}
      <div className="flex flex-col lg:flex-row gap-6 lg:gap-8 xl:gap-10 items-start">
        {/* ── LEFT COLUMN ── */}
        <div className="flex flex-col gap-6 flex-1 min-w-0 w-full">
          {/* Top section: small image + text side by side */}
          <div className="flex flex-col md:flex-row gap-4 md:gap-6 xl:gap-8 items-start">
            {/* Left small image */}
            <div className="shrink-0 w-full md:w-auto">
              <img
                src="/About-US/Left-Small.jpg"
                alt="Travel scenery"
                className="object-cover w-full md:w-auto"
                style={{
                  width: "clamp(100%, 26.9vw, 363.375px)",
                  height: "clamp(200px, 22.7vw, 307.125px)",
                  borderRadius: "clamp(12px, 1.5vw, 18px)",
                }}
                loading="lazy"
              />
            </div>

            {/* Heading + subtext */}
            <div className="flex flex-col justify-start gap-3 md:gap-4 lg:gap-6 pt-0 md:pt-1 w-full">
              {/* Heading */}
              <h2
                style={{
                  fontFamily: "'Playfair Display', serif",
                  fontWeight: 700,
                  fontSize: "clamp(22px, 3.5vw, 42px)",
                  lineHeight: 1.2,
                  color: "#1B2A6B",
                  margin: 0,
                }}
              >
                The Highest Level of Comfort, Convenience and Service
              </h2>

              {/* Sub text */}
              <p
                style={{
                  fontFamily: "'DM Sans', sans-serif",
                  fontWeight: 400,
                  fontSize: "clamp(14px, 1.2vw, 16px)",
                  lineHeight: "1.75",
                  color: "#57534D",
                  margin: 0,
                }}
              >
                At Klar Travels, we combine premium service with attention to
                detail. Whether it's a private journey tailored just for you, a
                shared group experience, or a seamless transfer – we take care
                of everything, so you can enjoy every moment.
              </p>
            </div>
          </div>

          {/* ── Why Choose Us box ── */}
          <div
            className="w-full border border-gray-200 rounded-2xl p-4 sm:p-6 md:p-8 flex flex-col gap-4 md:gap-6"
            style={{ minHeight: "clamp(280px, 26.4vw, 357.75px)" }}
          >
            {/* Why Choose Us heading */}
            <h3
              style={{
                fontFamily: "'Playfair Display', serif",
                fontWeight: 600,
                fontSize: "clamp(20px, 2.5vw, 30px)",
                color: "#1B2A6B",
                margin: 0,
              }}
            >
              Why Choose Us?
            </h3>

            <hr className="border-gray-200" />

            {/* Two-column feature grid - responsive */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 md:gap-8">
              {/* Feature 1 — Professional Team */}
              <div className="flex flex-col gap-2 md:gap-3">
                <div className="flex items-center justify-between">
                  <span
                    style={{
                      fontFamily: "'DM Sans', sans-serif",
                      fontWeight: 600,
                      fontSize: "clamp(15px, 1.2vw, 17px)",
                      color: "#1B2A6B",
                    }}
                  >
                    Professional Team
                  </span>

                  {/* People icon */}
                  <svg
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#1B2A6B"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="flex-shrink-0"
                  >
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                    <circle cx="9" cy="7" r="4" />
                    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                  </svg>
                </div>

                <p
                  style={{
                    fontFamily: "'DM Sans', sans-serif",
                    fontWeight: 400,
                    fontSize: "clamp(13px, 1vw, 15px)",
                    lineHeight: "1.6",
                    color: "#78716C",
                    margin: 0,
                  }}
                >
                  With years of experience in travel management, we ensure every
                  booking is handled with precision and care
                </p>
              </div>

              {/* Feature 2 — Flexibility */}
              <div className="flex flex-col gap-2 md:gap-3">
                <div className="flex items-center justify-between">
                  <span
                    style={{
                      fontFamily: "'DM Sans', sans-serif",
                      fontWeight: 600,
                      fontSize: "clamp(15px, 1.2vw, 17px)",
                      color: "#1B2A6B",
                    }}
                  >
                    Flexibility
                  </span>
                  {/* Location pin icon */}
                  <svg
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#1B2A6B"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="flex-shrink-0"
                  >
                    <path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0 1 18 0z" />
                    <circle cx="12" cy="10" r="3" />
                  </svg>
                </div>
                <p
                  style={{
                    fontFamily: "'DM Sans', sans-serif",
                    fontWeight: 400,
                    fontSize: "clamp(13px, 1vw, 15px)",
                    lineHeight: "1.6",
                    color: "#78716C",
                    margin: 0,
                  }}
                >
                  From flights and hotels to transfers and connections, we
                  arrange everything you need—seamlessly.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* ── RIGHT COLUMN — tall image ── */}
        <div className="shrink-0 w-full lg:w-auto">
          <img
            src="/About-US/Right-Big.jpg"
            alt="Mountain landscape"
            className="object-cover w-full lg:w-auto"
            style={{
              width: "clamp(100%, 26.9vw, 363.375px)",
              height: "clamp(300px, 47.2vw, 637.875px)",
              borderRadius: "clamp(12px, 1.5vw, 18px)",
            }}
            loading="lazy"
          />
        </div>
      </div>
    </div>
  );
};

export default AboutUsContent;
