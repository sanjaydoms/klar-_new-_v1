import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Footer from '@/components/layout/Footer';

const BLOG_DATA = {
  'goa-resorts': {
    title: 'The Ultimate Goa Experience: Beaches, Nightlife & Culture',
    date: 'Oct 12, 2026',
    heroImage:
      'https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?auto=format&fit=crop&w=1200',
    content:
      'Discover the perfect blend of sun, sand, and vibrant culture in Goa. From serene beaches in the South to the electrifying nightlife in the North, this comprehensive guide covers everything you need for the perfect Goan getaway.',
    gallery: [
      'https://images.unsplash.com/photo-1542281286-9e0a16bb7366?auto=format&fit=crop&w=600',
      'https://images.unsplash.com/photo-1614082242765-7c98ca0f3df3?auto=format&fit=crop&w=600',
      'https://images.unsplash.com/photo-1526761122248-c31c93f8b2b9?auto=format&fit=crop&w=600',
      'https://images.unsplash.com/photo-1544550581-5f7ceaf7f992?auto=format&fit=crop&w=600',
      'https://images.unsplash.com/photo-1516815231560-8f41ec531527?auto=format&fit=crop&w=600',
      'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=600',
      'https://images.unsplash.com/photo-1499793983690-e29da59ef1c2?auto=format&fit=crop&w=600',
      'https://images.unsplash.com/photo-1506929562872-bb421503ef21?auto=format&fit=crop&w=600',
      'https://images.unsplash.com/photo-1471922694854-cefc06cb4d5e?auto=format&fit=crop&w=600',
      'https://images.unsplash.com/photo-1515238152791-38186be846dc?auto=format&fit=crop&w=600',
      'https://images.unsplash.com/photo-1535262412227-8557378cbba1?auto=format&fit=crop&w=600',
      'https://images.unsplash.com/photo-1437719417032-8401c10712ce?auto=format&fit=crop&w=600',
    ],
    thingsToDo: [
      'Watch the spectacular sunset at Vagator Beach',
      "Dance the night away at Tito's Lane in Baga",
      'Explore the historic Aguada Fort and its lighthouse',
      'Visit the magnificent Basilica of Bom Jesus',
      'Shop for souvenirs at the Anjuna Flea Market',
      'Take a spice plantation tour in Ponda',
      'Experience thrilling water sports at Calangute Beach',
      'Enjoy a serene sunset boat cruise on the Mandovi River',
      'Try your luck at a floating luxury casino',
      'Hike to the majestic Dudhsagar Waterfalls',
      'Savor authentic Goan fish curry and feni',
      'Relax on the pristine white sands of Palolem Beach',
      'Discover the charm of the Fontainhas Latin Quarter',
      'Attend a vibrant beach party in Morjim or Ashwem',
      'Take a dolphin spotting cruise in the Arabian Sea',
      'Visit the Se Cathedral, one of the largest in Asia',
      'Explore the ruins of Chapora Fort (Dil Chahta Hai fort)',
      'Rent a scooter and ride through lush green villages',
      'Indulge in a relaxing Ayurvedic massage by the beach',
      'Witness the famous Saturday Night Market at Arpora',
    ],
    placesToVisit: [
      {
        name: 'Baga & Calangute Beaches',
        image:
          'https://images.unsplash.com/photo-1542281286-9e0a16bb7366?auto=format&fit=crop&w=800',
        desc: "The hub of Goa's vibrant nightlife, bustling beach shacks, and water sports.",
      },
      {
        name: 'Aguada Fort',
        image:
          'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=800',
        desc: 'A well-preserved 17th-century Portuguese fort with stunning panoramic ocean views.',
      },
      {
        name: 'Dudhsagar Waterfalls',
        image:
          'https://images.unsplash.com/photo-1471922694854-cefc06cb4d5e?auto=format&fit=crop&w=800',
        desc: 'A majestic four-tiered waterfall surrounded by the lush tropical forests of the Western Ghats.',
      },
      {
        name: 'Basilica of Bom Jesus',
        image:
          'https://images.unsplash.com/photo-1535262412227-8557378cbba1?auto=format&fit=crop&w=800',
        desc: 'A UNESCO World Heritage site showcasing spectacular baroque architecture.',
      },
      {
        name: 'Palolem Beach',
        image:
          'https://images.unsplash.com/photo-1614082242765-7c98ca0f3df3?auto=format&fit=crop&w=800',
        desc: 'A serene crescent-shaped beach in South Goa, perfect for relaxation and dolphin spotting.',
      },
      {
        name: 'Mandovi River Casinos',
        image:
          'https://images.unsplash.com/photo-1526761122248-c31c93f8b2b9?auto=format&fit=crop&w=800',
        desc: 'Floating luxury entertainment destinations offering games, dining, and live music.',
      },
    ],
    packagePrice: '₹12,999',
  },
  'udaipur-weekend': {
    title: 'A Weekend in Udaipur: The City of Lakes',
    date: 'Sep 28, 2026',
    heroImage:
      'https://images.unsplash.com/photo-1596895111956-bf1cf0599ce5?auto=format&fit=crop&w=1200',
    content:
      'Planning a short getaway to Rajasthan? Here is the perfect itinerary to explore the majestic palaces, rich history, and serene lakes of Udaipur.',
    gallery: [
      'https://images.unsplash.com/photo-1596895111956-bf1cf0599ce5?auto=format&fit=crop&w=600',
      'https://images.unsplash.com/photo-1615836245337-f839dff8a631?auto=format&fit=crop&w=600',
      'https://images.unsplash.com/photo-1571536802807-3cabee3729e2?auto=format&fit=crop&w=600',
      'https://images.unsplash.com/photo-1582510003544-4d00b7f7415e?auto=format&fit=crop&w=600',
    ],
    thingsToDo: [
      'Take a romantic sunset boat ride on Lake Pichola',
      'Explore the magnificent City Palace complex',
      'Visit the intricately carved Jagdish Temple',
      'Enjoy panoramic city views from the Monsoon Palace (Sajjangarh)',
      'Stroll through the beautiful Saheliyon Ki Bari gardens',
      'Watch the Dharohar folk dance show at Bagore Ki Haveli',
      'Shop for traditional handicrafts and textiles at Hathi Pol',
      'Dine at a rooftop restaurant overlooking the lake',
      "Take the ropeway to Karni Mata Temple for a bird's eye view",
      'Visit the Vintage and Classic Car Museum',
      'Walk around the peaceful Fateh Sagar Lake',
      'Explore the Ahar Cenotaphs royal cremation ground',
      'Take a day trip to the impressive Kumbhalgarh Fort',
      'Visit the ancient Sahastra Bahu Temples in Nagda',
      'Experience a traditional Rajasthani thali at a local eatery',
      'Admire the architecture of the Lake Palace from the water',
      'Photograph the colorful streets of the old city',
      'Visit the Shilpgram rural arts and crafts complex',
      'Try local street food like Kachori and Mirchi Bada',
      'Relax at the serene Ambrai Ghat at sunset',
    ],
    placesToVisit: [
      {
        name: 'City Palace',
        image:
          'https://images.unsplash.com/photo-1615836245337-f839dff8a631?auto=format&fit=crop&w=800',
        desc: 'A stunning complex of palaces built over nearly 400 years, offering sweeping views of the lake.',
      },
      {
        name: 'Lake Pichola',
        image:
          'https://images.unsplash.com/photo-1596895111956-bf1cf0599ce5?auto=format&fit=crop&w=800',
        desc: 'An iconic artificial fresh water lake, home to the famous floating Taj Lake Palace.',
      },
      {
        name: 'Jagdish Temple',
        image:
          'https://images.unsplash.com/photo-1571536802807-3cabee3729e2?auto=format&fit=crop&w=800',
        desc: 'A large, intricately carved Hindu temple situated right in the middle of Udaipur.',
      },
      {
        name: 'Monsoon Palace',
        image:
          'https://images.unsplash.com/photo-1582510003544-4d00b7f7415e?auto=format&fit=crop&w=800',
        desc: 'A hilltop palatial residence overlooking the Fateh Sagar Lake, famous for spectacular sunsets.',
      },
      {
        name: 'Saheliyon Ki Bari',
        image:
          'https://images.unsplash.com/photo-1614082242765-7c98ca0f3df3?auto=format&fit=crop&w=800',
        desc: 'A historic, lush green garden with fountains, lotus pools, and marble pavilions.',
      },
    ],
    packagePrice: '₹14,499',
  },
};

