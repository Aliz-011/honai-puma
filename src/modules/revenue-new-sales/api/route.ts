import { Hono } from "hono";
import { z } from 'zod'
import { and, asc, between, eq, isNotNull, sql } from "drizzle-orm";
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
    zValidator('query', z.object({ date: z.string().optional(), branch: z.string().optional(), subbranch: z.string().optional(), cluster: z.string().optional(), kabupaten: z.string().optional() })),
    async (c) => {
        const { branch, cluster, subbranch, kabupaten, date } = c.req.valid('query')
        const selectedDate = date ? new Date(date) : new Date()
        const month = (selectedDate.getMonth() + 1).toString()

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

        const regClassP2 = db4.select({
            mtdDt: currRevNewSales.mtdDt,
            rev: currRevNewSales.rev,
            regionName: currRevNewSales.regionSales,
            kabupatenName: currRevNewSales.kabupaten,
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
        })
            .from(currRevNewSales)
            .where(between(currRevNewSales.mtdDt, firstDayOfCurrMonth, currDate))
            .as('regionClassififcation')

        const kabSumsP2 = db4
            .select({
                region: regClassP2.regionName,
                branch: sql<string>`${regClassP2.branchName}`.as('kabBranch'),
                subbranch: sql<string>`${regClassP2.subbranchName}`.as('kabSubbranch'),
                cluster: sql<string>`${regClassP2.clusterName}`.as('kabCluster'),
                kabupaten: regClassP2.kabupatenName,
                kabupatenRev: sql<number>`CAST(SUM(${regClassP2.rev}) AS DOUBLE PRECISION)`.as('kabupatenRev')
            })
            .from(regClassP2)
            .where(isNotNull(regClassP2.branchName))
            .groupBy(regClassP2.regionName, regClassP2.branchName, regClassP2.subbranchName, regClassP2.clusterName, regClassP2.kabupatenName)
            .as('kabSums')

        const clusSumsP2 = db4
            .select({
                region: kabSumsP2.region,
                branch: sql<string>`${kabSumsP2.branch}`.as('clusBranch'),
                subbranch: sql<string>`${kabSumsP2.subbranch}`.as('clusSubbranch'),
                cluster: sql<string>`${kabSumsP2.cluster}`.as('cluster'),
                clusterRev: sql<number>`CAST(SUM(${kabSumsP2.kabupatenRev}) AS DOUBLE PRECISION)`.as('clusterRev')
            })
            .from(kabSumsP2)
            .groupBy(kabSumsP2.region, kabSumsP2.branch, kabSumsP2.subbranch, kabSumsP2.cluster)
            .as('clusSums')

        const subSumsP2 = db4
            .select({
                region: clusSumsP2.region,
                branch: sql<string>`${clusSumsP2.branch}`.as('subSumsBranch'),
                subbranch: sql<string>`${clusSumsP2.subbranch}`.as('subbranch'),
                subbranchRev: sql<number>`CAST(SUM(${clusSumsP2.clusterRev}) AS DOUBLE PRECISION)`.as('subbranchRev')
            })
            .from(clusSumsP2)
            .groupBy(clusSumsP2.region, clusSumsP2.branch, clusSumsP2.subbranch)
            .as('subSums')

        const branchSumsP2 = db4
            .select({
                region: subSumsP2.region,
                branch: sql`${subSumsP2.branch}`.as('branch'),
                branchRev: sql<number>`CAST(SUM(${subSumsP2.subbranchRev}) AS DOUBLE PRECISION)`.as('branchRev')
            })
            .from(subSumsP2)
            .groupBy(subSumsP2.region, subSumsP2.branch)
            .as('branchSums')

        const regSumsP2 = db4
            .select({
                regionName: branchSumsP2.region,
                regionalRev: sql<number>`CAST(SUM(${branchSumsP2.branchRev}) AS DOUBLE PRECISION)`.as('regionalRev')
            })
            .from(branchSumsP2)
            .groupBy(branchSumsP2.region)
            .as('regSums')

        const regClassP3 = db4
            .select({
                mtdDt: prevMonthRevNewSales.mtdDt,
                rev: prevMonthRevNewSales.rev,
                regionName: prevMonthRevNewSales.regionSales,
                kabupatenName: prevMonthRevNewSales.kabupaten,
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
            })
            .from(prevMonthRevNewSales)
            .where(between(prevMonthRevNewSales.mtdDt, firstDayOfPrevMonth, prevDate))
            .as('regionClassififcation')

        const kabSumsP3 = db4
            .select({
                region: regClassP3.regionName,
                branch: sql<string>`${regClassP3.branchName}`.as('kabBranch'),
                subbranch: sql<string>`${regClassP3.subbranchName}`.as('kabSubbranch'),
                cluster: sql<string>`${regClassP3.clusterName}`.as('kabCluster'),
                kabupaten: regClassP3.kabupatenName,
                kabupatenRev: sql<number>`CAST(SUM(${regClassP3.rev}) AS DOUBLE PRECISION)`.as('kabupatenRev')
            })
            .from(regClassP3)
            .where(isNotNull(regClassP3.branchName))
            .groupBy(regClassP3.regionName, regClassP3.branchName, regClassP3.subbranchName, regClassP3.clusterName, regClassP3.kabupatenName)
            .as('kabSums')

        const clusSumsP3 = db4
            .select({
                region: kabSumsP3.region,
                branch: sql<string>`${kabSumsP3.branch}`.as('clusBranch'),
                subbranch: sql<string>`${kabSumsP3.subbranch}`.as('clusSubbranch'),
                cluster: sql<string>`${kabSumsP3.cluster}`.as('cluster'),
                clusterRev: sql<number>`CAST(SUM(${kabSumsP3.kabupatenRev}) AS DOUBLE PRECISION)`.as('clusterRev')
            })
            .from(kabSumsP3)
            .groupBy(kabSumsP3.region, kabSumsP3.branch, kabSumsP3.subbranch, kabSumsP3.cluster)
            .as('clusSums')

        const subSumsP3 = db4
            .select({
                region: clusSumsP3.region,
                branch: sql<string>`${clusSumsP3.branch}`.as('subSumsBranch'),
                subbranch: sql<string>`${clusSumsP3.subbranch}`.as('subbranch'),
                subbranchRev: sql<number>`CAST(SUM(${clusSumsP3.clusterRev}) AS DOUBLE PRECISION)`.as('subbranchRev')
            })
            .from(clusSumsP3)
            .groupBy(clusSumsP3.region, clusSumsP3.branch, clusSumsP3.subbranch)
            .as('subSums')

        const branchSumsP3 = db4
            .select({
                region: subSumsP3.region,
                branch: sql`${subSumsP3.branch}`.as('branch'),
                branchRev: sql<number>`CAST(SUM(${subSumsP3.subbranchRev}) AS DOUBLE PRECISION)`.as('branchRev')
            })
            .from(subSumsP3)
            .groupBy(subSumsP3.region, subSumsP3.branch)
            .as('branchSums')

        const regSumsP3 = db4
            .select({
                regionName: branchSumsP3.region,
                regionalRev: sql<number>`CAST(SUM(${branchSumsP3.branchRev}) AS DOUBLE PRECISION)`.as('regionalRev')
            })
            .from(branchSumsP3)
            .groupBy(branchSumsP3.region)
            .as('regSums')


        const regClassP4 = db4
            .select({
                mtdDt: prevYearCurrMonthRevNewSales.mtdDt,
                rev: prevYearCurrMonthRevNewSales.rev,
                regionName: prevYearCurrMonthRevNewSales.regionSales,
                kabupatenName: prevYearCurrMonthRevNewSales.kabupaten,
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
            })
            .from(prevYearCurrMonthRevNewSales)
            .where(between(prevYearCurrMonthRevNewSales.mtdDt, firstDayOfPrevYearCurrMonth, prevYearCurrDate))
            .as('regionClassififcation')

        const kabSumsP4 = db4
            .select({
                region: regClassP4.regionName,
                branch: sql<string>`${regClassP4.branchName}`.as('kabBranch'),
                subbranch: sql<string>`${regClassP4.subbranchName}`.as('kabSubbranch'),
                cluster: sql<string>`${regClassP4.clusterName}`.as('kabCluster'),
                kabupaten: regClassP4.kabupatenName,
                kabupatenRev: sql<number>`SUM(${regClassP4.rev})`.as('kabupatenRev')
            })
            .from(regClassP4)
            .where(isNotNull(regClassP4.branchName))
            .groupBy(regClassP4.regionName, regClassP4.branchName, regClassP4.subbranchName, regClassP4.clusterName, regClassP4.kabupatenName)
            .as('kabSums')

        const clusSumsP4 = db4
            .select({
                region: kabSumsP4.region,
                branch: sql<string>`${kabSumsP4.branch}`.as('clusBranch'),
                subbranch: sql<string>`${kabSumsP4.subbranch}`.as('clusSubbranch'),
                cluster: sql<string>`${kabSumsP4.cluster}`.as('cluster'),
                clusterRev: sql<number>`SUM(${kabSumsP4.kabupatenRev})`.as('clusterRev')
            })
            .from(kabSumsP4)
            .groupBy(kabSumsP4.region, kabSumsP4.branch, kabSumsP4.subbranch, kabSumsP4.cluster)
            .as('clusSums')

        const subSumsP4 = db4
            .select({
                region: clusSumsP4.region,
                branch: sql<string>`${clusSumsP4.branch}`.as('subSumsBranch'),
                subbranch: sql<string>`${clusSumsP4.subbranch}`.as('subbranch'),
                subbranchRev: sql<number>`SUM(${clusSumsP4.clusterRev})`.as('subbranchRev')
            })
            .from(clusSumsP4)
            .groupBy(clusSumsP4.region, clusSumsP4.branch, clusSumsP4.subbranch)
            .as('subSums')

        const branchSumsP4 = db4
            .select({
                region: subSumsP4.region,
                branch: sql`${subSumsP4.branch}`.as('branch'),
                branchRev: sql<number>`SUM(${subSumsP4.subbranchRev})`.as('branchRev')
            })
            .from(subSumsP4)
            .groupBy(subSumsP4.region, subSumsP4.branch)
            .as('branchSums')

        const regSumsP4 = db4
            .select({
                regionName: branchSumsP4.region,
                regionalRev: sql<number>`CAST(SUM(${branchSumsP4.branchRev}) AS DOUBLE PRECISION)`.as('regionalRev')
            })
            .from(branchSumsP4)
            .groupBy(branchSumsP4.region)
            .as('regSums')


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
                region: sql<string>`${kabSumsP2.region}`.as('region'),
                branch: sql<string>`${kabSumsP2.branch}`.as('branch'), // Keep only one branchName
                subbranch: sql<string>`${kabSumsP2.subbranch}`.as('subbranch'),
                cluster: sql<string>`${kabSumsP2.cluster}`.as('cluster'),
                kabupaten: sql<string>`${kabSumsP2.kabupaten}`.as('kabupaten'),
                currMonthKabupatenRev: kabSumsP2.kabupatenRev,
                currMonthClusterRev: clusSumsP2.clusterRev,
                currMonthSubbranchRev: subSumsP2.subbranchRev,
                currMonthBranchRev: branchSumsP2.branchRev,
                currMonthRegionalRev: regSumsP2.regionalRev
            })
            .from(kabSumsP2)
            .innerJoin(clusSumsP2, and(
                and(eq(kabSumsP2.region, clusSumsP2.region), eq(kabSumsP2.branch, clusSumsP2.branch)),
                and(eq(kabSumsP2.subbranch, clusSumsP2.subbranch), eq(kabSumsP2.cluster, clusSumsP2.cluster))
            ))
            .innerJoin(subSumsP2, and(
                eq(kabSumsP2.region, subSumsP2.region),
                and(eq(kabSumsP2.branch, subSumsP2.branch), eq(kabSumsP2.subbranch, subSumsP2.subbranch))
            ))
            .innerJoin(branchSumsP2, and(eq(kabSumsP2.region, branchSumsP2.region), eq(kabSumsP2.branch, branchSumsP2.branch)))
            .innerJoin(regSumsP2, eq(kabSumsP2.region, regSumsP2.regionName))
            .orderBy(kabSumsP2.region, kabSumsP2.branch, kabSumsP2.subbranch, kabSumsP2.cluster, kabSumsP2.kabupaten)
            .prepare()

        // QUERY UNTUK MENDAPAT PREV MONTH REVENUE
        const p3 = db4
            .select({
                region: sql<string>`${kabSumsP3.region}`.as('region'),
                branch: sql<string>`${kabSumsP3.branch}`.as('branch'), // Keep only one branchName
                subbranch: kabSumsP3.subbranch,
                cluster: kabSumsP3.cluster,
                kabupaten: sql<string>`${kabSumsP3.kabupaten}`.as('kabupaten'),
                prevMonthKabupatenRev: kabSumsP3.kabupatenRev,
                prevMonthClusterRev: clusSumsP3.clusterRev,
                prevMonthSubbranchRev: subSumsP3.subbranchRev,
                prevMonthBranchRev: branchSumsP3.branchRev,
                prevMonthRegionalRev: regSumsP3.regionalRev
            })
            .from(kabSumsP3)
            .innerJoin(clusSumsP3, and(
                and(eq(kabSumsP3.region, clusSumsP3.region), eq(kabSumsP3.branch, clusSumsP3.branch)),
                and(eq(kabSumsP3.subbranch, clusSumsP3.subbranch), eq(kabSumsP3.cluster, clusSumsP3.cluster))
            ))
            .innerJoin(subSumsP3, and(
                eq(kabSumsP3.region, subSumsP3.region),
                and(eq(kabSumsP3.branch, subSumsP3.branch), eq(kabSumsP3.subbranch, subSumsP3.subbranch))
            ))
            .innerJoin(branchSumsP3, and(eq(kabSumsP3.region, branchSumsP3.region), eq(kabSumsP3.branch, branchSumsP3.branch)))
            .innerJoin(regSumsP3, eq(kabSumsP3.region, regSumsP3.regionName))
            .orderBy(kabSumsP3.region, kabSumsP3.branch, kabSumsP3.subbranch, kabSumsP3.cluster, kabSumsP3.kabupaten)
            .prepare()

        // QUERY UNTUK MENDAPAT PREV YEAR CURR MONTH REVENUE
        const p4 = db4
            .select({
                region: sql<string>`${kabSumsP4.region}`.as('region'),
                branch: sql<string>`${kabSumsP4.branch}`.as('branch'), // Keep only one branchName
                subbranch: kabSumsP4.subbranch,
                cluster: kabSumsP4.cluster,
                kabupaten: sql<string>`${kabSumsP4.kabupaten}`.as('kabupaten'),
                prevYearCurrMonthKabupatenRev: kabSumsP4.kabupatenRev,
                prevYearCurrMonthClusterRev: clusSumsP4.clusterRev,
                prevYearCurrMonthSubbranchRev: subSumsP4.subbranchRev,
                prevYearCurrMonthBranchRev: branchSumsP4.branchRev,
                prevYearCurrMonthRegionalRev: regSumsP4.regionalRev
            })
            .from(kabSumsP4)
            .innerJoin(clusSumsP4, and(
                and(eq(kabSumsP4.region, clusSumsP4.region), eq(kabSumsP4.branch, clusSumsP4.branch)),
                and(eq(kabSumsP4.subbranch, clusSumsP4.subbranch), eq(kabSumsP4.cluster, clusSumsP4.cluster))
            ))
            .innerJoin(subSumsP4, and(
                eq(kabSumsP4.region, subSumsP4.region),
                and(eq(kabSumsP4.branch, subSumsP4.branch), eq(kabSumsP4.subbranch, subSumsP4.subbranch))
            ))
            .innerJoin(branchSumsP4, and(eq(kabSumsP4.region, branchSumsP4.region), eq(kabSumsP4.branch, branchSumsP4.branch)))
            .innerJoin(regSumsP4, eq(kabSumsP4.region, regSumsP4.regionName))
            .orderBy(kabSumsP4.region, kabSumsP4.branch, kabSumsP4.subbranch, kabSumsP4.cluster, kabSumsP4.kabupaten)
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

