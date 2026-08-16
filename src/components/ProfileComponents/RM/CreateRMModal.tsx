// import React, { useState } from 'react';
// import { X, Mail, Lock, User, Phone, Briefcase, Loader2, Send } from 'lucide-react';
// import {
//   createRM,
//   CreateRMPayload,
//   verifyCreateRMOTP,
//   VerifyCreateRMOTPPayload,
// } from '@/api/auth.api';

// interface CreateRMModalProps {
//   isOpen: boolean;
//   onClose: () => void;
//   onCreate: (rm: {
//     memberName: string;
//     email: string;
//     mobile: string;
//     role: string;
//     status: 'active' | 'inactive' | 'pending';
//   }) => void;
// }

// export const CreateRMModal: React.FC<CreateRMModalProps> = ({ isOpen, onClose, onCreate }) => {
//   const [step, setStep] = useState<'form' | 'otp'>('form');
//   const [formData, setFormData] = useState({
//     memberName: '',
//     email: '',
//     mobile: '',
//     password: '',
//     confirmPassword: '',
//   });
//   const [otp, setOtp] = useState('');
//   const [isLoading, setIsLoading] = useState(false);
//   const [errors, setErrors] = useState<Record<string, string>>({});
//   const [apiError, setApiError] = useState<string | null>(null);

//   const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
//     const { name, value } = e.target;
//     setFormData((prev) => ({ ...prev, [name]: value }));
//     if (errors[name]) {
//       setErrors((prev) => ({ ...prev, [name]: '' }));
//     }
//     setApiError(null);
//   };

//   const validateForm = () => {
//     const newErrors: Record<string, string> = {};

//     if (!formData.memberName.trim()) {
//       newErrors.memberName = 'Member name is required';
//     }

//     if (!formData.email.trim()) {
//       newErrors.email = 'Email is required';
//     } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
//       newErrors.email = 'Please enter a valid email';
//     }

//     if (!formData.mobile.trim()) {
//       newErrors.mobile = 'Mobile number is required';
//     } else if (!/^[0-9]{10}$/.test(formData.mobile.replace(/\D/g, ''))) {
//       newErrors.mobile = 'Please enter a valid 10-digit mobile number';
//     }

//     if (!formData.password) {
//       newErrors.password = 'Password is required';
//     } else if (formData.password.length < 6) {
//       newErrors.password = 'Password must be at least 6 characters';
//     }

//     if (formData.password !== formData.confirmPassword) {
//       newErrors.confirmPassword = 'Passwords do not match';
//     }

//     setErrors(newErrors);
//     return Object.keys(newErrors).length === 0;
//   };

//   const handleSendOTP = async () => {
//     if (!validateForm()) return;

//     setIsLoading(true);
//     setApiError(null);

//     try {
//       const payload: CreateRMPayload = {
//         memberName: formData.memberName,
//         email: formData.email,
//         password: formData.password,
//         mobile: formData.mobile,
//         role: 'RM',
//       };

//       const response = await createRM(payload);

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
//       const payload: VerifyCreateRMOTPPayload = {
//         memberName: formData.memberName,
//         email: formData.email,
//         password: formData.password,
//         mobile: formData.mobile,
//         role: 'RM',
//         otp: otp.trim(),
//       };

//       const response = await verifyCreateRMOTP(payload);

//       if (response.data.success) {
//         // Call the onCreate callback with the new RM data
//         onCreate({
//           memberName: formData.memberName,
//           email: formData.email,
//           mobile: formData.mobile,
//           role: 'RM',
//           status: 'active',
//         });
//         handleClose();
//       } else {
//         setApiError(response.data.message || 'Failed to verify OTP and create RM');
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
//       memberName: '',
//       email: '',
//       mobile: '',
//       password: '',
//       confirmPassword: '',
//     });
//     setOtp('');
//     setErrors({});
//     setApiError(null);
//     onClose();
//   };

//   if (!isOpen) return null;

//   return (
//     <div className="fixed inset-0 z-50 flex items-center justify-center">
//       {/* Backdrop */}
//       <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={handleClose} />

//       {/* Modal */}
//       <div className="relative w-full max-w-lg mx-4 bg-white rounded-2xl shadow-2xl animate-in fade-in zoom-in duration-200">
//         {/* Header */}
//         <div className="flex items-center justify-between p-5 border-b border-gray-100">
//           <div className="flex items-center gap-3">
//             <div className="w-9 h-9 bg-red-50 rounded-full flex items-center justify-center">
//               <Briefcase size={18} className="text-[#FF5A5F]" />
//             </div>
//             <div>
//               <h2 className="text-xl font-bold text-gray-900">
//                 {step === 'form' ? 'Add New RM' : 'Verify OTP'}
//               </h2>
//               <p className="text-xs text-gray-500">
//                 {step === 'form'
//                   ? 'Enter details to create a Relationship Manager'
//                   : `OTP sent to ${formData.email}`}
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

//         {/* Error Message */}
//         {apiError && (
//           <div className="mx-5 mt-4 px-4 py-2 bg-red-50 border border-red-200 rounded-lg">
//             <p className="text-sm text-red-600">{apiError}</p>
//           </div>
//         )}

