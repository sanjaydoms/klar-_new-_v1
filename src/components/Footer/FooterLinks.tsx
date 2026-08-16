import { useNavigate } from 'react-router-dom';
import { ROUTES } from '../../routes/routes.config';

const routeData = {
  domesticRoutes: [
    { from: 'Delhi', to: 'Chennai' },
    { from: 'Kolkata', to: 'Bangalore' },
    { from: 'Delhi', to: 'Hyderabad' },
    { from: 'Delhi', to: 'Ahmedabad' },
    { from: 'Kolkata', to: 'Bagdogra' },
    { from: 'Srinagar', to: 'Delhi' },
    { from: 'Hyderabad', to: 'Goa' },
    { from: 'Mumbai', to: 'Chennai' },
    { from: 'Ahmedabad', to: 'Mumbai' },
    { from: 'Delhi', to: 'Bagdogra' },
    { from: 'Goa', to: 'Delhi' },
    { from: 'Goa', to: 'Mumbai' },
    { from: 'Hyderabad', to: 'Bangalore' },
    { from: 'Mumbai', to: 'Hyderabad' },
    { from: 'Delhi', to: 'Leh' },
    { from: 'Pune', to: 'Bangalore' },
    { from: 'Kolkata', to: 'Goa' },
    { from: 'Bangalore', to: 'Pune' },
  ],
  internationalRoutes: [
    { from: 'Delhi', to: 'Dubai' },
    { from: 'Mumbai', to: 'Dubai' },
    { from: 'Ahmedabad', to: 'London' },
    { from: 'Delhi', to: 'Bali' },
    { from: 'Delhi', to: 'London' },
    { from: 'Delhi', to: 'Bangkok' },
    { from: 'Delhi', to: 'Kathmandu' },
    { from: 'Delhi', to: 'Singapore' },
    { from: 'Mumbai', to: 'London' },
    { from: 'Mumbai', to: 'Bali' },
    { from: 'Mumbai', to: 'Bangkok' },
    { from: 'Ahmedabad', to: 'Dubai' },
    { from: 'Bangalore', to: 'Dubai' },
    { from: 'Chennai', to: 'Dubai' },
    { from: 'Delhi', to: 'Phuket' },
  ],
  popularInternationalRoutes: [
    { from: 'Hyderabad', to: 'Dubai' },
    { from: 'Chennai', to: 'Singapore' },
    { from: 'Mumbai', to: 'Singapore' },
    { from: 'Delhi', to: 'Toronto' },
    { from: 'Bangalore', to: 'Bangkok' },
    { from: 'Delhi', to: 'New York' },
    { from: 'Bangalore', to: 'Bali' },
    { from: 'Bangalore', to: 'Singapore' },
    { from: 'Delhi', to: 'Hong Kong' },
    { from: 'Delhi', to: 'Maldives' },
    { from: 'Delhi', to: 'Paris' },
    { from: 'Dubai', to: 'Delhi' },
    { from: 'Kochi', to: 'Dubai' },
    { from: 'Delhi', to: 'Tokyo' },
    { from: 'Dubai', to: 'Mumbai' },
    { from: 'Mumbai', to: 'New York' },
    { from: 'Amritsar', to: 'Dubai' },
    { from: 'Chennai', to: 'Colombo' },
    { from: 'Mumbai', to: 'Tokyo' },
    { from: 'Delhi', to: 'Colombo' },
    { from: 'Mumbai', to: 'Colombo' },
    { from: 'Delhi', to: 'Seoul' },
  ],
  corporateTravel: [
    'Business Travel',
    'Corporate Travel',
    'Corporate Travel Management',
  ],
  importantLinks: [
    'Cheap Flights',
    'Domestic Airlines',
    'International Airlines',
    'Trip Ideas',
    'Popular Destinations',
    'Flight Status',
  ],
  aboutSite: [
    { label: 'About Us', path: ROUTES.ABOUT_US },
    { label: 'Customer Support', path: ROUTES.CUSTOMER_SUPPORT },
    { label: 'Payment Security', path: ROUTES.PAYMENT_SECURITY },
    { label: 'Privacy Policy', path: ROUTES.PRIVACY_POLICY },
    { label: 'Cookie Policy', path: ROUTES.COOKIE_POLICY },
    { label: 'Terms of Service', path: ROUTES.TERMS_AND_CONDITIONS },
    { label: 'Contact Us', path: ROUTES.CONTACT_US },
  ],
  klarTravels: [
    { label: 'About Us', path: ROUTES.ABOUT_US },
    { label: 'Customer Support', path: ROUTES.CUSTOMER_SUPPORT },
    { label: 'Contact Us', path: ROUTES.CONTACT_US },
    { label: 'Payment Security', path: ROUTES.PAYMENT_SECURITY },
    { label: 'Privacy Policy', path: ROUTES.PRIVACY_POLICY },
    { label: 'Cookie Policy', path: ROUTES.COOKIE_POLICY },
    { label: 'Terms of Service', path: ROUTES.TERMS_AND_CONDITIONS },
    { label: 'Escalation Channel', path: ROUTES.ESCALATION },
    { label: 'Report Security Issues', path: ROUTES.REPORT_SECURITY },
  ],
};

