import { Hono } from "hono";
import { handle } from "hono/vercel";
import { HTTPException } from "hono/http-exception";

import revenueGross from "@/modules/revenue-gross/api/route";
import revenueByu from "@/modules/revenue-byu/api/route"
import areas from "@/modules/areas/api/route"
import revenueNewSales from "@/modules/revenue-new-sales/api/route"
import revenueCVM from '@/modules/revenue-cvm/api/route'
import revenueSA from '@/modules/revenue-sa/api/route'
import payingSubs from "@/modules/paying-subs/api/route"

const app = new Hono().basePath("/api");

app.onError((err, c) => {
  if (err instanceof HTTPException) {
    return err.getResponse()
  }

  return c.json({ error: err.message }, 500)
})

const routes = app
  .route("/revenue-grosses", revenueGross)
  .route('/areas', areas)
  .route('/revenue-byu', revenueByu)
  .route('/revenue-new-sales', revenueNewSales)
  .route('/revenue-cvm', revenueCVM)
  .route('/revenue-sa', revenueSA)
  .route('/paying-subs', payingSubs)

export const GET = handle(app);
export type AppType = typeof routes;
