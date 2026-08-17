import React, { useState } from 'react';
import { FileText, Contact, Calendar, Info } from 'lucide-react';

interface DocumentCategory {
  id: string;
  title: string;
  count: number;
  icon: React.ElementType;
  items: string[];
}

export const PassportDocumentsRequired: React.FC = () => {
  const [activeTabId, setActiveTabId] = useState<string>('address');

  const categories: DocumentCategory[] = [
    {
      id: 'address',
      title: 'Address Proof',
      count: 11,
      icon: FileText,
      items: [
        'Aadhaar Card',
        'Bank Passbook',
        'Electricity Bill',
        'Water Bill',
        'Gas Connection Bill',
        'Telephone Bill',
        'Rental Agreement',
        'Income Tax Assessment',
        'Employer Certificate',
        'Spouse Passport',
        'Parent Passport (for minors)',
      ],
    },
    {
      id: 'identity',
      title: 'Identity Proof',
      count: 4,
      icon: Contact,
      items: ['Aadhaar', 'PAN Card', 'Voter ID', 'Driving Licence'],
    },
    {
      id: 'dob',
      title: 'Date of Birth Proof',
      count: 5,
      icon: Calendar,
      items: [
        'Birth Certificate',
        'SSC Certificate',
        'PAN',
        'Aadhaar',
        'Driving Licence',
      ],
    },
  ];

  const activeCategory =
    categories.find((cat) => cat.id === activeTabId) || categories[0];
  const ActiveIcon = activeCategory.icon;

  return (
    <div className="w-full bg-white text-slate-800 font-sans py-6 md:py-12">
      {/* 1. Header Section */}
      <div className="flex flex-col gap-2 mb-8 md:mb-10">
        <div className="flex items-center space-x-2">
          <span className="w-6 h-[2px] bg-amber-400 rounded-full inline-block"></span>
          <span className="text-xs sm:text-sm font-bold text-[#5A0C1A] uppercase tracking-wider">
            Documents required
          </span>
        </div>

        <h2 className="text-2xl sm:text-3xl md:text-4xl font-serif font-bold text-slate-900 tracking-tight">
          Keep these ready before you apply
        </h2>

        <p className="text-xs sm:text-sm text-slate-500 leading-relaxed max-w-2xl">
          You need one valid document from each category. Our team confirms which
          combination works best for your case.
        </p>
      </div>

      {/* 2. Main Responsive Grid Layout */}
      <div className="flex flex-col lg:flex-row items-start gap-6 lg:gap-8">
        
        {/* Left Sidebar / Top Filter Bar (Responsive) */}
        <div className="w-full lg:w-80 flex flex-col gap-4 shrink-0">
          
          {/* Tabs Container */}
          <div className="flex lg:flex-col overflow-x-auto lg:overflow-x-visible gap-2.5 pb-2 lg:pb-0 scrollbar-none">
            {categories.map((cat) => {
              const Icon = cat.icon;
              const isActive = cat.id === activeTabId;

              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setActiveTabId(cat.id)}
                  className={`flex items-center justify-between gap-3 px-4 py-3.5 rounded-2xl text-xs sm:text-sm font-semibold transition-all duration-200 cursor-pointer whitespace-nowrap shrink-0 lg:shrink ${
                    isActive
                      ? 'bg-[#5A0C1A] text-white shadow-md'
                      : 'bg-white border border-slate-100 hover:border-slate-300 text-slate-700 shadow-2xs'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-600'}`} />
                    <span>{cat.title}</span>
                  </div>
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                      isActive ? 'bg-white/20 text-white' : 'text-sky-600'
                    }`}
                  >
                    {cat.count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Info Alert Box */}
          <div className="bg-sky-50/60 border border-sky-100 rounded-2xl p-4 flex items-start gap-3 mt-1">
            <Info className="w-4 h-4 text-sky-600 shrink-0 mt-0.5" />
            <p className="text-xs text-sky-800 leading-relaxed font-medium">
              Originals must be carried to the Passport Seva Kendra along with self-attested photocopies.
            </p>
          </div>
        </div>

        {/* Right Active Category Items Display Card */}
        <div className="flex-1 w-full bg-white border border-slate-100 rounded-3xl p-6 sm:p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
          
          {/* Card Header */}
          <div className="flex items-center gap-3.5 mb-6 pb-4 border-b border-slate-100">
            <div className="w-10 h-10 rounded-xl bg-sky-50 text-sky-700 flex items-center justify-center shrink-0">
              <ActiveIcon className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg sm:text-xl font-serif font-bold text-slate-900">
                {activeCategory.title}
              </h3>
              <p className="text-xs text-sky-600 font-medium">Any one of the following</p>
            </div>
          </div>

          {/* Document Items List */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {activeCategory.items.map((item, idx) => (
              <div
                key={idx}
                className="bg-slate-50/60 border border-slate-100 rounded-xl px-4 py-3 flex items-center gap-2.5 text-xs sm:text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-amber-600 shrink-0"></span>
                <span>{item}</span>
              </div>
            ))}
          </div>

        </div>

      </div>
    </div>
  );
};

export default PassportDocumentsRequired;