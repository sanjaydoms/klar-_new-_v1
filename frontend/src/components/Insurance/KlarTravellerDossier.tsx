// import React, { useState, useEffect } from 'react';
// import { useNavigate, useLocation, Link } from 'react-router-dom';
// import { ChevronLeft, Trash2, Upload, Plus, FileText, Loader2, ArrowLeft } from 'lucide-react';
// import { bookInsurancePlan } from '@/api/insuranceService.api';
// import InsuranceNavbar from './InsuranceNavbar';
// import { useAuth } from '@/features/authentication/hooks/useAuth';

// const calculateAgeAtEntry = (dob: string, startDate: string) => {
//   if (!dob) return 22;
//   const birthDate = new Date(dob);
//   const policyStart = new Date(startDate);
//   let age = policyStart.getFullYear() - birthDate.getFullYear();
//   const m = policyStart.getMonth() - birthDate.getMonth();
//   if (m < 0 || (m === 0 && policyStart.getDate() < birthDate.getDate())) {
//     age--;
//   }
//   return age >= 0 ? age : 0;
// };

// interface TravellerData {
//   id: number;
//   firstName: string;
//   lastName: string;
//   dob: string;
//   gender: 'Male' | 'Female' | '';
//   passportNumber: string;
//   nomineeName: string;
//   relationship: string;
//   mobile: string;
//   email: string;
//   passportFile: File | null;
//   passportFileName?: string;
// }

// const KlarTravellerDossier: React.FC = () => {
//   const navigate = useNavigate();
//   const location = useLocation();
//   const { isAuthenticated } = useAuth();

//   // Fallback state trackers
//   const [reviewData, setReviewDataState] = useState<any>(() => {
//     if (location.state?.reviewData) return location.state.reviewData;
//     const cached = sessionStorage.getItem('insurance_reviewData');
//     return cached ? JSON.parse(cached) : null;
//   });

//   const [selectedPlan, setSelectedPlanState] = useState<any>(() => {
//     if (location.state?.selectedPlan) return location.state.selectedPlan;
//     const cached = sessionStorage.getItem('insurance_selectedPlan');
//     return cached ? JSON.parse(cached) : null;
//   });

//   const [bookingId, setBookingIdState] = useState<string>(() => {
//     if (location.state?.bookingId) return location.state.bookingId;
//     return sessionStorage.getItem('insurance_bookingId') || '';
//   });

//   const [isProcessing, setIsProcessing] = useState(false);
//   const [isAgreed, setIsAgreed] = useState(false);
//   const [travellers, setTravellers] = useState<TravellerData[]>([]);
//   const [errors, setErrors] = useState<Record<string, string>>({});

//   // Sync cache parameters on location changes
//   useEffect(() => {
//     if (location.state?.reviewData) sessionStorage.setItem('insurance_reviewData', JSON.stringify(location.state.reviewData));
//     if (location.state?.selectedPlan) sessionStorage.setItem('insurance_selectedPlan', JSON.stringify(location.state.selectedPlan));
//     if (location.state?.bookingId) sessionStorage.setItem('insurance_bookingId', location.state.bookingId);
//   }, [location.state]);

//   // ===== POST-LOGIN AUTO-FORWARD TUNNEL =====
//   useEffect(() => {
//     if (isAuthenticated) {
//       const savedAuthIntent = sessionStorage.getItem('insurance_postLoginPayload');
//       if (savedAuthIntent) {
//         try {
//           const contextData = JSON.parse(savedAuthIntent);
          
//           // Clean up cache parameters out of memory immediately
//           sessionStorage.removeItem('insurance_postLoginPayload');
//           sessionStorage.removeItem('pendingInsuranceData');
//           sessionStorage.removeItem('redirectAfterLogin');

//           // Directly forward the newly authenticated session down to the payment viewport
//           navigate('/insurance/payment', { 
//             state: { 
//               bookingPayload: contextData.payload,
//               amount: contextData.finalAmount,
//               selectedPlan: selectedPlan || contextData.selectedPlan,
//               reviewData: reviewData || contextData.reviewData
//             } 
//           });
//           return;
//         } catch (error) {
//           console.error('Error auto-forwarding to insurance payment layout:', error);
//         }
//       }
//     }
//   }, [isAuthenticated, navigate, selectedPlan, reviewData]);

//   // Restore draft state text changes if auto-forward didn't match
//   useEffect(() => {
//     try {
//       const pendingInsurance = sessionStorage.getItem('pendingInsuranceData');
//       if (pendingInsurance) {
//         const parsed = JSON.parse(pendingInsurance);
//         const ageInMins = (Date.now() - new Date(parsed.timestamp).getTime()) / 60000;
//         if (ageInMins < 10) {
//           setTravellers(parsed.travellers || []);
//           setIsAgreed(parsed.isAgreed || false);
//           return;
//         }
//         sessionStorage.removeItem('pendingInsuranceData');
//       }
//     } catch (e) {
//       console.error('Failed to restore insurance session state:', e);
//     }

//     const planInfo = reviewData?.iinfo?.pli?.[0]?.pi?.[0];
//     const reviewTravellers = planInfo?.iti || reviewData?.isq?.iti || [];

//     if (reviewTravellers.length > 0 && travellers.length === 0) {
//       const initialTravellers = reviewTravellers.map((rev: any, index: number) => ({
//         id: index + 1,
//         firstName: '',
//         lastName: '',
//         dob: rev.dob || '', 
//         gender: rev.gen === 'M' ? 'Male' : rev.gen === 'F' ? 'Female' : '',
//         passportNumber: '',
//         nomineeName: '',
//         relationship: 'Legal Heir',
//         mobile: '',
//         email: '',
//         passportFile: null,
//       }));
//       setTravellers(initialTravellers);
//     }
//   }, [reviewData]);

//   const handleInputChange = (id: number, field: keyof TravellerData, value: any) => {
//     const errorKey = `${id}-${field}`;
//     if (errors[errorKey]) {
//       setErrors((prev) => {
//         const copy = { ...prev };
//         delete copy[errorKey];
//         return copy;
//       });
//     }

//     setTravellers((prev) => prev.map((t) => {
//       if (t.id !== id) return t;
//       if (field === 'mobile') {
//         const structuralDigits = value.replace(/\D/g, '');
//         if (structuralDigits.length > 10) return t;
//         return { ...t, [field]: structuralDigits };
//       }
//       return { ...t, [field]: value };
//     }));
//   };

//   const handleFileUpload = (id: number, file: File | undefined) => {
//     if (!file) return;

//     if (file.size > 2 * 1024 * 1024) {
//       setErrors((prev) => ({ ...prev, [`${id}-passportFile`]: 'File size exceeds 2MB limit.' }));
//       return;
//     }

//     setErrors((prev) => {
//       const copy = { ...prev };
//       delete copy[`${id}-passportFile`];
//       return copy;
//     });

//     setTravellers(prev => prev.map(t => t.id === id ? { ...t, passportFile: file, passportFileName: file.name } : t));
//   };

//   const addTraveller = () => {
//     setTravellers([
//       ...travellers,
//       {
//         id: Date.now(),
//         firstName: '',
//         lastName: '',
//         dob: '',
//         gender: '',
//         passportNumber: '',
//         nomineeName: '',
//         relationship: 'Legal Heir',
//         mobile: '',
//         email: '',
//         passportFile: null,
//       },
//     ]);
//   };

//   const removeTraveller = (id: number) => {
//     if (travellers.length > 1) {
//       setTravellers(travellers.filter((t) => t.id !== id));
//       setErrors((prev) => {
//         const nextErrors = { ...prev };
//         Object.keys(nextErrors).forEach((key) => {
//           if (key.startsWith(`${id}-`)) delete nextErrors[key];
//         });
//         return nextErrors;
//       });
//     }
//   };

//   const handleFinalSubmit = async () => {
//     const nextErrors: Record<string, string> = {};
//     let hasValidationError = false;

//     if (!isAgreed) {
//       nextErrors['declaration'] = 'Please confirm the declaration to continue.';
//       hasValidationError = true;
//     }

//     for (const t of travellers) {
//       if (!t.firstName) {
//         nextErrors[`${t.id}-firstName`] = 'First name is required.';
//         hasValidationError = true;
//       }
//       if (!t.lastName) {
//         nextErrors[`${t.id}-lastName`] = 'Last name is required.';
//         hasValidationError = true;
//       }
//       if (!t.dob) {
//         nextErrors[`${t.id}-dob`] = 'Date of birth is required.';
//         hasValidationError = true;
//       }
//       if (!t.gender) {
//         nextErrors[`${t.id}-gender`] = 'Gender selection is required.';
//         hasValidationError = true;
//       }
//       if (!t.passportNumber) {
//         nextErrors[`${t.id}-passportNumber`] = 'Passport number is required.';
//         hasValidationError = true;
//       }
//       if (!t.nomineeName) {
//         nextErrors[`${t.id}-nomineeName`] = 'Nominee name is required.';
//         hasValidationError = true;
//       }

