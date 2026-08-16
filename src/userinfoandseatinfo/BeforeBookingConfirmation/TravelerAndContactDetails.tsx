import React from 'react';
import { User, Mail, Phone } from 'lucide-react';
import { TravelerType, ContactDetailsType } from '@/types/beforeBooking.type';

interface TravelerAndContactDetailsProps {
  travelerDetails: TravelerType[] | any;
  travelerCount: number;
  contactDetails: ContactDetailsType | null;
  gstInfo?: any;
  emergencyContact?: any;
  allTravellerDetails?: any;
}

export default function TravelerAndContactDetails({
  travelerDetails,
  travelerCount,
  contactDetails,
  gstInfo,
  emergencyContact,
  allTravellerDetails,
}: TravelerAndContactDetailsProps) {
  const getTravelerTypeLabel = (type: string) => {
    if (!type) return 'Adult';
    const typeLower = type.toLowerCase();
    if (typeLower === 'adult' || typeLower === 'adults') return 'Adult';
    if (typeLower === 'child' || typeLower === 'children') return 'Child';
    if (typeLower === 'infant' || typeLower === 'infants') return 'Infant';
    return type;
  };

  // Get traveler details array safely
  const getTravelersArray = () => {
    if (!travelerDetails) return [];

    // If it's already an array
    if (Array.isArray(travelerDetails)) {
      return travelerDetails;
    }

    // If it's an object with travelers property
    if (travelerDetails.travelers && Array.isArray(travelerDetails.travelers)) {
      return travelerDetails.travelers;
    }

    // If it's an object with passengers property
    if (travelerDetails.passengers && Array.isArray(travelerDetails.passengers)) {
      return travelerDetails.passengers;
    }

    // If it's an object with adult/child counts, create array from them
    const adults = parseInt(travelerDetails.adults) || 0;
    const children = parseInt(travelerDetails.children) || 0;
    const infants = parseInt(travelerDetails.infants) || 0;

    if (adults > 0 || children > 0 || infants > 0) {
      const travelers = [];
      for (let i = 0; i < adults; i++) {
        travelers.push({
          type: 'ADULT',
          title: travelerDetails[`adultsTitle${i + 1}`] || 'Mr',
          firstName: travelerDetails[`adultsFirstName${i + 1}`] || '',
          lastName: travelerDetails[`adultsLastName${i + 1}`] || '',
          dateOfBirth: travelerDetails[`adultsDob${i + 1}`] || '',
          passportNumber: travelerDetails[`adultsPnum${i + 1}`] || '',
          passportNationality: travelerDetails[`adultsNationality${i + 1}`] || 'IN',
        });
      }
      for (let i = 0; i < children; i++) {
        travelers.push({
          type: 'CHILD',
          title: travelerDetails[`childrenTitle${i + 1}`] || 'Master',
          firstName: travelerDetails[`childrenFirstName${i + 1}`] || '',
          lastName: travelerDetails[`childrenLastName${i + 1}`] || '',
          dateOfBirth: travelerDetails[`childrenDob${i + 1}`] || '',
          passportNumber: travelerDetails[`childrenPnum${i + 1}`] || '',
          passportNationality: travelerDetails[`childrenNationality${i + 1}`] || 'IN',
        });
      }
      for (let i = 0; i < infants; i++) {
        travelers.push({
          type: 'INFANT',
          title: travelerDetails[`infantsTitle${i + 1}`] || 'Master',
          firstName: travelerDetails[`infantsFirstName${i + 1}`] || '',
          lastName: travelerDetails[`infantsLastName${i + 1}`] || '',
          dateOfBirth: travelerDetails[`infantsDob${i + 1}`] || '',
          passportNumber: travelerDetails[`infantsPnum${i + 1}`] || '',
          passportNationality: travelerDetails[`infantsNationality${i + 1}`] || 'IN',
        });
      }
      return travelers;
    }

    return [];
  };

  const travelersList = getTravelersArray();

  return (
    <div className="bg-white rounded-lg shadow-lg overflow-hidden border border-gray-200 mb-6">
      <div className="p-5">
        <div className="flex items-center gap-2 mb-4">
          <User className="w-5 h-5 text-blue-600" />
          <h2 className="text-lg font-semibold text-gray-900">
            Traveler & Contact Details
            {travelerCount > 0 && (
              <span className="ml-2 text-sm font-normal text-gray-500">
                ({travelerCount} traveler{travelerCount > 1 ? 's' : ''})
              </span>
            )}
          </h2>
        </div>

        {/* Traveler Details */}
        {travelersList.length > 0 ? (
          <div className="space-y-4">
            {travelersList.map((traveler: any, index: number) => (
              <div key={index} className="border-b border-gray-100 last:border-0 pb-4 last:pb-0">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  <div>
                    <p className="text-xs text-gray-500">Type</p>
                    <p className="text-sm font-medium">
                      {getTravelerTypeLabel(traveler.type || traveler.paxType)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Name</p>
                    <p className="text-sm font-medium">
                      {traveler.title || traveler.Title || ''}{' '}
                      {traveler.firstName || traveler.FirstName || ''}{' '}
                      {traveler.lastName || traveler.LastName || ''}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Date of Birth</p>
                    <p className="text-sm font-medium">
                      {traveler.dob || traveler.dateOfBirth || traveler.DateOfBirth || 'N/A'}
                    </p>
                  </div>
                  {(traveler.passportNumber || traveler.PassportNumber ||
                    traveler.passportIssueDate || traveler.PassportIssueDate ||
                    traveler.passportExpiryDate || traveler.PassportExpiryDate) && (
                      <div className="border-t border-gray-100 mt-2 pt-2 col-span-2 md:col-span-3">
                        <p className="text-xs text-gray-500 mb-2">Passport Details</p>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                          <div>
                            <p className="text-xs text-gray-400">Passport Number</p>
                            <p className="text-sm font-medium">
                              {traveler.passportNumber || traveler.PassportNumber || 'N/A'}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-400">Nationality</p>
                            <p className="text-sm font-medium">
                              {traveler.passportNationality || traveler.PassportNationality || 'IN'}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-400">Issue Date</p>
                            <p className="text-sm font-medium">
                              {traveler.passportIssueDate || traveler.PassportIssueDate || 'N/A'}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-400">Expiry Date</p>
                            <p className="text-sm font-medium">
                              {traveler.passportExpiryDate || traveler.PassportExpiryDate || 'N/A'}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500 text-sm">No traveler details available</p>
        )}

        {/* Contact Details - Separator */}
        {contactDetails && (
          <>
            <div className="border-t border-gray-200 mt-4 pt-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex items-start gap-2">
                  <Mail className="w-4 h-4 text-gray-400 mt-0.5" />
                  <div>
                    <p className="text-xs text-gray-500">Email</p>
                    <p className="text-sm font-medium">{contactDetails.email || 'N/A'}</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <Phone className="w-4 h-4 text-gray-400 mt-0.5" />
                  <div>
                    <p className="text-xs text-gray-500">Phone</p>
                    <p className="text-sm font-medium">{contactDetails.phone || 'N/A'}</p>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
        {/* GST Details */}
        {gstInfo && (gstInfo.gstNumber || gstInfo.registeredName) && (
          <div className="border-t border-gray-200 mt-4 pt-4">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">GST Details</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-gray-500">GST Number</p>
                <p className="text-sm font-medium">{gstInfo.gstNumber || 'N/A'}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Registered Name</p>
                <p className="text-sm font-medium">{gstInfo.registeredName || 'N/A'}</p>
              </div>
              {gstInfo.email && (
                <div>
                  <p className="text-xs text-gray-500">Email</p>
                  <p className="text-sm font-medium">{gstInfo.email}</p>
                </div>
              )}
              {gstInfo.mobile && (
                <div>
                  <p className="text-xs text-gray-500">Mobile</p>
                  <p className="text-sm font-medium">{gstInfo.mobile}</p>
                </div>
              )}
              {gstInfo.address && (
                <div className="col-span-2">
                  <p className="text-xs text-gray-500">Address</p>
                  <p className="text-sm font-medium">{gstInfo.address}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Emergency Contact */}
        {emergencyContact && (emergencyContact.name || emergencyContact.email || emergencyContact.phone) && (
          <div className="border-t border-gray-200 mt-4 pt-4">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Emergency Contact</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <p className="text-xs text-gray-500">Name</p>
                <p className="text-sm font-medium">{emergencyContact.name || 'N/A'}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Email</p>
                <p className="text-sm font-medium">{emergencyContact.email || 'N/A'}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Phone</p>
                <p className="text-sm font-medium">{emergencyContact.phone || 'N/A'}</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
