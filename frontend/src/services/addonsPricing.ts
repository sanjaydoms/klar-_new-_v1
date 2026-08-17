// // Add-ons Pricing API Service
// // Dynamically fetches add-ons data from priceAvailabilityResponse in session storage

// interface MealPricing {
//   id: string;
//   code: string;
//   name: string;
//   category?: 'veg' | 'non-veg' | 'beverage' | 'snack';
//   basePrice: number;
//   economyPrice: number;
//   businessPrice: number;
//   firstClassPrice: number;
//   currentPrice: number;
//   description: string;
//   iswca: boolean;
// }

// interface BaggagePricing {
//   id: string;
//   code: string;
//   weight: string;
//   weightKg?: number;
//   economyPrice: number;
//   businessPrice: number;
//   firstClassPrice: number;
//   currentPrice: number;
//   description: string;
//   iswca: boolean;
// }

// interface SeatPricing {
//   id: string;
//   seatType: 'standard' | 'extra-legroom' | 'window' | 'aisle' | 'premium';
//   economyPrice: number;
//   businessPrice: number;
//   firstClassPrice: number;
//   currentPrice: number;
//   description: string;
// }

// interface ClassUpgradePricing {
//   economy: {
//     baseFare: number;
//     mealIncluded: boolean;
//     baggageIncluded: string; // in kg
//     seatSelectionFee: number;
//   };
//   business: {
//     baseFare: number;
//     mealIncluded: boolean;
//     baggageIncluded: string;
//     seatSelectionFee: number;
//     upgradeFromEconomy: number;
//   };
//   first: {
//     baseFare: number;
//     mealIncluded: boolean;
//     baggageIncluded: string;
//     seatSelectionFee: number;
//     upgradeFromEconomy: number;
//     upgradeFromBusiness: number;
//   };
// }

// interface PriceAvailabilityResponse {
//   success: boolean;
//   message: string;
//   data: {
//     bookingId: string;
//     totalPrice: {
//       baseFare: number;
//       taxesAndFees: number;
//       totalFare: number;
//       netFare: number;
//       breakdown: {
//         otherTax: number;
//         serviceTax: number;
//       };
//     };
//     flights: Array<{
//       segmentId: string;
//       flightNumber: string;
//       airline: {
//         code: string;
//         name: string;
//         isLcc: boolean;
//       };
//       departure: {
//         airportCode: string;
//         airportName: string;
//         time: string;
//         date: string;
//         datetime: string;
//       };
//       arrival: {
//         airportCode: string;
//         airportName: string;
//         time: string;
//         date: string;
//         datetime: string;
//       };
//       duration: number;
//       stops: number;
//       fareOptions: Array<{
//         fareId: string;
//         fareIdentifier: string;
//         cabinClass: string;
//         bookingClass: string;
//         fareBasis: string;
//         baseFare: number;
//         taxesAndFees: number;
//         totalFare: number;
//         netFare: number;
//         refundable: boolean;
//         baggage: {
//           checked: string;
//           cabin: string;
//         };
//         seatAvailability: number;
//         meals?: {
//           [segmentId: string]: Array<{
//             code: string;
//             amount: number;
//             desc: string;
//             iswca: boolean;
//           }>;
//         };
//         baggageOptions?: {
//           [segmentId: string]: Array<{
//             code: string;
//             amount: number;
//             desc: string;
//             iswca: boolean;
//           }>;
//         };
//         passengerBreakdown: {
//           adult: {
//             baseFare: number;
//             taxesAndFees: number;
//             totalFare: number;
//           };
//         };
//         fareBreakdown: {
//           managementFee: number;
//           otherTax: number;
//           serviceTax: number;
//           airportTax: number;
//         };
//       }>;
//     }>;
//     passengerSummary: {
//       adult: number;
//       child: number;
//       infant: number;
//       totalPassengers: number;
//     };
//   };
// }

// // Helper function to get data from session storage
// const getPriceAvailabilityData = (): PriceAvailabilityResponse | null => {
//   try {
//     const storedData = sessionStorage.getItem('priceAvailabilityResponse');
//     if (storedData) {
//       return JSON.parse(storedData);
//     }
//     return null;
//   } catch (error) {
//     console.error('Failed to parse priceAvailabilityResponse from session storage:', error);
//     return null;
//   }
// };

