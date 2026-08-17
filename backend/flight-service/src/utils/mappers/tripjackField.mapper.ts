import { TRIPJACK_FIELD_MAP } from "../../constants/tripjackFields";
import { mapFields } from "./fieldMapper.core";

type AnyObject = { [key: string]: any };

/**
 * Search / review / fare-rule / seat responses. No booking-level names here, so
 * `fN` means flight number throughout — but `id` still shifts meaning between
 * `sI` (segment) and `totalPriceList` (priceId), which mapFields disambiguates.
 */
class TripjackFieldMapper {

    /**
     * Sanitizes Tripjack's custom text formatting tags into readable alternatives.
     */
    private static sanitizePolicyText(value: any): any {
        if (typeof value !== "string") return value;

        // Check if the string contains Tripjack's custom formatting flags
        if (value.includes("__nls__") || value.includes("__bs__") || value.includes("__be__")) {
            return value
                .replace(/__nls__/g, "\n")      // Converts to a standard newline character
                .replace(/__bs__/g, " ")        // Removes bold start marker
                .replace(/__be__/g, ": ");      // Cleans up bold end marker cleanly
        }

        return value;
    }

    private static sanitize(data: any): any {
        if (Array.isArray(data)) return data.map((item) => this.sanitize(item));

        if (data !== null && typeof data === "object") {
            return Object.keys(data).reduce((acc: AnyObject, key: string) => {
                acc[key] =
                    key === "policyInfo"
                        ? this.sanitizePolicyText(data[key])
                        : this.sanitize(data[key]);
                return acc;
            }, {});
        }

        return data;
    }

    static map(data: any): any {
        // Sanitize first on the raw keys, then rename — `policyInfo` is not
        // renamed by any map, so the order only matters for readability.
        return mapFields(this.sanitize(data), [TRIPJACK_FIELD_MAP]);
    }
}

export default TripjackFieldMapper;
