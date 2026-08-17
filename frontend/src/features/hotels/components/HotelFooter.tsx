import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import FooterInfo from '@/components/Footer/FooterInfo';
import Footer2 from '@/components/Footer/Footer2';
import { encodeRoomsToUrl } from '@/utils/hotelUtils';
import { getHotelSuggestions } from '@/features/hotels/services/hotelSearchService';

interface FooterSection {
  title: string;
  links: string[];
}

const footerSections: FooterSection[] = [
  {
    title: 'Popular Hotel Destinations in India',
    links: [
      'Hotels in Delhi', 'Hotels in Bangalore', 'Hotels in Mumbai', 'Hotels in Hyderabad',
      'Hotels in Agra', 'Hotels in Chennai', 'Hotels in Haridwar', 'Hotels in Kolkata',
      'Hotels in Manali', 'Hotels in Goa', 'Hotels in Ayodhya', 'Hotels in Varanasi',
      'Hotels in Rajasthan', 'Hotels in Rishikesh', 'Hotels in Coimbatore',
      'Hotels in Visakhapatnam', 'Hotels in Kochi', 'Hotels in Pune', 'Hotels in Mysore',
      'Hotels in Lucknow', 'Hotels in Jaipur', 'Hotels in Ahmedabad', 'Hotels in Surat',
      'Hotels in Chandigarh', 'Hotels in Bhopal', 'Hotels in Patna', 'Hotels in Indore',
      'Hotels in Nagpur', 'Hotels in Srinagar', 'Hotels in Jodhpur', 'Hotels in Udaipur',
      'Hotels in Amritsar', 'Hotels in Jammu', 'Hotels in Leh', 'Hotels in Aurangabad'
    ]
  },
  {
    title: 'Popular Hill Hotel Destinations in India',
    links: [
      'Hotels in Manali', 'Hotels in Shimla', 'Hotels in Ooty', 'Hotels in Coorg',
      'Hotels in Mount Abu', 'Hotels in Munnar', 'Hotels in Darjeeling', 'Hotels in Gulmarg',
      'Hotels in Dehradun', 'Hotels in Nainital', 'Hotels in Mussoorie', 'Hotels in Guwahati',
      'Hotels in Dalhousie', 'Hotels in Mahabaleshwar', 'Hotels in Araku Valley',
      'Hotels in Kodaikanal', 'Hotels in Chikmagalur', 'Hotels in Kasauli',
      'Hotels in Lansdowne', 'Hotels in Shillong', 'Hotels in Gangtok', 'Hotels in Almora',
      'Hotels in Tawang', 'Hotels in Auli', 'Hotels in Chopta', 'Hotels in Bir Billing',
      'Hotels in Spiti', 'Hotels in Dharamsala', 'Hotels in McLeod Ganj'
    ]
  },
  {
    title: 'International Hotel Destinations',
    links: [
      'Hotels in Dubai', 'Hotels in Singapore', 'Hotels in Bangkok', 'Hotels in Paris',
      'Hotels in London', 'Hotels in New York', 'Hotels in Bali', 'Hotels in Maldives',
      'Hotels in Kuala Lumpur', 'Hotels in Pattaya', 'Hotels in Colombo', 'Hotels in Phuket',
      'Hotels in Tokyo', 'Hotels in Istanbul', 'Hotels in Rome', 'Hotels in Barcelona',
      'Hotels in Amsterdam', 'Hotels in Vienna', 'Hotels in Prague', 'Hotels in Zurich',
      'Hotels in Sydney', 'Hotels in Melbourne', 'Hotels in Toronto', 'Hotels in Miami',
      'Hotels in Los Angeles', 'Hotels in Las Vegas', 'Hotels in Doha', 'Hotels in Abu Dhabi',
      'Hotels in Cairo', 'Hotels in Nairobi', 'Hotels in Cape Town', 'Hotels in Hong Kong'
    ]
  },
  {
    title: 'Most Searched Hotels In India',
    links: [
      'Fairmont Jaipur', 'ITC Grand Chola', 'The Oberoi Udaivilas', 'The Leela Palace',
      'Taj Bengal', 'The Westin Goa', 'Grand Hyatt Mumbai', 'Hilton Jaipur',
      'The St. Regis Mumbai', 'Taj Exotica Resort & Spa Goa', 'The Taj Mahal Palace',
      'ITC Mughal Agra', 'Hyatt Ahmedabad', 'Jaipur Marriott Hotel', 'Rambagh Palace',
      'Umaid Bhawan Palace', 'The Lalit New Delhi', 'JW Marriott Mumbai', 'Trident Agra',
      'Taj Lake Palace Udaipur', 'The Imperial New Delhi', 'Radisson Blu Kochi'
    ]
  },
  {
    title: 'Pilgrimage Hotel Destinations',
    links: [
      'Hotels in Prayagraj', 'Hotels in Ayodhya', 'Hotels in Varanasi', 'Hotels in Haridwar',
      'Hotels in Shirdi', 'Hotels in Katra', 'Hotels in Vrindavan', 'Hotels in Dwarka',
      'Hotels in Tirupati', 'Hotels in Puri', 'Hotels in Bodhgaya', 'Hotels in Amritsar',
      'Hotels in Ajmer', 'Hotels in Rameshwaram', 'Hotels in Madurai', 'Hotels in Ujjain',
      'Hotels in Mathura', 'Hotels in Nashik', 'Hotels in Somnath', 'Hotels in Badrinath',
      'Hotels in Kedarnath', 'Hotels in Rishikesh', 'Hotels in Nanded', 'Hotels in Palitana'
    ]
  },
  {
    title: 'Top 5 Star Rating Hotels',
    links: [
      '5 Star Hotels in New Delhi', '5 Star Hotels in Bangalore', '5 Star Hotels in Mumbai',
      '5 Star Hotels in Goa', '5 Star Hotels in Manali', '5 Star Hotels in Ooty',
      '5 Star Hotels in Shimla', '5 Star Hotels in Gurugram', '5 Star Hotels in Kolkata',
      '5 Star Hotels in Hyderabad', '5 Star Hotels in Jaipur', '5 Star Hotels in Chennai',
      '5 Star Hotels in Kochi', '5 Star Hotels in Agra', '5 Star Hotels in Udaipur',
      '5 Star Hotels in Pune', '5 Star Hotels in Ahmedabad', '5 Star Hotels in Amritsar'
    ]
  },
  {
    title: 'Popular Hotel Chains',
    links: [
      'Taj Hotels', 'Sarovar Hotels', 'Fortune Hotels', 'Carlson Hotels', 'Ginger Hotels',
      'Club Mahindra Hotels', 'Treebo Hotels', 'Sterling Hotels', 'Ramada Hotels',
      'ITDC Group', 'KTDC Hotels', 'Fab Hotels', 'Lemon Tree Hotels', 'The Park Hotels',
      'Marriott Hotels', 'Hyatt Hotels', 'Hilton Hotels', 'ITC Hotels', 'Radisson Hotels',
      'Best Western Hotels', 'Holiday Inn Hotels', 'Accor Hotels', 'OYO Rooms',
      'Wyndham Hotels', 'Starwood Hotels', 'Intercontinental Hotels', 'Novotel Hotels'
    ]
  },
  {
    title: 'Popular Luxury Hotels in India',
    links: [
      'Fairmont Jaipur', 'The Oberoi Udaivilas', 'ITC Grand Chola', 'The Leela Palace',
      'Taj Bengal', 'The Taj Mahal Palace', 'ITC Mughal Agra', 'Rambagh Palace',
      'Umaid Bhawan Palace', 'Taj Lake Palace Udaipur', 'The Imperial New Delhi',
      'Wildflower Hall Shimla', 'RAAS Jodhpur', 'Aman New Delhi', 'Six Senses Fort Barwara',
      'The Leela Kovalam', 'Ananda in the Himalayas', 'Sujan Jawai'
    ]
  },
  {
    title: 'Popular Beach Hotel Destinations',
    links: [
      'Hotels in Goa', 'Hotels in Andaman', 'Hotels in Kerala', 'Hotels in Pondicherry',
      'Hotels in Gokarna', 'Hotels in Varkala', 'Hotels in Alibaug', 'Hotels in Daman',
      'Hotels in Diu', 'Hotels in Lakshadweep', 'Hotels in Mangalore', 'Hotels in Tarkarli',
      'Hotels in Kovalam', 'Hotels in Puri', 'Hotels in Digha', 'Hotels in Rameswaram',
      'Hotels in Kudle Beach', 'Hotels in Marari Beach', 'Hotels in Cherai Beach'
    ]
  },
  {
    title: 'Popular Resort Destinations',
    links: [
      'Resorts in Coorg', 'Resorts in Munnar', 'Resorts in Wayanad', 'Resorts in Udaipur',
      'Resorts in Jim Corbett', 'Resorts in Mahabaleshwar', 'Resorts in Lonavala',
      'Resorts in Goa', 'Resorts in Kerala', 'Resorts in Rishikesh', 'Resorts in Manali',
      'Resorts in Ooty', 'Resorts in Shimla', 'Resorts in Nainital', 'Resorts in Spiti',
      'Resorts in Ranthambore', 'Resorts in Kanha', 'Resorts in Bandhavgarh'
    ]
  },
  {
    title: 'Honeymoon Hotel Destinations',
    links: [
      'Hotels in Maldives', 'Hotels in Bali', 'Hotels in Santorini', 'Hotels in Mauritius',
      'Hotels in Seychelles', 'Hotels in Kashmir', 'Hotels in Andaman',
      'Hotels in Coorg', 'Hotels in Munnar', 'Hotels in Udaipur', 'Hotels in Goa',
      'Hotels in Manali', 'Hotels in Shimla', 'Hotels in Ooty', 'Hotels in Gangtok',
      'Hotels in Paris', 'Hotels in Switzerland', 'Hotels in Bangkok', 'Hotels in Singapore'
    ]
  },
  {
    title: 'Popular Budget Hotels in India',
    links: [
      'Budget Hotels in Delhi', 'Budget Hotels in Mumbai', 'Budget Hotels in Bangalore',
      'Budget Hotels in Jaipur', 'Budget Hotels in Goa', 'Budget Hotels in Chennai',
      'Budget Hotels in Kolkata', 'Budget Hotels in Hyderabad', 'Budget Hotels in Pune',
      'Budget Hotels in Ahmedabad', 'Budget Hotels in Kochi', 'Budget Hotels in Manali',
      'Budget Hotels in Rishikesh', 'Budget Hotels in Varanasi', 'Budget Hotels in Agra'
    ]
  }
];

