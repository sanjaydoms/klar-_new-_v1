// import React, { useState } from 'react';
// import {
//   X,
//   Mail,
//   Lock,
//   User,
//   Phone,
//   Building2,
//   MapPin,
//   Briefcase,
//   Loader2,
//   Send,
//   Building,
//   CreditCard,
// } from 'lucide-react';
// import { createCompany, verifyCreateCompany } from '@/api/auth.api';
// import { CreateCompanyPayload, VerifyCreateCompanyPayload } from '@/types/auth.type';

// interface CreateCompanyModalProps {
//   isOpen: boolean;
//   onClose: () => void;
//   onCreate: (company: any) => void;
// }

// export const CreateCompanyModal: React.FC<CreateCompanyModalProps> = ({
//   isOpen,
//   onClose,
//   onCreate,
// }) => {
//   const [step, setStep] = useState<'form' | 'otp'>('form');
//   const [formData, setFormData] = useState({
//     businessName: '',
//     businessType: '',
//     contactPerson: '',
//     businessEmail: '',
//     businessMobile: '',
//     password: '',
//     confirmPassword: '',
//     gstNumber: '',
//     panNumber: '',
//     address: '',
//     city: '',
//     country: 'India',
//     limit: '',
//   });
//   const [otp, setOtp] = useState('');
//   const [isLoading, setIsLoading] = useState(false);
//   const [errors, setErrors] = useState<Record<string, string>>({});
//   const [apiError, setApiError] = useState<string | null>(null);

//   const handleChange = (
//     e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>,
//   ) => {
//     const { name, value } = e.target;
//     setFormData((prev) => ({ ...prev, [name]: value }));
//     if (errors[name]) {
//       setErrors((prev) => ({ ...prev, [name]: '' }));
//     }
//     setApiError(null);
//   };

//   const validateForm = () => {
//     const newErrors: Record<string, string> = {};

//     if (!formData.businessName.trim()) {
//       newErrors.businessName = 'Business name is required';
//     }

//     if (!formData.businessType.trim()) {
//       newErrors.businessType = 'Business type is required';
//     }

//     if (!formData.contactPerson.trim()) {
//       newErrors.contactPerson = 'Contact person name is required';
//     }

//     if (!formData.businessEmail.trim()) {
//       newErrors.businessEmail = 'Email is required';
//     } else if (!/\S+@\S+\.\S+/.test(formData.businessEmail)) {
//       newErrors.businessEmail = 'Please enter a valid email';
//     }

//     if (!formData.businessMobile.trim()) {
//       newErrors.businessMobile = 'Mobile number is required';
//     } else if (!/^[0-9]{10}$/.test(formData.businessMobile.replace(/\D/g, ''))) {
//       newErrors.businessMobile = 'Please enter a valid 10-digit mobile number';
//     }

//     if (!formData.address.trim()) {
//       newErrors.address = 'Address is required';
//     }

//     if (!formData.city.trim()) {
//       newErrors.city = 'City is required';
//     }

//     if (!formData.country.trim()) {
//       newErrors.country = 'Country is required';
//     }

//     if (!formData.password) {
//       newErrors.password = 'Password is required';
//     } else if (formData.password.length < 6) {
//       newErrors.password = 'Password must be at least 6 characters';
//     }

//     if (formData.password !== formData.confirmPassword) {
//       newErrors.confirmPassword = 'Passwords do not match';
//     }

//     // Validate limit if provided
//     if (formData.limit) {
//       const limitNum = parseFloat(formData.limit);
//       if (isNaN(limitNum) || limitNum < 0) {
//         newErrors.limit = 'Please enter a valid positive number';
//       }
//     }

//     setErrors(newErrors);
//     return Object.keys(newErrors).length === 0;
//   };

//   const handleSendOTP = async () => {
//     if (!validateForm()) return;

//     setIsLoading(true);
//     setApiError(null);

//     try {
//       const payload: CreateCompanyPayload = {
//         businessName: formData.businessName,
//         businessType: formData.businessType,
//         contactPerson: formData.contactPerson,
//         businessEmail: formData.businessEmail,
//         businessMobile: formData.businessMobile,
//         password: formData.password,
//         address: formData.address,
//         city: formData.city,
//         country: formData.country,

//         ...(formData.gstNumber?.trim() && {
//           gstNumber: formData.gstNumber.trim(),
//         }),

//         ...(formData.panNumber?.trim() && {
//           panNumber: formData.panNumber.trim(),
//         }),

