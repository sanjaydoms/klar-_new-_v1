import React from 'react';

interface HotelGuestFormProps {
  onSubmit: (guestData: any) => void;
  defaultValues?: any;
  isLoading?: boolean;
}

export const HotelGuestForm: React.FC<HotelGuestFormProps> = ({
  onSubmit,
  defaultValues,
  isLoading,
}) => {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: implement form submission and validation logic
    onSubmit({});
  };

  return (
    <form className="hotel-guest-form flex flex-col gap-4" onSubmit={handleSubmit}>
      <h3 className="text-xl font-bold border-b pb-2">Guest Details</h3>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
          <select className="w-full border rounded p-2" defaultValue={defaultValues?.title || 'Mr'}>
            <option value="Mr">Mr</option>
            <option value="Mrs">Mrs</option>
            <option value="Ms">Ms</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">First Name</label>
          <input
            type="text"
            className="w-full border rounded p-2"
            defaultValue={defaultValues?.firstName}
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
          <input
            type="text"
            className="w-full border rounded p-2"
            defaultValue={defaultValues?.lastName}
            required
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
          <input
            type="email"
            className="w-full border rounded p-2"
            defaultValue={defaultValues?.email}
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
          <input
            type="tel"
            className="w-full border rounded p-2"
            defaultValue={defaultValues?.phone}
            required
          />
        </div>
      </div>

      <div className="border-t pt-4 mt-2">
        <h4 className="font-semibold mb-2">Optional Information</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">PAN Number</label>
            <input
              type="text"
              className="w-full border rounded p-2"
              defaultValue={defaultValues?.pan}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">GST Number</label>
            <input
              type="text"
              className="w-full border rounded p-2"
              defaultValue={defaultValues?.gst}
            />
          </div>
        </div>
        <div className="mt-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">Special Requests</label>
          <textarea
            className="w-full border rounded p-2"
            rows={3}
            defaultValue={defaultValues?.specialRequests}
          ></textarea>
        </div>
      </div>

      <button
        type="submit"
        className="mt-4 bg-blue-600 text-white font-bold py-3 px-4 rounded hover:bg-blue-700 disabled:opacity-50"
        disabled={isLoading}
      >
        {isLoading ? 'Processing...' : 'Continue to Book'}
      </button>
    </form>
  );
};
