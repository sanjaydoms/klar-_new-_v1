import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  CheckCircle,
  Plane,
  FileText,
  Shield,
  User,
  Mail,
  Phone,
  Download,
  Home,
  Sparkles,
  Calendar,
  CreditCard,
} from 'lucide-react';

interface BookingDetails {
  bookingId: string;
  totalAmount: number;
  deliveryEmail: string;
  deliveryPhone: string;
  travellers: Array<{
    type: string;
    title: string;
    firstName: string;
    lastName: string;
    dateOfBirth: string;
  }>;
}

interface BookingResponse {
  success: boolean;
  message: string;
  data?: {
    bookingReference?: string;
    pnr?: string;
    status?: string;
    paymentStatus?: string;
    [key: string]: any;
  };
}

export default function BookingConfirmation() {
  const navigate = useNavigate();
  const location = useLocation();
  const [bookingData, setBookingData] = useState<BookingDetails | null>(null);
  const [bookingResponse, setBookingResponse] = useState<BookingResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (location.state?.bookingData) {
      setBookingResponse(location.state.bookingData);
    }

    const storedBookingData = sessionStorage.getItem('seatSelection');
    const storedBookingResponse = sessionStorage.getItem('bookingResponse');
    const storedTravelerInfo = sessionStorage.getItem('travelerInfo');

    if (storedBookingData) {
      try {
        const parsedData = JSON.parse(storedBookingData);
        const travelerInfo = storedTravelerInfo ? JSON.parse(storedTravelerInfo) : null;
        setBookingData({
          bookingId: parsedData.bookingId || 'N/A',
          totalAmount: parsedData.addonsTotal || 0,
          deliveryEmail: travelerInfo?.contactDetails?.email || travelerInfo?.email || '',
          deliveryPhone: travelerInfo?.contactDetails?.mobileNumber
            ? (travelerInfo.contactDetails.countryCode || '') +
              travelerInfo.contactDetails.mobileNumber
            : travelerInfo?.phone || '',
          travellers: parsedData.travelers || [],
        });
      } catch (error) {
        console.error('Error parsing booking data:', error);
      }
    }

    if (storedBookingResponse && !bookingResponse) {
      try {
        setBookingResponse(JSON.parse(storedBookingResponse));
      } catch (error) {
        console.error('Error parsing booking response:', error);
      }
    }

    setLoading(false);
  }, [location.state]);

  const handleGoHome = () => {
    sessionStorage.removeItem('seatSelection');
    sessionStorage.removeItem('bookingResponse');
    sessionStorage.removeItem('travelerInfo');
    sessionStorage.removeItem('priceAvailabilityResponse');
    sessionStorage.removeItem('seatMapResponse');
    navigate('/');
  };

  const handleDownloadReceipt = () => {
    const receiptContent = `
KLAR AIRLINES - BOOKING CONFIRMATION
====================================

Booking Reference: ${bookingResponse?.data?.bookingReference || bookingResponse?.data?.pnr || bookingData?.bookingId || 'N/A'}
Status: ${bookingResponse?.data?.status || 'Confirmed'}
Payment Status: ${bookingResponse?.data?.paymentStatus || 'Completed'}

PASSENGER DETAILS
-----------------
${
  bookingData?.travellers
    ?.map((t, index) => `${index + 1}. ${t.title} ${t.firstName} ${t.lastName} (${t.type})`)
    .join('\n') || 'No passenger details'
}

CONTACT INFORMATION
-------------------
Email: ${bookingData?.deliveryEmail || 'N/A'}
Phone: ${bookingData?.deliveryPhone || 'N/A'}

TOTAL AMOUNT PAID
-----------------
₹${bookingData?.totalAmount?.toFixed(2) || '0.00'}

Thank you for choosing Klar Airlines!
This is your electronic ticket. Please carry a valid ID proof during travel.
    `;
    const blob = new Blob([receiptContent], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `booking-confirmation-${bookingResponse?.data?.bookingReference || bookingData?.bookingId || 'download'}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-blue-100 flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
          </div>
          <p className="text-gray-600 font-medium">Loading your booking details...</p>
        </div>
      </div>
    );
  }

  const refNumber =
    bookingResponse?.data?.bookingReference ||
    bookingResponse?.data?.pnr ||
    bookingData?.bookingId ||
    'N/A';
  const status = bookingResponse?.data?.status || 'Confirmed';
  const baseFare = bookingData?.totalAmount ? bookingData.totalAmount * 0.85 : 0;
  const taxes = bookingData?.totalAmount ? bookingData.totalAmount * 0.15 : 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-white">
      {/* ── Header ───────────────────────────────────────────────────── */}
      <header className="bg-white/80 backdrop-blur-sm border-b border-gray-200/60 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <h1 className="text-2xl font-extrabold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              Klar
            </h1>
            <nav className="hidden md:flex gap-1">
              {[
                { icon: Plane, label: 'Flights' },
                { icon: FileText, label: 'Visa' },
                { icon: Shield, label: 'Insurance' },
              ].map(({ icon: Icon, label }) => (
                <button
                  key={label}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg text-gray-500 hover:text-blue-600 hover:bg-blue-50 text-sm font-medium transition-all"
                >
                  <Icon className="w-4 h-4" />
                  {label}
                </button>
              ))}
            </nav>
          </div>
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center">
            <User className="w-4 h-4 text-white" />
          </div>
        </div>
      </header>

      {/* ── Main ─────────────────────────────────────────────────────── */}
      <div className="max-w-3xl mx-auto px-4 py-12 space-y-6">
        {/* Success Banner */}
        <div className="text-center">
          <div className="relative inline-flex items-center justify-center mb-5">
            <div className="absolute w-28 h-28 rounded-full bg-green-100 animate-pulse" />
            <div className="relative w-20 h-20 rounded-full bg-green-600 flex items-center justify-center shadow-xl shadow-green-200">
              <CheckCircle className="w-10 h-10 text-white" />
            </div>
          </div>
          <h1 className="text-3xl font-extrabold text-gray-900 mb-2">Booking Confirmed! 🎉</h1>
          <p className="text-gray-500">
            Your booking has been successfully confirmed. A confirmation email has been sent to your
            email address.
          </p>
        </div>

        {/* Booking Reference Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-4 flex items-center gap-3">
            <Sparkles className="w-5 h-5 text-white/80" />
            <h2 className="text-white font-bold text-lg">Booking Reference</h2>
          </div>
          <div className="px-6 py-5 flex items-center justify-between flex-wrap gap-4">
            <div>
              <p className="text-xs text-gray-500 mb-1 uppercase tracking-wide">Reference Number</p>
              <p className="text-3xl font-extrabold text-blue-600 tracking-widest">{refNumber}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-500 mb-1 uppercase tracking-wide">Status</p>
              <span className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-green-100 text-green-800 text-sm font-semibold">
                <span className="w-2 h-2 rounded-full bg-green-500" />
                {status}
              </span>
            </div>
          </div>
        </div>

        {/* Passenger Details */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
            <User className="w-4 h-4 text-blue-600" />
            <h2 className="font-bold text-gray-900">Passenger Details</h2>
          </div>
          <div className="px-6 py-4 space-y-3">
            {bookingData?.travellers && bookingData.travellers.length > 0 ? (
              bookingData.travellers.map((traveller, index) => (
                <div
                  key={index}
                  className="flex items-center gap-4 p-3 bg-gray-50 rounded-xl hover:bg-blue-50 transition-colors"
                >
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center text-white text-sm font-bold shrink-0">
                    {traveller.firstName?.[0]?.toUpperCase() || index + 1}
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">
                      {traveller.title} {traveller.firstName} {traveller.lastName}
                    </p>
                    <p className="text-xs text-gray-500 capitalize flex items-center gap-2 mt-0.5">
                      <span className="capitalize">{traveller.type}</span>
                      {traveller.dateOfBirth && (
                        <>
                          <span className="w-1 h-1 rounded-full bg-gray-300" />
                          <Calendar className="w-3 h-3" />
                          {new Date(traveller.dateOfBirth).toLocaleDateString()}
                        </>
                      )}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-gray-400 text-sm py-2">No passenger details available</p>
            )}
          </div>
        </div>

        {/* Contact + Payment side by side */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Contact */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
              <Mail className="w-4 h-4 text-blue-600" />
              <h2 className="font-bold text-gray-900">Contact Info</h2>
            </div>
            <div className="px-6 py-4 space-y-3">
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                <Mail className="w-4 h-4 text-gray-400 shrink-0" />
                <div className="min-w-0">
                  <p className="text-[10px] uppercase tracking-wide text-gray-400">Email</p>
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {bookingData?.deliveryEmail || 'N/A'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                <Phone className="w-4 h-4 text-gray-400 shrink-0" />
                <div>
                  <p className="text-[10px] uppercase tracking-wide text-gray-400">Phone</p>
                  <p className="text-sm font-medium text-gray-900">
                    {bookingData?.deliveryPhone || 'N/A'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Payment */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-blue-600" />
              <h2 className="font-bold text-gray-900">Payment Summary</h2>
            </div>
            <div className="px-6 py-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Base Fare</span>
                <span className="font-medium">₹{baseFare.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Taxes & Fees</span>
                <span className="font-medium">₹{taxes.toFixed(2)}</span>
              </div>
              <div className="border-t border-gray-100 pt-2 mt-2 flex justify-between font-bold">
                <span className="text-gray-900">Total Paid</span>
                <span className="text-blue-600 text-lg">
                  ₹{bookingData?.totalAmount?.toFixed(2) || '0.00'}
                </span>
              </div>
              {bookingResponse?.data?.paymentStatus && (
                <div className="mt-2 flex items-center gap-1.5 text-xs text-green-600 font-medium">
                  <span className="w-2 h-2 rounded-full bg-green-500" />
                  Payment {bookingResponse.data.paymentStatus}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-4">
          <button
            onClick={handleDownloadReceipt}
            className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-white border-2 border-blue-600 text-blue-600 rounded-xl font-semibold hover:bg-blue-50 transition-all hover:shadow-md"
          >
            <Download className="w-5 h-5" />
            Download Receipt
          </button>
          <button
            onClick={handleGoHome}
            className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-semibold hover:from-blue-700 hover:to-indigo-700 transition-all shadow-md shadow-blue-200 hover:shadow-lg"
          >
            <Home className="w-5 h-5" />
            Go to Home
          </button>
        </div>

        {/* Advisory Note */}
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-start gap-3">
          <span className="text-xl shrink-0">📌</span>
          <p className="text-sm text-amber-800">
            <span className="font-bold">Important: </span>
            Please carry a valid government ID proof (Aadhar, Passport, or Driver's License) for all
            passengers during check-in. Web check-in will be available 48 hours before departure.
          </p>
        </div>
      </div>
    </div>
  );
}
