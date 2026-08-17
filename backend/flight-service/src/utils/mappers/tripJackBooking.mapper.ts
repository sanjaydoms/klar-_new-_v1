import {
    TRIPJACK_FIELD_MAP,
    BOOKING_LEVEL_FIELD_MAP
} from "../../constants/tripjackFields";
import { mapFields } from "./fieldMapper.core";

/**
 * Booking-level responses (booking-details). Booking names win over trip names
 * where the same short key exists in both — `fN` is a first name on a traveller —
 * and mapFields resolves the cases where that answer depends on the parent.
 */
export class TripjackFieldMapper {

    static map(data: any): any {
        return mapFields(data, [BOOKING_LEVEL_FIELD_MAP, TRIPJACK_FIELD_MAP]);
    }
}
