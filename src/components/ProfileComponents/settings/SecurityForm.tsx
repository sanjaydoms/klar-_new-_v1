import React, { useState } from 'react';
import { changePassword } from '../../../api/auth.api';
import { notifyError, notifySuccess } from '@/utils/notify';

const SecurityForm: React.FC = () => {


  // State for password fields
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Loading state
  const [loading, setLoading] = useState(false);

  // Error state for form validation
  const [errors, setErrors] = useState<{
    currentPassword?: string;
    newPassword?: string;
    confirmPassword?: string;
  }>({});

  const ToggleSwitch = ({
    checked,
    onChange,
  }: {
    checked: boolean;
    onChange: (checked: boolean) => void;
  }) => (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${checked ? 'bg-[#FF5A5F]' : 'bg-gray-200'}`}
    >
      <span className="sr-only">Use setting</span>
      <span
        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${checked ? 'translate-x-5' : 'translate-x-0'}`}
      />
    </button>
  );

  // Form validation
  const validateForm = () => {
    const newErrors: {
      currentPassword?: string;
      newPassword?: string;
      confirmPassword?: string;
    } = {};

    if (!currentPassword) {
      newErrors.currentPassword = 'Current password is required';
    }

    if (!newPassword) {
      newErrors.newPassword = 'New password is required';
    } else if (newPassword.length < 6) {
      newErrors.newPassword = 'Password must be at least 6 characters';
    }

    if (!confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your new password';
    } else if (newPassword !== confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle form submission
  const handleSaveChanges = async () => {
    // Validate form first
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    try {
      const response = await changePassword({
        currentPassword,
        newPassword,
        confirmPassword,
      });

      if (response.success) {
        // Show success message (you can use toast notification)
        notifySuccess('Password changed successfully!');

        // Clear form fields
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        setErrors({});
      }
    } catch (error: any) {
      // Handle API errors
      const errorMessage = error.response?.data?.message || 'Failed to change password';

      // Show error message (you can use toast notification)
      notifyError(errorMessage);

      // Handle specific error cases
      if (error.response?.data?.message === 'Current password is incorrect') {
        setErrors({ currentPassword: 'Current password is incorrect' });
      }
    } finally {
      setLoading(false);
    }
  };

  // Handle Cancel button - clear all fields
  const handleCancel = () => {
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setErrors({});
  };

  return (
    <div className="bg-white p-8 rounded-2xl border border-gray-100 shadow-sm animate-in fade-in slide-in-from-bottom-4 duration-500">
      <h2 className="text-xl font-bold text-gray-900 mb-8">Security Settings</h2>

      <div className="space-y-6 mb-8">
        <div>
          <h3 className="text-sm font-bold text-gray-900 mb-4">Change Password</h3>
          <div className="space-y-4">
            <div>
              <div className="relative">
                <input
                  type={showCurrentPassword ? "text" : "password"}
                  placeholder="Current Password"
                  value={currentPassword}
                  onChange={(e) => {
                    setCurrentPassword(e.target.value);
                    if (errors.currentPassword) {
                      setErrors({ ...errors, currentPassword: undefined });
                    }
                  }}
                  className={`w-full px-4 py-3 bg-white border rounded-xl focus:outline-none focus:ring-2 focus:ring-black/5 transition-all text-gray-800 placeholder:text-gray-400 pr-12 ${errors.currentPassword ? 'border-red-500' : 'border-gray-200'
                    }`}
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showCurrentPassword ? (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                    </svg>
                  )}
                </button>
              </div>
              {errors.currentPassword && (
                <p className="text-red-500 text-xs mt-1">{errors.currentPassword}</p>
              )}
            </div>

            <div>
              <div className="relative">
                <input
                  type={showNewPassword ? "text" : "password"}
                  placeholder="New Password"
                  value={newPassword}
                  onChange={(e) => {
                    setNewPassword(e.target.value);
                    if (errors.newPassword) {
                      setErrors({ ...errors, newPassword: undefined });
                    }
                  }}
                  className={`w-full px-4 py-3 bg-white border rounded-xl focus:outline-none focus:ring-2 focus:ring-black/5 transition-all text-gray-800 placeholder:text-gray-400 pr-12 ${errors.newPassword ? 'border-red-500' : 'border-gray-200'
                    }`}
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showNewPassword ? (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                    </svg>
                  )}
                </button>
              </div>
              {errors.newPassword && (
                <p className="text-red-500 text-xs mt-1">{errors.newPassword}</p>
              )}
            </div>

            <div>
              <div className="relative">
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="Confirm New Password"
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value);
                    if (errors.confirmPassword) {
                      setErrors({ ...errors, confirmPassword: undefined });
                    }
                  }}
                  className={`w-full px-4 py-3 bg-white border rounded-xl focus:outline-none focus:ring-2 focus:ring-black/5 transition-all text-gray-800 placeholder:text-gray-400 pr-12 ${errors.confirmPassword ? 'border-red-500' : 'border-gray-200'
                    }`}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showConfirmPassword ? (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                    </svg>
                  )}
                </button>
              </div>
              {errors.confirmPassword && (
                <p className="text-red-500 text-xs mt-1">{errors.confirmPassword}</p>
              )}
            </div>
          </div>
        </div>

        {/* Uncomment if you want 2FA feature */}
        {/* <div className="pt-6 border-t border-gray-50">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-sm font-bold text-gray-900">Two-Factor Authentication</h4>
              <p className="text-xs text-gray-500 mt-1">Secure your account with 2FA</p>
            </div>
            <ToggleSwitch checked={twoFactor} onChange={setTwoFactor} />
          </div>
        </div> */}
      </div>

      <div className="flex justify-end items-center gap-4 pt-4 border-t border-gray-50">
        <button
          onClick={handleCancel}
          className="px-6 py-2.5 text-gray-500 font-medium hover:text-gray-700 transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={handleSaveChanges}
          disabled={loading}
          className={`px-6 py-2.5 bg-[#FF5A5F] text-white font-bold rounded-lg hover:bg-[#ff4046] transition-colors shadow-lg shadow-red-500/20 ${loading ? 'opacity-50 cursor-not-allowed' : ''
            }`}
        >
          {loading ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
    </div>
  );
};

export default SecurityForm;