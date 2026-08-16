// components/CheckinInstructions.tsx
import React from 'react';

interface CheckinInstructionsProps {
  instruction?: string;
  tags?: string[];
}

const CheckinInstructions: React.FC<CheckinInstructionsProps> = ({
  instruction = 'Please arrive at the airport 2 hours before departure.',
}) => {
  return (
    <div
      className="block md:hidden lg:hidden rounded-xl p-5 mb-4"
      style={{
        background: '#FEA0961A',
        borderLeft: '4px solid #FEA096',
        border: '1px solid #E7E2D9',
        borderLeftWidth: '4px',
      }}
    >
      <h3 className="text-sm font-semibold mb-2" style={{ color: '#78342E' }}>
        CHECK-IN INSTRUCTIONS
      </h3>
      <p className="text-sm mb-3" style={{ color: '#464650' }}>
        {instruction}
      </p>
    </div>
  );
};

export default CheckinInstructions;
