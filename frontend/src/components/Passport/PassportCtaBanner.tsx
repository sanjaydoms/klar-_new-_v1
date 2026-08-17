import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  ArrowUpRight,
  MessageCircle,
  Phone,
  Mail,
  Clock,
  MapPin,
  Facebook,
  Instagram,
  Twitter,
  Linkedin,
  Receipt
} from 'lucide-react';

interface PassportCtaBannerProps {
  onSelectPlan?: (plan: { service: 'New passport' | 'Renewal' | 'Reissue' | 'Police Clearance Certificate'; applicant: 'Adult' | 'Minor'; }) => void;
}

export const PassportCtaBanner: React.FC<PassportCtaBannerProps> = ({ onSelectPlan }) => {
  const navigate = useNavigate();
  const location = useLocation();

  const scrollToPassportSearch = (targetId: string) => {
    const element = document.getElementById(targetId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const navigateToPassportSearch = () => {
    const isMobile = window.innerWidth < 768;
    const targetPath = isMobile ? '/mobile-passport-search' : '/dashboard';
    const targetHash = isMobile ? '#passport-form' : '#passport-search';
    const fullTarget = `${targetPath}${targetHash}`;
    const navigationState = {
      activeTab: 'passport',
      planSelectionTimestamp: Date.now(),
    };

    if (location.pathname === targetPath && location.hash === targetHash) {
      navigate(fullTarget, { state: navigationState });
      scrollToPassportSearch(targetHash.replace('#', ''));
      return;
    }

    navigate(fullTarget, { state: navigationState });
  };

  const handleApplyNow = () => {
    navigateToPassportSearch();
  };

  const handleServiceClick = (service: string) => {
    const normalizedService =
      service === 'Passport renewal'
        ? 'Renewal'
        : service === 'Reissue Passport'
        ? 'Reissue'
        : service === 'New passport'
        ? 'New passport'
        : 'Police Clearance Certificate';

    const selectedPlan = { service: normalizedService, applicant: 'Adult' };
    sessionStorage.setItem('passportSelectedPlan', JSON.stringify(selectedPlan));
    onSelectPlan?.(selectedPlan);
    navigateToPassportSearch();
  };

  const socialLinks = [
    {
      name: 'Facebook',
      icon: Facebook,
      href: 'https://www.facebook.com/profile.php?id=61592267784788',
    },
    {
      name: 'Instagram',
      icon: Instagram,
      href: 'https://www.instagram.com/klartravelsofficials/?hl=en',
    },
    { name: 'Twitter', icon: Twitter, href: 'https://x.com/worldklar' },
    {
      name: 'LinkedIn',
      icon: Linkedin,
      href: 'https://www.linkedin.com/company/klar-travels?trk=blended-typeahead',
    },
  ];

  const servicesList = [
    'New passport',
    'Passport renewal',
    'Reissue Passport',
    'Police Clearance Certificate',
  ];

  return (
    <div className="w-full text-white font-sans antialiased">
      {/* 1. Top Call To Action Banner */}
      <div className="border-b border-white/10 py-10 md:py-14">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="max-w-2xl">
            {/* Tag */}
            <div className="flex items-center space-x-2 mb-2">
              <span className="w-6 h-[1.5px] bg-amber-400 inline-block"></span>
              <span className="text-xs sm:text-sm font-semibold text-gray-300 uppercase tracking-wider">
                Ready when you are
              </span>
            </div>

            {/* Main Title */}
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-serif font-bold text-white tracking-tight mb-3">
              Start your passport application today
            </h2>

            {/* Description */}
            <p className="text-xs sm:text-sm text-gray-300 leading-relaxed font-light">
              Share your details and a passport specialist confirms your plan,
              documents and the earliest appointment slot — usually within one
              working hour.
            </p>
          </div>

          {/* Apply Now CTA Button */}
          <button
            type="button"
            onClick={handleApplyNow}
            className="self-start md:self-auto inline-flex items-center gap-2 bg-white text-[#4A0000] hover:bg-gray-100 px-6 py-3 rounded-xl font-semibold text-sm transition-all duration-200 cursor-pointer shadow-md shrink-0 active:scale-95"
          >
            <span>Apply now</span>
            <ArrowUpRight className="w-4 h-4 stroke-[2.5]" />
          </button>
        </div>
      </div>

      {/* 2. Middle Footer Information Grid */}
      <div className="py-12 md:py-16 border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 md:grid-cols-12 gap-10 md:gap-8 items-start">
          {/* Brand Info & Social Media Links */}
          <div className="md:col-span-5 flex flex-col items-start gap-5">
            {/* Logo Image with Height Constraint */}
            <div className="flex items-center">
              <img
                src="/images/logo.png"
                alt="Klar Travels Logo"
                className="h-24 sm:h-16 w-auto"
              />
            </div>

            {/* Social Media Links (Opens in New Tab) */}
            <div className="flex items-center gap-2.5">
              {socialLinks.map((social) => {
                const IconComponent = social.icon;
                return (
                  <a
                    key={social.name}
                    href={social.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={social.name}
                    className="w-9 h-9 rounded-lg border border-white/20 flex items-center justify-center text-white hover:bg-white/10 hover:border-white/40 transition-colors"
                  >
                    <IconComponent className="w-4 h-4" />
                  </a>
                );
              })}
            </div>
          </div>

          {/* Services Quick Links */}
          <div className="md:col-span-3 flex flex-col gap-3">
            <h3 className="font-serif text-lg font-bold tracking-tight text-white mb-1">
              Services
            </h3>
            <ul className="space-y-2.5 text-xs sm:text-sm text-gray-300 font-light">
              {servicesList.map((service, index) => (
                <li
                  key={index}
                  className="hover:text-white transition-colors cursor-pointer"
                  onClick={() => handleServiceClick(service)}
                >
                  {service}
                </li>
              ))}
            </ul>
          </div>

          {/* Contact Details */}
          <div className="md:col-span-4 flex flex-col gap-3">
            <h3 className="font-serif text-lg font-bold tracking-tight text-white mb-1">
              Contact
            </h3>
            <div className="space-y-3 text-xs sm:text-sm text-gray-300 font-light">
              <div className="flex items-center gap-3">
                <MessageCircle className="w-4 h-4 shrink-0 text-gray-300" />
                <span>WhatsApp +91 8099359377</span>
              </div>
              <div className="flex items-center gap-3">
                <Phone className="w-4 h-4 shrink-0 text-gray-300" />
                <span>8099359377</span>
              </div>
              <div className="flex items-center gap-3">
                <Mail className="w-4 h-4 shrink-0 text-gray-300" />
                <span>contact@klarworld.in</span>
              </div>
              <div className="flex items-center gap-3">
                <Clock className="w-4 h-4 shrink-0 text-gray-300" />
                <span>9:00 AM – 9:00 PM, all days</span>
              </div>
              <div className="flex items-start gap-3">
                <MapPin className="w-4 h-4 shrink-0 text-gray-300 mt-0.5" />
                <span>
                  305/307, 3rd Floor RDB Blue Hope, Tilak Road, Abids, Telangana
                  Hyderabad – 500 001 India
                </span>
              </div>
              <div className="flex items-center gap-3">
                <Receipt className="w-4 h-4 shrink-0 text-gray-300" />
                <span>GST: 36ABEFK7511P1ZW</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Bottom Legal Disclaimer and Route Navigation */}
      <div className="py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row md:items-center justify-between gap-4 text-xs text-gray-400 font-light">
          {/* Copyright Statement */}
          <p className="leading-relaxed max-w-xl">
            © {new Date().getFullYear()} Klar Travels. Passport services are
            facilitated as per Ministry of External Affairs guidelines. We are
            not a government body.
          </p>

          {/* Policy & Route Links */}
          <div className="flex flex-wrap items-center gap-6 text-gray-300 shrink-0">
            <Link
              to="/privacy-policy"
              className="hover:text-white transition-colors"
            >
              Privacy policy
            </Link>
            <Link
              to="/terms-and-conditions"
              className="hover:text-white transition-colors"
            >
              Terms of service
            </Link>
            <Link
              to="/customer-support"
              className="hover:text-white transition-colors"
            >
              Customer Support
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PassportCtaBanner;