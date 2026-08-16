import React from 'react';
import { Menu, User, Search } from 'lucide-react';

const Header: React.FC = () => {
  return (
    <header className="flex justify-between items-center py-4 bg-transparent">
      <div className="flex items-center gap-3">
        <button className="p-1">
          <Menu size={24} className="text-gray-700" />
        </button>
        <div className="flex items-center gap-1">
          <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
            <span className="text-white font-bold text-sm">F</span>
          </div>
          <span className="font-semibold text-gray-800 text-lg">Flights</span>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <button className="p-1">
          <Search size={22} className="text-gray-700" />
        </button>
        <button className="p-1">
          <User size={22} className="text-gray-700" />
        </button>
      </div>
    </header>
  );
};

export default Header;
