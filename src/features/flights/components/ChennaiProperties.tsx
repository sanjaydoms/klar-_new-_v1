import { MapPin, ArrowRight, Camera, Compass, Star, Building, Waves } from 'lucide-react';

export default function ChennaiProperties() {
  // Iconic Locations & Regions in Chennai
  const iconicProperties = [
    {
      id: 1,
      title: "Marina Beach Promenade",
      location: "Kamabaraj Salai, Chennai",
      tag: "Coastal Landmark",
      image: "https://images.unsplash.com/photo-1582510003544-4d00b7f74220?auto=format&fit=crop&w=800&q=80",
      description: "The longest natural urban beach in the country along the Bay of Bengal. A historic sandy coastline perfect for breeze-filled evening strolls and local food stalls."
    },
    {
      id: 2,
      title: "Kapaleeshwarar Temple",
      location: "Mylapore, Chennai",
      tag: "Dravidian Architecture",
      image: "https://images.unsplash.com/photo-1605649487212-47bdab064df7?auto=format&fit=crop&w=800&q=80",
      description: "A majestic 7th-century shrine dedicated to Lord Shiva, showcasing legendary decorated Gopurams, detailed stone carvings, and a sacred water tank."
    },
    {
      id: 3,
      title: "DakshinaChitra Museum",
      location: "East Coast Road (ECR)",
      tag: "Cultural Heritage",
      image: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=800&q=80",
      description: "A living-history museum featuring authentic reconstructed historical homes detailing the art, architecture, and lifestyle crafts of South India."
    }
  ];

  // Curated Luxury Stays & Premium Coastal Resorts
  const boutiqueStays = [
    {
      title: "The Coromandel Grand Palace",
      location: "Nungambakkam",
      rating: 4.9,
      price: "₹14,500 / night",
      image: "https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&w=600&q=80",
      amenities: ["Heritage Luxury Suites", "Classic Carnatic Lounge", "Fine Dining"]
    },
    {
      title: "Bayview Shoreline Resort",
      location: "East Coast Road (ECR)",
      rating: 4.8,
      price: "₹12,200 / night",
      image: "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=600&q=80",
      amenities: ["Private Beach Access", "Infinity Spa Deck", "Seafood Grill"]
    },
    {
      title: "The Chettinad Manor",
      location: "Mylapore",
      rating: 4.7,
      price: "₹9,800 / night",
      image: "https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?auto=format&fit=crop&w=600&q=80",
      amenities: ["Traditional Courtyards", "Artisanal Filter Coffee Bar", "Yoga Lawn"]
    }
  ];

  return (
    <div className="bg-slate-50 min-h-screen text-[#1A1F4D] font-sans antialiased overflow-x-hidden">
      
      {/* SECTION 1: HERO SPOTLIGHT */}
      <div className="relative w-full h-[70vh] md:h-[80vh] overflow-hidden bg-black">
        <img 
          src="https://images.unsplash.com/photo-1626125345510-4603468eedfb?auto=format&fit=crop&w=1920&q=80" 
          alt="Chennai Heritage Shoreline" 
          className="w-full h-full object-cover opacity-75 scale-100 transition-transform duration-10000 hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-50 via-black/20 to-black/40" />
        
        <div className="absolute inset-0 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col justify-end pb-12 md:pb-20">
          <div className="max-w-3xl">
            <span className="inline-flex items-center gap-2 px-3 py-1.5 bg-white/20 backdrop-blur-md rounded-full text-white text-xs md:text-sm font-semibold tracking-wide mb-4">
              <Building className="w-4 h-4 text-amber-400" /> Gateway to the South, Timeless Traditions
            </span>
            <h1 className="text-4xl sm:text-5xl md:text-7xl font-extrabold text-white tracking-tight leading-none mb-6">
              Chennai
            </h1>
            <p className="text-white/90 text-lg md:text-xl font-normal leading-relaxed mb-8 max-w-2xl drop-shadow-sm">
              From majestic Dravidian temple spires and bustling classical art hubs to serene coastlines along the East Coast Road. Witness a stunning mix of deep heritage and modern growth.
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
              Signature Heritage Marvels
            </h2>
            <p className="text-gray-500 max-w-xl">
              Immerse yourself in spectacular local designs, coastal spaces, and historical pillars that reflect the soul of Chennai.
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
                    Explore Neighborhood Guides
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
              Boutique Hospitality
            </span>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-[#1A1F4D] mt-3 mb-4">
              Featured Luxury Stays & Stately Homes
            </h2>
            <p className="text-gray-500">
              Relax inside beautifully appointed rooms blending traditional textures with top-tier coastal relaxation and premium dining choices.
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
              Immerse Yourself in Chennai's Cultural Rhythm
            </h3>
            <p className="text-slate-300 text-base md:text-lg mb-8 leading-relaxed">
              Chennai is a beautifully grounded cultural center. Savor world-famous filter coffee blends, explore legendary hand-woven Kanchipuram silk boutiques, or experience standard Carnatic classical music recitals in historic neighborhood auditoriums.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              <div className="bg-white/10 backdrop-blur-sm p-4 rounded-xl border border-white/10">
                <div className="font-bold text-lg text-amber-400 mb-1">Tiffin & Coffee Culture</div>
                <p className="text-xs text-slate-300">Enjoy steaming, authentic filter coffee accompanied by perfectly crisp ghee dosas.</p>
              </div>
              <div className="bg-white/10 backdrop-blur-sm p-4 rounded-xl border border-white/10">
                <div className="font-bold text-lg text-amber-400 mb-1">Kanchipuram Weaves</div>
                <p className="text-xs text-slate-300">Explore centuries-old heritage boutiques detailing pure mulberry silk textiles.</p>
              </div>
              <div className="bg-white/10 backdrop-blur-sm p-4 rounded-xl border border-white/10">
                <div className="font-bold text-lg text-amber-400 mb-1">Classical Arts</div>
                <p className="text-xs text-slate-300">Experience the elegant classical legacy of Bharatanatyam dance and local music.</p>
              </div>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}