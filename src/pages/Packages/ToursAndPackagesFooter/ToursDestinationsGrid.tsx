// import React from 'react';

// interface DestinationItem {
//   name: string;
//   description: string;
//   bestTime: string;
//   placesToVisit: string[];
//   note?: string; 
// }

// const destinations: DestinationItem[] = [
//   {
//     name: 'Goa',
//     description: 'When it comes to beach holidays, there is no place better than Goa. With sun-kissed beaches, vibrant nightlife, and Portuguese heritage, Goa is the ultimate beach destination. Enjoy water sports, relaxed beach shacks, and rich colonial architecture. Explore our Goa tour packages online and book the one that suits your preferences to have a memorable vacation. The coastal state is truly a paradise for those who love water sports and a vibrant nightlife. You can also explore our Goa honeymoon packages if you are planning to travel with your partner.',
//     bestTime: 'November to February',
//     placesToVisit: ['Baga Beach', 'Calangute', 'Anjuna', 'Fort Aguada', 'Panaji'],
//     note: 'You can easily book your Goa tour packages on Klar Travels. We also have many Goa packages from Delhi, Goa packages from Mumbai, etc.'
//   },
//   {
//     name: 'Kerala',
//     description: 'Referred to as "God\'s Own Country," Kerala offers tranquil backwaters, lush tea plantations, pristine beaches, and rejuvenating Ayurvedic wellness retreats. Book our Kerala packages and get ready to experience the mesmerising beauty of this destination.',
//     bestTime: 'September to March',
//     placesToVisit: ['Alleppey Backwaters', 'Munnar Tea Gardens', 'Wayanad', 'Kochi Fort', 'Kovalam Beach'],
//     note: 'Plan your trip to Kerala and book your Kerala tour packages with us. We have several customized Kerala holiday packages for a perfect holiday.'
//   },
//   {
//     name: 'Kashmir',
//     description: 'Heaven on Earth, Kashmir is famous for its snow-capped mountains, serene lakes, and scenic valleys. Experience traditional houseboat stays and Shikara rides on Dal Lake. Book our Kashmir packages and get ready to witness the mesmerising beauty of this destination. It is the perfect place to travel with your family, friends, or partner. Experience a shikara ride on Dal Lake, stay in a houseboat, and take a stroll in the beautiful Mughal gardens.',
//     bestTime: 'March to October',
//     placesToVisit: ['Srinagar', 'Gulmarg', 'Pahalgam', 'Sonamarg'],
//     note: 'There are many places to visit in Kashmir. Choose from our Kashmir tour packages online and get ready for a memorable vacation. We have many packages from Delhi, Kashmir packages from Mumbai, and many more.'
//   },
//   {
//     name: 'Rajasthan',
//     description: 'A land of royal grandeur, majestic forts, and rich heritage. Rajasthan takes you through vibrant deserts, grand palaces, and timeless cultural traditions. Book our Rajasthan packages and explore the rich culture and heritage of this state.',
//     bestTime: 'October to March',
//     placesToVisit: ['Jaipur', 'Udaipur', 'Jodhpur', 'Jaisalmer', 'Pushkar'],
//     note: 'When in Rajasthan, make sure that you try the traditional Rajasthani cuisine and enjoy the folk dance and music performances. Book your Rajasthan tour packages with us and get ready for an amazing trip.'
//   },
//   {
//     name: 'Sikkim',
//     description: 'Nestled in the Himalayas, Sikkim is known for its breathtaking mountain views, peaceful monasteries, vibrant rhododendron valleys, and high-altitude lakes. Book our Sikkim packages and get ready to experience the beauty of this destination. Explore the vibrant culture, visit the ancient monasteries, and enjoy the scenic views of the Himalayas.',
//     bestTime: 'March to May & October to December',
//     placesToVisit: ['Gangtok', 'Nathula Pass', 'Tsomgo Lake', 'Yumthang Valley']
//   },
//   {
//     name: 'Shimla',
//     description: 'A classic hill station surrounded by pine forests and snow-capped peaks. Shimla offers charming colonial architecture, bustling markets, and pleasant weather. Book our Shimla packages and enjoy a relaxing vacation in the lap of nature. Take a stroll on the Mall Road, visit the Jakhoo Temple, and enjoy a toy train ride.',
//     bestTime: 'March to June & December to February (Snowfall)',
//     placesToVisit: ['The Ridge', 'Mall Road', 'Jakhoo Temple', 'Kufri']
//   },
//   {
//     name: 'Uttarakhand',
//     description: 'Known as the "Land of the Gods," Uttarakhand boasts holy pilgrimage sites, scenic hill towns, and thrilling adventure sports like river rafting and trekking. Book our Uttarakhand tour packages and explore the majestic Himalayas, serene lakes, and ancient temples.',
//     bestTime: 'March to June & September to November',
//     placesToVisit: ['Rishikesh', 'Haridwar', 'Nainital', 'Mussoorie', 'Auli']
//   },
//   {
//     name: 'Ooty',
//     description: 'The "Queen of Hill Stations" in South India, Ooty is famous for its rolling green tea gardens, misty hills, colonial charm, and historic toy train. Enjoy a boat ride on the Ooty Lake, visit the Botanical Gardens, and take a stroll through the tea estates.',
//     bestTime: 'October to June',
//     placesToVisit: ['Ooty Lake', 'Botanical Gardens', 'Doddabetta Peak', 'Tea Factory']
//   },
//   {
//     name: 'Nainital',
//     description: 'A picturesque lake town set around the emerald Naini Lake. Ideal for family vacations, boating, scenic ropeway rides, and peaceful nature walks. Book our Nainital tour packages and enjoy a relaxing vacation amidst nature.',
//     bestTime: 'March to June',
//     placesToVisit: ['Naini Lake', 'Naina Devi Temple', 'Snow View Point', 'Eco Cave Gardens']
//   },
//   {
//     name: 'Manali',
//     description: 'A favorite destination for adventure seekers and honeymooners alike, offering river rafting, paragliding, skiing in Solang Valley, and scenic mountain views. Book our Manali tour packages and explore the snow-capped mountains, lush green valleys, and ancient temples.',
//     bestTime: 'October to June',
//     placesToVisit: ['Solang Valley', 'Rohtang Pass', 'Hadimba Temple', 'Old Manali']
//   }
// ];