//         ...(formData.limit && {
//           limit: parseFloat(formData.limit),
//         }),
//       };

//       const response = await createCompany(payload);

//       if (response.data.success) {
//         setStep('otp');
//       } else {
//         setApiError(response.data.message || 'Failed to send OTP');
//       }
//     } catch (error: any) {
//       console.error('Send OTP failed:', error);
//       setApiError(
//         error.response?.data?.message || error.message || 'Failed to send OTP. Please try again.',
//       );
//     } finally {
//       setIsLoading(false);
//     }
//   };

//   const handleVerifyAndCreate = async () => {
//     if (!otp.trim()) {
//       setErrors({ otp: 'OTP is required' });
//       return;
//     }

//     setIsLoading(true);
//     setApiError(null);

//     try {
//       const payload: VerifyCreateCompanyPayload = {
//         businessName: formData.businessName,
//         businessType: formData.businessType,
//         contactPerson: formData.contactPerson,
//         businessEmail: formData.businessEmail,
//         businessMobile: formData.businessMobile,
//         password: formData.password,
//         address: formData.address,
//         city: formData.city,
//         country: formData.country,
//         otp: otp.trim(),

//         ...(formData.gstNumber && {
//           gstNumber: formData.gstNumber,
//         }),

//         ...(formData.panNumber && {
//           panNumber: formData.panNumber,
//         }),

//         ...(formData.limit && {
//           limit: parseFloat(formData.limit),
//         }),
//       };

//       const response = await verifyCreateCompany(payload);

//       if (response.data.success) {
//         onCreate(response.data.data);
//         handleClose();
//       } else {
//         setApiError(response.data.message || 'Failed to verify OTP and create company');
//       }
//     } catch (error: any) {
//       console.error('Verify OTP failed:', error);
//       setApiError(
//         error.response?.data?.message || error.message || 'Failed to verify OTP. Please try again.',
//       );
//     } finally {
//       setIsLoading(false);
//     }
//   };

//   const handleClose = () => {
//     setStep('form');
//     setFormData({
//       businessName: '',
//       businessType: '',
//       contactPerson: '',
//       businessEmail: '',
//       businessMobile: '',
//       password: '',
//       confirmPassword: '',
//       gstNumber: '',
//       panNumber: '',
//       address: '',
//       city: '',
//       country: 'India',
//       limit: '',
//     });
//     setOtp('');
//     setErrors({});
//     setApiError(null);
//     onClose();
//   };

//   if (!isOpen) return null;

//   return (
//     <div className="fixed inset-0 z-50 flex items-center justify-center">
//       <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={handleClose} />

//       <div className="relative w-full max-w-2xl mx-4 bg-white rounded-2xl shadow-2xl animate-in fade-in zoom-in duration-200 max-h-[90vh] overflow-y-auto">
//         <div className="sticky top-0 bg-white z-10 flex items-center justify-between p-5 border-b border-gray-100">
//           <div className="flex items-center gap-3">
//             <div className="w-9 h-9 bg-red-50 rounded-full flex items-center justify-center">
//               <Building size={18} className="text-[#FF5A5F]" />
//             </div>
//             <div>
//               <h2 className="text-xl font-bold text-gray-900">
//                 {step === 'form' ? 'Add New Sub-Company' : 'Verify OTP'}
//               </h2>
//               <p className="text-xs text-gray-500">
//                 {step === 'form'
//                   ? 'Enter details to create a sub-company under your organization'
//                   : `OTP sent to ${formData.businessEmail}`}
//               </p>
//             </div>
//           </div>
//           <button
//             onClick={handleClose}
//             className="p-2 hover:bg-gray-100 rounded-full transition-colors"
//           >
//             <X size={18} className="text-gray-400" />
//           </button>
//         </div>

//         {apiError && (
//           <div className="mx-5 mt-4 px-4 py-2 bg-red-50 border border-red-200 rounded-lg">
//             <p className="text-sm text-red-600">{apiError}</p>
//           </div>
//         )}

//         <div className="p-6">
//           {step === 'form' ? (
//             <div className="space-y-5">
//               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
//                 <div>
//                   <label className="block text-sm font-semibold text-gray-700 mb-1.5">
//                     Business Name *
//                   </label>
//                   <div className="relative">
//                     <Building2
//                       size={18}
//                       className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
//                     />
//                     <input
//                       type="text"
//                       name="businessName"
//                       value={formData.businessName}
//                       onChange={handleChange}
//                       placeholder="Enter business name"
//                       className={`w-full pl-10 pr-4 py-2.5 bg-white border rounded-xl focus:outline-none focus:ring-2 focus:ring-[#FF5A5F]/20 transition-all text-gray-800 ${
//                         errors.businessName
//                           ? 'border-red-400 focus:border-red-400'
//                           : 'border-gray-200 focus:border-[#FF5A5F]'
//                       }`}
//                     />
//                   </div>
//                   {errors.businessName && (
//                     <p className="text-xs text-red-500 mt-1">{errors.businessName}</p>
//                   )}
//                 </div>

