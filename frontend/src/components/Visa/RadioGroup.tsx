import React from 'react';

interface RadioGroupProps {
  label: string;
  name: string;
  options: { value: string; label: string }[];
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
}

const RadioGroup: React.FC<RadioGroupProps> = ({
  label,
  name,
  options,
  value,
  onChange,
  required,
}) => {
  return (
    <div className="mb-4">
      <label className="block text-sm font-medium text-gray-700 mb-3">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <div className="flex gap-6">
        {options.map((option) => (
          <label key={option.value} className="flex items-center gap-2 cursor-pointer group">
            <input
              type="radio"
              name={name}
              value={option.value}
              checked={value === option.value}
              onChange={(e) => onChange(e.target.value)}
              className="w-4 h-4 text-[#1F2A6B] border-gray-300 focus:ring-[#1F2A6B] cursor-pointer"
            />
            <span className="text-sm text-gray-700 group-hover:text-[#1F2A6B] transition-colors">
              {option.label}
            </span>
          </label>
        ))}
      </div>
    </div>
  );
};

export default RadioGroup;
