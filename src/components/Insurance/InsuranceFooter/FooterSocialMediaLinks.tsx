import React from 'react';

export const FooterSocialMediaLinks: React.FC = () => {
  return (
    <div className="bg-transparent w-full space-y-8 font-sans">
      {/* Our Official Websites */}
      <div>
        <h4 className="font-bold text-black text-xs sm:text-sm font-[Roboto] tracking-wider mb-4">
          Our Official Websites :
        </h4>
        <div className="flex flex-wrap items-center gap-10 sm:gap-16 pb-6 border-b border-gray-400/50">
          <a
            href="https://www.klarworld.com"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:opacity-80 transition-opacity"
          >
            <img
              src="/logo/klar_world_logo_img.png"
              alt="Klar World"
              className="h-7 sm:h-9 w-auto object-contain"
              onError={(e) => (e.currentTarget.style.display = 'none')}
            />
          </a>
          <a
            href="https://www.klarworld.com/Wellness"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:opacity-80 transition-opacity"
          >
            <img
              src="/logo/klar_wellness_logo_img.png"
              alt="Klar Wellness"
              className="h-7 sm:h-9 w-auto object-contain"
              onError={(e) => (e.currentTarget.style.display = 'none')}
            />
          </a>
          <a
            href="https://www.klarworld.com/Events"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:opacity-80 transition-opacity"
          >
            <img
              src="/logo/klar_events_logo_img.png"
              alt="Klar Events"
              className="h-7 sm:h-9 w-auto object-contain"
              onError={(e) => (e.currentTarget.style.display = 'none')}
            />
          </a>
          <a
            href="https://www.klarworld.com/Experience"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:opacity-80 transition-opacity"
          >
            <img
              src="/logo/klar_experience_logo_img.png"
              alt="Klar Experiences"
              className="h-7 sm:h-9 w-auto object-contain"
              onError={(e) => (e.currentTarget.style.display = 'none')}
            />
          </a>
        </div>
      </div>

      {/* Our Social Media Handles */}
      <div>
        <h4 className="font-bold text-black text-xs sm:text-sm mb-4 font-[Roboto] tracking-wider">
          Our Social Media Handles :
        </h4>
        <div className="flex flex-wrap items-center gap-10 sm:gap-14 pb-6 border-b border-gray-400/50">
          {/* LinkedIn */}
          <a
            href="https://www.linkedin.com/company/klar-travels?trk=blended-typeahead"
            aria-label="LinkedIn"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:opacity-80 transition-opacity"
          >
            <img
              src="/logo/linkedin_logo.png"
              alt="LinkedIn"
              className="h-5 sm:h-6 max-w-[100px] sm:max-w-[120px] w-auto object-contain"
              onError={(e) => (e.currentTarget.style.display = 'none')}
            />
          </a>

          {/* YouTube */}
          <a
            href="https://www.youtube.com/@klartravels"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="YouTube"
            className="hover:opacity-80 transition-opacity"
          >
            <img
              src="/logo/youtube_logo.png"
              alt="YouTube"
              className="h-5 sm:h-6 max-w-[100px] sm:max-w-[120px] w-auto object-contain"
              onError={(e) => (e.currentTarget.style.display = 'none')}
            />
          </a>

          {/* Instagram */}
          <a
            href="https://www.instagram.com/klartravelsofficials/?hl=en"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Instagram"
            className="hover:opacity-80 transition-opacity"
          >
            <img
              src="/logo/instagram_logo.png"
              alt="Instagram"
              className="h-5 sm:h-6 max-w-[100px] sm:max-w-[120px] w-auto object-contain"
              onError={(e) => (e.currentTarget.style.display = 'none')}
            />
          </a>

          {/* Facebook */}
          <a
            href="https://www.facebook.com/profile.php?id=61592267784788"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Facebook"
            className="hover:opacity-80 transition-opacity"
          >
            <img
              src="/logo/facebook_logo.png"
              alt="Facebook"
              className="h-5 sm:h-6 max-w-[100px] sm:max-w-[120px] w-auto object-contain"
              onError={(e) => (e.currentTarget.style.display = 'none')}
            />
          </a>

          {/* X (Twitter) */}
          <a
            href="https://x.com/worldklar"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="X"
            className="hover:opacity-80 transition-opacity"
          >
            <img
              src="/logo/twitter_logo.png"
              alt="X"
              className="h-5 sm:h-6 max-w-[100px] sm:max-w-[120px] w-auto object-contain"
              onError={(e) => (e.currentTarget.style.display = 'none')}
            />
          </a>
        </div>
      </div>

      {/* Copyright Note */}
      <div className="pt-2 text-[11px] text-gray-600">
        <p>© {new Date().getFullYear()} KLAR Travels. All rights reserved.</p>
      </div>
    </div>
  );
};