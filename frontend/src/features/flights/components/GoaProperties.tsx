import React from 'react';
import { MapPin, ArrowRight, Camera, Compass, Star, Waves, Palmtree } from 'lucide-react';

export default function GoaProperties() {
  // Iconic Locations & Regions in Goa
  const iconicProperties = [
    {
      id: 1,
      title: "Fontainhas Latin Quarter",
      location: "Panaji, North Goa",
      tag: "Heritage Walk",
      image: "/images/Fontainhas_Latin_Quarter.jpg",
      description: "A striking, colorful neighborhood featuring preservation-grade Portuguese colonial houses, narrow winding streets, and quaint artisanal balconies."
    },
    {
      id: 2,
      title: "Palolem Beach Bay",
      location: "Canacona, South Goa",
      tag: "Scenic Coastline",
      image: "https://images.unsplash.com/photo-1506929562872-bb421503ef21?auto=format&fit=crop&w=800&q=80",
      description: "A pristine semi-circular white sand beach lined with leaning coconut palms and calm turquoise waters, perfect for serene coastal winding."
    },
    {
      id: 3,
      title: "Basilica of Bom Jesus",
      location: "Old Goa",
      tag: "UNESCO World Heritage",
      image: "https://images.unsplash.com/photo-1590050752117-238cb0fb12b1?auto=format&fit=crop&w=800&q=80",
      description: "An architectural landmark holding the mortal remains of St. Francis Xavier, standing as a premier example of baroque architecture in India."
    }
  ];

  // Curated Luxury Stays & Beachfront Villas
  const boutiqueStays = [
    {
      title: "The Heritage Estate Resort",
      location: "Candolim",
      rating: 4.9,
      price: "₹15,500 / night",
      image: "https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&w=600&q=80",
      amenities: ["Private Beach Pavilion", "Portuguese Indoors", "Infinity Pool"]
    },
    {
      title: "Azura Coastal Sanctuary",
      location: "Morjim",
      rating: 4.8,
      price: "₹12,800 / night",
      image: "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=600&q=80",
      amenities: ["Eco Luxury Tents", "Wellness Spa", "Sunset Deck"]
    },
    {
      title: "The Southern Palms Villa",
      location: "Cavelossim",
      rating: 4.9,
      price: "₹19,200 / night",
      image: "https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?auto=format&fit=crop&w=600&q=80",
      amenities: ["Private Plunge Pool", "Chef-On-Call", "Yacht Access"]
    }
  ];

  return (
    <div className="bg-slate-50 min-h-screen text-[#1A1F4D] font-sans antialiased overflow-x-hidden">
      
      {/* SECTION 1: HERO SPOTLIGHT */}
      <div className="relative w-full h-[70vh] md:h-[80vh] overflow-hidden bg-black">
        <img 
          src="https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1920&q=80" 
          alt="Goa Beach Shoreline" 
          className="w-full h-full object-cover opacity-75 scale-100 transition-transform duration-10000 hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-50 via-black/20 to-black/40" />
        
        <div className="absolute inset-0 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col justify-end pb-12 md:pb-20">
          <div className="max-w-3xl">
            <span className="inline-flex items-center gap-2 px-3 py-1.5 bg-white/20 backdrop-blur-md rounded-full text-white text-xs md:text-sm font-semibold tracking-wide mb-4">
              <Palmtree className="w-4 h-4 text-emerald-400" /> Susegad Living, Sun-Kissed Shores
            </span>
            <h1 className="text-4xl sm:text-5xl md:text-7xl font-extrabold text-white tracking-tight leading-none mb-6">
              Goa
            </h1>
            <p className="text-white/90 text-lg md:text-xl font-normal leading-relaxed mb-8 max-w-2xl drop-shadow-sm">
              From golden sandy shorelines and active water sports to tranquil spice plantations and historical architecture heritage. Discover your ultimate tropical escape.
            </p>
            <a 
              href="/"
              className="inline-flex items-center gap-2 bg-[#1595B8] hover:bg-[#117a99] text-white px-6 py-3 rounded-xl font-semibold transition-all group shadow-lg shadow-cyan-900/20"
            >
              Explore Properties
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </a>
          </div>
        </div>
      </div>

      {/* SECTION 2: ICONIC PROPERTIES & LANDMARKS */}
      <div id="explore" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-12">
          <div>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-[#1A1F4D] mb-3">
              Signature Tropical Marvels
            </h2>
            <p className="text-gray-500 max-w-xl">
              Immerse yourself in scenic vistas, iconic historical remnants, and deep coastal beauty across both hubs of Goa.
            </p>
          </div>
          <div className="hidden md:flex items-center gap-1 text-[#1595B8] font-semibold cursor-pointer group">
            <span>View all locations</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </div>
        </div>

        {/* Responsive Grid Setup */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {iconicProperties.map((landmark) => (
            <div
              key={landmark.id}
              className="group bg-white rounded-3xl overflow-hidden shadow-sm hover:shadow-xl border border-gray-100 transition-all duration-300 flex flex-col"
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
                    <Camera className="w-3.5 h-3.5" /> Destination Verified
                  </span>
                  <button className="text-[#1A1F4D] font-bold text-sm flex items-center gap-1 group/btn">
                    Explore Beach Guides
                    <ArrowRight className="w-4 h-4 text-[#1595B8] opacity-0 group-hover/btn:opacity-100 group-hover/btn:translate-x-0.5 transition-all" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* SECTION 3: PREMIUM HOTELS & ACCOMMODATIONS */}
      <div className="bg-white border-y border-slate-100 w-full py-16 md:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <span className="text-xs font-bold uppercase tracking-widest text-[#1595B8] bg-cyan-50 px-3 py-1 rounded-full">
              Boutique Escapes
            </span>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-[#1A1F4D] mt-3 mb-4">
              Featured Coastal Stays & Villas
            </h2>
            <p className="text-gray-500">
              Relax inside beautifully structured private spaces offering elite seaside access, private butler amenities, and local luxury highlights.
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

      {/* SECTION 4: LOCAL ESSENCE & TRAVEL TEXTURE */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24">
        <div className="bg-gradient-to-r from-[#1A1F4D] to-[#242b6c] rounded-3xl p-8 md:p-12 text-white shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 transform translate-x-16 -translate-y-16 w-64 h-64 bg-white/5 rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 transform -translate-x-16 translate-y-16 w-64 h-64 bg-[#1595B8]/10 rounded-full blur-3xl" />
          
          <div className="relative z-10 max-w-3xl">
            <h3 className="text-2xl md:text-3.5xl font-bold tracking-tight mb-4">
              Immerse Yourself in Goa's Laidback Pulse
            </h3>
            <p className="text-slate-300 text-base md:text-lg mb-8 leading-relaxed">
              Goa is a coastal wonderland blending deep relaxation with creative design. Taste unique legacy Indo-Portuguese fusion dining, explore bustling local flea markets, or participate in thrilling sunset water sports along the Arabian coast.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              <div className="bg-white/10 backdrop-blur-sm p-4 rounded-xl border border-white/10">
                <div className="font-bold text-lg text-emerald-400 mb-1">Coastal Gastronomy</div>
                <p className="text-xs text-slate-300">Indulge in classic Goan fish curry, fresh local catch preparations, and vindaloo cooking.</p>
              </div>
              <div className="bg-white/10 backdrop-blur-sm p-4 rounded-xl border border-white/10">
                <div className="font-bold text-lg text-emerald-400 mb-1">Water Adventures</div>
                <p className="text-xs text-slate-300">Partake in dynamic ocean jet skiing, para-sailing, and remote river kayaking.</p>
              </div>
              <div className="bg-white/10 backdrop-blur-sm p-4 rounded-xl border border-white/10">
                <div className="font-bold text-lg text-emerald-400 mb-1">Heritage Strolls</div>
                <p className="text-xs text-slate-300">Walk past spectacular centuries-old baroque cathedrals and spice plantations.</p>
              </div>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}