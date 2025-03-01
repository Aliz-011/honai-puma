import { Hono } from "hono";
import { z } from 'zod'
import { and, asc, between, eq, isNotNull, notInArray, sql } from "drizzle-orm";
import { subMonths, subDays, format, subYears } from 'date-fns'

import { db, db4 } from "@/db";
import {
    branches,
    regionals,
    clusters,
    kabupatens,
    subbranches,
    revenueNewSales,
} from "@/db/schema";
import { zValidator } from "@/lib/validator-wrapper";
import { dynamicMergeNewSalesPumaTable } from "@/db/schema4";

const app = new Hono().get("/",
    zValidator('query', z.object({ date: z.string().optional() })),
    async (c) => {
        const { date } = c.req.valid('query')
        const selectedDate = date ? new Date(date) : new Date()
        const month = (subDays(selectedDate, 2).getMonth() + 1).toString()

        // KOLOM DINAMIS UNTUK MEMILIH ANTARA KOLOM `m1-m12`
        const monthColumn = `m${month}` as keyof typeof revenueNewSales.$inferSelect

        // VARIABLE TANGGAL UNTUK IMPORT TABEL SECARA DINAMIS
        const latestDataDate = subDays(selectedDate, 2);

        const currMonth = format(latestDataDate, 'MM')
        const currYear = format(latestDataDate, 'yyyy')
        const isPrevMonthLastYear = currMonth === '01'
        const prevMonth = isPrevMonthLastYear ? '12' : format(subMonths(latestDataDate, 1), 'MM')
        const prevMonthYear = isPrevMonthLastYear ? format(subYears(latestDataDate, 1), 'yyyy') : format(latestDataDate, 'yyyy')
        const prevYear = format(subYears(latestDataDate, 1), 'yyyy')

        // TABEL `byu_`
        const currRevNewSales = dynamicMergeNewSalesPumaTable(currYear, currMonth)
        const prevMonthRevNewSales = dynamicMergeNewSalesPumaTable(prevMonthYear, prevMonth)
        const prevYearCurrMonthRevNewSales = dynamicMergeNewSalesPumaTable(prevYear, currMonth)

        // VARIABLE TANGGAL
        const firstDayOfCurrMonth = format(new Date(latestDataDate.getFullYear(), latestDataDate.getMonth(), 1), 'yyyy-MM-dd')
        const firstDayOfPrevMonth = format(subMonths(new Date(latestDataDate.getFullYear(), latestDataDate.getMonth(), 1), 1), 'yyyy-MM-dd')
        const firstDayOfPrevYearCurrMonth = format(subYears(new Date(latestDataDate.getFullYear(), latestDataDate.getMonth(), 1), 1), 'yyyy-MM-dd')
        const currDate = format(latestDataDate, 'yyyy-MM-dd')
        const prevDate = format(subMonths(latestDataDate, 1), 'yyyy-MM-dd')
        const prevYearCurrDate = format(subYears(latestDataDate, 1), 'yyyy-MM-dd')

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
                rev: currRevNewSales.rev,
                mtdDt: currRevNewSales.mtdDt
            })
            .from(currRevNewSales)
            .where(and(
                notInArray(currRevNewSales.kabupaten, ['TMP']),
                between(currRevNewSales.mtdDt, firstDayOfCurrMonth, currDate)
            ))
            .as('sq2')

        const regClassP2 = db4.select({
            regionName: sq2.regionName,
            kabupatenName: sq2.cityName,
            branchName: sq2.branchName,
            subbranchName: sq2.subbranchName,
            clusterName: sq2.clusterName,
            revenue: sq2.rev
        })
            .from(sq2)
            .as('regionClassififcation')

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
                rev: prevMonthRevNewSales.rev,
                mtdDt: prevMonthRevNewSales.mtdDt
            })
            .from(prevMonthRevNewSales)
            .where(and(
                notInArray(prevMonthRevNewSales.kabupaten, ['TMP']),
                between(prevMonthRevNewSales.mtdDt, firstDayOfPrevMonth, prevDate)
            ))
            .as('sq3')

        const regClassP3 = db4
            .select({
                mtdDt: sq3.mtdDt,
                rev: sq3.rev,
                regionName: sq3.regionName,
                kabupatenName: sq3.cityName,
                branchName: sql<string>`
        CASE
            WHEN ${sq3.cityName} IN (
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
            WHEN ${sq3.cityName} IN (
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
            WHEN ${sq3.cityName} IN (
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
            WHEN ${sq3.cityName} IN (
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
            WHEN ${sq3.cityName} IN (
                'AMBON',
                'KOTA AMBON',
                'MALUKU TENGAH',
                'SERAM BAGIAN TIMUR'
            ) THEN 'AMBON'
            WHEN ${sq3.cityName} IN (
                'KEPULAUAN ARU',
                'KOTA TUAL',
                'MALUKU BARAT DAYA',
                'MALUKU TENGGARA',
                'MALUKU TENGGARA BARAT',
                'KEPULAUAN TANIMBAR'
            ) THEN 'KEPULAUAN AMBON'
            WHEN ${sq3.cityName} IN ('BURU', 'BURU SELATAN', 'SERAM BAGIAN BARAT') THEN 'SERAM BURU'
            WHEN ${sq3.cityName} IN ('KOTA JAYAPURA') THEN 'JAYAPURA'
            WHEN ${sq3.cityName} IN (
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
            WHEN ${sq3.cityName} IN ('MANOKWARI') THEN 'MANOKWARI'
            WHEN ${sq3.cityName} IN (
                'FAKFAK',
                'FAK FAK',
                'KAIMANA',
                'MANOKWARI SELATAN',
                'PEGUNUNGAN ARFAK',
                'TELUK BINTUNI',
                'TELUK WONDAMA'
            ) THEN 'MANOKWARI OUTER'
            WHEN ${sq3.cityName} IN (
                'KOTA SORONG',
                'MAYBRAT',
                'RAJA AMPAT',
                'SORONG',
                'SORONG SELATAN',
                'TAMBRAUW'
            ) THEN 'SORONG RAJA AMPAT'
            WHEN ${sq3.cityName} IN ('ASMAT', 'BOVEN DIGOEL', 'MAPPI', 'MERAUKE') THEN 'MERAUKE'
            WHEN ${sq3.cityName} IN (
                'INTAN JAYA',
                'MIMIKA',
                'PUNCAK',
                'PUNCAK JAYA',
                'TIMIKA'
            ) THEN 'MIMIKA'
            WHEN ${sq3.cityName} IN ('DEIYAI', 'DOGIYAI', 'NABIRE', 'PANIAI') THEN 'NABIRE'
            ELSE NULL
        END
            `.as('subbranchName'),
                clusterName: sql<string>`
        CASE
            WHEN ${sq3.cityName} IN (
                'KOTA AMBON',
                'MALUKU TENGAH',
                'SERAM BAGIAN TIMUR'
            ) THEN 'AMBON'
            WHEN ${sq3.cityName} IN (
                'KEPULAUAN ARU',
                'KOTA TUAL',
                'MALUKU BARAT DAYA',
                'MALUKU TENGGARA',
                'MALUKU TENGGARA BARAT',
                'KEPULAUAN TANIMBAR'
            ) THEN 'KEPULAUAN TUAL'
            WHEN ${sq3.cityName} IN ('BURU', 'BURU SELATAN', 'SERAM BAGIAN BARAT') THEN 'SERAM BARAT BURU'
            WHEN ${sq3.cityName} IN ('KOTA JAYAPURA') THEN 'KOTA JAYAPURA'
            WHEN ${sq3.cityName} IN ('JAYAPURA', 'KEEROM', 'MAMBERAMO RAYA', 'SARMI') THEN 'JAYAPURA OUTER'
            WHEN ${sq3.cityName} IN (
                'BIAK',
                'BIAK NUMFOR',
                'KEPULAUAN YAPEN',
                'SUPIORI',
                'WAROPEN'
            ) THEN 'NEW BIAK NUMFOR'
            WHEN ${sq3.cityName} IN (
                'JAYAWIJAYA',
                'LANNY JAYA',
                'MAMBERAMO TENGAH',
                'NDUGA',
                'PEGUNUNGAN BINTANG',
                'TOLIKARA',
                'YAHUKIMO',
                'YALIMO'
            ) THEN 'PAPUA PEGUNUNGAN'
            WHEN ${sq3.cityName} IN ('MANOKWARI') THEN 'MANOKWARI'
            WHEN ${sq3.cityName} IN (
                'FAKFAK',
                'FAK FAK',
                'KAIMANA',
                'MANOKWARI SELATAN',
                'PEGUNUNGAN ARFAK',
                'TELUK BINTUNI',
                'TELUK WONDAMA'
            ) THEN 'MANOKWARI OUTER'
            WHEN ${sq3.cityName} IN (
                'KOTA SORONG',
                'MAYBRAT',
                'RAJA AMPAT',
                'SORONG',
                'SORONG SELATAN',
                'TAMBRAUW'
            ) THEN 'NEW SORONG RAJA AMPAT'
            WHEN ${sq3.cityName} IN (
                'INTAN JAYA',
                'MIMIKA',
                'PUNCAK',
                'PUNCAK JAYA',
                'TIMIKA'
            ) THEN 'MIMIKA PUNCAK'
            WHEN ${sq3.cityName} IN ('DEIYAI', 'DOGIYAI', 'NABIRE', 'PANIAI') THEN 'NABIRE'
            WHEN ${sq3.cityName} IN ('ASMAT', 'BOVEN DIGOEL', 'MAPPI', 'MERAUKE') THEN 'NEW MERAUKE'
            ELSE NULL
        END
            `.as('clusterName'),
            })
            .from(sq3)
            .as('regionClassififcation')

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
                mtdDt: prevYearCurrMonthRevNewSales.mtdDt
            })
            .from(prevYearCurrMonthRevNewSales)
            .where(and(
                notInArray(prevYearCurrMonthRevNewSales.kabupaten, ['TMP']),
                between(prevYearCurrMonthRevNewSales.mtdDt, firstDayOfPrevYearCurrMonth, currDate)
            ))
            .as('sq4')

        const regClassP4 = db4
            .select({
                mtdDt: sq4.mtdDt,
                rev: sq4.rev,
                regionName: sq4.regionName,
                kabupatenName: sq4.cityName,
                branchName: sq4.branchName,
                subbranchName: sq4.subbranchName,
                clusterName: sq4.clusterName,
            })
            .from(sq4)
            .as('regionClassififcation')

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
            .orderBy(asc(regionals.regional), asc(branches.branchNew), asc(subbranches.subbranchNew), asc(clusters.cluster), asc(kabupatens.kabupaten))
            .prepare()

        //  QUERY UNTUK MENDAPAT CURRENT MONTH REVENUE (Mtd)
        const p2 = db4
            .select({
                region: sql<string>`${regClassP2.regionName}`.as('region'),
                branch: sql<string>`${regClassP2.branchName}`.as('branch'), // Keep only one branchName
                subbranch: sql<string>`${regClassP2.subbranchName}`.as('subbranch'),
                cluster: sql<string>`${regClassP2.clusterName}`.as('cluster'),
                kabupaten: sql<string>`${regClassP2.kabupatenName}`.as('kabupaten'),
                currMonthKabupatenRev: sql<number>`SUM(${regClassP2.revenue})`.as('currMonthKabupatenRev'),
                currMonthClusterRev: sql<number>`SUM(SUM(${regClassP2.revenue})) OVER (PARTITION BY ${regClassP2.regionName}, ${regClassP2.branchName}, ${regClassP2.subbranchName}, ${regClassP2.clusterName})`.as('currMonthClusterRev'),
                currMonthSubbranchRev: sql<number>`SUM(SUM(${regClassP2.revenue})) OVER (PARTITION BY ${regClassP2.regionName}, ${regClassP2.branchName}, ${regClassP2.subbranchName})`.as('currMonthSubbranchRev'),
                currMonthBranchRev: sql<number>`SUM(SUM(${regClassP2.revenue})) OVER (PARTITION BY ${regClassP2.regionName}, ${regClassP2.branchName})`.as('currMonthBranchRev'),
                currMonthRegionalRev: sql<number>`SUM(SUM(${regClassP2.revenue})) OVER (PARTITION BY ${regClassP2.regionName})`.as('currMonthRegionalRev')
            })
            .from(regClassP2)
            .groupBy(sql`1,2,3,4,5`)
            .prepare()

        // QUERY UNTUK MENDAPAT PREV MONTH REVENUE
        const p3 = db4
            .select({
                region: sql<string>`${regClassP3.regionName}`.as('region'),
                branch: sql<string>`${regClassP3.branchName}`.as('branch'), // Keep only one branchName
                subbranch: sql<string>`${regClassP3.subbranchName}`.as('subbranch'),
                cluster: sql<string>`${regClassP3.clusterName}`.as('cluster'),
                kabupaten: sql<string>`${regClassP3.kabupatenName}`.as('kabupaten'),
                prevMonthKabupatenRev: sql<number>`SUM(${regClassP3.rev})`.as('currMonthKabupatenRev'),
                prevMonthClusterRev: sql<number>`SUM(SUM(${regClassP3.rev})) OVER (PARTITION BY ${regClassP3.regionName}, ${regClassP3.branchName}, ${regClassP3.subbranchName}, ${regClassP3.clusterName})`.as('currMonthClusterRev'),
                prevMonthSubbranchRev: sql<number>`SUM(SUM(${regClassP3.rev})) OVER (PARTITION BY ${regClassP3.regionName}, ${regClassP3.branchName}, ${regClassP3.subbranchName})`.as('currMonthSubbranchRev'),
                prevMonthBranchRev: sql<number>`SUM(SUM(${regClassP3.rev})) OVER (PARTITION BY ${regClassP3.regionName}, ${regClassP3.branchName})`.as('currMonthBranchRev'),
                prevMonthRegionalRev: sql<number>`SUM(SUM(${regClassP3.rev})) OVER (PARTITION BY ${regClassP3.regionName})`.as('currMonthRegionalRev')
            })
            .from(regClassP3)
            .groupBy(sql`1,2,3,4,5`)
            .prepare()

        // QUERY UNTUK MENDAPAT PREV YEAR CURR MONTH REVENUE
        const p4 = db4
            .select({
                region: sql<string>`${regClassP4.regionName}`.as('region'),
                branch: sql<string>`${regClassP4.branchName}`.as('branch'), // Keep only one branchName
                subbranch: sql<string>`${regClassP4.subbranchName}`.as('subbranch'),
                cluster: sql<string>`${regClassP4.clusterName}`.as('cluster'),
                kabupaten: sql<string>`${regClassP4.kabupatenName}`.as('kabupaten'),
                prevYearCurrMonthKabupatenRev: sql<number>`SUM(${regClassP4.rev})`.as('currMonthKabupatenRev'),
                prevYearCurrMonthClusterRev: sql<number>`SUM(SUM(${regClassP4.rev})) OVER (PARTITION BY ${regClassP4.regionName}, ${regClassP4.branchName}, ${regClassP4.subbranchName}, ${regClassP4.clusterName})`.as('currMonthClusterRev'),
                prevYearCurrMonthSubbranchRev: sql<number>`SUM(SUM(${regClassP4.rev})) OVER (PARTITION BY ${regClassP4.regionName}, ${regClassP4.branchName}, ${regClassP4.subbranchName})`.as('currMonthSubbranchRev'),
                prevYearCurrMonthBranchRev: sql<number>`SUM(SUM(${regClassP4.rev})) OVER (PARTITION BY ${regClassP4.regionName}, ${regClassP4.branchName})`.as('currMonthBranchRev'),
                prevYearCurrMonthRegionalRev: sql<number>`SUM(SUM(${regClassP4.rev})) OVER (PARTITION BY ${regClassP4.regionName})`.as('currMonthRegionalRev')
            })
            .from(regClassP4)
            .prepare()

        // QUERY UNTUK YtD 2025

        const [targetRevenue, currMonthRevenue, prevMonthRevenue, prevYearCurrMonthRevenue] = await Promise.all([
            p1.execute(),
            p2.execute(),
            p3.execute(),
            p4.execute()
        ])
        // /var/lib/backup_mysql_2025/
        const regionalsMap = new Map();

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
                    prevMonthRevenue: 0,
                    prevYearCurrMonthRevenue: 0
                }), cluster.kabupatens.get(kabupatenName));
            kabupaten.prevYearCurrMonthRevenue = Number(row.prevYearCurrMonthKabupatenRev)
        })

        const finalDataRevenue = Array.from(regionalsMap.values()).map((regional: any) => ({
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
    });

export default app;

