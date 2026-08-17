interface PriceInfoCardProps {
  priceDetails?: {
    baseFare: number;
    airlineGSTComponent: number;
    fuelSurcharge: number;
    otherTaxes: number;
    managementFee: number;
    managementFeeTax: number;
    totalFare: number;
    addOnsTotal: number;
    totalAmount: number;
  };
  adultFare?: any;
  childFare?: any;
  infantFare?: any;
  adultCount?: number;
  childCount?: number;
  infantCount?: number;
}

export default function PriceInfoCard({
  priceDetails,
  adultFare,
  childFare,
  infantFare,
  adultCount = 0,
  childCount = 0,
  infantCount = 0
}: PriceInfoCardProps) {
  if (!priceDetails) {
    return (
      <div className="overflow-hidden rounded-lg border border-border border-t-2 border-t-accent bg-card shadow-lg">
        <div className="p-4">
          <h3 className="mb-3 text-[11px] font-semibold tracking-[0.18em] uppercase text-gray-400">Price Information</h3>
          <div className="text-center text-gray-500 py-4">
            <p className="text-sm">Price details will appear here</p>
          </div>
        </div>
      </div>
    );
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  const taxAmount =
    priceDetails.airlineGSTComponent +
    priceDetails.fuelSurcharge +
    priceDetails.otherTaxes +
    priceDetails.managementFee +
    priceDetails.managementFeeTax;

  const renderPassengerFare = (title: string, fareData: any, count: number) => {
    if (!fareData || count === 0) return null;

    const baseFare = fareData?.FareComponents?.BaseFare || 0;
    const totalFare = fareData?.FareComponents?.TotalFare || 0;
    const taxes =
      (fareData?.AdditionalFareComponents?.TotalAdditionalFare?.AirlineGSTComponent || 0) +
      (fareData?.AdditionalFareComponents?.TotalAdditionalFare?.FuelSurcharge || 0) +
      (fareData?.AdditionalFareComponents?.TotalAdditionalFare?.OtherTaxes || 0) +
      (fareData?.AdditionalFareComponents?.TotalAdditionalFare?.ManagementFee || 0) +
      (fareData?.AdditionalFareComponents?.TotalAdditionalFare?.ManagementFeeTax || 0);

    // Multiply by count
    const totalBaseFare = baseFare * count;
    const totalTaxes = taxes * count;
    const totalTotalFare = totalFare * count;

    // Get baggage info
    // const baggageInfo = fareData?.BaggageInfo?.CheckInBaggage || '';
    // const formattedBaggage = baggageInfo ? baggageInfo.replace('Kilograms', 'Kg') : '';

    return (
      <div className="mt-3 pt-3 border-t border-gray-200 first:border-t-0 first:mt-0 first:pt-0">
        <h4 className="text-xs font-semibold text-gray-600 mb-2">
          {title} {count > 1 ? `× ${count}` : ''}
        </h4>
        <div className="space-y-1.5 pl-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Base Fare</span>
            <span className="font-medium">{formatCurrency(totalBaseFare)}</span>  {/* Changed: using totalBaseFare */}
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Taxes & Surcharges</span>
            <span className="font-medium text-green-600">{formatCurrency(totalTaxes)}</span>  {/* Changed: using totalTaxes */}
          </div>
          {/* {formattedBaggage && (
            <div className="flex justify-between text-xs text-gray-500">
              <span>Baggage</span>
              <span>{formattedBaggage}</span>
            </div>
          )} */}
          <div className="flex justify-between text-sm font-medium">
            <span className="text-gray-700">Total {title}</span>
            <span className="font-semibold">{formatCurrency(totalTotalFare)}</span>  {/* Changed: using totalTotalFare */}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="overflow-hidden rounded-lg border border-border border-t-2 border-t-accent bg-card shadow-lg">
      <div className="p-4">
        <h3 className="mb-3 text-[11px] font-semibold tracking-[0.18em] uppercase text-gray-400">Price Information</h3>

        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Base Fare</span>
            <span className="font-medium">{formatCurrency(priceDetails.baseFare)}</span>
          </div>


          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Tax Amount</span>
            <span className="font-medium text-green-600">{formatCurrency(taxAmount)}</span>
          </div>

        </div>

        {(adultFare || childFare || infantFare) && (
          <div className="mt-3 pt-3 border-t border-gray-200">
            <h4 className="text-xs font-semibold text-gray-600 mb-2">Passenger-wise Breakdown</h4>
            {renderPassengerFare('Adult Fare', adultFare, adultCount)}
            {renderPassengerFare('Child Fare', childFare, childCount)}
            {renderPassengerFare('Infant Fare', infantFare, infantCount)}
          </div>
        )}

        <div className="border-t border-gray-200 mt-3 pt-3">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600 font-medium">Total Fare</span>
            <span className="font-semibold">{formatCurrency(priceDetails.totalFare)}</span>
          </div>
        </div>

        <div className="mt-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Add-ons Total</span>
            <span className="font-medium">{formatCurrency(priceDetails.addOnsTotal)}</span>
          </div>
        </div>

        <div className="border-t border-gray-200 mt-3 pt-3">
          <div className="flex justify-between items-center">
            <span className="text-sm font-semibold text-gray-700">Total Amount</span>
            <span className="font-display text-xl font-medium text-primary">
              {formatCurrency(priceDetails.totalAmount)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
