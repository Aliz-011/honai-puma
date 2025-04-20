import { endOfMonth, format, getDaysInMonth, subDays, subMonths } from "date-fns";
import { countDistinct, eq, getTableName, sql, sum } from "drizzle-orm";
import { Hono } from "hono";
import { z } from "zod";
import { } from 'date-fns'

import { db6 } from "@/db";
import { dynamicIhOrderingDetailOrderTable, fmcMconTable } from "@/db/schema6";
import { dynamicMultidimTable } from "@/db/schema9";
import { zValidator } from "@/lib/validator-wrapper";

const app = new Hono()
    .get('/', zValidator('query', z.object({ date: z.coerce.date().optional() })),
        async c => {
            const { date } = c.req.valid('query')
            const selectedDate = date ? new Date(date) : subDays(new Date(), 2)

            // VARIABEL TANGGAL
            const closingDate = endOfMonth(selectedDate)
            const isEndOfMonth = selectedDate.getDate() === closingDate.getDate();
            const endOfCurrMonth = isEndOfMonth ? closingDate : selectedDate
            const currDate = format(endOfCurrMonth, 'yyyy-MM-dd')
            const currYear = format(selectedDate, 'yyyy')
            const currMonth = format(selectedDate, 'MM')
            const isCurrMonth = format(selectedDate, 'MM') === format(new Date(), 'MM')

            const multidimMonth = isEndOfMonth ? format(closingDate, 'MM') : format(selectedDate, 'MM')
            const multidimDay = isEndOfMonth ? format(closingDate, 'dd') : format(selectedDate, 'dd')
            const multidimDay2 = isCurrMonth ? format(selectedDate, 'dd') : format(closingDate, 'dd')

            const ihOrderingDetailOrder = dynamicIhOrderingDetailOrderTable(currYear, format(new Date(), 'MM'))
            const multidim = dynamicMultidimTable(currYear, multidimMonth, multidimDay2)
            console.log({ table: getTableName(multidim) })
            console.log({ table: getTableName(ihOrderingDetailOrder) })
            console.log({ multidimDay, multidimDay2, selectedDate: format(selectedDate, 'yyyy-MM-dd') })

            const sq1 = db6
                .select({
                    region: ihOrderingDetailOrder.region,
                    branch: ihOrderingDetailOrder.branch,
                    wok: sql<string>`CASE 
                        WHEN ${ihOrderingDetailOrder.stoCo} IN ('ABO', 'PAO') THEN 'AMBON INNER'
                        WHEN ${ihOrderingDetailOrder.stoCo} IN ('BUL', 'DOB', 'LRA', 'MSH', 'NIR', 'NML', 'SML', 'SPR', 'TUA', 'WHA') THEN 'AMBON OUTER'
                        WHEN ${ihOrderingDetailOrder.stoCo} IN ('ABE', 'JAP', 'JPB', 'WAE') THEN 'JAYAPURA INNER'
                        WHEN ${ihOrderingDetailOrder.stoCo} IN ('BIA', 'SNI', 'SRM', 'SRU', 'WAM') THEN 'JAYAOURA OUTER'
                        WHEN ${ihOrderingDetailOrder.stoCo} IN ('BTI', 'FFA', 'KIN', 'MWR', 'WMR', 'RSK') THEN 'MANOKWARI NABIRE'
                        WHEN ${ihOrderingDetailOrder.stoCo} IN ('NAB', 'AGT', 'BAD', 'MRK', 'TMR') THEN 'MIMIKA'
                        WHEN ${ihOrderingDetailOrder.stoCo} IN ('KUK', 'TBG', 'TIM', 'NAB') THEN 'MERAUKE'
                        ELSE ${ihOrderingDetailOrder.wok}
                    END`.as('wok'),
                    stoCo: ihOrderingDetailOrder.stoCo,
                    payload: sum(multidim.vol_data_mtd).as('payload'),
                    payloadM1: sum(multidim.vol_data_m1).as('payload_m1'),
                    subs: countDistinct(fmcMconTable.msisdn_dbprofile).as('subs'),
                    revMtd: sum(multidim.rev_mtd).as('rev_mtd'),
                    revM1: sum(multidim.rev_m1).as('rev_m1'),
                    revM2: sum(multidim.rev_m2).as('rev_m2'),
                    revM3: sum(multidim.rev_m3).as('rev_m3')
                })
                .from(ihOrderingDetailOrder)
                .leftJoin(fmcMconTable, eq(ihOrderingDetailOrder.serviceId, fmcMconTable.notel))
                .leftJoin(multidim, eq(fmcMconTable.msisdn_dbprofile, multidim.msisdn))
                .where(sql`${ihOrderingDetailOrder.psTs} IS NOT NULL AND ${ihOrderingDetailOrder.orderType} = 'NEW SALES' AND ${ihOrderingDetailOrder.region} = 'MALUKU DAN PAPUA' AND MONTH(${ihOrderingDetailOrder.psTs}) = ${currMonth} AND YEAR(${ihOrderingDetailOrder.psTs}) = ${currYear}`)
                .groupBy(sql`1,2,3,4`)
                .as('aa')

            const p1 = db6
                .select({
                    region: sq1.region,
                    branch: sq1.branch,
                    wok: sq1.wok,
                    sto: sq1.stoCo,
                    revMtd: sq1.revMtd,
                    revM1: sq1.revM1,
                    revM2: sq1.revM2,
                    revM3: sq1.revM3,
                    subsSto: sql<string>`SUM(${sq1.subs})`.as('subs_sto'),
                    subsWok: sql<string>`SUM(SUM(${sq1.subs})) OVER (PARTITION BY region, branch, wok)`.as('subs_wok'),
                    subsBranch: sql<string>`SUM(SUM(${sq1.subs})) OVER (PARTITION BY region, branch)`.as('subs_branch'),
                    subsRegion: sql<string>`SUM(SUM(${sq1.subs})) OVER (PARTITION BY region)`.as('subs_region'),
                    payloadSto: sql<string>`SUM(${sq1.payload})`.as('payload_sto'),
                    payloadWok: sql<string>`SUM(SUM(${sq1.payload})) OVER (PARTITION BY region, branch, wok)`.as('payload_wok'),
                    payloadBranch: sql<string>`SUM(SUM(${sq1.payload})) OVER (PARTITION BY region, branch)`.as('payload_branch'),
                    payloadRegion: sql<string>`SUM(SUM(${sq1.payload})) OVER (PARTITION BY region)`.as('payload_region'),
                    mtdSto: sql<string>`SUM(${sq1.revMtd})`.as('mtd_sto'),
                    mtdWok: sql<string>`SUM(SUM(${sq1.revMtd})) OVER (PARTITION BY region, branch, wok)`.as('mtd_wok'),
                    mtdBranch: sql<string>`SUM(SUM(${sq1.revMtd})) OVER (PARTITION BY region, branch)`.as('mtd_branch'),
                    mtdRegion: sql<string>`SUM(SUM(${sq1.revMtd})) OVER (PARTITION BY region)`.as('mtd_region'),
                    payloadM1Sto: sql<string>`SUM(${sq1.payloadM1})`.as('payloadm1_sto'),
                    payloadM1Wok: sql<string>`SUM(SUM(${sq1.payloadM1})) OVER (PARTITION BY region, branch, wok)`.as('payloadm1_wok'),
                    payloadM1Branch: sql<string>`SUM(SUM(${sq1.payloadM1})) OVER (PARTITION BY region, branch)`.as('payloadm1_branch'),
                    payloadM1Region: sql<string>`SUM(SUM(${sq1.payloadM1})) OVER (PARTITION BY region)`.as('payloadm1_region'),
                    m1Sto: sql<string>`SUM(${sq1.revM1})`.as('m1_sto'),
                    m1Wok: sql<string>`SUM(SUM(${sq1.revM1})) OVER (PARTITION BY region, branch, wok)`.as('m1_wok'),
                    m1Branch: sql<string>`SUM(SUM(${sq1.revM1})) OVER (PARTITION BY region, branch)`.as('m1_branch'),
                    m1Region: sql<string>`SUM(SUM(${sq1.revM1})) OVER (PARTITION BY region)`.as('m1_region'),
                    m2Sto: sql<string>`SUM(${sq1.revM2})`.as('m2_sto'),
                    m2Wok: sql<string>`SUM(SUM(${sq1.revM2})) OVER (PARTITION BY region, branch, wok)`.as('m2_wok'),
                    m2Branch: sql<string>`SUM(SUM(${sq1.revM2})) OVER (PARTITION BY region, branch)`.as('m2_branch'),
                    m2Region: sql<string>`SUM(SUM(${sq1.revM2})) OVER (PARTITION BY region)`.as('m2_region'),
                    m3Sto: sql<string>`SUM(${sq1.revM3})`.as('m3_sto'),
                    m3Wok: sql<string>`SUM(SUM(${sq1.revM3})) OVER (PARTITION BY region, branch, wok)`.as('m3_wok'),
                    m3Branch: sql<string>`SUM(SUM(${sq1.revM3})) OVER (PARTITION BY region, branch)`.as('m3_branch'),
                    m3Region: sql<string>`SUM(SUM(${sq1.revM3})) OVER (PARTITION BY region)`.as('m3_region'),
                })
                .from(sq1)
                .groupBy(sql`1,2,3,4`)
                .orderBy(sql`1,2,3,4`)
                .prepare()

            const [revenue] = await Promise.all([
                p1.execute()
            ])

            const regionMap = new Map();

            const today = parseInt(format(selectedDate, 'd'));
            const daysInCurrMonth = getDaysInMonth(selectedDate)
            const daysInPrevMonth = getDaysInMonth(subMonths(selectedDate, 1))
            const daysInPrevMonth2 = getDaysInMonth(subMonths(selectedDate, 2))
            const daysInPrevMonth3 = getDaysInMonth(subMonths(selectedDate, 3))

            revenue.forEach((row) => {
                const regionalName = row.region;
                const branchName = row.branch;
                const wokName = row.wok;
                const stoName = row.sto;

                // Initialize region if not exists
                const region = regionMap.get(regionalName) || regionMap.set(regionalName, {
                    name: regionalName,
                    revMtd: Number(row.mtdRegion) || 0,
                    revM1: Number(row.m1Region) || 0,
                    revM2: Number(row.m2Region) || 0,
                    revM3: Number(row.m3Region) || 0,
                    drMtd: Number(row.mtdRegion) / today || 0,
                    drM1: Number(row.m1Region) / daysInPrevMonth || 0,
                    drM2: Number(row.m2Region) / daysInPrevMonth2 || 0,
                    drM3: Number(row.m3Region) / daysInPrevMonth3 || 0,
                    subs: Number(row.subsRegion) || 0,
                    branches: new Map()
                }).get(regionalName)

                // Initialize branch if not exists
                const branch = region.branches.get(branchName) ||
                    (region.branches.set(branchName, {
                        name: branchName,
                        revMtd: Number(row.mtdBranch) || 0,
                        revM1: Number(row.m1Branch) || 0,
                        revM2: Number(row.m2Branch) || 0,
                        revM3: Number(row.m3Branch) || 0,
                        drMtd: Number(row.mtdBranch) / today || 0,
                        drM1: Number(row.m1Branch) / daysInPrevMonth || 0,
                        drM2: Number(row.m2Branch) / daysInPrevMonth2 || 0,
                        drM3: Number(row.m3Branch) / daysInPrevMonth3 || 0,
                        subs: Number(row.subsBranch) || 0,
                        woks: new Map()
                    }), region.branches.get(branchName))

                // Initialize wok if not exists
                const wok = branch.woks.get(wokName) ||
                    (branch.woks.set(wokName, {
                        name: wokName,
                        revMtd: Number(row.mtdWok) || 0,
                        revM1: Number(row.m1Wok) || 0,
                        revM2: Number(row.m2Wok) || 0,
                        revM3: Number(row.m3Wok) || 0,
                        drMtd: Number(row.mtdWok) / today || 0,
                        drM1: Number(row.m1Wok) / daysInPrevMonth || 0,
                        drM2: Number(row.m2Wok) / daysInPrevMonth2 || 0,
                        drM3: Number(row.m3Wok) / daysInPrevMonth3 || 0,
                        subs: Number(row.subsWok) || 0,
                        stos: new Map()
                    }), branch.woks.get(wokName))

                // Initialize sto if not exists
                if (!wok.stos.has(stoName)) {
                    wok.stos.set(stoName, {
                        name: stoName,
                        revMtd: Number(row.mtdSto) || 0,
                        revM1: Number(row.m1Sto) || 0,
                        revM2: Number(row.m2Sto) || 0,
                        revM3: Number(row.m3Sto) || 0,
                        drMtd: Number(row.mtdSto) / today || 0,
                        drM1: Number(row.m1Sto) / daysInPrevMonth || 0,
                        drM2: Number(row.m2Sto) / daysInPrevMonth2 || 0,
                        drM3: Number(row.m3Sto) / daysInPrevMonth3 || 0,
                        subs: Number(row.subsSto) || 0
                    });
                }
            });

            const finalDataRevenue: FinalDataRevenue = Array.from(regionMap.values()).map((region) => ({
                ...region,
                branches: Array.from(region.branches.values()).map((branch: any) => ({
                    ...branch,
                    woks: Array.from(branch.woks.values()).map((wok: any) => ({
                        ...wok,
                        stos: Array.from(wok.stos.values())
                    }))
                }))
            }));

            return c.json({ data: finalDataRevenue }, 200)
        })

export default app

// Base interface for common properties across all entities
interface RevenueBase {
    name: string;
    revMtd: number;
    revM1: number;
    revM2: number;
    revM3: number;
    drMtd: number;
    drM1: number;
    drM2: number;
    drM3: number;
    subs: number;
}

// STO (Store) level entity
interface StoEntity extends RevenueBase {
    // No additional nested structures at the STO level
}

// WOK level entity
interface WokEntity extends RevenueBase {
    stos: StoEntity[];
}

// Branch level entity
interface BranchEntity extends RevenueBase {
    woks: WokEntity[];
}

// Region level entity (top level)
interface RegionEntity extends RevenueBase {
    branches: BranchEntity[];
}

// The final data structure type
type FinalDataRevenue = RegionEntity[];