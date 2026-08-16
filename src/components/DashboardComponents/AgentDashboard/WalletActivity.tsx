import React, { useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '../../../app/hooks';
import { fetchTransactionHistory } from '../../../features/wallet/walletSlice';
import { ArrowUpRight, ArrowDownLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { formatDate } from '../../../utils/date.utils';

const WalletActivity: React.FC = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { transactions, loading } = useAppSelector((state) => ({
    transactions: state.wallet.transactions.slice(0, 3), // Show only recent 3
    loading: state.wallet.loading,
  }));

  useEffect(() => {
    dispatch(fetchTransactionHistory(3));
  }, [dispatch]);

  return (
    <div className="bg-white rounded-[2rem] shadow-sm p-8 border border-gray-50 h-full">
      <div className="flex justify-between items-center mb-8">
        <h2 className="text-xl font-bold text-gray-900">Wallet Activity</h2>
        <button
          onClick={() => navigate('/b2b/wallet')}
          className="text-[#6B7280] text-sm font-bold hover:text-gray-900 transition-colors"
        >
          See all
        </button>
      </div>

      {loading && transactions.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12">
          <div className="w-8 h-8 border-4 border-red-500 border-t-transparent rounded-full animate-spin mb-4"></div>
          <p className="text-gray-500 font-medium">Loading transactions...</p>
        </div>
      ) : transactions.length === 0 ? (
        <div className="text-center py-10">
          <p className="text-gray-400 font-medium">No recent transactions</p>
        </div>
      ) : (
        <div className="space-y-6">
          {transactions.map((tx) => {
            const isCredit = tx.direction === 'CREDIT';
            const Icon = isCredit ? ArrowDownLeft : ArrowUpRight;

            return (
              <div key={tx._id} className="flex items-center justify-between group">
                <div className="flex items-center gap-4">
                  <div
                    className={`w-12 h-12 rounded-full flex items-center justify-center transition-transform group-hover:scale-110 ${
                      isCredit ? 'bg-green-50' : 'bg-red-50'
                    }`}
                  >
                    <Icon size={20} className={isCredit ? 'text-green-500' : 'text-red-500'} />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900 text-[15px]">
                      {tx.description || tx.type}
                    </p>
                    <p className="text-xs text-gray-400 font-light mt-0.5">
                      {formatDate(tx.createdAt)}
                    </p>
                  </div>
                </div>

                <div
                  className={`font-black text-base whitespace-nowrap ${
                    isCredit ? 'text-green-600' : 'text-gray-900'
                  }`}
                >
                  {isCredit ? '+ ' : '- '}₹ {Math.abs(tx.amount).toLocaleString('en-IN')}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default WalletActivity;
