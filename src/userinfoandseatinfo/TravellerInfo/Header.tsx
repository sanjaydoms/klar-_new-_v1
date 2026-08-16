import { Plane, Hotel, FileText, Shield, User } from 'lucide-react';
import Logo from '../../../public/logo/klarLogo.png';

interface HeaderProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  navigate: (path: string) => void;
}

export default function Header({ activeTab, navigate }: HeaderProps) {
  const tabs = [
    { id: 'flights', label: 'Flights', icon: Plane },
    { id: 'hotels', label: 'Hotels', icon: Hotel },
    { id: 'visa', label: 'Visa', icon: FileText },
    { id: 'insurance', label: 'Insurance', icon: Shield },
  ];

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-card">
      <div className="max-w-7xl mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4 lg:gap-60 w-full overflow-hidden">
            <div
              onClick={() => navigate('/')}
              className="cursor-pointer hover:opacity-80 transition-opacity flex-shrink-0"
            >
              <img src={Logo} alt="Klar Logo" className="h-12 w-auto" />
            </div>
            <div className="bg-gray-100 rounded-full p-1 overflow-x-auto hide-scrollbar">
              <nav className="flex gap-1 min-w-max">
                {tabs.map((tab) => {
                  const Icon = tab.icon;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => navigate('/')}
                      className={`flex items-center gap-2 px-4 py-2 rounded-full transition-all duration-200 ${
                        activeTab === tab.id
                          ? 'bg-white text-blue-600 shadow-sm'
                          : 'text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      <span className="text-sm font-medium">{tab.label}</span>
                    </button>
                  );
                })}
              </nav>
            </div>
          </div>
          <button
            onClick={() => navigate('/')}
            className="w-10 h-10 rounded-full bg-gray-800 flex items-center justify-center hover:bg-gray-700 transition-colors"
          >
            <User className="w-5 h-5 text-white" />
          </button>
        </div>
      </div>
    </header>
  );
}
