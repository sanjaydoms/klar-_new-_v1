import React, { useState } from 'react';
import { downloadFlightVoucher } from '../../../api/flightService.api';
import { notifyInfo, notifySuccess } from '@/utils/notify';

interface TicketActionsProps {
  bookingId?: string;
  onDownloadPDF?: () => void;
  onEmailTicket?: () => void;
  onShare?: () => void;
  onAddToCalendar?: () => void;
}

const TicketActions: React.FC<TicketActionsProps> = ({
  bookingId,
  onDownloadPDF,
  onEmailTicket,
  onShare,
  onAddToCalendar,
}) => {
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const [showEmailComingSoon, setShowEmailComingSoon] = useState(false);

  // Handle PDF download
  const handleDownloadPDF = async () => {
    // If custom handler is provided, use it
    if (onDownloadPDF) {
      onDownloadPDF();
      return;
    }

    // Otherwise use the API
    if (!bookingId) {
      console.error('❌ No booking ID provided for download');
      setDownloadError('Booking ID is required to download the voucher');
      return;
    }

    try {
      setIsDownloading(true);
      setDownloadError(null);
      console.log('📥 Downloading voucher for booking ID:', bookingId);

      const response = await downloadFlightVoucher(bookingId);

      // Create a blob from the response data
      const blob = new Blob([response.data], { type: 'application/pdf' });

      // Create a download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Flight_Voucher_${bookingId}.pdf`;

      // Trigger download
      document.body.appendChild(link);
      link.click();

      // Cleanup
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      console.log('✅ Voucher downloaded successfully');
    } catch (error: any) {
      console.error('❌ Failed to download voucher:', error);
      setDownloadError(error?.message || 'Failed to download voucher. Please try again.');
    } finally {
      setIsDownloading(false);
    }
  };

  // Handle email ticket
  const handleEmailTicket = () => {
    if (onEmailTicket) {
      onEmailTicket();
    } else {

      if (!bookingId) {
        console.error('❌ No booking ID provided for email');
        return;
      }
      setShowEmailComingSoon(true);
      // Auto-hide after 3 seconds
      setTimeout(() => {
        setShowEmailComingSoon(false);
      }, 3000);
    }
  };

  // Handle share
  const handleShare = () => {
    if (onShare) {
      onShare();
    } else {
      // Default share functionality
      if (navigator.share) {
        navigator.share({
          title: 'Flight Ticket',
          text: `Here is my flight ticket. Booking ID: ${bookingId}`,
          url: window.location.href,
        }).catch((error) => {
          console.log('Share cancelled or error:', error);
        });
      } else {
        // Fallback: copy to clipboard
        const url = window.location.href;
        navigator.clipboard.writeText(url).then(() => {
          notifySuccess('Link copied to clipboard!');
        }).catch(() => {
          notifyInfo('Share this page: ' + window.location.href);
        });
      }
    }
  };

  // Handle add to calendar
  const handleAddToCalendar = () => {
    if (onAddToCalendar) {
      onAddToCalendar();
    } else {
      // Default calendar functionality
      console.log('📅 Add to calendar for booking:', bookingId);
      notifyInfo('Add to calendar feature coming soon!');
    }
  };

  const actions = [
    {
      id: 'download',
      label: isDownloading ? 'DOWNLOADING...' : 'DOWNLOAD PDF',
      icon: isDownloading ? (
        <svg
          className="w-5 h-5 animate-spin"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.5}
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
      ) : (
        <svg
          className="w-5 h-5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.5}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
          />
        </svg>
      ),
      onClick: handleDownloadPDF,
      disabled: isDownloading,
    },
    {
      id: 'email',
      label: 'EMAIL TICKET',
      icon: (
        <svg
          className="w-5 h-5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.5}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
          />
        </svg>
      ),
      onClick: handleEmailTicket,
    },
  ];

  return (
    <div className="block md:hidden lg:hidden rounded-xl p-4 mb-4">
      {/* Error message */}
      {downloadError && (
        <div className="mb-3 p-2 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-xs text-red-600">{downloadError}</p>
        </div>
      )}

      {showEmailComingSoon && (
        <div className="mb-3 p-3 bg-blue-50 border border-blue-200 rounded-lg animate-pulse">
          <p className="text-sm font-medium text-blue-700 text-center">
            📧 Email Ticket feature coming soon!
          </p>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        {actions.map((action) => (
          <button
            key={action.id}
            onClick={action.onClick}
            disabled={action.disabled}
            className={`flex items-center justify-center gap-2 py-3 px-2 rounded-lg border border-[#93C5FD] transition-all duration-200 hover:scale-[1.02] w-full h-14 ${action.disabled ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            style={{ background: '#DBEAFE' }}
          >
            <span className="text-blue-600 flex-shrink-0">{action.icon}</span>
            <span className="text-xs font-semibold text-gray-700 text-center leading-tight">
              {action.label}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
};

export default TicketActions;