// // Helper function to determine meal category from description
// const determineMealCategory = (description: string): 'veg' | 'non-veg' | 'beverage' | 'snack' => {
//   const lowerDesc = description.toLowerCase();
//   if (lowerDesc.includes('veg') || lowerDesc.includes('paneer') || lowerDesc.includes('vegetable')) {
//     return 'veg';
//   } else if (lowerDesc.includes('chicken') || lowerDesc.includes('egg') || lowerDesc.includes('fish')) {
//     return 'non-veg';
//   } else if (lowerDesc.includes('beverage') || lowerDesc.includes('drink') || lowerDesc.includes('juice')) {
//     return 'beverage';
//   } else {
//     return 'snack';
//   }
// };

// // Extract weight in kg from description
// const extractWeightKg = (description: string): number => {
//   const match = description.match(/(\d+)\s*kg/i);
//   return match ? parseInt(match[1]) : 0;
// };

// // Get base class pricing from flight data
// const getBaseClassPricing = (): ClassUpgradePricing => {
//   const priceData = getPriceAvailabilityData();

//   if (!priceData?.data?.flights?.[0]?.fareOptions?.[0]) {
//     // Return default values if no data available
//     return {
//       economy: {
//         baseFare: 0,
//         mealIncluded: false,
//         baggageIncluded: '0 Kg',
//         seatSelectionFee: 0,
//       },
//       business: {
//         baseFare: 0,
//         mealIncluded: true,
//         baggageIncluded: '0 Kg',
//         seatSelectionFee: 0,
//         upgradeFromEconomy: 0,
//       },
//       first: {
//         baseFare: 0,
//         mealIncluded: true,
//         baggageIncluded: '0 Kg',
//         seatSelectionFee: 0,
//         upgradeFromEconomy: 0,
//         upgradeFromBusiness: 0,
//       },
//     };
//   }

//   const fareOption = priceData.data.flights[0].fareOptions[0];
//   const economyBaseFare = fareOption.baseFare;
//   const economyBaggage = fareOption.baggage.checked;

//   // These values would typically come from a separate API or configuration
//   // For now, we'll use derived values based on the economy fare
//   const businessBaseFare = economyBaseFare * 2.5; // Example multiplier
//   const firstBaseFare = economyBaseFare * 4.5; // Example multiplier

//   return {
//     economy: {
//       baseFare: economyBaseFare,
//       mealIncluded: false,
//       baggageIncluded: economyBaggage,
//       seatSelectionFee: 300, // Default seat selection fee for economy
//     },
//     business: {
//       baseFare: businessBaseFare,
//       mealIncluded: true,
//       baggageIncluded: '30 Kg', // Default business baggage
//       seatSelectionFee: 0,
//       upgradeFromEconomy: businessBaseFare - economyBaseFare,
//     },
//     first: {
//       baseFare: firstBaseFare,
//       mealIncluded: true,
//       baggageIncluded: '40 Kg', // Default first class baggage
//       seatSelectionFee: 0,
//       upgradeFromEconomy: firstBaseFare - economyBaseFare,
//       upgradeFromBusiness: firstBaseFare - businessBaseFare,
//     },
//   };
// };

// // API Cache
// const cache = new Map<string, { data: any; timestamp: number }>();
// const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// /**
//  * Fetch meal pricing from session storage data
//  */
// export async function getMealPricing(
//   flightClass: 'economy' | 'business' | 'first' = 'economy',
// ): Promise<MealPricing[]> {
//   const cacheKey = `meals-${flightClass}`;
//   const cached = cache.get(cacheKey);

//   if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
//     return cached.data;
//   }

//   try {
//     const priceData = getPriceAvailabilityData();

//     if (!priceData?.data?.flights?.[0]?.fareOptions?.[0]?.meals) {
//       return [];
//     }

//     const fareOption = priceData.data.flights[0].fareOptions[0];
//     const mealsData = fareOption.meals || {};

//     // Collect all meals from all segments
//     const meals: MealPricing[] = [];