//                 <div>
//                   <label className="block text-sm font-semibold text-gray-700 mb-1.5">
//                     Business Type *
//                   </label>
//                   <div className="relative">
//                     <Briefcase
//                       size={18}
//                       className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
//                     />
//                     <input
//                       type="text"
//                       name="businessType"
//                       value={formData.businessType}
//                       onChange={handleChange}
//                       placeholder="e.g., IT Services, Retail, Manufacturing"
//                       className={`w-full pl-10 pr-4 py-2.5 bg-white border rounded-xl focus:outline-none focus:ring-2 focus:ring-[#FF5A5F]/20 transition-all text-gray-800 ${
//                         errors.businessType
//                           ? 'border-red-400 focus:border-red-400'
//                           : 'border-gray-200 focus:border-[#FF5A5F]'
//                       }`}
//                     />
//                   </div>
//                   {errors.businessType && (
//                     <p className="text-xs text-red-500 mt-1">{errors.businessType}</p>
//                   )}
//                 </div>
//               </div>

//               <div>
//                 <label className="block text-sm font-semibold text-gray-700 mb-1.5">
//                   Contact Person *
//                 </label>
//                 <div className="relative">
//                   <User
//                     size={18}
//                     className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
//                   />
//                   <input
//                     type="text"
//                     name="contactPerson"
//                     value={formData.contactPerson}
//                     onChange={handleChange}
//                     placeholder="Full name of contact person"
//                     className={`w-full pl-10 pr-4 py-2.5 bg-white border rounded-xl focus:outline-none focus:ring-2 focus:ring-[#FF5A5F]/20 transition-all text-gray-800 ${
//                       errors.contactPerson
//                         ? 'border-red-400 focus:border-red-400'
//                         : 'border-gray-200 focus:border-[#FF5A5F]'
//                     }`}
//                   />
//                 </div>
//                 {errors.contactPerson && (
//                   <p className="text-xs text-red-500 mt-1">{errors.contactPerson}</p>
//                 )}
//               </div>

//               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
//                 <div>
//                   <label className="block text-sm font-semibold text-gray-700 mb-1.5">
//                     Email Address *
//                   </label>
//                   <div className="relative">
//                     <Mail
//                       size={18}
//                       className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
//                     />
//                     <input
//                       type="email"
//                       name="businessEmail"
//                       value={formData.businessEmail}
//                       onChange={handleChange}
//                       placeholder="company@example.com"
//                       className={`w-full pl-10 pr-4 py-2.5 bg-white border rounded-xl focus:outline-none focus:ring-2 focus:ring-[#FF5A5F]/20 transition-all text-gray-800 ${
//                         errors.businessEmail
//                           ? 'border-red-400 focus:border-red-400'
//                           : 'border-gray-200 focus:border-[#FF5A5F]'
//                       }`}
//                     />
//                   </div>
//                   {errors.businessEmail && (
//                     <p className="text-xs text-red-500 mt-1">{errors.businessEmail}</p>
//                   )}
//                 </div>

//                 <div>
//                   <label className="block text-sm font-semibold text-gray-700 mb-1.5">
//                     Mobile Number *
//                   </label>
//                   <div className="relative">
//                     <Phone
//                       size={18}
//                       className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
//                     />
//                     <input
//                       type="tel"
//                       name="businessMobile"
//                       value={formData.businessMobile}
//                       onChange={handleChange}
//                       placeholder="9876543210"
//                       className={`w-full pl-10 pr-4 py-2.5 bg-white border rounded-xl focus:outline-none focus:ring-2 focus:ring-[#FF5A5F]/20 transition-all text-gray-800 ${
//                         errors.businessMobile
//                           ? 'border-red-400 focus:border-red-400'
//                           : 'border-gray-200 focus:border-[#FF5A5F]'
//                       }`}
//                     />
//                   </div>
//                   {errors.businessMobile && (
//                     <p className="text-xs text-red-500 mt-1">{errors.businessMobile}</p>
//                   )}
//                 </div>
//               </div>

