// MonthlyMarkupRevenue.tsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';

const MonthlyMarkupRevenue: React.FC = () => {
  const [revenue, setRevenue] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    console.log('montly revenu');
  }, []);

  return (
    <div className="bg-white rounded-2xl shadow p-6 mt-8">
      <h2 className="text-xl font-semibold mb-6">Monthly Markup Revenue (Last 12 Months)</h2>
      {loading ? (
        <p>Loading revenue data...</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left py-3">Month</th>
                <th className="text-right py-3">Markup Earned (₹)</th>
                <th className="text-right py-3">Bookings</th>
              </tr>
            </thead>
            <tbody>
              {revenue.map((row, idx) => (
                <tr key={idx} className="border-b last:border-0 hover:bg-gray-50">
                  <td className="py-3 font-medium">{row.month}</td>
                  <td className="text-right py-3 font-semibold text-green-600">
                    ₹{Number(row.totalMarkup || 0).toLocaleString('en-IN')}
                  </td>
                  <td className="text-right py-3 text-gray-500">{row.bookingCount || 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default MonthlyMarkupRevenue;
