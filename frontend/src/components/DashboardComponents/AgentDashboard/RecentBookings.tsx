// components/RecentBookings.tsx
import React, { useEffect, useState } from 'react';
import { bookingService } from '../../../api/flights.api';
import { Plane, Building2, FileText } from 'lucide-react';

const RecentBookings: React.FC = () => {
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // const fetchRecent = async () => {
    //     try {
    //         const res = await bookingService.getRecentBookings(4);
    //         setBookings(res?.data || []);
    //     } catch (err) {
    //         console.error(err);
    //         setBookings([]);
    //     } finally {
    //         setLoading(false);
    //     }
    // };

    // fetchRecent();
    console.log('recent booking');
  }, []);

  if (loading) {
    return <div className="bg-white rounded-2xl shadow p-6">Loading recent bookings...</div>;
  }

  return (
    <div className="bg-white rounded-2xl shadow p-6">
      <div className="flex justify-between items-center mb-5">
        <h2 className="text-lg font-semibold">Recent Bookings</h2>
        <a href="/bookings" className="text-red-600 text-sm hover:underline">
          View All
        </a>
      </div>

      <div className="space-y-4">
        {bookings.length === 0 ? (
          <p className="text-gray-500 py-8 text-center">No recent bookings found</p>
        ) : (
          bookings.map((booking: any) => (
            <div
              key={booking._id}
              className="flex items-center justify-between py-3 border-b last:border-0"
            >
              <div className="flex items-center gap-4">
                <div className="w-9 h-9 bg-gray-100 rounded-lg flex items-center justify-center">
                  {booking.serviceType?.toUpperCase() === 'FLIGHT' ? (
                    <Plane className="w-4 h-4" />
                  ) : (
                    <Building2 className="w-4 h-4" />
                  )}
                </div>
                <div>
                  <p className="font-medium">{booking.details || booking.route || 'Booking'}</p>
                  <p className="text-xs text-gray-500">
                    {booking.createdAt ? new Date(booking.createdAt).toLocaleDateString() : ''}
                  </p>
                </div>
              </div>

              <div className="text-right">
                <span className="inline-block px-3 py-1 text-xs font-medium rounded-full bg-green-100 text-green-700">
                  {booking.status || 'Confirmed'}
                </span>
                <p className="font-semibold mt-1">
                  ₹{(booking.totalAmount || 0).toLocaleString('en-IN')}
                </p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default RecentBookings;