const BlogDetailPage = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const blog = BLOG_DATA[slug as keyof typeof BLOG_DATA];

  if (!blog) {
    return (
      <div className="bg-white min-h-screen flex flex-col">
        <div className="flex-1 flex flex-col items-center justify-center p-20 text-center">
          <h1 className="text-3xl font-bold text-gray-800 mb-4">Content not found!</h1>
          <button onClick={() => navigate(-1)} className="text-blue-600 hover:underline">
            Go Back
          </button>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="bg-white min-h-screen flex flex-col">
      <div className="flex-1 max-w-6xl mx-auto px-4 py-12 w-full">
        <button
          onClick={() => navigate(-1)}
          className="text-blue-600 mb-6 hover:underline flex items-center gap-2 font-medium"
        >
          &larr; Back to Inspirations
        </button>

        {/* Header Section */}
        <div className="text-center mb-10">
          <p className="text-blue-600 mb-4 font-bold tracking-widest uppercase text-sm">
            Destinations & Packages • {blog.date}
          </p>
          <h1
            className="text-4xl md:text-6xl font-bold text-gray-900 mb-6"
            style={{ fontFamily: "'Playfair Display', serif" }}
          >
            {blog.title}
          </h1>
          <p className="text-gray-600 text-lg md:text-xl max-w-3xl mx-auto">{blog.content}</p>
        </div>

        {/* Hero Image */}
        <img
          src={blog.heroImage}
          alt={blog.title}
          className="w-full h-[400px] md:h-[600px] object-cover rounded-3xl mb-16 shadow-2xl"
        />

        {/* Photo Gallery */}
        <div className="mb-16">
          <h2
            className="text-3xl font-bold text-gray-900 mb-8 border-b pb-4"
            style={{ fontFamily: "'Playfair Display', serif" }}
          >
            Mini Gallery
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {blog.gallery.map((img, idx) => (
              <div
                key={idx}
                className="relative group overflow-hidden rounded-xl shadow-sm aspect-square"
              >
                <img
                  src={img}
                  alt={`Gallery ${idx}`}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                />
              </div>
            ))}
          </div>
        </div>

        {/* Things To Do - Bullet List */}
        <div className="mb-20 bg-blue-50 p-8 md:p-12 rounded-3xl">
          <h2
            className="text-3xl font-bold text-gray-900 mb-8"
            style={{ fontFamily: "'Playfair Display', serif" }}
          >
            Things To Do ({blog.thingsToDo.length}+ Activities)
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
            {blog.thingsToDo.map((item, idx) => (
              <div key={idx} className="flex items-start gap-3">
                <div className="w-2 h-2 bg-blue-600 rounded-full mt-2 flex-shrink-0"></div>
                <p className="text-gray-800 text-lg leading-relaxed">{item}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Sightseeing / Places to Visit */}
        <h2
          className="text-3xl font-bold text-gray-900 mb-8 border-b pb-4"
          style={{ fontFamily: "'Playfair Display', serif" }}
        >
          Top Places to Visit
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-20">
          {blog.placesToVisit.map((place, idx) => (
            <div
              key={idx}
              className="bg-gray-50 border border-gray-100 rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col"
            >
              <img src={place.image} alt={place.name} className="w-full h-56 object-cover" />
              <div className="p-6 flex-1 flex flex-col">
                <h3
                  className="text-2xl font-bold text-gray-900 mb-3"
                  style={{ fontFamily: "'Playfair Display', serif" }}
                >
                  {place.name}
                </h3>
                <p className="text-gray-600 flex-1">{place.desc}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Book Package CTA */}
        <div className="bg-gray-900 text-white rounded-3xl p-10 md:p-16 text-center shadow-2xl relative overflow-hidden">
          <div className="absolute inset-0 opacity-20">
            <img src={blog.heroImage} className="w-full h-full object-cover" alt="Background" />
          </div>
          <div className="relative z-10">
            <h2
              className="text-4xl font-bold mb-4"
              style={{ fontFamily: "'Playfair Display', serif" }}
            >
              Book This Entire Experience
            </h2>
            <p className="text-gray-300 text-lg mb-8 max-w-2xl mx-auto">
              Get hotels, activities, and a curated itinerary bundled into one seamless travel
              package.
            </p>
            <div className="flex flex-col md:flex-row items-center justify-center gap-6">
              <div className="text-left">
                <p className="text-gray-400 text-sm uppercase tracking-wider">Starting from</p>
                <p className="text-4xl font-bold text-[#D4AF37]">
                  {blog.packagePrice}{' '}
                  <span className="text-lg text-gray-300 font-normal">/ person</span>
                </p>
              </div>
              <button
                onClick={() => navigate('/packages/search')}
                className="bg-[#D4AF37] text-gray-900 px-10 py-4 rounded-full text-lg font-bold hover:bg-yellow-500 transition-colors shadow-lg hover:shadow-xl transform hover:-translate-y-1"
              >
                Explore Packages
              </button>
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default BlogDetailPage;
