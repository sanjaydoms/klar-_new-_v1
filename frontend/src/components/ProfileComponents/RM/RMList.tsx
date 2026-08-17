// import React, { useState, useEffect, useRef } from 'react';
// import {
//   Plus,
//   Search,
//   MoreVertical,
//   UserCheck,
//   UserX,
//   Mail,
//   Phone,
//   Calendar,
//   Edit,
//   Loader2,
// } from 'lucide-react';
// import { CreateRMModal } from './CreateRMModal';
// import { RMDetailsModal } from './RMDetailsModal';
// import { UpdateRMModal } from './UpdateRMModal';
// import { getAllRMs, getRMById, updateRM } from '@/api/auth.api';
// import { RM } from '@/types/auth.type';

// export const RMList: React.FC = () => {
//   const [rms, setRms] = useState<RM[]>([]);
//   const [searchTerm, setSearchTerm] = useState('');
//   const [statusFilter, setStatusFilter] = useState<string>('all');
//   const [currentPage, setCurrentPage] = useState(1);
//   const [totalPages, setTotalPages] = useState(1);
//   const [totalRMs, setTotalRMs] = useState(0);
//   const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
//   const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);
//   const [selectedRM, setSelectedRM] = useState<RM | null>(null);
//   const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
//   const [openMenuId, setOpenMenuId] = useState<string | null>(null);
//   const [loading, setLoading] = useState(true);
//   const [error, setError] = useState<string | null>(null);
//   const [updatingStatusId, setUpdatingStatusId] = useState<string | null>(null);
//   const activeMenuRef = useRef<HTMLDivElement>(null);

//   useEffect(() => {
//     const timer = setTimeout(() => {
//       if (currentPage === 1) {
//         loadRMs();
//       } else {
//         setCurrentPage(1);
//       }
//     }, 500);
//     return () => clearTimeout(timer);
//   }, [searchTerm, statusFilter]);

//   useEffect(() => {
//     loadRMs();
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

//   const loadRMs = async () => {
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
//       const response = await getAllRMs(params);
//       if (response.data.success) {
//         const rmData = response.data.data || [];
//         setRms(rmData);
//         setTotalPages(response.data.pagination?.totalPages || 1);
//         setTotalRMs(response.data.pagination?.total || 0);
//       } else {
//         setError('Failed to load RMs');
//       }
//     } catch (error: any) {
//       console.error('Failed to load RMs:', error);
//       setError(error.response?.data?.message || 'Failed to load RMs');
//     } finally {
//       setLoading(false);
//     }
//   };

//   const handleCreateRM = () => {
//     loadRMs();
//   };

//   const handleUpdateRM = (updatedRM: any) => {
//     setRms(rms.map((rm) => (rm?.id === updatedRM?.id ? { ...rm, ...updatedRM } : rm)));
//     loadRMs();
//   };

//   const handleViewDetails = async (rm: RM) => {
//     try {
//       const rmId = (rm as any)._id || rm.id;

//       if (!rmId) {
//         setError('Invalid RM ID');
//         return;
//       }

//       const response = await getRMById(rmId);

//       if (response.data.success) {
//         setSelectedRM(response.data.data);
//         setIsDetailsModalOpen(true);
//       } else {
//         setError(response.data.message || 'Failed to fetch RM details');
//       }
//     } catch (error: any) {
//       console.error('Failed to fetch RM details:', error);
//       setError(error.response?.data?.message || 'Failed to fetch RM details');
//     }

//     setOpenMenuId(null);
//   };

//   const handleEditRM = (rm: RM) => {
//     if (rm) {
//       setSelectedRM(rm);
//       setIsUpdateModalOpen(true);
//     }
//     setOpenMenuId(null);
//   };

//   const handleToggleStatus = async (rm: RM) => {
//     const rmId = (rm as any)._id || rm.id;
//     if (!rmId) {
//       setError('Invalid RM ID');
//       return;
//     }

//     setUpdatingStatusId(rmId);
//     const currentStatus = rm.status?.toUpperCase() || 'ACTIVE';
//     const newStatus = currentStatus === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';

