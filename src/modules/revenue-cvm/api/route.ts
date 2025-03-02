import { Hono } from "hono";
import { z } from 'zod'
import { and, asc, between, eq, isNotNull, like, notInArray, sql } from "drizzle-orm";
import { subMonths, subDays, format, subYears } from 'date-fns'

import { db, db2 } from "@/db";
import {
    branches,
    regionals,
    clusters,
    kabupatens,
    subbranches,
    revenueCVM,
} from "@/db/schema";
import { zValidator } from "@/lib/validator-wrapper";
import { dynamicRevenueCVMTable } from "@/db/schema2";

const app = new Hono().get("/",
    zValidator('query', z.object({ date: z.string().optional() })),
    async (c) => {
        const { date } = c.req.valid('query')
        const selectedDate = date ? new Date(date) : new Date()
        const month = (subDays(selectedDate, 3).getMonth() + 1).toString()

        // KOLOM DINAMIS UNTUK MEMILIH ANTARA KOLOM `m1-m12`
        const monthColumn = `m${month}` as keyof typeof revenueCVM.$inferSelect

        // VARIABLE TANGGAL UNTUK IMPORT TABEL SECARA DINAMIS
        const latestDataDate = subDays(selectedDate, 3);

        const currMonth = format(latestDataDate, 'MM')
        const currYear = format(latestDataDate, 'yyyy')
        const isPrevMonthLastYear = currMonth === '01'
        const prevMonth = isPrevMonthLastYear ? '12' : format(subMonths(latestDataDate, 1), 'MM')
        const prevMonthYear = isPrevMonthLastYear ? format(subYears(latestDataDate, 1), 'yyyy') : format(latestDataDate, 'yyyy')
        const prevYear = format(subYears(latestDataDate, 1), 'yyyy')

        // TABEL `bba_broadband_daily_`
        const currRevCVM = dynamicRevenueCVMTable(currYear, currMonth)
        const prevMonthRevCVM = dynamicRevenueCVMTable(prevMonthYear, prevMonth)
        const prevYearCurrMonthRevCVM = dynamicRevenueCVMTable(prevYear, currMonth)

        // VARIABLE TANGGAL
        const firstDayOfCurrMonth = format(new Date(latestDataDate.getFullYear(), latestDataDate.getMonth(), 1), 'yyyy-MM-dd')
        const firstDayOfPrevMonth = format(subMonths(new Date(latestDataDate.getFullYear(), latestDataDate.getMonth(), 1), 1), 'yyyy-MM-dd')
        const firstDayOfPrevYearCurrMonth = format(subYears(new Date(latestDataDate.getFullYear(), latestDataDate.getMonth(), 1), 1), 'yyyy-MM-dd')
        const currDate = format(latestDataDate, 'yyyy-MM-dd')
        const prevDate = format(subMonths(latestDataDate, 1), 'yyyy-MM-dd')
        const prevYearCurrDate = format(subYears(latestDataDate, 1), 'yyyy-MM-dd')

        const sq2 = db2
            .select({
                regionName: currRevCVM.region,
                branchName: sql<string>`
CASE
 WHEN ${currRevCVM.city} IN (
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
 WHEN ${currRevCVM.city} IN (
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
 WHEN ${currRevCVM.city} IN (
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
 WHEN ${currRevCVM.city} IN (
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
 WHEN ${currRevCVM.city} IN (
     'AMBON',
     'KOTA AMBON',
     'MALUKU TENGAH',
     'SERAM BAGIAN TIMUR'
 ) THEN 'AMBON'
 WHEN ${currRevCVM.city} IN (
     'KEPULAUAN ARU',
     'KOTA TUAL',
     'MALUKU BARAT DAYA',
     'MALUKU TENGGARA',
     'MALUKU TENGGARA BARAT',
     'KEPULAUAN TANIMBAR'
 ) THEN 'KEPULAUAN AMBON'
 WHEN ${currRevCVM.city} IN ('BURU', 'BURU SELATAN', 'SERAM BAGIAN BARAT') THEN 'SERAM BURU'
 WHEN ${currRevCVM.city} IN ('KOTA JAYAPURA') THEN 'JAYAPURA'
 WHEN ${currRevCVM.city} IN (
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
 WHEN ${currRevCVM.city} IN ('MANOKWARI') THEN 'MANOKWARI'
 WHEN ${currRevCVM.city} IN (
     'FAKFAK',
     'FAK FAK',
     'KAIMANA',
     'MANOKWARI SELATAN',
     'PEGUNUNGAN ARFAK',
     'TELUK BINTUNI',
     'TELUK WONDAMA'
 ) THEN 'MANOKWARI OUTER'
 WHEN ${currRevCVM.city} IN (
     'KOTA SORONG',
     'MAYBRAT',
     'RAJA AMPAT',
     'SORONG',
     'SORONG SELATAN',
     'TAMBRAUW'
 ) THEN 'SORONG RAJA AMPAT'
 WHEN ${currRevCVM.city} IN ('ASMAT', 'BOVEN DIGOEL', 'MAPPI', 'MERAUKE') THEN 'MERAUKE'
 WHEN ${currRevCVM.city} IN (
     'INTAN JAYA',
     'MIMIKA',
     'PUNCAK',
     'PUNCAK JAYA',
     'TIMIKA'
 ) THEN 'MIMIKA'
 WHEN ${currRevCVM.city} IN ('DEIYAI', 'DOGIYAI', 'NABIRE', 'PANIAI') THEN 'NABIRE'
 ELSE NULL
END
                `.as('subbranchName'),
                clusterName: sql<string>`
CASE
 WHEN ${currRevCVM.city} IN (
     'KOTA AMBON',
     'MALUKU TENGAH',
     'SERAM BAGIAN TIMUR'
 ) THEN 'AMBON'
 WHEN ${currRevCVM.city} IN (
     'KEPULAUAN ARU',
     'KOTA TUAL',
     'MALUKU BARAT DAYA',
     'MALUKU TENGGARA',
     'MALUKU TENGGARA BARAT',
     'KEPULAUAN TANIMBAR'
 ) THEN 'KEPULAUAN TUAL'
 WHEN ${currRevCVM.city} IN ('BURU', 'BURU SELATAN', 'SERAM BAGIAN BARAT') THEN 'SERAM BARAT BURU'
 WHEN ${currRevCVM.city} IN ('KOTA JAYAPURA') THEN 'KOTA JAYAPURA'
 WHEN ${currRevCVM.city} IN ('JAYAPURA', 'KEEROM', 'MAMBERAMO RAYA', 'SARMI') THEN 'JAYAPURA OUTER'
 WHEN ${currRevCVM.city} IN (
     'BIAK',
     'BIAK NUMFOR',
     'KEPULAUAN YAPEN',
     'SUPIORI',
     'WAROPEN'
 ) THEN 'NEW BIAK NUMFOR'
 WHEN ${currRevCVM.city} IN (
     'JAYAWIJAYA',
     'LANNY JAYA',
     'MAMBERAMO TENGAH',
     'NDUGA',
     'PEGUNUNGAN BINTANG',
     'TOLIKARA',
     'YAHUKIMO',
     'YALIMO'
 ) THEN 'PAPUA PEGUNUNGAN'
 WHEN ${currRevCVM.city} IN ('MANOKWARI') THEN 'MANOKWARI'
 WHEN ${currRevCVM.city} IN (
     'FAKFAK',
     'FAK FAK',
     'KAIMANA',
     'MANOKWARI SELATAN',
     'PEGUNUNGAN ARFAK',
     'TELUK BINTUNI',
     'TELUK WONDAMA'
 ) THEN 'MANOKWARI OUTER'
 WHEN ${currRevCVM.city} IN (
     'KOTA SORONG',
     'MAYBRAT',
     'RAJA AMPAT',
     'SORONG',
     'SORONG SELATAN',
     'TAMBRAUW'
 ) THEN 'NEW SORONG RAJA AMPAT'
 WHEN ${currRevCVM.city} IN (
     'INTAN JAYA',
     'MIMIKA',
     'PUNCAK',
     'PUNCAK JAYA',
     'TIMIKA'
 ) THEN 'MIMIKA PUNCAK'
 WHEN ${currRevCVM.city} IN ('DEIYAI', 'DOGIYAI', 'NABIRE', 'PANIAI') THEN 'NABIRE'
 WHEN ${currRevCVM.city} IN ('ASMAT', 'BOVEN DIGOEL', 'MAPPI', 'MERAUKE') THEN 'NEW MERAUKE'
 ELSE NULL
END
                `.as('clusterName'),
                cityName: currRevCVM.city,
                rev: currRevCVM.revenue,
                trxDate: currRevCVM.trxDate
            })
            .from(currRevCVM)
            .where(and(
                notInArray(currRevCVM.city, ['TMP']),
                and(
                    like(currRevCVM.packageGroup, '%CVM%'),
                    between(currRevCVM.trxDate, firstDayOfCurrMonth, currDate)
                )
            ))
            .as('sq2')

        const regClassP2 = db2.select({
            trxDate: sq2.trxDate,
            regionName: sq2.regionName,
            branchName: sq2.branchName,
            subbranchName: sq2.subbranchName,
            clusterName: sq2.clusterName,
            cityName: sq2.cityName,
            revenue: sq2.rev
        })
            .from(sq2)
            .as('regionClassififcation')

        const sq3 = db2
            .select({
                regionName: prevMonthRevCVM.region,
                branchName: sql<string>`
CASE
 WHEN ${prevMonthRevCVM.city} IN (
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
 WHEN ${prevMonthRevCVM.city} IN (
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
 WHEN ${prevMonthRevCVM.city} IN (
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
 WHEN ${prevMonthRevCVM.city} IN (
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
 WHEN ${prevMonthRevCVM.city} IN (
     'AMBON',
     'KOTA AMBON',
     'MALUKU TENGAH',
     'SERAM BAGIAN TIMUR'
 ) THEN 'AMBON'
 WHEN ${prevMonthRevCVM.city} IN (
     'KEPULAUAN ARU',
     'KOTA TUAL',
     'MALUKU BARAT DAYA',
     'MALUKU TENGGARA',
     'MALUKU TENGGARA BARAT',
     'KEPULAUAN TANIMBAR'
 ) THEN 'KEPULAUAN AMBON'
 WHEN ${prevMonthRevCVM.city} IN ('BURU', 'BURU SELATAN', 'SERAM BAGIAN BARAT') THEN 'SERAM BURU'
 WHEN ${prevMonthRevCVM.city} IN ('KOTA JAYAPURA') THEN 'JAYAPURA'
 WHEN ${prevMonthRevCVM.city} IN (
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
 WHEN ${prevMonthRevCVM.city} IN ('MANOKWARI') THEN 'MANOKWARI'
 WHEN ${prevMonthRevCVM.city} IN (
     'FAKFAK',
     'FAK FAK',
     'KAIMANA',
     'MANOKWARI SELATAN',
     'PEGUNUNGAN ARFAK',
     'TELUK BINTUNI',
     'TELUK WONDAMA'
 ) THEN 'MANOKWARI OUTER'
 WHEN ${prevMonthRevCVM.city} IN (
     'KOTA SORONG',
     'MAYBRAT',
     'RAJA AMPAT',
     'SORONG',
     'SORONG SELATAN',
     'TAMBRAUW'
 ) THEN 'SORONG RAJA AMPAT'
 WHEN ${prevMonthRevCVM.city} IN ('ASMAT', 'BOVEN DIGOEL', 'MAPPI', 'MERAUKE') THEN 'MERAUKE'
 WHEN ${prevMonthRevCVM.city} IN (
     'INTAN JAYA',
     'MIMIKA',
     'PUNCAK',
     'PUNCAK JAYA',
     'TIMIKA'
 ) THEN 'MIMIKA'
 WHEN ${prevMonthRevCVM.city} IN ('DEIYAI', 'DOGIYAI', 'NABIRE', 'PANIAI') THEN 'NABIRE'
 ELSE NULL
END
                `.as('subbranchName'),
                clusterName: sql<string>`
CASE
 WHEN ${prevMonthRevCVM.city} IN (
     'KOTA AMBON',
     'MALUKU TENGAH',
     'SERAM BAGIAN TIMUR'
 ) THEN 'AMBON'
 WHEN ${prevMonthRevCVM.city} IN (
     'KEPULAUAN ARU',
     'KOTA TUAL',
     'MALUKU BARAT DAYA',
     'MALUKU TENGGARA',
     'MALUKU TENGGARA BARAT',
     'KEPULAUAN TANIMBAR'
 ) THEN 'KEPULAUAN TUAL'
 WHEN ${prevMonthRevCVM.city} IN ('BURU', 'BURU SELATAN', 'SERAM BAGIAN BARAT') THEN 'SERAM BARAT BURU'
 WHEN ${prevMonthRevCVM.city} IN ('KOTA JAYAPURA') THEN 'KOTA JAYAPURA'
 WHEN ${prevMonthRevCVM.city} IN ('JAYAPURA', 'KEEROM', 'MAMBERAMO RAYA', 'SARMI') THEN 'JAYAPURA OUTER'
 WHEN ${prevMonthRevCVM.city} IN (
     'BIAK',
     'BIAK NUMFOR',
     'KEPULAUAN YAPEN',
     'SUPIORI',
     'WAROPEN'
 ) THEN 'NEW BIAK NUMFOR'
 WHEN ${prevMonthRevCVM.city} IN (
     'JAYAWIJAYA',
     'LANNY JAYA',
     'MAMBERAMO TENGAH',
     'NDUGA',
     'PEGUNUNGAN BINTANG',
     'TOLIKARA',
     'YAHUKIMO',
     'YALIMO'
 ) THEN 'PAPUA PEGUNUNGAN'
 WHEN ${prevMonthRevCVM.city} IN ('MANOKWARI') THEN 'MANOKWARI'
 WHEN ${prevMonthRevCVM.city} IN (
     'FAKFAK',
     'FAK FAK',
     'KAIMANA',
     'MANOKWARI SELATAN',
     'PEGUNUNGAN ARFAK',
     'TELUK BINTUNI',
     'TELUK WONDAMA'
 ) THEN 'MANOKWARI OUTER'
 WHEN ${prevMonthRevCVM.city} IN (
     'KOTA SORONG',
     'MAYBRAT',
     'RAJA AMPAT',
     'SORONG',
     'SORONG SELATAN',
     'TAMBRAUW'
 ) THEN 'NEW SORONG RAJA AMPAT'
 WHEN ${prevMonthRevCVM.city} IN (
     'INTAN JAYA',
     'MIMIKA',
     'PUNCAK',
     'PUNCAK JAYA',
     'TIMIKA'
 ) THEN 'MIMIKA PUNCAK'
 WHEN ${prevMonthRevCVM.city} IN ('DEIYAI', 'DOGIYAI', 'NABIRE', 'PANIAI') THEN 'NABIRE'
 WHEN ${prevMonthRevCVM.city} IN ('ASMAT', 'BOVEN DIGOEL', 'MAPPI', 'MERAUKE') THEN 'NEW MERAUKE'
 ELSE NULL
END
                `.as('clusterName'),
                cityName: prevMonthRevCVM.city,
                rev: prevMonthRevCVM.revenue,
                trxDate: prevMonthRevCVM.trxDate
            })
            .from(prevMonthRevCVM)
            .where(and(
                notInArray(prevMonthRevCVM.city, ['TMP']),
                and(
                    like(prevMonthRevCVM.packageGroup, '%CVM%'),
                    between(prevMonthRevCVM.trxDate, firstDayOfPrevMonth, prevDate)
                )
            ))
            .as('sq3')

        const regClassP3 = db2.select({
            trxDate: sq3.trxDate,
            regionName: sq3.regionName,
            branchName: sq3.branchName,
            subbranchName: sq3.subbranchName,
            clusterName: sq3.clusterName,
            cityName: sq3.cityName,
            revenue: sq3.rev
        })
            .from(sq3)
            .as('regionClassififcation')

        const sq4 = db2
            .select({
                regionName: prevYearCurrMonthRevCVM.region,
                branchName: sql<string>`
CASE
 WHEN ${prevYearCurrMonthRevCVM.city} IN (
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
 WHEN ${prevYearCurrMonthRevCVM.city} IN (
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
 WHEN ${prevYearCurrMonthRevCVM.city} IN (
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
 WHEN ${prevYearCurrMonthRevCVM.city} IN (
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
 WHEN ${prevYearCurrMonthRevCVM.city} IN (
     'AMBON',
     'KOTA AMBON',
     'MALUKU TENGAH',
     'SERAM BAGIAN TIMUR'
 ) THEN 'AMBON'
 WHEN ${prevYearCurrMonthRevCVM.city} IN (
     'KEPULAUAN ARU',
     'KOTA TUAL',
     'MALUKU BARAT DAYA',
     'MALUKU TENGGARA',
     'MALUKU TENGGARA BARAT',
     'KEPULAUAN TANIMBAR'
 ) THEN 'KEPULAUAN AMBON'
 WHEN ${prevYearCurrMonthRevCVM.city} IN ('BURU', 'BURU SELATAN', 'SERAM BAGIAN BARAT') THEN 'SERAM BURU'
 WHEN ${prevYearCurrMonthRevCVM.city} IN ('KOTA JAYAPURA') THEN 'JAYAPURA'
 WHEN ${prevYearCurrMonthRevCVM.city} IN (
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
 WHEN ${prevYearCurrMonthRevCVM.city} IN ('MANOKWARI') THEN 'MANOKWARI'
 WHEN ${prevYearCurrMonthRevCVM.city} IN (
     'FAKFAK',
     'FAK FAK',
     'KAIMANA',
     'MANOKWARI SELATAN',
     'PEGUNUNGAN ARFAK',
     'TELUK BINTUNI',
     'TELUK WONDAMA'
 ) THEN 'MANOKWARI OUTER'
 WHEN ${prevYearCurrMonthRevCVM.city} IN (
     'KOTA SORONG',
     'MAYBRAT',
     'RAJA AMPAT',
     'SORONG',
     'SORONG SELATAN',
     'TAMBRAUW'
 ) THEN 'SORONG RAJA AMPAT'
 WHEN ${prevYearCurrMonthRevCVM.city} IN ('ASMAT', 'BOVEN DIGOEL', 'MAPPI', 'MERAUKE') THEN 'MERAUKE'
 WHEN ${prevYearCurrMonthRevCVM.city} IN (
     'INTAN JAYA',
     'MIMIKA',
     'PUNCAK',
     'PUNCAK JAYA',
     'TIMIKA'
 ) THEN 'MIMIKA'
 WHEN ${prevYearCurrMonthRevCVM.city} IN ('DEIYAI', 'DOGIYAI', 'NABIRE', 'PANIAI') THEN 'NABIRE'
 ELSE NULL
END
                `.as('subbranchName'),
                clusterName: sql<string>`
CASE
 WHEN ${prevYearCurrMonthRevCVM.city} IN (
     'KOTA AMBON',
     'MALUKU TENGAH',
     'SERAM BAGIAN TIMUR'
 ) THEN 'AMBON'
 WHEN ${prevYearCurrMonthRevCVM.city} IN (
     'KEPULAUAN ARU',
     'KOTA TUAL',
     'MALUKU BARAT DAYA',
     'MALUKU TENGGARA',
     'MALUKU TENGGARA BARAT',
     'KEPULAUAN TANIMBAR'
 ) THEN 'KEPULAUAN TUAL'
 WHEN ${prevYearCurrMonthRevCVM.city} IN ('BURU', 'BURU SELATAN', 'SERAM BAGIAN BARAT') THEN 'SERAM BARAT BURU'
 WHEN ${prevYearCurrMonthRevCVM.city} IN ('KOTA JAYAPURA') THEN 'KOTA JAYAPURA'
 WHEN ${prevYearCurrMonthRevCVM.city} IN ('JAYAPURA', 'KEEROM', 'MAMBERAMO RAYA', 'SARMI') THEN 'JAYAPURA OUTER'
 WHEN ${prevYearCurrMonthRevCVM.city} IN (
     'BIAK',
     'BIAK NUMFOR',
     'KEPULAUAN YAPEN',
     'SUPIORI',
     'WAROPEN'
 ) THEN 'NEW BIAK NUMFOR'
 WHEN ${prevYearCurrMonthRevCVM.city} IN (
     'JAYAWIJAYA',
     'LANNY JAYA',
     'MAMBERAMO TENGAH',
     'NDUGA',
     'PEGUNUNGAN BINTANG',
     'TOLIKARA',
     'YAHUKIMO',
     'YALIMO'
 ) THEN 'PAPUA PEGUNUNGAN'
 WHEN ${prevYearCurrMonthRevCVM.city} IN ('MANOKWARI') THEN 'MANOKWARI'
 WHEN ${prevYearCurrMonthRevCVM.city} IN (
     'FAKFAK',
     'FAK FAK',
     'KAIMANA',
     'MANOKWARI SELATAN',
     'PEGUNUNGAN ARFAK',
     'TELUK BINTUNI',
     'TELUK WONDAMA'
 ) THEN 'MANOKWARI OUTER'
 WHEN ${prevYearCurrMonthRevCVM.city} IN (
     'KOTA SORONG',
     'MAYBRAT',
     'RAJA AMPAT',
     'SORONG',
     'SORONG SELATAN',
     'TAMBRAUW'
 ) THEN 'NEW SORONG RAJA AMPAT'
 WHEN ${prevYearCurrMonthRevCVM.city} IN (
     'INTAN JAYA',
     'MIMIKA',
     'PUNCAK',
     'PUNCAK JAYA',
     'TIMIKA'
 ) THEN 'MIMIKA PUNCAK'
 WHEN ${prevYearCurrMonthRevCVM.city} IN ('DEIYAI', 'DOGIYAI', 'NABIRE', 'PANIAI') THEN 'NABIRE'
 WHEN ${prevYearCurrMonthRevCVM.city} IN ('ASMAT', 'BOVEN DIGOEL', 'MAPPI', 'MERAUKE') THEN 'NEW MERAUKE'
 ELSE NULL
END
                `.as('clusterName'),
                cityName: prevYearCurrMonthRevCVM.city,
                rev: prevYearCurrMonthRevCVM.revenue,
                trxDate: prevYearCurrMonthRevCVM.trxDate
            })
            .from(prevYearCurrMonthRevCVM)
            .where(and(
                notInArray(prevYearCurrMonthRevCVM.city, ['TMP']),
                and(
                    like(prevYearCurrMonthRevCVM.packageGroup, '%CVM%'),
                    between(prevYearCurrMonthRevCVM.trxDate, firstDayOfPrevYearCurrMonth, currDate)
                )
            ))
            .as('sq4')

        const regClassP4 = db2.select({
            trxDate: sq4.trxDate,
            regionName: sq4.regionName,
            branchName: sq4.branchName,
            subbranchName: sq4.subbranchName,
            clusterName: sq4.clusterName,
            cityName: sq4.cityName,
            revenue: sq4.rev
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
                currMonthTargetRev: sql<number>`CAST(SUM(${revenueCVM[monthColumn]}) AS DOUBLE PRECISION)`.as('currMonthTargetRev')
            })
            .from(regionals)
            .leftJoin(branches, eq(regionals.id, branches.regionalId))
            .leftJoin(subbranches, eq(branches.id, subbranches.branchId))
            .leftJoin(clusters, eq(subbranches.id, clusters.subbranchId))
            .leftJoin(kabupatens, eq(clusters.id, kabupatens.clusterId))
            .leftJoin(revenueCVM, eq(kabupatens.id, revenueCVM.kabupatenId))
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
        const p2 = db2
            .select({
                region: sql<string>`${regClassP2.regionName}`.as('region'),
                branch: sql<string>`${regClassP2.branchName}`.as('branch'), // Keep only one branchName
                subbranch: sql<string>`${regClassP2.subbranchName}`.as('subbranch'),
                cluster: sql<string>`${regClassP2.clusterName}`.as('cluster'),
                kabupaten: sql<string>`${regClassP2.cityName}`.as('kabupaten'),
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
        const p3 = db2
            .select({
                region: sql<string>`${regClassP3.regionName}`.as('region'),
                branch: sql<string>`${regClassP3.branchName}`.as('branch'), // Keep only one branchName
                subbranch: sql<string>`${regClassP3.subbranchName}`.as('subbranch'),
                cluster: sql<string>`${regClassP3.clusterName}`.as('cluster'),
                kabupaten: sql<string>`${regClassP3.cityName}`.as('kabupaten'),
                prevMonthKabupatenRev: sql<number>`SUM(${regClassP3.revenue})`.as('currMonthKabupatenRev'),
                prevMonthClusterRev: sql<number>`SUM(SUM(${regClassP3.revenue})) OVER (PARTITION BY ${regClassP3.regionName}, ${regClassP3.branchName}, ${regClassP3.subbranchName}, ${regClassP3.clusterName})`.as('currMonthClusterRev'),
                prevMonthSubbranchRev: sql<number>`SUM(SUM(${regClassP3.revenue})) OVER (PARTITION BY ${regClassP3.regionName}, ${regClassP3.branchName}, ${regClassP3.subbranchName})`.as('currMonthSubbranchRev'),
                prevMonthBranchRev: sql<number>`SUM(SUM(${regClassP3.revenue})) OVER (PARTITION BY ${regClassP3.regionName}, ${regClassP3.branchName})`.as('currMonthBranchRev'),
                prevMonthRegionalRev: sql<number>`SUM(SUM(${regClassP3.revenue})) OVER (PARTITION BY ${regClassP3.regionName})`.as('currMonthRegionalRev')
            })
            .from(regClassP3)
            .groupBy(sql`1,2,3,4,5`)
            .prepare()

        // QUERY UNTUK MENDAPAT PREV YEAR CURR MONTH REVENUE
        const p4 = db2
            .select({
                region: sql<string>`${regClassP4.regionName}`.as('region'),
                branch: sql<string>`${regClassP4.branchName}`.as('branch'), // Keep only one branchName
                subbranch: sql<string>`${regClassP4.subbranchName}`.as('subbranch'),
                cluster: sql<string>`${regClassP4.clusterName}`.as('cluster'),
                kabupaten: sql<string>`${regClassP4.cityName}`.as('kabupaten'),
                prevYearCurrMonthKabupatenRev: sql<number>`SUM(${regClassP4.revenue})`.as('currMonthKabupatenRev'),
                prevYearCurrMonthClusterRev: sql<number>`SUM(SUM(${regClassP4.revenue})) OVER (PARTITION BY ${regClassP4.regionName}, ${regClassP4.branchName}, ${regClassP4.subbranchName}, ${regClassP4.clusterName})`.as('currMonthClusterRev'),
                prevYearCurrMonthSubbranchRev: sql<number>`SUM(SUM(${regClassP4.revenue})) OVER (PARTITION BY ${regClassP4.regionName}, ${regClassP4.branchName}, ${regClassP4.subbranchName})`.as('currMonthSubbranchRev'),
                prevYearCurrMonthBranchRev: sql<number>`SUM(SUM(${regClassP4.revenue})) OVER (PARTITION BY ${regClassP4.regionName}, ${regClassP4.branchName})`.as('currMonthBranchRev'),
                prevYearCurrMonthRegionalRev: sql<number>`SUM(SUM(${regClassP4.revenue})) OVER (PARTITION BY ${regClassP4.regionName})`.as('currMonthRegionalRev')
            })
            .from(regClassP4)
            .groupBy(sql`1,2,3,4,5`)
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

