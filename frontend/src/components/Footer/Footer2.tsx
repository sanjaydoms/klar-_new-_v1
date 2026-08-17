import React from 'react';

interface LogoLink {
  name: string;
  href: string;
  src: string;
}


const officialWebsites: LogoLink[] = [
  { name: 'Klar Travels', href: 'https://www.klartravels.com', src: '/logo/KLARBlue.png' },
  { name: 'Klar World', href: 'https://www.klarworld.com', src: '/Footer_logos/Group 1000007151.svg' },
  { name: 'Klar Wellness', href: 'https://www.klarworld.com/Wellness', src: '/Footer_logos/Group 1000007151 (2).svg' },
  { name: 'Klar Events', href: 'https://www.klarworld.com/Events', src: '/Footer_logos/Group 1000007151 (1).svg' },
  { name: 'Klar Experiences', href: 'https://www.klarworld.com/Experience', src: '/Footer_logos/Frame 1000007152.svg' },
];

const socialHandles: LogoLink[] = [
  { name: 'LinkedIn', href: 'https://www.linkedin.com/company/klar-travels/?viewAsMember=true', src: '/Footer_logos/Vector.svg' },
  { name: 'YouTube', href: 'https://www.youtube.com/@klartravels', src: '/Footer_logos/Vector (1).svg' },
  { name: 'Instagram', href: 'https://www.instagram.com/klartravelsofficials?igsh=MWN2NXRkeWV1aWZqeA==', src: '/Footer_logos/Vector (2).svg' },
  { name: 'Facebook', href: 'https://www.facebook.com/klartravels', src: '/Footer_logos/Yatra.svg' },
  { name: 'X', href: 'https://x.com/worldklar', src: '/Footer_logos/Vector (3).svg' },
];

const LogoRow: React.FC<{ items: LogoLink[]; logoHeight?: string }> = ({
  items,
  logoHeight = 'h-9 sm:h-10',
}) => {
  return (
    <div className="flex flex-wrap items-center justify-start gap-x-8 gap-y-5 sm:gap-x-10">
      {items.map((item) => (
        <a
          key={item.name}
          href={item.href}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center hover:opacity-70 transition-opacity duration-200 cursor-pointer"
        >
          <img
            src={item.src}
            alt={item.name}
            className={`${logoHeight} w-auto object-contain`}
          />
          <span className="pointer-events-none absolute -top-9 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-md bg-[#1A1F4D] px-2.5 py-1 text-xs text-white opacity-0 scale-95 transition-all duration-200 group-hover:opacity-100 group-hover:scale-100 z-20">
            {item.name}
            <span className="absolute left-1/2 -bottom-1 -translate-x-1/2 w-2 h-2 bg-[#1A1F4D] rotate-45" />
          </span>
        </a>
      ))}
    </div>
  );
};

const Footer: React.FC = () => {
  return (
    <footer className="bg-white border-t border-[#EAE4DA] pb-24 md:pb-0">
      <div className="w-full px-4 sm:px-6 lg:px-12 py-8 sm:py-10">
        {/* Our Official Websites */}
        <div className="pb-6 sm:pb-7 border-b border-gray-200">
          <h3
            className="text-[#1A1F4D] font-semibold text-base sm:text-lg mb-5 sm:mb-6"
            style={{ fontFamily: "Raleway" }}
          >
            Our Official Websites :
          </h3>
          <LogoRow items={officialWebsites} logoHeight="h-9 sm:h-11" />
        </div>

        {/* Our Social Media Handles */}
        <div className="py-6 sm:py-7 border-b border-gray-200">
          <h3
            className="text-[#1A1F4D] font-semibold text-base sm:text-lg mb-5 sm:mb-6"
            style={{ fontFamily: "Raleway" }}
          >
            Our Social Media Handles :
          </h3>
          <LogoRow items={socialHandles} logoHeight="h-7 sm:h-8" />
        </div>

        {/* Bottom copyright bar */}
        <div className="pt-5 sm:pt-6 flex flex-col sm:flex-row justify-between items-center gap-3 text-center sm:text-left">
          <p
            className="text-[#1A1F4D] text-sm"
            style={{
              fontFamily: "'Outfit', sans-serif",
              fontWeight: 400,
              fontSize: '14px',
              lineHeight: '20px',
            }}
          >
            © 2026 KLAR Travels. All rights reserved.
          </p>

          <div className="flex items-center gap-4">
            <button
              onClick={() => (window.location.href = '/privacy-policy')}
              className="text-primary text-sm hover:text-[var(--color-brand-red)] transition-colors duration-200 cursor-pointer"
              style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 400, fontSize: '14px' }}
            >
              Privacy Policy
            </button>
            <button
              onClick={() => (window.location.href = '/terms-and-conditions')}
              className="text-primary text-sm hover:text-[var(--color-brand-red)] transition-colors duration-200 cursor-pointer"
              style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 400, fontSize: '14px' }}
            >
              Terms of Service
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;