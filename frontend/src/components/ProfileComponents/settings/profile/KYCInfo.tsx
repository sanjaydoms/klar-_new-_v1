import React from 'react';
import { Download, FileText } from 'lucide-react';

const KYCInfo: React.FC = () => {
  const documents = [
    { name: 'Incorporation Certificate', type: 'Certificate' },
    { name: 'Incorporation Certificate', type: 'Certificate' },
    { name: 'Incorporation Certificate', type: 'Certificate' },
  ];

  return (
    <div className="bg-white p-6 rounded-xl border border-gray-100 mb-6">
      <div className="mb-6">
        <h3 className="text-lg font-bold text-gray-900">KYC Information</h3>
        <p className="text-sm text-gray-500 mt-1">
          Verify your KYC online. Contact your relationship if your KYC has not been verified.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {documents.map((doc, index) => (
          <div
            key={index}
            className="border border-gray-200 rounded-xl p-6 flex flex-col items-center justify-center text-center hover:shadow-md transition-shadow bg-gray-50/30"
          >
            <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center mb-3">
              <FileText size={20} />
            </div>
            <h4 className="text-sm font-semibold text-gray-900 mb-4">{doc.name}</h4>
            <button className="flex items-center gap-2 px-4 py-2 text-xs font-medium text-gray-700 bg-white border border-gray-200 rounded-md hover:bg-gray-50 transition-colors">
              <Download size={12} />
              Download
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default KYCInfo;