//       if (!t.mobile) {
//         nextErrors[`${t.id}-mobile`] = 'Mobile number is required.';
//         hasValidationError = true;
//       } else if (t.mobile.length !== 10) {
//         nextErrors[`${t.id}-mobile`] = 'Must be exactly 10 digits.';
//         hasValidationError = true;
//       }

//       if (!t.email) {
//         nextErrors[`${t.id}-email`] = 'Email address is required.';
//         hasValidationError = true;
//       } else if (!/\S+@\S+\.\S+/.test(t.email)) {
//         nextErrors[`${t.id}-email`] = 'Please enter a valid email.';
//         hasValidationError = true;
//       }
//     }

//     if (hasValidationError) {
//       setErrors(nextErrors);
//       const firstErrorElement = document.querySelector('.text-red-500');
//       if (firstErrorElement) {
//         firstErrorElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
//       }
//       return;
//     }

//     setIsProcessing(true);

//     const planInfo = reviewData?.iinfo?.pli?.[0]?.pi?.[0];
//     const plid = reviewData?.iinfo?.pli?.[0]?.plid;
//     const reviewTravellers = planInfo?.iti || [];
//     let totalAmountFromReview = 0;

//     reviewTravellers.forEach((traveller: any) => {
//       const fare = traveller?.fd?.ifc?.TF || traveller?.fd?.ifc?.SP || 0;
//       totalAmountFromReview += fare;
//     });

//     const finalAmount = totalAmountFromReview || planInfo?.ptf || 0;

//     if (travellers.length !== reviewTravellers.length) {
//       alert(`Amount Mismatch: This plan was reviewed for ${reviewTravellers.length} traveller(s).`);
//       setIsProcessing(false);
//       return;
//     }

//     const payload = {
//       bookingId: reviewData?.bid || bookingId,
//        source: "B2C_PORTAL",
//       ict: reviewData?.isq?.ict || 'International',
//       paymentInfos: [{ paymentMedium: 'WALLET', amount: finalAmount }],
//       pli: [
//         {
//           plid: plid,
//           pi: [
//             {
//               pid: planInfo?.pid,
//               iti: travellers.map((t, index) => {
//                 const reviewedAge = reviewData?.isq?.iti?.[index]?.age;
//                 const calculatedAge = calculateAgeAtEntry(t.dob, reviewData?.isq?.sd || new Date().toISOString());
                
//                 return {
//                   id: index + 1,
//                   dob: t.dob,
//                   age: Number(reviewedAge || calculatedAge),
//                   fn: t.firstName.trim().toUpperCase(),
//                   ln: t.lastName.trim().toUpperCase(),
//                   eid: t.email.trim(),
//                   pnum: t.passportNumber.trim().toUpperCase(),
//                   fd: planInfo?.iti?.[index]?.fd,
//                   pincode: '500001',
//                   gen: t.gender === 'Male' ? 'M' : 'F',
//                   sc: { c: 'Higher Education' },
//                   si: { n: 'Institute of Technology' },
//                   ni: [{ nn: t.nomineeName.trim(), nr: t.relationship }],
//                 };
//               }),
//             },
//           ],
//         },
//       ],
//       deliveryInfo: {
//         emails: [travellers[0].email.trim()],
//         contacts: [travellers[0].mobile.trim()],
//       },
//     };

//     // ===== AUTHENTICATION INTERCEPTION LAYER =====
//     if (!isAuthenticated) {
//       const serializableTravellers = travellers.map(t => ({
//         ...t,
//         passportFile: null
//       }));

//       const stateContainer = {
//         travellers: serializableTravellers,
//         isAgreed: isAgreed,
//         timestamp: new Date().toISOString()
//       };

//       // Cache structural data parameters & target payment settings
//       sessionStorage.setItem('pendingInsuranceData', JSON.stringify(stateContainer));
//       sessionStorage.setItem('insurance_postLoginPayload', JSON.stringify({ payload, finalAmount, selectedPlan, reviewData }));
//       sessionStorage.setItem('redirectAfterLogin', window.location.pathname);

//       setIsProcessing(false);
      
//       navigate('/b2b', {
//         state: {
//           from: window.location.pathname,
//           message: 'Please login to continue with your insurance booking'
//         }
//       });
//       return;
//     }

//     try {
//       sessionStorage.removeItem('insurance_reviewData');
//       sessionStorage.removeItem('insurance_selectedPlan');
//       sessionStorage.removeItem('insurance_bookingId');
//       sessionStorage.removeItem('insurance_postLoginPayload');

//       navigate('/insurance/payment', {
//         state: {
//           bookingPayload: payload,
//           amount: finalAmount,
//           selectedPlan: selectedPlan,
//           reviewData: reviewData,
//         },
//       });
//     } catch (error: any) {
//       console.log('KlarTravellerDossier Preparation error:', error);
//       alert('Something went wrong during preparation.');
//     } finally {
//       setIsProcessing(false);
//     }
//   };

//   if (!selectedPlan) {
//     return <div className="p-20 text-center">Invalid Session. Please start a new search.</div>;
//   }

//   return (
//     <div className="min-h-screen bg-[#F4F6F9] pb-20 font-sans text-[#1A2B3D]">
//       <InsuranceNavbar />

//       <section className="bg-[#1D2B6B] text-white px-4 py-6 md:px-8 md:py-8 shadow-inner">
//         <div className="max-w-7xl mx-auto">
//           <h1 className="text-xl md:text-2xl font-bold tracking-normal">Passenger Details</h1>
//         </div>
//       </section>

//       <div className="max-w-7xl mx-auto px-4 py-6 md:py-8">
//         <nav className="flex items-center gap-1.5 text-xs text-gray-500 mb-6">
//           <ArrowLeft
//             size={14}
//             className="text-gray-400 cursor-pointer"
//             onClick={() => navigate(-1)}
//           />
//           <span
//             onClick={() => navigate('/')}
//             className="hover:text-[#1D2B6B] transition cursor-pointer"
//           >
//             Home
//           </span>
//           <span className="text-gray-300">›</span>
//           <span
//             onClick={() => navigate(-1)}
//             className="hover:text-[#1D2B6B] transition cursor-pointer"
//           >
//             Select insurance
//           </span>
//           <span className="text-gray-300">›</span>
//           <span className="text-gray-800 font-medium">Add Traveller details</span>
//         </nav>

//         <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
//           <div className="lg:col-span-8 space-y-6">
//             {travellers.map((traveller, index) => {
//               const currentAge = calculateAgeAtEntry(
//                 traveller.dob,
//                 reviewData?.isq?.sd || new Date().toISOString(),
//               );
//               return (
//                 <div
//                   key={traveller.id}
//                   className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden"
//                 >
//                   <div className="bg-[#F8FAFC] px-5 py-3.5 flex justify-between items-center border-b border-gray-200/80">
//                     <h2 className="font-bold text-xs md:text-sm text-gray-800 tracking-wide">
//                       Traveller {index + 1}{' '}
//                       <span className="text-gray-400 font-normal mx-1">|</span>{' '}
//                       <span className="text-gray-500 font-medium text-xs">{currentAge} Yrs</span>
//                     </h2>
//                     {index > 0 && (
//                       <button
//                         onClick={() => removeTraveller(traveller.id)}
//                         className="text-gray-400 hover:text-red-500 transition"
//                       >
//                         <Trash2 size={16} />
//                       </button>
//                     )}
//                   </div>

//                   <div className="p-5 md:p-6 space-y-6">
//                     <div>
//                       <div
//                         className={`flex flex-col sm:flex-row items-center gap-4 p-4 border border-dashed rounded-lg bg-[#FAFBFD] ${errors[`${traveller.id}-passportFile`] ? 'border-red-500 bg-red-50/20' : 'border-gray-300'}`}
//                       >
//                         <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center text-gray-400 shrink-0">
//                           <FileText size={20} />
//                         </div>
//                         <div className="flex-1 text-center sm:text-left">
//                           <p className="text-xs font-bold text-gray-700">
//                             {traveller.passportFile ? traveller.passportFile.name : (traveller.passportFileName || 'Upload Passport')}
//                           </p>
//                           <p className="text-[10px] text-gray-400 font-medium mt-0.5">
//                             PNG, JPG, PDF | Size &lt; 2MB
//                           </p>
//                         </div>
//                         <label className="bg-[#1D2B6B] hover:bg-[#152052] text-white px-5 py-2 rounded text-[11px] font-bold cursor-pointer tracking-wider flex items-center gap-1.5 transition uppercase shadow-sm">
//                           <Upload size={13} /> Upload
//                           <input
//                             type="file"
//                             accept=".png,.jpg,.jpeg,.pdf"
//                             className="hidden"
//                             onChange={(e) => handleFileUpload(traveller.id, e.target.files?.[0])}
//                           />
//                         </label>
//                       </div>
//                       {errors[`${traveller.id}-passportFile`] && (
//                         <p className="text-[10px] text-red-500 font-semibold mt-1 pl-1">
//                           {errors[`${traveller.id}-passportFile`]}
//                         </p>
//                       )}
//                     </div>

