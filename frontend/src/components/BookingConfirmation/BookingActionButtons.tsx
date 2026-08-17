// import { useNavigate } from 'react-router-dom';
// import { Calendar, Plane, LayoutDashboard } from 'lucide-react';

// interface BookingActionButtonsProps {
//   bookingId?: string;
//   className?: string;
// }

// export default function BookingActionButtons({
//   bookingId,
//   className = ''
// }: BookingActionButtonsProps) {
//   const navigate = useNavigate();

//   const handleViewAllBookings = () => {
//     navigate('/my-bookings');
//   };

//   const handleBookFlight = () => {
//     navigate('/dashboard');
//   };

//   const handleGoToDashboard = () => {
//     navigate('/dashboard');
//   };

//   return (
//     <div className={`grid grid-cols-1 sm:grid-cols-3 gap-4 w-full ${className}`}>
//       <button
//         onClick={handleViewAllBookings}
//         className="flex items-center justify-center gap-2 px-6 py-3 text-white rounded-lg hover:opacity-90 transition-colors duration-200 shadow-md hover:shadow-lg font-medium text-sm w-full"
//         style={{ backgroundColor: '#234977' }}
//       >
//         <Calendar className="w-4 h-4" />
//         View All Bookings
//       </button>

//       <button
//         onClick={handleBookFlight}
//         className="flex items-center justify-center gap-2 px-6 py-3 rounded-lg hover:bg-gray-50 transition-colors duration-200 shadow-md hover:shadow-lg font-medium text-sm w-full bg-white text-[#234977]"
//         style={{ border: '2px solid #234977' }}
//       >
//         <Plane className="w-4 h-4" style={{ color: '#234977' }} />
//         Book Flight
//       </button>

//       <button
//         onClick={handleGoToDashboard}
//         className="flex items-center justify-center gap-2 px-6 py-3 rounded-lg hover:bg-gray-50 transition-colors duration-200 shadow-md hover:shadow-lg font-medium text-sm w-full bg-white text-[#234977]"
//         style={{ border: '2px solid #234977' }}
//       >
//         <LayoutDashboard className="w-4 h-4" style={{ color: '#234977' }} />
//         Go to Dashboard
//       </button>
//     </div>
//   );
// }
