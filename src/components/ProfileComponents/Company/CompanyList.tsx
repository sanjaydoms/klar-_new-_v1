// import React, { useState, useEffect, useRef } from 'react';
// import {
//   Plus,
//   Search,
//   MoreVertical,
//   Mail,
//   Phone,
//   Edit,
//   Loader2,
//   Wallet,
//   UserCheck,
//   UserX,
// } from 'lucide-react';
// import { CreateCompanyModal } from './CreateCompanyModal';
// import { CompanyDetailsModal } from './CompanyDetailsModal';
// import { UpdateCompanyModal } from './UpdateCompanyModal';
// import { getAllCompanies, updateCompany } from '@/api/auth.api';
// import { Company } from '@/types/auth.type';

// export const CompanyList: React.FC = () => {
//   const [companies, setCompanies] = useState<Company[]>([]);
//   const [searchTerm, setSearchTerm] = useState('');
//   const [statusFilter, setStatusFilter] = useState<string>('all');
//   const [currentPage, setCurrentPage] = useState(1);
//   const [totalPages, setTotalPages] = useState(1);
//   const [totalCompanies, setTotalCompanies] = useState(0);
//   const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
//   const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);
//   const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
//   const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
//   const [openMenuId, setOpenMenuId] = useState<string | null>(null);
//   const [loading, setLoading] = useState(true);
//   const [error, setError] = useState<string | null>(null);
//   const [updatingStatusId, setUpdatingStatusId] = useState<string | null>(null);
//   const activeMenuRef = useRef<HTMLDivElement>(null);

//   useEffect(() => {
//     const timer = setTimeout(() => {
//       if (currentPage === 1) {
//         loadCompanies();
//       } else {
//         setCurrentPage(1);
//       }
//     }, 500);
//     return () => clearTimeout(timer);
//   }, [searchTerm, statusFilter]);

//   useEffect(() => {
//     loadCompanies();
//   }, [currentPage]);

//   useEffect(() => {
//     const handleClickOutside = (event: MouseEvent) => {
//       if (activeMenuRef.current && !activeMenuRef.current.contains(event.target as Node)) {
//         setOpenMenuId(null);
//       }
//     };
//     document.addEventListener('mousedown', handleClickOutside);
//     return () => document.removeEventListener('mousedown', handleClickOutside);
//   }, []);

//   const loadCompanies = async () => {
//     setLoading(true);
//     setError(null);
//     try {
//       const params: { page?: number; limit?: number; search?: string; status?: string } = {
//         page: currentPage,
//         limit: 10,
//       };
//       if (searchTerm && searchTerm.trim()) {
//         params.search = searchTerm;
//       }
//       if (statusFilter !== 'all') {
//         params.status = statusFilter;
//       }
//       const response = await getAllCompanies(params);
//       if (response.data.success) {
//         const companyData = response.data.data || [];
//         setCompanies(companyData);
//         setTotalPages(response.data.pagination?.totalPages || 1);
//         setTotalCompanies(response.data.pagination?.total || 0);
//       } else {
//         setError('Failed to load companies');
//       }
//     } catch (error: any) {
//       console.error('Failed to load companies:', error);
//       setError(error.response?.data?.message || 'Failed to load companies');
//     } finally {
//       setLoading(false);
//     }
//   };

//   const handleCreateCompany = () => {
//     loadCompanies();
//   };

//   const handleUpdateCompany = (updatedCompany: any) => {
//     setCompanies(
//       companies.map((company) =>
//         company?.id === updatedCompany?.id ? { ...company, ...updatedCompany } : company,
//       ),
//     );
//     loadCompanies();
//   };

//   const handleViewDetails = async (company: Company) => {
//     try {
//       const companyId = (company as any)._id || company.id;

//       if (!companyId) {
//         setError('Invalid company ID');
//         return;
//       }

//       setSelectedCompany(company);
//       setIsDetailsModalOpen(true);
//     } catch (error: any) {
//       console.error('Failed to fetch company details:', error);
//       setError(error.response?.data?.message || 'Failed to fetch company details');
//     }

//     setOpenMenuId(null);
//   };

