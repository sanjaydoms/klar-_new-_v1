import React from 'react';

interface StatCardProps {
  icon: React.ReactNode;
  title: string;
  value: string | number;
  subtitle?: string;
  color?: 'green' | 'blue' | 'emerald' | 'amber' | 'red' | 'purple';
  trend?: string; // e.g., "+12%" or "-3%"
  onClick?: () => void;
}

const StatCard: React.FC<StatCardProps> = ({
  icon,
  title,
  value,
  subtitle,
  color = 'green',
  trend,
  onClick,
}) => {
  // Color mapping
  const colorClasses = {
    green: 'text-green-600 bg-green-50',
    blue: 'text-blue-600 bg-blue-50',
    emerald: 'text-emerald-600 bg-emerald-50',
    amber: 'text-amber-600 bg-amber-50',
    red: 'text-red-600 bg-red-50',
    purple: 'text-purple-600 bg-purple-50',
  };

  const selectedColor = colorClasses[color] || colorClasses.green;

  return (
    <div
      className={`bg-white rounded-2xl shadow p-6 hover:shadow-md transition-shadow duration-200 ${onClick ? 'cursor-pointer hover:bg-gray-50' : ''}`}
      onClick={onClick}
    >
      <div className="flex items-start justify-between">
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${selectedColor}`}>
          {icon}
        </div>

        {trend && (
          <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-green-100 text-green-700">
            {trend}
          </span>
        )}
      </div>

      <div className="mt-6">
        <p className="text-sm text-gray-600 font-medium">{title}</p>

        <p className="text-3xl font-bold text-gray-900 mt-2 tracking-tight">{value}</p>

        {subtitle && <p className="text-sm text-gray-500 mt-1">{subtitle}</p>}
      </div>
    </div>
  );
};

export default StatCard;
