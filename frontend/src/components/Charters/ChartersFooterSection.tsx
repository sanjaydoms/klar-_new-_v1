import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Facebook,
  Instagram,
  Twitter,
  Linkedin,
  Phone,
  Mail,
  MessageSquare,
  MapPin,
} from 'lucide-react';

const CHARTER_SERVICES = [
  'Private Jets',
  'Helicopter Charter',
  'Corporate Charter',
  'Group Charter',
];

export const ChartersFooterSection: React.FC = () => {
  const navigate = useNavigate();

  const handleServiceClick = (service: string) => {
    const encodedCategory = encodeURIComponent(service);
    const isMobile = window.innerWidth < 768;

    if (isMobile) {
      navigate(`/mobile-charters-search?charterCategory=${encodedCategory}`, {
        state: { charterCategory: service },
      });
      setTimeout(() => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }, 50);
      return;
    }

    navigate(`/dashboard?charterCategory=${encodedCategory}`, {
      state: { activeTab: 'charters', charterCategory: service },
    });
    setTimeout(() => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }, 50);
  };

  return (
    <footer className="w-full bg-[#380306] text-white pt-12 sm:pt-16 pb-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        
        {/* Main Footer Content */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 pb-10 border-b border-white/10">
          
          {/* Brand & Social Column */}
          <div className="lg:col-span-5 flex flex-col justify-between">
            <div>
              {/* Dummy Logo - Replace src with your actual logo path */}
              <div className="mb-5">
                <img
                  src="/images/logo.png"
                  alt="Klar Travels Logo"
                  className="h-14 sm:h-16 w-auto object-contain"
                />
              </div>

              <p className="text-white/80 text-xs sm:text-sm leading-relaxed max-w-sm mb-6">
                Luxury private aviation tailored around your schedule with dedicated experts.
                Elevating the standard of global travel through precision and exclusivity.
              </p>
            </div>

            {/* Social Media Links */}
            <div className="flex items-center gap-3 pt-2">
              <a
                href="https://www.facebook.com/profile.php?id=61592267784788"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Facebook"
                className="w-9 h-9 rounded-full border border-white/30 flex items-center justify-center text-white hover:bg-white/10 hover:border-white transition-colors duration-200"
              >
                <Facebook className="w-4 h-4" />
              </a>

              <a
                href="https://www.instagram.com/klartravelsofficials/?hl=en"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Instagram"
                className="w-9 h-9 rounded-full border border-white/30 flex items-center justify-center text-white hover:bg-white/10 hover:border-white transition-colors duration-200"
              >
                <Instagram className="w-4 h-4" />
              </a>

              <a
                href="https://x.com/worldklar"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Twitter"
                className="w-9 h-9 rounded-full border border-white/30 flex items-center justify-center text-white hover:bg-white/10 hover:border-white transition-colors duration-200"
              >
                <Twitter className="w-4 h-4" />
              </a>

              <a
                href="https://www.linkedin.com/company/klar-travels?trk=blended-typeahead"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="LinkedIn"
                className="w-9 h-9 rounded-full border border-white/30 flex items-center justify-center text-white hover:bg-white/10 hover:border-white transition-colors duration-200"
              >
                <Linkedin className="w-4 h-4" />
              </a>
            </div>
          </div>

          {/* Charter Services Column */}
          <div className="lg:col-span-3">
            <h3 className="text-xs sm:text-sm font-semibold uppercase tracking-[0.2em] text-white mb-4 sm:mb-6">
              Charter Services
            </h3>
            <ul className="space-y-3 text-xs sm:text-sm text-white/80">
              {CHARTER_SERVICES.map((service) => (
                <li key={service}>
                  <button
                    type="button"
                    onClick={() => handleServiceClick(service)}
                    className="text-left hover:text-white transition-colors"
                  >
                    {service}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact Support Column */}
          <div className="lg:col-span-4">
            <h3 className="text-xs sm:text-sm font-semibold uppercase tracking-[0.2em] text-white mb-4 sm:mb-6">
              Contact Support
            </h3>

            <div className="space-y-4 text-xs sm:text-sm">
              {/* Phone */}
              <div className="flex items-start gap-3">
                <Phone className="w-4 h-4 text-white shrink-0 mt-0.5" />
                <div>
                  <span className="text-[10px] uppercase tracking-wider text-white/50 block font-medium">
                    Phone
                  </span>
                  <a href="tel:+918099359377" className="text-white/90 hover:underline">
                    +91 8099359377
                  </a>
                </div>
              </div>

              {/* Email */}
              <div className="flex items-start gap-3">
                <Mail className="w-4 h-4 text-white shrink-0 mt-0.5" />
                <div>
                  <span className="text-[10px] uppercase tracking-wider text-white/50 block font-medium">
                    Email
                  </span>
                  <a href="mailto:charter@klartravels.com" className="text-white/90 hover:underline">
                    contact@klarworld.in
                  </a>
                </div>
              </div>

              {/* Live Chat */}
              <div className="flex items-start gap-3">
                <MessageSquare className="w-4 h-4 text-white shrink-0 mt-0.5" />
                <div>
                  <span className="text-[10px] uppercase tracking-wider text-white/50 block font-medium">
                    Live Chat
                  </span>
                  <span className="text-white/90">Available 24/7</span>
                </div>
              </div>

              {/* Global HQ */}
              <div className="flex items-start gap-3">
                <MapPin className="w-4 h-4 text-white shrink-0 mt-0.5" />
                <div>
                  <span className="text-[10px] uppercase tracking-wider text-white/50 block font-medium">
                    Global HQ
                  </span>
                  <span className="text-white/90">305/307, 3rd Floor RDB Blue Hope, Tilak Road, Abids, Telangana Hyderabad – 500 001 India
                  <br />
                  GST: 36ABEFK7511P1ZW
                  </span>
                </div>
              </div>
            </div>
          </div>

        </div>

        {/* Bottom Legal & Copyright Bar */}
        <div className="pt-6 flex flex-col sm:flex-row items-center justify-between text-center sm:text-left gap-3 text-[10px] sm:text-xs text-white/60 tracking-wider">
          <p className="uppercase">
            © 2026 KLAR TRAVEL. ALL RIGHTS RESERVED. EXTRAORDINARY JOURNEYS.
          </p>

          <div className="flex items-center gap-4">
            <a href="#privacy" className="hover:text-white transition-colors">
              Privacy Policy
            </a>
            <span>|</span>
            <a href="#terms" className="hover:text-white transition-colors">
              Terms of Service
            </a>
          </div>
        </div>

      </div>
    </footer>
  );
};

export default ChartersFooterSection;