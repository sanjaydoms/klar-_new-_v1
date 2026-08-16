import React, { useState, useEffect } from 'react';
import { Menu, X } from 'lucide-react';

const ContactUsHero: React.FC = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const navLinks = [
    { href: "/destinations", label: "Destinations" },
    { href: "/", label: "Experiences" },
    { href: "/contact-us", label: "Contact Us" },
    { href: "/about-us", label: "About Us" },
    // { href: "/b2b", label: "Login" },
  ];

  return (
    <div className="relative w-full overflow-hidden" style={{ height: 'min(511px, 70vh)' }}>
      {/* Background Image */}
      <img
        src="/Contact-US/Contact-Header.jpg"
        alt="Contact Us background"
        className="absolute inset-0 w-full h-full object-cover"
      />

      {/* Dark overlay for readability */}
      <div className="absolute inset-0" style={{ background: 'rgba(10, 15, 50, 0.35)' }} />

      {/* Header Nav */}
      <header className="w-full bg-transparent relative z-20" style={{ height: '59.62px' }}>
        <div
          className="relative flex items-center justify-between h-full px-4 sm:px-6 md:px-8 lg:px-16 xl:px-20"
          style={{
            paddingLeft: 'clamp(16px, 5vw, 100.13px)',
            paddingRight: 'clamp(16px, 5vw, 100.13px)',
          }}
        >
          {/* Left Nav - Hidden on mobile */}
          {/* Left Nav - Logo and Links */}
          <div className="flex items-center gap-4 lg:gap-6 xl:gap-10">
            {/* Logo */}
            <a href="/dashboard" aria-label="Klar Travel Home" className="flex-shrink-0">
              <img
                src="/logo/KLARBlue.png"
                alt="Klar Travel"
                className="h-8 sm:h-10 md:h-12 w-auto object-contain"
              />
            </a>

            {/* Nav Links */}
            <nav className="hidden md:flex items-center gap-4 lg:gap-6 xl:gap-10">
              {/* <a
                href="/"
                className="text-white text-[13px] sm:text-[14px] lg:text-[15px] font-medium tracking-wide hover:opacity-70 transition-opacity duration-200 whitespace-nowrap"
              >
                Destinations
              </a>
              <a
                href="/about-us"
                className="text-white text-[13px] sm:text-[14px] lg:text-[15px] font-medium tracking-wide hover:opacity-70 transition-opacity duration-200 whitespace-nowrap"
              >
                About Us
              </a> */}
            </nav>
          </div>

          {/* Center Logo */}
          {/* <div className="absolute inset-x-0 flex justify-center pointer-events-none">
            <a href="/dashboard" aria-label="Klar Travel Home" className="pointer-events-auto">
              <img
                src="/logo/KLARBlue.png"
                alt="Klar Travel"
                className="h-8 sm:h-10 md:h-12 w-auto object-contain"
              />
            </a>
          </div> */}

          {/* Right Nav - Hidden on mobile */}
          <nav className="hidden md:flex items-center gap-4 lg:gap-6 xl:gap-10">
            {/* <a
                            href="/contact-us"
                            className="text-white text-[13px] sm:text-[14px] lg:text-[15px] font-medium tracking-wide hover:opacity-70 transition-opacity duration-200 whitespace-nowrap"
                        >
                            Contact Us
                        </a> */}
            <a
              href="/"
              className="text-white text-[13px] sm:text-[14px] lg:text-[15px] font-medium tracking-wide hover:opacity-70 transition-opacity duration-200 whitespace-nowrap"
            >
              Destinations
            </a>
            <a
              href="/about-us"
              className="text-white text-[13px] sm:text-[14px] lg:text-[15px] font-medium tracking-wide hover:opacity-70 transition-opacity duration-200 whitespace-nowrap"
            >
              About Us
            </a>
            {/* <a
                            href="/b2b"
                            className="text-white text-[13px] sm:text-[14px] lg:text-[15px] font-medium tracking-wide hover:opacity-70 transition-opacity duration-200 whitespace-nowrap"
                        >
                            Login
                        </a> */}
          </nav>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="md:hidden relative z-30 text-white p-2 hover:bg-white/10 rounded-lg transition-colors"
            aria-label="Toggle menu"
          >
            {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>

          {/* Mobile Menu Overlay */}
          {isMobileMenuOpen && (
            <div className="md:hidden fixed inset-0 z-20 bg-[#0a0f32]/95 backdrop-blur-md animate-fadeIn">
              <div className="flex flex-col items-center justify-center h-full gap-6 px-6">
                {navLinks.map((link) => (
                  <a
                    key={link.href}
                    href={link.href}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="text-white text-lg font-medium tracking-wide hover:opacity-70 transition-opacity duration-200"
                  >
                    {link.label}
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
      </header>

      {/* Centered "Contact Us" title */}
      <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
        <h1
          style={{
            fontFamily: "'Playfair Display', serif",
            fontWeight: 700,
            fontSize: 'clamp(28px, 6vw, 64px)',
            color: '#ffffff',
            margin: 0,
            letterSpacing: '-1px',
            textShadow: '0 2px 20px rgba(0,0,0,0.3)',
          }}
          className="pointer-events-none text-center px-4"
        >
          Contact Us
        </h1>
      </div>

      {/* Add animation keyframes for mobile menu */}
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
    </div>
  );
};

export default ContactUsHero;