//     try {
//       const response = await updateRM(rmId, { status: newStatus });
//       if (response.data.success) {
//         await loadRMs();
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
//     const statusLower = status?.toLowerCase() || 'pending';
//     switch (statusLower) {
//       case 'active':
//         return (
//           <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
//             <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
//             Active
//           </span>
//         );
//       case 'inactive':
//         return (
//           <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
//             <span className="w-1.5 h-1.5 rounded-full bg-gray-400"></span>
//             Inactive
//           </span>
//         );
//       default:
//         return (
//           <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700">
//             <span className="w-1.5 h-1.5 rounded-full bg-yellow-500"></span>
//             Pending
//           </span>
//         );
//     }
//   };

//   const formatDate = (dateString: string) => {
//     if (!dateString) return 'N/A';
//     try {
//       return new Date(dateString).toLocaleDateString('en-IN', {
//         day: '2-digit',
//         month: 'short',
//         year: 'numeric',
//       });
//     } catch {
//       return 'N/A';
//     }
//   };

//   const getInitials = (name: string) => {
//     if (!name) return '?';
//     return name.charAt(0).toUpperCase();
//   };

//   const getShortId = (id: string) => {
//     if (!id) return 'N/A';
//     return id.slice(-8);
//   };

//   const getRMId = (rm: RM) => {
//     return (rm as any)._id || rm.id;
//   };

//   if (loading && currentPage === 1) {
//     return (
//       <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-12">
//         <div className="text-center text-gray-400">Loading...</div>
//       </div>
//     );
//   }

//   return (
//     <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-visible">
//       <div className="p-6 border-b border-gray-100">
//         <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
//           <div>
//             <h2 className="text-xl font-bold text-gray-900">Relationship Managers</h2>
//             <p className="text-sm text-gray-500 mt-1">
//               Manage your RM team members and their access
//             </p>
//             {totalRMs > 0 && (
//               <p className="text-xs text-gray-400 mt-1">
//                 Total: {totalRMs} RM{totalRMs !== 1 ? 's' : ''}
//               </p>
//             )}
//           </div>
//           <button
//             onClick={() => setIsCreateModalOpen(true)}
//             className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#FF5A5F] text-white font-semibold rounded-xl hover:bg-[#ff4046] transition-colors shadow-lg shadow-red-500/20"
//           >
//             <Plus size={18} />
//             Add New RM
//           </button>
//         </div>

//         <div className="mt-5 flex flex-col sm:flex-row gap-3">
//           <div className="relative flex-1">
//             <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
//             <input
//               type="text"
//               placeholder="Search by name, email or phone..."
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
//             <option value="pending">Pending</option>
//           </select>
//         </div>
//       </div>

//       {error && (
//         <div className="mx-6 mt-4 px-4 py-2 bg-red-50 border border-red-200 rounded-lg">
//           <p className="text-sm text-red-600">{error}</p>
//         </div>
//       )}

