type ServiceType = 'flights' | 'hotels' | 'visa' | 'cabs' | 'tours' | 'insurance';

interface FooterInfoProps {
  serviceType?: ServiceType;
}

const FooterInfo = ({ serviceType = 'flights' }: FooterInfoProps) => {
  const getKeywords = (type: ServiceType) => {
    switch (type) {
      case 'hotels':
        return {
          title: 'Hotels',
          item: 'hotel rooms',
          bookAction: 'stay',
          bookings: 'hotel stays',
          industryFocus: 'hotel bookings',
          guarantee: 'cheapest price',
          status: 'booking status, amazing discounts, instant refunds and cancellation options',
        };
      case 'flights':
      default:
        return {
          title: 'Flights',
          item: 'air tickets',
          bookAction: 'tickets',
          bookings: 'flight tickets',
          industryFocus: 'flight bookings',
          guarantee: 'cheapest fare',
          status: 'current flight status, instant fare drops, amazing discounts, instant refunds and rebook options',
        };
    }
  };

  const keywords = getKeywords(serviceType);

  return (
    <div className="bg-[#f0f0f0]">
      <div className="w-full px-4 sm:px-6 lg:px-12 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
          <div>
            <h3 className="font-bold text-black mb-4 text-sm">Why Klar Travels?</h3>

            <p className="text-sm text-gray-600 leading-7">
              Established in 2000, Klar Travels has since positioned itself as one of the leading
              companies, providing great offers, competitive {serviceType === 'hotels' ? 'hotel rates' : 'airfares'}, exclusive discounts, and a
              seamless online booking experience to many of its customers. The experience of booking
              your flight tickets, hotel stay, and holiday package through our desktop site or
              mobile app can be done with complete ease and no hassles at all.
            </p>
          </div>

          <div>
            <h3 className="font-bold text-black mb-4 text-sm">Booking {keywords.title} with Klar Travels</h3>

            <p className="text-sm text-gray-600 leading-7">
              At Klar Travels, you can find the best deals and cheap {keywords.item} to any place you
              want by booking your {keywords.bookAction} on our website or app. Being India's leading website for
              hotel, flight and holiday bookings, Klar Travels helps you book {keywords.bookings} that
              are affordable and customized to your convenience.
            </p>
          </div>

          <div>
            <h3 className="font-bold text-black mb-4 text-sm">
              Domestic {keywords.title} with Klar Travels
            </h3>

            <p className="text-sm text-gray-600 leading-7">
              Klar Travels is India's leading player for {keywords.industryFocus}. With the {keywords.guarantee}
              {' '}guarantee, experience great value at the lowest price. Instant notifications ensure
              {' '}{keywords.status}.
            </p>

            <div className="mt-4 flex justify-end">
              <img
                src="/logo/Doms.png"
                alt="Klar Travels"
                className="h-16 w-auto"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FooterInfo;
