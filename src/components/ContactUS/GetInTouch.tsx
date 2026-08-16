import React, { useState } from 'react';

const GetInTouch: React.FC = () => {
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    destination: '',
    subject: '',
    message: '',
  });

  const [errors, setErrors] = useState<any>({});
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
  ) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setErrors({ ...errors, [e.target.name]: '' });
  };

  const validate = () => {
    const newErrors: any = {};

    if (!form.name.trim()) newErrors.name = 'Name is required';
    if (!form.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^\S+@\S+\.\S+$/.test(form.email)) {
      newErrors.email = 'Invalid email format';
    }

    if (!form.phone.trim()) {
      newErrors.phone = 'Phone is required';
    } else if (!/^[0-9]{7,15}$/.test(form.phone)) {
      newErrors.phone = 'Invalid phone number';
    }

    if (!form.destination) newErrors.destination = 'Select an experience';
    if (!form.subject.trim()) newErrors.subject = 'Subject is required';
    if (!form.message.trim()) newErrors.message = 'Message is required';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (!validate()) return;

    setLoading(true);
    setSuccess(false);

    setTimeout(() => {
      setLoading(false);
      setSuccess(true);

      setForm({
        name: '',
        email: '',
        phone: '',
        destination: '',
        subject: '',
        message: '',
      });
    }, 1500);
  };

  return (
    <section className="w-full flex justify-center py-8 sm:py-12 px-4 sm:px-6">
      <div className="w-full max-w-[1052px] flex flex-col lg:flex-row gap-8 lg:gap-12 items-center">
        {/* LEFT — FORM */}
        <div className="w-full lg:flex-1">
          <h2 className="text-xl sm:text-2xl font-semibold text-[#0D0D2B] mb-6">
            Get in touch
          </h2>

          <div className="flex flex-col gap-4">
            {/* Name + Experience */}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1">
                <input
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  placeholder="Enter your name"
                  className="w-full bg-gray-100 rounded-lg px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-[#1B2A6B]/50 transition"
                />
                {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
              </div>

              <div className="flex-1">
                <select
                  name="destination"
                  value={form.destination}
                  onChange={handleChange}
                  className="w-full bg-gray-100 rounded-lg px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-[#1B2A6B]/50 transition"
                >
                  <option value="">What kind of Experience do you like?</option>
                  <option value="adventure">Adventure</option>
                  <option value="luxury">Luxury</option>
                  <option value="family">Family</option>
                  <option value="beach">Beach</option>
                  <option value="cultural">Cultural</option>
                </select>
                {errors.destination && <p className="text-red-500 text-xs mt-1">{errors.destination}</p>}
              </div>
            </div>

            {/* Email + Phone */}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1">
                <input
                  name="email"
                  type="email"
                  value={form.email}
                  onChange={handleChange}
                  placeholder="Enter your email"
                  className="w-full bg-gray-100 rounded-lg px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-[#1B2A6B]/50 transition"
                />
                {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email}</p>}
              </div>

              <div className="flex-1">
                <input
                  name="phone"
                  type="tel"
                  value={form.phone}
                  onChange={handleChange}
                  placeholder="Enter your phone"
                  className="w-full bg-gray-100 rounded-lg px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-[#1B2A6B]/50 transition"
                />
                {errors.phone && <p className="text-red-500 text-xs mt-1">{errors.phone}</p>}
              </div>
            </div>

            {/* Subject */}
            <div>
              <input
                name="subject"
                value={form.subject}
                onChange={handleChange}
                placeholder="Enter your subject"
                className="w-full bg-gray-100 rounded-lg px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-[#1B2A6B]/50 transition"
              />
              {errors.subject && <p className="text-red-500 text-xs mt-1">{errors.subject}</p>}
            </div>

            {/* Message */}
            <div>
              <textarea
                name="message"
                value={form.message}
                onChange={handleChange}
                placeholder="Enter message"
                rows={4}
                className="w-full bg-gray-100 rounded-lg px-4 py-3 text-sm outline-none resize-none focus:ring-2 focus:ring-[#1B2A6B]/50 transition"
              />
              {errors.message && <p className="text-red-500 text-xs mt-1">{errors.message}</p>}
            </div>

            {/* Button */}
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="bg-[#1B2A6B] text-white rounded-lg py-3 font-medium flex items-center justify-center hover:bg-[#152055] transition-colors duration-300 disabled:opacity-50"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                "Submit"
              )}
            </button>

            {/* Success Message */}
            {success && (
              <p className="text-green-600 text-sm mt-2 text-center">
                ✅ Our support team will contact you shortly.
              </p>
            )}
          </div>
        </div>

        {/* RIGHT — IMAGES */}
        <div className="relative w-full sm:w-[320px] h-[280px] sm:h-[360px] lg:h-[400px] flex-shrink-0">
          {/* Back Image */}
          <div className="absolute top-0 left-0 w-[180px] h-[220px] sm:w-[220px] sm:h-[280px] rounded-full overflow-hidden shadow-lg">
            <img
              src="/Contact-US/Right-Back.jpg"
              alt="Travel experience"
              className="w-full h-full object-cover"
            />
          </div>

          {/* Front Image */}
          <div className="absolute bottom-0 right-0 w-[160px] h-[200px] sm:w-[200px] sm:h-[250px] rounded-full overflow-hidden border-4 border-white shadow-xl">
            <img
              src="/Contact-US/Right-Front.jpg"
              alt="Luxury travel"
              className="w-full h-full object-cover"
            />
          </div>
        </div>
      </div>
    </section>
  );
};

export default GetInTouch;
