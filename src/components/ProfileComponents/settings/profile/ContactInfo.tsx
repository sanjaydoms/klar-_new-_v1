import React from 'react';
import { Pencil, Building2, Plane, User, ShieldCheck } from 'lucide-react';

const ContactInfo: React.FC = () => {
  const contacts = [
    {
      type: 'Hotels',
      icon: Building2,
      number: '+91 9797944330',
      email: 'sales@globaltravels.com',
      color: 'text-blue-500',
      bg: 'bg-blue-50',
    },
    {
      type: 'Flights',
      icon: Plane,
      number: '+91 9797944330',
      email: 'sales@globaltravels.com',
      color: 'text-indigo-500',
      bg: 'bg-indigo-50',
    },
    {
      type: 'Holidays',
      icon: User,
      number: '+91 9797944330',
      email: 'sales@globaltravels.com',
      color: 'text-purple-500',
      bg: 'bg-purple-50',
    },
    {
      type: 'Insurance',
      icon: ShieldCheck,
      number: '+91 9797944330',
      email: 'sales@globaltravels.com',
      color: 'text-green-500',
      bg: 'bg-green-50',
    },
  ];

  return (
    <div className="bg-white p-6 rounded-xl border border-gray-100 mb-6">
      <div className="flex justify-between items-start mb-6">
        <div>
          <h3 className="text-lg font-bold text-gray-900">Contact Information</h3>
          <p className="text-sm text-gray-500 mt-1">
            You can add or edit contact details from your dashboard. These information will display
            on all physical order prints.
          </p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
          <Pencil size={14} />
          Edit
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {contacts.map((contact, index) => (
          <div key={index} className="flex gap-4">
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${contact.bg} ${contact.color}`}
            >
              <contact.icon size={18} />
            </div>
            <div>
              <h4 className="text-sm font-bold text-gray-900 mb-2">{contact.type}</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-1">
                <div>
                  <label className="text-[10px] uppercase font-bold text-gray-400">
                    Contact Number
                  </label>
                  <div className="text-sm font-medium text-gray-800">{contact.number}</div>
                </div>
                <div>
                  <label className="text-[10px] uppercase font-bold text-gray-400">Email ID</label>
                  <div className="text-sm font-medium text-gray-800">{contact.email}</div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ContactInfo;
