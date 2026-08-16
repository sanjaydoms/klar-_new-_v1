import Footer from '@/components/layout/Footer';
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const TermsAndConditions: React.FC = () => {
  const navigate = useNavigate();
  useEffect(() => {
    document.title = 'KLAR B2B - Terms & Conditions';
  }, []);

  const headerStyle: React.CSSProperties = {
    color: '#000',
    fontFamily: 'Outfit, sans-serif',
    fontSize: '21.333px',
    fontStyle: 'normal',
    fontWeight: 400,
    lineHeight: 'normal',
    letterSpacing: '-0.237px',
    marginBottom: '16px',
    marginTop: '24px',
  };

  const bodyStyle: React.CSSProperties = {
    color: '#000',
    fontFamily: 'Outfit, sans-serif',
    fontSize: '21.333px',
    fontStyle: 'normal',
    fontWeight: 400,
    lineHeight: '1.6',
    letterSpacing: '-0.237px',
    marginBottom: '12px',
  };

  const containerStyle: React.CSSProperties = {
    maxWidth: '1044.544px',
    margin: '0 auto',
    padding: '40px 20px',
    backgroundColor: '#fff',
  };

  const listStyle: React.CSSProperties = {
    color: '#000',
    marginBottom: '16px',
    paddingLeft: '24px',
  };

  return (
    <div className="bg-white min-h-screen">
      <div style={containerStyle}>
        <div className="flex justify-center mb-8 cursor-pointer" onClick={() => navigate('/')}>
          <img
            src="/images/logo.png"
            alt="Klar Travels"
            style={{ height: '60px', objectFit: 'contain' }}
          />
        </div>

        <h1
          style={{
            ...headerStyle,
            fontSize: '32px',
            textAlign: 'left',
            marginBottom: '40px',
            color: '#920002',
          }}
        >
          TERMS & CONDITIONS
        </h1>

        <div style={bodyStyle}>
          <p>
            Welcome to KLAR ("KLAR", "we", "our", "us"), a premium travel and lifestyle brand
            operated by DOMS GLOBAL LLP.
          </p>
          <p>
            These Terms govern access and use of KLAR's B2B travel booking platform, partner portal,
            APIs, and related services.
          </p>
          <p>By registering as a business user, you agree to these Terms.</p>

          <h2 style={headerStyle}>1.1 Eligibility</h2>
          <p>KLAR services are available only to:</p>
          <br />
          <ul style={listStyle}>
            <li>Registered travel agencies</li>
            <li>Corporate entities</li>
            <li>Tour operators</li>
            <li>Destination Management Companies (DMCs)</li>
            <li>Approved franchise partners</li>
          </ul>
          <p>Users must:</p>
          <br />
          <ul style={listStyle}>
            <li>Be legally authorized representatives of their organization</li>
            <li>Provide valid GST / tax registration details</li>
            <li>Maintain accurate business credentials</li>
          </ul>

          <h2 style={headerStyle}>1.2 Business Account Responsibility</h2>
          <br />
          <p>Each registered business is responsible for:</p>
          <br />
          <ul style={listStyle}>
            <li>Authorized employee access</li>
            <li>Login credential security</li>
            <li>Transactions made under their account</li>
            <li>Compliance with applicable laws</li>
          </ul>

          <h2 style={headerStyle}>1.3 Services Offered</h2>
          <br />
          <p>KLAR provides:</p>
          <ul style={listStyle}>
            <li>Flights</li>
            <li>Hotels</li>
            <li>Visa services</li>
            <li>Insurance</li>
            <li>Ground transport</li>
            <li>Holiday packages</li>
            <li>White-label/API integrations</li>
          </ul>
          <p>Availability depends on third-party suppliers.</p>

          <h2 style={headerStyle}>1.4 Pricing & Trade Confidentiality</h2>
          <br />
          <p>All negotiated B2B rates:</p>
          <ul style={listStyle}>
            <li>Are confidential</li>
            <li>Cannot be publicly disclosed</li>
            <li>Cannot be resold outside authorized channels</li>
          </ul>
          <p>Unauthorized rate exposure may lead to termination.</p>

          <h2 style={headerStyle}>1.5 Booking Confirmation</h2>
          <br />
          <p>All bookings remain subject to:</p>
          <ul style={listStyle}>
            <li>Supplier confirmation</li>
            <li>Availability</li>
            <li>Fare validity at booking time</li>
          </ul>
          <p>KLAR reserves right to cancel pricing errors.</p>

          <h2 style={headerStyle}>1.6 Payment Terms</h2>
          <br />
          <p>Payment modes:</p>
          <ul style={listStyle}>
            <li>Prepaid wallet</li>
            <li>Approved credit line</li>
            <li>Bank transfer</li>
            <li>Payment gateway</li>
          </ul>
          <p>Invoices must be settled within agreed credit cycle.</p>
          <br />
          <p>Late payments may result in:</p>
          <br />
          <ul style={listStyle}>
            <li>Interest charges</li>
            <li>Credit suspension</li>
            <li>Account freeze</li>
          </ul>
          <p>
            All invoices and tax documents shall be issued under:
            <br /> DOMS GLOBAL LLP operating under KLAR
          </p>

          <h2 style={headerStyle}>1.7 API & Certification Verification</h2>
          <br />
          <p>
            For API integrations, supplier onboarding, payment gateway approvals, and
            certifications, KLAR may use the legal registration documents of DOMS GLOBAL LLP.
          </p>

          <h2 style={headerStyle}>1.8 Cancellations & Amendments</h2>
          <br />
          <p>Changes are subject to:</p>
          <ul style={listStyle}>
            <li>Supplier policies</li>
            <li>Fare rules</li>
            <li>Service charges</li>
          </ul>
          <p>KLAR cannot guarantee modification approval.</p>

          <h2 style={headerStyle}>1.9 Limitation of Liability</h2>
          <br />
          <p>KLAR acts as intermediary and is not liable for:</p>
          <ul style={listStyle}>
            <li>Airline delays</li>
            <li>Hotel service deficiencies</li>
            <li>Visa rejection</li>
            <li>Supplier operational failures</li>
          </ul>
          <p>Liability limited to booking amount paid via KLAR.</p>

          <h2 style={headerStyle}>1.10 Suspension / Termination</h2>
          <br />
          <p>KLAR may suspend accounts for:</p>
          <ul style={listStyle}>
            <li>Fraudulent transactions</li>
            <li>Payment defaults</li>
            <li>Policy violations</li>
            <li>Misuse of confidential rates</li>
          </ul>

          <h2 style={headerStyle}>1.11 Governing Law</h2>
          <br />
          <p>Jurisdiction: Hyderabad, Telangana, India.</p>
          <br />

          <h2 style={{ fontSize: 30, color: '#920002' }}>2. PRIVACY POLICY</h2>
          <br />
          <p>KLAR collects:</p>
          <br />
          <ul style={listStyle}>
            <li>Company name</li>
            <li>GST details</li>
            <li>Billing addresses</li>
            <li>Authorized employee names</li>
            <li>Passport/travel documents</li>
            <li>Payment data</li>
          </ul>
          <p>Use of Data:</p>
          <br />
          <p>Used for:</p>
          <br />
          <ul style={listStyle}>
            <li>Booking fulfillment</li>
            <li>Billing & invoicing</li>
            <li>Fraud prevention</li>
            <li>Supplier coordination</li>
            <li>Compliance reporting</li>
          </ul>
          <p>Sharing:</p>
          <br />
          <p>Shared only with:</p>
          <br />
          <ul style={listStyle}>
            <li>Airlines</li>
            <li>Hotels</li>
            <li>Visa agencies</li>
            <li>Insurance partners</li>
            <li>Payment processors</li>
          </ul>
          <p>KLAR does not sell partner data.</p>
          <br />
          <p>Data Protection:</p>
          <br />
          <p>Protected through:</p>
          <br />
          <ul style={listStyle}>
            <li>SSL encryption</li>
            <li>Secure cloud storage</li>
            <li>Restricted employee access</li>
          </ul>
          <br />

          <h2 style={{ fontSize: 24, color: '#920002' }}>3. REFUND & CANCELLATION POLICY</h2>
          <br />
          <p>Refunds depend on:</p>
          <br />
          <ul style={listStyle}>
            <li>Airline fare rules</li>
            <li>Hotel policies</li>
            <li>Supplier conditions</li>
          </ul>
          <p>Refund Types:</p>
          <p>Flights:</p>
          <ul style={listStyle}>
            <li>Refundable fares: partial/full refund</li>
            <li>Non-refundable fares: may not qualify</li>
          </ul>
          <p>Hotels:</p>
          <ul style={listStyle}>
            <li>Free cancellation where applicable</li>
            <li>Non-refundable rates excluded</li>
          </ul>
          <p>Group Bookings:</p>
          <ul style={listStyle}>
            <li>Special cancellation slabs apply.</li>
          </ul>
          <p>Refund Timelines:</p>
          <ul style={listStyle}>
            <li>Wallet credit: 2–5 business days</li>
            <li>Bank transfer: 5–10 business days</li>
            <li>Credit card: 7–15 business days</li>
          </ul>
          <p>KLAR Fees:</p>
          <p>Service fees may be non-refundable.</p>
          <br />

          <h2 style={{ fontSize: 24, color: '#920002' }}>
            4. KLAR BUSINESS WALLET & CREDIT LINE POLICY
          </h2>
          <br />
          <p>Wallet Functions:</p>
          <br />
          <p>Businesses may:</p>
          <br />
          <ul style={listStyle}>
            <li>Add prepaid funds</li>
            <li>Receive refunds</li>
            <li>Use balance for bookings</li>
          </ul>
          <p>Credit Line:</p>
          <br />
          <p>Approved partners may receive:</p>
          <br />
          <ul style={listStyle}>
            <li>Monthly credit limits</li>
            <li>Invoice billing cycles</li>
            <li>Due date settlement terms</li>
          </ul>
          <p>Overdue Policy:</p>
          <br />
          <p>Failure to pay may cause:</p>
          <br />
          <ul style={listStyle}>
            <li>Credit freeze</li>
            <li>Penalties</li>
            <li>Account suspension</li>
          </ul>

          <h2 style={{ fontSize: 24, color: '#920002' }}>5. SUPPLIER / VENDOR TERMS</h2>
          <br />
          <p>Applicable to:</p>
          <ul style={listStyle}>
            <li>Hotels</li>
            <li>Airline consolidators</li>
            <li>Transport vendors</li>
            <li>Visa partners</li>
            <li>Insurance providers</li>
          </ul>
          <p>Suppliers Must:</p>
          <ul style={listStyle}>
            <li>Provide accurate inventory</li>
            <li>Honor contracted rates</li>
            <li>Maintain service quality</li>
            <li>Notify outages immediately</li>
          </ul>
          <p>Payment:</p>
          <p>Supplier settlements as per contract cycles.</p>
          <p>Non-Performance:</p>
          <p>Repeated violations may terminate supplier listing.</p>
          <br />

          <h2 style={{ fontSize: 24, color: '#920002' }}>6. SERVICE LEVEL AGREEMENT (SLA)</h2>
          <br />
          <p>KLAR commits to:</p>
          <p>Support Response:</p>
          <ul style={listStyle}>
            <li>Standard queries: within 4 business hours</li>
            <li>Urgent travel disruptions: within 30 minutes</li>
          </ul>
          <p>Booking Resolution:</p>
          <ul style={listStyle}>
            <li>Failed bookings reviewed within 24 hours.</li>
          </ul>
          <p>Refund Escalation:</p>
          <ul style={listStyle}>
            <li>Escalated unresolved refunds tracked within 72 hours.</li>
          </ul>
          <p>Exclusions:</p>
          <p>SLA excludes:</p>
          <ul style={listStyle}>
            <li>Airline disruptions</li>
            <li>Force majeure events</li>
            <li>Government travel restrictions</li>
          </ul>

          <h2 style={{ fontSize: 24, color: '#920002' }}>7. COOKIE POLICY</h2>
          <br />
          <p>KLAR uses cookies for:</p>
          <ul style={listStyle}>
            <li>Login sessions</li>
            <li>Booking continuity</li>
            <li>Analytics</li>
            <li>Personalization</li>
          </ul>
          <p>Users may disable cookies in browser settings.</p>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default TermsAndConditions;
