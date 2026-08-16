import React from 'react';
import { useNavigate } from 'react-router-dom';

const NotFoundPage = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-9xl font-bold text-gray-900">404</h1>
        <p className="mt-4 text-2xl text-gray-600">Page Not Found</p>
        <p className="mt-2 text-gray-500">The page you're looking for doesn't exist.</p>
        <button
          onClick={() => navigate('/dashboard')}
          className="mt-8 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Go to Dashboard
        </button>
      </div>
    </div>
  );
};

export default NotFoundPage;