// export const ToursDestinationsGrid: React.FC = () => {
//   const destinationRows: DestinationItem[][] = [];
//   for (let i = 0; i < destinations.length; i += 2) {
//     destinationRows.push(destinations.slice(i, i + 2));
//   }

//   return (
//     <div className="pt-10">
//       <h3 className="text-lg sm:text-xl font-bold text-black mb-8 tracking-wide font-[Roboto]">
//         Best Destinations to Explore with Klar Travels
//       </h3>

//       <div className="space-y-10">
//         {destinationRows.map((row, rowIdx) => (
//           <div
//             key={rowIdx}
//             className={`grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8 pb-10 ${
//               rowIdx === 0 ? 'border-t border-gray-300/70 pt-8 border-b' : (rowIdx !== destinationRows.length - 1 ? 'border-b border-gray-300/70' : '')
//             }`}
//              style={{
//                 borderTopWidth: rowIdx === 0 ? '1px' : '0px',
//                 borderBottomWidth: rowIdx !== destinationRows.length - 1 ? '1px' : '0px',
//                 borderColor: 'rgba(209, 213, 219, 0.7)' 
//              }}
//           >
//             {row.map((dest, colIdx) => (
//               <div key={colIdx} className="flex flex-col justify-between">
//                 <div>
//                   <h4 className="font-bold text-black text-sm sm:text-base mb-2 font-[Roboto] tracking-wider hover:text-blue-600 hover:underline hover:decoration-blue-600">
//                     {dest.name}
//                   </h4>
//                   <p className="text-gray-600 text-xs sm:text-sm leading-relaxed mb-3">
//                     {dest.description}
//                   </p>

//                   <div className="text-xs text-gray-700 space-y-1 font-sans">
//                     <p>
//                       <span className="font-semibold text-black">Best time to visit:</span> {dest.bestTime}
//                     </p>
//                     <div>
//                       <span className="font-semibold text-black">Best Places to Visit:</span>
//                       <ul className="list-disc list-inside mt-1 space-y-0.5 text-gray-600 pl-1">
//                         {dest.placesToVisit.map((place, pIdx) => (
//                           <li key={pIdx}>{place}</li>
//                         ))}
//                       </ul>
//                     </div>
//                   </div>
                  
//                   {/* Optional Note Rendered Below the List */}
//                   {dest.note && (
//                       <p className="text-gray-600 text-xs sm:text-sm leading-relaxed mt-3">
//                           {dest.note}
//                       </p>
//                   )}
//                 </div>
//               </div>
//             ))}
//           </div>
//         ))}
//       </div>
//     </div>
//   );
// };










































