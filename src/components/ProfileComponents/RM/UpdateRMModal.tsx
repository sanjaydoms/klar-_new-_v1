// import React, { useState, useEffect } from 'react';
// import { X, Mail, Lock, User, Phone, Loader2, Save } from 'lucide-react';
// import { updateRM } from '@/api/auth.api';
// import { RM, UpdateRMPayload } from '@/types/auth.type';

// interface UpdateRMModalProps {
//   isOpen: boolean;
//   onClose: () => void;
//   onUpdate: (updatedRM: any) => void;
//   rm: RM | null;
// }

// export const UpdateRMModal: React.FC<UpdateRMModalProps> = ({ isOpen, onClose, onUpdate, rm }) => {
//   const [formData, setFormData] = useState({
//     memberName: '',
//     email: '',
//     mobile: '',
//     password: '',
//     confirmPassword: '',
//   });
//   const [isLoading, setIsLoading] = useState(false);
//   const [errors, setErrors] = useState<Record<string, string>>({});
//   const [apiError, setApiError] = useState<string | null>(null);
//   const [updatePassword, setUpdatePassword] = useState(false);

//   useEffect(() => {
//     if (rm) {
//       setFormData({
//         memberName: rm.memberName || '',
//         email: rm.email || '',
//         mobile: rm.mobile || '',
//         password: '',
//         confirmPassword: '',
//       });
//     }
//   }, [rm]);

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

//     if (updatePassword) {
//       if (!formData.password) {
//         newErrors.password = 'Password is required';
//       } else if (formData.password.length < 6) {
//         newErrors.password = 'Password must be at least 6 characters';
//       }

//       if (formData.password !== formData.confirmPassword) {
//         newErrors.confirmPassword = 'Passwords do not match';
//       }
//     }

//     setErrors(newErrors);
//     return Object.keys(newErrors).length === 0;
//   };

//   const getRMId = () => {
//     if (!rm) return null;
//     return (rm as any)._id || rm.id;
//   };

//   const handleSubmit = async () => {
//     if (!validateForm()) return;

//     const rmId = getRMId();
//     if (!rmId) {
//       setApiError('Invalid RM data: ID not found');
//       return;
//     }

//     setIsLoading(true);
//     setApiError(null);

//     try {
//       const payload: UpdateRMPayload = {};

//       if (formData.memberName !== rm?.memberName) {
//         payload.memberName = formData.memberName;
//       }

//       if (formData.email !== rm?.email) {
//         payload.email = formData.email;
//       }

//       if (formData.mobile !== rm?.mobile) {
//         payload.mobile = formData.mobile;
//       }

//       if (updatePassword && formData.password) {
//         payload.password = formData.password;
//       }

//       if (Object.keys(payload).length === 0) {
//         setApiError('No changes to update');
//         setIsLoading(false);
//         return;
//       }

//       const response = await updateRM(rmId, payload);

//       if (response.data.success) {
//         const updatedRM = {
//           ...rm,
//           id: rmId,
//           memberName: payload.memberName || rm?.memberName,
//           email: payload.email || rm?.email,
//           mobile: payload.mobile || rm?.mobile,
//           createdBy: rm?.createdBy,
//         };
//         onUpdate(updatedRM);
//         handleClose();
//       } else {
//         setApiError(response.data.message || 'Failed to update RM');
//       }
//     } catch (error: any) {
//       console.error('Update RM failed:', error);
//       setApiError(
//         error.response?.data?.message || error.message || 'Failed to update RM. Please try again.',
//       );
//     } finally {
//       setIsLoading(false);
//     }
//   };

//   const handleClose = () => {
//     setFormData({
//       memberName: '',
//       email: '',
//       mobile: '',
//       password: '',
//       confirmPassword: '',
//     });
//     setUpdatePassword(false);
//     setErrors({});
//     setApiError(null);
//     onClose();
//   };

//   if (!isOpen || !rm) return null;

//   return (
//     <div className="fixed inset-0 z-50 flex items-center justify-center">
//       <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={handleClose} />

//       <div className="relative w-full max-w-lg mx-4 bg-white rounded-2xl shadow-2xl animate-in fade-in zoom-in duration-200">
//         <div className="flex items-center justify-between p-5 border-b border-gray-100">
//           <div className="flex items-center gap-3">
//             <div className="w-9 h-9 bg-blue-50 rounded-full flex items-center justify-center">
//               <User size={18} className="text-blue-500" />
//             </div>
//             <div>
//               <h2 className="text-xl font-bold text-gray-900">Update RM</h2>
//               <p className="text-xs text-gray-500">Edit Relationship Manager details</p>
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
//           <div className="space-y-5">
//             <div>
//               <label className="block text-sm font-semibold text-gray-700 mb-1.5">
//                 Member Name *
//               </label>
//               <div className="relative">
//                 <User
//                   size={18}
//                   className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
//                 />
//                 <input
//                   type="text"
//                   name="memberName"
//                   value={formData.memberName}
//                   onChange={handleChange}
//                   className={`w-full pl-10 pr-4 py-2.5 bg-white border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all text-gray-800 ${
//                     errors.memberName
//                       ? 'border-red-400 focus:border-red-400'
//                       : 'border-gray-200 focus:border-blue-500'
//                   }`}
//                 />
//               </div>
//               {errors.memberName && (
//                 <p className="text-xs text-red-500 mt-1">{errors.memberName}</p>
//               )}
//             </div>

