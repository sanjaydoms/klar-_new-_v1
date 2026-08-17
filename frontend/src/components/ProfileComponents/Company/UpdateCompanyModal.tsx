// import React, { useState, useEffect } from 'react';
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
//   Save,
//   Building,
//   CreditCard,
//   DollarSign,
// } from 'lucide-react';
// import { updateCompany } from '@/api/auth.api';
// import { UpdateCompanyPayload, Company } from '@/types/auth.type';

// interface UpdateCompanyModalProps {
//   isOpen: boolean;
//   onClose: () => void;
//   onUpdate: (updatedCompany: any) => void;
//   company: Company | null;
// }

// export const UpdateCompanyModal: React.FC<UpdateCompanyModalProps> = ({
//   isOpen,
//   onClose,
//   onUpdate,
//   company,
// }) => {
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
//     country: '',
//     status: 'ACTIVE',
//     blockReason: '',
//     limit: '',
//     settlementAmount: '',
//   });
//   const [isLoading, setIsLoading] = useState(false);
//   const [errors, setErrors] = useState<Record<string, string>>({});
//   const [apiError, setApiError] = useState<string | null>(null);
//   const [updatePassword, setUpdatePassword] = useState(false);
//   const [showSettlement, setShowSettlement] = useState(false);
//   const [showBlockReason, setShowBlockReason] = useState(false);

//   useEffect(() => {
//     if (company) {
//       setFormData({
//         businessName: company.businessProfile?.businessName || '',
//         businessType: company.businessProfile?.businessType || '',
//         contactPerson: company.businessProfile?.contactPerson || '',
//         businessEmail: company.businessProfile?.businessEmail || company.email || '',
//         businessMobile: company.businessProfile?.businessMobile || company.mobile || '',
//         password: '',
//         confirmPassword: '',
//         gstNumber: company.businessProfile?.gstNumber || '',
//         panNumber: company.businessProfile?.panNumber || '',
//         address: company.businessProfile?.address || '',
//         city: company.businessProfile?.city || '',
//         country: company.businessProfile?.country || 'India',
//         status: company.status || 'ACTIVE',
//         blockReason: company.blockReason || '',
//         limit: company.limit?.toString() || company.wallet?.limit?.toString() || '',
//         settlementAmount: '',
//       });
//       setShowBlockReason(company.status === 'BLOCKED');
//     }
//   }, [company]);

//   const handleChange = (
//     e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>,
//   ) => {
//     const { name, value } = e.target;
//     setFormData((prev) => ({ ...prev, [name]: value }));
//     if (errors[name]) {
//       setErrors((prev) => ({ ...prev, [name]: '' }));
//     }
//     setApiError(null);

//     if (name === 'status') {
//       setShowBlockReason(value === 'BLOCKED');
//       if (value !== 'BLOCKED') {
//         setFormData((prev) => ({ ...prev, blockReason: '' }));
//       }
//     }
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

//     // Validate limit if provided
//     if (formData.limit) {
//       const limitNum = parseFloat(formData.limit);
//       if (isNaN(limitNum) || limitNum < 0) {
//         newErrors.limit = 'Please enter a valid positive number';
//       }
//     }

//     // Validate settlement amount if shown
//     if (showSettlement && formData.settlementAmount) {
//       const settlementNum = parseFloat(formData.settlementAmount);
//       if (isNaN(settlementNum) || settlementNum <= 0) {
//         newErrors.settlementAmount = 'Please enter a valid positive amount';
//       }
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

//     if (showBlockReason && !formData.blockReason.trim()) {
//       newErrors.blockReason = 'Block reason is required when blocking a company';
//     }

//     setErrors(newErrors);
//     return Object.keys(newErrors).length === 0;
//   };

//   const getCompanyId = () => {
//     if (!company) return null;
//     return (company as any)._id || company.id;
//   };

//   const handleSettlement = () => {
//     if (!formData.settlementAmount) {
//       setErrors({ settlementAmount: 'Please enter an amount' });
//       return;
//     }

