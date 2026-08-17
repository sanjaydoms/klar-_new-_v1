import { Mail } from 'lucide-react';
import { ContactDetailsType } from '@/types/beforeBooking.type';

interface ContactDetailsSectionProps {
  contactDetails: ContactDetailsType;
}

export default function ContactDetailsSection({ contactDetails }: ContactDetailsSectionProps) {
  return (
    <div className="bg-white rounded-lg shadow-lg overflow-hidden border border-gray-200 mb-6">
      <div className="p-5">
        <div className="flex items-center gap-2 mb-4">
          <Mail className="w-5 h-5 text-blue-600" />
          <h2 className="text-lg font-semibold text-gray-900">Contact Details</h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-gray-500">Email</p>
            <p className="text-sm font-medium">{contactDetails.email || 'N/A'}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Phone</p>
            <p className="text-sm font-medium">{contactDetails.phone || 'N/A'}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