export const HotelFooter: React.FC = () => {
  const [isExpanded, setIsExpanded] = useState(false);
  const navigate = useNavigate();

  const getTomorrowStr = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split('T')[0];
  };

  const getDayAfterStr = (dateStr: string) => {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return getTomorrowStr();
    date.setDate(date.getDate() + 1);
    return date.toISOString().split('T')[0];
  };

  const handleLinkClick = async (e: React.MouseEvent, linkText: string) => {
    e.preventDefault();

    const checkIn = getTomorrowStr();
    const checkOut = getDayAfterStr(checkIn);
    const rooms = [{ numberOfRoom: 1, Adults: 2, Children: 0, childrenAges: [], paxes: [] }];
    const roomsStr = encodeRoomsToUrl(rooms);

    // Known verified hotel IDs — only include IDs confirmed correct.
    const HOTEL_MAP: Record<string, { id: string; city: string }> = {
      'Fairmont Jaipur': { id: 'TJ:100000418549', city: 'jaipur' },
      'ITC Grand Chola': { id: 'TJ:100000430897', city: 'chennai' },
      'The Oberoi Udaivilas': { id: 'TJ:100000000021', city: 'udaipur' },
      'The Leela Palace': { id: 'TJ:100000000223', city: 'bengaluru' },
      'Taj Bengal': { id: 'TJ:100000415274', city: 'kolkata' },
      'The Westin Goa': { id: 'TJ:100000488204', city: 'goa' },
      'Marina Bay Sands': { id: 'TJ:100000606085', city: 'singapore' },
      'Burj Al Arab': { id: 'TJ:100000442894', city: 'dubai' },
      'The Palm Dubai': { id: 'TJ:100000457923', city: 'dubai' },
      'Bangkok Palace Hotel': { id: 'TJ:100000583015', city: 'bangkok' },
      'Hilton Pattaya': { id: 'TJ:100000364705', city: 'pattaya' },
    };

    const navigateToHotelDetail = (hotelId: string, city: string, name: string) => {
      const searchParams = {
        location: city, destinationCode: '', checkIn, checkOut, rooms, bookForGroup: false, hotelId,
      };
      sessionStorage.setItem('hotelSearchParams', JSON.stringify(searchParams));
      sessionStorage.removeItem('hotelSearchResults');
      navigate(`/hotels/${hotelId}?city=${encodeURIComponent(city)}&checkin=${checkIn}&checkout=${checkOut}&rooms=${roomsStr}`, {
        state: {
          triggerSearch: true,
          hotel: { id: hotelId, propertyCode: hotelId.replace('TJ:', '').replace('RG:', ''), brandCode: '', name, city, images: [], amenities: [], address: '' },
          searchParams,
        }
      });
    };

    const navigateToCitySearch = (city: string, destCode: string = '') => {
      const searchParams = { location: city, destinationCode: destCode, checkIn, checkOut, rooms, bookForGroup: false };
      sessionStorage.setItem('hotelSearchParams', JSON.stringify(searchParams));
      sessionStorage.removeItem('hotelSearchResults');
      navigate(`/hotels/search?city=${encodeURIComponent(city)}&destCode=${destCode}&checkin=${checkIn}&checkout=${checkOut}&rooms=${roomsStr}`, {
        state: { triggerSearch: true }
      });
    };

    // ── Pattern 1: "Hotels in <City>" ──────────────────────────────────────────
    const cityMatch = linkText.match(/^Hotels in (.+)$/i);
    if (cityMatch) {
      const city = cityMatch[1].trim();
      try {
        const suggestions = await getHotelSuggestions(city);
        const s = suggestions?.find((s: any) => s.type === 'city' || s.type === 'state' || s.type === 'location' || s.type === 'region') || suggestions?.[0];
        navigateToCitySearch(s?.city || s?.name || city, s?.destCode || s?.destinationCode || '');
      } catch { navigateToCitySearch(city); }
      return;
    }

    // ── Pattern 2: "5 Star Hotels in <City>" ──────────────────────────────────
    const fiveStarMatch = linkText.match(/^5 Star Hotels in (.+)$/i);
    if (fiveStarMatch) {
      const city = fiveStarMatch[1].trim();
      try {
        const suggestions = await getHotelSuggestions(city);
        const s = suggestions?.find((s: any) => s.type === 'city' || s.type === 'state' || s.type === 'location' || s.type === 'region') || suggestions?.[0];
        const resolvedCity = s?.city || s?.name || city;
        const destCode = s?.destCode || s?.destinationCode || '';
        const searchParams = { location: resolvedCity, destinationCode: destCode, checkIn, checkOut, rooms, bookForGroup: false };
        sessionStorage.setItem('hotelSearchParams', JSON.stringify(searchParams));
        sessionStorage.removeItem('hotelSearchResults');
        navigate(`/hotels/search?city=${encodeURIComponent(resolvedCity)}&destCode=${destCode}&checkin=${checkIn}&checkout=${checkOut}&rooms=${roomsStr}&starFilter=5`, {
          state: { triggerSearch: true }
        });
      } catch {
        navigate(`/hotels/search?city=${encodeURIComponent(city)}&destCode=&checkin=${checkIn}&checkout=${checkOut}&rooms=${roomsStr}&starFilter=5`, {
          state: { triggerSearch: true }
        });
      }
      return;
    }

    // ── Pattern 3: "Budget Hotels in <City>" ──────────────────────────────────
    const budgetMatch = linkText.match(/^Budget Hotels in (.+)$/i);
    if (budgetMatch) {
      const city = budgetMatch[1].trim();
      try {
        const suggestions = await getHotelSuggestions(city);
        const s = suggestions?.find((s: any) => s.type === 'city' || s.type === 'state' || s.type === 'location' || s.type === 'region') || suggestions?.[0];
        navigateToCitySearch(s?.city || s?.name || city, s?.destCode || s?.destinationCode || '');
      } catch { navigateToCitySearch(city); }
      return;
    }

    // ── Pattern 4: "Resorts in <City>" ────────────────────────────────────────
    const resortMatch = linkText.match(/^Resorts in (.+)$/i);
    if (resortMatch) {
      const city = resortMatch[1].trim();
      try {
        const suggestions = await getHotelSuggestions(city);
        const s = suggestions?.find((s: any) => s.type === 'city' || s.type === 'state' || s.type === 'location' || s.type === 'region') || suggestions?.[0];
        navigateToCitySearch(s?.city || s?.name || city, s?.destCode || s?.destinationCode || '');
      } catch { navigateToCitySearch(city); }
      return;
    }

    // ── Pattern 5: Hotel chain names ending in "Hotels" (e.g. "Taj Hotels") ───
    // These are brand searches — navigate to search with the chain name as keyword
    if (/\bHotels\b$/i.test(linkText) || /\bResorts\b$/i.test(linkText)) {
      navigateToCitySearch(linkText, '');
      return;
    }

    // ── Pattern 6: Specific hotel names — HOTEL_MAP first, then API ───────────
    const mapped = HOTEL_MAP[linkText];
    if (mapped) {
      navigateToHotelDetail(mapped.id, mapped.city, linkText);
      return;
    }

    try {
      const suggestions = await getHotelSuggestions(linkText);
      if (suggestions && suggestions.length > 0) {
        const hotelSuggestion = suggestions.find((s: any) => s.type === 'hotel' && (s.hotelId || s.id));
        if (hotelSuggestion) {
          const hotelId = hotelSuggestion.hotelId || hotelSuggestion.id;
          const city = hotelSuggestion.city || hotelSuggestion.location || linkText;
          navigateToHotelDetail(hotelId, city, linkText);
          return;
        }
        // No hotel suggestion — fall through to city search with the name
        const s = suggestions[0];
        navigateToCitySearch(s?.city || s?.name || linkText, s?.destCode || '');
        return;
      }
    } catch (error) {
      console.error('Error fetching hotel suggestion:', error);
    }

    // Final fallback
    navigateToCitySearch(linkText, '');
  };

  return (
    <>
      <div className="w-full bg-[#f3f3f3] pt-[14px] pb-12">
        <div className="w-full mx-auto px-4 sm:px-6 lg:px-12">
          <div className="flex flex-col">
          {footerSections.slice(0, isExpanded ? footerSections.length : 4).map((section, idx) => (
            <div key={idx} className="flex flex-col mb-[14px]">
              <h4 
                className="font-bold text-[#262626] mb-[10px]"
                style={{ fontFamily: "'Lato', sans-serif", fontSize: '16px' }}
              >
                {section.title}
              </h4>
              {/* 3-line layout using flex-wrap capped to 3 rows */}
              <div
                className="flex flex-wrap gap-x-6"
                style={{ gap: '6px 24px', maxHeight: '72px', overflow: 'hidden' }}
              >
                {section.links.map((link, linkIdx) => (
                  <a 
                    key={linkIdx} 
                    href="#" 
                    onClick={(e) => handleLinkClick(e, link)}
                    className="text-[#4D4D4D] hover:text-[#008cff] transition-colors duration-200"
                    style={{ fontFamily: "'Lato', sans-serif", fontSize: '14px', lineHeight: '20px' }}
                  >
                    {link}
                  </a>
                ))}
              </div>
            </div>
          ))}
          
          <button 
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-[#008cff] hover:text-[#005ea6] text-[14px] flex items-center gap-1 font-medium w-fit mt-2"
            style={{ fontFamily: "'Lato', sans-serif" }}
          >
            {isExpanded ? 'Read Less' : 'Read More'} 
            <svg 
              className={`w-3 h-3 transition-transform ${isExpanded ? 'rotate-180' : ''}`} 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        </div>
      </div>
      </div>
      <Footer2 />
      <FooterInfo serviceType="hotels" />
    </>
  );
};
