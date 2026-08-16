import React from 'react';

const AgencyLogo: React.FC = () => {
  return (
    <div className="bg-white p-6 rounded-xl border border-gray-100 mb-6">
      <h3 className="text-lg font-bold text-gray-900 mb-6">Agency Logo</h3>

      <div className="flex gap-8">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Small Logo ⓘ</label>
          <div className="w-24 h-24 bg-gray-200 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center cursor-pointer hover:border-gray-400 transition-colors">
            <div className="w-full h-full bg-gray-200 rounded-lg"></div>
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Big Logo ⓘ</label>
          <div className="w-32 h-24 bg-gray-200 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center cursor-pointer hover:border-gray-400 transition-colors">
            <div className="w-full h-full bg-gray-200 rounded-lg"></div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AgencyLogo;