//   const handleEditCompany = (company: Company) => {
//     if (company) {
//       setSelectedCompany(company);
//       setIsUpdateModalOpen(true);
//     }
//     setOpenMenuId(null);
//   };

//   const handleToggleStatus = async (company: Company) => {
//     const companyId = (company as any)._id || company.id;
//     if (!companyId) {
//       setError('Invalid company ID');
//       return;
//     }

//     setUpdatingStatusId(companyId);
//     const currentStatus = company.status?.toUpperCase() || 'ACTIVE';
//     const newStatus = currentStatus === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';

//     try {
//       const response = await updateCompany(companyId, { status: newStatus });
//       if (response.data.success) {
//         await loadCompanies();
//       } else {
//         setError(response.data.message || 'Failed to update status');
//       }
//     } catch (error: any) {
//       console.error('Failed to update status:', error);
//       setError(error.response?.data?.message || 'Failed to update status');
//     } finally {
//       setUpdatingStatusId(null);
//       setOpenMenuId(null);
//     }
//   };

//   const getStatusBadge = (status: string) => {
//     const statusLower = status?.toLowerCase() || 'active';
//     switch (statusLower) {
//       case 'active':
//         return (
//           <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700 whitespace-nowrap">
//             <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
//             Active
//           </span>
//         );
//       case 'inactive':
//         return (
//           <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600 whitespace-nowrap">
//             <span className="w-1.5 h-1.5 rounded-full bg-gray-400"></span>
//             Inactive
//           </span>
//         );
//       case 'blocked':
//         return (
//           <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700 whitespace-nowrap">
//             <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span>
//             Blocked
//           </span>
//         );
//       default:
//         return (
//           <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700 whitespace-nowrap">
//             <span className="w-1.5 h-1.5 rounded-full bg-yellow-500"></span>
//             {statusLower}
//           </span>
//         );
//     }
//   };

//   const formatCurrency = (amount: number, currency: string = 'INR') => {
//     return new Intl.NumberFormat('en-IN', {
//       style: 'currency',
//       currency: currency,
//       minimumFractionDigits: 0,
//       maximumFractionDigits: 0,
//     }).format(amount);
//   };

//   const getInitials = (businessName: string) => {
//     if (!businessName) return '?';
//     return businessName.charAt(0).toUpperCase();
//   };

//   const getShortId = (id: string) => {
//     if (!id) return 'N/A';
//     return id.slice(-8);
//   };

//   const getCompanyId = (company: Company) => {
//     return (company as any)._id || company.id;
//   };

//   const truncateText = (text: string, maxLength: number = 25) => {
//     if (!text) return 'N/A';
//     if (text.length <= maxLength) return text;
//     return text.substring(0, maxLength) + '...';
//   };

//   const truncateEmail = (email: string, maxLength: number = 20) => {
//     if (!email) return 'N/A';
//     if (email.length <= maxLength) return email;
//     return email.substring(0, maxLength) + '...';
//   };

//   if (loading && currentPage === 1) {
//     return (
//       <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-12">
//         <div className="text-center text-gray-400">Loading...</div>
//       </div>
//     );
//   }

//   return (
//     <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-x-auto">
//       <div className="p-6 border-b border-gray-100">
//         <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
//           <div>
//             <h2 className="text-xl font-bold text-gray-900">Sub-Companies</h2>
//             <p className="text-sm text-gray-500 mt-1">Manage your sub-companies and their access</p>
//           </div>
//           <button
//             onClick={() => setIsCreateModalOpen(true)}
//             className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#FF5A5F] text-white font-semibold rounded-xl hover:bg-[#ff4046] transition-colors shadow-lg shadow-red-500/20 whitespace-nowrap"
//           >
//             <Plus size={18} />
//             Add New Company
//           </button>
//         </div>

