export const TRIPJACK_FIELD_MAP = {
    searchResult: "SearchResult",
    tripInfos: "TripInformation",

    sI: "SegmentInformation",
    id: "SegmentID",
    stops: "NumberOfStops",
    duration: "Duration",
    dt: "DepartureTime",
    at: "ArrivalTime",
    da: "DepartureAirport",
    aa: "ArrivalAirport",
    so: "StopOverInfo",
    iand: "IsInternationalAndDomestic",
    // isRs is "is RETURN segment". It was previously emitted as
    // "IsRefundableSegment", which the voucher rendered as fare terms.
    isRs: "IsReturnSegment",
    sN: "SegmentNumber",

    fD: "FlightDetails",
    fN: "FlightNumber",
    eT: "EquipmentType",

    aI: "AirlineInfo",
    code: "AirlineCode",
    name: "AirlineName",
    isLcc: "IsLowCostCarrier",

    da_code: "DepartureAirportCode",
    da_city: "DepartureCity",
    da_country: "DepartureCountry",

    aa_code: "ArrivalAirportCode",
    aa_city: "ArrivalCity",
    aa_country: "ArrivalCountry",

    totalPriceList: "TotalPriceList",
    fd: "FareDetails",

    ADULT: "AdultFare",
    CHILD: "ChildFare",

    fC: "FareComponents",
    TF: "TotalFare",
    NF: "NetFare",
    BF: "BaseFare",
    TAF: "TotalAdditionalFare",

    afC: "AdditionalFareComponents",
    MFT: "ManagementFeeTax",
    MF: "ManagementFee",
    OT: "OtherTaxes",
    AGST: "AirlineGSTComponent",
    UDF: "UserDevelopmentFee",
    YR: "CarrierMiscFee",
    YQ: "FuelSurcharge",
    OC: "OtherCharges",

    fcs: "FareComponentsSummary",
    ARF: "AirlineRescheduleFee",
    ARFT: "AirlineRescheduleFeeTax",
    CRF: "TripjackRescheduleFee",
    CRFT: "TripjackRescheduleFeeTax",
    ACF: "AirlineCancellationFee",
    ACFT: "AirlineCancellationFeeTax",
    CCF: "TripjackCancellationFee",
    CCFT: "TripjackCancellationFeeTax",

    sR: "SeatsRemaining",
    rT: "RefundableType",
    cc: "CabinClass",
    // cB is a booking class code on a fare detail but CABIN BAGGAGE under bI —
    // fieldMapper.core resolves it by parent. This is the fare-detail meaning.
    cB: "ClassCode",
    fB: "FareBasis",
    mI: "MealIncluded",

    bI: "BaggageInfo",
    iB: "CheckInBaggage",

    tai: "TripAdditionalInfo",
    tbi: "TripBaggageInfo",

    fareIdentifier: "FareIdentifierType",
    id_fare: "FareID",

    icca: "IsCreditCardApplicable",
    issf: "IsSpecialFare",
    ipm: "InstantPurchaseMessage",

    airFlowType: "AirFlowType",

    desc: "Description",
};

export const BOOKING_LEVEL_FIELD_MAP = {
    bookingId: "BookingId",

    paymentInfos: "PaymentInformations",
    amount: "Amount",

    deliveryInfo: "DeliveryInformation",
    emails: "Emails",
    contacts: "Contacts",

    contactInfo: "EmergencyContactInformation",
    ecn: "EmergencyContactName",

    travellerInfos: "TravellerInformation",

    ti: "Title",
    pt: "PaxType",
    fN: "FirstName",
    lN: "LastName",
    dob: "DateOfBirth",

    pNum: "PassportNumber",
    pNat: "PassportNationality",
    pid: "PassportIssueDate",
    eD: "PassportExpiryDate",

    ssrBaggageInfos: "SSR_Baggage_Information",
    ssrMealInfos: "SSR_Meal_Information",
    ssrSeatInfos: "SSR_Seat_Information",
    ssrExtraServiceInfos: "SSR_Extra_Service_Information",

    key: "SegmentKey",
    code: "SSRCode",

    di: "DocumentId",

    gstInfo: "GSTInformation",
    gstNumber: "GSTNumber",
    registeredName: "RegisteredName",
    Email: "GSTEmail",
    Mobile: "GSTMobile",
    Address: "GSTAddress",

    
};