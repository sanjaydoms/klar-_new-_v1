// components/Footer.tsx
import React from 'react';
import { Home, Plane, Calendar, User } from 'lucide-react';

const Footer: React.FC = () => {
  const navItems = [
    { icon: Home, label: 'Home', active: true },
    { icon: Plane, label: 'Flights', active: false },
    { icon: Calendar, label: 'Trips', active: false },
    { icon: User, label: 'Profile', active: false },
  ];

  return (
    <footer className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-6 py-2 max-w-md mx-auto">
      <div className="flex justify-between items-center">
        {navItems.map((item, index) => (
          <button
            key={index}
            className={`flex flex-col items-center gap-0.5 py-1 px-3 ${
              item.active ? 'text-blue-600' : 'text-gray-400'
            }`}
          >
            <item.icon size={22} strokeWidth={item.active ? 2.5 : 2} />
            <span className="text-[10px] font-medium">{item.label}</span>
          </button>
        ))}
      </div>
    </footer>
  );
};

export default Footer;