//         <div className="mt-5 flex flex-col sm:flex-row gap-3">
//           <div className="relative flex-1">
//             <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
//             <input
//               type="text"
//               placeholder="Search by business name, email or phone..."
//               value={searchTerm}
//               onChange={(e) => setSearchTerm(e.target.value)}
//               className="w-full pl-11 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#FF5A5F]/20 focus:border-[#FF5A5F] transition-all text-gray-800 placeholder:text-gray-400"
//             />
//           </div>
//           <select
//             value={statusFilter}
//             onChange={(e) => setStatusFilter(e.target.value)}
//             className="px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#FF5A5F]/20 focus:border-[#FF5A5F] transition-all text-gray-800"
//           >
//             <option value="all">All Status</option>
//             <option value="active">Active</option>
//             <option value="inactive">Inactive</option>
//             <option value="blocked">Blocked</option>
//           </select>
//         </div>
//       </div>

//       {error && (
//         <div className="mx-6 mt-4 px-4 py-2 bg-red-50 border border-red-200 rounded-lg">
//           <p className="text-sm text-red-600">{error}</p>
//         </div>
//       )}

//       <div className="overflow-x-auto">
//         <table className="w-full min-w-[1000px] lg:min-w-full">
//           <thead className="bg-gray-50 border-b border-gray-100">
//             <tr>
//               <th className="text-left px-4 md:px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider w-[20%]">
//                 Company Name
//               </th>
//               <th className="text-left px-4 md:px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider w-[25%]">
//                 Contact
//               </th>
//               <th className="text-left px-4 md:px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider w-[12%]">
//                 Wallet
//               </th>
//               <th className="text-left px-4 md:px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider w-[10%]">
//                 Status
//               </th>
//               {/* <th className="text-left px-4 md:px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider w-[13%]">
//                                 Created At
//                             </th> */}
//               <th className="text-right px-4 md:px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider w-[10%]">
//                 Actions
//               </th>
//             </tr>
//           </thead>
//           <tbody className="divide-y divide-gray-50">
//             {!companies || companies.length === 0 ? (
//               <tr>
//                 <td colSpan={6} className="px-6 py-12 text-center text-gray-400">
//                   {searchTerm || statusFilter !== 'all'
//                     ? 'No matching companies found'
//                     : 'No sub-companies found'}
//                 </td>
//               </tr>
//             ) : (
//               companies.map((company) => (
//                 <tr
//                   key={getCompanyId(company) || Math.random()}
//                   className={`hover:bg-gray-50/50 transition-colors relative ${
//                     openMenuId === getCompanyId(company) ? 'z-50' : ''
//                   }`}
//                 >
//                   <td className="px-4 md:px-6 py-4">
//                     <div className="flex items-center gap-3">
//                       <div className="w-9 h-9 bg-gradient-to-br from-blue-100 to-blue-200 rounded-full flex items-center justify-center text-blue-600 font-semibold text-sm flex-shrink-0">
//                         {getInitials(
//                           company?.businessProfile?.businessName || company?.email || 'C',
//                         )}
//                       </div>
//                       <div className="min-w-0">
//                         <p
//                           className="font-medium text-gray-900 truncate max-w-[150px] md:max-w-[200px]"
//                           title={company?.businessProfile?.businessName || 'N/A'}
//                         >
//                           {truncateText(company?.businessProfile?.businessName || 'N/A', 14)}
//                         </p>
//                         <p className="text-xs text-gray-400 font-mono">
//                           ID: {getShortId(getCompanyId(company))}
//                         </p>
//                       </div>
//                     </div>
//                   </td>
//                   <td className="px-4 md:px-6 py-4">
//                     <div className="space-y-1 min-w-[150px]">
//                       <div className="flex items-center gap-1.5 text-sm text-gray-600">
//                         <Mail size={14} className="text-gray-400 flex-shrink-0" />
//                         <span className="truncate" title={company?.email || 'N/A'}>
//                           {truncateEmail(company?.email || 'N/A', 20)}
//                         </span>
//                       </div>
//                       <div className="flex items-center gap-1.5 text-sm text-gray-600">
//                         <Phone size={14} className="text-gray-400 flex-shrink-0" />
//                         <span
//                           className="truncate"
//                           title={
//                             company?.businessProfile?.businessMobile || company?.mobile || 'N/A'
//                           }
//                         >
//                           {company?.businessProfile?.businessMobile || company?.mobile || 'N/A'}
//                         </span>
//                       </div>
//                     </div>
//                   </td>
//                   <td className="px-4 md:px-6 py-4">
//                     <div className="flex items-center gap-1.5 whitespace-nowrap">
//                       <Wallet size={14} className="text-gray-400 flex-shrink-0" />
//                       <span
//                         className={`text-sm font-semibold ${
//                           (company?.wallet?.balance || 0) < 0
//                             ? 'text-red-600'
//                             : (company?.wallet?.balance || 0) === 0
//                               ? 'text-gray-600'
//                               : 'text-green-600'
//                         }`}
//                       >
//                         {formatCurrency(company?.wallet?.balance || 0, company?.wallet?.currency)}
//                       </span>
//                     </div>
//                   </td>
//                   <td className="px-4 md:px-6 py-4">{getStatusBadge(company?.status)}</td>
//                   {/* <td className="px-4 md:px-6 py-4">
//                                         <div className="flex items-center gap-1.5 text-sm text-gray-600 whitespace-nowrap">
//                                             <Calendar size={14} className="text-gray-400 flex-shrink-0" />
//                                             {formatDate(company?.createdAt)}
//                                         </div>
//                                     </td> */}
//                   <td className="px-4 md:px-6 py-4 text-right relative">
//                     <div className="relative inline-block">
//                       <button
//                         onClick={(e) => {
//                           e.stopPropagation();
//                           setOpenMenuId(
//                             openMenuId === getCompanyId(company) ? null : getCompanyId(company),
//                           );
//                         }}
//                         className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
//                         disabled={updatingStatusId === getCompanyId(company)}
//                       >
//                         {updatingStatusId === getCompanyId(company) ? (
//                           <Loader2 size={18} className="animate-spin text-gray-400" />
//                         ) : (
//                           <MoreVertical size={18} className="text-gray-400" />
//                         )}
//                       </button>
//                       {openMenuId === getCompanyId(company) && company && (
//                         <div
//                           ref={activeMenuRef}
//                           className="absolute right-0 mt-2 z-50 w-44 bg-white rounded-xl shadow-lg border border-gray-100 overflow-visible"
//                           style={{
//                             top: '100%',
//                             position: 'absolute',
//                           }}
//                         >
//                           <button
//                             onClick={() => handleViewDetails(company)}
//                             className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
//                           >
//                             <UserCheck size={14} />
//                             View Details
//                           </button>
//                           <button
//                             onClick={() => handleEditCompany(company)}
//                             className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
//                           >
//                             <Edit size={14} />
//                             Edit Details
//                           </button>
//                           <button
//                             onClick={() => handleToggleStatus(company)}
//                             className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
//                           >
//                             <UserX size={14} />
//                             {company?.status?.toLowerCase() === 'active'
//                               ? 'Deactivate'
//                               : 'Activate'}
//                           </button>
//                         </div>
//                       )}
//                     </div>
//                   </td>
//                 </tr>
//               ))
//             )}
//           </tbody>
//         </table>
//       </div>

//       {totalPages > 1 && (
//         <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between">
//           <div className="text-sm text-gray-500">
//             Page {currentPage} of {totalPages}
//           </div>
//           <div className="flex gap-2">
//             <button
//               onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
//               disabled={currentPage === 1}
//               className="px-3 py-1 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
//             >
//               Previous
//             </button>
//             <button
//               onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
//               disabled={currentPage === totalPages}
//               className="px-3 py-1 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
//             >
//               Next
//             </button>
//           </div>
//         </div>
//       )}

//       <CreateCompanyModal
//         isOpen={isCreateModalOpen}
//         onClose={() => setIsCreateModalOpen(false)}
//         onCreate={handleCreateCompany}
//       />

//       <UpdateCompanyModal
//         isOpen={isUpdateModalOpen}
//         onClose={() => setIsUpdateModalOpen(false)}
//         onUpdate={handleUpdateCompany}
//         company={selectedCompany}
//       />

//       <CompanyDetailsModal
//         isOpen={isDetailsModalOpen}
//         onClose={() => setIsDetailsModalOpen(false)}
//         company={selectedCompany}
//       />
//     </div>
//   );
// };