//       <div>
//         <table className="w-full min-w-[800px]">
//           <thead className="bg-gray-50 border-b border-gray-100">
//             <tr>
//               <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
//                 Member Name
//               </th>
//               <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
//                 Contact
//               </th>
//               <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
//                 Status
//               </th>
//               <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
//                 Created At
//               </th>
//               {/* <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
//                                 Created By
//                             </th> */}
//               <th className="text-right px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
//                 Actions
//               </th>
//             </tr>
//           </thead>
//           <tbody className="divide-y divide-gray-50">
//             {!rms || rms.length === 0 ? (
//               <tr>
//                 <td colSpan={6} className="px-6 py-12 text-center text-gray-400">
//                   {searchTerm || statusFilter !== 'all'
//                     ? 'No matching Relationship Managers found'
//                     : 'No Relationship Managers found'}
//                 </td>
//               </tr>
//             ) : (
//               rms.map((rm) => (
//                 <tr
//                   key={getRMId(rm) || Math.random()}
//                   className={`hover:bg-gray-50/50 transition-colors relative ${
//                     openMenuId === getRMId(rm) ? 'z-50' : ''
//                   }`}
//                 >
//                   <td className="px-6 py-4">
//                     <div className="flex items-center gap-3">
//                       <div className="w-9 h-9 bg-gradient-to-br from-red-100 to-red-200 rounded-full flex items-center justify-center text-red-600 font-semibold text-sm">
//                         {getInitials(rm?.memberName)}
//                       </div>
//                       <div>
//                         <p className="font-medium text-gray-900">{rm?.memberName || 'N/A'}</p>
//                         <p className="text-xs text-gray-400 font-mono">
//                           ID: {getShortId(getRMId(rm))}
//                         </p>
//                       </div>
//                     </div>
//                   </td>
//                   <td className="px-6 py-4">
//                     <div className="space-y-1">
//                       <div className="flex items-center gap-1.5 text-sm text-gray-600">
//                         <Mail size={14} className="text-gray-400" />
//                         {rm?.email || 'N/A'}
//                       </div>
//                       <div className="flex items-center gap-1.5 text-sm text-gray-600">
//                         <Phone size={14} className="text-gray-400" />
//                         {rm?.mobile || 'N/A'}
//                       </div>
//                     </div>
//                   </td>
//                   <td className="px-6 py-4">{getStatusBadge(rm?.status)}</td>
//                   <td className="px-6 py-4">
//                     <div className="flex items-center gap-1.5 text-sm text-gray-600">
//                       <Calendar size={14} className="text-gray-400" />
//                       {formatDate(rm?.createdAt)}
//                     </div>
//                   </td>
//                   {/* <td className="px-6 py-4">
//                                         <div className="flex items-center gap-1.5 text-sm text-gray-600">
//                                             <Shield size={14} className="text-gray-400" />
//                                             {getCreatedByName(rm?.createdBy)}
//                                         </div>
//                                     </td> */}
//                   <td className="px-6 py-4 text-right relative">
//                     <div className="relative inline-block">
//                       <button
//                         onClick={(e) => {
//                           e.stopPropagation();
//                           setOpenMenuId(openMenuId === getRMId(rm) ? null : getRMId(rm));
//                         }}
//                         className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
//                         disabled={updatingStatusId === getRMId(rm)}
//                       >
//                         {updatingStatusId === getRMId(rm) ? (
//                           <Loader2 size={18} className="animate-spin text-gray-400" />
//                         ) : (
//                           <MoreVertical size={18} className="text-gray-400" />
//                         )}
//                       </button>
//                       {openMenuId === getRMId(rm) && rm && (
//                         <div
//                           ref={activeMenuRef}
//                           className="absolute right-0 mt-2 z-50 w-44 bg-white rounded-xl shadow-lg border border-gray-100 overflow-visible"
//                           style={{
//                             top: '100%',
//                             position: 'absolute',
//                           }}
//                         >
//                           <button
//                             onClick={() => handleViewDetails(rm)}
//                             className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
//                           >
//                             <UserCheck size={14} />
//                             View Details
//                           </button>
//                           <button
//                             onClick={() => handleEditRM(rm)}
//                             className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
//                           >
//                             <Edit size={14} />
//                             Edit Details
//                           </button>
//                           <button
//                             onClick={() => handleToggleStatus(rm)}
//                             className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
//                           >
//                             <UserX size={14} />
//                             {rm?.status?.toLowerCase() === 'active' ? 'Deactivate' : 'Activate'}
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

//       <CreateRMModal
//         isOpen={isCreateModalOpen}
//         onClose={() => setIsCreateModalOpen(false)}
//         onCreate={handleCreateRM}
//       />

//       <UpdateRMModal
//         isOpen={isUpdateModalOpen}
//         onClose={() => setIsUpdateModalOpen(false)}
//         onUpdate={handleUpdateRM}
//         rm={selectedRM}
//       />

//       <RMDetailsModal
//         isOpen={isDetailsModalOpen}
//         onClose={() => setIsDetailsModalOpen(false)}
//         rm={selectedRM}
//       />
//     </div>
//   );
// };
