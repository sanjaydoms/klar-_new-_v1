// components/GuestInformation.tsx
import React from 'react';
import { User, Mail, Phone, Badge, Users } from 'lucide-react';

interface GuestInformationProps {
  guest: {
    name: string;
    email: string;
    phone: string;
    employeeId: string;
  };
  additionalGuests?: Array<{
    name: string;
    email: string;
    phone: string;
    employeeId?: string;
  }>;
}

export default function GuestInformation({ guest, additionalGuests = [] }: GuestInformationProps) {
  const allGuests = [guest, ...additionalGuests];

  return (
    <div className="border-b border-gray-200 pb-6">
      <div className="flex items-center gap-2 mb-4">
        <Users className="w-5 h-5 text-blue-600" />
        <h2 className="text-lg font-semibold text-gray-700">
          Guest Information {allGuests.length > 1 && `(${allGuests.length} Guests)`}
        </h2>
      </div>

      <div className="space-y-4">
        {allGuests.map((guestItem, index) => (
          <div
            key={index}
            className={`rounded-xl p-4 ${index > 0 ? 'border-t border-gray-200 pt-4' : ''}`}
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="bg-blue-100 p-2 rounded-full">
                <User className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500">
                  {index === 0 ? 'Primary Guest' : `Guest ${index + 1}`}
                </p>
                <p className="font-semibold text-gray-800">{guestItem.name}</p>
              </div>
            </div>

            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-gray-400 flex-shrink-0" />
                <span className="text-gray-600">{guestItem.email}</span>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-gray-400 flex-shrink-0" />
                <span className="text-gray-600">{guestItem.phone}</span>
              </div>
              {/* {guestItem.employeeId && (
                <div className="flex items-center gap-2">
                  <Badge className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  <span className="text-gray-600">Employee ID: {guestItem.employeeId}</span>
                </div>
              )} */}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
