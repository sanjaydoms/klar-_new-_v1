import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import icon1 from '/logo/Icon (1).png?url';
import icon2 from '/logo/Icon (2).png?url';
import icon3 from '/logo/Icon (3).png?url';
import icon4 from '/logo/Icon (4).png?url';
import KlarLogo from '/logo/KLARBlue.png?url';
import Footer2 from '../../components/Footer/Footer2';
import Footer from '@/components/layout/Footer';

const ReportSecurityIssue: React.FC = () => {
  const navigate = useNavigate();

  useEffect(() => {
    document.title = 'Report a Security Issue | Klar Travels';
    window.scrollTo(0, 0);
  }, []);

  return (
    <>
      {/* ✅ ADDED pb-20 HERE */}
      <div className="min-h-screen bg-white pb-20">
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
                className="mb-4"
                style={{
                  fontFamily: "'Playfair Display', serif",
                  fontWeight: 700,
                  fontSize: '35px',
                  lineHeight: '60px',
                  letterSpacing: '-1px',
                  color: '#1A1F4D',
                }}
              >
                Report a Security Issue
              </h1>

              <p
                className="text-[#45556C] text-left"
                style={{
                  fontFamily: "'Outfit', sans-serif",
                  fontWeight: 400,
                  fontSize: '18px',
                  lineHeight: '32.4px',
                  letterSpacing: '0px',
                  verticalAlign: 'middle',
                }}
              >
                Security at Klar Travels is our highest priority. We value the work of security
                researchers and our community in keeping our travel and legal platforms safe, if you
                believe you've discovered a vulnerability, we want to hear from you.
              </p>
            </div>
          </div>
        </div>

        {/* Content Section */}
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-0 pb-12 md:pt-2 md:pb-16">
          {/* What to Report */}
          <div className="mb-10">
            <h2
              className="text-2xl md:text-3xl font-bold mb-6"
              style={{
                fontFamily: "'Playfair Display', serif",
                color: '#B68D40',
                letterSpacing: '-0.5px',
              }}
            >
              What to Report
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Box 1 - Account Security */}
              <div
                className="p-6 rounded-lg bg-white"
                style={{
                  border: '1px solid #B68D40',
                }}
              >
                <div className="flex items-start gap-4">
                  <img src={icon1} alt="Account Security" className="w-8 h-8 object-contain" />
                  <div>
                    <h3
                      className="text-xl font-bold mb-2"
                      style={{
                        fontFamily: "'Playfair Display', serif",
                        color: '#1A1F4D',
                        letterSpacing: '-0.5px',
                      }}
                    >
                      Account Security
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
                      Authentication bypass or unauthorized access to user accounts and data.
                    </p>
                  </div>
                </div>
              </div>

              {/* Box 2 - Data Exposure */}
              <div
                className="p-6 rounded-lg bg-white"
                style={{
                  border: '1px solid #B68D40',
                }}
              >
                <div className="flex items-start gap-4">
                  <img src={icon2} alt="Data Exposure" className="w-8 h-8 object-contain" />
                  <div>
                    <h3
                      className="text-xl font-bold mb-2"
                      style={{
                        fontFamily: "'Playfair Display', serif",
                        color: '#1A1F4D',
                        letterSpacing: '-0.5px',
                      }}
                    >
                      Data Exposure
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
                      Leakage of sensitive travel documentation or personal identity records.
                    </p>
                  </div>
                </div>
              </div>

              {/* Box 3 - Injections & XSS */}
              <div
                className="p-6 rounded-lg bg-white"
                style={{
                  border: '1px solid #B68D40',
                }}
              >
                <div className="flex items-start gap-4">
                  <img src={icon3} alt="Injections & XSS" className="w-8 h-8 object-contain" />
                  <div>
                    <h3
                      className="text-xl font-bold mb-2"
                      style={{
                        fontFamily: "'Playfair Display', serif",
                        color: '#1A1F4D',
                        letterSpacing: '-0.5px',
                      }}
                    >
                      Injections & XSS
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
                      SQL Injection, Cross-Site Scripting, or Cross-Site Request Forgery (CSRF).
                    </p>
                  </div>
                </div>
              </div>

              {/* Box 4 - Network Vulns */}
              <div
                className="p-6 rounded-lg bg-white"
                style={{
                  border: '1px solid #B68D40',
                }}
              >
                <div className="flex items-start gap-4">
                  <img src={icon4} alt="Network Vulns" className="w-8 h-8 object-contain" />
                  <div>
                    <h3
                      className="text-xl font-bold mb-2"
                      style={{
                        fontFamily: "'Playfair Display', serif",
                        color: '#1A1F4D',
                        letterSpacing: '-0.5px',
                      }}
                    >
                      Network Vulns
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
                      Critical misconfigurations or vulnerabilities in our infrastructure.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
          {/* How to Report */}
          <div
            className="mb-10 p-6 rounded-lg"
            style={{
              backgroundColor: '#FFF8ED',
              borderLeft: '4px solid #B68D40',
            }}
          >
            <h2
              className="text-2xl md:text-3xl font-bold mb-4"
              style={{
                fontFamily: "'Playfair Display', serif",
                color: '#B68D40',
                letterSpacing: '-0.5px',
              }}
            >
              How to Report
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
              Please send your findings to our dedicated security team. To help us process your
              report efficiently, include the following details:
            </p>

            <ul
              className="space-y-2 mb-6"
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
                  <span className="font-semibold">Description:</span> A detailed overview of the
                  vulnerability and its potential impact.
                </span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-[#D4AF37] font-bold mt-1">•</span>
                <span>
                  <span className="font-semibold">Reproduction:</span> Step-by-step instructions to
                  replicate the issue.
                </span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-[#D4AF37] font-bold mt-1">•</span>
                <span>
                  <span className="font-semibold">Evidence:</span> Proof-of-concept code,
                  screenshots, or screen recordings.
                </span>
              </li>
            </ul>

            {/* SUBMISSION CHANNEL */}
            <div className="mt-6">
              <h3
                className="text-lg font-bold mb-2"
                style={{
                  fontFamily: "'Playfair Display', serif",
                  color: '#1A1F4D',
                  letterSpacing: '-0.5px',
                }}
              >
                SUBMISSION CHANNEL
              </h3>

              <p
                className="text-[#1A1F4D] font-semibold mb-1"
                style={{
                  fontFamily: "'Outfit', sans-serif",
                  fontWeight: 600,
                  fontSize: '18px',
                  lineHeight: '32.4px',
                  letterSpacing: '0px',
                }}
              >
                info.klarworld@gmail.com
              </p>

              <p
                className="text-[#45556C] mb-4"
                style={{
                  fontFamily: "'Outfit', sans-serif",
                  fontWeight: 400,
                  fontSize: '16px',
                  lineHeight: '24px',
                  letterSpacing: '0px',
                }}
              >
                Subject: Security Vulnerability Report – Klar Travels
              </p>

              <button
                className="px-6 py-2 rounded-md transition-colors duration-300"
                style={{
                  backgroundColor: '#D4AF37',
                  color: '#1A1F4D',
                  fontFamily: "'Outfit', sans-serif",
                  fontWeight: 500,
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
                Send Report
              </button>
            </div>
          </div>

          {/* Responsible Disclosure Guidelines */}
          <div className="mb-10">
            <h2
              className="text-2xl md:text-3xl font-bold mb-4"
              style={{
                fontFamily: "'Playfair Display', serif",
                color: '#1A1F4D',
                letterSpacing: '-0.5px',
              }}
            >
              Responsible Disclosure Guidelines
            </h2>

            <ul
              className="space-y-3"
              style={{
                fontFamily: "'Outfit', sans-serif",
                fontWeight: 400,
                fontSize: '18px',
                lineHeight: '32.4px',
                color: '#45556C',
              }}
            >
              <li className="flex items-start gap-3">
                <span className="text-[#D4AF37] font-bold mt-1">01.</span>
                <span>
                  <span className="font-semibold">Act in Good Faith:</span> Avoid privacy
                  violations, destruction of data, and interruption or degradation of our services
                  during your research.
                </span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-[#D4AF37] font-bold mt-1">02.</span>
                <span>
                  <span className="font-semibold">Data Access:</span> Only access or modify data
                  that belongs to you. Do not attempt to view or alter any third-party travel
                  records or legal documents.
                </span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-[#D4AF37] font-bold mt-1">03.</span>
                <span>
                  <span className="font-semibold">Confidentiality:</span> Give us a reasonable
                  amount of time to fix the issue before making any information public.
                </span>
              </li>
            </ul>
          </div>

          {/* Our Commitment */}
          <div
            className="mb-10 p-6 rounded-lg"
            style={{
              border: '1px solid #EAE4DA',
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
              Our Commitment
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
              If you follow these guidelines, Klar Travels commits to:
            </p>

            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <span className="text-[#D4AF37] font-bold mt-1">•</span>
                <span
                  className="text-[#45556C]"
                  style={{
                    fontFamily: "'Outfit', sans-serif",
                    fontWeight: 400,
                    fontSize: '18px',
                    lineHeight: '32.4px',
                    letterSpacing: '0px',
                  }}
                >
                  <span className="font-semibold">Acknowledge</span> — We will confirm receipt of
                  your report within 48 business hours.
                </span>
              </div>
              <div className="flex items-start gap-3">
                <span className="text-[#D4AF37] font-bold mt-1">•</span>
                <span
                  className="text-[#45556C]"
                  style={{
                    fontFamily: "'Outfit', sans-serif",
                    fontWeight: 400,
                    fontSize: '18px',
                    lineHeight: '32.4px',
                    letterSpacing: '0px',
                  }}
                >
                  <span className="font-semibold">Updates</span> — We will keep you informed of our
                  progress as we evaluate and fix the issue.
                </span>
              </div>
              <div className="flex items-start gap-3">
                <span className="text-[#D4AF37] font-bold mt-1">•</span>
                <span
                  className="text-[#45556C]"
                  style={{
                    fontFamily: "'Outfit', sans-serif",
                    fontWeight: 400,
                    fontSize: '18px',
                    lineHeight: '32.4px',
                    letterSpacing: '0px',
                  }}
                >
                  <span className="font-semibold">No Legal Action</span> — We will not pursue legal
                  action against you for research conducted within these guidelines.
                </span>
              </div>
            </div>
          </div>
          {/* Exclusions */}
          <div className="mb-10 p-6 rounded-lg">
            <h2
              className="text-2xl md:text-3xl font-bold mb-4"
              style={{
                fontFamily: "'Playfair Display', serif",
                color: '#1A1F4D',
                letterSpacing: '-0.5px',
              }}
            >
              Exclusions
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
              The following items are out-of-scope and should not be tested:
            </p>

            <ul
              className="space-y-2 mt-2"
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
                <span>Social engineering (phishing, etc.)</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-[#D4AF37] font-bold mt-1">•</span>
                <span>Denial of Service (DoS/DDoS)</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-[#D4AF37] font-bold mt-1">•</span>
                <span>Physical security of offices</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-[#D4AF37] font-bold mt-1">•</span>
                <span>UI/UX bugs without security impact</span>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Footer */}
      <Footer />
    </>
  );
};

export default ReportSecurityIssue;