import React from 'react';
import { useNavigate } from 'react-router-dom';

interface DestinationItem {
  name: string;
  description: string;
  bestTime: string;
  placesToVisit: string[];
  note?: string; 
}

const destinations: DestinationItem[] = [
  {
    name: 'Goa',
    description: 'When it comes to beach holidays, there is no place better than Goa. With sun-kissed beaches, vibrant nightlife, and Portuguese heritage, Goa is the ultimate beach destination. Enjoy water sports, relaxed beach shacks, and rich colonial architecture. Explore our Goa tour packages online and book the one that suits your preferences to have a memorable vacation. The coastal state is truly a paradise for those who love water sports and a vibrant nightlife. You can also explore our Goa honeymoon packages if you are planning to travel with your partner.',
    bestTime: 'November to February',
    placesToVisit: ['Baga Beach', 'Calangute', 'Anjuna', 'Fort Aguada', 'Panaji'],
    note: 'You can easily book your Goa tour packages on Klar Travels. We also have many Goa packages from Delhi, Goa packages from Mumbai, etc.'
  },
  {
    name: 'Kerala',
    description: 'Referred to as "God\'s Own Country," Kerala offers tranquil backwaters, lush tea plantations, pristine beaches, and rejuvenating Ayurvedic wellness retreats. Book our Kerala packages and get ready to experience the mesmerising beauty of this destination.',
    bestTime: 'September to March',
    placesToVisit: ['Alleppey Backwaters', 'Munnar Tea Gardens', 'Wayanad', 'Kochi Fort', 'Kovalam Beach'],
    note: 'Plan your trip to Kerala and book your Kerala tour packages with us. We have several customized Kerala holiday packages for a perfect holiday.'
  },
  {
    name: 'Kashmir',
    description: 'Heaven on Earth, Kashmir is famous for its snow-capped mountains, serene lakes, and scenic valleys. Experience traditional houseboat stays and Shikara rides on Dal Lake. Book our Kashmir packages and get ready to witness the mesmerising beauty of this destination. It is the perfect place to travel with your family, friends, or partner. Experience a shikara ride on Dal Lake, stay in a houseboat, and take a stroll in the beautiful Mughal gardens.',
    bestTime: 'March to October',
    placesToVisit: ['Srinagar', 'Gulmarg', 'Pahalgam', 'Sonamarg'],
    note: 'There are many places to visit in Kashmir. Choose from our Kashmir tour packages online and get ready for a memorable vacation. We have many packages from Delhi, Kashmir packages from Mumbai, and many more.'
  },
  {
    name: 'Rajasthan',
    description: 'A land of royal grandeur, majestic forts, and rich heritage. Rajasthan takes you through vibrant deserts, grand palaces, and timeless cultural traditions. Book our Rajasthan packages and explore the rich culture and heritage of this state.',
    bestTime: 'October to March',
    placesToVisit: ['Jaipur', 'Udaipur', 'Jodhpur', 'Jaisalmer', 'Pushkar'],
    note: 'When in Rajasthan, make sure that you try the traditional Rajasthani cuisine and enjoy the folk dance and music performances. Book your Rajasthan tour packages with us and get ready for an amazing trip.'
  },
  {
    name: 'Sikkim',
    description: 'Nestled in the Himalayas, Sikkim is known for its breathtaking mountain views, peaceful monasteries, vibrant rhododendron valleys, and high-altitude lakes. Book our Sikkim packages and get ready to experience the beauty of this destination. Explore the vibrant culture, visit the ancient monasteries, and enjoy the scenic views of the Himalayas.',
    bestTime: 'March to May & October to December',
    placesToVisit: ['Gangtok', 'Nathula Pass', 'Tsomgo Lake', 'Yumthang Valley']
  },
  {
    name: 'Shimla',
    description: 'A classic hill station surrounded by pine forests and snow-capped peaks. Shimla offers charming colonial architecture, bustling markets, and pleasant weather. Book our Shimla packages and enjoy a relaxing vacation in the lap of nature. Take a stroll on the Mall Road, visit the Jakhoo Temple, and enjoy a toy train ride.',
    bestTime: 'March to June & December to February (Snowfall)',
    placesToVisit: ['The Ridge', 'Mall Road', 'Jakhoo Temple', 'Kufri']
  },
  {
    name: 'Uttarakhand',
    description: 'Known as the "Land of the Gods," Uttarakhand boasts holy pilgrimage sites, scenic hill towns, and thrilling adventure sports like river rafting and trekking. Book our Uttarakhand tour packages and explore the majestic Himalayas, serene lakes, and ancient temples.',
    bestTime: 'March to June & September to November',
    placesToVisit: ['Rishikesh', 'Haridwar', 'Nainital', 'Mussoorie', 'Auli']
  },
  {
    name: 'Ooty',
    description: 'The "Queen of Hill Stations" in South India, Ooty is famous for its rolling green tea gardens, misty hills, colonial charm, and historic toy train. Enjoy a boat ride on the Ooty Lake, visit the Botanical Gardens, and take a stroll through the tea estates.',
    bestTime: 'October to June',
    placesToVisit: ['Ooty Lake', 'Botanical Gardens', 'Doddabetta Peak', 'Tea Factory']
  },
  {
    name: 'Nainital',
    description: 'A picturesque lake town set around the emerald Naini Lake. Ideal for family vacations, boating, scenic ropeway rides, and peaceful nature walks. Book our Nainital tour packages and enjoy a relaxing vacation amidst nature.',
    bestTime: 'March to June',
    placesToVisit: ['Naini Lake', 'Naina Devi Temple', 'Snow View Point', 'Eco Cave Gardens']
  },
  {
    name: 'Manali',
    description: 'A favorite destination for adventure seekers and honeymooners alike, offering river rafting, paragliding, skiing in Solang Valley, and scenic mountain views. Book our Manali tour packages and explore the snow-capped mountains, lush green valleys, and ancient temples.',
    bestTime: 'October to June',
    placesToVisit: ['Solang Valley', 'Rohtang Pass', 'Hadimba Temple', 'Old Manali']
  }
];

