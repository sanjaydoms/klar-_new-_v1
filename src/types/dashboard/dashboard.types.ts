export interface DashboardProps {
  onLogout: () => void;
  onFlightSearch?: (params: {
    tripType: string;
    from: string;
    to: string;
    departure: string;
    travelers: string;
    class: string;
    fareType: string;
  }) => void;
}

export interface Location {
  city: string;
  country: string;
  code: string;
}
