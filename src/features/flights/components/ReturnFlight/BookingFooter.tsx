// import React from "react";
// import { Plane } from 'lucide-react';
// import { Flight, LocationInfo, SearchParams } from '../../types/types.returnFlight';

// interface BookingFooterProps {
//   selectedDepartureFlight: Flight;
//   selectedReturnFlight: Flight;
//   fromLocation: LocationInfo;
//   toLocation: LocationInfo;
//   activeSearchParams: SearchParams;
//   totalPrice: number;
//   onBookNow: () => void;
// }

// export default function BookingFooter({
//   selectedDepartureFlight,
//   selectedReturnFlight,
//   fromLocation,
//   toLocation,
//   activeSearchParams,
//   totalPrice,
//   onBookNow,
// }: BookingFooterProps) {
//   return (
//     <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg">
//       <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
//         <div className="flex items-center justify-between">
//           <div className="flex items-center gap-8">
//             <div className="flex items-center gap-4">
//               <div className="flex items-center gap-2">
//                 <Plane className="w-5 h-5 text-blue-600" />
//                 <div>
//                   <p className="text-xs text-gray-500">DEP</p>
//                   <p className="text-sm font-bold text-gray-900">{selectedDepartureFlight.flightNumber}</p>
//                   <p className="text-xs text-gray-600">
//                     {selectedDepartureFlight.departure.time} - {selectedDepartureFlight.arrival.time}
//                   </p>
//                 </div>
//               </div>
//               <div className="h-12 w-px bg-gray-300" />
//               <div className="flex items-center gap-2">
//                 <Plane className="w-5 h-5 text-blue-600" />
//                 <div>
//                   <p className="text-xs text-gray-500">RET</p>
//                   <p className="text-sm font-bold text-gray-900">{selectedReturnFlight.flightNumber}</p>
//                   <p className="text-xs text-gray-600">
//                     {selectedReturnFlight.departure.time} - {selectedReturnFlight.arrival.time}
//                   </p>
//                 </div>
//               </div>
//             </div>
//           </div>

//           <div className="flex items-center gap-6">
//             <div className="text-right">
//               <p className="text-xs text-gray-500">Total for 1 traveller</p>
//               <p className="text-2xl font-bold text-gray-900">₹{totalPrice.toLocaleString()}</p>
//             </div>
//             <button
//               onClick={onBookNow}
//               className="bg-red-600 hover:bg-red-700 text-white px-10 py-3 rounded-lg font-medium text-lg"
//             >
//               Book Now
//             </button>
//           </div>
//         </div>
//       </div>
//     </div>
//   );
// }
