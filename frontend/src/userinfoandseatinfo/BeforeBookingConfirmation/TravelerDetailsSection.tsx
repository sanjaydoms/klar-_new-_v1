import { User } from 'lucide-react';
import { TravelerType } from '@/types/beforeBooking.type';

interface TravelerDetailsSectionProps {
  travelerDetails: TravelerType[];
  travelerCount: number;
}

export default function TravelerDetailsSection({
  travelerDetails,
  travelerCount,
}: TravelerDetailsSectionProps) {
  const getTravelerTypeLabel = (type: string) => {
    if (type === 'ADULT' || type === 'adult') return 'Adult';
    if (type === 'CHILD' || type === 'child') return 'Child';
    if (type === 'INFANT' || type === 'infant') return 'Infant';
    return type;
  };

  return (
    <div className="bg-white rounded-lg shadow-lg overflow-hidden border border-gray-200 mb-6">
      <div className="p-5">
        <div className="flex items-center gap-2 mb-4">
          <User className="w-5 h-5 text-blue-600" />
          <h2 className="text-lg font-semibold text-gray-900">
            Traveler Details
            {travelerCount > 0 && (
              <span className="ml-2 text-sm font-normal text-gray-500">
                ({travelerCount} traveler{travelerCount > 1 ? 's' : ''})
              </span>
            )}
          </h2>
        </div>

        {travelerDetails.length > 0 ? (
          <div className="space-y-4">
            {travelerDetails.map((traveler, index) => (
              <div key={index} className="border-b border-gray-100 last:border-0 pb-4 last:pb-0">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  <div>
                    <p className="text-xs text-gray-500">Type</p>
                    <p className="text-sm font-medium">{getTravelerTypeLabel(traveler.type)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Name</p>
                    <p className="text-sm font-medium">
                      {traveler.title} {traveler.firstName} {traveler.lastName}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Date of Birth</p>
                    <p className="text-sm font-medium">
                      {traveler.dob || traveler.dateOfBirth || 'N/A'}
                    </p>
                  </div>
                  {traveler.passportNumber && (
                    <>
                      <div>
                        <p className="text-xs text-gray-500">Passport</p>
                        <p className="text-sm font-medium">{traveler.passportNumber}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Nationality</p>
                        <p className="text-sm font-medium">
                          {traveler.passportNationality || 'IN'}
                        </p>
                      </div>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500 text-sm">No traveler details available</p>
        )}
      </div>
    </div>
  );
}
