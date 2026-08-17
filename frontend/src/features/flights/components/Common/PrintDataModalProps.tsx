// // PrintDataModal.tsx
// import { useState } from 'react';
// import {
//     searchOneWayFlightsPrint,
//     searchReturnFlightsPrint,
//     searchMultiCityFlightsPrint,
// } from '@/api/flightService.api';

// interface PrintDataModalProps {
//     isOpen: boolean;
//     onClose: () => void;
//     searchQuery: any;
//     flightType?: 'oneway' | 'return' | 'multicity';
// }

// export default function PrintDataModal({ isOpen, onClose, searchQuery, flightType = 'oneway' }: PrintDataModalProps) {
//     const [isPrinting, setIsPrinting] = useState(false);
//     const [error, setError] = useState<string | null>(null);

//     const downloadPDF = (data: any, filename: string) => {
//         let blob: Blob;

//         // Check if data is already a Blob
//         if (data instanceof Blob) {
//             blob = data;
//         }
//         // Check if data is a response object with data property
//         else if (data?.data instanceof Blob) {
//             blob = data.data;
//         }
//         // Check if data is ArrayBuffer or Uint8Array
//         else if (data instanceof ArrayBuffer || data instanceof Uint8Array) {
//             blob = new Blob([data], { type: 'application/pdf' });
//         }
//         // If data is the PDF bytes directly
//         else {
//             blob = new Blob([data], { type: 'application/pdf' });
//         }

//         // Create download link
//         const url = window.URL.createObjectURL(blob);
//         const link = document.createElement('a');
//         link.href = url;
//         link.download = filename;
//         document.body.appendChild(link);
//         link.click();
//         document.body.removeChild(link);
//         window.URL.revokeObjectURL(url);
//     };

//     const handlePrintData = async () => {
//         if (!searchQuery) {
//             setError('No search query available');
//             return;
//         }

//         setIsPrinting(true);
//         setError(null);

//         try {
//             let response;

//             if (flightType === 'return') {
//                 response = await searchReturnFlightsPrint(searchQuery);
//             } else if (flightType === 'multicity') {
//                 response = await searchMultiCityFlightsPrint(searchQuery);
//             } else {
//                 response = await searchOneWayFlightsPrint(searchQuery);
//             }

//             // Check various possible response formats
//             if (response?.data) {
//                 // Check if response.data is a Blob or contains PDF data
//                 if (response.data instanceof Blob) {
//                     // Check content type
//                     if (response.data.type === 'application/pdf' ||
//                         response.data.type === 'application/octet-stream' ||
//                         response.data.size > 0) {
//                         downloadPDF(response.data, `flight-search-results-${Date.now()}.pdf`);
//                         onClose();
//                     } else {
//                         // Try to read as text for error message
//                         const text = await response.data.text();
//                         try {
//                             const errorData = JSON.parse(text);
//                             setError(errorData.message || 'Failed to generate PDF');
//                         } catch {
//                             // If it's not JSON but has PDF bytes, download anyway
//                             if (text.includes('%PDF')) {
//                                 downloadPDF(response.data, `flight-search-results-${Date.now()}.pdf`);
//                                 onClose();
//                             } else {
//                                 setError('Invalid response format from server');
//                             }
//                         }
//                     }
//                 }
//                 // Check if response.data is an ArrayBuffer
//                 else if (response.data instanceof ArrayBuffer) {
//                     downloadPDF(response.data, `flight-search-results-${Date.now()}.pdf`);
//                     onClose();
//                 }
//                 // Check if response is the blob directly (without data wrapper)
//                 else if (response instanceof Blob) {
//                     downloadPDF(response, `flight-search-results-${Date.now()}.pdf`);
//                     onClose();
//                 }
//                 else {
//                     setError('Invalid response format from server');
//                 }
//             }
//             else if (response instanceof Blob) {
//                 downloadPDF(response, `flight-search-results-${Date.now()}.pdf`);
//                 onClose();
//             }
//             else {
//                 setError('No data received from server');
//             }
//         } catch (error: any) {
//             console.error('Error generating PDF:', error);
//             setError(error.message || 'Failed to generate PDF');
//         } finally {
//             setIsPrinting(false);
//         }
//     };

//     if (!isOpen) return null;

//     return (
//         <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
//             <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
//                 <h2 className="text-xl font-semibold mb-4">Download Flight Data</h2>
//                 <p className="text-gray-600 mb-6">
//                     Do you want to download the flight search results as PDF?
//                 </p>

//                 {error && (
//                     <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-md text-sm">
//                         {error}
//                     </div>
//                 )}

//                 <div className="flex justify-end gap-3">
//                     <button
//                         onClick={onClose}
//                         disabled={isPrinting}
//                         className="px-4 py-2 text-gray-600 hover:text-gray-800 font-medium transition-colors"
//                     >
//                         Cancel
//                     </button>
//                     <button
//                         onClick={handlePrintData}
//                         disabled={isPrinting}
//                         className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
//                     >
//                         {isPrinting ? (
//                             <>
//                                 <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
//                                 Generating PDF...
//                             </>
//                         ) : (
//                             'Download PDF'
//                         )}
//                     </button>
//                 </div>
//             </div>
//         </div>
//     );
// }
