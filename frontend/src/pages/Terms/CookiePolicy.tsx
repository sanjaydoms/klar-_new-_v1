import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import KlarLogo from '/logo/KLARBlue.png?url';
import Footer2 from '../../components/Footer/Footer2';

const CookiePolicy: React.FC = () => {
  const navigate = useNavigate();

  useEffect(() => {
    document.title = 'KLAR B2B - Cookie Policy';
    window.scrollTo(0, 0);
  }, []);

  return (
    <>
      <div className="min-h-screen bg-white">
        {/* Hero Section */}
        <div className="relative overflow-hidden">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-20 md:py-28">
            {/* Logo at top center */}
            <div className="flex justify-center mb-8">
              <img
                src={KlarLogo}
                alt="Klar Travels Logo"
                className="h-12 md:h-16 w-auto cursor-pointer hover:opacity-80 transition-opacity duration-300"
                onClick={() => navigate('/')}
              />
            </div>

            <div>
              <h1
                className="mb-4 text-left"
                style={{
                  fontFamily: "'Playfair Display', serif",
                  fontWeight: 700,
                  fontSize: '35px',
                  lineHeight: '60px',
                  letterSpacing: '-1px',
                  color: '#1A1F4D',
                }}
              >
                Cookie Policy
              </h1>

              <div className="mb-8">
                <div
                  className="text-[#45556C] flex gap-4 flex-wrap"
                  style={{
                    fontFamily: "'Outfit', sans-serif",
                    fontWeight: 400,
                    fontSize: '16px',
                    lineHeight: '24px',
                    letterSpacing: '0px',
                  }}
                >
                  <p>Effective Date: January 1, 2024</p>
                  <span>|</span>
                  <p>Last Updated: October 24, 2024</p>
                </div>
              </div>

              {/* <div className="border-t-2 border-[#EAE4DA]/60 mt-4"></div> */}

              <p
                className="text-[#45556C] text-left mb-8"
                style={{
                  fontFamily: "'Outfit', sans-serif",
                  fontWeight: 400,
                  fontSize: '18px',
                  lineHeight: '32.4px',
                  letterSpacing: '0px',
                  verticalAlign: 'middle',
                }}
              >
                At Klar Travels, we are committed to providing a seamless and personalized travel
                experience. This Cookie Policy explains how we use cookies and similar technologies
                to recognize you when you visit our website. It explains what these technologies are
                and why we use them, as well as your rights to control our use of them.
              </p>
            </div>
          </div>
        </div>

        {/* Content Section */}
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-0 pb-12 md:pt-2 md:pb-16">
          {/* Section 1 - What Are Cookies? */}
          <div className="mb-10">
            <h2
              className="text-2xl md:text-3xl font-bold mb-4"
              style={{
                fontFamily: "'Playfair Display', serif",
                color: '#161717',
                letterSpacing: '-0.5px',
              }}
            >
              1. What Are Cookies?
            </h2>
            <p
              className="text-[#45556C] mb-4"
              style={{
                fontFamily: "'Outfit', sans-serif",
                fontWeight: 400,
                fontSize: '18px',
                lineHeight: '32.4px',
                letterSpacing: '0px',
              }}
            >
              Cookies are small data files that are placed on your computer or mobile device when
              you visit a website. Cookies are widely used by website owners in order to make their
              websites work, or to work more efficiently, as well as to provide reporting
              information.
            </p>
            <p
              className="text-[#45556C]"
              style={{
                fontFamily: "'Outfit', sans-serif",
                fontWeight: 400,
                fontSize: '18px',
                lineHeight: '32.4px',
                letterSpacing: '0px',
              }}
            >
              Cookies set by the website owner (in this case, Klar Travels) are called "first-party
              cookies." Cookies set by parties other than the website owner are called "third-party
              cookies." Third-party cookies enable third-party features or functionality to be
              provided on or through the website (e.g., advertising, interactive content, and
              analytics).
            </p>
          </div>

          {/* Section 2 - How Klar Travels Uses Cookies */}
          <div className="mb-10">
            <h2
              className="text-2xl md:text-3xl font-bold mb-4"
              style={{
                fontFamily: "'Playfair Display', serif",
                color: '#161717',
                letterSpacing: '-0.5px',
              }}
            >
              2. How Klar Travels Uses Cookies
            </h2>
            <p
              className="text-[#45556C] mb-4"
              style={{
                fontFamily: "'Outfit', sans-serif",
                fontWeight: 400,
                fontSize: '18px',
                lineHeight: '32.4px',
                letterSpacing: '0px',
              }}
            >
              We use first-party and third-party cookies for several reasons. Some cookies are
              required for technical reasons in order for our Website to operate, and we refer to
              these as "essential" or "strictly necessary" cookies. Other cookies also enable us to
              track and target the interests of our users to enhance the experience on our Online
              Properties.
            </p>

            <ul
              className="space-y-3 mt-4"
              style={{
                fontFamily: "'Outfit', sans-serif",
                fontWeight: 400,
                fontSize: '18px',
                lineHeight: '32.4px',
                color: '#45556C',
              }}
            >
              <li className="flex items-start gap-3">
                <span className="text-[#D4AF37] font-bold mt-1">•</span>
                <span>
                  Ensuring a smooth and efficient navigation experience across our global travel
                  services.
                </span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-[#D4AF37] font-bold mt-1">•</span>
                <span>
                  Remembering your preferences, such as language settings and legal jurisdiction
                  requirements.
                </span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-[#D4AF37] font-bold mt-1">•</span>
                <span>
                  Monitoring site performance and identifying technical issues in real-time.
                </span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-[#D4AF37] font-bold mt-1">•</span>
                <span>
                  Analyzing visitor behavior to improve our visa documentation and compliance tools.
                </span>
              </li>
            </ul>
          </div>

          {/* Section 3 - Types of Cookies We Use */}
          <div className="mb-10">
            <h2
              className="text-2xl md:text-3xl font-bold mb-4"
              style={{
                fontFamily: "'Playfair Display', serif",
                color: '#161717',
                letterSpacing: '-0.5px',
              }}
            >
              3. Types of Cookies We Use
            </h2>
            <div className="space-y-4 mt-4">
              <div>
                <h3
                  className="text-xl font-semibold mb-2"
                  style={{
                    fontFamily: "'Playfair Display', serif",
                    color: '#7B580B',
                    letterSpacing: '-0.5px',
                  }}
                >
                  ESSENTIAL COOKIES
                </h3>
                <p
                  className="text-[#45556C]"
                  style={{
                    fontFamily: "'Outfit', sans-serif",
                    fontWeight: 400,
                    fontSize: '18px',
                    lineHeight: '32.4px',
                    letterSpacing: '0px',
                  }}
                >
                  These cookies are strictly necessary to provide you with services available
                  through our website and to use some of its features, such as access to secure
                  areas.
                </p>
              </div>

              <div>
                <h3
                  className="text-xl font-semibold mb-2"
                  style={{
                    fontFamily: "'Playfair Display', serif",
                    color: '#7B580B',
                    letterSpacing: '-0.5px',
                  }}
                >
                  PERFORMANCE & ANALYTICS
                </h3>
                <p
                  className="text-[#45556C]"
                  style={{
                    fontFamily: "'Outfit', sans-serif",
                    fontWeight: 400,
                    fontSize: '18px',
                    lineHeight: '32.4px',
                    letterSpacing: '0px',
                  }}
                >
                  These cookies collect information that is used either in aggregate form to help us
                  understand how our website is being used or how effective our marketing campaigns
                  are, or to help us customize our website for you.
                </p>
              </div>

              <div>
                <h3
                  className="text-xl font-semibold mb-2"
                  style={{
                    fontFamily: "'Playfair Display', serif",
                    color: '#7B580B',
                    letterSpacing: '-0.5px',
                  }}
                >
                  FUNCTIONAL COOKIES
                </h3>
                <p
                  className="text-[#45556C]"
                  style={{
                    fontFamily: "'Outfit', sans-serif",
                    fontWeight: 400,
                    fontSize: '18px',
                    lineHeight: '32.4px',
                    letterSpacing: '0px',
                  }}
                >
                  These cookies allow the website to remember choices you make (such as your user
                  name or the region you are in) and provide enhanced, more personal features.
                </p>
              </div>

              <div>
                <h3
                  className="text-xl font-semibold mb-2"
                  style={{
                    fontFamily: "'Playfair Display', serif",
                    color: '#7B580B',
                    letterSpacing: '-0.5px',
                  }}
                >
                  MARKETING & ADVERTISING
                </h3>
                <p
                  className="text-[#45556C]"
                  style={{
                    fontFamily: "'Outfit', sans-serif",
                    fontWeight: 400,
                    fontSize: '18px',
                    lineHeight: '32.4px',
                    letterSpacing: '0px',
                  }}
                >
                  These cookies are used to make advertising messages more relevant to you. They
                  perform functions like preventing the same ad from continuously reappearing.
                </p>
              </div>
            </div>
          </div>

          {/* Section 4 - Your Cookie Preferences */}
          <div className="mb-10">
            <h2
              className="text-2xl md:text-3xl font-bold mb-4"
              style={{
                fontFamily: "'Playfair Display', serif",
                color: '#161717',
                letterSpacing: '-0.5px',
              }}
            >
              4. Managing Your Cookie Preferences
            </h2>
            <p
              className="text-[#45556C] mb-4"
              style={{
                fontFamily: "'Outfit', sans-serif",
                fontWeight: 400,
                fontSize: '18px',
                lineHeight: '32.4px',
                letterSpacing: '0px',
              }}
            >
              You have the right to decide whether to accept or reject cookies. You can exercise
              your cookie rights by setting your preferences in the Cookie Consent Manager. The
              Cookie Consent Manager allows you to select which categories of cookies you accept or
              reject. Essential cookies cannot be rejected as they are strictly necessary to provide
              you with services.
            </p>
            <p
              className="text-[#45556C]"
              style={{
                fontFamily: "'Outfit', sans-serif",
                fontWeight: 400,
                fontSize: '18px',
                lineHeight: '32.4px',
                letterSpacing: '0px',
              }}
            >
              You can also set or amend your web browser controls to accept or refuse cookies. If
              you choose to reject cookies, you may still use our website though your access to some
              functionality and areas of our website may be restricted.
            </p>
          </div>

          {/* Section 5 - Updates to This Cookie Policy */}
          <div className="mb-10">
            <h2
              className="text-2xl md:text-3xl font-bold mb-4"
              style={{
                fontFamily: "'Playfair Display', serif",
                color: '#161717',
                letterSpacing: '-0.5px',
              }}
            >
              5. Data Protection
            </h2>
            <p
              className="text-[#45556C]"
              style={{
                fontFamily: "'Outfit', sans-serif",
                fontWeight: 400,
                fontSize: '18px',
                lineHeight: '32.4px',
                letterSpacing: '0px',
              }}
            >
              Klar Travels maintains rigorous security standards to ensure that any data collected
              through cookies is handled with the same level of confidentiality as our legal
              consultations. We do not sell your data to third parties, and all analytics
              information is pseudonymized where possible to protect your identity.
            </p>
          </div>

          {/* Decorative Divider */}
          <div className="border-t border-[#D4AF37]/30 my-12"></div>

          {/* Contact Section */}
          <div className="py-8 flex justify-center">
            <div
              className="p-6 rounded-lg max-w-2xl w-full"
              style={{
                backgroundColor: '#FFF8ED',
                borderLeft: '4.69px solid #7B580D',
              }}
            >
              <h2
                className="text-2xl md:text-3xl font-bold mb-4"
                style={{
                  fontFamily: "'Playfair Display', serif",
                  color: '#1A1F4D',
                  letterSpacing: '-0.5px',
                }}
              >
                Contact Us
              </h2>

              <p
                className="text-[#45556C] mb-6"
                style={{
                  fontFamily: "'Outfit', sans-serif",
                  fontWeight: 400,
                  fontSize: '18px',
                  lineHeight: '32.4px',
                  letterSpacing: '0px',
                }}
              >
                If you have any questions about our use of cookies or other technologies, please
                email us or contact us via our website details below:
              </p>

              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <span className="text-[#D4AF37] font-bold">•</span>
                  <a
                    href="mailto:support@klartravels.com"
                    className="text-[#45556C] hover:text-[#D4AF37] transition-colors duration-300"
                    style={{
                      fontFamily: "'Outfit', sans-serif",
                      fontWeight: 400,
                      fontSize: '16px',
                      lineHeight: '24px',
                    }}
                  >
                    info.klarworld@gmail.com.com
                  </a>
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-[#D4AF37] font-bold">•</span>
                  <a
                    href="https://klartravels.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#45556C] hover:text-[#D4AF37] transition-colors duration-300"
                    style={{
                      fontFamily: "'Outfit', sans-serif",
                      fontWeight: 400,
                      fontSize: '16px',
                      lineHeight: '24px',
                    }}
                  >
                    klartravels.com
                  </a>
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-[#D4AF37] font-bold">•</span>
                  <a
                    href="tel:+91XXXXXXXXXX"
                    className="text-[#45556C] hover:text-[#D4AF37] transition-colors duration-300"
                    style={{
                      fontFamily: "'Outfit', sans-serif",
                      fontWeight: 400,
                      fontSize: '16px',
                      lineHeight: '24px',
                    }}
                  >
                    +91 8099359377
                  </a>
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-[#D4AF37] font-bold">•</span>
                  <span
                    className="text-[#45556C]"
                    style={{
                      fontFamily: "'Outfit', sans-serif",
                      fontWeight: 400,
                      fontSize: '16px',
                      lineHeight: '24px',
                    }}
                  >
                    Global HQ, Legal Division
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <Footer2 />
    </>
  );
};

export default CookiePolicy;
