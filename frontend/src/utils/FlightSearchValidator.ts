export interface ValidationError {
  field: string;
  message: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
}

interface MultiCitySegment {
  id: string;
  from: string;
  to: string;
  date: string;
}

interface ValidationParams {
  tripType: 'oneway' | 'return' | 'multicity';
  from: string;
  to: string;
  departureDate: string;
  returnDate: string;
  multiCitySegments?: MultiCitySegment[] | undefined; // Added | undefined explicitly
  adults: number;
  children: number;
  infants: number;
  today: string;
}

export class FlightSearchValidator {
  static validate(params: ValidationParams): ValidationResult {
    const errors: ValidationError[] = [];

    if (params.tripType === 'multicity') {
      errors.push(...this.validateMultiCity(params.multiCitySegments || [], params.today));
    } else {
      errors.push(...this.validateOneWayReturn(params));
    }

    errors.push(...this.validateTravelers(params.adults, params.children, params.infants));

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  private static validateOneWayReturn(params: ValidationParams): ValidationError[] {
    const errors: ValidationError[] = [];

    if (!params.from.trim()) {
      errors.push({ field: 'from', message: 'Please select departure city' });
    } else if (!this.isValidLocation(params.from)) {
      errors.push({ field: 'from', message: 'Please select a valid airport or city' });
    }

    if (!params.to.trim()) {
      errors.push({ field: 'to', message: 'Please select arrival city' });
    } else if (!this.isValidLocation(params.to)) {
      errors.push({ field: 'to', message: 'Please select a valid airport or city' });
    }

    if (params.from && params.to && this.extractCode(params.from) === this.extractCode(params.to)) {
      errors.push({ field: 'to', message: 'Departure and arrival cities cannot be the same' });
    }

    if (!params.departureDate) {
      errors.push({
        field: 'departureDate',
        message: 'Please select departure date@@@@@@@@@@@@@@',
      });
    } else if (params.departureDate < params.today) {
      errors.push({ field: 'departureDate', message: 'Departure date cannot be in the past' });
    }

    if (params.tripType === 'return') {
      if (!params.returnDate) {
        errors.push({ field: 'returnDate', message: 'Please select return date' });
      } else if (params.returnDate < params.departureDate) {
        errors.push({ field: 'returnDate', message: 'Return date must be after departure date' });
      }
    }

    return errors;
  }

  private static validateMultiCity(segments: MultiCitySegment[], today: string): ValidationError[] {
    const errors: ValidationError[] = [];

    if (segments.length < 2) {
      errors.push({
        field: 'multiCity',
        message: 'At least 2 segments are required for multi-city trip',
      });
    }

    segments.forEach((segment, index) => {
      if (!segment.from.trim()) {
        errors.push({
          field: `segment_${index}_from`,
          message: `Please select departure city for segment ${index + 1}`,
        });
      } else if (!this.isValidLocation(segment.from)) {
        errors.push({
          field: `segment_${index}_from`,
          message: `Please select a valid airport for segment ${index + 1}`,
        });
      }

      if (!segment.to.trim()) {
        errors.push({
          field: `segment_${index}_to`,
          message: `Please select arrival city for segment ${index + 1}`,
        });
      } else if (!this.isValidLocation(segment.to)) {
        errors.push({
          field: `segment_${index}_to`,
          message: `Please select a valid airport for segment ${index + 1}`,
        });
      }

      if (
        segment.from &&
        segment.to &&
        this.extractCode(segment.from) === this.extractCode(segment.to)
      ) {
        errors.push({
          field: `segment_${index}_to`,
          message: `Departure and arrival cities cannot be the same in segment ${index + 1}`,
        });
      }

      if (!segment.date) {
        errors.push({
          field: `segment_${index}_date`,
          message: `Please select date for segment ${index + 1}`,
        });
      } else if (segment.date < today) {
        errors.push({
          field: `segment_${index}_date`,
          message: `Date cannot be in the past for segment ${index + 1}`,
        });
      }

      if (index > 0) {
        const previousSegment = segments[index - 1];
        if (previousSegment && previousSegment.date && segment.date < previousSegment.date) {
          errors.push({
            field: `segment_${index}_date`,
            message: `Segment ${index + 1} date must be after segment ${index} date`,
          });
        }
      }
    });

    return errors;
  }

  private static validateTravelers(
    adults: number,
    children: number,
    infants: number,
  ): ValidationError[] {
    const errors: ValidationError[] = [];

    if (adults < 1) {
      errors.push({ field: 'travelers', message: 'At least 1 adult is required' });
    }

    if (infants > adults) {
      errors.push({
        field: 'travelers',
        message: 'Number of infants cannot exceed number of adults',
      });
    }

    const total = adults + children + infants;
    if (total > 9) {
      errors.push({ field: 'travelers', message: 'Maximum 9 travelers allowed' });
    }

    return errors;
  }

  private static extractCode(location: string): string {
    const match = location.match(/\(([A-Z]{3})\)/);
    if (match && match[1]) {
      return match[1];
    }
    return location.trim();
  }

  private static isValidLocation(location: string): boolean {
    const trimmed = location.trim();
    if (trimmed.length === 0) return false;

    // Every legitimate selection path writes "City (CODE), Country" — free
    // text without a code reached the backend as-is and produced a 500.
    return !!location.match(/\([A-Z]{3}\)/);
  }
}
