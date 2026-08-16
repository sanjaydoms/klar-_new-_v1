import React from 'react';

type ServiceType = 'flights' | 'hotels' | 'visa' | 'cabs' | 'tours' | 'insurance';

interface AboutServiceInfoProps {
  serviceType: ServiceType;
}

export default function AboutServiceInfo({ serviceType }: AboutServiceInfoProps) {
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
      case 'visa':
        return {
          title: 'Visas',
          item: 'visas',
          bookAction: 'applications',
          bookings: 'visas',
          industryFocus: 'visa processing',
          guarantee: 'lowest fee',
          status: 'visa status, amazing discounts, and fast processing options',
        };
      case 'cabs':
        return {
          title: 'Cabs',
          item: 'cab rides',
          bookAction: 'rides',
          bookings: 'cab bookings',
          industryFocus: 'cab bookings',
          guarantee: 'lowest fare',
          status: 'ride status, instant fare drops, amazing discounts, and cancellation options',
        };
      case 'tours':
        return {
          title: 'Holiday Packages',
          item: 'holiday packages',
          bookAction: 'packages',
          bookings: 'holiday packages',
          industryFocus: 'holiday bookings',
          guarantee: 'best value',
          status: 'booking status, amazing discounts, instant refunds and rebook options',
        };
      case 'insurance':
        return {
          title: 'Travel Insurance',
          item: 'travel insurance',
          bookAction: 'insurance',
          bookings: 'insurance plans',
          industryFocus: 'travel insurance',
          guarantee: 'best coverage',
          status: 'policy status, amazing discounts, and hassle-free claims',
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
              companies, providing great offers, competitive rates, exclusive discounts, and a
              seamless online booking experience to many of its customers. The experience of booking
              your flight tickets, hotel stay, and holiday package through our desktop site or
              mobile app can be done with complete ease and no hassles at all.
            </p>
          </div>

          <div>
            <h3 className="font-bold text-black mb-4 text-sm">
              Booking {keywords.title} with Klar Travels
            </h3>

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
          </div>
        </div>
      </div>
    </div>
  );
}