//             <div>
//               <label className="block text-sm font-semibold text-gray-700 mb-1.5">
//                 Email Address *
//               </label>
//               <div className="relative">
//                 <Mail
//                   size={18}
//                   className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
//                 />
//                 <input
//                   type="email"
//                   name="email"
//                   value={formData.email}
//                   onChange={handleChange}
//                   className={`w-full pl-10 pr-4 py-2.5 bg-white border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all text-gray-800 ${
//                     errors.email
//                       ? 'border-red-400 focus:border-red-400'
//                       : 'border-gray-200 focus:border-blue-500'
//                   }`}
//                 />
//               </div>
//               {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email}</p>}
//             </div>

//             <div>
//               <label className="block text-sm font-semibold text-gray-700 mb-1.5">
//                 Mobile Number *
//               </label>
//               <div className="relative">
//                 <Phone
//                   size={18}
//                   className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
//                 />
//                 <input
//                   type="tel"
//                   name="mobile"
//                   value={formData.mobile}
//                   onChange={handleChange}
//                   className={`w-full pl-10 pr-4 py-2.5 bg-white border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all text-gray-800 ${
//                     errors.mobile
//                       ? 'border-red-400 focus:border-red-400'
//                       : 'border-gray-200 focus:border-blue-500'
//                   }`}
//                 />
//               </div>
//               {errors.mobile && <p className="text-xs text-red-500 mt-1">{errors.mobile}</p>}
//             </div>

//             <div className="flex items-center gap-3 pt-2">
//               <button
//                 type="button"
//                 onClick={() => setUpdatePassword(!updatePassword)}
//                 className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
//                   updatePassword
//                     ? 'bg-blue-50 text-blue-600'
//                     : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
//                 }`}
//               >
//                 <Lock size={16} />
//                 <span className="text-sm font-medium">
//                   {updatePassword ? 'Cancel Password Update' : 'Update Password'}
//                 </span>
//               </button>
//               {!updatePassword && (
//                 <span className="text-xs text-gray-400">Leave as is to keep current password</span>
//               )}
//             </div>

//             {updatePassword && (
//               <>
//                 <div className="animate-in slide-in-from-top-2 duration-200">
//                   <label className="block text-sm font-semibold text-gray-700 mb-1.5">
//                     New Password *
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
//                       placeholder="Enter new password"
//                       className={`w-full pl-10 pr-4 py-2.5 bg-white border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all text-gray-800 ${
//                         errors.password
//                           ? 'border-red-400 focus:border-red-400'
//                           : 'border-gray-200 focus:border-blue-500'
//                       }`}
//                     />
//                   </div>
//                   {errors.password && (
//                     <p className="text-xs text-red-500 mt-1">{errors.password}</p>
//                   )}
//                 </div>

//                 <div className="animate-in slide-in-from-top-2 duration-200">
//                   <label className="block text-sm font-semibold text-gray-700 mb-1.5">
//                     Confirm New Password *
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
//                       placeholder="Confirm new password"
//                       className={`w-full pl-10 pr-4 py-2.5 bg-white border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all text-gray-800 ${
//                         errors.confirmPassword
//                           ? 'border-red-400 focus:border-red-400'
//                           : 'border-gray-200 focus:border-blue-500'
//                       }`}
//                     />
//                   </div>
//                   {errors.confirmPassword && (
//                     <p className="text-xs text-red-500 mt-1">{errors.confirmPassword}</p>
//                   )}
//                 </div>
//               </>
//             )}
//           </div>
//         </div>

//         <div className="flex justify-end gap-3 p-5 border-t border-gray-100 bg-gray-50/30 rounded-b-2xl">
//           <button
//             onClick={handleClose}
//             className="px-5 py-2 text-gray-600 font-medium hover:text-gray-800 transition-colors"
//           >
//             Cancel
//           </button>
//           <button
//             onClick={handleSubmit}
//             disabled={isLoading}
//             className="flex items-center gap-2 px-6 py-2 bg-blue-500 disabled:bg-blue-500/70 text-white font-semibold rounded-xl hover:bg-blue-600 transition-colors shadow-lg shadow-blue-500/20"
//           >
//             {isLoading && <Loader2 size={16} className="animate-spin" />}
//             <Save size={16} />
//             Update RM
//           </button>
//         </div>
//       </div>
//     </div>
//   );
// };
