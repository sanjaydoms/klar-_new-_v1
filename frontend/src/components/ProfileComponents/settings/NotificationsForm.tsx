import React, { useState } from 'react';

const NotificationsForm: React.FC = () => {
  const [emailAlerts, setEmailAlerts] = useState(true);
  const [smsAlerts, setSmsAlerts] = useState(true);
  const [whatsappUpdates, setWhatsappUpdates] = useState(false);
  const [promotionalOffers, setPromotionalOffers] = useState(false);

  const ToggleSwitch = ({
    checked,
    onChange,
  }: {
    checked: boolean;
    onChange: (checked: boolean) => void;
  }) => (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${checked ? 'bg-[#FF5A5F]' : 'bg-gray-200'}`}
    >
      <span className="sr-only">Use setting</span>
      <span
        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${checked ? 'translate-x-5' : 'translate-x-0'}`}
      />
    </button>
  );

  return (
    <div className="bg-white p-8 rounded-2xl border border-gray-100 shadow-sm animate-in fade-in slide-in-from-bottom-4 duration-500">
      <h2 className="text-xl font-bold text-gray-900 mb-8">Notifications Settings</h2>

      <div className="space-y-6 mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-sm font-bold text-gray-900">Email Alerts</h4>
            <p className="text-xs text-gray-500 mt-1">Receive booking confirmations & invoices</p>
          </div>
          <ToggleSwitch checked={emailAlerts} onChange={setEmailAlerts} />
        </div>

        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-sm font-bold text-gray-900">SMS Alerts</h4>
            <p className="text-xs text-gray-500 mt-1">Get important updates on your phone</p>
          </div>
          <ToggleSwitch checked={smsAlerts} onChange={setSmsAlerts} />
        </div>

        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-sm font-bold text-gray-900">WhatsApp Updates</h4>
            <p className="text-xs text-gray-500 mt-1">Tickets and support via WhatsApp</p>
          </div>
          <ToggleSwitch checked={whatsappUpdates} onChange={setWhatsappUpdates} />
        </div>

        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-sm font-bold text-gray-900">Promotional Offers</h4>
            <p className="text-xs text-gray-500 mt-1">Deals, discounts and marketing updates</p>
          </div>
          <ToggleSwitch checked={promotionalOffers} onChange={setPromotionalOffers} />
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

export default NotificationsForm;
