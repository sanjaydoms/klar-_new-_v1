import React, { useState, useEffect } from 'react';
import { User, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { getMyProfile, updateProfileName } from '../../../api/user.api';
import { useAuth } from '../../../features/authentication/hooks/useAuth';
import { notifyError, notifyInfo } from '@/utils/notify';

const ProfileEditForm: React.FC = () => {
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    mobile: '',
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const { user: authUser } = useAuth();

  useEffect(() => {
    const processUser = (userObj: any) => {
      const rawEmail = userObj.email;
      const rawMobile = userObj.mobile;
      const bizMobile = userObj.businessProfile?.businessMobile;

      const contactPerson = userObj.fullName || userObj.contactPerson || userObj.businessProfile?.contactPerson || '';
      let fullName = contactPerson;

      if (!fullName && (userObj.firstName || userObj.lastName)) {
        fullName = `${userObj.firstName || ''} ${userObj.lastName || ''}`.trim();
      }

      const finalMobile = rawMobile || bizMobile || '';

      setFormData({
        fullName: fullName || '',
        email: rawEmail || '',
        mobile: finalMobile || '',
      });
      setIsLoading(false);
    };

    const fetchProfile = async () => {
      try {
        const response = await getMyProfile();
        let user: any = null;
        const respData: any = response.data;
        if (respData?.data?.user) {
          user = respData.data.user;
        } else if (respData?.user) {
          user = respData.user;
        } else if (respData?.data) {
          user = respData.data;
        }

        if (user) {
          processUser(user);
        } else {
          setIsLoading(false);
        }
      } catch (error) {
        console.error('Failed to fetch profile:', error);
        setMessage({ type: 'error', text: 'Failed to load profile details.' });
        setIsLoading(false);
      }
    };

    fetchProfile();
  }, [authUser]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    setMessage(null);
    try {
      const response = await updateProfileName({
        fullName: formData.fullName,
        mobile: formData.mobile,
      });
      if (response.data?.success) {
        setMessage({ type: 'success', text: 'Profile updated successfully!' });
      } else {
        setMessage({ type: 'error', text: response.data?.message || 'Failed to update profile.' });
      }
    } catch (error: any) {
      console.error('Update failed:', error);
      const errDetails = error.response?.data ? JSON.stringify(error.response.data) : error.message;
      notifyError(`Debug Error Info: ${errDetails}`);
      setMessage({
        type: 'error',
        text: error.response?.data?.message || 'An error occurred while saving.',
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="bg-white p-8 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-[#FF5A5F]" />
      </div>
    );
  }

  return (
    <div className="bg-white p-8 rounded-2xl border border-gray-100 shadow-sm">
      <div className="flex justify-between items-center mb-8">
        <h2 className="text-xl font-bold text-gray-900">Profile Settings</h2>
        {message && (
          <div
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium animate-in fade-in slide-in-from-top-2 ${message.type === 'success' ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'
              }`}
          >
            {message.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
            {message.text}
          </div>
        )}
      </div>

      {/* Avatar Section */}
      <div className="flex items-center gap-6 mb-8">
        <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center text-gray-400">
          <User size={40} />
        </div>
        <div>
          <button
            className="px-4 py-2 bg-white border border-gray-200 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors"
            onClick={() => notifyInfo('Photo upload feature coming soon!')}
          >
            Change Photo
          </button>
          <p className="text-xs text-gray-400 mt-2">JPG, GIF or PNG. Max size 800K</p>
        </div>
      </div>

      {/* Form Fields */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="space-y-2 md:col-span-2">
          <label className="text-sm font-bold text-gray-700">Full Name</label>
          <input
            type="text"
            name="fullName"
            value={formData.fullName}
            onChange={handleChange}
            placeholder="Enter full name"
            className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-black/5 transition-all text-gray-800"
          />
        </div>

        <div className="space-y-2 md:col-span-2">
          <label className="text-sm font-bold text-gray-700">Email Address</label>
          <input
            type="email"
            value={formData.email}
            disabled
            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-400 cursor-not-allowed"
          />
        </div>

        <div className="space-y-2 md:col-span-2">
          <label className="text-sm font-bold text-gray-700">Phone Number</label>
          <input
            type="tel"
            name="mobile"
            value={formData.mobile}
            onChange={handleChange}
            placeholder="Enter phone number"
            className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-black/5 transition-all text-gray-800"
          />
        </div>
      </div>

      {/* Actions */}
      <div className="flex justify-end items-center gap-4 pt-4 border-t border-gray-50">
        <button
          onClick={() => window.location.reload()}
          className="px-6 py-2.5 text-gray-500 font-medium hover:text-gray-700 transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="flex items-center gap-2 px-6 py-2.5 bg-[#FF5A5F] disabled:bg-[#ff5a5f]/70 text-white font-bold rounded-lg hover:bg-[#ff4046] transition-colors shadow-lg shadow-red-500/20"
        >
          {isSaving ? <Loader2 size={18} className="animate-spin" /> : null}
          {isSaving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
    </div>
  );
};

export default ProfileEditForm;
