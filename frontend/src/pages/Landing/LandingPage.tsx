import { useNavigate } from 'react-router-dom';
import { ArrowRight, Globe, Shield, Clock } from 'lucide-react';
import PackagesHeader from '../../components/Packages/PackagesHeader';
import Footer from '@/components/layout/Footer';

const LandingPage = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-white font-sans flex flex-col">
      <PackagesHeader activeService="visa" />

      {/* Hero Section */}
      <header className="relative bg-[#1F2A6B] text-white overflow-hidden">
        <div className="absolute inset-0 bg-blue-900/20 z-0"></div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 relative z-10">
          <div className="text-center max-w-3xl mx-auto">
            <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-6">
              Travel the World with <span className="text-[#4F8AFF]">Klar3</span>
            </h1>
            <p className="text-xl text-blue-100 mb-10 leading-relaxed">
              Seamless visa processing, flight bookings, and travel management for the modern
              explorer. Experience the future of travel today.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button
                onClick={() => navigate('/visa')}
                className="bg-[#4F8AFF] hover:bg-[#3d73db] text-white px-8 py-4 rounded-lg font-bold text-lg transition-all flex items-center justify-center gap-2 shadow-lg hover:shadow-xl transform hover:-translate-y-1"
              >
                Apply for Visa
                <ArrowRight size={20} />
              </button>
              <button
                onClick={() => navigate('/b2b')}
                className="bg-white/10 hover:bg-white/20 text-white border border-white/30 backdrop-blur-sm px-8 py-4 rounded-lg font-bold text-lg transition-all"
              >
                Agent Login
              </button>
            </div>
          </div>
        </div>

        {/* Decorative Elements */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none opacity-30">
          <div className="absolute -top-24 -left-24 w-96 h-96 bg-blue-500 rounded-full blur-3xl mix-blend-multiply filter opacity-50"></div>
          <div className="absolute top-1/2 right-0 w-64 h-64 bg-purple-500 rounded-full blur-3xl mix-blend-multiply filter opacity-50"></div>
        </div>
      </header>

      {/* Features Section */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900">Why Choose Klar3?</h2>
            <p className="mt-4 text-gray-600 max-w-2xl mx-auto">
              We simplify the complex world of travel documentation and booking.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <FeatureCard
              icon={<Globe className="text-[#4F8AFF]" size={32} />}
              title="Global Coverage"
              description="Access visa requirements and flight options for over 150+ countries worldwide."
            />
            <FeatureCard
              icon={<Shield className="text-[#4F8AFF]" size={32} />}
              title="Secure Processing"
              description="Your data is encrypted and handled with the highest security standards."
            />
            <FeatureCard
              icon={<Clock className="text-[#4F8AFF]" size={32} />}
              title="Fast Turnaround"
              description="Optimized processes to get your visa approved in record time."
            />
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

const FeatureCard = ({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) => (
  <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
    <div className="w-14 h-14 bg-blue-50 rounded-lg flex items-center justify-center mb-6">
      {icon}
    </div>
    <h3 className="text-xl font-bold text-gray-900 mb-3">{title}</h3>
    <p className="text-gray-600 leading-relaxed">{description}</p>
  </div>
);

export default LandingPage;