//         {/* Body */}
//         <div className="p-6">
//           {step === 'form' ? (
//             <div className="space-y-5">
//               {/* Member Name */}
//               <div>
//                 <label className="block text-sm font-semibold text-gray-700 mb-1.5">
//                   Member Name *
//                 </label>
//                 <div className="relative">
//                   <User
//                     size={18}
//                     className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
//                   />
//                   <input
//                     type="text"
//                     name="memberName"
//                     value={formData.memberName}
//                     onChange={handleChange}
//                     placeholder="Enter full name"
//                     className={`w-full pl-10 pr-4 py-2.5 bg-white border rounded-xl focus:outline-none focus:ring-2 focus:ring-[#FF5A5F]/20 transition-all text-gray-800 ${
//                       errors.memberName
//                         ? 'border-red-400 focus:border-red-400'
//                         : 'border-gray-200 focus:border-[#FF5A5F]'
//                     }`}
//                   />
//                 </div>
//                 {errors.memberName && (
//                   <p className="text-xs text-red-500 mt-1">{errors.memberName}</p>
//                 )}
//               </div>

//               {/* Email */}
//               <div>
//                 <label className="block text-sm font-semibold text-gray-700 mb-1.5">
//                   Email Address *
//                 </label>
//                 <div className="relative">
//                   <Mail
//                     size={18}
//                     className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
//                   />
//                   <input
//                     type="email"
//                     name="email"
//                     value={formData.email}
//                     onChange={handleChange}
//                     placeholder="rm@company.com"
//                     className={`w-full pl-10 pr-4 py-2.5 bg-white border rounded-xl focus:outline-none focus:ring-2 focus:ring-[#FF5A5F]/20 transition-all text-gray-800 ${
//                       errors.email
//                         ? 'border-red-400 focus:border-red-400'
//                         : 'border-gray-200 focus:border-[#FF5A5F]'
//                     }`}
//                   />
//                 </div>
//                 {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email}</p>}
//               </div>

//               {/* Mobile */}
//               <div>
//                 <label className="block text-sm font-semibold text-gray-700 mb-1.5">
//                   Mobile Number *
//                 </label>
//                 <div className="relative">
//                   <Phone
//                     size={18}
//                     className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
//                   />
//                   <input
//                     type="tel"
//                     name="mobile"
//                     value={formData.mobile}
//                     onChange={handleChange}
//                     placeholder="9876543210"
//                     className={`w-full pl-10 pr-4 py-2.5 bg-white border rounded-xl focus:outline-none focus:ring-2 focus:ring-[#FF5A5F]/20 transition-all text-gray-800 ${
//                       errors.mobile
//                         ? 'border-red-400 focus:border-red-400'
//                         : 'border-gray-200 focus:border-[#FF5A5F]'
//                     }`}
//                   />
//                 </div>
//                 {errors.mobile && <p className="text-xs text-red-500 mt-1">{errors.mobile}</p>}
//               </div>

//               {/* Password */}
//               <div>
//                 <label className="block text-sm font-semibold text-gray-700 mb-1.5">
//                   Password *
//                 </label>
//                 <div className="relative">
//                   <Lock
//                     size={18}
//                     className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
//                   />
//                   <input
//                     type="password"
//                     name="password"
//                     value={formData.password}
//                     onChange={handleChange}
//                     placeholder="Create a password"
//                     className={`w-full pl-10 pr-4 py-2.5 bg-white border rounded-xl focus:outline-none focus:ring-2 focus:ring-[#FF5A5F]/20 transition-all text-gray-800 ${
//                       errors.password
//                         ? 'border-red-400 focus:border-red-400'
//                         : 'border-gray-200 focus:border-[#FF5A5F]'
//                     }`}
//                   />
//                 </div>
//                 {errors.password && <p className="text-xs text-red-500 mt-1">{errors.password}</p>}
//               </div>

//               {/* Confirm Password */}
//               <div>
//                 <label className="block text-sm font-semibold text-gray-700 mb-1.5">
//                   Confirm Password *
//                 </label>
//                 <div className="relative">
//                   <Lock
//                     size={18}
//                     className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
//                   />
//                   <input
//                     type="password"
//                     name="confirmPassword"
//                     value={formData.confirmPassword}
//                     onChange={handleChange}
//                     placeholder="Confirm password"
//                     className={`w-full pl-10 pr-4 py-2.5 bg-white border rounded-xl focus:outline-none focus:ring-2 focus:ring-[#FF5A5F]/20 transition-all text-gray-800 ${
//                       errors.confirmPassword
//                         ? 'border-red-400 focus:border-red-400'
//                         : 'border-gray-200 focus:border-[#FF5A5F]'
//                     }`}
//                   />
//                 </div>
//                 {errors.confirmPassword && (
//                   <p className="text-xs text-red-500 mt-1">{errors.confirmPassword}</p>
//                 )}
//               </div>
//             </div>
//           ) : (
//             <div className="text-center py-4">
//               <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
//                 <Send size={28} className="text-[#FF5A5F]" />
//               </div>
//               <p className="text-gray-600 text-sm mb-6">
//                 We've sent a verification code to <br />
//                 <span className="font-semibold text-gray-900">{formData.email}</span>
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

//         {/* Footer */}
//         <div className="flex justify-end gap-3 p-5 border-t border-gray-100 bg-gray-50/30 rounded-b-2xl">
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
