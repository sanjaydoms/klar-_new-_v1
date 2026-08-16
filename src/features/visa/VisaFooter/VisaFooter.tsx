import React, { useState } from 'react';
import {
  BadgeCheck,
  Landmark,
  ShieldCheck,
  History,
  Phone,
  Mail,
  Clock,
  Twitter,
  Instagram,
  Linkedin,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const VisaFooter: React.FC = () => {
  const [email, setEmail] = useState('');
  const navigate = useNavigate();

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Subscribed with:', email);
  };

  const handleVisaServiceClick = (serviceName: string) => {
    navigate(`?type=${encodeURIComponent(serviceName)}`);

    const searchSection = document.getElementById('visa-search-section');
    if (searchSection) {
      searchSection.scrollIntoView({ behavior: 'smooth' });
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  return (
    <footer className="relative w-full overflow-hidden font-sans mt-16 md:mt-24 bg-[#14193d]">
      {/* Background Image - Anchored at the bottom and scaled to fit 100% width without clipping */}
      <div
        className="absolute inset-0 w-full h-full bg-bottom bg-no-repeat pointer-events-none z-0"
        style={{
          backgroundImage: `url("/images/visa_footer_background_img.png")`,
          backgroundSize: '100% auto',
        }}
      />

      <div className="relative z-10 max-w-7xl mx-auto px-6 pt-16 pb-8 md:pt-20 md:pb-10 flex flex-col justify-between min-h-[520px]">
        {/* Main Footer Links & Info Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-12 mb-12 md:mb-16">
          
          {/* Column 1: VISA SERVICES */}
          <div>
            <h3 className="text-sm font-bold tracking-wider uppercase mb-5 text-white">
              VISA SERVICES
            </h3>
            <ul className="space-y-3 text-sm text-slate-300">
              {[
                'Tourist Visa',
                'Business Visa',
                'Student Visa',
                'Dependent Visa',
                'Transit Visa',
                'Family Visa',
              ].map((service) => (
                <li key={service}>
                  <button
                    type="button"
                    onClick={() => handleVisaServiceClick(service)}
                    className="hover:text-white transition-colors duration-200 hover:underline text-left cursor-pointer"
                  >
                    {service}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* Column 2: QUICK LINKS */}
          <div>
            <h3 className="text-sm font-bold tracking-wider uppercase mb-5 text-white">
              QUICK LINKS
            </h3>
            <ul className="space-y-3 text-sm text-slate-300">
              {[
                'Visa Requirements',
                'Processing Time',
                'FAQ',
              ].map((link) => (
                <li key={link}>
                  <a
                    href={`#${link.toLowerCase().replace(/\s+/g, '-')}`}
                    className="hover:text-white transition-colors duration-200"
                  >
                    {link}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Column 3: WHY CHOOSE US */}
          <div>
            <h3 className="text-sm font-bold tracking-wider uppercase mb-5 text-white">
              WHY CHOOSE US
            </h3>
            <ul className="space-y-4 text-sm text-slate-300">
              <li className="flex items-center gap-3">
                <BadgeCheck className="w-5 h-5 text-blue-400 shrink-0" />
                <span>Expert Documentation</span>
              </li>
              <li className="flex items-center gap-3">
                <Landmark className="w-5 h-5 text-blue-400 shrink-0" />
                <span>Embassy Guidance</span>
              </li>
              <li className="flex items-center gap-3">
                <ShieldCheck className="w-5 h-5 text-blue-400 shrink-0" />
                <span>Secure Submission</span>
              </li>
              <li className="flex items-center gap-3">
                <History className="w-5 h-5 text-blue-400 shrink-0" />
                <span>Real-time Updates</span>
              </li>
            </ul>
          </div>

          {/* Column 4: STAY UPDATED & Contact */}
          <div>
            <h3 className="text-sm font-bold tracking-wider uppercase mb-5 text-white">
              STAY UPDATED
            </h3>

            {/* Subscribe Form */}
            <form onSubmit={handleSubscribe} className="mb-6">
              <div className="flex items-center w-full rounded-md border border-white/20 bg-[#171d47]/80 backdrop-blur-xs p-1 focus-within:border-blue-400 transition-colors">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Your email address"
                  className="w-full bg-transparent px-3 py-1.5 text-xs sm:text-sm text-white placeholder-slate-400 focus:outline-none"
                  required
                />
                <button
                  type="submit"
                  className="bg-[#600505] hover:bg-[#800000] text-white text-xs px-4 py-2 rounded font-medium transition-colors whitespace-nowrap cursor-pointer"
                >
                  Subscribe
                </button>
              </div>
            </form>

            {/* Contact Details */}
            <div className="space-y-3 text-xs sm:text-sm text-slate-300 mb-6">
              <div className="flex items-center gap-3">
                <Phone className="w-4 h-4 text-blue-400 shrink-0" />
                <span>+1 (800) KLAR-VISA</span>
              </div>
              <div className="flex items-center gap-3">
                <Mail className="w-4 h-4 text-blue-400 shrink-0" />
                <a
                  href="mailto:visa@klartravels.com"
                  className="hover:text-white transition-colors"
                >
                  visa@klartravels.com
                </a>
              </div>
              <div className="flex items-center gap-3">
                <Clock className="w-4 h-4 text-blue-400 shrink-0" />
                <span>Mon–Sat | 9 AM – 7 PM</span>
              </div>
            </div>

            {/* Social Icons */}
            <div className="flex items-center gap-3">
              {[
                { Icon: Twitter, href: '#twitter', label: 'Twitter' },
                { Icon: Instagram, href: '#instagram', label: 'Instagram' },
                { Icon: Linkedin, href: '#linkedin', label: 'LinkedIn' },
              ].map(({ Icon, href, label }) => (
                <a
                  key={label}
                  href={href}
                  aria-label={label}
                  className="w-8 h-8 rounded-full border border-white/20 flex items-center justify-center text-slate-300 hover:text-white hover:border-white hover:bg-white/10 transition-colors bg-[#111638]/60"
                >
                  <Icon className="w-4 h-4" />
                </a>
              ))}
            </div>
          </div>

        </div>

        {/* Footer Bottom Bar */}
        <div className="pt-4 flex flex-col sm:flex-row justify-between items-center gap-4 text-xs text-slate-300 relative z-10 border-t border-white/10 mt-auto">
          <p>© 2026 KLAR Travels | Visa Services. All Rights Reserved.</p>
          <div className="flex items-center gap-6">
            <a href="#privacy" className="hover:text-white transition-colors">
              Privacy Policy
            </a>
            <a href="#terms" className="hover:text-white transition-colors">
              Terms of Service
            </a>
          </div>
        </div>

      </div>
    </footer>
  );
};

export default VisaFooter;