//     const amount = parseFloat(formData.settlementAmount);
//     if (isNaN(amount) || amount <= 0) {
//       setErrors({ settlementAmount: 'Please enter a valid positive amount' });
//       return;
//     }

//     // TODO: Call your settlement API here
//     console.log('Settlement amount:', amount);
//     // Example API call:
//     // await settlementApi(companyId, amount);

//     // Show success message and close settlement section
//     alert(`Settlement of ₹${amount} processed successfully`);
//     setShowSettlement(false);
//     setFormData((prev) => ({ ...prev, settlementAmount: '' }));
//   };

//   const handleSubmit = async () => {
//     if (!validateForm()) return;

//     const companyId = getCompanyId();
//     if (!companyId) {
//       setApiError('Invalid company data: ID not found');
//       return;
//     }

//     setIsLoading(true);
//     setApiError(null);

//     try {
//       const payload: UpdateCompanyPayload = {};

//       // Only include changed fields
//       if (formData.businessName !== company?.businessProfile?.businessName) {
//         payload.businessName = formData.businessName;
//       }

//       if (formData.businessType !== company?.businessProfile?.businessType) {
//         payload.businessType = formData.businessType;
//       }

//       if (formData.contactPerson !== company?.businessProfile?.contactPerson) {
//         payload.contactPerson = formData.contactPerson;
//       }

//       if (formData.businessEmail !== (company?.businessProfile?.businessEmail || company?.email)) {
//         payload.businessEmail = formData.businessEmail;
//       }

//       if (
//         formData.businessMobile !== (company?.businessProfile?.businessMobile || company?.mobile)
//       ) {
//         payload.businessMobile = formData.businessMobile;
//       }

//       if (formData.gstNumber !== company?.businessProfile?.gstNumber) {
//         payload.gstNumber = formData.gstNumber;
//       }

//       if (formData.panNumber !== company?.businessProfile?.panNumber) {
//         payload.panNumber = formData.panNumber;
//       }

//       if (formData.address !== company?.businessProfile?.address) {
//         payload.address = formData.address;
//       }

//       if (formData.city !== company?.businessProfile?.city) {
//         payload.city = formData.city;
//       }

//       if (formData.country !== company?.businessProfile?.country) {
//         payload.country = formData.country;
//       }

//       if (formData.status !== company?.status) {
//         payload.status = formData.status as any;
//       }

//       if (showBlockReason && formData.blockReason !== company?.blockReason) {
//         payload.blockReason = formData.blockReason;
//       }

//       const currentLimit = company?.limit || company?.wallet?.limit;
//       const newLimit = formData.limit ? parseFloat(formData.limit) : undefined;

//       if (newLimit !== undefined && newLimit !== currentLimit) {
//         payload.limit = newLimit;
//       }

//       if (updatePassword && formData.password) {
//         payload.password = formData.password;
//       }

//       if (showSettlement && formData.settlementAmount) {
//         const settlementAmount = parseFloat(formData.settlementAmount);
//         if (settlementAmount > 0) {
//           payload.settlementAmount = settlementAmount;
//         }
//       }

//       if (Object.keys(payload).length === 0) {
//         setApiError('No changes to update');
//         setIsLoading(false);
//         return;
//       }

//       const response = await updateCompany(companyId, payload);

//       if (response.data.success) {
//         const updatedCompany = {
//           ...company,
//           ...response.data.data,
//         };
//         onUpdate(updatedCompany);

//         if (showSettlement && formData.settlementAmount) {
//           alert(`Settlement of ₹${parseFloat(formData.settlementAmount)} processed successfully`);
//         }

//         handleClose();
//       } else {
//         setApiError(response.data.message || 'Failed to update company');
//       }
//     } catch (error: any) {
//       console.error('Update company failed:', error);
//       setApiError(
//         error.response?.data?.message ||
//           error.message ||
//           'Failed to update company. Please try again.',
//       );
//     } finally {
//       setIsLoading(false);
//     }
//   };

//   const handleClose = () => {
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
//       country: '',
//       status: 'ACTIVE',
//       blockReason: '',
//       limit: '',
//       settlementAmount: '',
//     });
//     setUpdatePassword(false);
//     setShowSettlement(false);
//     setShowBlockReason(false);
//     setErrors({});
//     setApiError(null);
//     onClose();
//   };

