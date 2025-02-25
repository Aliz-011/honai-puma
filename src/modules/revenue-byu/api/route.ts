import { Hono } from "hono";
import { z } from 'zod'
import { asc, eq, sql } from "drizzle-orm";
import { subMonths, subDays, format, subYears } from 'date-fns'

import { db, db2 } from "@/db";
import {
    branches,
    regionals,
    clusters,
    kabupatens,
    subbranches,
    revenueByu,
} from "@/db/schema";
import { dynamicResumeRevenuePumaTable } from "@/db/schema2";
import { zValidator } from "@/lib/validator-wrapper";

const app = new Hono().get("/",
    zValidator('query', z.object({ date: z.string().optional(), branch: z.string().optional(), subbranch: z.string().optional(), cluster: z.string().optional(), kabupaten: z.string().optional() })),
    async (c) => {
        const { branch, cluster, subbranch, kabupaten, date } = c.req.valid('query')
        const selectedDate = date ? new Date(date) : new Date()
        const month = (selectedDate.getMonth() + 1).toString()

        // KOLOM DINAMIS UNTUK MEMILIH ANTARA KOLOM `m1-m12`
        const monthColumn = `m${month}` as keyof typeof revenueByu.$inferSelect

        // VARIABLE TANGGAL UNTUK IMPORT TABEL SECARA DINAMIS
        const currMonth = format(selectedDate, 'MM')
        const isPrevMonthLastYear = currMonth === '01'
        const prevMonth = isPrevMonthLastYear ? '12' : format(subMonths(selectedDate, 1), 'MM')
        const currYear = format(selectedDate, 'yyyy')
        const prevMonthYear = isPrevMonthLastYear ? format(subYears(selectedDate, 1), 'yyyy') : format(selectedDate, 'yyyy')
        const prevYear = format(subYears(selectedDate, 1), 'yyyy')

        // TABEL DINAMIS
        const rvp = dynamicResumeRevenuePumaTable(currYear, currMonth)
        const prvp = dynamicResumeRevenuePumaTable(prevMonthYear, prevMonth)
        const pyrvp = dynamicResumeRevenuePumaTable(prevYear, currMonth)

        // QUERY UNTUK TARGET BULAN INI
        const p1 = db
            .select({
                regionalName: regionals.regional,
                branchName: branches.branchNew,
                subbranchName: subbranches.subbranchNew,
                clusterName: clusters.cluster,
                kabupatenName: kabupatens.kabupaten,
                totalRevenue: sql<number>`CAST(SUM(${revenueByu[monthColumn]}) AS DOUBLE PRECISION)`.as('totalRevenue')
            })
            .from(regionals)
            .leftJoin(branches, eq(regionals.id, branches.regionalId))
            .leftJoin(subbranches, eq(branches.id, subbranches.branchId))
            .leftJoin(clusters, eq(subbranches.id, clusters.subbranchId))
            .leftJoin(kabupatens, eq(clusters.id, kabupatens.clusterId))
            .leftJoin(revenueByu, eq(kabupatens.id, revenueByu.kabupatenId))
            .groupBy(
                regionals.regional,
                branches.branchNew,
                subbranches.subbranchNew,
                clusters.cluster,
                kabupatens.kabupaten
            )
            .orderBy(asc(regionals.regional), asc(branches.branchNew), asc(subbranches.subbranchNew), asc(clusters.cluster), asc(kabupatens.kabupaten))
            .prepare()

        const targetRevenue = await p1.execute()
        const regionalsMap = new Map();

        // Insert revenue target from first query
        targetRevenue.forEach((row) => {
            const regionalName = row.regionalName;
            const branchName = row.branchName;
            const subbranchName = row.subbranchName;
            const clusterName = row.clusterName;
            const kabupatenName = row.kabupatenName;

            if (!regionalsMap.has(regionalName)) {
                regionalsMap.set(regionalName, {
                    name: regionalName,
                    totalRevenue: 0,
                    currTarget: 0, // Placeholder for second query
                    prevMonthTarget: 0, // Placeholder for thrid query
                    prevYearCurrMonthReveneu: 0, // Placeholder for fourth query
                    branches: new Map(),
                });
            }
            const regional = regionalsMap.get(regionalName);
            regional.totalRevenue += Number(row.totalRevenue) || 0;

            if (!regional.branches.has(branchName)) {
                regional.branches.set(branchName, {
                    name: branchName,
                    totalRevenue: 0,
                    currTarget: 0,
                    prevMonthTarget: 0,
                    prevYearCurrMonthReveneu: 0,
                    subbranches: new Map(),
                });
            }
            const branch = regional.branches.get(branchName);
            branch.totalRevenue += Number(row.totalRevenue) || 0;

            if (!branch.subbranches.has(subbranchName)) {
                branch.subbranches.set(subbranchName, {
                    name: subbranchName,
                    totalRevenue: 0,
                    currTarget: 0,
                    prevMonthTarget: 0,
                    prevYearCurrMonthReveneu: 0,
                    clusters: new Map(),
                });
            }
            const subbranch = branch.subbranches.get(subbranchName);
            subbranch.totalRevenue += Number(row.totalRevenue) || 0;

            if (!subbranch.clusters.has(clusterName)) {
                subbranch.clusters.set(clusterName, {
                    name: clusterName,
                    totalRevenue: 0,
                    currTarget: 0,
                    prevMonthTarget: 0,
                    prevYearCurrMonthReveneu: 0,
                    kabupatens: new Map(),
                });
            }
            const cluster = subbranch.clusters.get(clusterName);
            cluster.totalRevenue += Number(row.totalRevenue) || 0;

            if (!cluster.kabupatens.has(kabupatenName)) {
                cluster.kabupatens.set(kabupatenName, {
                    name: kabupatenName,
                    totalRevenue: Number(row.totalRevenue) || 0,
                    currTarget: 0,
                    prevMonthTarget: 0,
                    prevYearCurrMonthReveneu: 0,
                });
            }
        });

        // VARIABLE TANGGAL
        const firstDayOfCurrMonth = format(new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1), 'yyyy-MM-dd')
        const firstDayOfPrevMonth = format(subMonths(new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1), 1), 'yyyy-MM-dd')
        const firstDayOfPrevYearCurrMonth = format(subYears(new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1), 1), 'yyyy-MM-dd')
        const currDate = format(subDays(selectedDate, 2), 'yyyy-MM-dd')
        const prevDate = format(subMonths(selectedDate, 1), 'yyyy-MM-dd')
        const prevYearCurrDate = format(subYears(subDays(selectedDate, 2), 1), 'yyyy-MM-dd')

        console.log(firstDayOfPrevYearCurrMonth);
        console.log(prevYearCurrDate);

        // QUERY UNTUK PENDAPATAN BULAN INI
        const p2 = db2.select({
            regionalName: rvp.regionSales,
            branchName: sql<string>`
                CASE
                    WHEN ${rvp.kabupaten} IN (
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
                    WHEN ${rvp.kabupaten} IN (
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
                    WHEN ${rvp.kabupaten} IN (
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
                    WHEN ${rvp.kabupaten} IN (
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
            subbranchName: sql`
                CASE
                    WHEN ${rvp.kabupaten} IN (
                        'AMBON',
                        'KOTA AMBON',
                        'MALUKU TENGAH',
                        'SERAM BAGIAN TIMUR'
                    ) THEN 'AMBON'
                    WHEN ${rvp.kabupaten} IN (
                        'KEPULAUAN ARU',
                        'KOTA TUAL',
                        'MALUKU BARAT DAYA',
                        'MALUKU TENGGARA',
                        'MALUKU TENGGARA BARAT',
                        'KEPULAUAN TANIMBAR'
                    ) THEN 'KEPULAUAN AMBON'
                    WHEN ${rvp.kabupaten} IN ('BURU', 'BURU SELATAN', 'SERAM BAGIAN BARAT') THEN 'SERAM BURU'
                    WHEN ${rvp.kabupaten} IN ('KOTA JAYAPURA') THEN 'JAYAPURA'
                    WHEN ${rvp.kabupaten} IN (
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
                    WHEN ${rvp.kabupaten} IN ('MANOKWARI') THEN 'MANOKWARI'
                    WHEN ${rvp.kabupaten} IN (
                        'FAKFAK',
                        'FAK FAK',
                        'KAIMANA',
                        'MANOKWARI SELATAN',
                        'PEGUNUNGAN ARFAK',
                        'TELUK BINTUNI',
                        'TELUK WONDAMA'
                    ) THEN 'MANOKWARI OUTER'
                    WHEN ${rvp.kabupaten} IN (
                        'KOTA SORONG',
                        'MAYBRAT',
                        'RAJA AMPAT',
                        'SORONG',
                        'SORONG SELATAN',
                        'TAMBRAUW'
                    ) THEN 'SORONG RAJA AMPAT'
                    WHEN ${rvp.kabupaten} IN ('ASMAT', 'BOVEN DIGOEL', 'MAPPI', 'MERAUKE') THEN 'MERAUKE'
                    WHEN ${rvp.kabupaten} IN (
                        'INTAN JAYA',
                        'MIMIKA',
                        'PUNCAK',
                        'PUNCAK JAYA',
                        'TIMIKA'
                    ) THEN 'MIMIKA'
                    WHEN ${rvp.kabupaten} IN ('DEIYAI', 'DOGIYAI', 'NABIRE', 'PANIAI') THEN 'NABIRE'
                    ELSE NULL
                END
                `.as('subbranchName'),
            clusterName: sql<string>`
                CASE
                    WHEN ${rvp.kabupaten} IN (
                        'KOTA AMBON',
                        'MALUKU TENGAH',
                        'SERAM BAGIAN TIMUR'
                    ) THEN 'AMBON'
                    WHEN ${rvp.kabupaten} IN (
                        'KEPULAUAN ARU',
                        'KOTA TUAL',
                        'MALUKU BARAT DAYA',
                        'MALUKU TENGGARA',
                        'MALUKU TENGGARA BARAT',
                        'KEPULAUAN TANIMBAR'
                    ) THEN 'KEPULAUAN TUAL'
                    WHEN ${rvp.kabupaten} IN ('BURU', 'BURU SELATAN', 'SERAM BAGIAN BARAT') THEN 'SERAM BARAT BURU'
                    WHEN ${rvp.kabupaten} IN ('KOTA JAYAPURA') THEN 'KOTA JAYAPURA'
                    WHEN ${rvp.kabupaten} IN ('JAYAPURA', 'KEEROM', 'MAMBERAMO RAYA', 'SARMI') THEN 'JAYAPURA OUTER'
                    WHEN ${rvp.kabupaten} IN (
                        'BIAK',
                        'BIAK NUMFOR',
                        'KEPULAUAN YAPEN',
                        'SUPIORI',
                        'WAROPEN'
                    ) THEN 'NEW BIAK NUMFOR'
                    WHEN ${rvp.kabupaten} IN (
                        'JAYAWIJAYA',
                        'LANNY JAYA',
                        'MAMBERAMO TENGAH',
                        'NDUGA',
                        'PEGUNUNGAN BINTANG',
                        'TOLIKARA',
                        'YAHUKIMO',
                        'YALIMO'
                    ) THEN 'PAPUA PEGUNUNGAN'
                    WHEN ${rvp.kabupaten} IN ('MANOKWARI') THEN 'MANOKWARI'
                    WHEN ${rvp.kabupaten} IN (
                        'FAKFAK',
                        'FAK FAK',
                        'KAIMANA',
                        'MANOKWARI SELATAN',
                        'PEGUNUNGAN ARFAK',
                        'TELUK BINTUNI',
                        'TELUK WONDAMA'
                    ) THEN 'MANOKWARI OUTER'
                    WHEN ${rvp.kabupaten} IN (
                        'KOTA SORONG',
                        'MAYBRAT',
                        'RAJA AMPAT',
                        'SORONG',
                        'SORONG SELATAN',
                        'TAMBRAUW'
                    ) THEN 'NEW SORONG RAJA AMPAT'
                    WHEN ${rvp.kabupaten} IN (
                        'INTAN JAYA',
                        'MIMIKA',
                        'PUNCAK',
                        'PUNCAK JAYA',
                        'TIMIKA'
                    ) THEN 'MIMIKA PUNCAK'
                    WHEN ${rvp.kabupaten} IN ('DEIYAI', 'DOGIYAI', 'NABIRE', 'PANIAI') THEN 'NABIRE'
                    WHEN ${rvp.kabupaten} IN ('ASMAT', 'BOVEN DIGOEL', 'MAPPI', 'MERAUKE') THEN 'NEW MERAUKE'
                    ELSE NULL
                END
                `.as('clusterName'),
            kabupatenName: rvp.kabupaten,
            currTarget: sql<number>`CAST(SUM(${rvp.rev}) AS DOUBLE PRECISION)`.as('currTarget')
        })
            .from(rvp)
            .where(sql`(${rvp.branch} IS NOT NULL AND ${rvp.subbranch} IS NOT NULL) AND ${rvp.brand} = ${sql.placeholder('brand')} AND ${rvp.mtdDt} BETWEEN ${sql.placeholder('firstDayOfCurrMonth')} AND ${sql.placeholder('currDate')}`)
            .groupBy(rvp.regionSales, rvp.branch, rvp.subbranch, rvp.clusterSales)
            .prepare()

        const currMonthRevenue = await p2.execute({ brand: 'ByU', firstDayOfCurrMonth: firstDayOfCurrMonth, currDate: currDate })

        currMonthRevenue.forEach((row) => {
            const regionalName = "MALUKU DAN PAPUA";
            const branchName = row.branchName;
            const subbranchName = row.subbranchName;
            const clusterName = row.clusterName;
            const kabupatenName = row.kabupatenName;

            if (!regionalsMap.has(regionalName)) {
                regionalsMap.set(regionalName, {
                    name: regionalName,
                    totalRevenue: 0, // Placeholder for first query
                    currTarget: 0,
                    prevMonthTarget: 0,
                    prevYearCurrMonthReveneu: 0,
                    branches: new Map(),
                });
            }
            const regional = regionalsMap.get(regionalName);
            regional.currTarget += Number(row.currTarget) || 0;

            if (!regional.branches.has(branchName)) {
                regional.branches.set(branchName, {
                    name: branchName,
                    totalRevenue: 0,
                    currTarget: 0,
                    prevMonthTarget: 0,
                    prevYearCurrMonthReveneu: 0,
                    subbranches: new Map(),
                });
            }
            const branch = regional.branches.get(branchName);
            branch.currTarget += Number(row.currTarget) || 0;

            if (!branch.subbranches.has(subbranchName)) {
                branch.subbranches.set(subbranchName, {
                    name: subbranchName,
                    totalRevenue: 0,
                    currTarget: 0,
                    prevMonthTarget: 0,
                    prevYearCurrMonthReveneu: 0,
                    clusters: new Map(),
                });
            }
            const subbranch = branch.subbranches.get(subbranchName);
            subbranch.currTarget += Number(row.currTarget) || 0;

            if (!subbranch.clusters.has(clusterName)) {
                subbranch.clusters.set(clusterName, {
                    name: clusterName,
                    totalRevenue: 0,
                    currTarget: 0,
                    prevMonthTarget: 0,
                    prevYearCurrMonthReveneu: 0,
                    kabupatens: new Map(),
                });
            }
            const cluster = subbranch.clusters.get(clusterName);
            cluster.currTarget += Number(row.currTarget) || 0;

            if (!cluster.kabupatens.has(kabupatenName)) {
                cluster.kabupatens.set(kabupatenName, {
                    name: kabupatenName,
                    totalRevenue: 0,
                    currTarget: Number(row.currTarget) || 0,
                    prevMonthTarget: 0,
                    prevYearCurrMonthReveneu: 0,
                });
            } else {
                cluster.kabupatens.get(kabupatenName).currTarget += Number(row.currTarget) || 0;
            }
        });

        // QUERY UNTUK PENDAPATAN BULAN SEBELUMNYA
        const p3 = db2
            .select({
                regionalName: prvp.regionSales,
                branchName: sql<string>`
                CASE
                    WHEN ${prvp.kabupaten} IN (
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
                    WHEN ${prvp.kabupaten} IN (
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
                    WHEN ${prvp.kabupaten} IN (
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
                    WHEN ${prvp.kabupaten} IN (
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
                subbranchName: sql`
                CASE
                    WHEN ${prvp.kabupaten} IN (
                        'AMBON',
                        'KOTA AMBON',
                        'MALUKU TENGAH',
                        'SERAM BAGIAN TIMUR'
                    ) THEN 'AMBON'
                    WHEN ${prvp.kabupaten} IN (
                        'KEPULAUAN ARU',
                        'KOTA TUAL',
                        'MALUKU BARAT DAYA',
                        'MALUKU TENGGARA',
                        'MALUKU TENGGARA BARAT',
                        'KEPULAUAN TANIMBAR'
                    ) THEN 'KEPULAUAN AMBON'
                    WHEN ${prvp.kabupaten} IN ('BURU', 'BURU SELATAN', 'SERAM BAGIAN BARAT') THEN 'SERAM BURU'
                    WHEN ${prvp.kabupaten} IN ('KOTA JAYAPURA') THEN 'JAYAPURA'
                    WHEN ${prvp.kabupaten} IN (
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
                    WHEN ${prvp.kabupaten} IN ('MANOKWARI') THEN 'MANOKWARI'
                    WHEN ${prvp.kabupaten} IN (
                        'FAKFAK',
                        'FAK FAK',
                        'KAIMANA',
                        'MANOKWARI SELATAN',
                        'PEGUNUNGAN ARFAK',
                        'TELUK BINTUNI',
                        'TELUK WONDAMA'
                    ) THEN 'MANOKWARI OUTER'
                    WHEN ${prvp.kabupaten} IN (
                        'KOTA SORONG',
                        'MAYBRAT',
                        'RAJA AMPAT',
                        'SORONG',
                        'SORONG SELATAN',
                        'TAMBRAUW'
                    ) THEN 'SORONG RAJA AMPAT'
                    WHEN ${prvp.kabupaten} IN ('ASMAT', 'BOVEN DIGOEL', 'MAPPI', 'MERAUKE') THEN 'MERAUKE'
                    WHEN ${prvp.kabupaten} IN (
                        'INTAN JAYA',
                        'MIMIKA',
                        'PUNCAK',
                        'PUNCAK JAYA',
                        'TIMIKA'
                    ) THEN 'MIMIKA'
                    WHEN ${prvp.kabupaten} IN ('DEIYAI', 'DOGIYAI', 'NABIRE', 'PANIAI') THEN 'NABIRE'
                    ELSE NULL
                END
                `.as('subbranchName'),
                clusterName: sql<string>`
                CASE
                    WHEN ${prvp.kabupaten} IN (
                        'KOTA AMBON',
                        'MALUKU TENGAH',
                        'SERAM BAGIAN TIMUR'
                    ) THEN 'AMBON'
                    WHEN ${prvp.kabupaten} IN (
                        'KEPULAUAN ARU',
                        'KOTA TUAL',
                        'MALUKU BARAT DAYA',
                        'MALUKU TENGGARA',
                        'MALUKU TENGGARA BARAT',
                        'KEPULAUAN TANIMBAR'
                    ) THEN 'KEPULAUAN TUAL'
                    WHEN ${prvp.kabupaten} IN ('BURU', 'BURU SELATAN', 'SERAM BAGIAN BARAT') THEN 'SERAM BARAT BURU'
                    WHEN ${prvp.kabupaten} IN ('KOTA JAYAPURA') THEN 'KOTA JAYAPURA'
                    WHEN ${prvp.kabupaten} IN ('JAYAPURA', 'KEEROM', 'MAMBERAMO RAYA', 'SARMI') THEN 'JAYAPURA OUTER'
                    WHEN ${prvp.kabupaten} IN (
                        'BIAK',
                        'BIAK NUMFOR',
                        'KEPULAUAN YAPEN',
                        'SUPIORI',
                        'WAROPEN'
                    ) THEN 'NEW BIAK NUMFOR'
                    WHEN ${prvp.kabupaten} IN (
                        'JAYAWIJAYA',
                        'LANNY JAYA',
                        'MAMBERAMO TENGAH',
                        'NDUGA',
                        'PEGUNUNGAN BINTANG',
                        'TOLIKARA',
                        'YAHUKIMO',
                        'YALIMO'
                    ) THEN 'PAPUA PEGUNUNGAN'
                    WHEN ${prvp.kabupaten} IN ('MANOKWARI') THEN 'MANOKWARI'
                    WHEN ${prvp.kabupaten} IN (
                        'FAKFAK',
                        'FAK FAK',
                        'KAIMANA',
                        'MANOKWARI SELATAN',
                        'PEGUNUNGAN ARFAK',
                        'TELUK BINTUNI',
                        'TELUK WONDAMA'
                    ) THEN 'MANOKWARI OUTER'
                    WHEN ${prvp.kabupaten} IN (
                        'KOTA SORONG',
                        'MAYBRAT',
                        'RAJA AMPAT',
                        'SORONG',
                        'SORONG SELATAN',
                        'TAMBRAUW'
                    ) THEN 'NEW SORONG RAJA AMPAT'
                    WHEN ${prvp.kabupaten} IN (
                        'INTAN JAYA',
                        'MIMIKA',
                        'PUNCAK',
                        'PUNCAK JAYA',
                        'TIMIKA'
                    ) THEN 'MIMIKA PUNCAK'
                    WHEN ${prvp.kabupaten} IN ('DEIYAI', 'DOGIYAI', 'NABIRE', 'PANIAI') THEN 'NABIRE'
                    WHEN ${prvp.kabupaten} IN ('ASMAT', 'BOVEN DIGOEL', 'MAPPI', 'MERAUKE') THEN 'NEW MERAUKE'
                    ELSE NULL
                END
                `.as('clusterName'),
                kabupatenName: prvp.kabupaten,
                prevTarget: sql<number>`CAST(SUM(${prvp.rev}) AS DOUBLE PRECISION)`.as('prevTarget')
            })
            .from(prvp)
            .where(sql`(${prvp.branch} IS NOT NULL AND ${prvp.subbranch} IS NOT NULL) AND ${prvp.brand} = ${sql.placeholder('brand')} AND ${prvp.mtdDt} BETWEEN ${sql.placeholder('firstDayOfPrevMonth')} AND ${sql.placeholder('prevDate')}`)
            .groupBy(prvp.regionSales, prvp.branch, prvp.subbranch, prvp.clusterSales)
            .prepare()

        const prevMonthRevenue = await p3.execute({ brand: 'ByU', prevDate: prevDate, firstDayOfPrevMonth: firstDayOfPrevMonth })

        prevMonthRevenue.forEach((row) => {
            const regionalName = "MALUKU DAN PAPUA";
            const branchName = row.branchName;
            const subbranchName = row.subbranchName;
            const clusterName = row.clusterName;
            const kabupatenName = row.kabupatenName;

            if (!regionalsMap.has(regionalName)) {
                regionalsMap.set(regionalName, {
                    name: regionalName,
                    totalRevenue: 0, // Placeholder for first query
                    currTarget: 0,
                    prevMonthTarget: 0,
                    prevYearCurrMonthReveneu: 0,
                    branches: new Map(),
                });
            }
            const regional = regionalsMap.get(regionalName);
            regional.prevMonthTarget += Number(row.prevTarget) || 0;

            if (!regional.branches.has(branchName)) {
                regional.branches.set(branchName, {
                    name: branchName,
                    totalRevenue: 0,
                    currTarget: 0,
                    prevMonthTarget: 0,
                    prevYearCurrMonthReveneu: 0,
                    subbranches: new Map(),
                });
            }
            const branch = regional.branches.get(branchName);
            branch.prevMonthTarget += Number(row.prevTarget) || 0;

            if (!branch.subbranches.has(subbranchName)) {
                branch.subbranches.set(subbranchName, {
                    name: subbranchName,
                    totalRevenue: 0,
                    currTarget: 0,
                    prevMonthTarget: 0,
                    prevYearCurrMonthReveneu: 0,
                    clusters: new Map(),
                });
            }
            const subbranch = branch.subbranches.get(subbranchName);
            subbranch.prevMonthTarget += Number(row.prevTarget) || 0;

            if (!subbranch.clusters.has(clusterName)) {
                subbranch.clusters.set(clusterName, {
                    name: clusterName,
                    totalRevenue: 0,
                    currTarget: 0,
                    prevMonthTarget: 0,
                    prevYearCurrMonthReveneu: 0,
                    kabupatens: new Map(),
                });
            }
            const cluster = subbranch.clusters.get(clusterName);
            cluster.prevMonthTarget += Number(row.prevTarget) || 0;

            if (!cluster.kabupatens.has(kabupatenName)) {
                cluster.kabupatens.set(kabupatenName, {
                    name: kabupatenName,
                    totalRevenue: 0,
                    currTarget: 0,
                    prevMonthTarget: Number(row.prevTarget) || 0,
                    prevYearCurrMonthReveneu: 0,
                });
            } else {
                cluster.kabupatens.get(kabupatenName).prevMonthTarget += Number(row.prevTarget)
            }
        });

        // QUERY UNTUK PENDAPATAN BULAN INI DI TAHUN SEBELUMNYA
        const p4 = db2
            .select({
                regionalName: pyrvp.regionSales,
                branchName: sql<string>`
              CASE
                  WHEN ${pyrvp.kabupaten} IN (
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
                  WHEN ${pyrvp.kabupaten} IN (
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
                  WHEN ${pyrvp.kabupaten} IN (
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
                  WHEN ${pyrvp.kabupaten} IN (
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
                subbranchName: sql`
              CASE
                  WHEN ${pyrvp.kabupaten} IN (
                      'KOTA AMBON',
                      'MALUKU TENGAH',
                      'SERAM BAGIAN TIMUR'
                  ) THEN 'AMBON'
                  WHEN ${pyrvp.kabupaten} IN (
                      'KEPULAUAN ARU',
                      'KOTA TUAL',
                      'MALUKU BARAT DAYA',
                      'MALUKU TENGGARA',
                      'MALUKU TENGGARA BARAT',
                      'KEPULAUAN TANIMBAR'
                  ) THEN 'KEPULAUAN AMBON'
                  WHEN ${pyrvp.kabupaten} IN ('BURU', 'BURU SELATAN', 'SERAM BAGIAN BARAT') THEN 'SERAM BURU'
                  WHEN ${pyrvp.kabupaten} IN ('KOTA JAYAPURA') THEN 'JAYAPURA'
                  WHEN ${pyrvp.kabupaten} IN (
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
                  WHEN ${pyrvp.kabupaten} IN ('MANOKWARI') THEN 'MANOKWARI'
                  WHEN ${pyrvp.kabupaten} IN (
                      'FAKFAK',
                      'FAK FAK',
                      'KAIMANA',
                      'MANOKWARI SELATAN',
                      'PEGUNUNGAN ARFAK',
                      'TELUK BINTUNI',
                      'TELUK WONDAMA'
                  ) THEN 'MANOKWARI OUTER'
                  WHEN ${pyrvp.kabupaten} IN (
                      'KOTA SORONG',
                      'MAYBRAT',
                      'RAJA AMPAT',
                      'SORONG',
                      'SORONG SELATAN',
                      'TAMBRAUW'
                  ) THEN 'SORONG RAJA AMPAT'
                  WHEN ${pyrvp.kabupaten} IN ('ASMAT', 'BOVEN DIGOEL', 'MAPPI', 'MERAUKE') THEN 'MERAUKE'
                  WHEN ${pyrvp.kabupaten} IN (
                      'INTAN JAYA',
                      'MIMIKA',
                      'PUNCAK',
                      'PUNCAK JAYA',
                      'TIMIKA'
                  ) THEN 'MIMIKA'
                  WHEN ${pyrvp.kabupaten} IN ('DEIYAI', 'DOGIYAI', 'NABIRE', 'PANIAI') THEN 'NABIRE'
                  ELSE NULL
              END
              `.as('subbranchName'),
                clusterName: sql<string>`
              CASE
                  WHEN ${pyrvp.kabupaten} IN (
                      'KOTA AMBON',
                      'MALUKU TENGAH',
                      'SERAM BAGIAN TIMUR'
                  ) THEN 'AMBON'
                  WHEN ${pyrvp.kabupaten} IN (
                      'KEPULAUAN ARU',
                      'KOTA TUAL',
                      'MALUKU BARAT DAYA',
                      'MALUKU TENGGARA',
                      'MALUKU TENGGARA BARAT',
                      'KEPULAUAN TANIMBAR'
                  ) THEN 'KEPULAUAN TUAL'
                  WHEN ${pyrvp.kabupaten} IN ('BURU', 'BURU SELATAN', 'SERAM BAGIAN BARAT') THEN 'SERAM BARAT BURU'
                  WHEN ${pyrvp.kabupaten} IN ('KOTA JAYAPURA') THEN 'KOTA JAYAPURA'
                  WHEN ${pyrvp.kabupaten} IN ('JAYAPURA', 'KEEROM', 'MAMBERAMO RAYA', 'SARMI') THEN 'JAYAPURA OUTER'
                  WHEN ${pyrvp.kabupaten} IN (
                      'BIAK',
                      'BIAK NUMFOR',
                      'KEPULAUAN YAPEN',
                      'SUPIORI',
                      'WAROPEN'
                  ) THEN 'NEW BIAK NUMFOR'
                  WHEN ${pyrvp.kabupaten} IN (
                      'JAYAWIJAYA',
                      'LANNY JAYA',
                      'MAMBERAMO TENGAH',
                      'NDUGA',
                      'PEGUNUNGAN BINTANG',
                      'TOLIKARA',
                      'YAHUKIMO',
                      'YALIMO'
                  ) THEN 'PAPUA PEGUNUNGAN'
                  WHEN ${pyrvp.kabupaten} IN ('MANOKWARI') THEN 'MANOKWARI'
                  WHEN ${pyrvp.kabupaten} IN (
                      'FAKFAK',
                      'FAK FAK',
                      'KAIMANA',
                      'MANOKWARI SELATAN',
                      'PEGUNUNGAN ARFAK',
                      'TELUK BINTUNI',
                      'TELUK WONDAMA'
                  ) THEN 'MANOKWARI OUTER'
                  WHEN ${pyrvp.kabupaten} IN (
                      'KOTA SORONG',
                      'MAYBRAT',
                      'RAJA AMPAT',
                      'SORONG',
                      'SORONG SELATAN',
                      'TAMBRAUW'
                  ) THEN 'NEW SORONG RAJA AMPAT'
                  WHEN ${pyrvp.kabupaten} IN (
                      'INTAN JAYA',
                      'MIMIKA',
                      'PUNCAK',
                      'PUNCAK JAYA',
                      'TIMIKA'
                  ) THEN 'MIMIKA PUNCAK'
                  WHEN ${pyrvp.kabupaten} IN ('DEIYAI', 'DOGIYAI', 'NABIRE', 'PANIAI') THEN 'NABIRE'
                  WHEN ${pyrvp.kabupaten} IN ('ASMAT', 'BOVEN DIGOEL', 'MAPPI', 'MERAUKE') THEN 'NEW MERAUKE'
                  ELSE NULL
              END
              `.as('clusterName'),
                kabupatenName: pyrvp.kabupaten,
                prevYearCurrMonthReveneu: sql<number>`CAST(SUM(${pyrvp.rev}) AS DOUBLE PRECISION)`.as('prevYearCurrMonthReveneu')
            })
            .from(pyrvp)
            .where(sql`
        (${pyrvp.branch} IS NOT NULL AND ${pyrvp.subbranch} IS NOT NULL) AND ${pyrvp.brand} = ${sql.placeholder('brand')} AND ${pyrvp.mtdDt} BETWEEN ${sql.placeholder('firstDayOfPrevYearCurrMonth')} AND ${sql.placeholder('prevYearCurrDate')}
        `)
            .groupBy(pyrvp.regionSales, pyrvp.branch, pyrvp.subbranch, pyrvp.clusterSales)
            .prepare()

        const prevYearCurrMonthRevenue = await p4.execute({ brand: 'ByU', prevYearCurrDate, firstDayOfPrevYearCurrMonth })

        prevYearCurrMonthRevenue.forEach((row) => {
            const regionalName = "MALUKU DAN PAPUA";
            const branchName = row.branchName;
            const subbranchName = row.subbranchName;
            const clusterName = row.clusterName;
            const kabupatenName = row.kabupatenName;

            if (!regionalsMap.has(regionalName)) {
                regionalsMap.set(regionalName, {
                    name: regionalName,
                    totalRevenue: 0, // Placeholder for first query
                    currTarget: 0,
                    prevMonthTarget: 0,
                    prevYearCurrMonthReveneu: 0,
                    branches: new Map(),
                });
            }
            const regional = regionalsMap.get(regionalName);
            regional.prevYearCurrMonthReveneu += Number(row.prevYearCurrMonthReveneu) || 0;

            if (!regional.branches.has(branchName)) {
                regional.branches.set(branchName, {
                    name: branchName,
                    totalRevenue: 0,
                    currTarget: 0,
                    prevMonthTarget: 0,
                    prevYearCurrMonthReveneu: 0,
                    subbranches: new Map(),
                });
            }
            const branch = regional.branches.get(branchName);
            branch.prevYearCurrMonthReveneu += Number(row.prevYearCurrMonthReveneu) || 0;

            if (!branch.subbranches.has(subbranchName)) {
                branch.subbranches.set(subbranchName, {
                    name: subbranchName,
                    totalRevenue: 0,
                    currTarget: 0,
                    prevMonthTarget: 0,
                    prevYearCurrMonthReveneu: 0,
                    clusters: new Map(),
                });
            }
            const subbranch = branch.subbranches.get(subbranchName);
            subbranch.prevYearCurrMonthReveneu += Number(row.prevYearCurrMonthReveneu) || 0;

            if (!subbranch.clusters.has(clusterName)) {
                subbranch.clusters.set(clusterName, {
                    name: clusterName,
                    totalRevenue: 0,
                    currTarget: 0,
                    prevMonthTarget: 0,
                    prevYearCurrMonthReveneu: 0,
                    kabupatens: new Map(),
                });
            }
            const cluster = subbranch.clusters.get(clusterName);
            cluster.prevYearCurrMonthReveneu += Number(row.prevYearCurrMonthReveneu) || 0;

            if (!cluster.kabupatens.has(kabupatenName)) {
                cluster.kabupatens.set(kabupatenName, {
                    name: kabupatenName,
                    totalRevenue: 0,
                    currTarget: 0,
                    prevMonthTarget: 0,
                    prevYearCurrMonthReveneu: Number(row.prevYearCurrMonthReveneu) || 0,
                });
            } else {
                cluster.kabupatens.get(kabupatenName).prevYearCurrMonthReveneu += Number(row.prevYearCurrMonthReveneu)
            }
        });

        const dataRevenue = Array.from(regionalsMap.values()).map((regional: any) => ({
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

        return c.json({ data: dataRevenue }, 200);
    });

export default app;