//                     <div className="grid grid-cols-1 md:grid-cols-2 gap-x-5 gap-y-5">
//                       <div>
//                         <div
//                           className={`relative border rounded bg-white px-3 py-2 transition-colors ${errors[`${traveller.id}-firstName`] ? 'border-red-500 focus-within:border-red-500' : 'border-gray-300 focus-within:border-[#1D2B6B]'}`}
//                         >
//                           <label
//                             className={`absolute -top-2 left-2 bg-white px-1 text-[10px] font-bold uppercase tracking-wider ${errors[`${traveller.id}-firstName`] ? 'text-red-500' : 'text-gray-400'}`}
//                           >
//                             First Name
//                           </label>
//                           <input
//                             type="text"
//                             placeholder="FIRST NAME"
//                             value={traveller.firstName}
//                             onChange={(e) =>
//                               handleInputChange(
//                                 traveller.id,
//                                 'firstName',
//                                 e.target.value.toUpperCase(),
//                               )
//                             }
//                             className="w-full text-xs font-bold text-gray-800 uppercase outline-none pt-0.5"
//                           />
//                         </div>
//                         {errors[`${traveller.id}-firstName`] && (
//                           <p className="text-[10px] text-red-500 font-semibold mt-1 pl-1">
//                             {errors[`${traveller.id}-firstName`]}
//                           </p>
//                         )}
//                       </div>

//                       <div>
//                         <div
//                           className={`relative border rounded bg-white px-3 py-2 transition-colors ${errors[`${traveller.id}-lastName`] ? 'border-red-500 focus-within:border-red-500' : 'border-gray-300 focus-within:border-[#1D2B6B]'}`}
//                         >
//                           <label
//                             className={`absolute -top-2 left-2 bg-white px-1 text-[10px] font-bold uppercase tracking-wider ${errors[`${traveller.id}-lastName`] ? 'text-red-500' : 'text-gray-400'}`}
//                           >
//                             Last Name
//                           </label>
//                           <input
//                             type="text"
//                             placeholder="LAST NAME"
//                             value={traveller.lastName}
//                             onChange={(e) =>
//                               handleInputChange(
//                                 traveller.id,
//                                 'lastName',
//                                 e.target.value.toUpperCase(),
//                               )
//                             }
//                             className="w-full text-xs font-bold text-gray-800 uppercase outline-none pt-0.5"
//                           />
//                         </div>
//                         {errors[`${traveller.id}-lastName`] && (
//                           <p className="text-[10px] text-red-500 font-semibold mt-1 pl-1">
//                             {errors[`${traveller.id}-lastName`]}
//                           </p>
//                         )}
//                       </div>

//                       <div>
//                         <div
//                           className={`flex items-center gap-4 px-1 min-h-[42px] border rounded ${errors[`${traveller.id}-gender`] ? 'border-red-500 bg-red-50/10' : 'border-transparent'}`}
//                         >
//                           <span
//                             className={`text-[10px] font-bold uppercase tracking-wider min-w-[50px] ${errors[`${traveller.id}-gender`] ? 'text-red-500' : 'text-gray-400'}`}
//                           >
//                             Gender
//                           </span>
//                           <div className="flex gap-6">
//                             {['Male', 'Female'].map((g) => (
//                               <label
//                                 key={g}
//                                 className="flex items-center gap-2 cursor-pointer group"
//                               >
//                                 <input
//                                   type="radio"
//                                   name={`gender-${traveller.id}`}
//                                   checked={traveller.gender === g}
//                                   onChange={() => handleInputChange(traveller.id, 'gender', g)}
//                                   className="w-4 h-4 text-[#1D2B6B] border-gray-300 focus:ring-0"
//                                 />
//                                 <span className="text-xs font-bold text-gray-700 group-hover:text-black">
//                                   {g}
//                                 </span>
//                               </label>
//                             ))}
//                           </div>
//                         </div>
//                         {errors[`${traveller.id}-gender`] && (
//                           <p className="text-[10px] text-red-500 font-semibold mt-1 pl-1">
//                             {errors[`${traveller.id}-gender`]}
//                           </p>
//                         )}
//                       </div>

//                       <div>
//                         <div
//                           className={`relative border rounded bg-white px-3 py-2 transition-colors ${errors[`${traveller.id}-dob`] ? 'border-red-500 focus-within:border-red-500' : 'border-gray-300 focus-within:border-[#1D2B6B]'}`}
//                         >
//                           <label
//                             className={`absolute -top-2 left-2 bg-white px-1 text-[10px] font-bold uppercase tracking-wider ${errors[`${traveller.id}-dob`] ? 'text-red-500' : 'text-gray-400'}`}
//                           >
//                             Date of Birth
//                           </label>
//                           <input
//                             type="date"
//                             value={traveller.dob}
//                             onChange={(e) => handleInputChange(traveller.id, 'dob', e.target.value)}
//                             className="w-full text-xs font-bold text-gray-800 outline-none pt-0.5"
//                           />
//                         </div>
//                         {errors[`${traveller.id}-dob`] && (
//                           <p className="text-[10px] text-red-500 font-semibold mt-1 pl-1">
//                             {errors[`${traveller.id}-dob`]}
//                           </p>
//                         )}
//                       </div>

//                       <div>
//                         <div
//                           className={`relative border rounded bg-white px-3 py-2 transition-colors ${errors[`${traveller.id}-passportNumber`] ? 'border-red-500 focus-within:border-red-500' : 'border-gray-300 focus-within:border-[#1D2B6B]'}`}
//                         >
//                           <label
//                             className={`absolute -top-2 left-2 bg-white px-1 text-[10px] font-bold uppercase tracking-wider ${errors[`${traveller.id}-passportNumber`] ? 'text-red-500' : 'text-gray-400'}`}
//                           >
//                             Passport Number
//                           </label>
//                           <input
//                             type="text"
//                             placeholder="XXXXXXXX"
//                             value={traveller.passportNumber}
//                             onChange={(e) =>
//                               handleInputChange(
//                                 traveller.id,
//                                 'passportNumber',
//                                 e.target.value.toUpperCase(),
//                               )
//                             }
//                             className="w-full text-xs font-bold text-gray-800 uppercase tracking-wider outline-none pt-0.5"
//                           />
//                         </div>
//                         {errors[`${traveller.id}-passportNumber`] && (
//                           <p className="text-[10px] text-red-500 font-semibold mt-1 pl-1">
//                             {errors[`${traveller.id}-passportNumber`]}
//                           </p>
//                         )}
//                       </div>

//                       <div>
//                         <div
//                           className={`relative border rounded bg-white px-3 py-2 transition-colors ${errors[`${traveller.id}-nomineeName`] ? 'border-red-500 focus-within:border-red-500' : 'border-gray-300 focus-within:border-[#1D2B6B]'}`}
//                         >
//                           <label
//                             className={`absolute -top-2 left-2 bg-white px-1 text-[10px] font-bold uppercase tracking-wider ${errors[`${traveller.id}-nomineeName`] ? 'text-red-500' : 'text-gray-400'}`}
//                           >
//                             Nominee Name
//                           </label>
//                           <input
//                             type="text"
//                             placeholder="Legal Heir"
//                             value={traveller.nomineeName}
//                             onChange={(e) =>
//                               handleInputChange(traveller.id, 'nomineeName', e.target.value)
//                             }
//                             className="w-full text-xs font-bold text-gray-800 outline-none pt-0.5"
//                           />
//                         </div>
//                         {errors[`${traveller.id}-nomineeName`] && (
//                           <p className="text-[10px] text-red-500 font-semibold mt-1 pl-1">
//                             {errors[`${traveller.id}-nomineeName`]}
//                           </p>
//                         )}
//                       </div>

//                       <div>
//                         <div className="relative border border-gray-300 rounded focus-within:border-[#1D2B6B] transition-colors bg-white px-3 py-2">
//                           <label className="absolute -top-2 left-2 bg-white px-1 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
//                             Relationship
//                           </label>
//                           <select
//                             value={traveller.relationship}
//                             onChange={(e) =>
//                               handleInputChange(traveller.id, 'relationship', e.target.value)
//                             }
//                             className="w-full text-xs font-bold text-gray-800 bg-transparent outline-none pt-0.5 appearance-none cursor-pointer"
//                           >
//                             <option value="Legal Heir">Legal Heir</option>
//                             <option value="Spouse">Spouse</option>
//                             <option value="Parent">Parent</option>
//                             <option value="Child">Child</option>
//                           </select>
//                           <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none text-gray-400">
//                             ▼
//                           </div>
//                         </div>
//                       </div>