const clearSessionStorage = () => {
  const keysToKeep = ['footerRouteData'];
  const allKeys = Object.keys(sessionStorage);
  allKeys.forEach(key => {
    if (!keysToKeep.includes(key)) {
      sessionStorage.removeItem(key);
    }
  });
};

const RouteLink = ({ from, to }: { from: string; to: string }) => {
  const navigate = useNavigate();

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    clearSessionStorage();
    navigate('/flights/oneway', { 
      state: { 
        from, 
        to,
        tripType: 'oneway'
      } 
    });
  };

  return (
    <span
      onClick={handleClick}
      className="cursor-pointer text-gray-600 hover:text-[#272E7C] hover:underline underline-offset-2 decoration-2 transition-all duration-200"
    >
      {from} to {to} flight
    </span>
  );
};

const FooterLink = ({ href, text }: { href?: string; text: string }) => {
  const navigate = useNavigate();

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (href) {
      navigate(href);
    }
  };

  return (
    <a href={href || '#'} onClick={handleClick} className="hover:text-blue-600">
      {text}
    </a>
  );
};

const FooterSection = ({
  title,
  children
}: {
  title: string;
  children: React.ReactNode;
}) => {
  return (
    <div>
      <h3 style={{fontFamily:"Raleway"}} className="font-semibold text-[16px] uppercase tracking-wide text-black mb-1.5">
        {title}
      </h3>
<div style={{fontFamily:"Lato"}} className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-x-6 sm:gap-x-8 lg:gap-x-10 gap-y-3 text-[13px] [&_a]:transition-colors [&_a]:duration-200 [&_a:hover]:text-blue-600 [&_span]:transition-colors [&_span]:duration-200 [&_span:hover]:text-blue-600">        {children}
      </div>
    </div>
  );
};

const FooterLinks = () => {
  return (
    <>
    <div className="border-b border-gray-200 bg-white">
      <div className="w-full px-4 sm:px-6 lg:px-12 py-6 text-[12px] text-gray-600">
        <div className="space-y-6">
          <FooterSection title="KLAR TRAVELS">
            {routeData.klarTravels.map((item) => (
              <FooterLink key={item.label} href={item.path} text={item.label} />
            ))}
          </FooterSection>

            <FooterSection title="POPULAR DOMESTIC ROUTES">
              {routeData.domesticRoutes.map((route, index) => (
                <RouteLink key={index} from={route.from} to={route.to} />
              ))}
            </FooterSection>

            <FooterSection title="INTERNATIONAL ROUTES">
              {routeData.internationalRoutes.map((route, index) => (
                <RouteLink key={index} from={route.from} to={route.to} />
              ))}
            </FooterSection>

            <FooterSection title="POPULAR INTERNATIONAL ROUTES">
              {routeData.popularInternationalRoutes.map((route, index) => (
                <RouteLink key={index} from={route.from} to={route.to} />
              ))}
            </FooterSection>

          <FooterSection title="ABOUT THE SITE">
            {routeData.aboutSite.map((item) => (
              <FooterLink key={item.label} href={item.path} text={item.label} />
            ))}
          </FooterSection>

            <FooterSection title="IMPORTANT LINKS">
              {routeData.importantLinks.map((text) => (
                <FooterLink key={text} text={text} />
              ))}
            </FooterSection>

            <FooterSection title="CORPORATE TRAVEL">
              {routeData.corporateTravel.map((text) => (
                <span key={text} className="cursor-not-allowed text-gray-500" title="Coming Soon">
                  {text}
                </span>
              ))}
            </FooterSection>
          </div>
        </div>
      </div>
    </>
  );
};

export default FooterLinks;