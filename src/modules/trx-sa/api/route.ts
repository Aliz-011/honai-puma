import { Hono } from "hono";
import { z } from 'zod'
import { and, asc, between, eq, isNotNull, sql } from "drizzle-orm";
import { subMonths, subDays, format, subYears, endOfMonth } from 'date-fns'

import { db, db3 } from "@/db";
import {
    branches,
    regionals,
    clusters,
    kabupatens,
    subbranches,
    revenueByu,
} from "@/db/schema";
import { zValidator } from "@/lib/validator-wrapper";

const app = new Hono()
    .get('/trx-sa', zValidator('query', z.object({ date: z.coerce.date().optional() })),
        async c => {
            const { date } = c.req.valid('query')
        })