//                       <div>
//                         <div
//                           className={`relative border rounded bg-white px-3 py-2 transition-colors ${errors[`${traveller.id}-mobile`] ? 'border-red-500 focus-within:border-red-500' : 'border-gray-300 focus-within:border-[#1D2B6B]'}`}
//                         >
//                           <label
//                             className={`absolute -top-2 left-2 bg-white px-1 text-[10px] font-bold uppercase tracking-wider ${errors[`${traveller.id}-mobile`] ? 'text-red-500' : 'text-gray-400'}`}
//                           >
//                             Mobile Number
//                           </label>
//                           <input
//                             type="text"
//                             inputMode="numeric"
//                             placeholder="XXXXXXXXXX"
//                             value={traveller.mobile}
//                             onChange={(e) =>
//                               handleInputChange(traveller.id, 'mobile', e.target.value)
//                             }
//                             className="w-full text-xs font-bold text-gray-800 outline-none pt-0.5"
//                           />
//                         </div>
//                         {errors[`${traveller.id}-mobile`] && (
//                           <p className="text-[10px] text-red-500 font-semibold mt-1 pl-1">
//                             {errors[`${traveller.id}-mobile`]}
//                           </p>
//                         )}
//                       </div>

//                       <div>
//                         <div
//                           className={`relative border rounded bg-white px-3 py-2 transition-colors ${errors[`${traveller.id}-email`] ? 'border-red-500 focus-within:border-red-500' : 'border-gray-300 focus-within:border-[#1D2B6B]'}`}
//                         >
//                           <label
//                             className={`absolute -top-2 left-2 bg-white px-1 text-[10px] font-bold uppercase tracking-wider ${errors[`${traveller.id}-email`] ? 'text-red-500' : 'text-gray-400'}`}
//                           >
//                             Email ID
//                           </label>
//                           <input
//                             type="email"
//                             placeholder="test@gmail.com"
//                             value={traveller.email}
//                             onChange={(e) =>
//                               handleInputChange(traveller.id, 'email', e.target.value)
//                             }
//                             className="w-full text-xs font-bold text-gray-800 outline-none pt-0.5"
//                           />
//                         </div>
//                         {errors[`${traveller.id}-email`] && (
//                           <p className="text-[10px] text-red-500 font-semibold mt-1 pl-1">
//                             {errors[`${traveller.id}-email`]}
//                           </p>
//                         )}
//                       </div>
//                     </div>
//                   </div>
//                 </div>
//               );
//             })}

//             <button
//               onClick={addTraveller}
//               className="text-[#1D2B6B] hover:text-[#141E4B] font-bold text-xs uppercase tracking-wider flex items-center gap-1 py-1 transition mt-2"
//             >
//               <Plus size={14} className="stroke-[3px]" /> Add Another Traveller
//             </button>

//             <div>
//               <div
//                 className={`flex items-start gap-3 bg-white p-4 rounded-lg border shadow-sm mt-6 ${errors['declaration'] ? 'border-red-500 bg-red-50/10' : 'border-gray-200'}`}
//               >
//                 <input
//                   type="checkbox"
//                   checked={isAgreed}
//                   onChange={(e) => {
//                     setIsAgreed(e.target.checked);
//                     if (e.target.checked && errors['declaration']) {
//                       setErrors((prev) => {
//                         const c = { ...prev };
//                         delete c['declaration'];
//                         return c;
//                       });
//                     }
//                   }}
//                   className="mt-0.5 w-4 h-4 text-[#1D2B6B] border-gray-300 rounded focus:ring-0 cursor-pointer"
//                 />
//                 <p className="text-[11px] text-gray-500 leading-normal font-medium">
//                   I confirm that all passengers are Indian nationals between 0 to 70 years of age,
//                   have authorised me to add Insurance, and agree to the{' '}
//                   <Link
//                     to="/terms-and-conditions"
//                     className="text-blue-600 font-semibold hover:underline"
//                   >
//                     T&C
//                   </Link>
//                 </p>
//               </div>
//               {errors['declaration'] && (
//                 <p className="text-[10px] text-red-500 font-semibold mt-1 pl-1">
//                   {errors['declaration']}
//                 </p>
//               )}
//             </div>
//           </div>

//           <div className="lg:col-span-4 lg:sticky lg:top-6 space-y-6">
//             <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
//               <div className="bg-[#F8FAFC] px-4 py-3 border-b border-gray-200 font-bold text-xs text-gray-500 uppercase tracking-wider">
//                 Plan Summary
//               </div>

//               <div className="p-4 space-y-4">
//                 <div className="grid grid-cols-3 gap-2 pb-4 border-b border-gray-100">
//                   <div>
//                     <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wide mb-0.5">
//                       Destination
//                     </p>
//                     <p className="text-xs font-bold text-gray-800">Spain</p>
//                   </div>
//                   <div>
//                     <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wide mb-0.5">
//                       Start Date
//                     </p>
//                     <p className="text-xs font-bold text-gray-800">
//                       {reviewData?.isq?.sd || 'Nov 16, 2026'}
//                     </p>
//                   </div>
//                   <div>
//                     <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wide mb-0.5">
//                       End Date
//                     </p>
//                     <p className="text-xs font-bold text-gray-800">
//                       {reviewData?.isq?.ed || 'Nov 25, 2026'}
//                     </p>
//                   </div>
//                 </div>

//                 <div className="pt-1">
//                   <div className="flex justify-between items-center mb-2">
//                     <p className="text-xs font-bold text-gray-800">
//                       Plan for: Traveller 1 <span className="text-gray-400 font-normal">|</span>{' '}
//                       {travellers[0]?.dob
//                         ? calculateAgeAtEntry(
//                             travellers[0].dob,
//                             reviewData?.isq?.sd || new Date().toISOString(),
//                           )
//                         : '22'}{' '}
//                       yrs
//                     </p>
//                     <span className="text-[9px] text-gray-400 font-bold uppercase tracking-wider">
//                       Price
//                     </span>
//                   </div>

//                   <div className="border border-yellow-200 rounded-lg p-3 bg-gradient-to-r from-amber-50/70 to-orange-50/30 flex justify-between items-center relative overflow-hidden">
//                     <div>
//                       <div className="flex items-center gap-1">
//                         <span className="text-sm font-black text-[#1D2B6B] italic tracking-tighter">
//                           Klar
//                         </span>
//                         <span className="text-[10px] font-extrabold text-amber-600 bg-amber-100/80 px-1.5 py-0.5 rounded uppercase tracking-wider scale-90 origin-left">
//                           {selectedPlan?.tier || 'Gold Plus'}
//                         </span>
//                       </div>
//                       <p className="text-[9px] font-semibold text-slate-500 mt-1">
//                         24/7 Assistance | $100,000 Travel Cover
//                       </p>
//                     </div>

//                     <div className="text-right shrink-0">
//                       <p className="text-sm font-black text-slate-900">
//                         ₹{selectedPlan?.price?.toLocaleString() || '2,025'}
//                       </p>
//                       <p className="text-[8px] text-gray-400 font-medium">Inc. Gst</p>
//                       <div className="mt-1 bg-green-100 text-green-700 text-[8px] font-extrabold px-1.5 py-0.5 rounded-full inline-flex items-center gap-0.5">
//                         🪙 EARN ₹200*
//                       </div>
//                     </div>
//                   </div>
//                 </div>

//                 <div className="flex justify-between items-center bg-[#F8FAFC] px-3 py-3 rounded-lg border border-gray-200/60 mt-2">
//                   <span className="text-xs font-bold text-gray-700 flex items-center gap-1 cursor-pointer">
//                     Total <span className="text-[10px] text-gray-400">▼</span>
//                   </span>
//                   <span className="text-sm font-black text-slate-900">
//                     ₹{((selectedPlan?.price || 0) * (travellers.length || 1)).toLocaleString()}
//                   </span>
//                 </div>
//               </div>
//             </div>
//           </div>
//         </div>

//         <div className="flex justify-start gap-4 items-center mt-8 border-t border-gray-200 pt-6">
//           <button
//             onClick={() => navigate(-1)}
//             className="border border-[#1D2B6B] text-[#1D2B6B] hover:bg-gray-50 px-10 py-2.5 rounded font-bold text-xs uppercase tracking-widest min-w-[120px] transition"
//           >
//             Back
//           </button>
//           <button
//             disabled={isProcessing}
//             onClick={handleFinalSubmit}
//             className="bg-[#1D2B6B] hover:bg-[#152052] text-white px-10 py-2.5 rounded font-bold text-xs uppercase tracking-widest min-w-[140px] flex items-center justify-center gap-2 shadow-sm transition"
//           >
//             {isProcessing ? <Loader2 className="animate-spin" size={14} /> : 'Continue'}
//           </button>
//         </div>

//         <div className="mt-10 bg-white border border-gray-200 rounded-lg p-5 shadow-sm max-w-4xl">
//           <h3 className="text-xs font-bold text-gray-800 uppercase tracking-wider mb-2">
//             Disclaimers :
//           </h3>
//           <ul className="list-disc pl-4 space-y-1.5 text-[11px] text-gray-500 font-medium leading-relaxed">
//             <li>Agent earnings are on non-insurance products</li>
//             <li>Insurance is through a group master policy with Aditya Birla Health Insurance.</li>
//           </ul>
//         </div>
//       </div>
//     </div>
//   );
// };

