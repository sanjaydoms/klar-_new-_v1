import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import PriceSecurity from '../../../public/images/Price_Security.png';
import KlarLogo from '/logo/KLARBlue.png?url'; 
import Footer2 from '../../components/Footer/Footer2';
import Footer from '@/components/layout/Footer';

const PaymentSecurity: React.FC = () => {
  const navigate = useNavigate();

  useEffect(() => {
    document.title = 'Payment Security | Klar Travels';
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
              {/* Payment Security Badge */}
              <div
                className="inline-block px-4 py-1 rounded-full mb-4"
                style={{
                  backgroundColor: '#FDCD79',
                }}
              >
                <span
                  className="font-semibold text-sm"
                  style={{
                    fontFamily: "'Outfit', sans-serif",
                    fontWeight: 600,
                    fontSize: '12px',
                    letterSpacing: '1px',
                    color: '#1A1F4D',
                  }}
                >
                  PAYMENT SECURITY
                </span>
              </div>

              {/* Main Heading */}
              <h1
                className="mb-4"
                style={{
                  fontFamily: "'Playfair Display', serif",
                  fontWeight: 700,
                  fontSize: '55px',
                  lineHeight: '70px',
                  letterSpacing: '-1px',
                  color: '#1A1F4D',
                }}
              >
                Your Security Is Our Priority
              </h1>
            </div>
          </div>
        </div>

        {/* Content Section */}
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-0 pb-12 md:pt-2 md:pb-16">
          {/* Introduction */}
          <div className="mb-12">
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
              At Klar Travels, we are committed to protecting your payment information and ensuring
              every transaction is processed securely. We use industry-standard security measures
              and trusted payment partners to safeguard your personal and financial data.
            </p>
          </div>

          {/* Divider */}
          <div className="border-t border-[#EAE4DA]/60 my-8"></div>

          {/* Secure Payment Processing */}
          <div className="mb-12">
            <h2
              className="text-2xl md:text-3xl font-bold mb-6 text-center"
              style={{
                fontFamily: "'Playfair Display', serif",
                color: '#1A1F4D',
                letterSpacing: '-0.5px',
              }}
            >
              Secure Payment Processing
            </h2>

            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div className="text-center p-4">
                <div className="w-16 h-16 mx-auto mb-3 bg-[#FFF8ED] rounded-full flex items-center justify-center">
                  <span className="text-2xl">🔒</span>
                </div>
                <p
                  className="text-[#1A1F4D] font-semibold text-sm"
                  style={{
                    fontFamily: "'Outfit', sans-serif",
                    fontWeight: 600,
                    fontSize: '14px',
                  }}
                >
                  SSL Encryption
                </p>
              </div>
              <div className="text-center p-4">
                <div className="w-16 h-16 mx-auto mb-3 bg-[#FFF8ED] rounded-full flex items-center justify-center">
                  <span className="text-2xl">🏦</span>
                </div>
                <p
                  className="text-[#1A1F4D] font-semibold text-sm"
                  style={{
                    fontFamily: "'Outfit', sans-serif",
                    fontWeight: 600,
                    fontSize: '14px',
                  }}
                >
                  Secure Gateways
                </p>
              </div>
              <div className="text-center p-4">
                <div className="w-16 h-16 mx-auto mb-3 bg-[#FFF8ED] rounded-full flex items-center justify-center">
                  <span className="text-2xl">🛡️</span>
                </div>
                <p
                  className="text-[#1A1F4D] font-semibold text-sm"
                  style={{
                    fontFamily: "'Outfit', sans-serif",
                    fontWeight: 600,
                    fontSize: '14px',
                  }}
                >
                  Fraud Prevention
                </p>
              </div>
              <div className="text-center p-4">
                <div className="w-16 h-16 mx-auto mb-3 bg-[#FFF8ED] rounded-full flex items-center justify-center">
                  <span className="text-2xl">⚡</span>
                </div>
                <p
                  className="text-[#1A1F4D] font-semibold text-sm"
                  style={{
                    fontFamily: "'Outfit', sans-serif",
                    fontWeight: 600,
                    fontSize: '14px',
                  }}
                >
                  Processed Processing
                </p>
              </div>
              <div className="text-center p-4">
                <div className="w-16 h-16 mx-auto mb-3 bg-[#FFF8ED] rounded-full flex items-center justify-center">
                  <span className="text-2xl">📡</span>
                </div>
                <p
                  className="text-[#1A1F4D] font-semibold text-sm"
                  style={{
                    fontFamily: "'Outfit', sans-serif",
                    fontWeight: 600,
                    fontSize: '14px',
                  }}
                >
                  Secure Transmission
                </p>
              </div>
            </div>
          </div>

          {/* Divider */}
          <div className="border-t border-[#EAE4DA]/60 my-8"></div>

          {/* Accepted Payment Methods & Information Protection - Two Columns */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 mb-12">
            {/* Accepted Payment Methods */}
            <div>
              <h2
                className="text-2xl md:text-3xl font-bold mb-6"
                style={{
                  fontFamily: "'Playfair Display', serif",
                  color: '#1A1F4D',
                  letterSpacing: '-0.5px',
                }}
              >
                Accepted Payment Methods
              </h2>

              <div className="space-y-3">
                {/* Credit & Debit Cards */}
                <div
                  className="p-4 rounded-lg"
                  style={{
                    border: '1px solid #EAE4DA',
                    backgroundColor: '#FFFFFF',
                  }}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-[#D4AF37] font-bold">•</span>
                    <span
                      className="text-[#45556C]"
                      style={{
                        fontFamily: "'Outfit', sans-serif",
                        fontWeight: 400,
                        fontSize: '16px',
                      }}
                    >
                      Credit & Debit Cards
                    </span>
                  </div>
                </div>

                {/* UPI & Digital Wallets */}
                <div
                  className="p-4 rounded-lg"
                  style={{
                    border: '1px solid #EAE4DA',
                    backgroundColor: '#FFFFFF',
                  }}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-[#D4AF37] font-bold">•</span>
                    <span
                      className="text-[#45556C]"
                      style={{
                        fontFamily: "'Outfit', sans-serif",
                        fontWeight: 400,
                        fontSize: '16px',
                      }}
                    >
                      UPI & Digital Wallets
                    </span>
                  </div>
                </div>

                {/* Net Banking */}
                <div
                  className="p-4 rounded-lg"
                  style={{
                    border: '1px solid #EAE4DA',
                    backgroundColor: '#FFFFFF',
                  }}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-[#D4AF37] font-bold">•</span>
                    <span
                      className="text-[#45556C]"
                      style={{
                        fontFamily: "'Outfit', sans-serif",
                        fontWeight: 400,
                        fontSize: '16px',
                      }}
                    >
                      Net Banking
                    </span>
                  </div>
                </div>

                {/* International Payment Methods */}
                <div
                  className="p-4 rounded-lg"
                  style={{
                    border: '1px solid #EAE4DA',
                    backgroundColor: '#FFFFFF',
                  }}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-[#D4AF37] font-bold">•</span>
                    <span
                      className="text-[#45556C]"
                      style={{
                        fontFamily: "'Outfit', sans-serif",
                        fontWeight: 400,
                        fontSize: '16px',
                      }}
                    >
                      International Payment Methods
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Information Protection */}
            <div>
              <h2
                className="text-2xl md:text-3xl font-bold mb-6"
                style={{
                  fontFamily: "'Playfair Display', serif",
                  color: '#1A1F4D',
                  letterSpacing: '-0.5px',
                }}
              >
                Information Protection
              </h2>

              <div
                className="p-6 rounded-lg"
                style={{
                  border: '1px solid #EAE4DA',
                  backgroundColor: '#FFF8ED',
                }}
              >
                <p
                  className="text-[#45556C] mb-4"
                  style={{
                    fontFamily: "'Outfit', sans-serif",
                    fontWeight: 400,
                    fontSize: '16px',
                    lineHeight: '28px',
                  }}
                >
                  Klar Travels does not store complete credit card or debit card details on its
                  servers. Sensitive payment information is securely processed through authorized
                  third-party payment providers that comply with industry security standards.
                </p>
                <div
                  className="inline-block px-4 py-2 rounded-md"
                  style={{
                    backgroundColor: '#D4AF37',
                    color: '#1A1F4D',
                  }}
                >
                  <span
                    className="font-semibold text-sm"
                    style={{
                      fontFamily: "'Outfit', sans-serif",
                      fontWeight: 600,
                      fontSize: '12px',
                    }}
                  >
                    PCI DSS COMPLIANT PROCESSING
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Divider */}
          <div className="border-t border-[#EAE4DA]/60 my-8"></div>

          {/* Fraud Prevention & Safe Online Payments - Two Columns */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
            {/* Fraud Prevention */}
            <div>
              <h2
                className="text-2xl md:text-3xl font-bold mb-6"
                style={{
                  fontFamily: "'Playfair Display', serif",
                  color: '#1A1F4D',
                  letterSpacing: '-0.5px',
                }}
              >
                Fraud Prevention
              </h2>

              <div
                className="p-6 rounded-lg"
                style={{
                  border: '1px solid #EAE4DA',
                  backgroundColor: 'transparent',
                }}
              >
                <ul className="space-y-3">
                  <li className="flex items-center gap-3">
                    <span className="text-[#D4AF37] font-bold">•</span>
                    <span
                      className="text-[#45556C]"
                      style={{
                        fontFamily: "'Outfit', sans-serif",
                        fontWeight: 400,
                        fontSize: '16px',
                      }}
                    >
                      Verify payment information meticulously
                    </span>
                  </li>
                  <li className="flex items-center gap-3">
                    <span className="text-[#D4AF37] font-bold">•</span>
                    <span
                      className="text-[#45556C]"
                      style={{
                        fontFamily: "'Outfit', sans-serif",
                        fontWeight: 400,
                        fontSize: '16px',
                      }}
                    >
                      Conduct periodic internal security checks
                    </span>
                  </li>
                  <li className="flex items-center gap-3">
                    <span className="text-[#D4AF37] font-bold">•</span>
                    <span
                      className="text-[#45556C]"
                      style={{
                        fontFamily: "'Outfit', sans-serif",
                        fontWeight: 400,
                        fontSize: '16px',
                      }}
                    >
                      Repeat identity verification when necessary
                    </span>
                  </li>
                  <li className="flex items-center gap-3">
                    <span className="text-[#D4AF37] font-bold">•</span>
                    <span
                      className="text-[#45556C]"
                      style={{
                        fontFamily: "'Outfit', sans-serif",
                        fontWeight: 400,
                        fontSize: '16px',
                      }}
                    >
                      Monitor all transactions for suspicious activity
                    </span>
                  </li>
                </ul>
              </div>
            </div>

            {/* Safe Online Payments */}
            <div>
              <h2
                className="text-2xl md:text-3xl font-bold mb-6"
                style={{
                  fontFamily: "'Playfair Display', serif",
                  color: '#1A1F4D',
                  letterSpacing: '-0.5px',
                }}
              >
                Safe Online Payments
              </h2>

              <div
                className="p-6 rounded-lg"
                style={{
                  border: '1px solid #EAE4DA',
                  backgroundColor: 'transparent',
                }}
              >
                <ul className="space-y-3">
                  <li className="flex items-center gap-3">
                    <span className="text-[#D4AF37] font-bold">•</span>
                    <span
                      className="text-[#45556C]"
                      style={{
                        fontFamily: "'Outfit', sans-serif",
                        fontWeight: 400,
                        fontSize: '16px',
                      }}
                    >
                      Use trusted devices and secure private networks
                    </span>
                  </li>
                  <li className="flex items-center gap-3">
                    <span className="text-[#D4AF37] font-bold">•</span>
                    <span
                      className="text-[#45556C]"
                      style={{
                        fontFamily: "'Outfit', sans-serif",
                        fontWeight: 400,
                        fontSize: '16px',
                      }}
                    >
                      Avoid public Wi-Fi when entering financial details
                    </span>
                  </li>
                  <li className="flex items-center gap-3">
                    <span className="text-[#D4AF37] font-bold">•</span>
                    <span
                      className="text-[#45556C]"
                      style={{
                        fontFamily: "'Outfit', sans-serif",
                        fontWeight: 400,
                        fontSize: '16px',
                      }}
                    >
                      Keep your banking credentials strictly confidential
                    </span>
                  </li>
                  <li className="flex items-center gap-3">
                    <span className="text-[#D4AF37] font-bold">•</span>
                    <span
                      className="text-[#45556C]"
                      style={{
                        fontFamily: "'Outfit', sans-serif",
                        fontWeight: 400,
                        fontSize: '16px',
                      }}
                    >
                      Report suspicious transactions immediately
                    </span>
                  </li>
                </ul>
              </div>
            </div>
          </div>

          {/* Image Section */}
          <div className="mt-12 mb-8 flex justify-center">
            <img
              src={PriceSecurity}
              alt="Payment Security"
              className="w-full max-w-5xl h-auto rounded-lg"
            />
          </div>

          {/* Divider */}
          <div className="border-t border-[#EAE4DA]/60 my-8"></div>

          {/* Reporting Security Concerns */}
          <div className="mb-12">
            <h2
              className="text-2xl md:text-3xl font-bold mb-6 text-center"
              style={{
                fontFamily: "'Playfair Display', serif",
                color: '#1A1F4D',
                letterSpacing: '-0.5px',
              }}
            >
              Reporting Security Concerns
            </h2>

            <p
              className="text-[#45556C] text-center mb-8"
              style={{
                fontFamily: "'Outfit', sans-serif",
                fontWeight: 400,
                fontSize: '18px',
                lineHeight: '32.4px',
                letterSpacing: '0px',
              }}
            >
              If you encounter any suspicious activity or have concerns regarding payment security,
              please contact our specialized teams.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Security Email */}
              <div
                className="p-6 rounded-lg text-center"
                style={{
                  border: '1px solid #EAE4DA',
                  backgroundColor: '#FFF8ED',
                }}
              >
                <h3
                  className="text-lg font-bold mb-3"
                  style={{
                    fontFamily: "'Playfair Display', serif",
                    color: '#B68D40',
                    letterSpacing: '-0.5px',
                  }}
                >
                  SECURITY EMAIL
                </h3>
                <a
                  href="mailto:security@klartravels.com"
                  className="text-[#1A1F4D] font-semibold hover:text-[#B68D40] transition-colors duration-300"
                  style={{
                    fontFamily: "'Outfit', sans-serif",
                    fontWeight: 600,
                    fontSize: '16px',
                  }}
                >
                  info.klarworld@gmail.com
                </a>
              </div>

              {/* Support Email */}
              <div
                className="p-6 rounded-lg text-center"
                style={{
                  border: '1px solid #EAE4DA',
                  backgroundColor: '#FFF8ED',
                }}
              >
                <h3
                  className="text-lg font-bold mb-3"
                  style={{
                    fontFamily: "'Playfair Display', serif",
                    color: '#B68D40',
                    letterSpacing: '-0.5px',
                  }}
                >
                  SUPPORT EMAIL
                </h3>
                <a
                  href="mailto:support@klartravels.com"
                  className="text-[#1A1F4D] font-semibold hover:text-[#B68D40] transition-colors duration-300"
                  style={{
                    fontFamily: "'Outfit', sans-serif",
                    fontWeight: 600,
                    fontSize: '16px',
                  }}
                >
                  info.klarworld@gmail.com
                </a>
              </div>

              {/* 24/7 Help Line */}
              <div
                className="p-6 rounded-lg text-center"
                style={{
                  border: '1px solid #EAE4DA',
                  backgroundColor: '#FFF8ED',
                }}
              >
                <h3
                  className="text-lg font-bold mb-3"
                  style={{
                    fontFamily: "'Playfair Display', serif",
                    color: '#B68D40',
                    letterSpacing: '-0.5px',
                  }}
                >
                  24/7 HELP LINE
                </h3>
                <a
                  href="tel:+91XXXXXXXXX"
                  className="text-[#1A1F4D] font-semibold hover:text-[#B68D40] transition-colors duration-300"
                  style={{
                    fontFamily: "'Outfit', sans-serif",
                    fontWeight: 600,
                    fontSize: '16px',
                  }}
                >
                  +91 8099359377
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <Footer/>
      </div>
    </>
  );
};

export default PaymentSecurity;
