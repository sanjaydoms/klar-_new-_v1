import axios from "axios";
import { observe } from "./observe";
import { env } from "../config/env";

export const rateGainClient = observe(axios.create({
  baseURL: env.rateGain.baseUrl,
  timeout: 30000,
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
    ApiKey: env.rateGain.apiKey,
    ApiSecret: env.rateGain.apiSecret,
  },
}), "RG");
