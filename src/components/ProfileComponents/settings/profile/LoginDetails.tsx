import React from 'react';

const LoginDetails: React.FC = () => {
  return (
    <div className="bg-white p-6 rounded-xl border border-gray-100 mb-6">
      <h3 className="text-lg font-bold text-gray-900 mb-1">Login Details</h3>
      <p className="text-sm text-gray-500 mb-6">Manage your account login credentials.</p>

      <div className="space-y-6">
        <div className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
          <div>
            <span className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
              Mobile Number
            </span>
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-900">8146194430</span>
              <span className="px-2 py-0.5 bg-green-100 text-green-700 text-[10px] font-bold rounded-full">
                Verified
              </span>
            </div>
          </div>
          <button className="text-xs font-semibold text-blue-600 hover:text-blue-800">
            Change Number?
          </button>
        </div>

        <div className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
          <div>
            <span className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
              Email
            </span>
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-900">sales@ghlholiday.com</span>
              <span className="px-2 py-0.5 bg-green-100 text-green-700 text-[10px] font-bold rounded-full">
                Verified
              </span>
            </div>
          </div>
          <button className="text-xs font-semibold text-blue-600 hover:text-blue-800">
            Change Email?
          </button>
        </div>

        <div className="flex items-center justify-between py-2">
          <div>
            <span className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
              Password
            </span>
            <div className="text-sm font-medium text-gray-900">•••••••••••••</div>
          </div>
          <button className="text-xs font-semibold text-blue-600 hover:text-blue-800">
            Change Password?
          </button>
        </div>
      </div>
    </div>
  );
};

export default LoginDetails;