export const ToursDestinationsGrid: React.FC = () => {
  const navigate = useNavigate();

  const handleDestinationClick = (destinationName: string) => {
    navigate(
      `/tours-contact-form?destinationType=Domestic&destinationName=${encodeURIComponent(
        destinationName
      )}`
    );
  };

  const destinationRows: DestinationItem[][] = [];
  for (let i = 0; i < destinations.length; i += 2) {
    destinationRows.push(destinations.slice(i, i + 2));
  }

  return (
    <div className="pt-10">
      <h3 className="text-lg sm:text-xl font-bold text-black mb-8 tracking-wide font-[Roboto]">
        Best Destinations to Explore with Klar Travels
      </h3>

      <div className="space-y-10">
        {destinationRows.map((row, rowIdx) => (
          <div
            key={rowIdx}
            className={`grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8 pb-10 ${
              rowIdx === 0
                ? 'border-t border-gray-300/70 pt-8 border-b'
                : rowIdx !== destinationRows.length - 1
                ? 'border-b border-gray-300/70'
                : ''
            }`}
            style={{
              borderTopWidth: rowIdx === 0 ? '1px' : '0px',
              borderBottomWidth: rowIdx !== destinationRows.length - 1 ? '1px' : '0px',
              borderColor: 'rgba(209, 213, 219, 0.7)'
            }}
          >
            {row.map((dest, colIdx) => (
              <div key={colIdx} className="flex flex-col justify-between">
                <div>
                  <h4
                    onClick={() => handleDestinationClick(dest.name)}
                    className="font-bold text-black text-sm sm:text-base mb-2 font-[Roboto] tracking-wider hover:text-blue-600 hover:underline hover:decoration-blue-600 cursor-pointer inline-block"
                  >
                    {dest.name}
                  </h4>
                  <p className="text-gray-600 text-xs sm:text-sm leading-relaxed mb-3">
                    {dest.description}
                  </p>

                  <div className="text-xs text-gray-700 space-y-1 font-sans">
                    <p>
                      <span className="font-semibold text-black">Best time to visit:</span>{' '}
                      {dest.bestTime}
                    </p>
                    <div>
                      <span className="font-semibold text-black">Best Places to Visit:</span>
                      <ul className="list-disc list-inside mt-1 space-y-0.5 text-gray-600 pl-1">
                        {dest.placesToVisit.map((place, pIdx) => (
                          <li key={pIdx}>{place}</li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  {dest.note && (
                    <p className="text-gray-600 text-xs sm:text-sm leading-relaxed mt-3">
                      {dest.note}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
};