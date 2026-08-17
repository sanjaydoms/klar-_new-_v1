import React from 'react';

interface DateInputProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
}

const DateInput: React.FC<DateInputProps> = ({
  label,
  value,
  onChange,
  placeholder = 'dd-mm-yyyy',
  required,
}) => {
  return (
    <div className="mb-4">
      <label className="block text-sm font-medium text-gray-700 mb-2">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1F2A6B]/20 focus:border-[#1F2A6B] transition-all text-sm"
      />
    </div>
  );
};

export default DateInput;