//   if (!isOpen || !company) return null;

//   return (
//     <div className="fixed inset-0 z-50 flex items-center justify-center">
//       <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={handleClose} />

//       <div className="relative w-full max-w-2xl mx-4 bg-white rounded-2xl shadow-2xl animate-in fade-in zoom-in duration-200 max-h-[90vh] overflow-y-auto">
//         <div className="sticky top-0 bg-white z-10 flex items-center justify-between p-5 border-b border-gray-100">
//           <div className="flex items-center gap-3">
//             <div className="w-9 h-9 bg-blue-50 rounded-full flex items-center justify-center">
//               <Building size={18} className="text-blue-500" />
//             </div>
//             <div>
//               <h2 className="text-xl font-bold text-gray-900">Update Sub-Company</h2>
//               <p className="text-xs text-gray-500">Edit sub-company details</p>
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
//             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
//               <div>
//                 <label className="block text-sm font-semibold text-gray-700 mb-1.5">
//                   Business Name *
//                 </label>
//                 <div className="relative">
//                   <Building2
//                     size={18}
//                     className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
//                   />
//                   <input
//                     type="text"
//                     name="businessName"
//                     value={formData.businessName}
//                     onChange={handleChange}
//                     className={`w-full pl-10 pr-4 py-2.5 bg-white border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all text-gray-800 ${
//                       errors.businessName
//                         ? 'border-red-400 focus:border-red-400'
//                         : 'border-gray-200 focus:border-blue-500'
//                     }`}
//                   />
//                 </div>
//                 {errors.businessName && (
//                   <p className="text-xs text-red-500 mt-1">{errors.businessName}</p>
//                 )}
//               </div>

//               <div>
//                 <label className="block text-sm font-semibold text-gray-700 mb-1.5">
//                   Business Type *
//                 </label>
//                 <div className="relative">
//                   <Briefcase
//                     size={18}
//                     className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
//                   />
//                   <input
//                     type="text"
//                     name="businessType"
//                     value={formData.businessType}
//                     onChange={handleChange}
//                     className={`w-full pl-10 pr-4 py-2.5 bg-white border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all text-gray-800 ${
//                       errors.businessType
//                         ? 'border-red-400 focus:border-red-400'
//                         : 'border-gray-200 focus:border-blue-500'
//                     }`}
//                   />
//                 </div>
//                 {errors.businessType && (
//                   <p className="text-xs text-red-500 mt-1">{errors.businessType}</p>
//                 )}
//               </div>
//             </div>

//             <div>
//               <label className="block text-sm font-semibold text-gray-700 mb-1.5">
//                 Contact Person *
//               </label>
//               <div className="relative">
//                 <User
//                   size={18}
//                   className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
//                 />
//                 <input
//                   type="text"
//                   name="contactPerson"
//                   value={formData.contactPerson}
//                   onChange={handleChange}
//                   className={`w-full pl-10 pr-4 py-2.5 bg-white border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all text-gray-800 ${
//                     errors.contactPerson
//                       ? 'border-red-400 focus:border-red-400'
//                       : 'border-gray-200 focus:border-blue-500'
//                   }`}
//                 />
//               </div>
//               {errors.contactPerson && (
//                 <p className="text-xs text-red-500 mt-1">{errors.contactPerson}</p>
//               )}
//             </div>

//             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
//                     name="businessEmail"
//                     value={formData.businessEmail}
//                     onChange={handleChange}
//                     className={`w-full pl-10 pr-4 py-2.5 bg-white border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all text-gray-800 ${
//                       errors.businessEmail
//                         ? 'border-red-400 focus:border-red-400'
//                         : 'border-gray-200 focus:border-blue-500'
//                     }`}
//                   />
//                 </div>
//                 {errors.businessEmail && (
//                   <p className="text-xs text-red-500 mt-1">{errors.businessEmail}</p>
//                 )}
//               </div>

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
//                     name="businessMobile"
//                     value={formData.businessMobile}
//                     onChange={handleChange}
//                     className={`w-full pl-10 pr-4 py-2.5 bg-white border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all text-gray-800 ${
//                       errors.businessMobile
//                         ? 'border-red-400 focus:border-red-400'
//                         : 'border-gray-200 focus:border-blue-500'
//                     }`}
//                   />
//                 </div>
//                 {errors.businessMobile && (
//                   <p className="text-xs text-red-500 mt-1">{errors.businessMobile}</p>
//                 )}
//               </div>
//             </div>

