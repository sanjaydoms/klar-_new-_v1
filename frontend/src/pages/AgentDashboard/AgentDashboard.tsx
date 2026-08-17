// src/pages/AgentDashboard.tsx
import React, { useEffect, useState } from 'react';
import { Wallet, Calendar, TrendingUp, Search, Plane, FileText, ArrowLeft } from 'lucide-react';
import { walletService } from '@/api/wallet.api';
import StatCard from '@/components/DashboardComponents/AgentDashboard/StatCard';
import QuickActionButton from '@/components/DashboardComponents/AgentDashboard/QuickActionButton';
import RecentBookings from '@/components/DashboardComponents/AgentDashboard/RecentBookings';
import WalletActivity from '@/components/DashboardComponents/AgentDashboard/WalletActivity';
import MainNavbar from '@/components/layout/Navbar/MainNavbar';
import { useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '@/app/hooks';
import { fetchWalletData, fetchTransactionHistory } from '@/features/wallet/walletSlice';
import AddFundsModal from '../Wallet/components/AddFundsModal';
import MarkupSection from '@/components/DashboardComponents/AgentDashboard/MarkupSection';
import { notifyError } from '@/utils/notify';

interface DashboardStats {
  walletBalance: number;
  todaysBookings: number;
  monthlyRevenue: number;
  pendingActions: number;
}

const AgentDashboard: React.FC = () => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const walletBalance = useAppSelector((state) => state.wallet.balance);
  const [stats, setStats] = useState<DashboardStats>({
    walletBalance: 0,
    todaysBookings: 0,
    monthlyRevenue: 0,
    pendingActions: 0,
  });

  const [loading, setLoading] = useState(true);
  const [isAddFundsOpen, setIsAddFundsOpen] = useState(false);

  const fetchDashboardStats = async () => {
    try {
      setLoading(true);
      // Fetch real wallet balance and sync with Redux
      await Promise.all([
        dispatch(fetchWalletData()).unwrap(),
        dispatch(fetchTransactionHistory(3)).unwrap(),
      ]);
    } catch (error) {
      console.error('Failed to fetch wallet balance:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddFundsProceed = async (amount: number) => {
    try {
      // Call backend to credit wallet in MongoDB
      await walletService.creditWallet({
        amount,
        type: 'TOP_UP',
        paymentMethod: 'NET_BANKING', // Default for dashboard quick action
        referenceType: 'WEB_TOPUP',
        referenceId: `TXN${Date.now()}`,
        description: 'Wallet Top-up from Dashboard',
      });

      // Refresh wallet state from server
      dispatch(fetchWalletData());
      dispatch(fetchTransactionHistory(3));

      // Close modal
      setIsAddFundsOpen(false);
    } catch (error) {
      console.error('Failed to add funds via dashboard API:', error);
      notifyError('Failed to add funds. Please try again.');
    }
  };

  useEffect(() => {
    fetchDashboardStats();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen text-lg">
        Loading Dashboard...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <MainNavbar showHomeOnly={true} />
      <div className="max-w-7xl mx-auto p-6 pt-24">
        <div className="mb-8">
          {/* 🔙 Back Button (same as Settings page) */}
          <div className="mb-4">
            <button
              onClick={() => navigate(-1)}
              className="flex items-center gap-2 text-gray-600 hover:text-black transition"
            >
              <ArrowLeft size={20} />
              <span className="text-sm font-medium">Back</span>
            </button>
          </div>

          {/* Header */}
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Welcome back</h1>
              <p className="text-gray-600 mt-1">Here's what's happening with your business today</p>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatCard
            icon={<Wallet className="w-6 h-6" />}
            title="Wallet Balance"
            value={`₹${walletBalance.toLocaleString('en-IN')}`}
            subtitle="Available"
            color="green"
            onClick={() => navigate('/b2b/wallet')}
          />
          <StatCard
            icon={<Calendar className="w-6 h-6" />}
            title="Today's Bookings"
            value={stats.todaysBookings}
            subtitle="+4 from yesterday"
            color="blue"
          />
          <StatCard
            icon={<TrendingUp className="w-6 h-6" />}
            title="Monthly Revenue"
            value={`₹${(stats.monthlyRevenue / 100000).toFixed(1)}L`}
            subtitle="84% to target"
            color="emerald"
          />
        </div>

        {/* Quick Actions */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold mb-4">Quick Actions</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <QuickActionButton
              icon={<Wallet />}
              label="Add Money"
              onClick={() => setIsAddFundsOpen(true)}
              color="primary"
            />
            <QuickActionButton icon={<Search />} label="Search Hotels" href="/hotels/search" />
            <QuickActionButton
              icon={<Plane />}
              label="Book Flights"
              href="/flights/search"
              color="blue"
            />
            <QuickActionButton icon={<FileText />} label="View Bookings" href="/bookings" />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <RecentBookings />
          <WalletActivity />
        </div>

        <div className="mt-8">
          <MarkupSection />
        </div>
      </div>

      {/* Add Funds Modal */}
      <AddFundsModal
        isOpen={isAddFundsOpen}
        onClose={() => setIsAddFundsOpen(false)}
        onProceed={handleAddFundsProceed}
      />
    </div>
  );
};

export default AgentDashboard;
