import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, MoreHorizontal, Anchor, Calendar, Moon, ShieldCheck, X } from 'lucide-react';
import CruiseBookings from './CruiseBookings';
import TopDestinations from './TopDestinations';
import FeaturedCruises from './FeaturedCruises';
import { NeedHelpBanner } from './NeedHelperBanner';
import Footer2 from '@/components/Footer/Footer2';
import BottomNav from '@/components/MobileResponsive/DashboardPage/BottomNav';

const bgImage = "https://images.unsplash.com/photo-1548574505-5e239809ee19?q=80&w=800&auto=format&fit=crop"; 
const NIGHT_OPTIONS = [2, 3, 4, 5, 6, 7, 10, 14];

const MobileCruiseSearch = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    departurePort: '',
    sailMonth: '',
    nights: '',
    fullName: '',
    mobileNumber: '',
    emailId: ''
  });
  const [showToast, setShowToast] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  useEffect(() => {
    const handleDestinationSelected = (e: any) => {
      setFormData(prev => ({ ...prev, departurePort: e.detail }));
    };
    
    window.addEventListener('cruiseDestinationSelected', handleDestinationSelected);
    return () => window.removeEventListener('cruiseDestinationSelected', handleDestinationSelected);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Enquiry Submitted:', formData);
    setShowToast(true);
  };

  return (
    <div className="min-h-screen bg-[#F8F9FA] pb-24">
      {/* Top Banner Area */}
      <div 
        className="relative w-full h-[400px] bg-cover bg-center rounded-b-[40px] overflow-hidden"
        style={{ backgroundImage: `url(${bgImage})` }}
      >
        <div className="absolute inset-0 bg-black/30" />
        
        {/* Header */}
        <div className="absolute top-0 left-0 right-0 p-4 flex items-center justify-between text-white z-10">
          <button onClick={() => navigate("/")} className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center">
              <ArrowLeft className="w-5 h-5" />
            </div>
            <span className="font-semibold text-lg" style={{fontFamily:"Playfair Display"}}>Cruise</span>
          </button>
          
        </div>
      </div>

      {/* Form Overlay */}
      <div className="relative -mt-64 px-4 z-20">
        <div className="bg-white rounded-2xl shadow-xl p-5 border border-gray-100">
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            
            {/* Top Section */}
            <div className="flex flex-col gap-3">
              <div className="relative flex items-center bg-[#F8F9FA] rounded-lg border border-transparent overflow-hidden px-3 py-1">
                <Anchor className="w-4 h-4 text-gray-400 shrink-0" />
                <input 
                  type="text" 
                  name="departurePort"
                  placeholder="Departure Port"
                  value={formData.departurePort}
                  onChange={handleChange}
                  className="w-full bg-transparent border-none focus:outline-none text-sm p-2 text-gray-700 placeholder-gray-400"
                />
              </div>

              <div className="relative flex items-center bg-[#F8F9FA] rounded-lg border border-transparent overflow-hidden px-3 py-1">
                <Calendar className="w-4 h-4 text-gray-400 shrink-0" />
                <input 
                  type={formData.sailMonth ? "month" : "text"}
                  name="sailMonth"
                  placeholder="Sail Month"
                  value={formData.sailMonth}
                  onChange={handleChange}
                  onFocus={(e) => (e.target.type = 'month')}
                  onBlur={(e) => {
                    if (!e.target.value) e.target.type = 'text';
                  }}
                  className="w-full bg-transparent border-none focus:outline-none text-sm p-2 text-gray-700 placeholder-gray-400"
                />
              </div>

              <div className="relative flex items-center bg-[#F8F9FA] rounded-lg border border-transparent overflow-hidden px-3 py-1">
                <Moon className="w-4 h-4 text-gray-400 shrink-0" />
                <select 
                  name="nights"
                  value={formData.nights}
                  onChange={handleChange as any}
                  className={`w-full bg-transparent border-none focus:outline-none text-sm p-2 outline-none ${formData.nights ? 'text-gray-700' : 'text-gray-400'}`}
                >
                  <option value="" disabled hidden>Select Nights</option>
                  {NIGHT_OPTIONS.map((nights) => (
                    <option key={nights} value={`${nights} Nights`} className="text-gray-700">
                      {nights} Nights
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Divider */}
            <hr className="border-gray-100 my-1" />

            {/* Bottom Section */}
            <div className="flex flex-col gap-3">
              <input 
                type="text" 
                name="fullName"
                placeholder="Full Name"
                value={formData.fullName}
                onChange={handleChange}
                className="w-full bg-[#F8F9FA] rounded-lg border-none focus:outline-none text-sm p-3 text-gray-700 placeholder-gray-400"
              />

              <input 
                type="tel" 
                name="mobileNumber"
                placeholder="Mobile Number"
                value={formData.mobileNumber}
                onChange={handleChange}
                className="w-full bg-[#F8F9FA] rounded-lg border-none focus:outline-none text-sm p-3 text-gray-700 placeholder-gray-400"
              />

              <input 
                type="email" 
                name="emailId"
                placeholder="Email ID"
                value={formData.emailId}
                onChange={handleChange}
                className="w-full bg-[#F8F9FA] rounded-lg border-none focus:outline-none text-sm p-3 text-gray-700 placeholder-gray-400"
              />
            </div>

            {/* Submit Button */}
            <button 
              type="submit"
              className="mt-2 w-full bg-[#8B0000] text-white font-semibold rounded-full py-3.5 text-[15px] hover:bg-red-900 transition-colors"
            >
              Enquiry Now
            </button>
            
            {/* Success toast */}
            {showToast && (
              <div className="mt-3 w-full flex items-center gap-3 bg-[#D9EFE0] border border-[#BFE3CC] text-[#1B2559] px-4 py-3 rounded-lg shadow-sm">
                <ShieldCheck className="w-6 h-6 text-white shrink-0" strokeWidth={2} fill="#1E8A4C" />
                <span className="text-sm font-medium flex-1 leading-snug">
                  Thank you for the inquiry! We will get back to you shortly.
                </span>
                <button
                  type="button"
                  onClick={() => setShowToast(false)}
                  aria-label="Dismiss"
                  className="ml-1 text-[#1B2559] hover:opacity-70 transition-opacity shrink-0"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}
          </form>
        </div>
      </div>

      {/* Additional Cruise Sections */}
      <div className="mt-6 flex flex-col gap-2">
        <CruiseBookings />
        <TopDestinations />
        <FeaturedCruises />
        <NeedHelpBanner />
        <Footer2/>
      </div>

      {/* Mobile Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 z-50">
        <BottomNav />
      </div>
    </div>
  );
};

export default MobileCruiseSearch;