//             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
//               <div>
//                 <label className="block text-sm font-semibold text-gray-700 mb-1.5">
//                   GST Number (Optional)
//                 </label>
//                 <input
//                   type="text"
//                   name="gstNumber"
//                   value={formData.gstNumber}
//                   onChange={handleChange}
//                   className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-gray-800"
//                 />
//               </div>

//               <div>
//                 <label className="block text-sm font-semibold text-gray-700 mb-1.5">
//                   PAN Number (Optional)
//                 </label>
//                 <input
//                   type="text"
//                   name="panNumber"
//                   value={formData.panNumber}
//                   onChange={handleChange}
//                   className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-gray-800"
//                 />
//               </div>
//             </div>

//             <div>
//               <label className="block text-sm font-semibold text-gray-700 mb-1.5">Address *</label>
//               <textarea
//                 name="address"
//                 value={formData.address}
//                 onChange={handleChange}
//                 rows={2}
//                 className={`w-full px-4 py-2.5 bg-white border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all text-gray-800 resize-none ${
//                   errors.address
//                     ? 'border-red-400 focus:border-red-400'
//                     : 'border-gray-200 focus:border-blue-500'
//                 }`}
//               />
//               {errors.address && <p className="text-xs text-red-500 mt-1">{errors.address}</p>}
//             </div>

//             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
//               <div>
//                 <label className="block text-sm font-semibold text-gray-700 mb-1.5">City *</label>
//                 <div className="relative">
//                   <MapPin
//                     size={18}
//                     className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
//                   />
//                   <input
//                     type="text"
//                     name="city"
//                     value={formData.city}
//                     onChange={handleChange}
//                     className={`w-full pl-10 pr-4 py-2.5 bg-white border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all text-gray-800 ${
//                       errors.city
//                         ? 'border-red-400 focus:border-red-400'
//                         : 'border-gray-200 focus:border-blue-500'
//                     }`}
//                   />
//                 </div>
//                 {errors.city && <p className="text-xs text-red-500 mt-1">{errors.city}</p>}
//               </div>

//               <div>
//                 <label className="block text-sm font-semibold text-gray-700 mb-1.5">
//                   Country *
//                 </label>
//                 <input
//                   type="text"
//                   name="country"
//                   value={formData.country}
//                   onChange={handleChange}
//                   className={`w-full px-4 py-2.5 bg-white border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all text-gray-800 ${
//                     errors.country
//                       ? 'border-red-400 focus:border-red-400'
//                       : 'border-gray-200 focus:border-blue-500'
//                   }`}
//                 />
//                 {errors.country && <p className="text-xs text-red-500 mt-1">{errors.country}</p>}
//               </div>
//             </div>

//             {/* Add Limit Field */}
//             <div>
//               <label className="block text-sm font-semibold text-gray-700 mb-1.5">
//                 Credit/Wallet Limit
//               </label>
//               <div className="relative">
//                 <CreditCard
//                   size={18}
//                   className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
//                 />
//                 <input
//                   type="number"
//                   name="limit"
//                   value={formData.limit}
//                   onChange={handleChange}
//                   onWheel={(e) => e.currentTarget.blur()}
//                   placeholder="Enter credit limit in INR"
//                   min="0"
//                   step="1000"
//                   className={`w-full pl-10 pr-4 py-2.5 bg-white border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all text-gray-800 ${
//                     errors.limit
//                       ? 'border-red-400 focus:border-red-400'
//                       : 'border-gray-200 focus:border-blue-500'
//                   }`}
//                 />
//               </div>
//               <p className="text-xs text-gray-400 mt-1">
//                 Set a credit limit for this sub-company. Leave empty for no limit.
//               </p>
//               {errors.limit && <p className="text-xs text-red-500 mt-1">{errors.limit}</p>}
//             </div>

