import React from 'react';
import { Pencil } from 'lucide-react';

const BasicInfo: React.FC = () => {
  return (
    <div className="bg-white p-6 rounded-xl border border-gray-100 mb-6">
      <div className="flex justify-between items-start mb-6">
        <div>
          <h3 className="text-lg font-bold text-gray-900">Basic Information</h3>
          <p className="text-sm text-gray-500 mt-1">
            Your basic organization and legal address information. This information is important for
            all types of transactions.
          </p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
          <Pencil size={14} />
          Edit
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-y-6 gap-x-12">
        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
            Agency Name:
          </label>
          <div className="text-sm font-medium text-gray-900">Demo 2325</div>
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
            Alias Name:
          </label>
          <div className="text-sm font-medium text-gray-900">Demo 2325</div>
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
            Mobile Number:
          </label>
          <div className="text-sm font-medium text-gray-900">9697944330</div>
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
            Email:
          </label>
          <div className="text-sm font-medium text-gray-900">sales@demo.holiday.com</div>
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
            Contact Person Name:
          </label>
          <div className="text-sm font-medium text-gray-900">Demo</div>
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
            PAN Card No.:
          </label>
          <div className="text-sm font-medium text-gray-900">ABCDE1234F</div>
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
            Signup Date:
          </label>
          <div className="text-sm font-medium text-gray-900">18-07-2024</div>
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
            Base Currency:
          </label>
          <div className="text-sm font-medium text-gray-900">INR</div>
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
            Website URL:
          </label>
          <div className="text-sm font-medium text-gray-900">--</div>
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
            Address:
          </label>
          <div className="text-sm font-medium text-gray-900">Mohali</div>
        </div>
      </div>
    </div>
  );
};

export default BasicInfo;
