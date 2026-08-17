import React from 'react';
import { Plus } from 'lucide-react';

const BankDetails: React.FC = () => {
  return (
    <div className="bg-white p-6 rounded-xl border border-gray-100 mb-6">
      <div className="flex justify-between items-center mb-4">
        <div>
          <h3 className="text-lg font-bold text-gray-900">Bank Details</h3>
          <p className="text-sm text-gray-500 mt-1">
            Provide your bank details to enable offline transactions with your wallet balance.
          </p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-[#1a2b4b] rounded-lg hover:bg-[#1a2b4b]/90 transition-colors">
          <Plus size={16} />
          Add
        </button>
      </div>

      <div className="text-center py-8 bg-gray-50 rounded-lg border border-dashed border-gray-200">
        <p className="text-sm text-gray-500">No bank details added yet.</p>
      </div>
    </div>
  );
};

export default BankDetails;
