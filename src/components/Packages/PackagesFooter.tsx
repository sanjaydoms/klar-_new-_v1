import React from 'react';

const PackagesFooter = () => {
  return (
    <footer className="bg-gray-900 text-white py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div>
            <h3 className="text-lg font-semibold mb-4">About Us</h3>
            <p className="text-gray-400">Your trusted partner for travel and adventures.</p>
          </div>
          {/* Add more footer content as needed */}
        </div>
      </div>
    </footer>
  );
};

export default PackagesFooter;