//               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
//                 <div>
//                   <label className="block text-sm font-semibold text-gray-700 mb-1.5">
//                     GST Number (Optional)
//                   </label>
//                   <input
//                     type="text"
//                     name="gstNumber"
//                     value={formData.gstNumber}
//                     onChange={handleChange}
//                     placeholder="22AAAAA0000A1Z"
//                     className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#FF5A5F]/20 focus:border-[#FF5A5F] transition-all text-gray-800"
//                   />
//                 </div>

//                 <div>
//                   <label className="block text-sm font-semibold text-gray-700 mb-1.5">
//                     PAN Number (Optional)
//                   </label>
//                   <input
//                     type="text"
//                     name="panNumber"
//                     value={formData.panNumber}
//                     onChange={handleChange}
//                     placeholder="AAAAA1234F"
//                     className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#FF5A5F]/20 focus:border-[#FF5A5F] transition-all text-gray-800"
//                   />
//                 </div>
//               </div>

//               <div>
//                 <label className="block text-sm font-semibold text-gray-700 mb-1.5">
//                   Address *
//                 </label>
//                 <textarea
//                   name="address"
//                   value={formData.address}
//                   onChange={handleChange}
//                   rows={2}
//                   placeholder="Full address"
//                   className={`w-full px-4 py-2.5 bg-white border rounded-xl focus:outline-none focus:ring-2 focus:ring-[#FF5A5F]/20 transition-all text-gray-800 resize-none ${
//                     errors.address
//                       ? 'border-red-400 focus:border-red-400'
//                       : 'border-gray-200 focus:border-[#FF5A5F]'
//                   }`}
//                 />
//                 {errors.address && <p className="text-xs text-red-500 mt-1">{errors.address}</p>}
//               </div>

//               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
//                 <div>
//                   <label className="block text-sm font-semibold text-gray-700 mb-1.5">City *</label>
//                   <div className="relative">
//                     <MapPin
//                       size={18}
//                       className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
//                     />
//                     <input
//                       type="text"
//                       name="city"
//                       value={formData.city}
//                       onChange={handleChange}
//                       placeholder="City"
//                       className={`w-full pl-10 pr-4 py-2.5 bg-white border rounded-xl focus:outline-none focus:ring-2 focus:ring-[#FF5A5F]/20 transition-all text-gray-800 ${
//                         errors.city
//                           ? 'border-red-400 focus:border-red-400'
//                           : 'border-gray-200 focus:border-[#FF5A5F]'
//                       }`}
//                     />
//                   </div>
//                   {errors.city && <p className="text-xs text-red-500 mt-1">{errors.city}</p>}
//                 </div>

//                 <div>
//                   <label className="block text-sm font-semibold text-gray-700 mb-1.5">
//                     Country *
//                   </label>
//                   <input
//                     type="text"
//                     name="country"
//                     value={formData.country}
//                     onChange={handleChange}
//                     placeholder="Country"
//                     className={`w-full px-4 py-2.5 bg-white border rounded-xl focus:outline-none focus:ring-2 focus:ring-[#FF5A5F]/20 transition-all text-gray-800 ${
//                       errors.country
//                         ? 'border-red-400 focus:border-red-400'
//                         : 'border-gray-200 focus:border-[#FF5A5F]'
//                     }`}
//                   />
//                   {errors.country && <p className="text-xs text-red-500 mt-1">{errors.country}</p>}
//                 </div>
//               </div>

//               {/* Add Limit Field */}
//               <div>
//                 <label className="block text-sm font-semibold text-gray-700 mb-1.5">
//                   Credit/Wallet Limit (Optional)
//                 </label>
//                 <div className="relative">
//                   <CreditCard
//                     size={18}
//                     className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
//                   />
//                   <input
//                     type="number"
//                     name="limit"
//                     value={formData.limit}
//                     onChange={handleChange}
//                     onWheel={(e) => e.currentTarget.blur()}
//                     placeholder="Enter credit limit in INR"
//                     min="0"
//                     step="1000"
//                     className={`w-full pl-10 pr-4 py-2.5 bg-white border rounded-xl focus:outline-none focus:ring-2 focus:ring-[#FF5A5F]/20 transition-all text-gray-800 ${
//                       errors.limit
//                         ? 'border-red-400 focus:border-red-400'
//                         : 'border-gray-200 focus:border-[#FF5A5F]'
//                     }`}
//                   />
//                 </div>
//                 <p className="text-xs text-gray-400 mt-1">
//                   Set a credit limit for this sub-company. Leave empty for no limit.
//                 </p>
//                 {errors.limit && <p className="text-xs text-red-500 mt-1">{errors.limit}</p>}
//               </div>

