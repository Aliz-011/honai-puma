import { AppType } from "@/app/api/[[...route]]/route";
import { hc } from "hono/client";

const APP_URL = "http://localhost:3000";
export const client = hc<AppType>(APP_URL);