//             <div>
//               <label className="block text-sm font-semibold text-gray-700 mb-1.5">Status</label>
//               <select
//                 name="status"
//                 value={formData.status}
//                 onChange={handleChange}
//                 className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-gray-800"
//               >
//                 <option value="ACTIVE">Active</option>
//                 <option value="INACTIVE">Inactive</option>
//                 <option value="BLOCKED">Blocked</option>
//               </select>
//             </div>

//             {showBlockReason && (
//               <div className="animate-in slide-in-from-top-2 duration-200">
//                 <label className="block text-sm font-semibold text-gray-700 mb-1.5">
//                   Block Reason *
//                 </label>
//                 <textarea
//                   name="blockReason"
//                   value={formData.blockReason}
//                   onChange={handleChange}
//                   rows={2}
//                   placeholder="Please provide a reason for blocking this company"
//                   className={`w-full px-4 py-2.5 bg-white border rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500/20 transition-all text-gray-800 resize-none ${
//                     errors.blockReason
//                       ? 'border-red-400 focus:border-red-400'
//                       : 'border-gray-200 focus:border-red-500'
//                   }`}
//                 />
//                 {errors.blockReason && (
//                   <p className="text-xs text-red-500 mt-1">{errors.blockReason}</p>
//                 )}
//               </div>
//             )}

//             {/* Action Buttons Row - Update Password & Settlement */}
//             <div className="flex items-center gap-3 pt-2">
//               <button
//                 type="button"
//                 onClick={() => {
//                   setUpdatePassword(!updatePassword);
//                   setShowSettlement(false);
//                 }}
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

//               <button
//                 type="button"
//                 onClick={() => {
//                   setShowSettlement(!showSettlement);
//                   setUpdatePassword(false);
//                 }}
//                 className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
//                   showSettlement
//                     ? 'bg-green-50 text-green-600'
//                     : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
//                 }`}
//               >
//                 <DollarSign size={16} />
//                 <span className="text-sm font-medium">
//                   {showSettlement ? 'Cancel Settlement' : 'Settlement'}
//                 </span>
//               </button>
//             </div>

//             {/* Settlement Input Field */}
//             {showSettlement && (
//               <div className="animate-in slide-in-from-top-2 duration-200 p-4 bg-green-50 rounded-xl border border-green-200">
//                 <div className="flex items-center justify-between mb-3">
//                   <label className="text-sm font-semibold text-gray-700">Settlement Amount</label>
//                   <span className="text-xs text-gray-500">INR (₹)</span>
//                 </div>
//                 <div className="relative">
//                   <DollarSign
//                     size={18}
//                     className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
//                   />
//                   <input
//                     type="number"
//                     name="settlementAmount"
//                     value={formData.settlementAmount}
//                     onChange={handleChange}
//                     onWheel={(e) => e.currentTarget.blur()}
//                     placeholder="Enter settlement amount"
//                     min="0"
//                     step="100"
//                     className={`w-full pl-10 pr-4 py-2.5 bg-white border rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500/20 transition-all text-gray-800 ${
//                       errors.settlementAmount
//                         ? 'border-red-400 focus:border-red-400'
//                         : 'border-green-300 focus:border-green-500'
//                     }`}
//                   />
//                 </div>
//                 <p className="text-xs text-gray-500 mt-2">
//                   This will process a settlement transaction for the sub-company.
//                 </p>
//                 {errors.settlementAmount && (
//                   <p className="text-xs text-red-500 mt-1">{errors.settlementAmount}</p>
//                 )}
//               </div>
//             )}

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

//         <div className="sticky bottom-0 bg-white border-t border-gray-100 rounded-b-2xl flex justify-end gap-3 p-5">
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
//             Update Company
//           </button>
//         </div>
//       </div>
//     </div>
//   );
// };