// export default KlarTravellerDossier;














































import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { ChevronLeft, Trash2, Upload, Plus, FileText, Loader2, ArrowLeft } from 'lucide-react';
import { bookInsurancePlan } from '@/api/insuranceService.api';
import InsuranceNavbar from './InsuranceNavbar';
import { useAuth } from '@/features/authentication/hooks/useAuth';

// --- ISO Country Setup ---
import countries from 'i18n-iso-countries';
import enLocale from 'i18n-iso-countries/langs/en.json';
import { notifyError } from '@/utils/notify';
countries.registerLocale(enLocale);

const calculateAgeAtEntry = (dob: string, startDate: string) => {
  if (!dob) return 22;
  const birthDate = new Date(dob);
  const policyStart = new Date(startDate);
  let age = policyStart.getFullYear() - birthDate.getFullYear();
  const m = policyStart.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && policyStart.getDate() < birthDate.getDate())) {
    age--;
  }
  return age >= 0 ? age : 0;
};

interface TravellerData {
  id: number;
  firstName: string;
  lastName: string;
  dob: string;
  gender: 'Male' | 'Female' | '';
  passportNumber: string;
  nomineeName: string;
  relationship: string;
  mobile: string;
  email: string;
  passportFile: File | null;
  passportFileName?: string;
}