//               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
//                 <div>
//                   <label className="block text-sm font-semibold text-gray-700 mb-1.5">
//                     Password *
//                   </label>
//                   <div className="relative">
//                     <Lock
//                       size={18}
//                       className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
//                     />
//                     <input
//                       type="password"
//                       name="password"
//                       value={formData.password}
//                       onChange={handleChange}
//                       placeholder="Create a password"
//                       className={`w-full pl-10 pr-4 py-2.5 bg-white border rounded-xl focus:outline-none focus:ring-2 focus:ring-[#FF5A5F]/20 transition-all text-gray-800 ${
//                         errors.password
//                           ? 'border-red-400 focus:border-red-400'
//                           : 'border-gray-200 focus:border-[#FF5A5F]'
//                       }`}
//                     />
//                   </div>
//                   {errors.password && (
//                     <p className="text-xs text-red-500 mt-1">{errors.password}</p>
//                   )}
//                 </div>

//                 <div>
//                   <label className="block text-sm font-semibold text-gray-700 mb-1.5">
//                     Confirm Password *
//                   </label>
//                   <div className="relative">
//                     <Lock
//                       size={18}
//                       className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
//                     />
//                     <input
//                       type="password"
//                       name="confirmPassword"
//                       value={formData.confirmPassword}
//                       onChange={handleChange}
//                       placeholder="Confirm password"
//                       className={`w-full pl-10 pr-4 py-2.5 bg-white border rounded-xl focus:outline-none focus:ring-2 focus:ring-[#FF5A5F]/20 transition-all text-gray-800 ${
//                         errors.confirmPassword
//                           ? 'border-red-400 focus:border-red-400'
//                           : 'border-gray-200 focus:border-[#FF5A5F]'
//                       }`}
//                     />
//                   </div>
//                   {errors.confirmPassword && (
//                     <p className="text-xs text-red-500 mt-1">{errors.confirmPassword}</p>
//                   )}
//                 </div>
//               </div>
//             </div>
//           ) : (
//             <div className="text-center py-4">
//               <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
//                 <Send size={28} className="text-[#FF5A5F]" />
//               </div>
//               <p className="text-gray-600 text-sm mb-6">
//                 We've sent a verification code to <br />
//                 <span className="font-semibold text-gray-900">{formData.businessEmail}</span>
//               </p>

//               <div className="max-w-xs mx-auto">
//                 <input
//                   type="text"
//                   value={otp}
//                   onChange={(e) => {
//                     setOtp(e.target.value);
//                     if (errors.otp) setErrors({});
//                     setApiError(null);
//                   }}
//                   placeholder="Enter 6-digit OTP"
//                   className={`w-full px-4 py-3 text-center text-2xl tracking-widest bg-white border rounded-xl focus:outline-none focus:ring-2 focus:ring-[#FF5A5F]/20 transition-all text-gray-800 ${
//                     errors.otp ? 'border-red-400' : 'border-gray-200 focus:border-[#FF5A5F]'
//                   }`}
//                   maxLength={6}
//                 />
//                 {errors.otp && <p className="text-xs text-red-500 mt-2">{errors.otp}</p>}
//               </div>

//               <button
//                 onClick={() => {
//                   setStep('form');
//                   setApiError(null);
//                 }}
//                 className="mt-6 text-sm text-[#FF5A5F] hover:underline"
//               >
//                 ← Back to form
//               </button>
//             </div>
//           )}
//         </div>

//         <div className="sticky bottom-0 bg-white border-t border-gray-100 rounded-b-2xl flex justify-end gap-3 p-5">
//           <button
//             onClick={handleClose}
//             className="px-5 py-2 text-gray-600 font-medium hover:text-gray-800 transition-colors"
//           >
//             Cancel
//           </button>
//           <button
//             onClick={step === 'form' ? handleSendOTP : handleVerifyAndCreate}
//             disabled={isLoading}
//             className="flex items-center gap-2 px-6 py-2 bg-[#FF5A5F] disabled:bg-[#ff5a5f]/70 text-white font-semibold rounded-xl hover:bg-[#ff4046] transition-colors shadow-lg shadow-red-500/20"
//           >
//             {isLoading && <Loader2 size={16} className="animate-spin" />}
//             {step === 'form' ? 'Send OTP' : 'Verify & Create'}
//           </button>
//         </div>
//       </div>
//     </div>
//   );
// };
