import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Printer, Calendar, LayoutDashboard, Loader2 } from 'lucide-react';
import { downloadFlightVoucher } from '@/api/flightService.api';
import { notifyError } from '@/utils/notify';

interface BookingActionsProps {
  // Explicitly `| undefined`: under exactOptionalPropertyTypes, `bookingId?: string`
  // means the prop may be OMITTED but not passed as undefined, and the
  // confirmation page passes the resolved id through whether or not one was found.
  bookingId?: string | undefined;
}

export default function BookingActions({ bookingId }: BookingActionsProps) {
  const navigate = useNavigate();
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadStatus, setDownloadStatus] = useState<'idle' | 'downloading' | 'success' | 'error'>('idle');

  const handlePrint = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!bookingId) {
      console.error('❌ No booking ID available for voucher download');
      notifyError('Booking ID is required to download the voucher. Please try again.');
      return;
    }

    setIsDownloading(true);
    setDownloadStatus('downloading');

    try {
      console.log('📥 Downloading voucher for booking ID:', bookingId);

      const response = await downloadFlightVoucher(bookingId);

      // Create a blob URL for the PDF
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);

      // Create a temporary link element and trigger download
      const link = document.createElement('a');
      link.href = url;
      link.download = `Voucher_${bookingId}.pdf`;
      document.body.appendChild(link);
      link.click();

      // Clean up
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      console.log('✅ Voucher downloaded successfully');
      setDownloadStatus('success');
      
      // Reset status after 2 seconds
      setTimeout(() => {
        setDownloadStatus('idle');
      }, 2000);
    } catch (error: any) {
      console.error('❌ Voucher download failed:', error);
      setDownloadStatus('error');
      notifyError(error?.response?.data?.message || 'Failed to download voucher. Please try again.');
      
      // Reset status after 3 seconds
      setTimeout(() => {
        setDownloadStatus('idle');
      }, 3000);
    } finally {
      setIsDownloading(false);
    }
  };

  const handleViewAllBookings = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    console.log('📋 View All Bookings button clicked - Navigating to bookings page...');
    navigate('/my-bookings');
  };

  const handleGoToDashboard = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    console.log('🏠 Go to Dashboard button clicked - Navigating to dashboard...');
    navigate('/dashboard');
  };

  // Get button styles based on status
  const getButtonStyles = () => {
    if (isDownloading) {
      return 'bg-blue-100 text-blue-700 border-blue-300 cursor-wait';
    }
    if (downloadStatus === 'success') {
      return 'bg-green-100 text-green-700 border-green-300';
    }
    if (downloadStatus === 'error') {
      return 'bg-red-100 text-red-700 border-red-300';
    }
    return 'bg-blue-50 hover:bg-blue-100 active:bg-blue-200 text-blue-700 border-blue-200 hover:scale-105 active:scale-95';
  };

  // Get button text based on status
  const getButtonText = () => {
    if (isDownloading) return 'Downloading...';
    if (downloadStatus === 'success') return 'Downloaded!';
    if (downloadStatus === 'error') return 'Failed!';
    return 'Download Voucher';
  };

  // Get icon based on status
  const getButtonIcon = () => {
    if (isDownloading) return <Loader2 className="w-4 h-4 animate-spin" />;
    if (downloadStatus === 'success') return <Printer className="w-4 h-4" />;
    if (downloadStatus === 'error') return <Printer className="w-4 h-4" />;
    return <Printer className="w-4 h-4" />;
  };

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-2">
        <button
          type="button"
          onClick={handlePrint}
          disabled={isDownloading}
          className={`flex items-center justify-center gap-2 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 cursor-pointer border ${getButtonStyles()}`}
        >
          {getButtonIcon()}
          {getButtonText()}
        </button>
        <button
          type="button"
          onClick={handleViewAllBookings}
          className="flex items-center justify-center gap-2 px-4 py-3 bg-green-50 hover:bg-green-100 active:bg-green-200 rounded-lg text-sm font-medium text-green-700 transition-all duration-200 hover:scale-105 active:scale-95 cursor-pointer border border-green-200"
        >
          <Calendar className="w-4 h-4" />
          View All Bookings
        </button>
        <button
          type="button"
          onClick={handleGoToDashboard}
          className="flex items-center justify-center gap-2 px-4 py-3 bg-purple-50 hover:bg-purple-100 active:bg-purple-200 rounded-lg text-sm font-medium text-purple-700 transition-all duration-200 hover:scale-105 active:scale-95 cursor-pointer border border-purple-200"
        >
          <LayoutDashboard className="w-4 h-4" />
          Go to Dashboard
        </button>
      </div>

      {/* Optional: Show a loading toast/notification */}
      {isDownloading && (
        <div className="fixed top-4 right-4 z-50 bg-blue-50 border border-blue-200 rounded-lg p-4 shadow-lg">
          <div className="flex items-center gap-3">
            <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
            <span className="text-blue-700 font-medium">Downloading voucher...</span>
          </div>
        </div>
      )}
    </div>
  );
}