import React from 'react';
import { MessageSquare, Key } from 'lucide-react';

const TwoFactorAuth: React.FC = () => {
  return (
    <div className="bg-white p-6 rounded-xl border border-gray-100 mb-6">
      <h3 className="text-lg font-bold text-gray-900 mb-2">Two-Factor Authentication</h3>
      <p className="text-sm text-gray-500 mb-6">
        Protect your account with an extra layer of security. Once configured you'll be required to
        enter both your password and an authentication code from your mobile phone in order to sign
        in.
      </p>

      <div className="space-y-4">
        <div className="flex items-center justify-between p-4 border border-gray-100 rounded-lg hover:bg-gray-50 transition-colors">
          <div className="flex items-start gap-4">
            <div className="p-2 bg-gray-100 rounded-full">
              <Key size={20} className="text-gray-600" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-gray-900">Authenticator App</h4>
              <p className="text-xs text-gray-500 mt-1 max-w-md">
                Use an authentication app (e.g. Google Authenticator) to generate time-based
                verification codes.
              </p>
            </div>
          </div>
          <button className="px-4 py-1.5 text-xs font-semibold text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors">
            Enable
          </button>
        </div>

        <div className="flex items-center justify-between p-4 border border-gray-100 rounded-lg hover:bg-gray-50 transition-colors">
          <div className="flex items-start gap-4">
            <div className="p-2 bg-gray-100 rounded-full">
              <MessageSquare size={20} className="text-gray-600" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-gray-900">SMS / Text Message</h4>
              <p className="text-xs text-gray-500 mt-1 max-w-md">
                Use your mobile phone to receive security codes via SMS.
              </p>
            </div>
          </div>
          <button className="px-4 py-1.5 text-xs font-semibold text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors">
            Enable
          </button>
        </div>
      </div>
    </div>
  );
};

export default TwoFactorAuth;
