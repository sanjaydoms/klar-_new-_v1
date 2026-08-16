import React, { useState, useEffect } from 'react';
import {
  ArrowUpRight,
  CheckCircle2,
  Filter,
  Download,
  ArrowDownLeft,
  ArrowDownRight,
  Loader2,
  ArrowLeft,
} from 'lucide-react';
import MainNavbar from '../../components/layout/Navbar/MainNavbar';
import Footer from '../../components/layout/Footer';
import { walletService } from '../../api/wallet.api';
import {
  fetchWalletData,
  fetchTransactionHistory,
  debitWallet,
} from '../../features/wallet/walletSlice';
import { formatDate } from '../../utils/date.utils';
import { useAppDispatch, useAppSelector } from '@/app/hooks';
import CardManagementModal from './components/CardManagementModal';
import WithdrawMoneyModal from './components/WithdrawMoneyModal';
import AddFundsModal from './components/AddFundsModal';
import { useNavigate } from 'react-router-dom';
import { notifyError } from '@/utils/notify';

const WalletPage: React.FC = () => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { balance, transactions, isBalanceLoading } = useAppSelector((state) => ({
    balance: state.wallet.balance,
    transactions: state.wallet.transactions,
    isBalanceLoading: state.wallet.loading,
  }));

  const [isAddFundsOpen, setIsAddFundsOpen] = useState(false);
  const [isWithdrawOpen, setIsWithdrawOpen] = useState(false);
  const [isCardManagementOpen, setIsCardManagementOpen] = useState(false);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>('net-banking');

  useEffect(() => {
    dispatch(fetchWalletData());
    dispatch(fetchTransactionHistory());
  }, [dispatch]);

  const handleAddFundsProceed = async (amount: number) => {
    try {
      // Call backend to credit wallet in MongoDB
      await walletService.creditWallet({
        amount,
        type: 'TOP_UP',
        paymentMethod: selectedPaymentMethod === 'hdfc' ? 'HDFC_BANK' : 'NET_BANKING',
        referenceType: 'WEB_TOPUP',
        referenceId: `TXN${Date.now()}`,
        description: 'Wallet Top-up from Wallet Page',
      });

      // Re-fetch everything to ensure sync across all components
      await dispatch(fetchWalletData()).unwrap();
      await dispatch(fetchTransactionHistory()).unwrap();

      setIsAddFundsOpen(false);
    } catch (error) {
      console.error('Failed to add funds via API:', error);
      notifyError('Failed to add funds. Please try again.');
    }
  };

  const [withdrawalStatus, setWithdrawalStatus] = useState<
    'idle' | 'processing' | 'success' | 'error'
  >('idle');
  const [withdrawalError, setWithdrawalError] = useState<string | null>(null);
  const [lastTransaction, setLastTransaction] = useState<any>(null);

  const handleWithdrawContinue = async (amount: number, bankId: string) => {
    try {
      setWithdrawalStatus('processing');
      setWithdrawalError(null);

      const result = await dispatch(
        debitWallet({
          amount,
          type: 'WITHDRAWAL',
          description: `Withdrawal to bank account ${bankId}`,
          referenceType: 'BANK_TRANSFER',
          referenceId: `WTH${Date.now()}`,
        }),
      ).unwrap();

      setLastTransaction(result.data);
      setWithdrawalStatus('success');

      // Refresh balance and transactions
      dispatch(fetchWalletData());
      dispatch(fetchTransactionHistory());
    } catch (error: any) {
      console.error('Withdrawal failed:', error);
      // Ensure we're setting a string as the error
      const errorMessage =
        typeof error === 'string' ? error : error.message || 'Failed to process withdrawal';
      setWithdrawalError(errorMessage);
      setWithdrawalStatus('error');
    }
  };

  return (
    <div className="min-h-screen bg-[#F9FAFB] flex flex-col">
      {/* Dark professional navbar for dashboard */}
      <MainNavbar showHomeOnly={true} />

      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-10 w-full">
        {/* 🔙 Back Button - Added here */}
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
        <div className="mb-8">
          <h1 className="text-3xl font-extrabold text-[#111827] tracking-tight">Wallet</h1>
          <p className="text-[#6B7280] font-medium mt-1">Financial control center</p>
        </div>

        {/* Balance Card */}
        <div className="relative overflow-hidden rounded-[2rem] bg-gradient-to-r from-[#FF5A5F] to-[#FF4046] p-10 mb-10 shadow-xl shadow-red-500/10">
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-8">
            <div>
              <p className="text-white/80 text-lg font-medium mb-2">Total Balance</p>
              <div className="flex items-baseline gap-2">
                {isBalanceLoading ? (
                  <Loader2 className="text-white animate-spin" size={40} />
                ) : (
                  <span className="text-white text-6xl font-black">
                    ₹ {balance.toLocaleString('en-IN')}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 mt-4 bg-white/10 w-fit px-4 py-1.5 rounded-full border border-white/10">
                <CheckCircle2 size={16} className="text-white" />
                <span className="text-white text-sm font-bold tracking-tight">
                  Verified Business Account
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => setIsAddFundsOpen(true)}
                className="bg-white text-[#FF5A5F] px-8 py-4 rounded-2xl font-black text-sm flex items-center gap-2 hover:bg-white/90 transition-all active:scale-[0.98] shadow-lg shadow-black/5"
              >
                Add Money
                <ArrowDownRight size={20} />
              </button>
            </div>
          </div>

          {/* Decorative spheres */}
          <div className="absolute -right-20 -top-20 w-80 h-80 bg-white/5 rounded-full blur-3xl"></div>
          <div className="absolute -left-20 -bottom-20 w-80 h-80 bg-black/5 rounded-full blur-3xl"></div>
        </div>

        <div className="grid grid-cols-1 gap-8 items-start">
          {/* Transaction History - Full width */}
          <div className="w-full">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900">Transaction History</h2>
              <div className="flex items-center gap-2">
                <button className="p-2.5 bg-white border border-gray-100 rounded-xl text-gray-400 hover:text-gray-900 hover:shadow-md transition-all shadow-sm">
                  <Filter size={20} />
                </button>
                <button className="p-2.5 bg-white border border-gray-100 rounded-xl text-gray-400 hover:text-gray-900 hover:shadow-md transition-all shadow-sm">
                  <Download size={20} />
                </button>
              </div>
            </div>

            <div className="bg-white border border-gray-100 rounded-[2rem] overflow-hidden shadow-sm">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-gray-50">
                    <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-gray-400">
                      Transaction
                    </th>
                    <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-gray-400">
                      Date
                    </th>
                    <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-gray-400">
                      Status
                    </th>
                    <th className="px-8 py-5 text-right text-[10px] font-black uppercase tracking-widest text-gray-400 whitespace-nowrap">
                      Amount
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {transactions.map((t) => {
                    const isCredit = t.direction === 'CREDIT';
                    const Icon = isCredit ? ArrowDownLeft : ArrowUpRight;

                    return (
                      <tr key={t._id} className="group hover:bg-gray-50/50 transition-colors">
                        <td className="px-8 py-6">
                          <div className="flex items-center gap-4">
                            <div
                              className={`w-10 h-10 rounded-full flex items-center justify-center border border-gray-100 ${
                                isCredit ? 'bg-green-50' : 'bg-gray-50'
                              }`}
                            >
                              <Icon
                                size={18}
                                className={isCredit ? 'text-green-500' : 'text-gray-400'}
                              />
                            </div>
                            <span className="text-sm font-medium text-gray-900">
                              {t.description || t.type}
                            </span>
                          </div>
                        </td>
                        <td className="px-8 py-6">
                          <span className="text-sm font-light text-gray-400">
                            {formatDate(t.createdAt)}
                          </span>
                        </td>
                        <td className="px-8 py-6">
                          <span className="inline-flex items-center px-3 py-1 bg-green-50 text-green-600 rounded-full text-[10px] font-black uppercase tracking-tight ring-1 ring-green-100">
                            {t.status}
                          </span>
                        </td>
                        <td className="px-8 py-6 text-right">
                          <span
                            className={`text-sm font-black ${isCredit ? 'text-green-600' : 'text-gray-900'}`}
                          >
                            {isCredit ? '+ ' : '- '}₹ {Math.abs(t.amount).toLocaleString('en-IN')}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </main>

      <Footer />

      <AddFundsModal
        isOpen={isAddFundsOpen}
        onClose={() => setIsAddFundsOpen(false)}
        onProceed={handleAddFundsProceed}
      />

      <WithdrawMoneyModal
        isOpen={isWithdrawOpen}
        onClose={() => {
          setIsWithdrawOpen(false);
          setWithdrawalStatus('idle');
        }}
        availableBalance={balance}
        onContinue={handleWithdrawContinue}
        withdrawalStatus={withdrawalStatus}
        transactionData={lastTransaction}
        error={withdrawalError}
      />

      <CardManagementModal
        isOpen={isCardManagementOpen}
        onClose={() => setIsCardManagementOpen(false)}
      />
    </div>
  );
};

export default WalletPage;
