import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import KlarLogo from '/logo/KLARBlue.png?url';
import Footer2 from '../../components/Footer/Footer2';
import Footer from '@/components/layout/Footer';

const EscalationPage: React.FC = () => {
  const navigate = useNavigate();

  useEffect(() => {
    document.title = 'Escalation Process | Klar Travels';
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

            <div className="text-center">
              <h1
                className="mb-0"
                style={{
                  fontFamily: "'Playfair Display', serif",
                  fontWeight: 700,
                  fontSize: '45px',
                  lineHeight: '60px',
                  letterSpacing: '-1px',
                  color: '#1A1F4D',
                }}
              >
                We're Committed to Resolving Your Concerns
              </h1>

              <p
                className="text-[#45556C] text-center"
                style={{
                  fontFamily: "'Outfit', sans-serif",
                  fontWeight: 400,
                  fontSize: '18px',
                  lineHeight: '32.4px',
                  letterSpacing: '0px',
                }}
              >
                At Klar Travels, we strive to provide exceptional service and timely support. If
                your concern has not been resolved through our regular support channels, you may
                escalate the matter for further review by our management team.
              </p>
            </div>
          </div>
        </div>

        {/* Content Section */}
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-0 pb-12 md:pt-2 md:pb-16">
          {/* Divider */}
          <div className="border-t border-[#EAE4DA]/60 my-8"></div>

          {/* When Should You Escalate? & Before Escalating - Two Columns */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-6">
            {/* When Should You Escalate? */}
            <div
              className="p-6 rounded-lg"
              style={{
                border: '1px solid #EAE4DA',
                backgroundColor: '#FFFFFF',
              }}
            >
              <div className="flex items-center gap-3 mb-6">
                <span className="text-2xl">!</span>
                <h2
                  className="text-2xl md:text-3xl font-bold"
                  style={{
                    fontFamily: "'Playfair Display', serif",
                    color: '#1A1F4D',
                    letterSpacing: '-0.5px',
                  }}
                >
                  When Should You Escalate?
                </h2>
              </div>

              <ul className="space-y-3">
                <li className="flex items-start gap-3">
                  <span className="text-[#D4AF37] font-bold mt-1">•</span>
                  <span
                    className="text-[#45556C]"
                    style={{
                      fontFamily: "'Outfit', sans-serif",
                      fontWeight: 400,
                      fontSize: '18px',
                      lineHeight: '32.4px',
                    }}
                  >
                    Your issue remains unresolved after contacting customer support.
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-[#D4AF37] font-bold mt-1">•</span>
                  <span
                    className="text-[#45556C]"
                    style={{
                      fontFamily: "'Outfit', sans-serif",
                      fontWeight: 400,
                      fontSize: '18px',
                      lineHeight: '32.4px',
                    }}
                  >
                    You have not received a response within the expected timeframe.
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-[#D4AF37] font-bold mt-1">•</span>
                  <span
                    className="text-[#45556C]"
                    style={{
                      fontFamily: "'Outfit', sans-serif",
                      fontWeight: 400,
                      fontSize: '18px',
                      lineHeight: '32.4px',
                    }}
                  >
                    You are dissatisfied with the resolution provided.
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-[#D4AF37] font-bold mt-1">•</span>
                  <span
                    className="text-[#45556C]"
                    style={{
                      fontFamily: "'Outfit', sans-serif",
                      fontWeight: 400,
                      fontSize: '18px',
                      lineHeight: '32.4px',
                    }}
                  >
                    Your concern requires management review.
                  </span>
                </li>
              </ul>
            </div>

            {/* Before Escalating */}
            <div
              className="p-6 rounded-lg"
              style={{
                border: '1px solid #EAE4DA',
                backgroundColor: '#FFF8ED',
              }}
            >
              <div
                className="pl-4"
                style={{
                  borderLeft: '4px solid #7B580D',
                }}
              >
                <h2
                  className="text-2xl md:text-3xl font-bold mb-6"
                  style={{
                    fontFamily: "'Playfair Display', serif",
                    color: '#1A1F4D',
                    letterSpacing: '-0.5px',
                  }}
                >
                  Before Escalating
                </h2>

                <p
                  className="text-[#45556C] mb-4"
                  style={{
                    fontFamily: "'Outfit', sans-serif",
                    fontWeight: 400,
                    fontSize: '18px',
                    lineHeight: '32.4px',
                  }}
                >
                  Please ensure that you have:
                </p>

                <ul className="space-y-3">
                  <li className="flex items-start gap-3">
                    <span className="text-[#D4AF37] font-bold mt-1">•</span>
                    <span
                      className="text-[#45556C]"
                      style={{
                        fontFamily: "'Outfit', sans-serif",
                        fontWeight: 400,
                        fontSize: '18px',
                        lineHeight: '32.4px',
                      }}
                    >
                      Contacted our customer support team first.
                    </span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-[#D4AF37] font-bold mt-1">•</span>
                    <span
                      className="text-[#45556C]"
                      style={{
                        fontFamily: "'Outfit', sans-serif",
                        fontWeight: 400,
                        fontSize: '18px',
                        lineHeight: '32.4px',
                      }}
                    >
                      Provided all relevant booking details.
                    </span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-[#D4AF37] font-bold mt-1">•</span>
                    <span
                      className="text-[#45556C]"
                      style={{
                        fontFamily: "'Outfit', sans-serif",
                        fontWeight: 400,
                        fontSize: '18px',
                        lineHeight: '32.4px',
                      }}
                    >
                      Allowed sufficient time for investigation.
                    </span>
                  </li>
                </ul>

                <div
                  className="mt-6 p-4 rounded-lg"
                  style={{
                    backgroundColor: '#FFFFFF',
                    borderLeft: '4px solid #B68D40',
                  }}
                >
                  <p
                    className="text-[#7B580D] font-semibold"
                    style={{
                      fontFamily: "'Outfit', sans-serif",
                      fontWeight: 500,
                      fontSize: '16px',
                    }}
                  >
                    Most concerns can be resolved quickly through standard support.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Divider */}
          <div className="border-t border-[#EAE4DA]/60 my-8"></div>

          {/* Information Required - Two Columns */}
          <div
            className="p-6 md:p-8 rounded-lg mb-12"
            style={{
              border: '1px solid #EAE4DA',
              backgroundColor: '#FFF8ED',
            }}
          >
            <div
              className="pl-4"
              style={{
                borderLeft: '4px solid #7B580D',
              }}
            >
              <h2
                className="text-2xl md:text-3xl font-bold mb-6"
                style={{
                  fontFamily: "'Playfair Display', serif",
                  color: '#1A1F4D',
                  letterSpacing: '-0.5px',
                }}
              >
                Information Required
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-12 mt-6">
              {/* Left Column */}
              <div>
                <div className="space-y-4">
                  <div>
                    <label
                      className="block text-[#1A1F4D] font-semibold mb-2"
                      style={{
                        fontFamily: "'Outfit', sans-serif",
                        fontWeight: 600,
                        fontSize: '14px',
                      }}
                    >
                      Full Name
                    </label>
                    <input
                      type="text"
                      placeholder="Enter full legal name"
                      className="w-full px-4 py-2 rounded-lg border border-[#EAE4DA] focus:outline-none focus:border-[#B68D40] transition-colors bg-white"
                      style={{
                        fontFamily: "'Outfit', sans-serif",
                        fontSize: '16px',
                      }}
                    />
                  </div>

                  <div>
                    <label
                      className="block text-[#1A1F4D] font-semibold mb-2"
                      style={{
                        fontFamily: "'Outfit', sans-serif",
                        fontWeight: 600,
                        fontSize: '14px',
                      }}
                    >
                      Email Address
                    </label>
                    <input
                      type="email"
                      placeholder="example@domain.com"
                      className="w-full px-4 py-2 rounded-lg border border-[#EAE4DA] focus:outline-none focus:border-[#B68D40] transition-colors bg-white"
                      style={{
                        fontFamily: "'Outfit', sans-serif",
                        fontSize: '16px',
                      }}
                    />
                  </div>

                  <div>
                    <label
                      className="block text-[#1A1F4D] font-semibold mb-2"
                      style={{
                        fontFamily: "'Outfit', sans-serif",
                        fontWeight: 600,
                        fontSize: '14px',
                      }}
                    >
                      Date of Travel
                    </label>
                    <input
                      type="text"
                      placeholder="mm/dd/yyyy"
                      className="w-full px-4 py-2 rounded-lg border border-[#EAE4DA] focus:outline-none focus:border-[#B68D40] transition-colors bg-white"
                      style={{
                        fontFamily: "'Outfit', sans-serif",
                        fontSize: '16px',
                      }}
                    />
                  </div>

                  <div>
                    <label
                      className="block text-[#1A1F4D] font-semibold mb-2"
                      style={{
                        fontFamily: "'Outfit', sans-serif",
                        fontWeight: 600,
                        fontSize: '14px',
                      }}
                    >
                      Description of Concern
                    </label>
                    <textarea
                      rows={4}
                      placeholder="Describe your concern in detail..."
                      className="w-full px-4 py-2 rounded-lg border border-[#EAE4DA] focus:outline-none focus:border-[#B68D40] transition-colors resize-none bg-white"
                      style={{
                        fontFamily: "'Outfit', sans-serif",
                        fontSize: '16px',
                      }}
                    ></textarea>
                  </div>
                </div>
              </div>

              {/* Right Column */}
              <div>
                <div className="space-y-4">
                  <div>
                    <label
                      className="block text-[#1A1F4D] font-semibold mb-2"
                      style={{
                        fontFamily: "'Outfit', sans-serif",
                        fontWeight: 600,
                        fontSize: '14px',
                      }}
                    >
                      Contact Number
                    </label>
                    <input
                      type="tel"
                      placeholder="+XX XXXXXX XXXXXX"
                      className="w-full px-4 py-2 rounded-lg border border-[#EAE4DA] focus:outline-none focus:border-[#B68D40] transition-colors bg-white"
                      style={{
                        fontFamily: "'Outfit', sans-serif",
                        fontSize: '16px',
                      }}
                    />
                  </div>

                  <div>
                    <label
                      className="block text-[#1A1F4D] font-semibold mb-2"
                      style={{
                        fontFamily: "'Outfit', sans-serif",
                        fontWeight: 600,
                        fontSize: '14px',
                      }}
                    >
                      Booking Reference
                    </label>
                    <input
                      type="text"
                      placeholder="KT-XXXXXXX"
                      className="w-full px-4 py-2 rounded-lg border border-[#EAE4DA] focus:outline-none focus:border-[#B68D40] transition-colors bg-white"
                      style={{
                        fontFamily: "'Outfit', sans-serif",
                        fontSize: '16px',
                      }}
                    />
                  </div>

                  <div>
                    <label
                      className="block text-[#1A1F4D] font-semibold mb-2"
                      style={{
                        fontFamily: "'Outfit', sans-serif",
                        fontWeight: 600,
                        fontSize: '14px',
                      }}
                    >
                      Previous Support Ticket
                    </label>
                    <input
                      type="text"
                      placeholder="TKT-XXXXXXX (if available)"
                      className="w-full px-4 py-2 rounded-lg border border-[#EAE4DA] focus:outline-none focus:border-[#B68D40] transition-colors bg-white"
                      style={{
                        fontFamily: "'Outfit', sans-serif",
                        fontSize: '16px',
                      }}
                    />
                  </div>

                  <div className="flex justify-center mt-8">
                    <button
                      className="px-8 py-3 rounded-md transition-colors duration-300 w-full md:w-auto"
                      style={{
                        backgroundColor: '#D4AF37',
                        color: '#1A1F4D',
                        fontFamily: "'Outfit', sans-serif",
                        fontWeight: 600,
                        fontSize: '16px',
                        border: 'none',
                        cursor: 'pointer',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = '#B8942F';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = '#D4AF37';
                      }}
                    >
                      Submit Case for Review
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Divider */}
          <div className="border-t border-[#EAE4DA]/60 my-8"></div>

          {/* Escalation Review Process */}
          <div className="mb-12">
            <h2
              className="text-2xl md:text-3xl font-bold mb-6"
              style={{
                fontFamily: "'Playfair Display', serif",
                color: '#1A1F4D',
                letterSpacing: '-0.5px',
              }}
            >
              Escalation Review Process
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div
                className="p-6 rounded-lg"
                style={{
                  border: '1px solid #EAE4DA',
                  backgroundColor: '#FFF8ED',
                }}
              >
                <h3
                  className="text-lg font-bold mb-2"
                  style={{
                    fontFamily: "'Playfair Display', serif",
                    color: '#B68D40',
                    letterSpacing: '-0.5px',
                  }}
                >
                  Case Assignment
                </h3>
                <p
                  className="text-[#45556C]"
                  style={{
                    fontFamily: "'Outfit', sans-serif",
                    fontWeight: 400,
                    fontSize: '16px',
                    lineHeight: '28px',
                  }}
                >
                  The case is routed directly to our specialist management team for priority
                  handling.
                </p>
              </div>

              <div
                className="p-6 rounded-lg"
                style={{
                  border: '1px solid #EAE4DA',
                  backgroundColor: '#FFF8ED',
                }}
              >
                <h3
                  className="text-lg font-bold mb-2"
                  style={{
                    fontFamily: "'Playfair Display', serif",
                    color: '#B68D40',
                    letterSpacing: '-0.5px',
                  }}
                >
                  Internal Inquiry
                </h3>
                <p
                  className="text-[#45556C]"
                  style={{
                    fontFamily: "'Outfit', sans-serif",
                    fontWeight: 400,
                    fontSize: '16px',
                    lineHeight: '28px',
                  }}
                >
                  Additional information may be requested from service providers or legal
                  departments.
                </p>
              </div>

              <div
                className="p-6 rounded-lg"
                style={{
                  border: '1px solid #EAE4DA',
                  backgroundColor: '#FFF8ED',
                }}
              >
                <h3
                  className="text-lg font-bold mb-2"
                  style={{
                    fontFamily: "'Playfair Display', serif",
                    color: '#B68D40',
                    letterSpacing: '-0.5px',
                  }}
                >
                  Comprehensive Audit
                </h3>
                <p
                  className="text-[#45556C]"
                  style={{
                    fontFamily: "'Outfit', sans-serif",
                    fontWeight: 400,
                    fontSize: '16px',
                    lineHeight: '28px',
                  }}
                >
                  All previous communications, booking logs, and service reports are meticulously
                  reviewed.
                </p>
              </div>

              <div
                className="p-6 rounded-lg"
                style={{
                  border: '1px solid #EAE4DA',
                  backgroundColor: '#FFF8ED',
                }}
              >
                <h3
                  className="text-lg font-bold mb-2"
                  style={{
                    fontFamily: "'Playfair Display', serif",
                    color: '#B68D40',
                    letterSpacing: '-0.5px',
                  }}
                >
                  Formal Resolution
                </h3>
                <p
                  className="text-[#45556C]"
                  style={{
                    fontFamily: "'Outfit', sans-serif",
                    fontWeight: 400,
                    fontSize: '16px',
                    lineHeight: '28px',
                  }}
                >
                  A final resolution is drafted and communicated to you with a full breakdown of
                  findings.
                </p>
              </div>
            </div>
          </div>

          {/* Divider */}
          <div className="border-t border-[#EAE4DA]/60 my-8"></div>

          {/* Response Timeline */}
          <div
            className="mb-12 p-6 md:p-8 rounded-lg"
            style={{
              border: '1px solid #EAE4DA',
              backgroundColor: '#FFF8ED',
            }}
          >
            <div
              className="pl-4"
              style={{
                borderLeft: '4px solid #7B580D',
              }}
            >
              <h2
                className="text-2xl md:text-3xl font-bold mb-6"
                style={{
                  fontFamily: "'Playfair Display', serif",
                  color: '#1A1F4D',
                  letterSpacing: '-0.5px',
                }}
              >
                Response Timeline
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6 mt-6">
              <div
                className="p-6 rounded-lg text-center"
                style={{
                  border: '1px solid #EAE4DA',
                  backgroundColor: '#FFFFFF',
                }}
              >
                <h3
                  className="text-lg font-bold mb-2"
                  style={{
                    fontFamily: "'Playfair Display', serif",
                    color: '#B68D40',
                    letterSpacing: '-0.5px',
                  }}
                >
                  Level 1
                </h3>
                <p
                  className="text-[#1A1F4D] font-bold text-xl"
                  style={{
                    fontFamily: "'Outfit', sans-serif",
                    fontWeight: 700,
                    fontSize: '24px',
                  }}
                >
                  2 Business Days
                </p>
              </div>

              <div
                className="p-6 rounded-lg text-center"
                style={{
                  border: '1px solid #EAE4DA',
                  backgroundColor: '#FFFFFF',
                }}
              >
                <h3
                  className="text-lg font-bold mb-2"
                  style={{
                    fontFamily: "'Playfair Display', serif",
                    color: '#B68D40',
                    letterSpacing: '-0.5px',
                  }}
                >
                  Level 2
                </h3>
                <p
                  className="text-[#1A1F4D] font-bold text-xl"
                  style={{
                    fontFamily: "'Outfit', sans-serif",
                    fontWeight: 700,
                    fontSize: '24px',
                  }}
                >
                  3–5 Business Days
                </p>
              </div>

              <div
                className="p-6 rounded-lg text-center"
                style={{
                  border: '1px solid #EAE4DA',
                  backgroundColor: '#FFFFFF',
                }}
              >
                <h3
                  className="text-lg font-bold mb-2"
                  style={{
                    fontFamily: "'Playfair Display', serif",
                    color: '#B68D40',
                    letterSpacing: '-0.5px',
                  }}
                >
                  Level 3
                </h3>
                <p
                  className="text-[#1A1F4D] font-bold text-xl"
                  style={{
                    fontFamily: "'Outfit', sans-serif",
                    fontWeight: 700,
                    fontSize: '24px',
                  }}
                >
                  5–7 Business Days
                </p>
              </div>
            </div>

            <div
              className="p-4 rounded-lg"
              style={{
                backgroundColor: '#FFFFFF',
                borderLeft: '4px solid #B68D40',
              }}
            >
              <p
                className="text-[#7B580D] font-semibold"
                style={{
                  fontFamily: "'Outfit', sans-serif",
                  fontWeight: 500,
                  fontSize: '16px',
                }}
              >
                Complex cases requiring international coordination may require additional
                investigation time.
              </p>
            </div>
          </div>

          {/* Divider */}
          <div className="border-t border-[#EAE4DA]/60 my-8"></div>

          {/* Support Contacts - Two Columns */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
            {/* Primary Escalation - Dark Background */}
            <div
              className="p-6 rounded-lg"
              style={{
                border: '1px solid #EAE4DA',
                backgroundColor: '#242B37',
              }}
            >
              <div
                className="pl-4"
                style={{
                  borderLeft: '4px solid #B68D40',
                }}
              >
                <h3
                  className="text-xl font-bold mb-4"
                  style={{
                    fontFamily: "'Playfair Display', serif",
                    color: '#FFFFFF',
                    letterSpacing: '-0.5px',
                  }}
                >
                  Primary Escalation
                </h3>
                <p
                  className="text-[#EAE4DA] font-semibold mb-2"
                  style={{
                    fontFamily: "'Outfit', sans-serif",
                    fontWeight: 600,
                    fontSize: '16px',
                  }}
                >
                  Escalation Support Team
                </p>
                <a
                  href="mailto:escalations@klartravels.com"
                  className="text-[#D4AF37] hover:text-[#B8942F] transition-colors duration-300 block mb-2"
                  style={{
                    fontFamily: "'Outfit', sans-serif",
                    fontWeight: 500,
                    fontSize: '16px',
                  }}
                >
                  info.klarworld@gmail.com
                </a>
                <p
                  className="text-[#EAE4DA]"
                  style={{
                    fontFamily: "'Outfit', sans-serif",
                    fontWeight: 400,
                    fontSize: '14px',
                  }}
                >
                  Mon – Sat, 9:00 AM – 7:00 PM IST
                </p>
              </div>
            </div>

            {/* Standard Support - White Background */}
            <div
              className="p-6 rounded-lg"
              style={{
                border: '1px solid #EAE4DA',
                backgroundColor: '#FFFFFF',
              }}
            >
              <div
                className="pl-4"
                style={{
                  borderLeft: '4px solid #7B580D',
                }}
              >
                <h3
                  className="text-xl font-bold mb-4"
                  style={{
                    fontFamily: "'Playfair Display', serif",
                    color: '#1A1F4D',
                    letterSpacing: '-0.5px',
                  }}
                >
                  Standard Support
                </h3>
                <p
                  className="text-[#45556C] font-semibold mb-2"
                  style={{
                    fontFamily: "'Outfit', sans-serif",
                    fontWeight: 600,
                    fontSize: '16px',
                  }}
                >
                  Customer Support
                </p>
                <a
                  href="mailto:support@klartravels.com"
                  className="text-[#D4AF37] hover:text-[#B8942F] transition-colors duration-300 block mb-2"
                  style={{
                    fontFamily: "'Outfit', sans-serif",
                    fontWeight: 500,
                    fontSize: '16px',
                  }}
                >
                  info.klarworld@gmail.com
                </a>
                <a
                  href="tel:+91XXXXXXXXX"
                  className="text-[#D4AF37] hover:text-[#B8942F] transition-colors duration-300 block"
                  style={{
                    fontFamily: "'Outfit', sans-serif",
                    fontWeight: 500,
                    fontSize: '16px',
                  }}
                >
                  +91 8099359377
                </a>
              </div>
            </div>
          </div>

          {/* Divider */}
          <div className="border-t border-[#EAE4DA]/60 my-8"></div>

          {/* Our Commitment to You */}
          <div className="mb-12">
            <h2
              className="text-2xl md:text-3xl font-bold mb-6"
              style={{
                fontFamily: "'Playfair Display', serif",
                color: '#1A1F4D',
                letterSpacing: '-0.5px',
              }}
            >
              Our Commitment to You
            </h2>

            <div
              className="p-6 rounded-lg text-center"
              style={{
                backgroundColor: '#FFF8ED',
                borderLeft: '4px solid #B68D40',
              }}
            >
              <p
                className="text-[#7B580D] italic"
                style={{
                  fontFamily: "'Playfair Display', serif",
                  fontWeight: 400,
                  fontSize: '18px',
                  lineHeight: '32.4px',
                }}
              >
                "Every escalation is reviewed with care and impartiality. Our goal is to understand
                your concerns, investigate them thoroughly, and provide a fair and satisfactory
                resolution whenever possible."
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <Footer/>
      </div>
    </>
  );
};

export default EscalationPage;
