import TravellerInfoCard from '../TravellerInfo/TravellerInfoCard';
import { FlightDetailsType } from '@/types/beforeBooking.type';

interface FlightDetailsSectionProps {
  flightDetails: FlightDetailsType;
}

export default function FlightDetailsSection({ flightDetails }: FlightDetailsSectionProps) {
  return (
    <div className="mb-6">
      <TravellerInfoCard
        flightDetails={{
          origin: flightDetails.origin || '',
          destination: flightDetails.destination || '',
          originAirport: flightDetails.originAirport || '',
          destinationAirport: flightDetails.destinationAirport || '',
          departureDate: flightDetails.departureDate || '',
          departureTime: flightDetails.departureTime || '',
          arrivalDate: flightDetails.arrivalDate || '',
          arrivalTime: flightDetails.arrivalTime || '',
          duration: flightDetails.duration || '',
          stops: flightDetails.stops || 0,
          airline: flightDetails.airline || '',
          flightNumber: flightDetails.flightNumber || '',
          refundableType: flightDetails.refundableType ?? -1,
        }}
        baggageInfo={{
          checkIn: flightDetails.baggage?.checkIn || '',
          cabin: flightDetails.baggage?.cabin || '',
        }}
        onContinue={(travellerData) => {}}
      />
    </div>
  );
}
