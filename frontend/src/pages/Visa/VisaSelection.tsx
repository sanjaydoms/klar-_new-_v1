import { useNavigate } from 'react-router-dom';
import Footer from '@/components/layout/Footer';
import VisaContent from '../../features/visa/components/VisaContent';
import { ChevronRight } from 'lucide-react';

// ─── VisaSelection Component ──────────────────────────────────────────────────

const VisaSelection = () => {
  const navigate = useNavigate();

  // ─── DEBUG LOG ──────────────────────────────────────────────────────────────
  console.log('🔴🔴🔴 VisaSelection - Page is rendering!');
  console.log('🔴 Current URL:', window.location.pathname);
  console.log('🔴 Full URL:', window.location.href);

  return (
    <div className="min-h-screen bg-[#F7F8FA] font-sans">
      {/* Header */}
      <div className="w-full bg-[#1F2A6B] h-[72px] flex items-center shadow-sm">
        <div className="max-w-[1400px] mx-auto px-10 w-full">
          <h1 className="text-white font-semibold text-[19px]">Complete Visa Process Guide</h1>
        </div>
      </div>

      {/* Breadcrumb */}
      <div className="max-w-[1400px] mx-auto px-10 pt-5 pb-2">
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <button onClick={() => navigate('/')} className="hover:text-[#1F2A6B] transition-colors">
            Home
          </button>
          <ChevronRight size={14} className="text-gray-400" />
          <span className="font-semibold text-[#1F2A6B]">Visa</span>
        </div>
      </div>

      <main className="max-w-[1400px] mx-auto px-10 pb-24">
        <VisaContent />
      </main>

      <Footer />
    </div>
  );
};

export default VisaSelection;
