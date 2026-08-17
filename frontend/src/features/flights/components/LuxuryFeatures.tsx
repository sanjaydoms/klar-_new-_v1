export default function LuxuryFeatures() {
  return (
    <div className="max-w-4xl mx-auto">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-white/50 backdrop-blur-md rounded-2xl px-6 py-2 -mt-12 shadow-md border border-white/40">
        {/* Card 1 */}
        <div className="flex items-center gap-2">
          <img src="/logo/DiamondLogo.png" alt="Luxury" className="w-8 h-8 object-contain" />

          <div className="text-left">
            <h3
              className="text-[#3A2E2E]"
              style={{
                fontFamily: "'Playfair Display', serif",
                fontWeight: 700,
                fontSize: '14px',
                lineHeight: '20px',
              }}
            >
              Curated Luxury
            </h3>

            <p
              className="text-[#4B4B4B]"
              style={{
                fontFamily: 'Inter, sans-serif',
                fontWeight: 400,
                fontSize: '12px',
                lineHeight: '16px',
              }}
            >
              Handpicked premium experiences
            </p>
          </div>
        </div>

        {/* Card 2 */}
        <div className="flex items-center gap-2">
          <img src="/logo/Group.png" alt="Service" className="w-8 h-8 object-contain" />

          <div className="text-left">
            <h3
              className="text-[#3A2E2E]"
              style={{
                fontFamily: "'Playfair Display', serif",
                fontWeight: 700,
                fontSize: '14px',
                lineHeight: '20px',
              }}
            >
              Personalised Service
            </h3>

            <p
              className="text-[#4B4B4B]"
              style={{
                fontFamily: 'Inter, sans-serif',
                fontWeight: 400,
                fontSize: '12px',
                lineHeight: '16px',
              }}
            >
              Tailored journeys just for you
            </p>
          </div>
        </div>

        {/* Card 3 */}
        <div className="flex items-center gap-2">
          <img src="/logo/Vector.png" alt="Shield" className="w-8 h-8 object-contain" />

          <div className="text-left">
            <h3
              className="text-[#3A2E2E]"
              style={{
                fontFamily: "'Playfair Display', serif",
                fontWeight: 700,
                fontSize: '14px',
                lineHeight: '20px',
              }}
            >
              Trusted and Secure
            </h3>

            <p
              className="text-[#4B4B4B]"
              style={{
                fontFamily: 'Inter, sans-serif',
                fontWeight: 400,
                fontSize: '12px',
                lineHeight: '16px',
              }}
            >
              Secure bookings with peace of mind
            </p>
          </div>
        </div>

        {/* Card 4 */}
        <div className="flex items-center gap-2">
          <img src="/logo/Pentagon.png" alt="Support" className="w-8 h-8 object-contain" />

          <div className="text-left">
            <h3
              className="text-[#3A2E2E]"
              style={{
                fontFamily: "'Playfair Display', serif",
                fontWeight: 700,
                fontSize: '14px',
                lineHeight: '20px',
              }}
            >
              24 / 7 Support
            </h3>

            <p
              className="text-[#4B4B4B]"
              style={{
                fontFamily: 'Inter, sans-serif',
                fontWeight: 400,
                fontSize: '12px',
                lineHeight: '16px',
              }}
            >
              Dedicated support anytime, anywhere
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
