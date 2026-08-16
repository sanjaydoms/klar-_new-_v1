import React, { useState } from 'react';
import { Menu, X } from 'lucide-react';

const Header: React.FC = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const navLinks = [
    { href: '/', label: 'Destinations' },
    { href: '/contact-us', label: 'Contact Us' },
  ];

  return (
    <header className="w-full bg-white border-b border-gray-100 relative">
      <div className="container mx-auto px-4 sm:px-6 md:px-8 lg:px-12 xl:px-20">
        <div className="flex items-center justify-between h-[50px] sm:h-[55px] md:h-[60px] relative">
          {/* Left Nav - Hidden on mobile */}
          <div className="hidden md:block w-1/3">{/* Empty div for flex spacing */}</div>

          {/* Center Logo - Desktop only */}
          <div className="hidden md:block absolute left-1/2 transform -translate-x-1/2 pointer-events-none">
            <a
              href="/dashboard"
              aria-label="Klar Travel Home"
              className="pointer-events-auto block"
            >
              <img
                src="/logo/KLARBlue.png"
                alt="Klar Travel"
                className="h-8 sm:h-10 md:h-12 w-auto object-contain"
              />
            </a>
          </div>

          {/* Right Nav - Desktop */}
          <nav className="hidden md:flex items-center gap-4 lg:gap-6 xl:gap-10 ml-auto">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="text-[#0D0D2B] text-sm sm:text-base font-medium tracking-wide hover:text-[#27407C] transition-colors duration-200 whitespace-nowrap"
              >
                {link.label}
              </a>
            ))}
          </nav>

          {/* Mobile Layout - Logo centered with hamburger on right */}
          <div className="flex md:hidden items-center justify-between w-full">
            {/* Empty div for spacing to keep logo centered */}
            <div className="w-8"></div>

            {/* Mobile Logo - Centered */}
            <a
              href="/dashboard"
              aria-label="Klar Travel Home"
              className="flex items-center justify-center"
            >
              <img
                src="/logo/KLARBlue.png"
                alt="Klar Travel"
                className="h-8 sm:h-10 w-auto object-contain"
              />
            </a>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="text-[#0D0D2B] p-2 hover:bg-gray-100 rounded-lg transition-colors"
              aria-label="Toggle menu"
            >
              {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-50 bg-white/95 backdrop-blur-md animate-fadeIn">
          <div className="flex flex-col items-center justify-center h-full gap-6 px-6">
            <a href="/dashboard" onClick={() => setIsMobileMenuOpen(false)} className="mb-4">
              <img
                src="/logo/KLARBlue.png"
                alt="Klar Travel"
                className="h-12 w-auto object-contain"
              />
            </a>
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={() => setIsMobileMenuOpen(false)}
                className="text-[#0D0D2B] text-xl font-medium tracking-wide hover:text-[#27407C] transition-colors duration-200"
              >
                {link.label}
              </a>
            ))}
            <button
              onClick={() => setIsMobileMenuOpen(false)}
              className="absolute top-4 right-4 text-[#0D0D2B] p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X size={28} />
            </button>
          </div>
        </div>
      )}

      {/* Animation keyframes */}
      <style>{`
                @keyframes fadeIn {
                    from {
                        opacity: 0;
                        transform: scale(0.95);
                    }
                    to {
                        opacity: 1;
                        transform: scale(1);
                    }
                }
                .animate-fadeIn {
                    animation: fadeIn 0.3s ease-out;
                }
            `}</style>
    </header>
  );
};

export default Header;
