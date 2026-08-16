import React from 'react';
import {
  Mail,
  Phone,
  Calendar,
  Building2,
  User,
  MapPin,
  Briefcase,
  Wallet,
  CreditCard,
  CheckCircle,
  XCircle,
  Clock,
} from 'lucide-react';
import { Company } from '@/types/auth.type';

interface CompanyDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  company: Company | null;
}

export const CompanyDetailsModal: React.FC<CompanyDetailsModalProps> = ({
  isOpen,
  onClose,
  company,
}) => {
  if (!isOpen || !company) return null;

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-IN', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatCurrency = (amount: number, currency: string = 'INR') => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  const getStatusConfig = (status: string) => {
    const statusUpper = status?.toUpperCase() || 'ACTIVE';
    switch (statusUpper) {
      case 'ACTIVE':
        return {
          bg: 'bg-green-100',
          text: 'text-green-700',
          icon: <CheckCircle size={16} />,
          label: 'Active',
        };
      case 'INACTIVE':
        return {
          bg: 'bg-gray-100',
          text: 'text-gray-600',
          icon: <Clock size={16} />,
          label: 'Inactive',
        };
      case 'BLOCKED':
        return {
          bg: 'bg-red-100',
          text: 'text-red-700',
          icon: <XCircle size={16} />,
          label: 'Blocked',
        };
      default:
        return {
          bg: 'bg-yellow-100',
          text: 'text-yellow-700',
          icon: <Clock size={16} />,
          label: statusUpper,
        };
    }
  };

  const getVerificationStatusConfig = (status: string) => {
    const statusUpper = status?.toUpperCase() || 'PENDING';
    switch (statusUpper) {
      case 'APPROVED':
        return {
          bg: 'bg-green-100',
          text: 'text-green-700',
          icon: <CheckCircle size={14} />,
          label: 'Verified',
        };
      case 'PENDING':
        return {
          bg: 'bg-yellow-100',
          text: 'text-yellow-700',
          icon: <Clock size={14} />,
          label: 'Pending',
        };
      case 'REJECTED':
        return {
          bg: 'bg-red-100',
          text: 'text-red-700',
          icon: <XCircle size={14} />,
          label: 'Rejected',
        };
      default:
        return {
          bg: 'bg-gray-100',
          text: 'text-gray-600',
          icon: <Clock size={14} />,
          label: statusUpper,
        };
    }
  };

  const statusConfig = getStatusConfig(company?.status);
  const verificationConfig = getVerificationStatusConfig(
    company?.verification?.status || 'PENDING',
  );

  const getCreatedByName = (createdBy: any) => {
    if (typeof createdBy === 'object' && createdBy !== null) {
      return createdBy.businessProfile?.businessName || createdBy.memberName || createdBy.email;
    }
    return createdBy || 'System';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full max-w-2xl mx-4 bg-white rounded-2xl shadow-2xl animate-in fade-in zoom-in duration-200 max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 z-10 bg-gradient-to-r from-[#FF5A5F] to-[#ff4046] px-6 py-6">
          <div className="flex items-center gap-4 pr-10">
            <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-lg flex-shrink-0">
              <Building2 size={32} className="text-[#FF5A5F]" />
            </div>

            <div className="flex-1 min-w-0">
              <h3 className="text-xl font-bold text-white truncate">
                {company?.businessProfile?.businessName || 'N/A'}
              </h3>

              <div className="flex items-center gap-2 mt-2">
                <div
                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full ${statusConfig.bg} text-xs font-medium`}
                >
                  {statusConfig.icon}
                  {statusConfig.label}
                </div>
                <div
                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full ${verificationConfig.bg} text-xs font-medium`}
                >
                  {verificationConfig.icon}
                  {verificationConfig.label}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Business Information Section */}
          <div>
            <h4 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">
              Business Information
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center gap-2 text-sm">
                <Briefcase size={16} className="text-gray-400" />
                <span className="text-gray-500">Type:</span>
                <span className="text-gray-800 font-medium">
                  {company?.businessProfile?.businessType || 'N/A'}
                </span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <User size={16} className="text-gray-400" />
                <span className="text-gray-500">Contact Person:</span>
                <span className="text-gray-800 font-medium">
                  {company?.businessProfile?.contactPerson || 'N/A'}
                </span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Mail size={16} className="text-gray-400" />
                <span className="text-gray-500">Email:</span>
                <span className="text-gray-800 font-medium truncate">
                  {company?.email || 'N/A'}
                </span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Phone size={16} className="text-gray-400" />
                <span className="text-gray-500">Mobile:</span>
                <span className="text-gray-800 font-medium">
                  {company?.businessProfile?.businessMobile || company?.mobile || 'N/A'}
                </span>
              </div>
            </div>
          </div>

          {/* Tax Information */}
          {(company?.businessProfile?.gstNumber || company?.businessProfile?.panNumber) && (
            <div>
              <h4 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">
                Tax Information
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {company?.businessProfile?.gstNumber && (
                  <div className="flex items-center gap-2 text-sm">
                    <CreditCard size={16} className="text-gray-400" />
                    <span className="text-gray-500">GST Number:</span>
                    <span className="text-gray-800 font-medium">
                      {company.businessProfile.gstNumber}
                    </span>
                  </div>
                )}
                {company?.businessProfile?.panNumber && (
                  <div className="flex items-center gap-2 text-sm">
                    <CreditCard size={16} className="text-gray-400" />
                    <span className="text-gray-500">PAN Number:</span>
                    <span className="text-gray-800 font-medium">
                      {company.businessProfile.panNumber}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Address */}
          <div>
            <h4 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">
              Address
            </h4>
            <div className="flex items-start gap-2 text-sm">
              <MapPin size={16} className="text-gray-400 mt-0.5" />
              <div className="text-gray-800">
                <p>{company?.businessProfile?.address || 'N/A'}</p>
                <p>
                  {company?.businessProfile?.city && `${company.businessProfile.city}, `}
                  {company?.businessProfile?.country || ''}
                </p>
              </div>
            </div>
          </div>

          {/* Wallet Information */}
          {company?.wallet && (
            <div>
              <h4 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">
                Wallet Information
              </h4>
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Wallet size={20} className="text-blue-600" />
                    <span className="text-sm font-semibold text-gray-700">Balance</span>
                  </div>
                  <div className="text-2xl font-bold text-blue-600">
                    {formatCurrency(company.wallet.balance, company.wallet.currency)}
                  </div>
                </div>
                <div className="mt-2 flex items-center gap-4 text-xs text-gray-500">
                  <span>Currency: {company.wallet.currency}</span>
                  <span>Status: {company.wallet.status}</span>
                </div>
              </div>
            </div>
          )}

          {/* Metadata */}
          <div className="border-t border-gray-100 pt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <Calendar size={14} />
                <span>Created: {formatDate(company?.createdAt)}</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <Calendar size={14} />
                <span>Last Updated: {formatDate(company?.updatedAt)}</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <User size={14} />
                <span>Created By: {getCreatedByName(company?.createdBy)}</span>
              </div>
              {company?.verification?.verifiedAt && (
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <CheckCircle size={14} />
                  <span>Verified: {formatDate(company.verification.verifiedAt)}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="sticky bottom-0 px-6 py-4 border-t border-gray-100 bg-gray-50">
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
