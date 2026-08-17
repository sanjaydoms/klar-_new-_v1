import React, { useState, useEffect } from 'react';
import {
  Plane,
  Building2,
  Ship,
  Users,
  Globe,
  Car,
  CalendarDays,
  Briefcase,
  Ticket,
  HelpCircle,
  Edit2,
  Trash2,
  Plus,
  X,
  Save,
} from 'lucide-react';
import MarkupCard from './MarkupCard';
import DisplayCard from './DisplayCard';
import { notifyError, notifySuccess } from '@/utils/notify';
import {
  createMarkup,
  getMyMarkup,
  CreateMarkupPayload,
  MarkupServiceResponse,
  deleteMarkupByServiceType,
} from '@/api/user.api';

interface MarkupData {
  serviceType: string;
  percentageMarkup: number;
  fixedMarkup: number;
  appliedTo: string;
}

const MarkupSection: React.FC = () => {
  const [markups, setMarkups] = useState<MarkupData[]>([]);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showValidationErrors, setShowValidationErrors] = useState<boolean>(false);
  const [existingMarkupId, setExistingMarkupId] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [editMarkups, setEditMarkups] = useState<MarkupData[]>([]);

  /**
   * Fetch existing markups when component mounts
   */
  const fetchMarkups = async () => {
    try {
      setLoading(true);
      const response = await getMyMarkup();

      if (response.data.success && response.data.data) {
        const markupData = response.data.data;

        // Transform the API response to match our MarkupData interface
        const transformedMarkups: MarkupData[] = markupData.services.map(
          (service: MarkupServiceResponse) => ({
            serviceType: service.serviceType,
            percentageMarkup: service.percentageMarkup,
            fixedMarkup: service.fixedMarkup,
            appliedTo: markupData.appliedTo || 'BASE_FARE',
          }),
        );

        setMarkups(transformedMarkups);
        setExistingMarkupId(markupData._id);

        console.log('✅ Fetched existing markups:', transformedMarkups);
      } else {
        setMarkups([]);
        setExistingMarkupId(null);
      }
    } catch (err) {
      console.error('Error fetching markups:', err);
      setMarkups([]);
      setExistingMarkupId(null);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Delete Markup function
   * @param serviceType
   * @returns
   */
  const handleDeleteMarkup = async (serviceType: string) => {
    if (!serviceType) return;

    const confirmDelete = window.confirm(`Delete markup for ${serviceType}?`);
    if (!confirmDelete) return;

    try {
      await deleteMarkupByServiceType(serviceType);

      setMarkups((prev) => prev.filter((m) => m.serviceType !== serviceType));

      setEditMarkups((prev) => prev.filter((m) => m.serviceType !== serviceType));
    } catch (err: any) {
      notifyError(err.response?.data?.message || 'Failed to delete markup');
    }
  };

  /**
   * Icon Map
   */
  const SERVICE_ICON_MAP: Record<string, React.ReactNode> = {
    FLIGHTS: <Plane className="w-5 h-5 text-blue-600" />,
    HOTELS: <Building2 className="w-5 h-5 text-purple-600" />,
    TRANSFERS: <Car className="w-5 h-5 text-green-600" />,
    TOUR_PACKAGES: <Globe className="w-5 h-5 text-orange-600" />,
    EVENT_MANAGEMENT: <CalendarDays className="w-5 h-5 text-pink-600" />,
    VISA_SERVICES: <Briefcase className="w-5 h-5 text-indigo-600" />,
    CHARTER_SERVICES: <Plane className="w-5 h-5 text-yellow-600" />,
    YACHT_CHARTER: <Ship className="w-5 h-5 text-cyan-600" />,
    GROUP_BOOKINGS: <Users className="w-5 h-5 text-red-600" />,
  };

  /**
   * Helper Function - Service Icon
   * @param serviceType
   * @returns
   */
  const getServiceIcon = (serviceType: string) => {
    return SERVICE_ICON_MAP[serviceType] || <HelpCircle className="w-5 h-5 text-gray-400" />;
  };

  useEffect(() => {
    fetchMarkups();
  }, []);

  const handleEditMode = () => {
    // Copy current markups to edit state
    setEditMarkups([...markups]);
    setIsEditing(true);
    setShowValidationErrors(false);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditMarkups([]);
    setShowValidationErrors(false);
  };

  const handleEditMarkupChange = (index: number, updatedMarkup: MarkupData) => {
    setEditMarkups((prev) => {
      const updated = [...prev];
      updated[index] = updatedMarkup;
      return updated;
    });
  };

  const addNewMarkup = (): void => {
    setEditMarkups((prev) => [
      ...prev,
      {
        serviceType: '',
        percentageMarkup: 0,
        fixedMarkup: 0,
        appliedTo: 'BASE_FARE',
      },
    ]);
    setShowValidationErrors(false);
  };

  const removeMarkup = async (index: number, serviceType: string) => {
    if (!serviceType) {
      setEditMarkups((prev) => prev.filter((_, i) => i !== index));
      return;
    }

    const confirmDelete = window.confirm(`Delete markup for ${serviceType}?`);
    if (!confirmDelete) return;

    try {
      await deleteMarkupByServiceType(serviceType);

      setEditMarkups((prev) => prev.filter((_, i) => i !== index));
      setMarkups((prev) => prev.filter((m) => m.serviceType !== serviceType));
    } catch (err: any) {
      notifyError(err.response?.data?.message || 'Delete failed');
    }
  };

  const validateMarkups = (markupsToValidate: MarkupData[]): boolean => {
    for (const markup of markupsToValidate) {
      if (!markup.serviceType) {
        return false;
      }
      if (markup.percentageMarkup === 0 && markup.fixedMarkup === 0) {
        return false;
      }
      if (
        markup.percentageMarkup > 0 &&
        (markup.percentageMarkup < 0 || markup.percentageMarkup > 100)
      ) {
        return false;
      }
      if (markup.fixedMarkup < 0) {
        return false;
      }
    }
    return true;
  };

  const saveAllMarkups = async (): Promise<void> => {
    if (!validateMarkups(editMarkups)) {
      setShowValidationErrors(true);
      notifyError('Please fill in all required fields correctly (Service Type and Markup value)');
      return;
    }

    if (editMarkups.length === 0) {
      notifyError('Please add at least one markup configuration');
      return;
    }

    setSaving(true);

    try {
      const payload: CreateMarkupPayload = {
        services: editMarkups.map((markup) => ({
          serviceType: markup.serviceType,
          percentageMarkup: markup.percentageMarkup,
          fixedMarkup: markup.fixedMarkup,
        })),
        appliedTo: 'BASE_FARE',
      };

      console.log('📤 Sending markup payload:', JSON.stringify(payload, null, 2));

      const response = await createMarkup(payload);

      if (response.data.success) {
        notifySuccess(`✅ Markup configuration saved successfully!\n\n${response.data.message}`);
        console.log('✅ Markup creation response:', response.data);

        if (response.data.data?._id) {
          setExistingMarkupId(response.data.data._id);
        }

        await fetchMarkups();
        setShowValidationErrors(false);
        setIsEditing(false); // Exit edit mode after successful save
        setEditMarkups([]);
      } else {
        throw new Error(response.data.message || 'Failed to save markups');
      }
    } catch (err: any) {
      console.error('❌ Error saving markups:', err);

      if (err.response) {
        const errorMessage = err.response.data?.message || 'Server error occurred';
        notifyError(`❌ Failed to save markups: ${errorMessage}`);
      } else if (err.request) {
        notifyError('❌ Network error: Unable to connect to server');
      } else {
        notifyError(`❌ Error: ${err.message || 'Failed to save markups'}`);
      }
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-2xl shadow p-8 text-center">
        <div className="flex justify-center items-center space-x-2">
          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-red-600"></div>
          <span className="text-gray-600">Loading markups...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold">Additional Markup Configuration</h2>

        {!isEditing ? (
          <button
            onClick={handleEditMode}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
          >
            <Edit2 className="w-4 h-4" />
            Edit Markups
          </button>
        ) : (
          <div className="flex gap-2">
            <button
              onClick={handleCancelEdit}
              disabled={saving}
              className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium transition-colors"
            >
              <X className="w-4 h-4" />
              Cancel
            </button>
            <button
              onClick={saveAllMarkups}
              disabled={saving || editMarkups.length === 0}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white hover:bg-red-700 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
            >
              {saving ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Save All Markups
                </>
              )}
            </button>
          </div>
        )}
      </div>

      {/* View Mode - Display Cards */}
      {!isEditing && (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {markups.map((markup, index) => (
              <div key={index} className="relative group">
                <DisplayCard
                  serviceType={markup.serviceType}
                  percentageMarkup={markup.percentageMarkup}
                  fixedMarkup={markup.fixedMarkup}
                  appliedTo={markup.appliedTo}
                />
                <button
                  onClick={() => handleDeleteMarkup(markup.serviceType)}
                  className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity text-red-500 hover:text-red-700"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            ))}
          </div>

          {markups.length === 0 && (
            <div className="text-center text-gray-500 py-8">
              No markups configured yet. Click "Edit Markups" to add your first markup
              configuration.
            </div>
          )}

          {/* Refresh button in view mode */}
          <div className="flex justify-end gap-4 mt-10">
            <button
              onClick={fetchMarkups}
              disabled={saving}
              className="px-6 py-2.5 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Refresh
            </button>
          </div>
        </>
      )}

      {/* Edit Mode - Edit Forms */}
      {isEditing && (
        <>
          <div className="mb-4 flex justify-end">
            <button
              onClick={addNewMarkup}
              disabled={saving}
              className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add Service Markup
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {editMarkups.map((markup, index) => (
              <div key={index} className="relative group">
                <MarkupCard
                  title={`${markup.serviceType || 'New Service'} Markup`}
                  icon={getServiceIcon(markup.serviceType)}
                  data={markup}
                  onChange={(updated: MarkupData) => handleEditMarkupChange(index, updated)}
                  selectedServices={editMarkups.map((m) => m.serviceType).filter(Boolean)}
                  showErrors={showValidationErrors}
                />
                <button
                  onClick={() => removeMarkup(index, markup.serviceType)}
                  type="button"
                  disabled={saving}
                  className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity text-red-500 hover:text-red-700 focus:opacity-100 disabled:opacity-50"
                  aria-label="Delete markup"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            ))}
          </div>

          {editMarkups.length === 0 && (
            <div className="text-center text-gray-500 py-8">
              No markups configured. Click "Add Service Markup" to get started.
            </div>
          )}

          {/* Refresh button in edit mode */}
          <div className="flex justify-end gap-4 mt-10">
            <button
              onClick={fetchMarkups}
              disabled={saving}
              className="px-6 py-2.5 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Refresh
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default MarkupSection;
