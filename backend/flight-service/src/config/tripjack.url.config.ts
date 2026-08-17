import { envConfig } from "./env.config";

type Environment = "TEST" | "PROD";

export interface TripjackUrls {
    TEST: {
        BASE_URL: string;
        SEARCH: string;
        FARE_RULE: string;
        REVIEW: string;
        BOOK: string;
        FARE_VALIDATE: string;
        CONFIRM_BOOK: string;
        BOOKING_DETAILS: string;
        RELEASE_PNR: string;
        SEAT: string;
        AMENDMENT_CHARGES: string;
        SUBMIT_AMENDMENT: string;
        AMENDMENT_DETAILS: string;
        USER_DETAIL: string;
        FETCH_SSR: string;
        FETCH_SEAT: string;
        ADD_SSR: string;
        REISSUE_QUERY_LIST: string;
        REISSUE_SEARCH: string;
        REISSUE_REVIEW: string;
        AUTO_REISSUE: string;
    };
    PROD: {
        BASE_URL: string;
        SEARCH: string;
        FARE_RULE: string;
        REVIEW: string;
        BOOK: string;
        FARE_VALIDATE: string;
        CONFIRM_BOOK: string;
        BOOKING_DETAILS: string;
        RELEASE_PNR: string;
        SEAT: string;
        AMENDMENT_CHARGES: string;
        SUBMIT_AMENDMENT: string;
        AMENDMENT_DETAILS: string;
        USER_DETAIL: string;
        FETCH_SSR: string;
        FETCH_SEAT: string;
        ADD_SSR: string;
        REISSUE_QUERY_LIST: string;
        REISSUE_SEARCH: string;
        REISSUE_REVIEW: string;
        AUTO_REISSUE: string;
    };
}

export const TRIPJACK_URLS: TripjackUrls = {
    TEST: {
        BASE_URL: envConfig.TRIPJACK_TEST.BASE_URL,
        SEARCH: "/fms/v1/air-search-all",
        FARE_RULE: "/fms/v2/farerule",
        REVIEW: "/fms/v1/review",
        BOOK: "/oms/v1/air/book",
        FARE_VALIDATE: "/oms/v1/air/fare-validate",
        CONFIRM_BOOK: "/oms/v1/air/confirm-book",
        BOOKING_DETAILS: "/oms/v1/booking-details",
        RELEASE_PNR: "/oms/v1/air/unhold",
        SEAT: "/fms/v1/seat",
        AMENDMENT_CHARGES: "/oms/v1/air/amendment/amendment-charges",
        SUBMIT_AMENDMENT: "/oms/v1/air/amendment/submit-amendment",
        AMENDMENT_DETAILS: "/oms/v1/air/amendment/amendment-details",
        USER_DETAIL: "/ums/v1/user-detail",
        // Post-booking ancillaries: fetch catalogue, fetch seat map, then add.
        FETCH_SSR: "/fms/v1/ancillaries/fetch/ssr",
        FETCH_SEAT: "/fms/v1/ancillaries/fetch/seat",
        ADD_SSR: "/oms/v1/air/amendment/add/ssr",
        // Auto Reissue: query-list -> search -> review -> book.
        REISSUE_QUERY_LIST: "/fms/v1/reissue/poll/searchquery-list",
        REISSUE_SEARCH: "/fms/v1/reissue/poll/search",
        REISSUE_REVIEW: "/fms/v1/reissue/review",
        AUTO_REISSUE: "/oms/v1/air/amendment/auto-reissue",
    },
    PROD: {
        BASE_URL: envConfig.TRIPJACK_PROD.BASE_URL,
        SEARCH: "/fms/v1/air-search-all",
        FARE_RULE: "/fms/v2/farerule",
        REVIEW: "/fms/v1/review",
        BOOK: "/oms/v1/air/book",
        FARE_VALIDATE: "/oms/v1/air/fare-validate",
        CONFIRM_BOOK: "/oms/v1/air/confirm-book",
        BOOKING_DETAILS: "/oms/v1/booking-details",
        RELEASE_PNR: "/oms/v1/air/unhold",
        SEAT: "/fms/v1/seat",
        AMENDMENT_CHARGES: "/oms/v1/air/amendment/amendment-charges",
        SUBMIT_AMENDMENT: "/oms/v1/air/amendment/submit-amendment",
        AMENDMENT_DETAILS: "/oms/v1/air/amendment/amendment-details",
        USER_DETAIL: "/ums/v1/user-detail",
        // Post-booking ancillaries: fetch catalogue, fetch seat map, then add.
        FETCH_SSR: "/fms/v1/ancillaries/fetch/ssr",
        FETCH_SEAT: "/fms/v1/ancillaries/fetch/seat",
        ADD_SSR: "/oms/v1/air/amendment/add/ssr",
        // Auto Reissue: query-list -> search -> review -> book.
        REISSUE_QUERY_LIST: "/fms/v1/reissue/poll/searchquery-list",
        REISSUE_SEARCH: "/fms/v1/reissue/poll/search",
        REISSUE_REVIEW: "/fms/v1/reissue/review",
        AUTO_REISSUE: "/oms/v1/air/amendment/auto-reissue",
    },
};