import axios from "axios";
import tripjackConfig from "../config/tripjack.config";
import { TRIPJACK_URLS } from "../config";
import TripjackFieldMapper from "../utils/mappers/tripjackField.mapper";
import { ReviewService } from "./review.service";

class SeatService {

    async getSeats(bookingId: string) {
        const env = tripjackConfig.ENV;
        const config = TRIPJACK_URLS[env];
        const url = `${config.BASE_URL}${config.SEAT}`;

        try {
            const response = await axios.post(
                url,
                { bookingId },
                {
                    headers: {
                        "Content-Type": "application/json",
                        apikey: tripjackConfig.API_KEY,
                    },
                    // timeout: 15000,
                }
            );
            

            const rawData = response.data;

            // Capture prices off the RAW response, before field mapping renames
            // anything — this is the only point a seat price is quoted, and the
            // booking step has to charge from it rather than from the client.
            await ReviewService.cacheSeatPrices(bookingId, rawData);

            const mappedData = TripjackFieldMapper.map(rawData);

            return {
                data: mappedData
            };

        } catch (error: any) {
            console.error("Seat Service ERROR >>>", {
                status: error.response?.status,
                data: JSON.stringify(error.response?.data, null, 2),
                message: error.message
            });

            throw error;
        }
    }
}

export default new SeatService();