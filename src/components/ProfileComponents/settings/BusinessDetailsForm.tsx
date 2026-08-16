import React from 'react';

const BusinessDetailsForm: React.FC = () => {
  return (
    <div className="bg-white p-8 rounded-2xl border border-gray-100 shadow-sm animate-in fade-in slide-in-from-bottom-4 duration-500">
      <h2 className="text-xl font-bold text-gray-900 mb-8">Business Details Settings</h2>

      <div className="grid grid-cols-1 gap-6 mb-8">
        <div className="space-y-2">
          <label className="text-sm font-bold text-gray-700">Company Name</label>
          <input
            type="text"
            defaultValue="TravelCo India Pvt Ltd"
            className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-black/5 transition-all text-gray-800"
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-bold text-gray-700">GSTIN</label>
          <input
            type="text"
            defaultValue="27ABCDE1234F1Z5"
            className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-black/5 transition-all text-gray-800"
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-bold text-gray-700">Registered Address</label>
          <textarea
            rows={3}
            placeholder="Enter registered address"
            className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-black/5 transition-all text-gray-800 resize-none"
          ></textarea>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-bold text-gray-700">Website URL</label>
          <input
            type="url"
            defaultValue="https://travelco.in"
            className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-black/5 transition-all text-gray-800"
          />
        </div>
      </div>

      <div className="flex justify-end items-center gap-4 pt-4 border-t border-gray-50">
        <button className="px-6 py-2.5 text-gray-500 font-medium hover:text-gray-700 transition-colors">
          Cancel
        </button>
        <button className="px-6 py-2.5 bg-[#FF5A5F] text-white font-bold rounded-lg hover:bg-[#ff4046] transition-colors shadow-lg shadow-red-500/20">
          Save Changes
        </button>
      </div>
    </div>
  );
};

export default BusinessDetailsForm;
