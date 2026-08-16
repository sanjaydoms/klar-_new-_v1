import React from 'react';

export const ToursInfoContent: React.FC = () => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-10 text-gray-800 text-xs sm:text-sm leading-relaxed pb-12  border-gray-300/70">
      {/* Column 1 */}
      <div className="space-y-10">
        {/* Block 1 */}
        <div className="pb-8 border-b border-gray-400/60">
          <h3 className="font-bold text-black text-base sm:text-lg mb-3 font-[Roboto] tracking-wider">
            Why Choose Klar Travels for Your Holidays?
          </h3>
          <p className="text-gray-600">
            Klar Travels, a premier online travel agency in India, possesses an in-depth understanding of the travel
            preferences and needs of Indian consumers. We provide an extensive selection of holiday packages
            both within India and internationally, catering to diverse traveler segments. Our customizable tour
            packages allow travelers to craft their unique holiday experiences, while our fixed departure
            packages come with pre-planned itineraries, ensuring that every type of traveler finds their perfect
            getaway.
          </p>
        </div>

        {/* Block 2 */}
        <div className="pb-8 border-b border-gray-400/60">
          <h3 className="font-bold text-black text-base sm:text-lg mb-3 font-[Roboto] tracking-wider">
            How to plan your holidays with Klar Travels?
          </h3>
          <p className="text-gray-600">
            The intuitive Klar Travels App and website empower passionate explorers to effortlessly plan and
            book their dream vacations with just a few clicks. Simply apply the filters to select your desired
            destination, travel dates, duration, and any specific hotel preferences. Klar Travels presents a wide
            array of holiday packages tailored to your needs. Choose a package that fits your criteria, or
            customize your own by selecting hotels, adding sightseeing tours, and activities to create a
            personalized itinerary. For those who prefer offline assistance, you can reach out to our travel experts
            via chat or submit a query for prompt support. With Klar Travels, organizing and purchasing your
            perfect getaway has never been simpler.
          </p>
        </div>
      </div>

      {/* Column 2 */}
      <div className="space-y-10">
        {/* Block 3 */}
        <div className="pb-8 border-b border-gray-400/60">
          <h3 className="font-bold text-black text-base sm:text-lg mb-3 font-[Roboto] tracking-wider">
            What does Klar Travels Holidays offer?
          </h3>
          <p className="text-gray-600">
            Klar Travels provides a seamless holiday experience where all your travel requirements are expertly
            managed. From comfortable hotel accommodations and convenient transfers to diverse sightseeing
            options and a variety of activities, our holiday packages are crafted to deliver an exceptional
            experience. Whether you're drawn to popular destinations like Andaman, Kerala, Rajasthan, and
            Kashmir, or prefer the hidden gems of North East, Ladakh, and Uttarakhand, we offer customized
            packages for every corner of India. Our offerings range from unique honeymoon packages to
            specialized tours for women, as well as itineraries tailored for solo adventurers, families, and the
            young at heart—Klar Travels has the perfect solution for all your holiday aspirations.
          </p>
        </div>

        {/* Block 4 */}
        <div className="pb-8 border-b border-gray-400/60">
          <h3 className="font-bold text-black text-base sm:text-lg mb-3 font-[Roboto] tracking-wider">
            The Ultimate Guide to Holidaying in India
          </h3>
          <p className="text-gray-600 mb-4">
            India is a land of history and diversity. As a country that enjoys nature's bounty in the form of
            gorgeous beaches, majestic mountains, colourful deserts and lush forests, it has attracted tourists for
            centuries now. It's no wonder that <span className="font-bold text-gray-600">India holiday packages</span> are so popular among travellers today. So, if
            you are planning to spend your holidays in India, we have done the homework for you. To make your
            holidays unforgettable, read on to know more about this fascinating country! Plan your <span className="font-bold text-gray-600">India tours</span> to
            various exciting destinations in the country with ease.
          </p>
          <p className="text-gray-600">
            For a country as old as India, there is a place or a city for everyone. And almost <span className="font-bold text-gray-600">all India holiday packages</span> will give you a glimpse of this. For the spiritual traveller, there is Varanasi; for the offbeat
            adventurer, there is Ladakh, Arunachal Pradesh & more; if you are looking for some beach vibes, there
            are Goa and Lakshadweep. You can choose what you want from the vast list of <span className="font-bold text-gray-600">India tour packages</span>.
            So plan your holidays in India by booking incredible <span className="font-bold text-gray-600">all India tour packages</span> online. You can make the
            most out of your <span className="font-bold text-gray-600">India tours</span> by choosing <span className="font-bold text-gray-600">holiday packages</span> that are perfect for you.
          </p>
        </div>
      </div>
    </div>
  );
};