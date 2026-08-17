import React from 'react';
import { Mail, Phone, Calendar, Shield, User, BadgeCheck, Clock, UserCheck } from 'lucide-react';
import { RM } from '@/api/auth.api';

interface RMDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  rm: RM | null;
}

export const RMDetailsModal: React.FC<RMDetailsModalProps> = ({ isOpen, onClose, rm }) => {
  if (!isOpen || !rm) return null;

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-IN', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'active':
        return {
          bg: 'bg-green-100',
          text: 'text-green-700',
          icon: <BadgeCheck size={16} />,
          label: 'Active',
        };
      case 'inactive':
        return {
          bg: 'bg-gray-100',
          text: 'text-gray-600',
          icon: <UserCheck size={16} />,
          label: 'Inactive',
        };
      default:
        return {
          bg: 'bg-yellow-100',
          text: 'text-yellow-700',
          icon: <Clock size={16} />,
          label: 'Pending',
        };
    }
  };

  const getCreatedByName = (createdBy: any) => {
    if (typeof createdBy === 'object' && createdBy !== null) {
      return createdBy.memberName || createdBy.email;
    }
    return createdBy || 'System';
  };

  const statusConfig = getStatusConfig(rm?.status?.toLowerCase() || 'pending');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative w-full max-w-md mx-4 bg-white rounded-2xl shadow-2xl animate-in fade-in zoom-in duration-200 overflow-hidden">
        {/* Header */}
        <div className="relative bg-gradient-to-r from-[#FF5A5F] to-[#ff4046] px-6 py-6">
          {/* Profile Section */}
          <div className="flex items-center gap-4 pr-10">
            {/* Avatar */}
            <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-lg flex-shrink-0">
              <span className="text-2xl font-bold text-[#FF5A5F]">
                {(rm?.memberName?.charAt(0) || '?').toUpperCase()}
              </span>
            </div>

            {/* User Info */}
            <div className="flex-1 min-w-0 ml-3">
              <h3 className="text-lg font-bold text-white truncate">{rm?.memberName || 'N/A'}</h3>

              <p className="text-sm text-white/90 flex items-center gap-1 mt-1">
                <Phone size={12} />
                {rm?.mobile || 'N/A'}
              </p>

              <p className="text-sm text-white/90 flex items-center gap-1 truncate">
                <Mail size={12} />
                {rm?.email || 'N/A'}
              </p>

              <div className="inline-flex items-center gap-1.5 mt-2 px-3 py-1 rounded-full bg-white/20 text-white text-xs font-medium">
                {statusConfig.icon}
                {statusConfig.label}
              </div>
            </div>
          </div>
        </div>

        {/* Details */}
        <div className="p-6 space-y-5">
          {/* Role */}
          <div className="flex items-center justify-between py-2 border-b border-gray-100">
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <Shield size={16} />
              <span>Role</span>
            </div>
            <span className="inline-flex px-2 py-0.5 rounded-md bg-red-50 text-red-600 text-xs font-medium">
              {rm.role}
            </span>
          </div>

          {/* Created By */}
          <div className="flex items-center justify-between py-2 border-b border-gray-100">
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <User size={16} />
              <span>Created By</span>
            </div>
            <span className="text-sm text-gray-800">{getCreatedByName(rm.createdBy)}</span>
          </div>

          {/* Created At */}
          <div className="flex items-center justify-between py-2 border-b border-gray-100">
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <Calendar size={16} />
              <span>Created At</span>
            </div>
            <span className="text-sm text-gray-800">{formatDate(rm.createdAt)}</span>
          </div>

          {/* Updated At */}
          {rm.updatedAt && (
            <div className="flex items-center justify-between py-2">
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <Calendar size={16} />
                <span>Last Updated</span>
              </div>
              <span className="text-sm text-gray-800">{formatDate(rm.updatedAt)}</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 bg-gray-50">
          <button
            onClick={onClose}
            className="w-full py-2.5 bg-[#FF5A5F] text-white font-medium rounded-xl hover:bg-[#ff4046] transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
