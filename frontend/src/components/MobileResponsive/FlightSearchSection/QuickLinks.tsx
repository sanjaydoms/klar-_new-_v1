// components/QuickLinks.tsx
import React from 'react';
import { Clock, TrendingUp, DollarSign, Star } from 'lucide-react';

const QuickLinks: React.FC = () => {
  const quickOptions = [
    { icon: Clock, label: 'Best Deals', color: 'text-green-600' },
    { icon: TrendingUp, label: 'Trending', color: 'text-purple-600' },
    { icon: DollarSign, label: 'Cheapest', color: 'text-orange-600' },
    { icon: Star, label: 'Top Rated', color: 'text-yellow-600' },
  ];

  return (
    <div className="mb-6">
      <h2 className="text-xl font-bold text-black mb-3 text-center">Popular Flight Routes</h2>

      {/* Divider with Star in middle */}
      <div className="flex items-center gap-4 mb-4">
        <div className="flex-1 h-[2px] bg-[#D4AF37]"></div>
        <Star size={16} className="text-[#D4AF37] fill-[#D4AF37]" />
        <div className="flex-1 h-[2px] bg-[#D4AF37]"></div>
      </div>
    </div>
  );
};

export default QuickLinks;
