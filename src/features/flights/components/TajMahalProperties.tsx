import React, { useState } from 'react';
import { MapPin, ArrowRight, Camera, Compass, Award, Star } from 'lucide-react';

export default function TajMahalProperties() {
  const [hoveredCard, setHoveredCard] = useState(null);

  // Iconic Landmarks (Featuring Taj Mahal)
  const iconicProperties = [
    {
      id: 1,
      title: "The Taj Mahal",
      location: "Agra, Uttar Pradesh",
      tag: "Wonder of the World",
      image: "https://images.unsplash.com/photo-1564507592333-c60657eea523?auto=format&fit=crop&w=800&q=80",
      description: "An ivory-white marble mausoleum on the south bank of the Yamuna river. A timeless monument celebrating architectural perfection and eternal heritage."
    },
    {
      id: 2,
      title: "Bara Imambara",
      location: "Lucknow, Uttar Pradesh",
      tag: "Nawabi Architecture",
      image: "/images/Bara_Imambara.jpg",
      description: "An grand architectural marvel featuring the famous Bhool Bhulaiya (labyrinth), built by the Nawab Asaf-ud-Daula in 1784."
    },
    {
      id: 3,
      title: "Dashashwamedh Ghat",
      location: "Varanasi, Uttar Pradesh",
      tag: "Spiritual Core",
      image: "/public/images/Dashashwamedh_Ghat.jpg",
      description: "The main and most vibrant holy ghat along the Ganges river, renowned worldwide for its hypnotic daily evening Ganga Aarti ceremonies."
    }
  ];

  // Curated Boutique Heritage Stays / Properties
  const boutiqueStays = [
    {
      title: "The Heritage Palace View",
      location: "Agra",
      rating: 4.9,
      price: "₹8,500 / night",
      image: "https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&w=600&q=80",
      amenities: ["Taj View Rooftop", "Mughal Courtyard", "Luxury Spa"]
    },
    {
      title: "Gharana Nawabi Resort",
      location: "Lucknow",
      rating: 4.8,
      price: "₹7,200 / night",
      image: "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=600&q=80",
      amenities: ["Awadhi Kitchen", "Vintage Verandas", "Royal Suites"]
    },
    {
      title: "Vedic Riverfront Sanctuary",
      location: "Varanasi",
      rating: 4.9,
      price: "₹9,800 / night",
      image: "https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?auto=format&fit=crop&w=600&q=80",
      amenities: ["Ghat Access", "Yoga Pavilions", "Organic Dining"]
    }
  ];

  return (
    <div className="bg-slate-50 min-h-screen text-[#1A1F4D] font-sans antialiased overflow-x-hidden">
      
      {/* SECTION 1: HERO SPOTLIGHT */}
      <div className="relative w-full h-[75vh] md:h-[85vh] overflow-hidden bg-black">
        <img 
          src="https://images.unsplash.com/photo-1548013146-72479768bada?auto=format&fit=crop&w=1920&q=80" 
          alt="Uttar Pradesh Tourism" 
          className="w-full h-full object-cover opacity-80 scale-100 transition-transform duration-10000 hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-50 via-black/30 to-black/40" />
        
        <div className="absolute inset-0 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col justify-end pb-12 md:pb-20">
          <div className="max-w-3xl">
            <span className="inline-flex items-center gap-2 px-3 py-1.5 bg-white/20 backdrop-blur-md rounded-full text-white text-xs md:text-sm font-semibold tracking-wide mb-4">
              <Compass className="w-4 h-4 text-amber-400" /> Heart of Incredible India
            </span>
            <h1 className="text-4xl sm:text-5xl md:text-7xl font-extrabold text-white tracking-tight leading-none mb-6">
              Uttar Pradesh
            </h1>
            <p className="text-white/90 text-lg md:text-xl font-normal leading-relaxed mb-8 max-w-2xl drop-shadow-sm">
              From the architectural romance of the Taj Mahal to the profound spirituality of the eternal Ganges shores. Discover the land of emperors, poets, and sacred roots.
            </p>
            <a 
              href="/"
              className="inline-flex items-center gap-2 bg-[#1595B8] hover:bg-[#117a99] text-white px-6 py-3 rounded-xl font-semibold transition-all group shadow-lg shadow-cyan-900/20"
            >
              Start Exploring
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </a>
          </div>
        </div>
      </div>

      {/* SECTION 2: MARVEL LANDMARKS (WITH TAJ MAHAL) */}
      <div id="explore" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-12">
          <div>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-[#1A1F4D] mb-3">
              Iconic Living Wonders
            </h2>
            <p className="text-gray-500 max-w-xl">
              Immerse yourself in centuries of unparalleled heritage, design, and structural poetry defining north Indian civilization.
            </p>
          </div>
          <div className="hidden md:flex items-center gap-1 text-[#1595B8] font-semibold cursor-pointer group">
            <span>View all monuments</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </div>
        </div>

        {/* Dynamic Hover Interactive Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {iconicProperties.map((landmark) => (
            <div
              key={landmark.id}
              className="group bg-white rounded-3xl overflow-hidden shadow-sm hover:shadow-xl border border-gray-100 transition-all duration-300 flex flex-col"
              onMouseEnter={() => setHoveredCard(landmark.id)}
              onMouseLeave={() => setHoveredCard(null)}
            >
              <div className="relative h-64 sm:h-72 overflow-hidden w-full">
                <img 
                  src={landmark.image} 
                  alt={landmark.title} 
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                />
                <div className="absolute top-4 left-4">
                  <span className="px-3 py-1 bg-white/95 backdrop-blur-sm text-[#1A1F4D] text-xs font-bold rounded-full shadow-sm">
                    {landmark.tag}
                  </span>
                </div>
              </div>
              <div className="p-6 flex-1 flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-1.5 text-gray-400 text-xs sm:text-sm mb-2">
                    <MapPin className="w-4 h-4 text-red-500 shrink-0" />
                    <span>{landmark.location}</span>
                  </div>
                  <h3 className="text-xl sm:text-2xl font-bold text-[#1A1F4D] mb-3 group-hover:text-[#1595B8] transition-colors">
                    {landmark.title}
                  </h3>
                  <p className="text-gray-600 text-sm leading-relaxed">
                    {landmark.description}
                  </p>
                </div>

                <div className="mt-6 pt-4 border-t border-gray-50 flex items-center justify-between">
                  <span className="text-xs font-semibold text-gray-400 flex items-center gap-1">
                    <Camera className="w-3.5 h-3.5" /> Photo Spot Active
                  </span>
                  <button className="text-[#1A1F4D] font-bold text-sm flex items-center gap-1 group/btn">
                    Explore Virtual Guide 
                    <ArrowRight className="w-4 h-4 text-[#1595B8] opacity-0 group-hover/btn:opacity-100 group-hover/btn:translate-x-0.5 transition-all" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* SECTION 3: CURATED HERITAGE HOTELS & PROPERTIES */}
      <div className="bg-white border-y border-slate-100 w-full py-16 md:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <span className="text-xs font-bold uppercase tracking-widest text-[#1595B8] bg-cyan-50 px-3 py-1 rounded-full">
              Premium Experiences
            </span>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-[#1A1F4D] mt-3 mb-4">
              Luxury Retold: Curated Stays
            </h2>
            <p className="text-gray-500">
              Transform your expedition into an aristocratic getaway. Experience authentic Awadhi hospitality and direct access to breathtaking heritage locations.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {boutiqueStays.map((stay, idx) => (
              <div key={idx} className="bg-slate-50 rounded-2xl overflow-hidden group shadow-sm hover:shadow-md transition-all">
                <div className="relative h-56 overflow-hidden">
                  <img src={stay.image} alt={stay.title} className="w-full h-full object-cover group-hover:scale-102 transition-transform duration-500" />
                  <div className="absolute top-4 right-4 bg-white px-2 py-1 rounded-lg shadow-sm flex items-center gap-1 text-xs font-bold">
                    <Star className="w-3.5 h-3.5 fill-amber-400 stroke-amber-400" /> {stay.rating}
                  </div>
                </div>
                <div className="p-6">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-[#1595B8] bg-cyan-100/60 px-2 py-0.5 rounded">
                      {stay.location} Premium
                    </span>
                    <span className="text-sm font-bold text-slate-700">{stay.price}</span>
                  </div>
                  <h4 className="font-bold text-lg mb-4 text-[#1A1F4D] group-hover:text-[#1595B8] transition-colors">
                    {stay.title}
                  </h4>
                  <div className="flex flex-wrap gap-2 pt-2">
                    {stay.amenities.map((item, i) => (
                      <span key={i} className="text-xs bg-white border border-slate-200 text-gray-500 px-2.5 py-1 rounded-md">
                        {item}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* SECTION 4: LOCAL ESSENCE & CRAFT HIGHLIGHTS */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24">
        <div className="bg-gradient-to-r from-[#1A1F4D] to-[#242b6c] rounded-3xl p-8 md:p-12 text-white shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 transform translate-x-16 -translate-y-16 w-64 h-64 bg-white/5 rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 transform -translate-x-16 translate-y-16 w-64 h-64 bg-[#1595B8]/10 rounded-full blur-3xl" />
          
          <div className="relative z-10 max-w-3xl">
            <h3 className="text-2xl md:text-3.5xl font-bold tracking-tight mb-4">
              Indulge in the Soul of Awadh & Craft Traditions
            </h3>
            <p className="text-slate-300 text-base md:text-lg mb-8 leading-relaxed">
              Uttar Pradesh is a sensory paradise. Taste the legendary culinary secrets of Lucknow’s Slow Dum Cooking, marvel at the pure silver weaves of Banarasi Silk, or purchase authentic hand-carved soapstone models created right next to the Taj Mahal.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              <div className="bg-white/10 backdrop-blur-sm p-4 rounded-xl border border-white/10">
                <div className="font-bold text-lg text-amber-400 mb-1">Awadhi Gastronomy</div>
                <p className="text-xs text-slate-300">Savor legendary Galouti kebabs and rich aromatic traditional biryanis.</p>
              </div>
              <div className="bg-white/10 backdrop-blur-sm p-4 rounded-xl border border-white/10">
                <div className="font-bold text-lg text-amber-400 mb-1">Banarasi Silks</div>
                <p className="text-xs text-slate-300">Centuries-old legacy of exquisite gold and silver brocade hand-weaving.</p>
              </div>
              <div className="bg-white/10 backdrop-blur-sm p-4 rounded-xl border border-white/10">
                <div className="font-bold text-lg text-amber-400 mb-1">Chikan Embroidery</div>
                <p className="text-xs text-slate-300">Intricate, delicate shadow work hand-stitched on fabrics from Lucknow.</p>
              </div>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}