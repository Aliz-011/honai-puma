import { Hono } from "hono";
import { z } from 'zod'
import { and, asc, between, eq, gte, lte, not, sql } from "drizzle-orm";
import { index } from 'drizzle-orm/mysql-core'
import { MySqlRawQueryResult } from "drizzle-orm/mysql2";
import { subMonths, subDays, format, subYears, endOfMonth, startOfMonth } from 'date-fns'

import { db, db4 } from "@/db";
import {
    branches,
    regionals,
    clusters,
    kabupatens,
    subbranches,
    revenueNewSales,
    revenueNewSalesPrabayar,
} from "@/db/schema";
import { zValidator } from "@/lib/validator-wrapper";
import { dynamicMergeNewSalesPumaTable } from "@/db/schema4";

const app = new Hono()
    .get("/",
        zValidator('query', z.object({ date: z.string().optional() })),
        async (c) => {
            const { date } = c.req.valid('query')
            const selectedDate = date ? new Date(date) : new Date()
            const month = (subDays(selectedDate, 2).getMonth() + 1).toString()

            // KOLOM DINAMIS UNTUK MEMILIH ANTARA KOLOM `m1-m12`
            const monthColumn = `m${month}` as keyof typeof revenueNewSales.$inferSelect

            // VARIABLE TANGGAL UNTUK IMPORT TABEL SECARA DINAMIS
            const latestDataDate = subDays(selectedDate, 2);

            const currMonth = format(selectedDate, 'MM')
            const currYear = format(selectedDate, 'yyyy')
            const latestMonth = parseInt(format(selectedDate, 'M'), 10)
            const isPrevMonthLastYear = currMonth === '01'
            const prevMonth = isPrevMonthLastYear ? '12' : format(subMonths(selectedDate, 1), 'MM')
            const prevMonthYear = isPrevMonthLastYear ? format(subYears(selectedDate, 1), 'yyyy') : format(selectedDate, 'yyyy')
            const prevYear = format(subYears(selectedDate, 1), 'yyyy')

            // TABEL `merge_new_sales_puma_`
            const currRevNewSales = dynamicMergeNewSalesPumaTable(currYear, currMonth)
            const prevMonthRevNewSales = dynamicMergeNewSalesPumaTable(prevMonthYear, prevMonth)
            const prevYearCurrMonthRevNewSales = dynamicMergeNewSalesPumaTable(prevYear, currMonth)
            const currYtdRevNewSales = [];
            for (let month = 1; month <= latestMonth; month++) {
                const monthStr = month.toString().padStart(2, '0')
                currYtdRevNewSales.push(`merge_new_sales_puma_${currYear}${monthStr}`)
            }
            const prevYtdRevNewSales = [];
            for (let month = 1; month <= latestMonth; month++) {
                const monthStr = month.toString().padStart(2, '0')
                prevYtdRevNewSales.push(`merge_new_sales_puma_${prevYear}${monthStr}`)
            }

            // VARIABLE TANGGAL
            // Get the last day of the selected month
            const lastDayOfSelectedMonth = endOfMonth(selectedDate);
            const isEndOfMonth = selectedDate.getDate() === lastDayOfSelectedMonth.getDate();

            const endOfCurrMonth = isEndOfMonth ? lastDayOfSelectedMonth : selectedDate;
            const endOfPrevMonth = isEndOfMonth ? endOfMonth(subMonths(selectedDate, 1)) : subMonths(selectedDate, 1);
            const endOfPrevYearSameMonth = isEndOfMonth ? endOfMonth(subYears(selectedDate, 1)) : subYears(selectedDate, 1);

            // get the first day and last day of the selected month dynamically
            const firstDayOfCurrMonth = format(startOfMonth(selectedDate), 'yyyy-MM-dd')
            const firstDayOfPrevMonth = format(startOfMonth(subMonths(selectedDate, 1)), 'yyyy-MM-dd')
            const firstDayOfPrevYearCurrMonth = format(startOfMonth(subYears(selectedDate, 1)), 'yyyy-MM-dd')

            const currDate = format(endOfCurrMonth, 'yyyy-MM-dd');
            const prevDate = format(endOfPrevMonth, 'yyyy-MM-dd');
            const prevYearCurrDate = format(endOfPrevYearSameMonth, 'yyyy-MM-dd');

            const queryCurrYtd = currYtdRevNewSales.map(table => `
                SELECT
                    region_sales as region,
                    CASE
                        WHEN upper(kabupaten) IN (
                            'AMBON',
                            'KOTA AMBON',
                            'MALUKU TENGAH',
                            'SERAM BAGIAN TIMUR',
                            'KEPULAUAN ARU',
                            'KOTA TUAL',
                            'MALUKU BARAT DAYA',
                            'MALUKU TENGGARA',
                            'MALUKU TENGGARA BARAT',
                            'BURU',
                            'BURU SELATAN',
                            'SERAM BAGIAN BARAT',
                            'KEPULAUAN TANIMBAR'
                        ) THEN 'AMBON'
                        WHEN upper(kabupaten) IN (
                            'KOTA JAYAPURA',
                            'JAYAPURA',
                            'KEEROM',
                            'MAMBERAMO RAYA',
                            'SARMI',
                            'BIAK',
                            'BIAK NUMFOR',
                            'KEPULAUAN YAPEN',
                            'SUPIORI',
                            'WAROPEN',
                            'JAYAWIJAYA',
                            'LANNY JAYA',
                            'MAMBERAMO TENGAH',
                            'NDUGA',
                            'PEGUNUNGAN BINTANG',
                            'TOLIKARA',
                            'YAHUKIMO',
                            'YALIMO'
                        ) THEN 'JAYAPURA'
                        WHEN upper(kabupaten) IN (
                            'MANOKWARI',
                            'FAKFAK',
                            'FAK FAK',
                            'KAIMANA',
                            'MANOKWARI SELATAN',
                            'PEGUNUNGAN ARFAK',
                            'TELUK BINTUNI',
                            'TELUK WONDAMA',
                            'KOTA SORONG',
                            'MAYBRAT',
                            'RAJA AMPAT',
                            'SORONG',
                            'SORONG SELATAN',
                            'TAMBRAUW'
                        ) THEN 'SORONG'
                        WHEN upper(kabupaten) IN (
                            'ASMAT',
                            'BOVEN DIGOEL',
                            'MAPPI',
                            'MERAUKE',
                            'INTAN JAYA',
                            'MIMIKA',
                            'PUNCAK',
                            'PUNCAK JAYA',
                            'TIMIKA',
                            'DEIYAI',
                            'DOGIYAI',
                            'NABIRE',
                            'PANIAI'
                        ) THEN 'TIMIKA'
                        ELSE NULL
                    END as branch,
                    CASE
                        WHEN upper(kabupaten) IN (
                            'AMBON',
                            'KOTA AMBON',
                            'MALUKU TENGAH',
                            'SERAM BAGIAN TIMUR'
                        ) THEN 'AMBON'
                        WHEN upper(kabupaten) IN (
                            'KEPULAUAN ARU',
                            'KOTA TUAL',
                            'MALUKU BARAT DAYA',
                            'MALUKU TENGGARA',
                            'MALUKU TENGGARA BARAT',
                            'KEPULAUAN TANIMBAR'
                        ) THEN 'KEPULAUAN AMBON'
                        WHEN upper(kabupaten) IN ('BURU', 'BURU SELATAN', 'SERAM BAGIAN BARAT') THEN 'SERAM BURU'
                        WHEN upper(kabupaten) IN ('KOTA JAYAPURA') THEN 'JAYAPURA'
                        WHEN upper(kabupaten) IN (
                            'JAYAPURA',
                            'KEEROM',
                            'MAMBERAMO RAYA',
                            'SARMI',
                            'BIAK',
                            'BIAK NUMFOR',
                            'KEPULAUAN YAPEN',
                            'SUPIORI',
                            'WAROPEN',
                            'JAYAWIJAYA',
                            'LANNY JAYA',
                            'MAMBERAMO TENGAH',
                            'NDUGA',
                            'PEGUNUNGAN BINTANG',
                            'TOLIKARA',
                            'YAHUKIMO',
                            'YALIMO'
                        ) THEN 'SENTANI'
                        WHEN upper(kabupaten) IN ('MANOKWARI') THEN 'MANOKWARI'
                        WHEN upper(kabupaten) IN (
                            'FAKFAK',
                            'FAK FAK',
                            'KAIMANA',
                            'MANOKWARI SELATAN',
                            'PEGUNUNGAN ARFAK',
                            'TELUK BINTUNI',
                            'TELUK WONDAMA'
                        ) THEN 'MANOKWARI OUTER'
                        WHEN upper(kabupaten) IN (
                            'KOTA SORONG',
                            'MAYBRAT',
                            'RAJA AMPAT',
                            'SORONG',
                            'SORONG SELATAN',
                            'TAMBRAUW'
                        ) THEN 'SORONG RAJA AMPAT'
                        WHEN upper(kabupaten) IN ('ASMAT', 'BOVEN DIGOEL', 'MAPPI', 'MERAUKE') THEN 'MERAUKE'
                        WHEN upper(kabupaten) IN (
                            'INTAN JAYA',
                            'MIMIKA',
                            'PUNCAK',
                            'PUNCAK JAYA',
                            'TIMIKA'
                        ) THEN 'MIMIKA'
                        WHEN upper(kabupaten) IN ('DEIYAI', 'DOGIYAI', 'NABIRE', 'PANIAI') THEN 'NABIRE'
                        ELSE NULL
                    END as subbranch,
                    CASE
                        WHEN upper(kabupaten) IN (
                            'AMBON',
                            'KOTA AMBON',
                            'MALUKU TENGAH',
                            'SERAM BAGIAN TIMUR'
                        ) THEN 'AMBON'
                        WHEN upper(kabupaten) IN (
                            'KEPULAUAN ARU',
                            'KOTA TUAL',
                            'MALUKU BARAT DAYA',
                            'MALUKU TENGGARA',
                            'MALUKU TENGGARA BARAT',
                            'KEPULAUAN TANIMBAR'
                        ) THEN 'KEPULAUAN TUAL'
                        WHEN upper(kabupaten) IN ('BURU', 'BURU SELATAN', 'SERAM BAGIAN BARAT') THEN 'SERAM BARAT BURU'
                        WHEN upper(kabupaten) IN ('KOTA JAYAPURA') THEN 'KOTA JAYAPURA'
                        WHEN upper(kabupaten) IN ('JAYAPURA', 'KEEROM', 'MAMBERAMO RAYA', 'SARMI') THEN 'JAYAPURA OUTER'
                        WHEN upper(kabupaten) IN (
                            'BIAK',
                            'BIAK NUMFOR',
                            'KEPULAUAN YAPEN',
                            'SUPIORI',
                            'WAROPEN'
                        ) THEN 'NEW BIAK NUMFOR'
                        WHEN upper(kabupaten) IN (
                            'JAYAWIJAYA',
                            'LANNY JAYA',
                            'MAMBERAMO TENGAH',
                            'NDUGA',
                            'PEGUNUNGAN BINTANG',
                            'TOLIKARA',
                            'YAHUKIMO',
                            'YALIMO'
                        ) THEN 'PAPUA PEGUNUNGAN'
                        WHEN upper(kabupaten) IN ('MANOKWARI') THEN 'MANOKWARI'
                        WHEN upper(kabupaten) IN (
                            'FAKFAK',
                            'FAK FAK',
                            'KAIMANA',
                            'MANOKWARI SELATAN',
                            'PEGUNUNGAN ARFAK',
                            'TELUK BINTUNI',
                            'TELUK WONDAMA'
                        ) THEN 'MANOKWARI OUTER'
                        WHEN upper(kabupaten) IN (
                            'KOTA SORONG',
                            'MAYBRAT',
                            'RAJA AMPAT',
                            'SORONG',
                            'SORONG SELATAN',
                            'TAMBRAUW'
                        ) THEN 'NEW SORONG RAJA AMPAT'
                        WHEN upper(kabupaten) IN (
                            'INTAN JAYA',
                            'MIMIKA',
                            'PUNCAK',
                            'PUNCAK JAYA',
                            'TIMIKA'
                        ) THEN 'MIMIKA PUNCAK'
                        WHEN upper(kabupaten) IN ('DEIYAI', 'DOGIYAI', 'NABIRE', 'PANIAI') THEN 'NABIRE'
                        WHEN upper(kabupaten) IN ('ASMAT', 'BOVEN DIGOEL', 'MAPPI', 'MERAUKE') THEN 'NEW MERAUKE'
                        ELSE NULL
                    END as cluster,
                    kabupaten,
                    rev
                FROM ${table}`).join(' UNION ALL ')

            const queryPrevYtd = prevYtdRevNewSales.map(table => `
                SELECT
                    region_sales as region,
                    CASE
                        WHEN upper(kabupaten) IN (
                            'AMBON',
                            'KOTA AMBON',
                            'MALUKU TENGAH',
                            'SERAM BAGIAN TIMUR',
                            'KEPULAUAN ARU',
                            'KOTA TUAL',
                            'MALUKU BARAT DAYA',
                            'MALUKU TENGGARA',
                            'MALUKU TENGGARA BARAT',
                            'BURU',
                            'BURU SELATAN',
                            'SERAM BAGIAN BARAT',
                            'KEPULAUAN TANIMBAR'
                        ) THEN 'AMBON'
                        WHEN upper(kabupaten) IN (
                            'KOTA JAYAPURA',
                            'JAYAPURA',
                            'KEEROM',
                            'MAMBERAMO RAYA',
                            'SARMI',
                            'BIAK',
                            'BIAK NUMFOR',
                            'KEPULAUAN YAPEN',
                            'SUPIORI',
                            'WAROPEN',
                            'JAYAWIJAYA',
                            'LANNY JAYA',
                            'MAMBERAMO TENGAH',
                            'NDUGA',
                            'PEGUNUNGAN BINTANG',
                            'TOLIKARA',
                            'YAHUKIMO',
                            'YALIMO'
                        ) THEN 'JAYAPURA'
                        WHEN upper(kabupaten) IN (
                            'MANOKWARI',
                            'FAKFAK',
                            'FAK FAK',
                            'KAIMANA',
                            'MANOKWARI SELATAN',
                            'PEGUNUNGAN ARFAK',
                            'TELUK BINTUNI',
                            'TELUK WONDAMA',
                            'KOTA SORONG',
                            'MAYBRAT',
                            'RAJA AMPAT',
                            'SORONG',
                            'SORONG SELATAN',
                            'TAMBRAUW'
                        ) THEN 'SORONG'
                        WHEN upper(kabupaten) IN (
                            'ASMAT',
                            'BOVEN DIGOEL',
                            'MAPPI',
                            'MERAUKE',
                            'INTAN JAYA',
                            'MIMIKA',
                            'PUNCAK',
                            'PUNCAK JAYA',
                            'TIMIKA',
                            'DEIYAI',
                            'DOGIYAI',
                            'NABIRE',
                            'PANIAI'
                        ) THEN 'TIMIKA'
                        ELSE NULL
                    END as branch,
                    CASE
                        WHEN upper(kabupaten) IN (
                            'AMBON',
                            'KOTA AMBON',
                            'MALUKU TENGAH',
                            'SERAM BAGIAN TIMUR'
                        ) THEN 'AMBON'
                        WHEN upper(kabupaten) IN (
                            'KEPULAUAN ARU',
                            'KOTA TUAL',
                            'MALUKU BARAT DAYA',
                            'MALUKU TENGGARA',
                            'MALUKU TENGGARA BARAT',
                            'KEPULAUAN TANIMBAR'
                        ) THEN 'KEPULAUAN AMBON'
                        WHEN upper(kabupaten) IN ('BURU', 'BURU SELATAN', 'SERAM BAGIAN BARAT') THEN 'SERAM BURU'
                        WHEN upper(kabupaten) IN ('KOTA JAYAPURA') THEN 'JAYAPURA'
                        WHEN upper(kabupaten) IN (
                            'JAYAPURA',
                            'KEEROM',
                            'MAMBERAMO RAYA',
                            'SARMI',
                            'BIAK',
                            'BIAK NUMFOR',
                            'KEPULAUAN YAPEN',
                            'SUPIORI',
                            'WAROPEN',
                            'JAYAWIJAYA',
                            'LANNY JAYA',
                            'MAMBERAMO TENGAH',
                            'NDUGA',
                            'PEGUNUNGAN BINTANG',
                            'TOLIKARA',
                            'YAHUKIMO',
                            'YALIMO'
                        ) THEN 'SENTANI'
                        WHEN upper(kabupaten) IN ('MANOKWARI') THEN 'MANOKWARI'
                        WHEN upper(kabupaten) IN (
                            'FAKFAK',
                            'FAK FAK',
                            'KAIMANA',
                            'MANOKWARI SELATAN',
                            'PEGUNUNGAN ARFAK',
                            'TELUK BINTUNI',
                            'TELUK WONDAMA'
                        ) THEN 'MANOKWARI OUTER'
                        WHEN upper(kabupaten) IN (
                            'KOTA SORONG',
                            'MAYBRAT',
                            'RAJA AMPAT',
                            'SORONG',
                            'SORONG SELATAN',
                            'TAMBRAUW'
                        ) THEN 'SORONG RAJA AMPAT'
                        WHEN upper(kabupaten) IN ('ASMAT', 'BOVEN DIGOEL', 'MAPPI', 'MERAUKE') THEN 'MERAUKE'
                        WHEN upper(kabupaten) IN (
                            'INTAN JAYA',
                            'MIMIKA',
                            'PUNCAK',
                            'PUNCAK JAYA',
                            'TIMIKA'
                        ) THEN 'MIMIKA'
                        WHEN upper(kabupaten) IN ('DEIYAI', 'DOGIYAI', 'NABIRE', 'PANIAI') THEN 'NABIRE'
                        ELSE NULL
                    END as subbranch,
                    CASE
                        WHEN upper(kabupaten) IN (
                            'AMBON',
                            'KOTA AMBON',
                            'MALUKU TENGAH',
                            'SERAM BAGIAN TIMUR'
                        ) THEN 'AMBON'
                        WHEN upper(kabupaten) IN (
                            'KEPULAUAN ARU',
                            'KOTA TUAL',
                            'MALUKU BARAT DAYA',
                            'MALUKU TENGGARA',
                            'MALUKU TENGGARA BARAT',
                            'KEPULAUAN TANIMBAR'
                        ) THEN 'KEPULAUAN TUAL'
                        WHEN upper(kabupaten) IN ('BURU', 'BURU SELATAN', 'SERAM BAGIAN BARAT') THEN 'SERAM BARAT BURU'
                        WHEN upper(kabupaten) IN ('KOTA JAYAPURA') THEN 'KOTA JAYAPURA'
                        WHEN upper(kabupaten) IN ('JAYAPURA', 'KEEROM', 'MAMBERAMO RAYA', 'SARMI') THEN 'JAYAPURA OUTER'
                        WHEN upper(kabupaten) IN (
                            'BIAK',
                            'BIAK NUMFOR',
                            'KEPULAUAN YAPEN',
                            'SUPIORI',
                            'WAROPEN'
                        ) THEN 'NEW BIAK NUMFOR'
                        WHEN upper(kabupaten) IN (
                            'JAYAWIJAYA',
                            'LANNY JAYA',
                            'MAMBERAMO TENGAH',
                            'NDUGA',
                            'PEGUNUNGAN BINTANG',
                            'TOLIKARA',
                            'YAHUKIMO',
                            'YALIMO'
                        ) THEN 'PAPUA PEGUNUNGAN'
                        WHEN upper(kabupaten) IN ('MANOKWARI') THEN 'MANOKWARI'
                        WHEN upper(kabupaten) IN (
                            'FAKFAK',
                            'FAK FAK',
                            'KAIMANA',
                            'MANOKWARI SELATAN',
                            'PEGUNUNGAN ARFAK',
                            'TELUK BINTUNI',
                            'TELUK WONDAMA'
                        ) THEN 'MANOKWARI OUTER'
                        WHEN upper(kabupaten) IN (
                            'KOTA SORONG',
                            'MAYBRAT',
                            'RAJA AMPAT',
                            'SORONG',
                            'SORONG SELATAN',
                            'TAMBRAUW'
                        ) THEN 'NEW SORONG RAJA AMPAT'
                        WHEN upper(kabupaten) IN (
                            'INTAN JAYA',
                            'MIMIKA',
                            'PUNCAK',
                            'PUNCAK JAYA',
                            'TIMIKA'
                        ) THEN 'MIMIKA PUNCAK'
                        WHEN upper(kabupaten) IN ('DEIYAI', 'DOGIYAI', 'NABIRE', 'PANIAI') THEN 'NABIRE'
                        WHEN upper(kabupaten) IN ('ASMAT', 'BOVEN DIGOEL', 'MAPPI', 'MERAUKE') THEN 'NEW MERAUKE'
                        ELSE NULL
                    END as cluster,
                    kabupaten,
                    rev
                FROM ${table}`).join(' UNION ALL ')

            const sq = `
                WITH sq AS (
                    ${queryCurrYtd}
                )
                SELECT
                    region,
                    branch,
                    subbranch,
                    cluster,
                    kabupaten,
                    SUM(rev) AS currYtdKabupatenRev,
                    SUM(SUM(rev)) OVER (PARTITION BY region, branch, subbranch, cluster) AS currYtdClusterRev,
                    SUM(SUM(rev)) OVER (PARTITION BY region, branch, subbranch) AS currYtdSubbranchRev,
                    SUM(SUM(rev)) OVER (PARTITION BY region, branch) AS currYtdBranchRev,
                    SUM(SUM(rev)) OVER (PARTITION BY region) AS currYtdRegionalRev
                FROM sq
                WHERE kabupaten NOT IN ('TMP')
                GROUP BY 1, 2, 3, 4, 5
                    `

            const sq5 = `
                WITH sq5 AS (
                    ${queryPrevYtd}
                )
                SELECT
                    region,
                    branch,
                    subbranch,
                    cluster,
                    kabupaten,
                    SUM(rev) AS prevYtdKabupatenRev,
                    SUM(SUM(rev)) OVER (PARTITION BY region, branch, subbranch, cluster) AS prevYtdClusterRev,
                    SUM(SUM(rev)) OVER (PARTITION BY region, branch, subbranch) AS prevYtdSubbranchRev,
                    SUM(SUM(rev)) OVER (PARTITION BY region, branch) AS prevYtdBranchRev,
                    SUM(SUM(rev)) OVER (PARTITION BY region) AS prevYtdRegionalRev
                FROM sq5
                WHERE kabupaten NOT IN ('TMP')
                GROUP BY 1, 2, 3, 4, 5
                    `

            const sq2 = db4
                .select({
                    regionName: currRevNewSales.regionSales,
                    branchName: sql<string>`
        CASE
         WHEN ${currRevNewSales.kabupaten} IN (
             'AMBON',
             'KOTA AMBON',
             'MALUKU TENGAH',
             'SERAM BAGIAN TIMUR',
             'KEPULAUAN ARU',
             'KOTA TUAL',
             'MALUKU BARAT DAYA',
             'MALUKU TENGGARA',
             'MALUKU TENGGARA BARAT',
             'BURU',
             'BURU SELATAN',
             'SERAM BAGIAN BARAT',
             'KEPULAUAN TANIMBAR'
         ) THEN 'AMBON'
         WHEN ${currRevNewSales.kabupaten} IN (
             'KOTA JAYAPURA',
             'JAYAPURA',
             'KEEROM',
             'MAMBERAMO RAYA',
             'SARMI',
             'BIAK',
             'BIAK NUMFOR',
             'KEPULAUAN YAPEN',
             'SUPIORI',
             'WAROPEN',
             'JAYAWIJAYA',
             'LANNY JAYA',
             'MAMBERAMO TENGAH',
             'NDUGA',
             'PEGUNUNGAN BINTANG',
             'TOLIKARA',
             'YAHUKIMO',
             'YALIMO'
         ) THEN 'JAYAPURA'
         WHEN ${currRevNewSales.kabupaten} IN (
             'MANOKWARI',
             'FAKFAK',
             'FAK FAK',
             'KAIMANA',
             'MANOKWARI SELATAN',
             'PEGUNUNGAN ARFAK',
             'TELUK BINTUNI',
             'TELUK WONDAMA',
             'KOTA SORONG',
             'MAYBRAT',
             'RAJA AMPAT',
             'SORONG',
             'SORONG SELATAN',
             'TAMBRAUW'
         ) THEN 'SORONG'
         WHEN ${currRevNewSales.kabupaten} IN (
             'ASMAT',
             'BOVEN DIGOEL',
             'MAPPI',
             'MERAUKE',
             'INTAN JAYA',
             'MIMIKA',
             'PUNCAK',
             'PUNCAK JAYA',
             'TIMIKA',
             'DEIYAI',
             'DOGIYAI',
             'NABIRE',
             'PANIAI'
         ) THEN 'TIMIKA'
         ELSE NULL
        END
                        `.as('branchName'),
                    subbranchName: sql<string>`
        CASE
         WHEN ${currRevNewSales.kabupaten} IN (
             'AMBON',
             'KOTA AMBON',
             'MALUKU TENGAH',
             'SERAM BAGIAN TIMUR'
         ) THEN 'AMBON'
         WHEN ${currRevNewSales.kabupaten} IN (
             'KEPULAUAN ARU',
             'KOTA TUAL',
             'MALUKU BARAT DAYA',
             'MALUKU TENGGARA',
             'MALUKU TENGGARA BARAT',
             'KEPULAUAN TANIMBAR'
         ) THEN 'KEPULAUAN AMBON'
         WHEN ${currRevNewSales.kabupaten} IN ('BURU', 'BURU SELATAN', 'SERAM BAGIAN BARAT') THEN 'SERAM BURU'
         WHEN ${currRevNewSales.kabupaten} IN ('KOTA JAYAPURA') THEN 'JAYAPURA'
         WHEN ${currRevNewSales.kabupaten} IN (
             'JAYAPURA',
             'KEEROM',
             'MAMBERAMO RAYA',
             'SARMI',
             'BIAK',
             'BIAK NUMFOR',
             'KEPULAUAN YAPEN',
             'SUPIORI',
             'WAROPEN',
             'JAYAWIJAYA',
             'LANNY JAYA',
             'MAMBERAMO TENGAH',
             'NDUGA',
             'PEGUNUNGAN BINTANG',
             'TOLIKARA',
             'YAHUKIMO',
             'YALIMO'
         ) THEN 'SENTANI'
         WHEN ${currRevNewSales.kabupaten} IN ('MANOKWARI') THEN 'MANOKWARI'
         WHEN ${currRevNewSales.kabupaten} IN (
             'FAKFAK',
             'FAK FAK',
             'KAIMANA',
             'MANOKWARI SELATAN',
             'PEGUNUNGAN ARFAK',
             'TELUK BINTUNI',
             'TELUK WONDAMA'
         ) THEN 'MANOKWARI OUTER'
         WHEN ${currRevNewSales.kabupaten} IN (
             'KOTA SORONG',
             'MAYBRAT',
             'RAJA AMPAT',
             'SORONG',
             'SORONG SELATAN',
             'TAMBRAUW'
         ) THEN 'SORONG RAJA AMPAT'
         WHEN ${currRevNewSales.kabupaten} IN ('ASMAT', 'BOVEN DIGOEL', 'MAPPI', 'MERAUKE') THEN 'MERAUKE'
         WHEN ${currRevNewSales.kabupaten} IN (
             'INTAN JAYA',
             'MIMIKA',
             'PUNCAK',
             'PUNCAK JAYA',
             'TIMIKA'
         ) THEN 'MIMIKA'
         WHEN ${currRevNewSales.kabupaten} IN ('DEIYAI', 'DOGIYAI', 'NABIRE', 'PANIAI') THEN 'NABIRE'
         ELSE NULL
        END
                        `.as('subbranchName'),
                    clusterName: sql<string>`
        CASE
         WHEN ${currRevNewSales.kabupaten} IN (
             'KOTA AMBON',
             'MALUKU TENGAH',
             'SERAM BAGIAN TIMUR'
         ) THEN 'AMBON'
         WHEN ${currRevNewSales.kabupaten} IN (
             'KEPULAUAN ARU',
             'KOTA TUAL',
             'MALUKU BARAT DAYA',
             'MALUKU TENGGARA',
             'MALUKU TENGGARA BARAT',
             'KEPULAUAN TANIMBAR'
         ) THEN 'KEPULAUAN TUAL'
         WHEN ${currRevNewSales.kabupaten} IN ('BURU', 'BURU SELATAN', 'SERAM BAGIAN BARAT') THEN 'SERAM BARAT BURU'
         WHEN ${currRevNewSales.kabupaten} IN ('KOTA JAYAPURA') THEN 'KOTA JAYAPURA'
         WHEN ${currRevNewSales.kabupaten} IN ('JAYAPURA', 'KEEROM', 'MAMBERAMO RAYA', 'SARMI') THEN 'JAYAPURA OUTER'
         WHEN ${currRevNewSales.kabupaten} IN (
             'BIAK',
             'BIAK NUMFOR',
             'KEPULAUAN YAPEN',
             'SUPIORI',
             'WAROPEN'
         ) THEN 'NEW BIAK NUMFOR'
         WHEN ${currRevNewSales.kabupaten} IN (
             'JAYAWIJAYA',
             'LANNY JAYA',
             'MAMBERAMO TENGAH',
             'NDUGA',
             'PEGUNUNGAN BINTANG',
             'TOLIKARA',
             'YAHUKIMO',
             'YALIMO'
         ) THEN 'PAPUA PEGUNUNGAN'
         WHEN ${currRevNewSales.kabupaten} IN ('MANOKWARI') THEN 'MANOKWARI'
         WHEN ${currRevNewSales.kabupaten} IN (
             'FAKFAK',
             'FAK FAK',
             'KAIMANA',
             'MANOKWARI SELATAN',
             'PEGUNUNGAN ARFAK',
             'TELUK BINTUNI',
             'TELUK WONDAMA'
         ) THEN 'MANOKWARI OUTER'
         WHEN ${currRevNewSales.kabupaten} IN (
             'KOTA SORONG',
             'MAYBRAT',
             'RAJA AMPAT',
             'SORONG',
             'SORONG SELATAN',
             'TAMBRAUW'
         ) THEN 'NEW SORONG RAJA AMPAT'
         WHEN ${currRevNewSales.kabupaten} IN (
             'INTAN JAYA',
             'MIMIKA',
             'PUNCAK',
             'PUNCAK JAYA',
             'TIMIKA'
         ) THEN 'MIMIKA PUNCAK'
         WHEN ${currRevNewSales.kabupaten} IN ('DEIYAI', 'DOGIYAI', 'NABIRE', 'PANIAI') THEN 'NABIRE'
         WHEN ${currRevNewSales.kabupaten} IN ('ASMAT', 'BOVEN DIGOEL', 'MAPPI', 'MERAUKE') THEN 'NEW MERAUKE'
         ELSE NULL
        END
                        `.as('clusterName'),
                    cityName: currRevNewSales.kabupaten,
                    rev: currRevNewSales.rev
                })
                .from(currRevNewSales, {
                    useIndex: [
                        index('mtd_dt').on(currRevNewSales.mtdDt).using('btree'),
                        index('kabupaten').on(currRevNewSales.kabupaten).using('btree')
                    ]
                })
                .where(and(
                    not(eq(currRevNewSales.kabupaten, 'TMP')),
                    and(
                        gte(currRevNewSales.mtdDt, firstDayOfCurrMonth),
                        lte(currRevNewSales.mtdDt, currDate)
                    )
                ))
                .as('sq2')

            const sq3 = db4
                .select({
                    regionName: prevMonthRevNewSales.regionSales,
                    branchName: sql<string>`
        CASE
         WHEN ${prevMonthRevNewSales.kabupaten} IN (
             'AMBON',
             'KOTA AMBON',
             'MALUKU TENGAH',
             'SERAM BAGIAN TIMUR',
             'KEPULAUAN ARU',
             'KOTA TUAL',
             'MALUKU BARAT DAYA',
             'MALUKU TENGGARA',
             'MALUKU TENGGARA BARAT',
             'BURU',
             'BURU SELATAN',
             'SERAM BAGIAN BARAT',
             'KEPULAUAN TANIMBAR'
         ) THEN 'AMBON'
         WHEN ${prevMonthRevNewSales.kabupaten} IN (
             'KOTA JAYAPURA',
             'JAYAPURA',
             'KEEROM',
             'MAMBERAMO RAYA',
             'SARMI',
             'BIAK',
             'BIAK NUMFOR',
             'KEPULAUAN YAPEN',
             'SUPIORI',
             'WAROPEN',
             'JAYAWIJAYA',
             'LANNY JAYA',
             'MAMBERAMO TENGAH',
             'NDUGA',
             'PEGUNUNGAN BINTANG',
             'TOLIKARA',
             'YAHUKIMO',
             'YALIMO'
         ) THEN 'JAYAPURA'
         WHEN ${prevMonthRevNewSales.kabupaten} IN (
             'MANOKWARI',
             'FAKFAK',
             'FAK FAK',
             'KAIMANA',
             'MANOKWARI SELATAN',
             'PEGUNUNGAN ARFAK',
             'TELUK BINTUNI',
             'TELUK WONDAMA',
             'KOTA SORONG',
             'MAYBRAT',
             'RAJA AMPAT',
             'SORONG',
             'SORONG SELATAN',
             'TAMBRAUW'
         ) THEN 'SORONG'
         WHEN ${prevMonthRevNewSales.kabupaten} IN (
             'ASMAT',
             'BOVEN DIGOEL',
             'MAPPI',
             'MERAUKE',
             'INTAN JAYA',
             'MIMIKA',
             'PUNCAK',
             'PUNCAK JAYA',
             'TIMIKA',
             'DEIYAI',
             'DOGIYAI',
             'NABIRE',
             'PANIAI'
         ) THEN 'TIMIKA'
         ELSE NULL
        END
                        `.as('branchName'),
                    subbranchName: sql<string>`
        CASE
         WHEN ${prevMonthRevNewSales.kabupaten} IN (
             'AMBON',
             'KOTA AMBON',
             'MALUKU TENGAH',
             'SERAM BAGIAN TIMUR'
         ) THEN 'AMBON'
         WHEN ${prevMonthRevNewSales.kabupaten} IN (
             'KEPULAUAN ARU',
             'KOTA TUAL',
             'MALUKU BARAT DAYA',
             'MALUKU TENGGARA',
             'MALUKU TENGGARA BARAT',
             'KEPULAUAN TANIMBAR'
         ) THEN 'KEPULAUAN AMBON'
         WHEN ${prevMonthRevNewSales.kabupaten} IN ('BURU', 'BURU SELATAN', 'SERAM BAGIAN BARAT') THEN 'SERAM BURU'
         WHEN ${prevMonthRevNewSales.kabupaten} IN ('KOTA JAYAPURA') THEN 'JAYAPURA'
         WHEN ${prevMonthRevNewSales.kabupaten} IN (
             'JAYAPURA',
             'KEEROM',
             'MAMBERAMO RAYA',
             'SARMI',
             'BIAK',
             'BIAK NUMFOR',
             'KEPULAUAN YAPEN',
             'SUPIORI',
             'WAROPEN',
             'JAYAWIJAYA',
             'LANNY JAYA',
             'MAMBERAMO TENGAH',
             'NDUGA',
             'PEGUNUNGAN BINTANG',
             'TOLIKARA',
             'YAHUKIMO',
             'YALIMO'
         ) THEN 'SENTANI'
         WHEN ${prevMonthRevNewSales.kabupaten} IN ('MANOKWARI') THEN 'MANOKWARI'
         WHEN ${prevMonthRevNewSales.kabupaten} IN (
             'FAKFAK',
             'FAK FAK',
             'KAIMANA',
             'MANOKWARI SELATAN',
             'PEGUNUNGAN ARFAK',
             'TELUK BINTUNI',
             'TELUK WONDAMA'
         ) THEN 'MANOKWARI OUTER'
         WHEN ${prevMonthRevNewSales.kabupaten} IN (
             'KOTA SORONG',
             'MAYBRAT',
             'RAJA AMPAT',
             'SORONG',
             'SORONG SELATAN',
             'TAMBRAUW'
         ) THEN 'SORONG RAJA AMPAT'
         WHEN ${prevMonthRevNewSales.kabupaten} IN ('ASMAT', 'BOVEN DIGOEL', 'MAPPI', 'MERAUKE') THEN 'MERAUKE'
         WHEN ${prevMonthRevNewSales.kabupaten} IN (
             'INTAN JAYA',
             'MIMIKA',
             'PUNCAK',
             'PUNCAK JAYA',
             'TIMIKA'
         ) THEN 'MIMIKA'
         WHEN ${prevMonthRevNewSales.kabupaten} IN ('DEIYAI', 'DOGIYAI', 'NABIRE', 'PANIAI') THEN 'NABIRE'
         ELSE NULL
        END
                        `.as('subbranchName'),
                    clusterName: sql<string>`
        CASE
         WHEN ${prevMonthRevNewSales.kabupaten} IN (
             'KOTA AMBON',
             'MALUKU TENGAH',
             'SERAM BAGIAN TIMUR'
         ) THEN 'AMBON'
         WHEN ${prevMonthRevNewSales.kabupaten} IN (
             'KEPULAUAN ARU',
             'KOTA TUAL',
             'MALUKU BARAT DAYA',
             'MALUKU TENGGARA',
             'MALUKU TENGGARA BARAT',
             'KEPULAUAN TANIMBAR'
         ) THEN 'KEPULAUAN TUAL'
         WHEN ${prevMonthRevNewSales.kabupaten} IN ('BURU', 'BURU SELATAN', 'SERAM BAGIAN BARAT') THEN 'SERAM BARAT BURU'
         WHEN ${prevMonthRevNewSales.kabupaten} IN ('KOTA JAYAPURA') THEN 'KOTA JAYAPURA'
         WHEN ${prevMonthRevNewSales.kabupaten} IN ('JAYAPURA', 'KEEROM', 'MAMBERAMO RAYA', 'SARMI') THEN 'JAYAPURA OUTER'
         WHEN ${prevMonthRevNewSales.kabupaten} IN (
             'BIAK',
             'BIAK NUMFOR',
             'KEPULAUAN YAPEN',
             'SUPIORI',
             'WAROPEN'
         ) THEN 'NEW BIAK NUMFOR'
         WHEN ${prevMonthRevNewSales.kabupaten} IN (
             'JAYAWIJAYA',
             'LANNY JAYA',
             'MAMBERAMO TENGAH',
             'NDUGA',
             'PEGUNUNGAN BINTANG',
             'TOLIKARA',
             'YAHUKIMO',
             'YALIMO'
         ) THEN 'PAPUA PEGUNUNGAN'
         WHEN ${prevMonthRevNewSales.kabupaten} IN ('MANOKWARI') THEN 'MANOKWARI'
         WHEN ${prevMonthRevNewSales.kabupaten} IN (
             'FAKFAK',
             'FAK FAK',
             'KAIMANA',
             'MANOKWARI SELATAN',
             'PEGUNUNGAN ARFAK',
             'TELUK BINTUNI',
             'TELUK WONDAMA'
         ) THEN 'MANOKWARI OUTER'
         WHEN ${prevMonthRevNewSales.kabupaten} IN (
             'KOTA SORONG',
             'MAYBRAT',
             'RAJA AMPAT',
             'SORONG',
             'SORONG SELATAN',
             'TAMBRAUW'
         ) THEN 'NEW SORONG RAJA AMPAT'
         WHEN ${prevMonthRevNewSales.kabupaten} IN (
             'INTAN JAYA',
             'MIMIKA',
             'PUNCAK',
             'PUNCAK JAYA',
             'TIMIKA'
         ) THEN 'MIMIKA PUNCAK'
         WHEN ${prevMonthRevNewSales.kabupaten} IN ('DEIYAI', 'DOGIYAI', 'NABIRE', 'PANIAI') THEN 'NABIRE'
         WHEN ${prevMonthRevNewSales.kabupaten} IN ('ASMAT', 'BOVEN DIGOEL', 'MAPPI', 'MERAUKE') THEN 'NEW MERAUKE'
         ELSE NULL
        END
                        `.as('clusterName'),
                    cityName: prevMonthRevNewSales.kabupaten,
                    rev: prevMonthRevNewSales.rev
                })
                .from(prevMonthRevNewSales, {
                    useIndex: [
                        index('mtd_dt').on(prevMonthRevNewSales.mtdDt).using('btree'),
                        index('kabupaten').on(prevMonthRevNewSales.kabupaten).using('btree')
                    ]
                })
                .where(and(
                    not(eq(prevMonthRevNewSales.kabupaten, 'TMP')),
                    and(
                        gte(prevMonthRevNewSales.mtdDt, firstDayOfPrevMonth),
                        lte(prevMonthRevNewSales.mtdDt, prevDate)
                    )
                ))
                .as('sq3')

            const sq4 = db4
                .select({
                    regionName: prevYearCurrMonthRevNewSales.regionSales,
                    branchName: sql<string>`
        CASE
         WHEN ${prevYearCurrMonthRevNewSales.kabupaten} IN (
             'AMBON',
             'KOTA AMBON',
             'MALUKU TENGAH',
             'SERAM BAGIAN TIMUR',
             'KEPULAUAN ARU',
             'KOTA TUAL',
             'MALUKU BARAT DAYA',
             'MALUKU TENGGARA',
             'MALUKU TENGGARA BARAT',
             'BURU',
             'BURU SELATAN',
             'SERAM BAGIAN BARAT',
             'KEPULAUAN TANIMBAR'
         ) THEN 'AMBON'
         WHEN ${prevYearCurrMonthRevNewSales.kabupaten} IN (
             'KOTA JAYAPURA',
             'JAYAPURA',
             'KEEROM',
             'MAMBERAMO RAYA',
             'SARMI',
             'BIAK',
             'BIAK NUMFOR',
             'KEPULAUAN YAPEN',
             'SUPIORI',
             'WAROPEN',
             'JAYAWIJAYA',
             'LANNY JAYA',
             'MAMBERAMO TENGAH',
             'NDUGA',
             'PEGUNUNGAN BINTANG',
             'TOLIKARA',
             'YAHUKIMO',
             'YALIMO'
         ) THEN 'JAYAPURA'
         WHEN ${prevYearCurrMonthRevNewSales.kabupaten} IN (
             'MANOKWARI',
             'FAKFAK',
             'FAK FAK',
             'KAIMANA',
             'MANOKWARI SELATAN',
             'PEGUNUNGAN ARFAK',
             'TELUK BINTUNI',
             'TELUK WONDAMA',
             'KOTA SORONG',
             'MAYBRAT',
             'RAJA AMPAT',
             'SORONG',
             'SORONG SELATAN',
             'TAMBRAUW'
         ) THEN 'SORONG'
         WHEN ${prevYearCurrMonthRevNewSales.kabupaten} IN (
             'ASMAT',
             'BOVEN DIGOEL',
             'MAPPI',
             'MERAUKE',
             'INTAN JAYA',
             'MIMIKA',
             'PUNCAK',
             'PUNCAK JAYA',
             'TIMIKA',
             'DEIYAI',
             'DOGIYAI',
             'NABIRE',
             'PANIAI'
         ) THEN 'TIMIKA'
         ELSE NULL
        END
                        `.as('branchName'),
                    subbranchName: sql<string>`
        CASE
         WHEN ${prevYearCurrMonthRevNewSales.kabupaten} IN (
             'AMBON',
             'KOTA AMBON',
             'MALUKU TENGAH',
             'SERAM BAGIAN TIMUR'
         ) THEN 'AMBON'
         WHEN ${prevYearCurrMonthRevNewSales.kabupaten} IN (
             'KEPULAUAN ARU',
             'KOTA TUAL',
             'MALUKU BARAT DAYA',
             'MALUKU TENGGARA',
             'MALUKU TENGGARA BARAT',
             'KEPULAUAN TANIMBAR'
         ) THEN 'KEPULAUAN AMBON'
         WHEN ${prevYearCurrMonthRevNewSales.kabupaten} IN ('BURU', 'BURU SELATAN', 'SERAM BAGIAN BARAT') THEN 'SERAM BURU'
         WHEN ${prevYearCurrMonthRevNewSales.kabupaten} IN ('KOTA JAYAPURA') THEN 'JAYAPURA'
         WHEN ${prevYearCurrMonthRevNewSales.kabupaten} IN (
             'JAYAPURA',
             'KEEROM',
             'MAMBERAMO RAYA',
             'SARMI',
             'BIAK',
             'BIAK NUMFOR',
             'KEPULAUAN YAPEN',
             'SUPIORI',
             'WAROPEN',
             'JAYAWIJAYA',
             'LANNY JAYA',
             'MAMBERAMO TENGAH',
             'NDUGA',
             'PEGUNUNGAN BINTANG',
             'TOLIKARA',
             'YAHUKIMO',
             'YALIMO'
         ) THEN 'SENTANI'
         WHEN ${prevYearCurrMonthRevNewSales.kabupaten} IN ('MANOKWARI') THEN 'MANOKWARI'
         WHEN ${prevYearCurrMonthRevNewSales.kabupaten} IN (
             'FAKFAK',
             'FAK FAK',
             'KAIMANA',
             'MANOKWARI SELATAN',
             'PEGUNUNGAN ARFAK',
             'TELUK BINTUNI',
             'TELUK WONDAMA'
         ) THEN 'MANOKWARI OUTER'
         WHEN ${prevYearCurrMonthRevNewSales.kabupaten} IN (
             'KOTA SORONG',
             'MAYBRAT',
             'RAJA AMPAT',
             'SORONG',
             'SORONG SELATAN',
             'TAMBRAUW'
         ) THEN 'SORONG RAJA AMPAT'
         WHEN ${prevYearCurrMonthRevNewSales.kabupaten} IN ('ASMAT', 'BOVEN DIGOEL', 'MAPPI', 'MERAUKE') THEN 'MERAUKE'
         WHEN ${prevYearCurrMonthRevNewSales.kabupaten} IN (
             'INTAN JAYA',
             'MIMIKA',
             'PUNCAK',
             'PUNCAK JAYA',
             'TIMIKA'
         ) THEN 'MIMIKA'
         WHEN ${prevYearCurrMonthRevNewSales.kabupaten} IN ('DEIYAI', 'DOGIYAI', 'NABIRE', 'PANIAI') THEN 'NABIRE'
         ELSE NULL
        END
                        `.as('subbranchName'),
                    clusterName: sql<string>`
        CASE
         WHEN ${prevYearCurrMonthRevNewSales.kabupaten} IN (
             'KOTA AMBON',
             'MALUKU TENGAH',
             'SERAM BAGIAN TIMUR'
         ) THEN 'AMBON'
         WHEN ${prevYearCurrMonthRevNewSales.kabupaten} IN (
             'KEPULAUAN ARU',
             'KOTA TUAL',
             'MALUKU BARAT DAYA',
             'MALUKU TENGGARA',
             'MALUKU TENGGARA BARAT',
             'KEPULAUAN TANIMBAR'
         ) THEN 'KEPULAUAN TUAL'
         WHEN ${prevYearCurrMonthRevNewSales.kabupaten} IN ('BURU', 'BURU SELATAN', 'SERAM BAGIAN BARAT') THEN 'SERAM BARAT BURU'
         WHEN ${prevYearCurrMonthRevNewSales.kabupaten} IN ('KOTA JAYAPURA') THEN 'KOTA JAYAPURA'
         WHEN ${prevYearCurrMonthRevNewSales.kabupaten} IN ('JAYAPURA', 'KEEROM', 'MAMBERAMO RAYA', 'SARMI') THEN 'JAYAPURA OUTER'
         WHEN ${prevYearCurrMonthRevNewSales.kabupaten} IN (
             'BIAK',
             'BIAK NUMFOR',
             'KEPULAUAN YAPEN',
             'SUPIORI',
             'WAROPEN'
         ) THEN 'NEW BIAK NUMFOR'
         WHEN ${prevYearCurrMonthRevNewSales.kabupaten} IN (
             'JAYAWIJAYA',
             'LANNY JAYA',
             'MAMBERAMO TENGAH',
             'NDUGA',
             'PEGUNUNGAN BINTANG',
             'TOLIKARA',
             'YAHUKIMO',
             'YALIMO'
         ) THEN 'PAPUA PEGUNUNGAN'
         WHEN ${prevYearCurrMonthRevNewSales.kabupaten} IN ('MANOKWARI') THEN 'MANOKWARI'
         WHEN ${prevYearCurrMonthRevNewSales.kabupaten} IN (
             'FAKFAK',
             'FAK FAK',
             'KAIMANA',
             'MANOKWARI SELATAN',
             'PEGUNUNGAN ARFAK',
             'TELUK BINTUNI',
             'TELUK WONDAMA'
         ) THEN 'MANOKWARI OUTER'
         WHEN ${prevYearCurrMonthRevNewSales.kabupaten} IN (
             'KOTA SORONG',
             'MAYBRAT',
             'RAJA AMPAT',
             'SORONG',
             'SORONG SELATAN',
             'TAMBRAUW'
         ) THEN 'NEW SORONG RAJA AMPAT'
         WHEN ${prevYearCurrMonthRevNewSales.kabupaten} IN (
             'INTAN JAYA',
             'MIMIKA',
             'PUNCAK',
             'PUNCAK JAYA',
             'TIMIKA'
         ) THEN 'MIMIKA PUNCAK'
         WHEN ${prevYearCurrMonthRevNewSales.kabupaten} IN ('DEIYAI', 'DOGIYAI', 'NABIRE', 'PANIAI') THEN 'NABIRE'
         WHEN ${prevYearCurrMonthRevNewSales.kabupaten} IN ('ASMAT', 'BOVEN DIGOEL', 'MAPPI', 'MERAUKE') THEN 'NEW MERAUKE'
         ELSE NULL
        END
                        `.as('clusterName'),
                    cityName: prevYearCurrMonthRevNewSales.kabupaten,
                    rev: prevYearCurrMonthRevNewSales.rev
                })
                .from(prevYearCurrMonthRevNewSales, {
                    useIndex: [
                        index('mtd_dt').on(prevYearCurrMonthRevNewSales.mtdDt).using('btree'),
                        index('kabupaten').on(prevYearCurrMonthRevNewSales.kabupaten).using('btree')
                    ]
                })
                .where(and(
                    not(eq(prevYearCurrMonthRevNewSales.kabupaten, 'TMP')),
                    and(
                        gte(prevYearCurrMonthRevNewSales.mtdDt, firstDayOfPrevYearCurrMonth),
                        lte(prevYearCurrMonthRevNewSales.mtdDt, prevYearCurrDate)
                    )
                ))
                .as('sq4')

            // QUERY UNTUK TARGET BULAN INI
            const p1 = db
                .select({
                    id: regionals.id,
                    region: regionals.regional,
                    branch: branches.branchNew,
                    subbranch: subbranches.subbranchNew,
                    cluster: clusters.cluster,
                    kabupaten: kabupatens.kabupaten,
                    currMonthTargetRev: sql<number>`CAST(SUM(${revenueNewSales[monthColumn]}) AS DOUBLE PRECISION)`.as('currMonthTargetRev')
                })
                .from(regionals)
                .leftJoin(branches, eq(regionals.id, branches.regionalId))
                .leftJoin(subbranches, eq(branches.id, subbranches.branchId))
                .leftJoin(clusters, eq(subbranches.id, clusters.subbranchId))
                .leftJoin(kabupatens, eq(clusters.id, kabupatens.clusterId))
                .leftJoin(revenueNewSales, eq(kabupatens.id, revenueNewSales.kabupatenId))
                .groupBy(
                    regionals.regional,
                    branches.branchNew,
                    subbranches.subbranchNew,
                    clusters.cluster,
                    kabupatens.kabupaten
                )
                .orderBy(asc(regionals.regional))
                .prepare()

            //  QUERY UNTUK MENDAPAT CURRENT MONTH REVENUE (Mtd)
            const p2 = db4
                .select({
                    region: sql<string>`${sq2.regionName}`.as('region'),
                    branch: sql<string>`${sq2.branchName}`.as('branch'), // Keep only one branchName
                    subbranch: sql<string>`${sq2.subbranchName}`.as('subbranch'),
                    cluster: sql<string>`${sq2.clusterName}`.as('cluster'),
                    kabupaten: sql<string>`${sq2.cityName}`.as('kabupaten'),
                    currMonthKabupatenRev: sql<number>`SUM(${sq2.rev})`.as('currMonthKabupatenRev'),
                    currMonthClusterRev: sql<number>`SUM(SUM(${sq2.rev})) OVER (PARTITION BY ${sq2.regionName}, ${sq2.branchName}, ${sq2.subbranchName}, ${sq2.clusterName})`.as('currMonthClusterRev'),
                    currMonthSubbranchRev: sql<number>`SUM(SUM(${sq2.rev})) OVER (PARTITION BY ${sq2.regionName}, ${sq2.branchName}, ${sq2.subbranchName})`.as('currMonthSubbranchRev'),
                    currMonthBranchRev: sql<number>`SUM(SUM(${sq2.rev})) OVER (PARTITION BY ${sq2.regionName}, ${sq2.branchName})`.as('currMonthBranchRev'),
                    currMonthRegionalRev: sql<number>`SUM(SUM(${sq2.rev})) OVER (PARTITION BY ${sq2.regionName})`.as('currMonthRegionalRev')
                })
                .from(sq2)
                .groupBy(sql`1,2,3,4,5`)
                .prepare()

            // QUERY UNTUK MENDAPAT PREV MONTH REVENUE
            const p3 = db4
                .select({
                    region: sql<string>`${sq3.regionName}`.as('region'),
                    branch: sql<string>`${sq3.branchName}`.as('branch'), // Keep only one branchName
                    subbranch: sql<string>`${sq3.subbranchName}`.as('subbranch'),
                    cluster: sql<string>`${sq3.clusterName}`.as('cluster'),
                    kabupaten: sql<string>`${sq3.cityName}`.as('kabupaten'),
                    prevMonthKabupatenRev: sql<number>`SUM(${sq3.rev})`.as('currMonthKabupatenRev'),
                    prevMonthClusterRev: sql<number>`SUM(SUM(${sq3.rev})) OVER (PARTITION BY ${sq3.regionName}, ${sq3.branchName}, ${sq3.subbranchName}, ${sq3.clusterName})`.as('currMonthClusterRev'),
                    prevMonthSubbranchRev: sql<number>`SUM(SUM(${sq3.rev})) OVER (PARTITION BY ${sq3.regionName}, ${sq3.branchName}, ${sq3.subbranchName})`.as('currMonthSubbranchRev'),
                    prevMonthBranchRev: sql<number>`SUM(SUM(${sq3.rev})) OVER (PARTITION BY ${sq3.regionName}, ${sq3.branchName})`.as('currMonthBranchRev'),
                    prevMonthRegionalRev: sql<number>`SUM(SUM(${sq3.rev})) OVER (PARTITION BY ${sq3.regionName})`.as('currMonthRegionalRev')
                })
                .from(sq3)
                .groupBy(sql`1,2,3,4,5`)
                .prepare()

            // QUERY UNTUK MENDAPAT PREV YEAR CURR MONTH REVENUE
            const p4 = db4
                .select({
                    region: sql<string>`${sq4.regionName}`.as('region'),
                    branch: sql<string>`${sq4.branchName}`.as('branch'), // Keep only one branchName
                    subbranch: sql<string>`${sq4.subbranchName}`.as('subbranch'),
                    cluster: sql<string>`${sq4.clusterName}`.as('cluster'),
                    kabupaten: sql<string>`${sq4.cityName}`.as('kabupaten'),
                    prevYearCurrMonthKabupatenRev: sql<number>`SUM(${sq4.rev})`.as('currMonthKabupatenRev'),
                    prevYearCurrMonthClusterRev: sql<number>`SUM(SUM(${sq4.rev})) OVER (PARTITION BY ${sq4.regionName}, ${sq4.branchName}, ${sq4.subbranchName}, ${sq4.clusterName})`.as('currMonthClusterRev'),
                    prevYearCurrMonthSubbranchRev: sql<number>`SUM(SUM(${sq4.rev})) OVER (PARTITION BY ${sq4.regionName}, ${sq4.branchName}, ${sq4.subbranchName})`.as('currMonthSubbranchRev'),
                    prevYearCurrMonthBranchRev: sql<number>`SUM(SUM(${sq4.rev})) OVER (PARTITION BY ${sq4.regionName}, ${sq4.branchName})`.as('currMonthBranchRev'),
                    prevYearCurrMonthRegionalRev: sql<number>`SUM(SUM(${sq4.rev})) OVER (PARTITION BY ${sq4.regionName})`.as('currMonthRegionalRev')
                })
                .from(sq4)
                .groupBy(sql`1,2,3,4,5`)
                .prepare()

            // QUERY UNTUK YtD 2025

            const [targetRevenue, currMonthRevenue, prevMonthRevenue, prevYearCurrMonthRevenue, currYtdRev, prevYtdRev] = await Promise.all([
                p1.execute(),
                p2.execute(),
                p3.execute(),
                p4.execute(),
                db4.execute(sql.raw(sq)),
                db4.execute(sql.raw(sq5)),
            ])

            // /var/lib/backup_mysql_2025/
            const regionalsMap = new Map();
            const [currYtdRevenue] = currYtdRev as MySqlRawQueryResult as unknown as [CurrYtDRevenue[], any]
            const [prevYtdRevenue] = prevYtdRev as MySqlRawQueryResult as unknown as [PrevYtDRevenue[], any]

            targetRevenue.forEach((row) => {
                const regionalName = row.region;
                const branchName = row.branch;
                const subbranchName = row.subbranch;
                const clusterName = row.cluster;
                const kabupatenName = row.kabupaten;

                const regional = regionalsMap.get(regionalName) || regionalsMap.set(regionalName, {
                    name: regionalName,
                    currMonthRevenue: 0,
                    currMonthTarget: 0,
                    currYtdRevenue: 0,
                    prevYtdRevenue: 0,
                    prevMonthRevenue: 0,
                    prevYearCurrMonthRevenue: 0,
                    branches: new Map()
                }).get(regionalName);
                regional.currMonthTarget += Number(row.currMonthTargetRev)

                const branch = regional.branches.get(branchName) ||
                    (regional.branches.set(branchName, {
                        name: branchName,
                        currMonthRevenue: 0,
                        currMonthTarget: 0,
                        currYtdRevenue: 0,
                        prevYtdRevenue: 0,
                        prevMonthRevenue: 0,
                        prevYearCurrMonthRevenue: 0,
                        subbranches: new Map()
                    }), regional.branches.get(branchName));  // Get the newly set value
                branch.currMonthTarget += Number(row.currMonthTargetRev)

                // Initialize subbranch if it doesn't exist
                const subbranch = branch.subbranches.get(subbranchName) ||
                    (branch.subbranches.set(subbranchName, {
                        name: subbranchName,
                        currMonthRevenue: 0,
                        currMonthTarget: 0,
                        currYtdRevenue: 0,
                        prevYtdRevenue: 0,
                        prevMonthRevenue: 0,
                        prevYearCurrMonthRevenue: 0,
                        clusters: new Map()
                    }), branch.subbranches.get(subbranchName));
                subbranch.currMonthTarget += Number(row.currMonthTargetRev)

                // Initialize cluster if it doesn't exist
                const cluster = subbranch.clusters.get(clusterName) ||
                    (subbranch.clusters.set(clusterName, {
                        name: clusterName,
                        currMonthRevenue: 0,
                        currMonthTarget: 0,
                        currYtdRevenue: 0,
                        prevYtdRevenue: 0,
                        prevMonthRevenue: 0,
                        prevYearCurrMonthRevenue: 0,
                        kabupatens: new Map()
                    }), subbranch.clusters.get(clusterName));
                cluster.currMonthTarget += Number(row.currMonthTargetRev)

                // Initialize kabupaten if it doesn't exist
                cluster.kabupatens.get(kabupatenName) ||
                    (cluster.kabupatens.set(kabupatenName, {
                        name: kabupatenName,
                        currMonthRevenue: 0,
                        currMonthTarget: Number(row.currMonthTargetRev),
                        currYtdRevenue: 0,
                        prevYtdRevenue: 0,
                        prevMonthRevenue: 0,
                        prevYearCurrMonthRevenue: 0
                    }), cluster.kabupatens.get(kabupatenName));
            })

            currMonthRevenue.forEach((row) => {
                const regionalName = row.region;
                const branchName = row.branch;
                const subbranchName = row.subbranch;
                const clusterName = row.cluster;
                const kabupatenName = row.kabupaten;

                const regional = regionalsMap.get(regionalName) || regionalsMap.set(regionalName, {
                    name: regionalName,
                    currMonthRevenue: 0,
                    currMonthTarget: 0,
                    currYtdRevenue: 0,
                    prevYtdRevenue: 0,
                    prevMonthRevenue: 0,
                    prevYearCurrMonthRevenue: 0,
                    branches: new Map()
                }).get(regionalName);
                regional.currMonthRevenue = Number(row.currMonthRegionalRev)

                const branch = regional.branches.get(branchName) ||
                    (regional.branches.set(branchName, {
                        name: branchName,
                        currMonthRevenue: 0,
                        currMonthTarget: 0,
                        currYtdRevenue: 0,
                        prevYtdRevenue: 0,
                        prevMonthRevenue: 0,
                        prevYearCurrMonthRevenue: 0,
                        subbranches: new Map()
                    }), regional.branches.get(branchName));  // Get the newly set value
                branch.currMonthRevenue = Number(row.currMonthBranchRev)

                // Initialize subbranch if it doesn't exist
                const subbranch = branch.subbranches.get(subbranchName) ||
                    (branch.subbranches.set(subbranchName, {
                        name: subbranchName,
                        currMonthRevenue: 0,
                        currMonthTarget: 0,
                        currYtdRevenue: 0,
                        prevYtdRevenue: 0,
                        prevMonthRevenue: 0,
                        prevYearCurrMonthRevenue: 0,
                        clusters: new Map()
                    }), branch.subbranches.get(subbranchName));
                subbranch.currMonthRevenue = Number(row.currMonthSubbranchRev)

                // Initialize cluster if it doesn't exist
                const cluster = subbranch.clusters.get(clusterName) ||
                    (subbranch.clusters.set(clusterName, {
                        name: clusterName,
                        currMonthRevenue: 0,
                        currMonthTarget: 0,
                        currYtdRevenue: 0,
                        prevYtdRevenue: 0,
                        prevMonthRevenue: 0,
                        prevYearCurrMonthRevenue: 0,
                        kabupatens: new Map()
                    }), subbranch.clusters.get(clusterName));
                cluster.currMonthRevenue = Number(row.currMonthClusterRev)

                // Initialize kabupaten if it doesn't exist
                const kabupaten = cluster.kabupatens.get(kabupatenName) ||
                    (cluster.kabupatens.set(kabupatenName, {
                        name: kabupatenName,
                        currMonthRevenue: 0,
                        currMonthTarget: 0,
                        currYtdRevenue: 0,
                        prevYtdRevenue: 0,
                        prevMonthRevenue: 0,
                        prevYearCurrMonthRevenue: 0
                    }), cluster.kabupatens.get(kabupatenName));

                kabupaten.currMonthRevenue = Number(row.currMonthKabupatenRev)
            })

            prevMonthRevenue.forEach((row) => {
                const regionalName = row.region;
                const branchName = row.branch;
                const subbranchName = row.subbranch;
                const clusterName = row.cluster;
                const kabupatenName = row.kabupaten;

                const regional = regionalsMap.get(regionalName) || regionalsMap.set(regionalName, {
                    name: regionalName,
                    currMonthRevenue: 0,
                    currMonthTarget: 0,
                    currYtdRevenue: 0,
                    prevYtdRevenue: 0,
                    prevMonthRevenue: 0,
                    prevYearCurrMonthRevenue: 0,
                    branches: new Map()
                }).get(regionalName);
                regional.prevMonthRevenue = Number(row.prevMonthRegionalRev)

                const branch = regional.branches.get(branchName) ||
                    (regional.branches.set(branchName, {
                        name: branchName,
                        currMonthRevenue: 0,
                        currMonthTarget: 0,
                        currYtdRevenue: 0,
                        prevYtdRevenue: 0,
                        prevMonthRevenue: 0,
                        prevYearCurrMonthRevenue: 0,
                        subbranches: new Map()
                    }), regional.branches.get(branchName));  // Get the newly set value
                branch.prevMonthRevenue = Number(row.prevMonthBranchRev)

                // Initialize subbranch if it doesn't exist
                const subbranch = branch.subbranches.get(subbranchName) ||
                    (branch.subbranches.set(subbranchName, {
                        name: subbranchName,
                        currMonthRevenue: 0,
                        currMonthTarget: 0,
                        currYtdRevenue: 0,
                        prevYtdRevenue: 0,
                        prevMonthRevenue: 0,
                        prevYearCurrMonthRevenue: 0,
                        clusters: new Map()
                    }), branch.subbranches.get(subbranchName));
                subbranch.prevMonthRevenue = Number(row.prevMonthSubbranchRev)

                // Initialize cluster if it doesn't exist
                const cluster = subbranch.clusters.get(clusterName) ||
                    (subbranch.clusters.set(clusterName, {
                        name: clusterName,
                        currMonthRevenue: 0,
                        currMonthTarget: 0,
                        currYtdRevenue: 0,
                        prevYtdRevenue: 0,
                        prevMonthRevenue: 0,
                        prevYearCurrMonthRevenue: 0,
                        kabupatens: new Map()
                    }), subbranch.clusters.get(clusterName));
                cluster.prevMonthRevenue = Number(row.prevMonthClusterRev)

                // Initialize kabupaten if it doesn't exist
                const kabupaten = cluster.kabupatens.get(kabupatenName) ||
                    (cluster.kabupatens.set(kabupatenName, {
                        name: kabupatenName,
                        currMonthRevenue: 0,
                        currMonthTarget: 0,
                        currYtdRevenue: 0,
                        prevYtdRevenue: 0,
                        prevMonthRevenue: 0,
                        prevYearCurrMonthRevenue: 0
                    }), cluster.kabupatens.get(kabupatenName));
                kabupaten.prevMonthRevenue = Number(row.prevMonthKabupatenRev)
            })

            prevYearCurrMonthRevenue.forEach((row) => {
                const regionalName = row.region;
                const branchName = row.branch;
                const subbranchName = row.subbranch;
                const clusterName = row.cluster;
                const kabupatenName = row.kabupaten;

                const regional = regionalsMap.get(regionalName) || regionalsMap.set(regionalName, {
                    name: regionalName,
                    currMonthRevenue: 0,
                    currMonthTarget: 0,
                    currYtdRevenue: 0,
                    prevYtdRevenue: 0,
                    prevMonthRevenue: 0,
                    prevYearCurrMonthRevenue: 0,
                    branches: new Map()
                }).get(regionalName);
                regional.prevYearCurrMonthRevenue = Number(row.prevYearCurrMonthRegionalRev)

                const branch = regional.branches.get(branchName) ||
                    (regional.branches.set(branchName, {
                        name: branchName,
                        currMonthRevenue: 0,
                        currMonthTarget: 0,
                        currYtdRevenue: 0,
                        prevYtdRevenue: 0,
                        prevMonthRevenue: 0,
                        prevYearCurrMonthRevenue: 0,
                        subbranches: new Map()
                    }), regional.branches.get(branchName));  // Get the newly set value
                branch.prevYearCurrMonthRevenue = Number(row.prevYearCurrMonthBranchRev)

                // Initialize subbranch if it doesn't exist
                const subbranch = branch.subbranches.get(subbranchName) ||
                    (branch.subbranches.set(subbranchName, {
                        name: subbranchName,
                        currMonthRevenue: 0,
                        currMonthTarget: 0,
                        currYtdRevenue: 0,
                        prevYtdRevenue: 0,
                        prevMonthRevenue: 0,
                        prevYearCurrMonthRevenue: 0,
                        clusters: new Map()
                    }), branch.subbranches.get(subbranchName));
                subbranch.prevYearCurrMonthRevenue = Number(row.prevYearCurrMonthSubbranchRev)

                // Initialize cluster if it doesn't exist
                const cluster = subbranch.clusters.get(clusterName) ||
                    (subbranch.clusters.set(clusterName, {
                        name: clusterName,
                        currMonthRevenue: 0,
                        currMonthTarget: 0,
                        currYtdRevenue: 0,
                        prevYtdRevenue: 0,
                        prevMonthRevenue: 0,
                        prevYearCurrMonthRevenue: 0,
                        kabupatens: new Map()
                    }), subbranch.clusters.get(clusterName));
                cluster.prevYearCurrMonthRevenue = Number(row.prevYearCurrMonthClusterRev)

                // Initialize kabupaten if it doesn't exist
                const kabupaten = cluster.kabupatens.get(kabupatenName) ||
                    (cluster.kabupatens.set(kabupatenName, {
                        name: kabupatenName,
                        currMonthRevenue: 0,
                        currMonthTarget: 0,
                        currYtdRevenue: 0,
                        prevYtdRevenue: 0,
                        prevMonthRevenue: 0,
                        prevYearCurrMonthRevenue: 0
                    }), cluster.kabupatens.get(kabupatenName));
                kabupaten.prevYearCurrMonthRevenue = Number(row.prevYearCurrMonthKabupatenRev)
            })

            currYtdRevenue.forEach((row: any) => {
                const regionalName = row.region;
                const branchName = row.branch;
                const subbranchName = row.subbranch;
                const clusterName = row.cluster;
                const kabupatenName = row.kabupaten;

                const regional = regionalsMap.get(regionalName) || regionalsMap.set(regionalName, {
                    name: regionalName,
                    currMonthRevenue: 0,
                    currMonthTarget: 0,
                    currYtdRevenue: 0,
                    prevYtdRevenue: 0,
                    prevMonthRevenue: 0,
                    prevYearCurrMonthRevenue: 0,
                    branches: new Map()
                }).get(regionalName);
                regional.currYtdRevenue = Number(row.currYtdRegionalRev)

                const branch = regional.branches.get(branchName) ||
                    (regional.branches.set(branchName, {
                        name: branchName,
                        currMonthRevenue: 0,
                        currMonthTarget: 0,
                        currYtdRevenue: 0,
                        prevYtdRevenue: 0,
                        prevMonthRevenue: 0,
                        prevYearCurrMonthRevenue: 0,
                        subbranches: new Map()
                    }), regional.branches.get(branchName));  // Get the newly set value
                branch.currYtdRevenue = Number(row.currYtdBranchRev)

                // Initialize subbranch if it doesn't exist
                const subbranch = branch.subbranches.get(subbranchName) ||
                    (branch.subbranches.set(subbranchName, {
                        name: subbranchName,
                        currMonthRevenue: 0,
                        currMonthTarget: 0,
                        currYtdRevenue: 0,
                        prevYtdRevenue: 0,
                        prevMonthRevenue: 0,
                        prevYearCurrMonthRevenue: 0,
                        clusters: new Map()
                    }), branch.subbranches.get(subbranchName));
                subbranch.currYtdRevenue = Number(row.currYtdSubbranchRev)

                // Initialize cluster if it doesn't exist
                const cluster = subbranch.clusters.get(clusterName) ||
                    (subbranch.clusters.set(clusterName, {
                        name: clusterName,
                        currMonthRevenue: 0,
                        currMonthTarget: 0,
                        currYtdRevenue: 0,
                        prevYtdRevenue: 0,
                        prevMonthRevenue: 0,
                        prevYearCurrMonthRevenue: 0,
                        kabupatens: new Map()
                    }), subbranch.clusters.get(clusterName));
                cluster.currYtdRevenue = Number(row.currYtdClusterRev)

                // Initialize kabupaten if it doesn't exist
                const kabupaten = cluster.kabupatens.get(kabupatenName) ||
                    (cluster.kabupatens.set(kabupatenName, {
                        name: kabupatenName,
                        currMonthRevenue: 0,
                        currMonthTarget: 0,
                        currYtdRevenue: 0,
                        prevYtdRevenue: 0,
                        prevMonthRevenue: 0,
                        prevYearCurrMonthRevenue: 0
                    }), cluster.kabupatens.get(kabupatenName));
                kabupaten.currYtdRevenue = Number(row.currYtdKabupatenRev)
            })

            prevYtdRevenue.forEach((row: any) => {
                const regionalName = row.region;
                const branchName = row.branch;
                const subbranchName = row.subbranch;
                const clusterName = row.cluster;
                const kabupatenName = row.kabupaten;

                const regional = regionalsMap.get(regionalName) || regionalsMap.set(regionalName, {
                    name: regionalName,
                    currMonthRevenue: 0,
                    currMonthTarget: 0,
                    currYtdRevenue: 0,
                    prevYtdRevenue: 0,
                    prevMonthRevenue: 0,
                    prevYearCurrMonthRevenue: 0,
                    branches: new Map()
                }).get(regionalName);
                regional.prevYtdRevenue = Number(row.prevYtdRegionalRev)

                const branch = regional.branches.get(branchName) ||
                    (regional.branches.set(branchName, {
                        name: branchName,
                        currMonthRevenue: 0,
                        currMonthTarget: 0,
                        currYtdRevenue: 0,
                        prevYtdRevenue: 0,
                        prevMonthRevenue: 0,
                        prevYearCurrMonthRevenue: 0,
                        subbranches: new Map()
                    }), regional.branches.get(branchName));  // Get the newly set value
                branch.prevYtdRevenue = Number(row.prevYtdBranchRev)

                // Initialize subbranch if it doesn't exist
                const subbranch = branch.subbranches.get(subbranchName) ||
                    (branch.subbranches.set(subbranchName, {
                        name: subbranchName,
                        currMonthRevenue: 0,
                        currMonthTarget: 0,
                        currYtdRevenue: 0,
                        prevYtdRevenue: 0,
                        prevMonthRevenue: 0,
                        prevYearCurrMonthRevenue: 0,
                        clusters: new Map()
                    }), branch.subbranches.get(subbranchName));
                subbranch.prevYtdRevenue = Number(row.prevYtdSubbranchRev)

                // Initialize cluster if it doesn't exist
                const cluster = subbranch.clusters.get(clusterName) ||
                    (subbranch.clusters.set(clusterName, {
                        name: clusterName,
                        currMonthRevenue: 0,
                        currMonthTarget: 0,
                        currYtdRevenue: 0,
                        prevYtdRevenue: 0,
                        prevMonthRevenue: 0,
                        prevYearCurrMonthRevenue: 0,
                        kabupatens: new Map()
                    }), subbranch.clusters.get(clusterName));
                cluster.prevYtdRevenue = Number(row.prevYtdClusterRev)

                // Initialize kabupaten if it doesn't exist
                const kabupaten = cluster.kabupatens.get(kabupatenName) ||
                    (cluster.kabupatens.set(kabupatenName, {
                        name: kabupatenName,
                        currMonthRevenue: 0,
                        currMonthTarget: 0,
                        currYtdRevenue: 0,
                        prevYtdRevenue: 0,
                        prevMonthRevenue: 0,
                        prevYearCurrMonthRevenue: 0
                    }), cluster.kabupatens.get(kabupatenName));
                kabupaten.prevYtdRevenue = Number(row.prevYtdKabupatenRev)
            })

            const finalDataRevenue: Regional[] = Array.from(regionalsMap.values()).map((regional: any) => ({
                ...regional,
                branches: Array.from(regional.branches.values()).map((branch: any) => ({
                    ...branch,
                    subbranches: Array.from(branch.subbranches.values()).map((subbranch: any) => ({
                        ...subbranch,
                        clusters: Array.from(subbranch.clusters.values().map((cluster: any) => ({
                            ...cluster,
                            kabupatens: Array.from(cluster.kabupatens.values())
                        }))),
                    })),
                })),
            }));

            return c.json({ data: finalDataRevenue }, 200);
        })
    .get('/revenue-new-sales-prabayar',
        zValidator('query', z.object({ date: z.coerce.date().optional() })),
        async c => {
            const { date } = c.req.valid('query')
            const selectedDate = date ? new Date(date) : new Date()
            const month = (subDays(selectedDate, 2).getMonth() + 1).toString()

            // KOLOM DINAMIS UNTUK MEMILIH ANTARA KOLOM `m1-m12`
            const monthColumn = `m${month}` as keyof typeof revenueNewSalesPrabayar.$inferSelect

            // VARIABLE TANGGAL UNTUK IMPORT TABEL SECARA DINAMIS
            const latestDataDate = subDays(selectedDate, 2);

            const currMonth = format(selectedDate, 'MM')
            const currYear = format(selectedDate, 'yyyy')
            const latestMonth = parseInt(format(selectedDate, 'M'), 10)
            const isPrevMonthLastYear = currMonth === '01'
            const prevMonth = isPrevMonthLastYear ? '12' : format(subMonths(selectedDate, 1), 'MM')
            const prevMonthYear = isPrevMonthLastYear ? format(subYears(selectedDate, 1), 'yyyy') : format(selectedDate, 'yyyy')
            const prevYear = format(subYears(selectedDate, 1), 'yyyy')

            // TABEL `merge_new_sales_puma_`
            const currRevNewSales = dynamicMergeNewSalesPumaTable(currYear, currMonth)
            const prevMonthRevNewSales = dynamicMergeNewSalesPumaTable(prevMonthYear, prevMonth)
            const prevYearCurrMonthRevNewSales = dynamicMergeNewSalesPumaTable(prevYear, currMonth)
            const currYtdRevNewSales = [];
            for (let month = 1; month <= latestMonth; month++) {
                const monthStr = month.toString().padStart(2, '0')
                currYtdRevNewSales.push(`merge_new_sales_puma_${currYear}${monthStr}`)
            }
            const prevYtdRevNewSales = [];
            for (let month = 1; month <= latestMonth; month++) {
                const monthStr = month.toString().padStart(2, '0')
                prevYtdRevNewSales.push(`merge_new_sales_puma_${prevYear}${monthStr}`)
            }

            // VARIABLE TANGGAL
            // Get the last day of the selected month
            const lastDayOfSelectedMonth = endOfMonth(selectedDate);
            const isEndOfMonth = selectedDate.getDate() === lastDayOfSelectedMonth.getDate();

            const endOfCurrMonth = isEndOfMonth ? lastDayOfSelectedMonth : selectedDate;
            const endOfPrevMonth = isEndOfMonth ? endOfMonth(subMonths(selectedDate, 1)) : subMonths(selectedDate, 1);
            const endOfPrevYearSameMonth = isEndOfMonth ? endOfMonth(subYears(selectedDate, 1)) : subYears(selectedDate, 1);

            // get the first day and last day of the selected month dynamically
            const firstDayOfCurrMonth = format(startOfMonth(selectedDate), 'yyyy-MM-dd')
            const firstDayOfPrevMonth = format(startOfMonth(subMonths(selectedDate, 1)), 'yyyy-MM-dd')
            const firstDayOfPrevYearCurrMonth = format(startOfMonth(subYears(selectedDate, 1)), 'yyyy-MM-dd')

            const currDate = format(endOfCurrMonth, 'yyyy-MM-dd');
            const prevDate = format(endOfPrevMonth, 'yyyy-MM-dd');
            const prevYearCurrDate = format(endOfPrevYearSameMonth, 'yyyy-MM-dd');

            const queryCurrYtd = currYtdRevNewSales.map(table => `
                SELECT
                    region_sales as region,
                    CASE
                        WHEN upper(kabupaten) IN (
                            'AMBON',
                            'KOTA AMBON',
                            'MALUKU TENGAH',
                            'SERAM BAGIAN TIMUR',
                            'KEPULAUAN ARU',
                            'KOTA TUAL',
                            'MALUKU BARAT DAYA',
                            'MALUKU TENGGARA',
                            'MALUKU TENGGARA BARAT',
                            'BURU',
                            'BURU SELATAN',
                            'SERAM BAGIAN BARAT',
                            'KEPULAUAN TANIMBAR'
                        ) THEN 'AMBON'
                        WHEN upper(kabupaten) IN (
                            'KOTA JAYAPURA',
                            'JAYAPURA',
                            'KEEROM',
                            'MAMBERAMO RAYA',
                            'SARMI',
                            'BIAK',
                            'BIAK NUMFOR',
                            'KEPULAUAN YAPEN',
                            'SUPIORI',
                            'WAROPEN',
                            'JAYAWIJAYA',
                            'LANNY JAYA',
                            'MAMBERAMO TENGAH',
                            'NDUGA',
                            'PEGUNUNGAN BINTANG',
                            'TOLIKARA',
                            'YAHUKIMO',
                            'YALIMO'
                        ) THEN 'JAYAPURA'
                        WHEN upper(kabupaten) IN (
                            'MANOKWARI',
                            'FAKFAK',
                            'FAK FAK',
                            'KAIMANA',
                            'MANOKWARI SELATAN',
                            'PEGUNUNGAN ARFAK',
                            'TELUK BINTUNI',
                            'TELUK WONDAMA',
                            'KOTA SORONG',
                            'MAYBRAT',
                            'RAJA AMPAT',
                            'SORONG',
                            'SORONG SELATAN',
                            'TAMBRAUW'
                        ) THEN 'SORONG'
                        WHEN upper(kabupaten) IN (
                            'ASMAT',
                            'BOVEN DIGOEL',
                            'MAPPI',
                            'MERAUKE',
                            'INTAN JAYA',
                            'MIMIKA',
                            'PUNCAK',
                            'PUNCAK JAYA',
                            'TIMIKA',
                            'DEIYAI',
                            'DOGIYAI',
                            'NABIRE',
                            'PANIAI'
                        ) THEN 'TIMIKA'
                        ELSE NULL
                    END as branch,
                    CASE
                        WHEN upper(kabupaten) IN (
                            'AMBON',
                            'KOTA AMBON',
                            'MALUKU TENGAH',
                            'SERAM BAGIAN TIMUR'
                        ) THEN 'AMBON'
                        WHEN upper(kabupaten) IN (
                            'KEPULAUAN ARU',
                            'KOTA TUAL',
                            'MALUKU BARAT DAYA',
                            'MALUKU TENGGARA',
                            'MALUKU TENGGARA BARAT',
                            'KEPULAUAN TANIMBAR'
                        ) THEN 'KEPULAUAN AMBON'
                        WHEN upper(kabupaten) IN ('BURU', 'BURU SELATAN', 'SERAM BAGIAN BARAT') THEN 'SERAM BURU'
                        WHEN upper(kabupaten) IN ('KOTA JAYAPURA') THEN 'JAYAPURA'
                        WHEN upper(kabupaten) IN (
                            'JAYAPURA',
                            'KEEROM',
                            'MAMBERAMO RAYA',
                            'SARMI',
                            'BIAK',
                            'BIAK NUMFOR',
                            'KEPULAUAN YAPEN',
                            'SUPIORI',
                            'WAROPEN',
                            'JAYAWIJAYA',
                            'LANNY JAYA',
                            'MAMBERAMO TENGAH',
                            'NDUGA',
                            'PEGUNUNGAN BINTANG',
                            'TOLIKARA',
                            'YAHUKIMO',
                            'YALIMO'
                        ) THEN 'SENTANI'
                        WHEN upper(kabupaten) IN ('MANOKWARI') THEN 'MANOKWARI'
                        WHEN upper(kabupaten) IN (
                            'FAKFAK',
                            'FAK FAK',
                            'KAIMANA',
                            'MANOKWARI SELATAN',
                            'PEGUNUNGAN ARFAK',
                            'TELUK BINTUNI',
                            'TELUK WONDAMA'
                        ) THEN 'MANOKWARI OUTER'
                        WHEN upper(kabupaten) IN (
                            'KOTA SORONG',
                            'MAYBRAT',
                            'RAJA AMPAT',
                            'SORONG',
                            'SORONG SELATAN',
                            'TAMBRAUW'
                        ) THEN 'SORONG RAJA AMPAT'
                        WHEN upper(kabupaten) IN ('ASMAT', 'BOVEN DIGOEL', 'MAPPI', 'MERAUKE') THEN 'MERAUKE'
                        WHEN upper(kabupaten) IN (
                            'INTAN JAYA',
                            'MIMIKA',
                            'PUNCAK',
                            'PUNCAK JAYA',
                            'TIMIKA'
                        ) THEN 'MIMIKA'
                        WHEN upper(kabupaten) IN ('DEIYAI', 'DOGIYAI', 'NABIRE', 'PANIAI') THEN 'NABIRE'
                        ELSE NULL
                    END as subbranch,
                    CASE
                        WHEN upper(kabupaten) IN (
                            'AMBON',
                            'KOTA AMBON',
                            'MALUKU TENGAH',
                            'SERAM BAGIAN TIMUR'
                        ) THEN 'AMBON'
                        WHEN upper(kabupaten) IN (
                            'KEPULAUAN ARU',
                            'KOTA TUAL',
                            'MALUKU BARAT DAYA',
                            'MALUKU TENGGARA',
                            'MALUKU TENGGARA BARAT',
                            'KEPULAUAN TANIMBAR'
                        ) THEN 'KEPULAUAN TUAL'
                        WHEN upper(kabupaten) IN ('BURU', 'BURU SELATAN', 'SERAM BAGIAN BARAT') THEN 'SERAM BARAT BURU'
                        WHEN upper(kabupaten) IN ('KOTA JAYAPURA') THEN 'KOTA JAYAPURA'
                        WHEN upper(kabupaten) IN ('JAYAPURA', 'KEEROM', 'MAMBERAMO RAYA', 'SARMI') THEN 'JAYAPURA OUTER'
                        WHEN upper(kabupaten) IN (
                            'BIAK',
                            'BIAK NUMFOR',
                            'KEPULAUAN YAPEN',
                            'SUPIORI',
                            'WAROPEN'
                        ) THEN 'NEW BIAK NUMFOR'
                        WHEN upper(kabupaten) IN (
                            'JAYAWIJAYA',
                            'LANNY JAYA',
                            'MAMBERAMO TENGAH',
                            'NDUGA',
                            'PEGUNUNGAN BINTANG',
                            'TOLIKARA',
                            'YAHUKIMO',
                            'YALIMO'
                        ) THEN 'PAPUA PEGUNUNGAN'
                        WHEN upper(kabupaten) IN ('MANOKWARI') THEN 'MANOKWARI'
                        WHEN upper(kabupaten) IN (
                            'FAKFAK',
                            'FAK FAK',
                            'KAIMANA',
                            'MANOKWARI SELATAN',
                            'PEGUNUNGAN ARFAK',
                            'TELUK BINTUNI',
                            'TELUK WONDAMA'
                        ) THEN 'MANOKWARI OUTER'
                        WHEN upper(kabupaten) IN (
                            'KOTA SORONG',
                            'MAYBRAT',
                            'RAJA AMPAT',
                            'SORONG',
                            'SORONG SELATAN',
                            'TAMBRAUW'
                        ) THEN 'NEW SORONG RAJA AMPAT'
                        WHEN upper(kabupaten) IN (
                            'INTAN JAYA',
                            'MIMIKA',
                            'PUNCAK',
                            'PUNCAK JAYA',
                            'TIMIKA'
                        ) THEN 'MIMIKA PUNCAK'
                        WHEN upper(kabupaten) IN ('DEIYAI', 'DOGIYAI', 'NABIRE', 'PANIAI') THEN 'NABIRE'
                        WHEN upper(kabupaten) IN ('ASMAT', 'BOVEN DIGOEL', 'MAPPI', 'MERAUKE') THEN 'NEW MERAUKE'
                        ELSE NULL
                    END as cluster,
                    kabupaten,
                    rev
                FROM ${table} WHERE kabupaten <> 'TMP' AND brand <> 'ByU'`).join(' UNION ALL ')

            const queryPrevYtd = prevYtdRevNewSales.map(table => `
                SELECT
                    region_sales as region,
                    CASE
                        WHEN upper(kabupaten) IN (
                            'AMBON',
                            'KOTA AMBON',
                            'MALUKU TENGAH',
                            'SERAM BAGIAN TIMUR',
                            'KEPULAUAN ARU',
                            'KOTA TUAL',
                            'MALUKU BARAT DAYA',
                            'MALUKU TENGGARA',
                            'MALUKU TENGGARA BARAT',
                            'BURU',
                            'BURU SELATAN',
                            'SERAM BAGIAN BARAT',
                            'KEPULAUAN TANIMBAR'
                        ) THEN 'AMBON'
                        WHEN upper(kabupaten) IN (
                            'KOTA JAYAPURA',
                            'JAYAPURA',
                            'KEEROM',
                            'MAMBERAMO RAYA',
                            'SARMI',
                            'BIAK',
                            'BIAK NUMFOR',
                            'KEPULAUAN YAPEN',
                            'SUPIORI',
                            'WAROPEN',
                            'JAYAWIJAYA',
                            'LANNY JAYA',
                            'MAMBERAMO TENGAH',
                            'NDUGA',
                            'PEGUNUNGAN BINTANG',
                            'TOLIKARA',
                            'YAHUKIMO',
                            'YALIMO'
                        ) THEN 'JAYAPURA'
                        WHEN upper(kabupaten) IN (
                            'MANOKWARI',
                            'FAKFAK',
                            'FAK FAK',
                            'KAIMANA',
                            'MANOKWARI SELATAN',
                            'PEGUNUNGAN ARFAK',
                            'TELUK BINTUNI',
                            'TELUK WONDAMA',
                            'KOTA SORONG',
                            'MAYBRAT',
                            'RAJA AMPAT',
                            'SORONG',
                            'SORONG SELATAN',
                            'TAMBRAUW'
                        ) THEN 'SORONG'
                        WHEN upper(kabupaten) IN (
                            'ASMAT',
                            'BOVEN DIGOEL',
                            'MAPPI',
                            'MERAUKE',
                            'INTAN JAYA',
                            'MIMIKA',
                            'PUNCAK',
                            'PUNCAK JAYA',
                            'TIMIKA',
                            'DEIYAI',
                            'DOGIYAI',
                            'NABIRE',
                            'PANIAI'
                        ) THEN 'TIMIKA'
                        ELSE NULL
                    END as branch,
                    CASE
                        WHEN upper(kabupaten) IN (
                            'AMBON',
                            'KOTA AMBON',
                            'MALUKU TENGAH',
                            'SERAM BAGIAN TIMUR'
                        ) THEN 'AMBON'
                        WHEN upper(kabupaten) IN (
                            'KEPULAUAN ARU',
                            'KOTA TUAL',
                            'MALUKU BARAT DAYA',
                            'MALUKU TENGGARA',
                            'MALUKU TENGGARA BARAT',
                            'KEPULAUAN TANIMBAR'
                        ) THEN 'KEPULAUAN AMBON'
                        WHEN upper(kabupaten) IN ('BURU', 'BURU SELATAN', 'SERAM BAGIAN BARAT') THEN 'SERAM BURU'
                        WHEN upper(kabupaten) IN ('KOTA JAYAPURA') THEN 'JAYAPURA'
                        WHEN upper(kabupaten) IN (
                            'JAYAPURA',
                            'KEEROM',
                            'MAMBERAMO RAYA',
                            'SARMI',
                            'BIAK',
                            'BIAK NUMFOR',
                            'KEPULAUAN YAPEN',
                            'SUPIORI',
                            'WAROPEN',
                            'JAYAWIJAYA',
                            'LANNY JAYA',
                            'MAMBERAMO TENGAH',
                            'NDUGA',
                            'PEGUNUNGAN BINTANG',
                            'TOLIKARA',
                            'YAHUKIMO',
                            'YALIMO'
                        ) THEN 'SENTANI'
                        WHEN upper(kabupaten) IN ('MANOKWARI') THEN 'MANOKWARI'
                        WHEN upper(kabupaten) IN (
                            'FAKFAK',
                            'FAK FAK',
                            'KAIMANA',
                            'MANOKWARI SELATAN',
                            'PEGUNUNGAN ARFAK',
                            'TELUK BINTUNI',
                            'TELUK WONDAMA'
                        ) THEN 'MANOKWARI OUTER'
                        WHEN upper(kabupaten) IN (
                            'KOTA SORONG',
                            'MAYBRAT',
                            'RAJA AMPAT',
                            'SORONG',
                            'SORONG SELATAN',
                            'TAMBRAUW'
                        ) THEN 'SORONG RAJA AMPAT'
                        WHEN upper(kabupaten) IN ('ASMAT', 'BOVEN DIGOEL', 'MAPPI', 'MERAUKE') THEN 'MERAUKE'
                        WHEN upper(kabupaten) IN (
                            'INTAN JAYA',
                            'MIMIKA',
                            'PUNCAK',
                            'PUNCAK JAYA',
                            'TIMIKA'
                        ) THEN 'MIMIKA'
                        WHEN upper(kabupaten) IN ('DEIYAI', 'DOGIYAI', 'NABIRE', 'PANIAI') THEN 'NABIRE'
                        ELSE NULL
                    END as subbranch,
                    CASE
                        WHEN upper(kabupaten) IN (
                            'AMBON',
                            'KOTA AMBON',
                            'MALUKU TENGAH',
                            'SERAM BAGIAN TIMUR'
                        ) THEN 'AMBON'
                        WHEN upper(kabupaten) IN (
                            'KEPULAUAN ARU',
                            'KOTA TUAL',
                            'MALUKU BARAT DAYA',
                            'MALUKU TENGGARA',
                            'MALUKU TENGGARA BARAT',
                            'KEPULAUAN TANIMBAR'
                        ) THEN 'KEPULAUAN TUAL'
                        WHEN upper(kabupaten) IN ('BURU', 'BURU SELATAN', 'SERAM BAGIAN BARAT') THEN 'SERAM BARAT BURU'
                        WHEN upper(kabupaten) IN ('KOTA JAYAPURA') THEN 'KOTA JAYAPURA'
                        WHEN upper(kabupaten) IN ('JAYAPURA', 'KEEROM', 'MAMBERAMO RAYA', 'SARMI') THEN 'JAYAPURA OUTER'
                        WHEN upper(kabupaten) IN (
                            'BIAK',
                            'BIAK NUMFOR',
                            'KEPULAUAN YAPEN',
                            'SUPIORI',
                            'WAROPEN'
                        ) THEN 'NEW BIAK NUMFOR'
                        WHEN upper(kabupaten) IN (
                            'JAYAWIJAYA',
                            'LANNY JAYA',
                            'MAMBERAMO TENGAH',
                            'NDUGA',
                            'PEGUNUNGAN BINTANG',
                            'TOLIKARA',
                            'YAHUKIMO',
                            'YALIMO'
                        ) THEN 'PAPUA PEGUNUNGAN'
                        WHEN upper(kabupaten) IN ('MANOKWARI') THEN 'MANOKWARI'
                        WHEN upper(kabupaten) IN (
                            'FAKFAK',
                            'FAK FAK',
                            'KAIMANA',
                            'MANOKWARI SELATAN',
                            'PEGUNUNGAN ARFAK',
                            'TELUK BINTUNI',
                            'TELUK WONDAMA'
                        ) THEN 'MANOKWARI OUTER'
                        WHEN upper(kabupaten) IN (
                            'KOTA SORONG',
                            'MAYBRAT',
                            'RAJA AMPAT',
                            'SORONG',
                            'SORONG SELATAN',
                            'TAMBRAUW'
                        ) THEN 'NEW SORONG RAJA AMPAT'
                        WHEN upper(kabupaten) IN (
                            'INTAN JAYA',
                            'MIMIKA',
                            'PUNCAK',
                            'PUNCAK JAYA',
                            'TIMIKA'
                        ) THEN 'MIMIKA PUNCAK'
                        WHEN upper(kabupaten) IN ('DEIYAI', 'DOGIYAI', 'NABIRE', 'PANIAI') THEN 'NABIRE'
                        WHEN upper(kabupaten) IN ('ASMAT', 'BOVEN DIGOEL', 'MAPPI', 'MERAUKE') THEN 'NEW MERAUKE'
                        ELSE NULL
                    END as cluster,
                    kabupaten,
                    rev
                FROM ${table} WHERE kabupaten <> 'TMP' AND brand <> 'ByU'`).join(' UNION ALL ')

            const sq = `
                WITH sq AS (
                    ${queryCurrYtd}
                )
                SELECT
                    region,
                    branch,
                    subbranch,
                    cluster,
                    kabupaten,
                    SUM(rev) AS currYtdKabupatenRev,
                    SUM(SUM(rev)) OVER (PARTITION BY region, branch, subbranch, cluster) AS currYtdClusterRev,
                    SUM(SUM(rev)) OVER (PARTITION BY region, branch, subbranch) AS currYtdSubbranchRev,
                    SUM(SUM(rev)) OVER (PARTITION BY region, branch) AS currYtdBranchRev,
                    SUM(SUM(rev)) OVER (PARTITION BY region) AS currYtdRegionalRev
                FROM sq
                GROUP BY 1, 2, 3, 4, 5
                    `

            const sq5 = `
                WITH sq5 AS (
                    ${queryPrevYtd}
                )
                SELECT
                    region,
                    branch,
                    subbranch,
                    cluster,
                    kabupaten,
                    SUM(rev) AS prevYtdKabupatenRev,
                    SUM(SUM(rev)) OVER (PARTITION BY region, branch, subbranch, cluster) AS prevYtdClusterRev,
                    SUM(SUM(rev)) OVER (PARTITION BY region, branch, subbranch) AS prevYtdSubbranchRev,
                    SUM(SUM(rev)) OVER (PARTITION BY region, branch) AS prevYtdBranchRev,
                    SUM(SUM(rev)) OVER (PARTITION BY region) AS prevYtdRegionalRev
                FROM sq5
                GROUP BY 1, 2, 3, 4, 5
                    `

            const sq2 = db4
                .select({
                    regionName: currRevNewSales.regionSales,
                    branchName: sql<string>`
    CASE
     WHEN ${currRevNewSales.kabupaten} IN (
         'AMBON',
         'KOTA AMBON',
         'MALUKU TENGAH',
         'SERAM BAGIAN TIMUR',
         'KEPULAUAN ARU',
         'KOTA TUAL',
         'MALUKU BARAT DAYA',
         'MALUKU TENGGARA',
         'MALUKU TENGGARA BARAT',
         'BURU',
         'BURU SELATAN',
         'SERAM BAGIAN BARAT',
         'KEPULAUAN TANIMBAR'
     ) THEN 'AMBON'
     WHEN ${currRevNewSales.kabupaten} IN (
         'KOTA JAYAPURA',
         'JAYAPURA',
         'KEEROM',
         'MAMBERAMO RAYA',
         'SARMI',
         'BIAK',
         'BIAK NUMFOR',
         'KEPULAUAN YAPEN',
         'SUPIORI',
         'WAROPEN',
         'JAYAWIJAYA',
         'LANNY JAYA',
         'MAMBERAMO TENGAH',
         'NDUGA',
         'PEGUNUNGAN BINTANG',
         'TOLIKARA',
         'YAHUKIMO',
         'YALIMO'
     ) THEN 'JAYAPURA'
     WHEN ${currRevNewSales.kabupaten} IN (
         'MANOKWARI',
         'FAKFAK',
         'FAK FAK',
         'KAIMANA',
         'MANOKWARI SELATAN',
         'PEGUNUNGAN ARFAK',
         'TELUK BINTUNI',
         'TELUK WONDAMA',
         'KOTA SORONG',
         'MAYBRAT',
         'RAJA AMPAT',
         'SORONG',
         'SORONG SELATAN',
         'TAMBRAUW'
     ) THEN 'SORONG'
     WHEN ${currRevNewSales.kabupaten} IN (
         'ASMAT',
         'BOVEN DIGOEL',
         'MAPPI',
         'MERAUKE',
         'INTAN JAYA',
         'MIMIKA',
         'PUNCAK',
         'PUNCAK JAYA',
         'TIMIKA',
         'DEIYAI',
         'DOGIYAI',
         'NABIRE',
         'PANIAI'
     ) THEN 'TIMIKA'
     ELSE NULL
    END
                    `.as('branchName'),
                    subbranchName: sql<string>`
    CASE
     WHEN ${currRevNewSales.kabupaten} IN (
         'AMBON',
         'KOTA AMBON',
         'MALUKU TENGAH',
         'SERAM BAGIAN TIMUR'
     ) THEN 'AMBON'
     WHEN ${currRevNewSales.kabupaten} IN (
         'KEPULAUAN ARU',
         'KOTA TUAL',
         'MALUKU BARAT DAYA',
         'MALUKU TENGGARA',
         'MALUKU TENGGARA BARAT',
         'KEPULAUAN TANIMBAR'
     ) THEN 'KEPULAUAN AMBON'
     WHEN ${currRevNewSales.kabupaten} IN ('BURU', 'BURU SELATAN', 'SERAM BAGIAN BARAT') THEN 'SERAM BURU'
     WHEN ${currRevNewSales.kabupaten} IN ('KOTA JAYAPURA') THEN 'JAYAPURA'
     WHEN ${currRevNewSales.kabupaten} IN (
         'JAYAPURA',
         'KEEROM',
         'MAMBERAMO RAYA',
         'SARMI',
         'BIAK',
         'BIAK NUMFOR',
         'KEPULAUAN YAPEN',
         'SUPIORI',
         'WAROPEN',
         'JAYAWIJAYA',
         'LANNY JAYA',
         'MAMBERAMO TENGAH',
         'NDUGA',
         'PEGUNUNGAN BINTANG',
         'TOLIKARA',
         'YAHUKIMO',
         'YALIMO'
     ) THEN 'SENTANI'
     WHEN ${currRevNewSales.kabupaten} IN ('MANOKWARI') THEN 'MANOKWARI'
     WHEN ${currRevNewSales.kabupaten} IN (
         'FAKFAK',
         'FAK FAK',
         'KAIMANA',
         'MANOKWARI SELATAN',
         'PEGUNUNGAN ARFAK',
         'TELUK BINTUNI',
         'TELUK WONDAMA'
     ) THEN 'MANOKWARI OUTER'
     WHEN ${currRevNewSales.kabupaten} IN (
         'KOTA SORONG',
         'MAYBRAT',
         'RAJA AMPAT',
         'SORONG',
         'SORONG SELATAN',
         'TAMBRAUW'
     ) THEN 'SORONG RAJA AMPAT'
     WHEN ${currRevNewSales.kabupaten} IN ('ASMAT', 'BOVEN DIGOEL', 'MAPPI', 'MERAUKE') THEN 'MERAUKE'
     WHEN ${currRevNewSales.kabupaten} IN (
         'INTAN JAYA',
         'MIMIKA',
         'PUNCAK',
         'PUNCAK JAYA',
         'TIMIKA'
     ) THEN 'MIMIKA'
     WHEN ${currRevNewSales.kabupaten} IN ('DEIYAI', 'DOGIYAI', 'NABIRE', 'PANIAI') THEN 'NABIRE'
     ELSE NULL
    END
                    `.as('subbranchName'),
                    clusterName: sql<string>`
    CASE
     WHEN ${currRevNewSales.kabupaten} IN (
         'KOTA AMBON',
         'MALUKU TENGAH',
         'SERAM BAGIAN TIMUR'
     ) THEN 'AMBON'
     WHEN ${currRevNewSales.kabupaten} IN (
         'KEPULAUAN ARU',
         'KOTA TUAL',
         'MALUKU BARAT DAYA',
         'MALUKU TENGGARA',
         'MALUKU TENGGARA BARAT',
         'KEPULAUAN TANIMBAR'
     ) THEN 'KEPULAUAN TUAL'
     WHEN ${currRevNewSales.kabupaten} IN ('BURU', 'BURU SELATAN', 'SERAM BAGIAN BARAT') THEN 'SERAM BARAT BURU'
     WHEN ${currRevNewSales.kabupaten} IN ('KOTA JAYAPURA') THEN 'KOTA JAYAPURA'
     WHEN ${currRevNewSales.kabupaten} IN ('JAYAPURA', 'KEEROM', 'MAMBERAMO RAYA', 'SARMI') THEN 'JAYAPURA OUTER'
     WHEN ${currRevNewSales.kabupaten} IN (
         'BIAK',
         'BIAK NUMFOR',
         'KEPULAUAN YAPEN',
         'SUPIORI',
         'WAROPEN'
     ) THEN 'NEW BIAK NUMFOR'
     WHEN ${currRevNewSales.kabupaten} IN (
         'JAYAWIJAYA',
         'LANNY JAYA',
         'MAMBERAMO TENGAH',
         'NDUGA',
         'PEGUNUNGAN BINTANG',
         'TOLIKARA',
         'YAHUKIMO',
         'YALIMO'
     ) THEN 'PAPUA PEGUNUNGAN'
     WHEN ${currRevNewSales.kabupaten} IN ('MANOKWARI') THEN 'MANOKWARI'
     WHEN ${currRevNewSales.kabupaten} IN (
         'FAKFAK',
         'FAK FAK',
         'KAIMANA',
         'MANOKWARI SELATAN',
         'PEGUNUNGAN ARFAK',
         'TELUK BINTUNI',
         'TELUK WONDAMA'
     ) THEN 'MANOKWARI OUTER'
     WHEN ${currRevNewSales.kabupaten} IN (
         'KOTA SORONG',
         'MAYBRAT',
         'RAJA AMPAT',
         'SORONG',
         'SORONG SELATAN',
         'TAMBRAUW'
     ) THEN 'NEW SORONG RAJA AMPAT'
     WHEN ${currRevNewSales.kabupaten} IN (
         'INTAN JAYA',
         'MIMIKA',
         'PUNCAK',
         'PUNCAK JAYA',
         'TIMIKA'
     ) THEN 'MIMIKA PUNCAK'
     WHEN ${currRevNewSales.kabupaten} IN ('DEIYAI', 'DOGIYAI', 'NABIRE', 'PANIAI') THEN 'NABIRE'
     WHEN ${currRevNewSales.kabupaten} IN ('ASMAT', 'BOVEN DIGOEL', 'MAPPI', 'MERAUKE') THEN 'NEW MERAUKE'
     ELSE NULL
    END
                    `.as('clusterName'),
                    cityName: currRevNewSales.kabupaten,
                    rev: currRevNewSales.rev
                })
                .from(currRevNewSales, {
                    useIndex: [
                        index('mtd_dt').on(currRevNewSales.mtdDt).using('btree'),
                        index('kabupaten').on(currRevNewSales.kabupaten).using('btree')
                    ]
                })
                .where(and(
                    not(eq(currRevNewSales.brand, 'ByU')),
                    and(
                        not(eq(currRevNewSales.kabupaten, 'TMP')),
                        gte(currRevNewSales.mtdDt, firstDayOfCurrMonth),
                        lte(currRevNewSales.mtdDt, currDate)
                    )
                ))
                .as('sq2')

            const sq3 = db4
                .select({
                    regionName: prevMonthRevNewSales.regionSales,
                    branchName: sql<string>`
    CASE
     WHEN ${prevMonthRevNewSales.kabupaten} IN (
         'AMBON',
         'KOTA AMBON',
         'MALUKU TENGAH',
         'SERAM BAGIAN TIMUR',
         'KEPULAUAN ARU',
         'KOTA TUAL',
         'MALUKU BARAT DAYA',
         'MALUKU TENGGARA',
         'MALUKU TENGGARA BARAT',
         'BURU',
         'BURU SELATAN',
         'SERAM BAGIAN BARAT',
         'KEPULAUAN TANIMBAR'
     ) THEN 'AMBON'
     WHEN ${prevMonthRevNewSales.kabupaten} IN (
         'KOTA JAYAPURA',
         'JAYAPURA',
         'KEEROM',
         'MAMBERAMO RAYA',
         'SARMI',
         'BIAK',
         'BIAK NUMFOR',
         'KEPULAUAN YAPEN',
         'SUPIORI',
         'WAROPEN',
         'JAYAWIJAYA',
         'LANNY JAYA',
         'MAMBERAMO TENGAH',
         'NDUGA',
         'PEGUNUNGAN BINTANG',
         'TOLIKARA',
         'YAHUKIMO',
         'YALIMO'
     ) THEN 'JAYAPURA'
     WHEN ${prevMonthRevNewSales.kabupaten} IN (
         'MANOKWARI',
         'FAKFAK',
         'FAK FAK',
         'KAIMANA',
         'MANOKWARI SELATAN',
         'PEGUNUNGAN ARFAK',
         'TELUK BINTUNI',
         'TELUK WONDAMA',
         'KOTA SORONG',
         'MAYBRAT',
         'RAJA AMPAT',
         'SORONG',
         'SORONG SELATAN',
         'TAMBRAUW'
     ) THEN 'SORONG'
     WHEN ${prevMonthRevNewSales.kabupaten} IN (
         'ASMAT',
         'BOVEN DIGOEL',
         'MAPPI',
         'MERAUKE',
         'INTAN JAYA',
         'MIMIKA',
         'PUNCAK',
         'PUNCAK JAYA',
         'TIMIKA',
         'DEIYAI',
         'DOGIYAI',
         'NABIRE',
         'PANIAI'
     ) THEN 'TIMIKA'
     ELSE NULL
    END
                    `.as('branchName'),
                    subbranchName: sql<string>`
    CASE
     WHEN ${prevMonthRevNewSales.kabupaten} IN (
         'AMBON',
         'KOTA AMBON',
         'MALUKU TENGAH',
         'SERAM BAGIAN TIMUR'
     ) THEN 'AMBON'
     WHEN ${prevMonthRevNewSales.kabupaten} IN (
         'KEPULAUAN ARU',
         'KOTA TUAL',
         'MALUKU BARAT DAYA',
         'MALUKU TENGGARA',
         'MALUKU TENGGARA BARAT',
         'KEPULAUAN TANIMBAR'
     ) THEN 'KEPULAUAN AMBON'
     WHEN ${prevMonthRevNewSales.kabupaten} IN ('BURU', 'BURU SELATAN', 'SERAM BAGIAN BARAT') THEN 'SERAM BURU'
     WHEN ${prevMonthRevNewSales.kabupaten} IN ('KOTA JAYAPURA') THEN 'JAYAPURA'
     WHEN ${prevMonthRevNewSales.kabupaten} IN (
         'JAYAPURA',
         'KEEROM',
         'MAMBERAMO RAYA',
         'SARMI',
         'BIAK',
         'BIAK NUMFOR',
         'KEPULAUAN YAPEN',
         'SUPIORI',
         'WAROPEN',
         'JAYAWIJAYA',
         'LANNY JAYA',
         'MAMBERAMO TENGAH',
         'NDUGA',
         'PEGUNUNGAN BINTANG',
         'TOLIKARA',
         'YAHUKIMO',
         'YALIMO'
     ) THEN 'SENTANI'
     WHEN ${prevMonthRevNewSales.kabupaten} IN ('MANOKWARI') THEN 'MANOKWARI'
     WHEN ${prevMonthRevNewSales.kabupaten} IN (
         'FAKFAK',
         'FAK FAK',
         'KAIMANA',
         'MANOKWARI SELATAN',
         'PEGUNUNGAN ARFAK',
         'TELUK BINTUNI',
         'TELUK WONDAMA'
     ) THEN 'MANOKWARI OUTER'
     WHEN ${prevMonthRevNewSales.kabupaten} IN (
         'KOTA SORONG',
         'MAYBRAT',
         'RAJA AMPAT',
         'SORONG',
         'SORONG SELATAN',
         'TAMBRAUW'
     ) THEN 'SORONG RAJA AMPAT'
     WHEN ${prevMonthRevNewSales.kabupaten} IN ('ASMAT', 'BOVEN DIGOEL', 'MAPPI', 'MERAUKE') THEN 'MERAUKE'
     WHEN ${prevMonthRevNewSales.kabupaten} IN (
         'INTAN JAYA',
         'MIMIKA',
         'PUNCAK',
         'PUNCAK JAYA',
         'TIMIKA'
     ) THEN 'MIMIKA'
     WHEN ${prevMonthRevNewSales.kabupaten} IN ('DEIYAI', 'DOGIYAI', 'NABIRE', 'PANIAI') THEN 'NABIRE'
     ELSE NULL
    END
                    `.as('subbranchName'),
                    clusterName: sql<string>`
    CASE
     WHEN ${prevMonthRevNewSales.kabupaten} IN (
         'KOTA AMBON',
         'MALUKU TENGAH',
         'SERAM BAGIAN TIMUR'
     ) THEN 'AMBON'
     WHEN ${prevMonthRevNewSales.kabupaten} IN (
         'KEPULAUAN ARU',
         'KOTA TUAL',
         'MALUKU BARAT DAYA',
         'MALUKU TENGGARA',
         'MALUKU TENGGARA BARAT',
         'KEPULAUAN TANIMBAR'
     ) THEN 'KEPULAUAN TUAL'
     WHEN ${prevMonthRevNewSales.kabupaten} IN ('BURU', 'BURU SELATAN', 'SERAM BAGIAN BARAT') THEN 'SERAM BARAT BURU'
     WHEN ${prevMonthRevNewSales.kabupaten} IN ('KOTA JAYAPURA') THEN 'KOTA JAYAPURA'
     WHEN ${prevMonthRevNewSales.kabupaten} IN ('JAYAPURA', 'KEEROM', 'MAMBERAMO RAYA', 'SARMI') THEN 'JAYAPURA OUTER'
     WHEN ${prevMonthRevNewSales.kabupaten} IN (
         'BIAK',
         'BIAK NUMFOR',
         'KEPULAUAN YAPEN',
         'SUPIORI',
         'WAROPEN'
     ) THEN 'NEW BIAK NUMFOR'
     WHEN ${prevMonthRevNewSales.kabupaten} IN (
         'JAYAWIJAYA',
         'LANNY JAYA',
         'MAMBERAMO TENGAH',
         'NDUGA',
         'PEGUNUNGAN BINTANG',
         'TOLIKARA',
         'YAHUKIMO',
         'YALIMO'
     ) THEN 'PAPUA PEGUNUNGAN'
     WHEN ${prevMonthRevNewSales.kabupaten} IN ('MANOKWARI') THEN 'MANOKWARI'
     WHEN ${prevMonthRevNewSales.kabupaten} IN (
         'FAKFAK',
         'FAK FAK',
         'KAIMANA',
         'MANOKWARI SELATAN',
         'PEGUNUNGAN ARFAK',
         'TELUK BINTUNI',
         'TELUK WONDAMA'
     ) THEN 'MANOKWARI OUTER'
     WHEN ${prevMonthRevNewSales.kabupaten} IN (
         'KOTA SORONG',
         'MAYBRAT',
         'RAJA AMPAT',
         'SORONG',
         'SORONG SELATAN',
         'TAMBRAUW'
     ) THEN 'NEW SORONG RAJA AMPAT'
     WHEN ${prevMonthRevNewSales.kabupaten} IN (
         'INTAN JAYA',
         'MIMIKA',
         'PUNCAK',
         'PUNCAK JAYA',
         'TIMIKA'
     ) THEN 'MIMIKA PUNCAK'
     WHEN ${prevMonthRevNewSales.kabupaten} IN ('DEIYAI', 'DOGIYAI', 'NABIRE', 'PANIAI') THEN 'NABIRE'
     WHEN ${prevMonthRevNewSales.kabupaten} IN ('ASMAT', 'BOVEN DIGOEL', 'MAPPI', 'MERAUKE') THEN 'NEW MERAUKE'
     ELSE NULL
    END
                    `.as('clusterName'),
                    cityName: prevMonthRevNewSales.kabupaten,
                    rev: prevMonthRevNewSales.rev
                })
                .from(prevMonthRevNewSales, {
                    useIndex: [
                        index('mtd_dt').on(prevMonthRevNewSales.mtdDt).using('btree'),
                        index('kabupaten').on(prevMonthRevNewSales.kabupaten).using('btree')
                    ]
                })
                .where(and(
                    not(eq(prevMonthRevNewSales.brand, 'ByU')),
                    and(
                        not(eq(prevMonthRevNewSales.kabupaten, 'TMP')),
                        gte(prevMonthRevNewSales.mtdDt, firstDayOfPrevMonth),
                        lte(prevMonthRevNewSales.mtdDt, prevDate)
                    )
                ))
                .as('sq3')

            const sq4 = db4
                .select({
                    regionName: prevYearCurrMonthRevNewSales.regionSales,
                    branchName: sql<string>`
    CASE
     WHEN ${prevYearCurrMonthRevNewSales.kabupaten} IN (
         'AMBON',
         'KOTA AMBON',
         'MALUKU TENGAH',
         'SERAM BAGIAN TIMUR',
         'KEPULAUAN ARU',
         'KOTA TUAL',
         'MALUKU BARAT DAYA',
         'MALUKU TENGGARA',
         'MALUKU TENGGARA BARAT',
         'BURU',
         'BURU SELATAN',
         'SERAM BAGIAN BARAT',
         'KEPULAUAN TANIMBAR'
     ) THEN 'AMBON'
     WHEN ${prevYearCurrMonthRevNewSales.kabupaten} IN (
         'KOTA JAYAPURA',
         'JAYAPURA',
         'KEEROM',
         'MAMBERAMO RAYA',
         'SARMI',
         'BIAK',
         'BIAK NUMFOR',
         'KEPULAUAN YAPEN',
         'SUPIORI',
         'WAROPEN',
         'JAYAWIJAYA',
         'LANNY JAYA',
         'MAMBERAMO TENGAH',
         'NDUGA',
         'PEGUNUNGAN BINTANG',
         'TOLIKARA',
         'YAHUKIMO',
         'YALIMO'
     ) THEN 'JAYAPURA'
     WHEN ${prevYearCurrMonthRevNewSales.kabupaten} IN (
         'MANOKWARI',
         'FAKFAK',
         'FAK FAK',
         'KAIMANA',
         'MANOKWARI SELATAN',
         'PEGUNUNGAN ARFAK',
         'TELUK BINTUNI',
         'TELUK WONDAMA',
         'KOTA SORONG',
         'MAYBRAT',
         'RAJA AMPAT',
         'SORONG',
         'SORONG SELATAN',
         'TAMBRAUW'
     ) THEN 'SORONG'
     WHEN ${prevYearCurrMonthRevNewSales.kabupaten} IN (
         'ASMAT',
         'BOVEN DIGOEL',
         'MAPPI',
         'MERAUKE',
         'INTAN JAYA',
         'MIMIKA',
         'PUNCAK',
         'PUNCAK JAYA',
         'TIMIKA',
         'DEIYAI',
         'DOGIYAI',
         'NABIRE',
         'PANIAI'
     ) THEN 'TIMIKA'
     ELSE NULL
    END
                    `.as('branchName'),
                    subbranchName: sql<string>`
    CASE
     WHEN ${prevYearCurrMonthRevNewSales.kabupaten} IN (
         'AMBON',
         'KOTA AMBON',
         'MALUKU TENGAH',
         'SERAM BAGIAN TIMUR'
     ) THEN 'AMBON'
     WHEN ${prevYearCurrMonthRevNewSales.kabupaten} IN (
         'KEPULAUAN ARU',
         'KOTA TUAL',
         'MALUKU BARAT DAYA',
         'MALUKU TENGGARA',
         'MALUKU TENGGARA BARAT',
         'KEPULAUAN TANIMBAR'
     ) THEN 'KEPULAUAN AMBON'
     WHEN ${prevYearCurrMonthRevNewSales.kabupaten} IN ('BURU', 'BURU SELATAN', 'SERAM BAGIAN BARAT') THEN 'SERAM BURU'
     WHEN ${prevYearCurrMonthRevNewSales.kabupaten} IN ('KOTA JAYAPURA') THEN 'JAYAPURA'
     WHEN ${prevYearCurrMonthRevNewSales.kabupaten} IN (
         'JAYAPURA',
         'KEEROM',
         'MAMBERAMO RAYA',
         'SARMI',
         'BIAK',
         'BIAK NUMFOR',
         'KEPULAUAN YAPEN',
         'SUPIORI',
         'WAROPEN',
         'JAYAWIJAYA',
         'LANNY JAYA',
         'MAMBERAMO TENGAH',
         'NDUGA',
         'PEGUNUNGAN BINTANG',
         'TOLIKARA',
         'YAHUKIMO',
         'YALIMO'
     ) THEN 'SENTANI'
     WHEN ${prevYearCurrMonthRevNewSales.kabupaten} IN ('MANOKWARI') THEN 'MANOKWARI'
     WHEN ${prevYearCurrMonthRevNewSales.kabupaten} IN (
         'FAKFAK',
         'FAK FAK',
         'KAIMANA',
         'MANOKWARI SELATAN',
         'PEGUNUNGAN ARFAK',
         'TELUK BINTUNI',
         'TELUK WONDAMA'
     ) THEN 'MANOKWARI OUTER'
     WHEN ${prevYearCurrMonthRevNewSales.kabupaten} IN (
         'KOTA SORONG',
         'MAYBRAT',
         'RAJA AMPAT',
         'SORONG',
         'SORONG SELATAN',
         'TAMBRAUW'
     ) THEN 'SORONG RAJA AMPAT'
     WHEN ${prevYearCurrMonthRevNewSales.kabupaten} IN ('ASMAT', 'BOVEN DIGOEL', 'MAPPI', 'MERAUKE') THEN 'MERAUKE'
     WHEN ${prevYearCurrMonthRevNewSales.kabupaten} IN (
         'INTAN JAYA',
         'MIMIKA',
         'PUNCAK',
         'PUNCAK JAYA',
         'TIMIKA'
     ) THEN 'MIMIKA'
     WHEN ${prevYearCurrMonthRevNewSales.kabupaten} IN ('DEIYAI', 'DOGIYAI', 'NABIRE', 'PANIAI') THEN 'NABIRE'
     ELSE NULL
    END
                    `.as('subbranchName'),
                    clusterName: sql<string>`
    CASE
     WHEN ${prevYearCurrMonthRevNewSales.kabupaten} IN (
         'KOTA AMBON',
         'MALUKU TENGAH',
         'SERAM BAGIAN TIMUR'
     ) THEN 'AMBON'
     WHEN ${prevYearCurrMonthRevNewSales.kabupaten} IN (
         'KEPULAUAN ARU',
         'KOTA TUAL',
         'MALUKU BARAT DAYA',
         'MALUKU TENGGARA',
         'MALUKU TENGGARA BARAT',
         'KEPULAUAN TANIMBAR'
     ) THEN 'KEPULAUAN TUAL'
     WHEN ${prevYearCurrMonthRevNewSales.kabupaten} IN ('BURU', 'BURU SELATAN', 'SERAM BAGIAN BARAT') THEN 'SERAM BARAT BURU'
     WHEN ${prevYearCurrMonthRevNewSales.kabupaten} IN ('KOTA JAYAPURA') THEN 'KOTA JAYAPURA'
     WHEN ${prevYearCurrMonthRevNewSales.kabupaten} IN ('JAYAPURA', 'KEEROM', 'MAMBERAMO RAYA', 'SARMI') THEN 'JAYAPURA OUTER'
     WHEN ${prevYearCurrMonthRevNewSales.kabupaten} IN (
         'BIAK',
         'BIAK NUMFOR',
         'KEPULAUAN YAPEN',
         'SUPIORI',
         'WAROPEN'
     ) THEN 'NEW BIAK NUMFOR'
     WHEN ${prevYearCurrMonthRevNewSales.kabupaten} IN (
         'JAYAWIJAYA',
         'LANNY JAYA',
         'MAMBERAMO TENGAH',
         'NDUGA',
         'PEGUNUNGAN BINTANG',
         'TOLIKARA',
         'YAHUKIMO',
         'YALIMO'
     ) THEN 'PAPUA PEGUNUNGAN'
     WHEN ${prevYearCurrMonthRevNewSales.kabupaten} IN ('MANOKWARI') THEN 'MANOKWARI'
     WHEN ${prevYearCurrMonthRevNewSales.kabupaten} IN (
         'FAKFAK',
         'FAK FAK',
         'KAIMANA',
         'MANOKWARI SELATAN',
         'PEGUNUNGAN ARFAK',
         'TELUK BINTUNI',
         'TELUK WONDAMA'
     ) THEN 'MANOKWARI OUTER'
     WHEN ${prevYearCurrMonthRevNewSales.kabupaten} IN (
         'KOTA SORONG',
         'MAYBRAT',
         'RAJA AMPAT',
         'SORONG',
         'SORONG SELATAN',
         'TAMBRAUW'
     ) THEN 'NEW SORONG RAJA AMPAT'
     WHEN ${prevYearCurrMonthRevNewSales.kabupaten} IN (
         'INTAN JAYA',
         'MIMIKA',
         'PUNCAK',
         'PUNCAK JAYA',
         'TIMIKA'
     ) THEN 'MIMIKA PUNCAK'
     WHEN ${prevYearCurrMonthRevNewSales.kabupaten} IN ('DEIYAI', 'DOGIYAI', 'NABIRE', 'PANIAI') THEN 'NABIRE'
     WHEN ${prevYearCurrMonthRevNewSales.kabupaten} IN ('ASMAT', 'BOVEN DIGOEL', 'MAPPI', 'MERAUKE') THEN 'NEW MERAUKE'
     ELSE NULL
    END
                    `.as('clusterName'),
                    cityName: prevYearCurrMonthRevNewSales.kabupaten,
                    rev: prevYearCurrMonthRevNewSales.rev,
                })
                .from(prevYearCurrMonthRevNewSales, {
                    useIndex: [
                        index('mtd_dt').on(prevYearCurrMonthRevNewSales.mtdDt).using('btree'),
                        index('kabupaten').on(prevYearCurrMonthRevNewSales.kabupaten).using('btree')
                    ]
                })
                .where(and(
                    not(eq(prevYearCurrMonthRevNewSales.brand, 'ByU')),
                    and(
                        not(eq(prevYearCurrMonthRevNewSales.kabupaten, 'TMP')),
                        gte(prevYearCurrMonthRevNewSales.mtdDt, firstDayOfPrevYearCurrMonth),
                        lte(prevYearCurrMonthRevNewSales.mtdDt, prevYearCurrDate)
                    )
                ))
                .as('sq4')

            // QUERY UNTUK TARGET BULAN INI
            const p1 = db
                .select({
                    id: regionals.id,
                    region: regionals.regional,
                    branch: branches.branchNew,
                    subbranch: subbranches.subbranchNew,
                    cluster: clusters.cluster,
                    kabupaten: kabupatens.kabupaten,
                    currMonthTargetRev: sql<number>`CAST(SUM(${revenueNewSalesPrabayar[monthColumn]}) AS DOUBLE PRECISION)`.as('currMonthTargetRev')
                })
                .from(regionals)
                .leftJoin(branches, eq(regionals.id, branches.regionalId))
                .leftJoin(subbranches, eq(branches.id, subbranches.branchId))
                .leftJoin(clusters, eq(subbranches.id, clusters.subbranchId))
                .leftJoin(kabupatens, eq(clusters.id, kabupatens.clusterId))
                .leftJoin(revenueNewSalesPrabayar, eq(kabupatens.id, revenueNewSalesPrabayar.kabupatenId))
                .groupBy(
                    regionals.regional,
                    branches.branchNew,
                    subbranches.subbranchNew,
                    clusters.cluster,
                    kabupatens.kabupaten
                )
                .orderBy(asc(regionals.regional))
                .prepare()

            //  QUERY UNTUK MENDAPAT CURRENT MONTH REVENUE (Mtd)
            const p2 = db4
                .select({
                    region: sql<string>`${sq2.regionName}`.as('region'),
                    branch: sql<string>`${sq2.branchName}`.as('branch'), // Keep only one branchName
                    subbranch: sql<string>`${sq2.subbranchName}`.as('subbranch'),
                    cluster: sql<string>`${sq2.clusterName}`.as('cluster'),
                    kabupaten: sql<string>`${sq2.cityName}`.as('kabupaten'),
                    currMonthKabupatenRev: sql<number>`SUM(${sq2.rev})`.as('currMonthKabupatenRev'),
                    currMonthClusterRev: sql<number>`SUM(SUM(${sq2.rev})) OVER (PARTITION BY ${sq2.regionName}, ${sq2.branchName}, ${sq2.subbranchName}, ${sq2.clusterName})`.as('currMonthClusterRev'),
                    currMonthSubbranchRev: sql<number>`SUM(SUM(${sq2.rev})) OVER (PARTITION BY ${sq2.regionName}, ${sq2.branchName}, ${sq2.subbranchName})`.as('currMonthSubbranchRev'),
                    currMonthBranchRev: sql<number>`SUM(SUM(${sq2.rev})) OVER (PARTITION BY ${sq2.regionName}, ${sq2.branchName})`.as('currMonthBranchRev'),
                    currMonthRegionalRev: sql<number>`SUM(SUM(${sq2.rev})) OVER (PARTITION BY ${sq2.regionName})`.as('currMonthRegionalRev')
                })
                .from(sq2)
                .groupBy(sql`1,2,3,4,5`)
                .prepare()

            // QUERY UNTUK MENDAPAT PREV MONTH REVENUE
            const p3 = db4
                .select({
                    region: sql<string>`${sq3.regionName}`.as('region'),
                    branch: sql<string>`${sq3.branchName}`.as('branch'), // Keep only one branchName
                    subbranch: sql<string>`${sq3.subbranchName}`.as('subbranch'),
                    cluster: sql<string>`${sq3.clusterName}`.as('cluster'),
                    kabupaten: sql<string>`${sq3.cityName}`.as('kabupaten'),
                    prevMonthKabupatenRev: sql<number>`SUM(${sq3.rev})`.as('currMonthKabupatenRev'),
                    prevMonthClusterRev: sql<number>`SUM(SUM(${sq3.rev})) OVER (PARTITION BY ${sq3.regionName}, ${sq3.branchName}, ${sq3.subbranchName}, ${sq3.clusterName})`.as('currMonthClusterRev'),
                    prevMonthSubbranchRev: sql<number>`SUM(SUM(${sq3.rev})) OVER (PARTITION BY ${sq3.regionName}, ${sq3.branchName}, ${sq3.subbranchName})`.as('currMonthSubbranchRev'),
                    prevMonthBranchRev: sql<number>`SUM(SUM(${sq3.rev})) OVER (PARTITION BY ${sq3.regionName}, ${sq3.branchName})`.as('currMonthBranchRev'),
                    prevMonthRegionalRev: sql<number>`SUM(SUM(${sq3.rev})) OVER (PARTITION BY ${sq3.regionName})`.as('currMonthRegionalRev')
                })
                .from(sq3)
                .groupBy(sql`1,2,3,4,5`)
                .prepare()

            // QUERY UNTUK MENDAPAT PREV YEAR CURR MONTH REVENUE
            const p4 = db4
                .select({
                    region: sql<string>`${sq4.regionName}`.as('region'),
                    branch: sql<string>`${sq4.branchName}`.as('branch'), // Keep only one branchName
                    subbranch: sql<string>`${sq4.subbranchName}`.as('subbranch'),
                    cluster: sql<string>`${sq4.clusterName}`.as('cluster'),
                    kabupaten: sql<string>`${sq4.cityName}`.as('kabupaten'),
                    prevYearCurrMonthKabupatenRev: sql<number>`SUM(${sq4.rev})`.as('currMonthKabupatenRev'),
                    prevYearCurrMonthClusterRev: sql<number>`SUM(SUM(${sq4.rev})) OVER (PARTITION BY ${sq4.regionName}, ${sq4.branchName}, ${sq4.subbranchName}, ${sq4.clusterName})`.as('currMonthClusterRev'),
                    prevYearCurrMonthSubbranchRev: sql<number>`SUM(SUM(${sq4.rev})) OVER (PARTITION BY ${sq4.regionName}, ${sq4.branchName}, ${sq4.subbranchName})`.as('currMonthSubbranchRev'),
                    prevYearCurrMonthBranchRev: sql<number>`SUM(SUM(${sq4.rev})) OVER (PARTITION BY ${sq4.regionName}, ${sq4.branchName})`.as('currMonthBranchRev'),
                    prevYearCurrMonthRegionalRev: sql<number>`SUM(SUM(${sq4.rev})) OVER (PARTITION BY ${sq4.regionName})`.as('currMonthRegionalRev')
                })
                .from(sq4)
                .groupBy(sql`1,2,3,4,5`)
                .prepare()

            // QUERY UNTUK YtD 2025

            const [targetRevenue, currMonthRevenue, prevMonthRevenue, prevYearCurrMonthRevenue, currYtdRev, prevYtdRev] = await Promise.all([
                p1.execute(),
                p2.execute(),
                p3.execute(),
                p4.execute(),
                db4.execute(sql.raw(sq)),
                db4.execute(sql.raw(sq5)),
            ])

            // /var/lib/backup_mysql_2025/
            const regionalsMap = new Map();
            const [currYtdRevenue] = currYtdRev as MySqlRawQueryResult as unknown as [CurrYtDRevenue[], any]
            const [prevYtdRevenue] = prevYtdRev as MySqlRawQueryResult as unknown as [PrevYtDRevenue[], any]

            targetRevenue.forEach((row) => {
                const regionalName = row.region;
                const branchName = row.branch;
                const subbranchName = row.subbranch;
                const clusterName = row.cluster;
                const kabupatenName = row.kabupaten;

                const regional = regionalsMap.get(regionalName) || regionalsMap.set(regionalName, {
                    name: regionalName,
                    currMonthRevenue: 0,
                    currMonthTarget: 0,
                    currYtdRevenue: 0,
                    prevYtdRevenue: 0,
                    prevMonthRevenue: 0,
                    prevYearCurrMonthRevenue: 0,
                    branches: new Map()
                }).get(regionalName);
                regional.currMonthTarget += Number(row.currMonthTargetRev)

                const branch = regional.branches.get(branchName) ||
                    (regional.branches.set(branchName, {
                        name: branchName,
                        currMonthRevenue: 0,
                        currMonthTarget: 0,
                        currYtdRevenue: 0,
                        prevYtdRevenue: 0,
                        prevMonthRevenue: 0,
                        prevYearCurrMonthRevenue: 0,
                        subbranches: new Map()
                    }), regional.branches.get(branchName));  // Get the newly set value
                branch.currMonthTarget += Number(row.currMonthTargetRev)

                // Initialize subbranch if it doesn't exist
                const subbranch = branch.subbranches.get(subbranchName) ||
                    (branch.subbranches.set(subbranchName, {
                        name: subbranchName,
                        currMonthRevenue: 0,
                        currMonthTarget: 0,
                        currYtdRevenue: 0,
                        prevYtdRevenue: 0,
                        prevMonthRevenue: 0,
                        prevYearCurrMonthRevenue: 0,
                        clusters: new Map()
                    }), branch.subbranches.get(subbranchName));
                subbranch.currMonthTarget += Number(row.currMonthTargetRev)

                // Initialize cluster if it doesn't exist
                const cluster = subbranch.clusters.get(clusterName) ||
                    (subbranch.clusters.set(clusterName, {
                        name: clusterName,
                        currMonthRevenue: 0,
                        currMonthTarget: 0,
                        currYtdRevenue: 0,
                        prevYtdRevenue: 0,
                        prevMonthRevenue: 0,
                        prevYearCurrMonthRevenue: 0,
                        kabupatens: new Map()
                    }), subbranch.clusters.get(clusterName));
                cluster.currMonthTarget += Number(row.currMonthTargetRev)

                // Initialize kabupaten if it doesn't exist
                cluster.kabupatens.get(kabupatenName) ||
                    (cluster.kabupatens.set(kabupatenName, {
                        name: kabupatenName,
                        currMonthRevenue: 0,
                        currMonthTarget: Number(row.currMonthTargetRev),
                        currYtdRevenue: 0,
                        prevYtdRevenue: 0,
                        prevMonthRevenue: 0,
                        prevYearCurrMonthRevenue: 0
                    }), cluster.kabupatens.get(kabupatenName));
            })

            currMonthRevenue.forEach((row) => {
                const regionalName = row.region;
                const branchName = row.branch;
                const subbranchName = row.subbranch;
                const clusterName = row.cluster;
                const kabupatenName = row.kabupaten;

                const regional = regionalsMap.get(regionalName) || regionalsMap.set(regionalName, {
                    name: regionalName,
                    currMonthRevenue: 0,
                    currMonthTarget: 0,
                    currYtdRevenue: 0,
                    prevYtdRevenue: 0,
                    prevMonthRevenue: 0,
                    prevYearCurrMonthRevenue: 0,
                    branches: new Map()
                }).get(regionalName);
                regional.currMonthRevenue = Number(row.currMonthRegionalRev)

                const branch = regional.branches.get(branchName) ||
                    (regional.branches.set(branchName, {
                        name: branchName,
                        currMonthRevenue: 0,
                        currMonthTarget: 0,
                        currYtdRevenue: 0,
                        prevYtdRevenue: 0,
                        prevMonthRevenue: 0,
                        prevYearCurrMonthRevenue: 0,
                        subbranches: new Map()
                    }), regional.branches.get(branchName));  // Get the newly set value
                branch.currMonthRevenue = Number(row.currMonthBranchRev)

                // Initialize subbranch if it doesn't exist
                const subbranch = branch.subbranches.get(subbranchName) ||
                    (branch.subbranches.set(subbranchName, {
                        name: subbranchName,
                        currMonthRevenue: 0,
                        currMonthTarget: 0,
                        currYtdRevenue: 0,
                        prevYtdRevenue: 0,
                        prevMonthRevenue: 0,
                        prevYearCurrMonthRevenue: 0,
                        clusters: new Map()
                    }), branch.subbranches.get(subbranchName));
                subbranch.currMonthRevenue = Number(row.currMonthSubbranchRev)

                // Initialize cluster if it doesn't exist
                const cluster = subbranch.clusters.get(clusterName) ||
                    (subbranch.clusters.set(clusterName, {
                        name: clusterName,
                        currMonthRevenue: 0,
                        currMonthTarget: 0,
                        currYtdRevenue: 0,
                        prevYtdRevenue: 0,
                        prevMonthRevenue: 0,
                        prevYearCurrMonthRevenue: 0,
                        kabupatens: new Map()
                    }), subbranch.clusters.get(clusterName));
                cluster.currMonthRevenue = Number(row.currMonthClusterRev)

                // Initialize kabupaten if it doesn't exist
                const kabupaten = cluster.kabupatens.get(kabupatenName) ||
                    (cluster.kabupatens.set(kabupatenName, {
                        name: kabupatenName,
                        currMonthRevenue: 0,
                        currMonthTarget: 0,
                        currYtdRevenue: 0,
                        prevYtdRevenue: 0,
                        prevMonthRevenue: 0,
                        prevYearCurrMonthRevenue: 0
                    }), cluster.kabupatens.get(kabupatenName));

                kabupaten.currMonthRevenue = Number(row.currMonthKabupatenRev)
            })

            prevMonthRevenue.forEach((row) => {
                const regionalName = row.region;
                const branchName = row.branch;
                const subbranchName = row.subbranch;
                const clusterName = row.cluster;
                const kabupatenName = row.kabupaten;

                const regional = regionalsMap.get(regionalName) || regionalsMap.set(regionalName, {
                    name: regionalName,
                    currMonthRevenue: 0,
                    currMonthTarget: 0,
                    currYtdRevenue: 0,
                    prevYtdRevenue: 0,
                    prevMonthRevenue: 0,
                    prevYearCurrMonthRevenue: 0,
                    branches: new Map()
                }).get(regionalName);
                regional.prevMonthRevenue = Number(row.prevMonthRegionalRev)

                const branch = regional.branches.get(branchName) ||
                    (regional.branches.set(branchName, {
                        name: branchName,
                        currMonthRevenue: 0,
                        currMonthTarget: 0,
                        currYtdRevenue: 0,
                        prevYtdRevenue: 0,
                        prevMonthRevenue: 0,
                        prevYearCurrMonthRevenue: 0,
                        subbranches: new Map()
                    }), regional.branches.get(branchName));  // Get the newly set value
                branch.prevMonthRevenue = Number(row.prevMonthBranchRev)

                // Initialize subbranch if it doesn't exist
                const subbranch = branch.subbranches.get(subbranchName) ||
                    (branch.subbranches.set(subbranchName, {
                        name: subbranchName,
                        currMonthRevenue: 0,
                        currMonthTarget: 0,
                        currYtdRevenue: 0,
                        prevYtdRevenue: 0,
                        prevMonthRevenue: 0,
                        prevYearCurrMonthRevenue: 0,
                        clusters: new Map()
                    }), branch.subbranches.get(subbranchName));
                subbranch.prevMonthRevenue = Number(row.prevMonthSubbranchRev)

                // Initialize cluster if it doesn't exist
                const cluster = subbranch.clusters.get(clusterName) ||
                    (subbranch.clusters.set(clusterName, {
                        name: clusterName,
                        currMonthRevenue: 0,
                        currMonthTarget: 0,
                        currYtdRevenue: 0,
                        prevYtdRevenue: 0,
                        prevMonthRevenue: 0,
                        prevYearCurrMonthRevenue: 0,
                        kabupatens: new Map()
                    }), subbranch.clusters.get(clusterName));
                cluster.prevMonthRevenue = Number(row.prevMonthClusterRev)

                // Initialize kabupaten if it doesn't exist
                const kabupaten = cluster.kabupatens.get(kabupatenName) ||
                    (cluster.kabupatens.set(kabupatenName, {
                        name: kabupatenName,
                        currMonthRevenue: 0,
                        currMonthTarget: 0,
                        currYtdRevenue: 0,
                        prevYtdRevenue: 0,
                        prevMonthRevenue: 0,
                        prevYearCurrMonthRevenue: 0
                    }), cluster.kabupatens.get(kabupatenName));
                kabupaten.prevMonthRevenue = Number(row.prevMonthKabupatenRev)
            })

            prevYearCurrMonthRevenue.forEach((row) => {
                const regionalName = row.region;
                const branchName = row.branch;
                const subbranchName = row.subbranch;
                const clusterName = row.cluster;
                const kabupatenName = row.kabupaten;

                const regional = regionalsMap.get(regionalName) || regionalsMap.set(regionalName, {
                    name: regionalName,
                    currMonthRevenue: 0,
                    currMonthTarget: 0,
                    currYtdRevenue: 0,
                    prevYtdRevenue: 0,
                    prevMonthRevenue: 0,
                    prevYearCurrMonthRevenue: 0,
                    branches: new Map()
                }).get(regionalName);
                regional.prevYearCurrMonthRevenue = Number(row.prevYearCurrMonthRegionalRev)

                const branch = regional.branches.get(branchName) ||
                    (regional.branches.set(branchName, {
                        name: branchName,
                        currMonthRevenue: 0,
                        currMonthTarget: 0,
                        currYtdRevenue: 0,
                        prevYtdRevenue: 0,
                        prevMonthRevenue: 0,
                        prevYearCurrMonthRevenue: 0,
                        subbranches: new Map()
                    }), regional.branches.get(branchName));  // Get the newly set value
                branch.prevYearCurrMonthRevenue = Number(row.prevYearCurrMonthBranchRev)

                // Initialize subbranch if it doesn't exist
                const subbranch = branch.subbranches.get(subbranchName) ||
                    (branch.subbranches.set(subbranchName, {
                        name: subbranchName,
                        currMonthRevenue: 0,
                        currMonthTarget: 0,
                        currYtdRevenue: 0,
                        prevYtdRevenue: 0,
                        prevMonthRevenue: 0,
                        prevYearCurrMonthRevenue: 0,
                        clusters: new Map()
                    }), branch.subbranches.get(subbranchName));
                subbranch.prevYearCurrMonthRevenue = Number(row.prevYearCurrMonthSubbranchRev)

                // Initialize cluster if it doesn't exist
                const cluster = subbranch.clusters.get(clusterName) ||
                    (subbranch.clusters.set(clusterName, {
                        name: clusterName,
                        currMonthRevenue: 0,
                        currMonthTarget: 0,
                        currYtdRevenue: 0,
                        prevYtdRevenue: 0,
                        prevMonthRevenue: 0,
                        prevYearCurrMonthRevenue: 0,
                        kabupatens: new Map()
                    }), subbranch.clusters.get(clusterName));
                cluster.prevYearCurrMonthRevenue = Number(row.prevYearCurrMonthClusterRev)

                // Initialize kabupaten if it doesn't exist
                const kabupaten = cluster.kabupatens.get(kabupatenName) ||
                    (cluster.kabupatens.set(kabupatenName, {
                        name: kabupatenName,
                        currMonthRevenue: 0,
                        currMonthTarget: 0,
                        currYtdRevenue: 0,
                        prevYtdRevenue: 0,
                        prevMonthRevenue: 0,
                        prevYearCurrMonthRevenue: 0
                    }), cluster.kabupatens.get(kabupatenName));
                kabupaten.prevYearCurrMonthRevenue = Number(row.prevYearCurrMonthKabupatenRev)
            })

            currYtdRevenue.forEach((row: any) => {
                const regionalName = row.region;
                const branchName = row.branch;
                const subbranchName = row.subbranch;
                const clusterName = row.cluster;
                const kabupatenName = row.kabupaten;

                const regional = regionalsMap.get(regionalName) || regionalsMap.set(regionalName, {
                    name: regionalName,
                    currMonthRevenue: 0,
                    currMonthTarget: 0,
                    currYtdRevenue: 0,
                    prevYtdRevenue: 0,
                    prevMonthRevenue: 0,
                    prevYearCurrMonthRevenue: 0,
                    branches: new Map()
                }).get(regionalName);
                regional.currYtdRevenue = Number(row.currYtdRegionalRev)

                const branch = regional.branches.get(branchName) ||
                    (regional.branches.set(branchName, {
                        name: branchName,
                        currMonthRevenue: 0,
                        currMonthTarget: 0,
                        currYtdRevenue: 0,
                        prevYtdRevenue: 0,
                        prevMonthRevenue: 0,
                        prevYearCurrMonthRevenue: 0,
                        subbranches: new Map()
                    }), regional.branches.get(branchName));  // Get the newly set value
                branch.currYtdRevenue = Number(row.currYtdBranchRev)

                // Initialize subbranch if it doesn't exist
                const subbranch = branch.subbranches.get(subbranchName) ||
                    (branch.subbranches.set(subbranchName, {
                        name: subbranchName,
                        currMonthRevenue: 0,
                        currMonthTarget: 0,
                        currYtdRevenue: 0,
                        prevYtdRevenue: 0,
                        prevMonthRevenue: 0,
                        prevYearCurrMonthRevenue: 0,
                        clusters: new Map()
                    }), branch.subbranches.get(subbranchName));
                subbranch.currYtdRevenue = Number(row.currYtdSubbranchRev)

                // Initialize cluster if it doesn't exist
                const cluster = subbranch.clusters.get(clusterName) ||
                    (subbranch.clusters.set(clusterName, {
                        name: clusterName,
                        currMonthRevenue: 0,
                        currMonthTarget: 0,
                        currYtdRevenue: 0,
                        prevYtdRevenue: 0,
                        prevMonthRevenue: 0,
                        prevYearCurrMonthRevenue: 0,
                        kabupatens: new Map()
                    }), subbranch.clusters.get(clusterName));
                cluster.currYtdRevenue = Number(row.currYtdClusterRev)

                // Initialize kabupaten if it doesn't exist
                const kabupaten = cluster.kabupatens.get(kabupatenName) ||
                    (cluster.kabupatens.set(kabupatenName, {
                        name: kabupatenName,
                        currMonthRevenue: 0,
                        currMonthTarget: 0,
                        currYtdRevenue: 0,
                        prevYtdRevenue: 0,
                        prevMonthRevenue: 0,
                        prevYearCurrMonthRevenue: 0
                    }), cluster.kabupatens.get(kabupatenName));
                kabupaten.currYtdRevenue = Number(row.currYtdKabupatenRev)
            })

            prevYtdRevenue.forEach((row: any) => {
                const regionalName = row.region;
                const branchName = row.branch;
                const subbranchName = row.subbranch;
                const clusterName = row.cluster;
                const kabupatenName = row.kabupaten;

                const regional = regionalsMap.get(regionalName) || regionalsMap.set(regionalName, {
                    name: regionalName,
                    currMonthRevenue: 0,
                    currMonthTarget: 0,
                    currYtdRevenue: 0,
                    prevYtdRevenue: 0,
                    prevMonthRevenue: 0,
                    prevYearCurrMonthRevenue: 0,
                    branches: new Map()
                }).get(regionalName);
                regional.prevYtdRevenue = Number(row.prevYtdRegionalRev)

                const branch = regional.branches.get(branchName) ||
                    (regional.branches.set(branchName, {
                        name: branchName,
                        currMonthRevenue: 0,
                        currMonthTarget: 0,
                        currYtdRevenue: 0,
                        prevYtdRevenue: 0,
                        prevMonthRevenue: 0,
                        prevYearCurrMonthRevenue: 0,
                        subbranches: new Map()
                    }), regional.branches.get(branchName));  // Get the newly set value
                branch.prevYtdRevenue = Number(row.prevYtdBranchRev)

                // Initialize subbranch if it doesn't exist
                const subbranch = branch.subbranches.get(subbranchName) ||
                    (branch.subbranches.set(subbranchName, {
                        name: subbranchName,
                        currMonthRevenue: 0,
                        currMonthTarget: 0,
                        currYtdRevenue: 0,
                        prevYtdRevenue: 0,
                        prevMonthRevenue: 0,
                        prevYearCurrMonthRevenue: 0,
                        clusters: new Map()
                    }), branch.subbranches.get(subbranchName));
                subbranch.prevYtdRevenue = Number(row.prevYtdSubbranchRev)

                // Initialize cluster if it doesn't exist
                const cluster = subbranch.clusters.get(clusterName) ||
                    (subbranch.clusters.set(clusterName, {
                        name: clusterName,
                        currMonthRevenue: 0,
                        currMonthTarget: 0,
                        currYtdRevenue: 0,
                        prevYtdRevenue: 0,
                        prevMonthRevenue: 0,
                        prevYearCurrMonthRevenue: 0,
                        kabupatens: new Map()
                    }), subbranch.clusters.get(clusterName));
                cluster.prevYtdRevenue = Number(row.prevYtdClusterRev)

                // Initialize kabupaten if it doesn't exist
                const kabupaten = cluster.kabupatens.get(kabupatenName) ||
                    (cluster.kabupatens.set(kabupatenName, {
                        name: kabupatenName,
                        currMonthRevenue: 0,
                        currMonthTarget: 0,
                        currYtdRevenue: 0,
                        prevYtdRevenue: 0,
                        prevMonthRevenue: 0,
                        prevYearCurrMonthRevenue: 0
                    }), cluster.kabupatens.get(kabupatenName));
                kabupaten.prevYtdRevenue = Number(row.prevYtdKabupatenRev)
            })

            const finalDataRevenue: Regional[] = Array.from(regionalsMap.values()).map((regional: any) => ({
                ...regional,
                branches: Array.from(regional.branches.values()).map((branch: any) => ({
                    ...branch,
                    subbranches: Array.from(branch.subbranches.values()).map((subbranch: any) => ({
                        ...subbranch,
                        clusters: Array.from(subbranch.clusters.values().map((cluster: any) => ({
                            ...cluster,
                            kabupatens: Array.from(cluster.kabupatens.values())
                        }))),
                    })),
                })),
            }));

            return c.json({ data: finalDataRevenue }, 200);
        })

export default app;

