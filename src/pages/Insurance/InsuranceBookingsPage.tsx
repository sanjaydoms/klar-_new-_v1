import React, { useState, useEffect } from 'react';
import InsuranceBookingCard from './insuranceBookingComponent/InsuranceBookingCard';
import InsuranceBookingDetailsModal from './insuranceBookingComponent/InsuranceBookingDetailsModal';
import { getInsuranceBookings, getInsuranceBookingById } from '../../api/insuranceService.api';

const InsuranceBookingsPage = () => {
  const [subTab, setSubTab] = useState('all');
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [pagination, setPagination] = useState(null);

  const subTabs = [
    { id: 'all', label: 'All Bookings' },
    { id: 'initiated', label: 'Initiated' },
    { id: 'completed', label: 'Completed' },
    { id: 'cancelled', label: 'Cancelled' },
  ];

  useEffect(() => {
    fetchInsuranceBookings();
  }, []);

  const fetchInsuranceBookings = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await getInsuranceBookings();

      if (response?.status === true && response?.body?.bookings) {
        setBookings(response.body.bookings);
        setPagination(response.body.pagination);
      } else if (response?.bookings) {
        setBookings(response.bookings);
      } else if (Array.isArray(response)) {
        setBookings(response);
      } else if (response?.data?.bookings) {
        setBookings(response.data.bookings);
      } else {
        setBookings([]);
      }
    } catch (err) {
      console.error('Error fetching insurance bookings:', err);
      setError(err.message || 'Failed to fetch insurance bookings');
      setBookings([]);
    } finally {
      setLoading(false);
    }
  };

  const getStatus = (booking) => {
    const status = booking?.status || booking?.order?.status;
    return typeof status === 'string' ? status.toLowerCase() : '';
  };

  const getFilteredBookings = () => {
    if (!bookings.length) return [];
    switch (subTab) {
      case 'all':
        return bookings;
      case 'initiated':
        return bookings.filter((b) => getStatus(b) === 'initiated');
      case 'completed':
        return bookings.filter(
          (b) =>
            getStatus(b) === 'success' ||
            getStatus(b) === 'confirmed' ||
            getStatus(b) === 'completed',
        );
      case 'cancelled':
        return bookings.filter((b) => getStatus(b) === 'cancelled');
      default:
        return bookings;
    }
  };

  const getCounts = () => {
    return {
      all: bookings.length || 0,
      initiated: bookings.filter((b) => getStatus(b) === 'initiated').length || 0,
      completed:
        bookings.filter(
          (b) =>
            getStatus(b) === 'success' ||
            getStatus(b) === 'confirmed' ||
            getStatus(b) === 'completed',
        ).length || 0,
      cancelled: bookings.filter((b) => getStatus(b) === 'cancelled').length || 0,
    };
  };

  const filteredBookings = getFilteredBookings();
  const counts = getCounts();

  const handleViewDetails = async (booking) => {
    setIsModalOpen(true);
    setSelectedBooking(booking); // Show initial data immediately

    try {
      // FIX: Prioritize _id (Mongo ID) over bookingId for the API call
      const mongoId = booking?._id;

      if (mongoId) {
        console.log('Fetching detailed data using Mongo ID:', mongoId);
        const response = await getInsuranceBookingById(mongoId);
        // const detailedData = response?.data || response;
        const detailedData = response?.body || response?.data || response;
        if (detailedData) {
          setSelectedBooking(detailedData);
        }
      } else {
        console.warn('Mongo _id not found on booking object. Using existing data.');
      }
    } catch (error) {
      console.error('Error fetching detailed booking:', error);
      // Fallback: the modal stays open with the 'booking' data passed from the card
    }
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedBooking(null);
  };

  const handleCancelSuccess = (cancelledBookingId) => {
    setBookings((prevBookings) =>
      prevBookings.map((booking) => {
        if (booking.bookingId === cancelledBookingId || booking._id === cancelledBookingId) {
          return { ...booking, status: 'cancelled' };
        }
        return booking;
      }),
    );
  };

  return (
    <div className="animate-fadeIn">
      <div className="mb-6">
        <div className="border-b border-gray-200 flex-1">
          <nav className="flex space-x-6">
            {subTabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setSubTab(tab.id)}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors relative ${
                  subTab === tab.id
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab.label}
                {counts[tab.id] > 0 && (
                  <span
                    className={`ml-2 py-0.5 px-2 rounded-full text-xs ${
                      subTab === tab.id ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    {counts[tab.id]}
                  </span>
                )}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {loading && (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-4"></div>
          <p className="text-gray-600">Loading insurance records...</p>
        </div>
      )}

      {error && !loading && (
        <div className="text-center py-12 bg-white rounded-lg">
          <div className="text-6xl mb-4">⚠️</div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">Oops! Something went wrong</h3>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={fetchInsuranceBookings}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg"
          >
            Try Again
          </button>
        </div>
      )}

      {!loading && !error && (
        <>
          {filteredBookings.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredBookings.map((booking) => (
                <InsuranceBookingCard
                  key={booking._id || booking.bookingId}
                  booking={booking}
                  onViewDetails={handleViewDetails}
                  onCancelSuccess={handleCancelSuccess}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-12 bg-white rounded-lg border border-dashed border-gray-300">
              <div className="text-6xl mb-4">🛡️</div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">No Insurance Found</h3>
              <p className="text-gray-600 mb-6">
                {subTab === 'all'
                  ? "You haven't purchased any insurance policies yet."
                  : `No ${subTab} insurance records found.`}
              </p>
              <button className="px-6 py-3 bg-blue-600 text-white rounded-lg transition-colors">
                Explore Insurance Plans
              </button>
            </div>
          )}
        </>
      )}

      {isModalOpen && selectedBooking && (
        <InsuranceBookingDetailsModal
          booking={selectedBooking}
          onClose={handleCloseModal}
          onCancelSuccess={handleCancelSuccess}
        />
      )}
    </div>
  );
};

export default InsuranceBookingsPage;
