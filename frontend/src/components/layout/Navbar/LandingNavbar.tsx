import { useNavigate } from 'react-router-dom';

interface LandingNavbarProps {
  onLogout?: () => void;
}

const LandingNavbar: React.FC<LandingNavbarProps> = () => {
  const navigate = useNavigate();

  return (
    <nav className="absolute top-0 left-0 right-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-20">
          <div className="flex items-center cursor-pointer" onClick={() => navigate('/')}>
            <img src="/images/logo.png" alt="Klar Travels" className="h-12 w-auto object-contain" />
          </div>

          <div className="hidden md:flex items-center space-x-8">
            {['Flights', 'Hotels', 'Packages', 'Visa', 'Insurance'].map((item) => (
              <button
                key={item}
                className="text-white/90 hover:text-white font-medium transition-colors text-sm uppercase tracking-wide"
              >
                {item}
              </button>
            ))}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default LandingNavbar;