//     Object.entries(mealsData).forEach(([segmentId, segmentMeals]) => {
//       segmentMeals.forEach((meal, index) => {
//         // Business and first class may have meals included
//         const businessPrice = flightClass === 'business' ? 0 : meal.amount;
//         const firstClassPrice = flightClass === 'first' ? 0 : meal.amount;

//         meals.push({
//           id: `${segmentId}-${meal.code}-${index}`,
//           code: meal.code,
//           name: meal.desc,
//           category: determineMealCategory(meal.desc),
//           basePrice: meal.amount,
//           economyPrice: meal.amount,
//           businessPrice: businessPrice,
//           firstClassPrice: firstClassPrice,
//           currentPrice: flightClass === 'economy'
//             ? meal.amount
//             : flightClass === 'business'
//               ? businessPrice
//               : firstClassPrice,
//           description: meal.desc,
//           iswca: meal.iswca,
//         });
//       });
//     });

//     cache.set(cacheKey, { data: meals, timestamp: Date.now() });
//     return meals;
//   } catch (error) {
//     console.warn('Failed to process meal pricing:', error);
//     return [];
//   }
// }

// /**
//  * Fetch baggage pricing from session storage data
//  */
// export async function getBaggagePricing(
//   flightClass: 'economy' | 'business' | 'first' = 'economy',
// ): Promise<BaggagePricing[]> {
//   const cacheKey = `baggage-${flightClass}`;
//   const cached = cache.get(cacheKey);

//   if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
//     return cached.data;
//   }

//   try {
//     const priceData = getPriceAvailabilityData();

//     if (!priceData?.data?.flights?.[0]?.fareOptions?.[0]?.baggageOptions) {
//       return [];
//     }

//     const fareOption = priceData.data.flights[0].fareOptions[0];
//     const baggageOptionsData = fareOption.baggageOptions || {};

//     // Collect all baggage options from all segments
//     const baggage: BaggagePricing[] = [];

//     Object.entries(baggageOptionsData).forEach(([segmentId, segmentBaggage]) => {
//       segmentBaggage.forEach((bag, index) => {
//         // Business and first class may have some baggage included
//         const businessPrice = flightClass === 'business' && bag.amount > 0 ? bag.amount * 0.5 : bag.amount;
//         const firstClassPrice = flightClass === 'first' ? 0 : bag.amount;

//         baggage.push({
//           id: `${segmentId}-${bag.code}-${index}`,
//           code: bag.code,
//           weight: bag.desc,
//           weightKg: extractWeightKg(bag.desc),
//           economyPrice: bag.amount,
//           businessPrice: businessPrice,
//           firstClassPrice: firstClassPrice,
//           currentPrice: flightClass === 'economy'
//             ? bag.amount
//             : flightClass === 'business'
//               ? businessPrice
//               : firstClassPrice,
//           description: bag.desc,
//           iswca: bag.iswca,
//         });
//       });
//     });

//     cache.set(cacheKey, { data: baggage, timestamp: Date.now() });
//     return baggage;
//   } catch (error) {
//     console.warn('Failed to process baggage pricing:', error);
//     return [];
//   }
// }

// /**
//  * Fetch seat pricing from session storage or use defaults
//  * Note: Seat pricing typically comes from a separate API
//  */
// export async function getSeatPricing(
//   flightClass: 'economy' | 'business' | 'first' = 'economy',
// ): Promise<SeatPricing[]> {
//   const cacheKey = `seats-${flightClass}`;
//   const cached = cache.get(cacheKey);

//   if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
//     return cached.data;
//   }

//   try {
//     // In a real implementation, seat pricing would come from an API
//     // For now, we'll use sensible defaults based on flight class
//     const baseSeatPrice = flightClass === 'economy' ? 500 : flightClass === 'business' ? 200 : 0;

