interface PriceCardProps {
  price: number;
  currency?: string;
  commissionRate?: number;
  baseCommission?: number;
  incentiveBonus?: number;
}

export default function PriceCard({
  price,
  currency = '₹',
  commissionRate = 10,
  baseCommission = 850,
  incentiveBonus = 50,
}: PriceCardProps) {
  const formatCurrency = (amount: number) => {
    return `${currency} ${amount.toFixed(0)}`;
  };

  return (
    <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm">
      {/* Header */}
      <div className="mb-4">
        <h3 className="text-sm font-medium text-gray-500">Commission Earned</h3>
      </div>

      {/* Main Commission Amount */}
      <div className="mb-3">
        <p className="text-xs text-gray-400 font-medium mb-1">Your Commission</p>
        <p className="text-4xl font-bold text-green-600">{formatCurrency(price)}</p>
        <p className="text-xs text-gray-400 mt-1">{commissionRate}% commission rate</p>
      </div>

      {/* Divider */}
      <div className="border-t border-gray-200 my-4"></div>

      {/* Commission Breakdown */}
      <div className="space-y-2"></div>
    </div>
  );
}