const KlarTravellerDossier: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated } = useAuth();

  // Fallback state trackers
  const [reviewData, setReviewDataState] = useState<any>(() => {
    if (location.state?.reviewData) return location.state.reviewData;
    const cached = sessionStorage.getItem('insurance_reviewData');
    return cached ? JSON.parse(cached) : null;
  });

  const [selectedPlan, setSelectedPlanState] = useState<any>(() => {
    if (location.state?.selectedPlan) return location.state.selectedPlan;
    const cached = sessionStorage.getItem('insurance_selectedPlan');
    return cached ? JSON.parse(cached) : null;
  });

  const [bookingId, setBookingIdState] = useState<string>(() => {
    if (location.state?.bookingId) return location.state.bookingId;
    return sessionStorage.getItem('insurance_bookingId') || '';
  });

  const [isProcessing, setIsProcessing] = useState(false);
  const [isAgreed, setIsAgreed] = useState(false);
  const [travellers, setTravellers] = useState<TravellerData[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Sync cache parameters on location changes
  useEffect(() => {
    if (location.state?.reviewData)
      sessionStorage.setItem('insurance_reviewData', JSON.stringify(location.state.reviewData));
    if (location.state?.selectedPlan)
      sessionStorage.setItem('insurance_selectedPlan', JSON.stringify(location.state.selectedPlan));
    if (location.state?.bookingId)
      sessionStorage.setItem('insurance_bookingId', location.state.bookingId);
  }, [location.state]);

  useEffect(() => {
    try {
      const pendingInsurance = sessionStorage.getItem('pendingInsuranceData');
      if (pendingInsurance) {
        const parsed = JSON.parse(pendingInsurance);
        const ageInMins = (Date.now() - new Date(parsed.timestamp).getTime()) / 60000;
        if (ageInMins < 10) {
          setTravellers(parsed.travellers || []);
          setIsAgreed(parsed.isAgreed || false);
          return;
        }
        sessionStorage.removeItem('pendingInsuranceData');
      }
    } catch (e) {
      console.error('Failed to restore insurance session state:', e);
    }
    const planInfo = reviewData?.iinfo?.pli?.[0]?.pi?.[0];
    const reviewTravellers = planInfo?.iti || reviewData?.isq?.iti || [];

    if (reviewTravellers.length > 0 && travellers.length === 0) {
      let searchedTravellers: any[] = [];
      try {
        const cachedSearchData = sessionStorage.getItem('insurance_initial_travellers');
        if (cachedSearchData) searchedTravellers = JSON.parse(cachedSearchData);
      } catch (err) {
        console.error('Failed to parse cached search details:', err);
      }

      const initialTravellers = reviewTravellers.map((rev: any, index: number) => {
        let calculatedDob = rev.dob || searchedTravellers[index]?.dob || '';

        if (!calculatedDob && (rev.age || searchedTravellers[index]?.age)) {
          const targetAge = rev.age || searchedTravellers[index]?.age;
          const refDate = reviewData?.isq?.sd ? new Date(reviewData.isq.sd) : new Date();
          const birthYear = refDate.getFullYear() - parseInt(targetAge);
          const month = String(refDate.getMonth() + 1).padStart(2, '0');
          const day = String(refDate.getDate()).padStart(2, '0');
          calculatedDob = `${birthYear}-${month}-${day}`;
        }

        return {
          id: index + 1,
          firstName: '',
          lastName: '',
          dob: calculatedDob,
          gender: rev.gen === 'M' ? 'Male' : rev.gen === 'F' ? 'Female' : '',
          passportNumber: '',
          nomineeName: '',
          relationship: 'Legal Heir',
          mobile: '',
          email: '',
          passportFile: null,
          age: rev.age || searchedTravellers[index]?.age || '22',
        };
      });
      setTravellers(initialTravellers);
    }
  }, [reviewData]);

  const handleInputChange = (id: number, field: keyof TravellerData, value: any) => {
    const errorKey = `${id}-${field}`;
    if (errors[errorKey]) {
      setErrors((prev) => {
        const copy = { ...prev };
        delete copy[errorKey];
        return copy;
      });
    }

    setTravellers((prev) =>
      prev.map((t) => {
        if (t.id !== id) return t;

        if (field === 'mobile') {
          const structuralDigits = value.replace(/\D/g, '');
          if (structuralDigits.length > 10) return t;
          return { ...t, [field]: structuralDigits };
        }

        // 🔸 ADD THIS CONTROL FOR PASSPORT NUMBER FIELD
        if (field === 'passportNumber') {
          // Enforce upper-case, strip characters that are not letters or numbers, and cap length at 8
          const cleanPassport = value.toUpperCase().replace(/[^A-Z0-9]/g, '');
          if (cleanPassport.length > 8) return t;
          return { ...t, [field]: cleanPassport };
        }

        return { ...t, [field]: value };
      }),
    );
  };

  const handleFileUpload = (id: number, file: File | undefined) => {
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      setErrors((prev) => ({ ...prev, [`${id}-passportFile`]: 'File size exceeds 2MB limit.' }));
      return;
    }

    setErrors((prev) => {
      const copy = { ...prev };
      delete copy[`${id}-passportFile`];
      return copy;
    });

    setTravellers((prev) =>
      prev.map((t) =>
        t.id === id ? { ...t, passportFile: file, passportFileName: file.name } : t,
      ),
    );
  };

  const addTraveller = () => {
    setTravellers([
      ...travellers,
      {
        id: Date.now(),
        firstName: '',
        lastName: '',
        dob: '',
        gender: '',
        passportNumber: '',
        nomineeName: '',
        relationship: 'Legal Heir',
        mobile: '',
        email: '',
        passportFile: null,
      },
    ]);
  };

  const removeTraveller = (id: number) => {
    if (travellers.length > 1) {
      setTravellers(travellers.filter((t) => t.id !== id));
      setErrors((prev) => {
        const nextErrors = { ...prev };
        Object.keys(nextErrors).forEach((key) => {
          if (key.startsWith(`${id}-`)) delete nextErrors[key];
        });
        return nextErrors;
      });
    }
  };

  const handleFinalSubmit = async () => {
    const nextErrors: Record<string, string> = {};
    let hasValidationError = false;

    if (!isAgreed) {
      nextErrors['declaration'] = 'Please confirm the declaration to continue.';
      hasValidationError = true;
    }

    for (const t of travellers) {
      if (!t.firstName) {
        nextErrors[`${t.id}-firstName`] = 'First name is required.';
        hasValidationError = true;
      }
      if (!t.lastName) {
        nextErrors[`${t.id}-lastName`] = 'Last name is required.';
        hasValidationError = true;
      }
      if (!t.dob) {
        nextErrors[`${t.id}-dob`] = 'Date of birth is required.';
        hasValidationError = true;
      }
      if (!t.gender) {
        nextErrors[`${t.id}-gender`] = 'Gender selection is required.';
        hasValidationError = true;
      }
      const passportRegex = /^[A-Z][0-9]{7}$/;
  if (!t.passportNumber) {
    nextErrors[`${t.id}-passportNumber`] = 'Passport number is required.';
    hasValidationError = true;
  } else if (!passportRegex.test(t.passportNumber)) {
    nextErrors[`${t.id}-passportNumber`] = 'Invalid passport format. Must be 1 capital letter followed by 7 digits (e.g., Z1234567).';
    hasValidationError = true;
  }
      if (!t.nomineeName) {
        nextErrors[`${t.id}-nomineeName`] = 'Nominee name is required.';
        hasValidationError = true;
      }

      if (!t.mobile) {
        nextErrors[`${t.id}-mobile`] = 'Mobile number is required.';
        hasValidationError = true;
      } else if (t.mobile.length !== 10) {
        nextErrors[`${t.id}-mobile`] = 'Must be exactly 10 digits.';
        hasValidationError = true;
      }

      if (!t.email) {
        nextErrors[`${t.id}-email`] = 'Email address is required.';
        hasValidationError = true;
      } else if (!/\S+@\S+\.\S+/.test(t.email)) {
        nextErrors[`${t.id}-email`] = 'Please enter a valid email.';
        hasValidationError = true;
      }
    }

    if (hasValidationError) {
      setErrors(nextErrors);
      const firstErrorElement = document.querySelector('.text-red-500');
      if (firstErrorElement) {
        firstErrorElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      return;
    }

    setIsProcessing(true);

    const planInfo = reviewData?.iinfo?.pli?.[0]?.pi?.[0];
    const plid = reviewData?.iinfo?.pli?.[0]?.plid;
    const reviewTravellers = planInfo?.iti || [];
    let totalAmountFromReview = 0;

    reviewTravellers.forEach((traveller: any) => {
      const fare = traveller?.fd?.ifc?.TF || traveller?.fd?.ifc?.SP || 0;
      totalAmountFromReview += fare;
    });

    const finalAmount = totalAmountFromReview || planInfo?.ptf || 0;

    if (travellers.length !== reviewTravellers.length) {
      notifyError(`Amount Mismatch: This plan was reviewed for ${reviewTravellers.length} traveller(s).`);
      setIsProcessing(false);
      return;
    }

    const payload = {
      bookingId: reviewData?.bid || bookingId,
      source: 'B2C_PORTAL',
      ict: reviewData?.isq?.ict || 'International',
      paymentInfos: [{ paymentMedium: 'WALLET', amount: finalAmount }],
      pli: [
        {
          plid: plid,
          pi: [
            {
              pid: planInfo?.pid,
              iti: travellers.map((t, index) => {
                const reviewedAge = reviewData?.isq?.iti?.[index]?.age;
                const calculatedAge = calculateAgeAtEntry(
                  t.dob,
                  reviewData?.isq?.sd || new Date().toISOString(),
                );

                return {
                  id: index + 1,
                  dob: t.dob,
                  age: Number(reviewedAge || calculatedAge),
                  fn: t.firstName.trim().toUpperCase(),
                  ln: t.lastName.trim().toUpperCase(),
                  eid: t.email.trim(),
                  pnum: t.passportNumber.trim().toUpperCase(),
                  fd: planInfo?.iti?.[index]?.fd,
                  pincode: '500001',
                  gen: t.gender === 'Male' ? 'M' : 'F',
                  sc: { c: 'Higher Education' },
                  si: { n: 'Institute of Technology' },
                  ni: [{ nn: t.nomineeName.trim(), nr: t.relationship }],
                };
              }),
            },
          ],
        },
      ],
      deliveryInfo: {
        emails: [travellers[0].email.trim()],
        contacts: [travellers[0].mobile.trim()],
      },
    };

    try {
      sessionStorage.setItem('insurance_pending_dossier_payload', JSON.stringify(payload));

      navigate('/insurance/before-booking-confirmation', {
        state: {
          bookingPayload: payload,
          amount: finalAmount,
          selectedPlan: selectedPlan,
          reviewData: reviewData,
          rawTravellers: travellers,
          bookingId: reviewData?.bid || bookingId,
          formattedDestination: formattedDestination,
        },
      });
    } catch (error: any) {
      console.log('KlarTravellerDossier Preparation error:', error);
      notifyError('Something went wrong during preparation.');
    } finally {
      setIsProcessing(false);
    }
  };

  const destinationCountryCode =
    reviewData?.body?.isq?.isc?.iri?.[0]?.rkey || reviewData?.isq?.isc?.iri?.[0]?.rkey || '';

  let formattedDestination = 'International';
  if (destinationCountryCode) {
    const fullCountryName = countries.getName(destinationCountryCode, 'en');
    formattedDestination = fullCountryName
      ? `${fullCountryName} (${destinationCountryCode})`
      : destinationCountryCode;
  }

  if (!selectedPlan) {
    return <div className="p-20 text-center">Invalid Session. Please start a new search.</div>;
  }

  const handleLoginRedirect = () => {
    // Save current location so the auth router can redirect back here after success
    sessionStorage.setItem('redirectAfterLogin', window.location.pathname);
    navigate('/b2b', {
      state: {
        from: window.location.pathname,
        message: 'Please login to continue with your insurance booking',
      },
    });
  };

  return (
    <div className="min-h-screen bg-[#F4F6F9] pb-20 font-sans text-[#1A2B3D]">
      <InsuranceNavbar />

      <section className="bg-[#1D2B6B] text-white px-4 py-6 md:px-8 md:py-8 shadow-inner">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-xl md:text-2xl font-bold tracking-normal">Passenger Details</h1>
        </div>
      </section>

      {/* {!isAuthenticated && (
        <div className="w-full max-w-7xl mx-auto px-4 mt-6">
          <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded-md shadow-sm">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                <span className="text-xl mt-0.5">🔒</span>
                <div>
                  <h3 className="text-amber-800 font-semibold text-base">
                    You have not logged in yet
                  </h3>
                  <p className="text-amber-700 text-xs mt-0.5">
                    Please log in first to proceed with filling traveller details and complete your
                    booking.
                  </p>
                </div>
              </div>
              <button
                onClick={handleLoginRedirect}
                className="px-5 py-2 bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold uppercase tracking-wider rounded transition-colors duration-200 shadow-sm whitespace-nowrap"
              >
                Login Now
              </button>
            </div>
          </div>
        </div>
      )} */}

      <div className="max-w-7xl mx-auto px-4 py-6 md:py-8">
        <nav className="flex items-center gap-1.5 text-xs text-gray-500 mb-6">
          <ArrowLeft
            size={14}
            className="text-gray-400 cursor-pointer"
            onClick={() => navigate(-1)}
          />
          <span
            onClick={() => navigate('/')}
            className="hover:text-[#1D2B6B] transition cursor-pointer"
          >
            Home
          </span>
          <span className="text-gray-300">›</span>
          <span
            onClick={() => navigate(-1)}
            className="hover:text-[#1D2B6B] transition cursor-pointer"
          >
            Select insurance
          </span>
          <span className="text-gray-300">›</span>
          <span className="text-gray-800 font-medium">Add Traveller details</span>
        </nav>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-8 space-y-6">
            {travellers.map((traveller, index) => {
              const currentAge = traveller.dob
                ? calculateAgeAtEntry(
                    traveller.dob,
                    reviewData?.isq?.sd || new Date().toISOString(),
                  )
                : (traveller as any).age || '22';

              return (
                <div
                  key={traveller.id}
                  className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden"
                >
                  <div className="bg-[#F8FAFC] px-5 py-3.5 flex justify-between items-center border-b border-gray-200/80">
                    <h2 className="font-bold text-xs md:text-sm text-gray-800 tracking-wide">
                      Traveller {index + 1}{' '}
                      <span className="text-gray-400 font-normal mx-1">|</span>{' '}
                      <span className="text-gray-500 font-medium text-xs">{currentAge} Yrs</span>
                    </h2>
                    {index > 0 && (
                      <button
                        onClick={() => removeTraveller(traveller.id)}
                        className="text-gray-400 hover:text-red-500 transition"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>

                  <div className="p-5 md:p-6 space-y-6">
                    <div>
                      <div
                        className={`flex flex-col sm:flex-row items-center gap-4 p-4 border border-dashed rounded-lg bg-[#FAFBFD] ${errors[`${traveller.id}-passportFile`] ? 'border-red-500 bg-red-50/20' : 'border-gray-300'}`}
                      >
                        <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center text-gray-400 shrink-0">
                          <FileText size={20} />
                        </div>
                        <div className="flex-1 text-center sm:text-left">
                          <p className="text-xs font-bold text-gray-700">
                            {traveller.passportFile
                              ? traveller.passportFile.name
                              : traveller.passportFileName || 'Upload Passport(Optional)'}
                          </p>
                          <p className="text-[10px] text-gray-400 font-medium mt-0.5">
                            PNG, JPG, PDF | Size &lt; 2MB
                          </p>
                        </div>
                        <label className="bg-[#1D2B6B] hover:bg-[#152052] text-white px-5 py-2 rounded text-[11px] font-bold cursor-pointer tracking-wider flex items-center gap-1.5 transition uppercase shadow-sm">
                          <Upload size={13} /> Upload
                          <input
                            type="file"
                            accept=".png,.jpg,.jpeg,.pdf"
                            className="hidden"
                            onChange={(e) => handleFileUpload(traveller.id, e.target.files?.[0])}
                          />
                        </label>
                      </div>
                      {errors[`${traveller.id}-passportFile`] && (
                        <p className="text-[10px] text-red-500 font-semibold mt-1 pl-1">
                          {errors[`${traveller.id}-passportFile`]}
                        </p>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-5 gap-y-5">
                      <div>
                        <div
                          className={`relative border rounded bg-white px-3 py-2 transition-colors ${errors[`${traveller.id}-firstName`] ? 'border-red-500 focus-within:border-red-500' : 'border-gray-300 focus-within:border-[#1D2B6B]'}`}
                        >
                          <label
                            className={`absolute -top-2 left-2 bg-white px-1 text-[10px] font-bold uppercase tracking-wider ${errors[`${traveller.id}-firstName`] ? 'text-red-500' : 'text-gray-400'}`}
                          >
                            First Name *
                          </label>
                          <input
                            type="text"
                            placeholder="FIRST NAME"
                            value={traveller.firstName}
                            onChange={(e) =>
                              handleInputChange(
                                traveller.id,
                                'firstName',
                                e.target.value.toUpperCase(),
                              )
                            }
                            className="w-full text-xs font-bold text-gray-800 uppercase outline-none pt-0.5"
                          />
                        </div>
                        {errors[`${traveller.id}-firstName`] && (
                          <p className="text-[10px] text-red-500 font-semibold mt-1 pl-1">
                            {errors[`${traveller.id}-firstName`]}
                          </p>
                        )}
                      </div>

                      <div>
                        <div
                          className={`relative border rounded bg-white px-3 py-2 transition-colors ${errors[`${traveller.id}-lastName`] ? 'border-red-500 focus-within:border-red-500' : 'border-gray-300 focus-within:border-[#1D2B6B]'}`}
                        >
                          <label
                            className={`absolute -top-2 left-2 bg-white px-1 text-[10px] font-bold uppercase tracking-wider ${errors[`${traveller.id}-lastName`] ? 'text-red-500' : 'text-gray-400'}`}
                          >
                            Last Name *
                          </label>
                          <input
                            type="text"
                            placeholder="LAST NAME"
                            value={traveller.lastName}
                            onChange={(e) =>
                              handleInputChange(
                                traveller.id,
                                'lastName',
                                e.target.value.toUpperCase(),
                              )
                            }
                            className="w-full text-xs font-bold text-gray-800 uppercase outline-none pt-0.5"
                          />
                        </div>
                        {errors[`${traveller.id}-lastName`] && (
                          <p className="text-[10px] text-red-500 font-semibold mt-1 pl-1">
                            {errors[`${traveller.id}-lastName`]}
                          </p>
                        )}
                      </div>

                      <div>
                        <div
                          className={`flex items-center gap-4 px-1 min-h-[42px] border rounded ${errors[`${traveller.id}-gender`] ? 'border-red-500 bg-red-50/10' : 'border-transparent'}`}
                        >
                          <span
                            className={`text-[10px] font-bold uppercase tracking-wider min-w-[50px] ${errors[`${traveller.id}-gender`] ? 'text-red-500' : 'text-gray-400'}`}
                          >
                            Gender *
                          </span>
                          <div className="flex gap-6">
                            {['Male', 'Female'].map((g) => (
                              <label
                                key={g}
                                className="flex items-center gap-2 cursor-pointer group"
                              >
                                <input
                                  type="radio"
                                  name={`gender-${traveller.id}`}
                                  checked={traveller.gender === g}
                                  onChange={() => handleInputChange(traveller.id, 'gender', g)}
                                  className="w-4 h-4 text-[#1D2B6B] border-gray-300 focus:ring-0"
                                />
                                <span className="text-xs font-bold text-gray-700 group-hover:text-black">
                                  {g}
                                </span>
                              </label>
                            ))}
                          </div>
                        </div>
                        {errors[`${traveller.id}-gender`] && (
                          <p className="text-[10px] text-red-500 font-semibold mt-1 pl-1">
                            {errors[`${traveller.id}-gender`]}
                          </p>
                        )}
                      </div>

                      <div>
                        <div
                          className={`relative border rounded bg-white px-3 py-2 transition-colors ${errors[`${traveller.id}-dob`] ? 'border-red-500 focus-within:border-red-500' : 'border-gray-300 focus-within:border-[#1D2B6B]'}`}
                        >
                          <label
                            className={`absolute -top-2 left-2 bg-white px-1 text-[10px] font-bold uppercase tracking-wider ${errors[`${traveller.id}-dob`] ? 'text-red-500' : 'text-gray-400'}`}
                          >
                            Date of Birth *
                          </label>
                          <input
                            type="date"
                            value={traveller.dob}
                            onChange={(e) => handleInputChange(traveller.id, 'dob', e.target.value)}
                            className="w-full text-xs font-bold text-gray-800 outline-none pt-0.5"
                          />
                        </div>
                        {errors[`${traveller.id}-dob`] && (
                          <p className="text-[10px] text-red-500 font-semibold mt-1 pl-1">
                            {errors[`${traveller.id}-dob`]}
                          </p>
                        )}
                      </div>

                      <div>
                        <div
                          className={`relative border rounded bg-white px-3 py-2 transition-colors ${errors[`${traveller.id}-passportNumber`] ? 'border-red-500 focus-within:border-red-500' : 'border-gray-300 focus-within:border-[#1D2B6B]'}`}
                        >
                          <label
                            className={`absolute -top-2 left-2 bg-white px-1 text-[10px] font-bold uppercase tracking-wider ${errors[`${traveller.id}-passportNumber`] ? 'text-red-500' : 'text-gray-400'}`}
                          >
                            Passport Number *
                          </label>
                          <input
                            type="text"
                            placeholder="XXXXXXXX"
                            value={traveller.passportNumber}
                            onChange={(e) =>
                              handleInputChange(
                                traveller.id,
                                'passportNumber',
                                e.target.value.toUpperCase(),
                              )
                            }
                            className="w-full text-xs font-bold text-gray-800 uppercase tracking-wider outline-none pt-0.5"
                          />
                        </div>
                        {errors[`${traveller.id}-passportNumber`] && (
                          <p className="text-[10px] text-red-500 font-semibold mt-1 pl-1">
                            {errors[`${traveller.id}-passportNumber`]}
                          </p>
                        )}
                      </div>

                      <div>
                        <div
                          className={`relative border rounded bg-white px-3 py-2 transition-colors ${errors[`${traveller.id}-nomineeName`] ? 'border-red-500 focus-within:border-red-500' : 'border-gray-300 focus-within:border-[#1D2B6B]'}`}
                        >
                          <label
                            className={`absolute -top-2 left-2 bg-white px-1 text-[10px] font-bold uppercase tracking-wider ${errors[`${traveller.id}-nomineeName`] ? 'text-red-500' : 'text-gray-400'}`}
                          >
                            Nominee Name *
                          </label>
                          <input
                            type="text"
                            placeholder="Legal Heir"
                            value={traveller.nomineeName}
                            onChange={(e) =>
                              handleInputChange(traveller.id, 'nomineeName', e.target.value)
                            }
                            className="w-full text-xs font-bold text-gray-800 outline-none pt-0.5"
                          />
                        </div>
                        {errors[`${traveller.id}-nomineeName`] && (
                          <p className="text-[10px] text-red-500 font-semibold mt-1 pl-1">
                            {errors[`${traveller.id}-nomineeName`]}
                          </p>
                        )}
                      </div>

                      <div>
                        <div className="relative border border-gray-300 rounded focus-within:border-[#1D2B6B] transition-colors bg-white px-3 py-2">
                          <label className="absolute -top-2 left-2 bg-white px-1 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                            Relationship *
                          </label>
                          <select
                            value={traveller.relationship}
                            onChange={(e) =>
                              handleInputChange(traveller.id, 'relationship', e.target.value)
                            }
                            className="w-full text-xs font-bold text-gray-800 bg-transparent outline-none pt-0.5 appearance-none cursor-pointer"
                          >
                            <option value="Legal Heir">Legal Heir</option>
                            <option value="Spouse">Spouse</option>
                            <option value="Parent">Parent</option>
                            <option value="Child">Child</option>
                          </select>
                          <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none text-gray-400">
                            ▼
                          </div>
                        </div>
                      </div>

                      <div>
                        <div
                          className={`relative border rounded bg-white px-3 py-2 transition-colors ${errors[`${traveller.id}-mobile`] ? 'border-red-500 focus-within:border-red-500' : 'border-gray-300 focus-within:border-[#1D2B6B]'}`}
                        >
                          <label
                            className={`absolute -top-2 left-2 bg-white px-1 text-[10px] font-bold uppercase tracking-wider ${errors[`${traveller.id}-mobile`] ? 'text-red-500' : 'text-gray-400'}`}
                          >
                            Mobile Number *
                          </label>
                          <input
                            type="text"
                            inputMode="numeric"
                            placeholder="XXXXXXXXXX"
                            value={traveller.mobile}
                            onChange={(e) =>
                              handleInputChange(traveller.id, 'mobile', e.target.value)
                            }
                            className="w-full text-xs font-bold text-gray-800 outline-none pt-0.5"
                          />
                        </div>
                        {errors[`${traveller.id}-mobile`] && (
                          <p className="text-[10px] text-red-500 font-semibold mt-1 pl-1">
                            {errors[`${traveller.id}-mobile`]}
                          </p>
                        )}
                      </div>

                      <div>
                        <div
                          className={`relative border rounded bg-white px-3 py-2 transition-colors ${errors[`${traveller.id}-email`] ? 'border-red-500 focus-within:border-red-500' : 'border-gray-300 focus-within:border-[#1D2B6B]'}`}
                        >
                          <label
                            className={`absolute -top-2 left-2 bg-white px-1 text-[10px] font-bold uppercase tracking-wider ${errors[`${traveller.id}-email`] ? 'text-red-500' : 'text-gray-400'}`}
                          >
                            Email ID *
                          </label>
                          <input
                            type="email"
                            placeholder="test@gmail.com"
                            value={traveller.email}
                            onChange={(e) =>
                              handleInputChange(traveller.id, 'email', e.target.value)
                            }
                            className="w-full text-xs font-bold text-gray-800 outline-none pt-0.5"
                          />
                        </div>
                        {errors[`${traveller.id}-email`] && (
                          <p className="text-[10px] text-red-500 font-semibold mt-1 pl-1">
                            {errors[`${traveller.id}-email`]}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}

            <button
              onClick={addTraveller}
              className="text-[#1D2B6B] hover:text-[#141E4B] font-bold text-xs uppercase tracking-wider flex items-center gap-1 py-1 transition mt-2"
            >
              <Plus size={14} className="stroke-[3px]" /> Add Another Traveller
            </button>

            <div>
              <div
                className={`flex items-start gap-3 bg-white p-4 rounded-lg border shadow-sm mt-6 ${errors['declaration'] ? 'border-red-500 bg-red-50/10' : 'border-gray-200'}`}
              >
                <input
                  type="checkbox"
                  checked={isAgreed}
                  onChange={(e) => {
                    setIsAgreed(e.target.checked);
                    if (e.target.checked && errors['declaration']) {
                      setErrors((prev) => {
                        const c = { ...prev };
                        delete c['declaration'];
                        return c;
                      });
                    }
                  }}
                  className="mt-0.5 w-4 h-4 text-[#1D2B6B] border-gray-300 rounded focus:ring-0 cursor-pointer"
                />
                <p className="text-[11px] text-gray-500 leading-normal font-medium">
                  I confirm that all passengers are Indian nationals between 0 to 70 years of age,
                  have authorised me to add Insurance, and agree to the{' '}
                  <Link
                    to="/terms-and-conditions"
                    className="text-blue-600 font-semibold hover:underline"
                  >
                    T&C
                  </Link>
                </p>
              </div>
              {errors['declaration'] && (
                <p className="text-[10px] text-red-500 font-semibold mt-1 pl-1">
                  {errors['declaration']}
                </p>
              )}
            </div>
          </div>
          <div className="lg:col-span-4 lg:sticky lg:top-6 space-y-4">
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="bg-[#F8FAFC] px-4 py-3 border-b border-gray-200 font-bold text-xs text-gray-500 uppercase tracking-wider">
                Plan Summary
              </div>

              <div className="p-4 space-y-4">
                <div className="grid grid-cols-3 gap-2 pb-4 border-b border-gray-100">
                  <div>
                    <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wide mb-0.5">
                      Destination
                    </p>
                    <p
                      className="text-xs font-bold text-gray-800 truncate"
                      title={formattedDestination}
                    >
                      {formattedDestination}
                    </p>
                  </div>
                  <div>
                    <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wide mb-0.5">
                      Start Date
                    </p>
                    <p className="text-xs font-bold text-gray-800">
                      {reviewData?.isq?.sd || 'Nov 16, 2026'}
                    </p>
                  </div>
                  <div>
                    <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wide mb-0.5">
                      End Date
                    </p>
                    <p className="text-xs font-bold text-gray-800">
                      {reviewData?.isq?.ed || 'Nov 25, 2026'}
                    </p>
                  </div>
                </div>

                <div className="pt-1 space-y-4">
                  {(reviewData?.iinfo?.pli?.[0]?.pi?.[0]?.iti || reviewData?.isq?.iti || [{}]).map(
                    (revTraveller: any, idx: number) => {
                      const structuralAge = travellers[idx]?.dob
                        ? calculateAgeAtEntry(
                            travellers[idx].dob,
                            reviewData?.isq?.sd || new Date().toISOString(),
                          )
                        : revTraveller?.age || '22';

                      const singlePassengerPrice =
                        revTraveller?.fd?.ifc?.TF ||
                        revTraveller?.fd?.ifc?.SP ||
                        selectedPlan?.price ||
                        0;

                      return (
                        <div key={idx} className="space-y-2">
                          <div className="flex justify-between items-center">
                            <p className="text-xs font-bold text-gray-800">
                              Plan for: Traveller {idx + 1}{' '}
                              <span className="text-gray-400 font-normal">|</span> {structuralAge}{' '}
                              yrs
                            </p>
                            {idx === 0 && (
                              <span className="text-[9px] text-gray-400 font-bold uppercase tracking-wider">
                                Price
                              </span>
                            )}
                          </div>

                          <div className="border border-yellow-200 rounded-lg p-3 bg-gradient-to-r from-amber-50/70 to-orange-50/30 flex justify-between items-center relative overflow-hidden">
                            <div className="w-full">
                              <div className="flex items-center gap-1">
                                <span className="text-sm font-black text-[#1D2B6B] italic tracking-tighter">
                                  Klar
                                </span>
                                <span className="text-[10px] font-extrabold text-amber-600 bg-amber-100/80 px-1.5 py-0.5 rounded uppercase tracking-wider scale-90 origin-left">
                                  {reviewData?.iinfo?.pli?.[0]?.pi?.[0]?.pi ||
                                    selectedPlan?.tier ||
                                    selectedPlan?.name ||
                                    'Gold Plus'}
                                </span>
                              </div>
                              <p className="text-[9px] font-semibold text-slate-500 mt-1">
                                24/7 Assistance |{' '}
                                {reviewData?.iinfo?.pli?.[0]?.pi?.[0]?.pn ||
                                  selectedPlan?.travelCoverAmount ||
                                  '$100,000'}{' '}
                                Travel Cover
                              </p>

                              {/* --- DYNAMIC BENEFITS RENDER PIPELINE --- */}
                              {selectedPlan?.benefits && selectedPlan.benefits.length > 0 && (
                                <div className="mt-2 pt-2 border-t border-amber-200/60 max-h-[100px] overflow-y-auto space-y-1 pr-1 scrollbar-thin">
                                  {selectedPlan.benefits
                                    .slice(0, 6)
                                    .map((benefit: string, bIdx: number) => (
                                      <p
                                        key={bIdx}
                                        className="text-[9px] text-gray-600 font-medium flex items-center gap-1"
                                      >
                                        • {benefit}
                                      </p>
                                    ))}
                                </div>
                              )}
                            </div>

                            <div className="text-right shrink-0 self-start">
                              <p className="text-sm font-black text-slate-900">
                                ₹{singlePassengerPrice.toLocaleString()}
                              </p>
                              <p className="text-[8px] text-gray-400 font-medium">Inc. Gst</p>
                            </div>
                          </div>
                        </div>
                      );
                    },
                  )}
                </div>

                {/* Removed dropdown arrow text from Total layout card block */}
                <div className="flex justify-between items-center bg-[#F8FAFC] px-3 py-3 rounded-lg border border-gray-200/60 mt-2">
                  <span className="text-xs font-bold text-gray-700">Total</span>
                  <span className="text-sm font-black text-slate-900">
                    ₹{((selectedPlan?.price || 0) * (travellers.length || 1)).toLocaleString()}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex w-full gap-3 pt-2">
              <button
                onClick={() => navigate(-1)}
                className="w-1/2 border border-[#1D2B6B] text-[#1D2B6B] hover:bg-gray-50 py-3 rounded font-bold text-xs uppercase tracking-widest transition text-center"
              >
                Back
              </button>
              <button
                disabled={isProcessing}
                onClick={handleFinalSubmit}
                className={`w-1/2 text-white py-3 rounded font-bold text-xs uppercase tracking-widest flex items-center justify-center gap-2 shadow-sm transition ${
                
                     'bg-[#1D2B6B] hover:bg-[#152052] cursor-pointer'
                }`}
              >
                {isProcessing ? <Loader2 className="animate-spin" size={14} /> : 'Continue'}
              </button>
            </div>
          </div>
        </div>
        <div className="mt-10 bg-white border border-gray-200 rounded-lg p-5 shadow-sm max-w-4xl">
          <h3 className="text-xs font-bold text-gray-800 uppercase tracking-wider mb-2">
            Disclaimers :
          </h3>
          <ul className="list-disc pl-4 space-y-1.5 text-[11px] text-gray-500 font-medium leading-relaxed">
            <li>Agent earnings are on non-insurance products</li>
            <li>Insurance is through a group master policy with Aditya Birla Health Insurance.</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default KlarTravellerDossier;