//     const seatPricing: SeatPricing[] = [
//       {
//         id: 'standard',
//         seatType: 'standard',
//         economyPrice: 0,
//         businessPrice: 0,
//         firstClassPrice: 0,
//         currentPrice: 0,
//         description: 'Standard seat selection',
//       },
//       {
//         id: 'extra-legroom',
//         seatType: 'extra-legroom',
//         economyPrice: baseSeatPrice * 1.6,
//         businessPrice: flightClass === 'business' ? 0 : baseSeatPrice * 0.8,
//         firstClassPrice: 0,
//         currentPrice: flightClass === 'economy'
//           ? baseSeatPrice * 1.6
//           : flightClass === 'business'
//             ? 0
//             : 0,
//         description: 'Extra legroom seats (Exit rows)',
//       },
//       {
//         id: 'window-preferred',
//         seatType: 'window',
//         economyPrice: baseSeatPrice * 0.6,
//         businessPrice: 0,
//         firstClassPrice: 0,
//         currentPrice: flightClass === 'economy' ? baseSeatPrice * 0.6 : 0,
//         description: 'Preferred window seat',
//       },
//       {
//         id: 'aisle-preferred',
//         seatType: 'aisle',
//         economyPrice: baseSeatPrice * 0.6,
//         businessPrice: 0,
//         firstClassPrice: 0,
//         currentPrice: flightClass === 'economy' ? baseSeatPrice * 0.6 : 0,
//         description: 'Preferred aisle seat',
//       },
//       {
//         id: 'premium',
//         seatType: 'premium',
//         economyPrice: baseSeatPrice * 3,
//         businessPrice: baseSeatPrice * 1.5,
//         firstClassPrice: 0,
//         currentPrice: flightClass === 'economy'
//           ? baseSeatPrice * 3
//           : flightClass === 'business'
//             ? baseSeatPrice * 1.5
//             : 0,
//         description: 'Premium seat with extra comfort',
//       },
//     ];

//     cache.set(cacheKey, { data: seatPricing, timestamp: Date.now() });
//     return seatPricing;
//   } catch (error) {
//     console.warn('Failed to process seat pricing:', error);
//     return [];
//   }
// }

// /**
//  * Get class pricing and upgrade costs
//  */
// export function getClassPricing(): ClassUpgradePricing {
//   return getBaseClassPricing();
// }

// /**
//  * Calculate total add-ons cost
//  */
// export async function calculateAddonsCost(
//   selectedMeals: string[],
//   selectedBaggage: string[],
//   seatType: string,
//   flightClass: 'economy' | 'business' | 'first',
// ): Promise<number> {
//   let total = 0;

//   // Get current pricing data
//   const meals = await getMealPricing(flightClass);
//   const baggage = await getBaggagePricing(flightClass);
//   const seats = await getSeatPricing(flightClass);

//   // Meal costs
//   selectedMeals.forEach((mealId) => {
//     const meal = meals.find((m) => m.id === mealId);
//     if (meal) {
//       total += meal.currentPrice;
//     }
//   });

//   // Baggage costs
//   selectedBaggage.forEach((bagId) => {
//     const bag = baggage.find((b) => b.id === bagId);
//     if (bag) {
//       total += bag.currentPrice;
//     }
//   });

//   // Seat costs
//   const seat = seats.find((s) => s.id === seatType);
//   if (seat) {
//     total += seat.currentPrice;
//   }

//   return total;
// }

// /**
//  * Get included baggage for a specific class
//  */
// export function getIncludedBaggage(flightClass: 'economy' | 'business' | 'first'): string {
//   const priceData = getPriceAvailabilityData();

//   if (!priceData?.data?.flights?.[0]?.fareOptions?.[0]?.baggage) {
//     return flightClass === 'economy' ? '15 Kg' : flightClass === 'business' ? '30 Kg' : '40 Kg';
//   }

//   const fareOption = priceData.data.flights[0].fareOptions[0];
//   return fareOption.baggage.checked;
// }

// /**
//  * Check if meals are included in the class
//  */
// export function areMealsIncluded(flightClass: 'economy' | 'business' | 'first'): boolean {
//   return flightClass !== 'economy';
// }

// /**
//  * Get flight details from session storage
//  */
// export function getFlightDetails() {
//   const priceData = getPriceAvailabilityData();
//   return priceData?.data?.flights?.[0] || null;
// }

// /**
//  * Get booking reference
//  */
// export function getBookingReference(): string | null {
//   const priceData = getPriceAvailabilityData();
//   return priceData?.data?.bookingId || null;
// }

// export type {
//   MealPricing,
//   BaggagePricing,
//   SeatPricing,
//   ClassUpgradePricing,
//   PriceAvailabilityResponse
// };
