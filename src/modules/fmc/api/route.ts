import { endOfMonth, format, getDaysInMonth, subDays, subMonths } from "date-fns";
import { eq, getTableName, sql, sum } from "drizzle-orm";
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
            const multidimDay = isCurrMonth ? format(selectedDate, 'dd') : format(closingDate, 'dd')

            const ihOrderingDetailOrder = dynamicIhOrderingDetailOrderTable(currYear, format(new Date(), 'MM'))
            const multidim = dynamicMultidimTable(currYear, multidimMonth, multidimDay)
            console.log({ table: getTableName(multidim) })
            console.log({ table: getTableName(ihOrderingDetailOrder) })
            console.log({ multidimDay, selectedDate: format(selectedDate, 'yyyy-MM-dd') })

            const sq1 = db6
                .select({
                    region: ihOrderingDetailOrder.region,
                    branch: ihOrderingDetailOrder.branch,
                    wok: ihOrderingDetailOrder.wok,
                    stoCo: ihOrderingDetailOrder.stoCo,
                    payload: sum(multidim.vol_data_mtd).as('payload'),
                    payloadM1: sum(multidim.vol_data_m1).as('payload_m1'),
                    subs: sql<number>`COUNT(DISTINCT CASE WHEN ${multidim.rev_mtd} > 0 THEN ${multidim.msisdn} END)`.as('subs'),
                    subsM1: sql<number>`COUNT(DISTINCT CASE WHEN ${multidim.rev_m1} > 0 THEN ${multidim.msisdn} END)`.as('subs_m1'),
                    subsM2: sql<number>`COUNT(DISTINCT CASE WHEN ${multidim.rev_m2} > 0 THEN ${multidim.msisdn} END)`.as('subs_m2'),
                    subsM3: sql<number>`COUNT(DISTINCT CASE WHEN ${multidim.rev_m3} > 0 THEN ${multidim.msisdn} END)`.as('subs_m3'),
                    revMtd: sum(multidim.rev_mtd).as('rev_mtd'),
                    revM1: sum(multidim.rev_m1).as('rev_m1'),
                    revM2: sum(multidim.rev_m2).as('rev_m2'),
                    revM3: sum(multidim.rev_m3).as('rev_m3')
                })
                .from(ihOrderingDetailOrder)
                .leftJoin(fmcMconTable, eq(ihOrderingDetailOrder.serviceId, fmcMconTable.notel))
                .leftJoin(multidim, eq(fmcMconTable.msisdnRecommendation, multidim.msisdn))
                .where(sql`${ihOrderingDetailOrder.orderType} = 'NEW SALES' AND ${ihOrderingDetailOrder.region} = 'MALUKU DAN PAPUA' AND MONTH(${ihOrderingDetailOrder.psTs}) = ${currMonth} AND YEAR(${ihOrderingDetailOrder.psTs}) = ${currYear}`)
                .groupBy(sql`1,2,3,4`)
                .as('aa')

            // RGB 
            const sq2 = db6
                .select({
                    region: ihOrderingDetailOrder.region,
                    branch: ihOrderingDetailOrder.branch,
                    wok: ihOrderingDetailOrder.wok,
                    stoCo: ihOrderingDetailOrder.stoCo,
                    rgb_data_mtd: sql<number>`COUNT(DISTINCT CASE WHEN ${multidim.rev_data_mtd} > 0 THEN ${multidim.msisdn} END)`.as('rgb_data_mtd'),
                    rgb_data_m1: sql<number>`COUNT(DISTINCT CASE WHEN ${multidim.rev_data_m1} > 0 THEN ${multidim.msisdn} END)`.as('rgb_data_m1'),
                    rgb_data_m2: sql<number>`COUNT(DISTINCT CASE WHEN ${multidim.rev_data_m2} > 0 THEN ${multidim.msisdn} END)`.as('rgb_data_m2'),
                    rgb_data_m3: sql<number>`COUNT(DISTINCT CASE WHEN ${multidim.rev_data_m3} > 0 THEN ${multidim.msisdn} END)`.as('rgb_data_m3'),
                    rgb_voice_mtd: sql<number>`COUNT(DISTINCT CASE WHEN ${multidim.rev_voice_mtd} > 0 THEN ${multidim.msisdn} END)`.as('rgb_voice_mtd'),
                    rgb_voice_m1: sql<number>`COUNT(DISTINCT CASE WHEN ${multidim.rev_voice_m1} > 0 THEN ${multidim.msisdn} END)`.as('rgb_voice_m1'),
                    rgb_voice_m2: sql<number>`COUNT(DISTINCT CASE WHEN ${multidim.rev_voice_m2} > 0 THEN ${multidim.msisdn} END)`.as('rgb_voice_m2'),
                    rgb_voice_m3: sql<number>`COUNT(DISTINCT CASE WHEN ${multidim.rev_voice_m3} > 0 THEN ${multidim.msisdn} END)`.as('rgb_voice_m3'),
                    rgb_digital_mtd: sql<number>`COUNT(DISTINCT CASE WHEN ${multidim.rev_digital_mtd} > 0 THEN ${multidim.msisdn} END)`.as('rgb_digital_mtd'),
                    rgb_digital_m1: sql<number>`COUNT(DISTINCT CASE WHEN ${multidim.rev_digital_m1} > 0 THEN ${multidim.msisdn} END)`.as('rgb_digital_m1'),
                    rgb_digital_m2: sql<number>`COUNT(DISTINCT CASE WHEN ${multidim.rev_digital_m2} > 0 THEN ${multidim.msisdn} END)`.as('rgb_digital_m2'),
                    rgb_digital_m3: sql<number>`COUNT(DISTINCT CASE WHEN ${multidim.rev_digital_m3} > 0 THEN ${multidim.msisdn} END)`.as('rgb_digital_m3'),
                    rgb_all_mtd: sql<number>`COUNT(DISTINCT CASE WHEN ${multidim.rev_mtd} > 0 THEN ${multidim.msisdn} END)`.as('rgb_all_mtd'),
                    rgb_all_m1: sql<number>`COUNT(DISTINCT CASE WHEN ${multidim.rev_m1} > 0 THEN ${multidim.msisdn} END)`.as('rgb_all_m1'),
                    rgb_all_m2: sql<number>`COUNT(DISTINCT CASE WHEN ${multidim.rev_m2} > 0 THEN ${multidim.msisdn} END)`.as('rgb_all_m2'),
                    rgb_all_m3: sql<number>`COUNT(DISTINCT CASE WHEN ${multidim.rev_m3} > 0 THEN ${multidim.msisdn} END)`.as('rgb_all_m3'),
                })
                .from(ihOrderingDetailOrder)
                .leftJoin(fmcMconTable, eq(ihOrderingDetailOrder.serviceId, fmcMconTable.notel))
                .leftJoin(multidim, eq(fmcMconTable.msisdnRecommendation, multidim.msisdn))
                .where(sql`${ihOrderingDetailOrder.orderType} = 'NEW SALES' AND ${ihOrderingDetailOrder.region} = 'MALUKU DAN PAPUA' AND MONTH(${ihOrderingDetailOrder.psTs}) = ${currMonth} AND YEAR(${ihOrderingDetailOrder.psTs}) = ${currYear}`)
                .groupBy(sql`1,2,3,4`)
                .as('bb')


            const q1 = db6
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
                    subsM1Sto: sql<string>`SUM(${sq1.subsM1})`.as('subs_m1_sto'),
                    subsM1Wok: sql<string>`SUM(${sq1.subsM1}) OVER (PARTITION BY region, branch, wok)`.as('subs_m1_wok'),
                    subsM1Branch: sql<string>`SUM(${sq1.subsM1}) OVER (PARTITION BY region, branch)`.as('subs_m1_branch'),
                    subsM1Region: sql<string>`SUM(${sq1.subsM1}) OVER (PARTITION BY region)`.as('subs_m1_region'),
                    subsM2Sto: sql<string>`SUM(${sq1.subsM2})`.as('subs_m2_sto'),
                    subsM2Wok: sql<string>`SUM(${sq1.subsM2}) OVER (PARTITION BY region, branch, wok)`.as('subs_m2_wok'),
                    subsM2Branch: sql<string>`SUM(${sq1.subsM2}) OVER (PARTITION BY region, branch)`.as('subs_m2_branch'),
                    subsM2Region: sql<string>`SUM(${sq1.subsM2}) OVER (PARTITION BY region)`.as('subs_m2_region'),
                    subsM3Sto: sql<string>`SUM(${sq1.subsM3})`.as('subs_m3_sto'),
                    subsM3Wok: sql<string>`SUM(${sq1.subsM3}) OVER (PARTITION BY region, branch, wok)`.as('subs_m3_wok'),
                    subsM3Branch: sql<string>`SUM(${sq1.subsM3}) OVER (PARTITION BY region, branch)`.as('subs_m3_branch'),
                    subsM3Region: sql<string>`SUM(${sq1.subsM3}) OVER (PARTITION BY region)`.as('subs_m3_region'),
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

            const q2 = db6
                .select({
                    region: sq2.region,
                    branch: sq2.branch,
                    wok: sq2.wok,
                    sto: sq2.stoCo,
                    rgbAllSto: sql<number>`SUM(${sq2.rgb_all_mtd})`.as('rgb_all_sto'),
                    rgbAllWok: sql<number>`SUM(SUM(${sq2.rgb_all_mtd})) OVER (PARTITION BY region, branch, wok)`.as('rgb_all_wok'),
                    rgbAllBranch: sql<number>`SUM(SUM(${sq2.rgb_all_mtd})) OVER (PARTITION BY region, branch)`.as('rgb_all_branch'),
                    rgbAllRegion: sql<number>`SUM(SUM(${sq2.rgb_all_mtd})) OVER (PARTITION BY region)`.as('rgb_all_region'),
                    rgbDataSto: sql<number>`SUM(${sq2.rgb_data_mtd})`.as('rgb_data_sto'),
                    rgbDataWok: sql<number>`SUM(SUM(${sq2.rgb_data_mtd})) OVER (PARTITION BY region, branch, wok)`.as('rgb_data_wok'),
                    rgbDataBranch: sql<number>`SUM(SUM(${sq2.rgb_data_mtd})) OVER (PARTITION BY region, branch)`.as('rgb_data_branch'),
                    rgbDataRegion: sql<number>`SUM(SUM(${sq2.rgb_data_mtd})) OVER (PARTITION BY region)`.as('rgb_data_region'),
                    rgbVoiceSto: sql<number>`SUM(${sq2.rgb_voice_mtd})`.as('rgb_voice_sto'),
                    rgbVoiceWok: sql<number>`SUM(SUM(${sq2.rgb_voice_mtd})) OVER (PARTITION BY region, branch, wok)`.as('rgb_voice_wok'),
                    rgbVoiceBranch: sql<number>`SUM(SUM(${sq2.rgb_voice_mtd})) OVER (PARTITION BY region, branch)`.as('rgb_voice_branch'),
                    rgbVoiceRegion: sql<number>`SUM(SUM(${sq2.rgb_voice_mtd})) OVER (PARTITION BY region)`.as('rgb_voice_region'),
                    rgbDigitalSto: sql<number>`SUM(${sq2.rgb_digital_mtd})`.as('rgb_digital_sto'),
                    rgbDigitalWok: sql<number>`SUM(SUM(${sq2.rgb_digital_mtd})) OVER (PARTITION BY region, branch, wok)`.as('rgb_digital_wok'),
                    rgbDigitalBranch: sql<number>`SUM(SUM(${sq2.rgb_digital_mtd})) OVER (PARTITION BY region, branch)`.as('rgb_digital_branch'),
                    rgbDigitalRegion: sql<number>`SUM(SUM(${sq2.rgb_digital_mtd})) OVER (PARTITION BY region)`.as('rgb_digital_region'),
                    rgbAllStoM1: sql<number>`SUM(${sq2.rgb_all_m1})`.as('rgb_all_sto_m1'),
                    rgbAllWokM1: sql<number>`SUM(SUM(${sq2.rgb_all_m1})) OVER (PARTITION BY region, branch, wok)`.as('rgb_all_wok_m1'),
                    rgbAllBranchM1: sql<number>`SUM(SUM(${sq2.rgb_all_m1})) OVER (PARTITION BY region, branch)`.as('rgb_all_branch_m1'),
                    rgbAllRegionM1: sql<number>`SUM(SUM(${sq2.rgb_all_m1})) OVER (PARTITION BY region)`.as('rgb_all_region_m1'),
                    rgbDataStoM1: sql<number>`SUM(${sq2.rgb_data_m1})`.as('rgb_data_sto_m1'),
                    rgbDataWokM1: sql<number>`SUM(SUM(${sq2.rgb_data_m1})) OVER (PARTITION BY region, branch, wok)`.as('rgb_data_wok_m1'),
                    rgbDataBranchM1: sql<number>`SUM(SUM(${sq2.rgb_data_m1})) OVER (PARTITION BY region, branch)`.as('rgb_data_branch_m1'),
                    rgbDataRegionM1: sql<number>`SUM(SUM(${sq2.rgb_data_m1})) OVER (PARTITION BY region)`.as('rgb_data_region_m1'),
                    rgbVoiceStoM1: sql<number>`SUM(${sq2.rgb_voice_m1})`.as('rgb_voice_sto_m1'),
                    rgbVoiceWokM1: sql<number>`SUM(SUM(${sq2.rgb_voice_m1})) OVER (PARTITION BY region, branch, wok)`.as('rgb_voice_wok_m1'),
                    rgbVoiceBranchM1: sql<number>`SUM(SUM(${sq2.rgb_voice_m1})) OVER (PARTITION BY region, branch)`.as('rgb_voice_branch_m1'),
                    rgbVoiceRegionM1: sql<number>`SUM(SUM(${sq2.rgb_voice_m1})) OVER (PARTITION BY region)`.as('rgb_voice_region_m1'),
                    rgbDigitalStoM1: sql<number>`SUM(${sq2.rgb_digital_m1})`.as('rgb_digital_sto_m1'),
                    rgbDigitalWokM1: sql<number>`SUM(SUM(${sq2.rgb_digital_m1})) OVER (PARTITION BY region, branch, wok)`.as('rgb_digital_wok_m1'),
                    rgbDigitalBranchM1: sql<number>`SUM(SUM(${sq2.rgb_digital_m1})) OVER (PARTITION BY region, branch)`.as('rgb_digital_branch_m1'),
                    rgbDigitalRegionM1: sql<number>`SUM(SUM(${sq2.rgb_digital_m1})) OVER (PARTITION BY region)`.as('rgb_digital_region_m1'),
                    rgbAllStoM2: sql<number>`SUM(${sq2.rgb_all_m2})`.as('rgb_all_sto_m2'),
                    rgbAllWokM2: sql<number>`SUM(SUM(${sq2.rgb_all_m2})) OVER (PARTITION BY region, branch, wok)`.as('rgb_all_wok_m2'),
                    rgbAllBranchM2: sql<number>`SUM(SUM(${sq2.rgb_all_m2})) OVER (PARTITION BY region, branch)`.as('rgb_all_branch_m2'),
                    rgbAllRegionM2: sql<number>`SUM(SUM(${sq2.rgb_all_m2})) OVER (PARTITION BY region)`.as('rgb_all_region_m2'),
                    rgbDataStoM2: sql<number>`SUM(${sq2.rgb_data_m2})`.as('rgb_data_sto_m2'),
                    rgbDataWokM2: sql<number>`SUM(SUM(${sq2.rgb_data_m2})) OVER (PARTITION BY region, branch, wok)`.as('rgb_data_wok_m2'),
                    rgbDataBranchM2: sql<number>`SUM(SUM(${sq2.rgb_data_m2})) OVER (PARTITION BY region, branch)`.as('rgb_data_branch_m2'),
                    rgbDataRegionM2: sql<number>`SUM(SUM(${sq2.rgb_data_m2})) OVER (PARTITION BY region)`.as('rgb_data_region_m2'),
                    rgbVoiceStoM2: sql<number>`SUM(${sq2.rgb_voice_m2})`.as('rgb_voice_sto_m2'),
                    rgbVoiceWokM2: sql<number>`SUM(SUM(${sq2.rgb_voice_m2})) OVER (PARTITION BY region, branch, wok)`.as('rgb_voice_wok_m2'),
                    rgbVoiceBranchM2: sql<number>`SUM(SUM(${sq2.rgb_voice_m2})) OVER (PARTITION BY region, branch)`.as('rgb_voice_branch_m2'),
                    rgbVoiceRegionM2: sql<number>`SUM(SUM(${sq2.rgb_voice_m2})) OVER (PARTITION BY region)`.as('rgb_voice_region_m2'),
                    rgbDigitalStoM2: sql<number>`SUM(${sq2.rgb_digital_m2})`.as('rgb_digital_sto_m2'),
                    rgbDigitalWokM2: sql<number>`SUM(SUM(${sq2.rgb_digital_m2})) OVER (PARTITION BY region, branch, wok)`.as('rgb_digital_wok_m2'),
                    rgbDigitalBranchM2: sql<number>`SUM(SUM(${sq2.rgb_digital_m2})) OVER (PARTITION BY region, branch)`.as('rgb_digital_branch_m2'),
                    rgbDigitalRegionM2: sql<number>`SUM(SUM(${sq2.rgb_digital_m2})) OVER (PARTITION BY region)`.as('rgb_digital_region_m2'),
                    rgbAllStoM3: sql<number>`SUM(${sq2.rgb_all_m3})`.as('rgb_all_sto_m3'),
                    rgbAllWokM3: sql<number>`SUM(SUM(${sq2.rgb_all_m3})) OVER (PARTITION BY region, branch, wok)`.as('rgb_all_wok_m3'),
                    rgbAllBranchM3: sql<number>`SUM(SUM(${sq2.rgb_all_m3})) OVER (PARTITION BY region, branch)`.as('rgb_all_branch_m3'),
                    rgbAllRegionM3: sql<number>`SUM(SUM(${sq2.rgb_all_m3})) OVER (PARTITION BY region)`.as('rgb_all_region_m3'),
                    rgbDataStoM3: sql<number>`SUM(${sq2.rgb_data_m3})`.as('rgb_data_sto_m3'),
                    rgbDataWokM3: sql<number>`SUM(SUM(${sq2.rgb_data_m3})) OVER (PARTITION BY region, branch, wok)`.as('rgb_data_wok_m3'),
                    rgbDataBranchM3: sql<number>`SUM(SUM(${sq2.rgb_data_m3})) OVER (PARTITION BY region, branch)`.as('rgb_data_branch_m3'),
                    rgbDataRegionM3: sql<number>`SUM(SUM(${sq2.rgb_data_m3})) OVER (PARTITION BY region)`.as('rgb_data_region_m3'),
                    rgbVoiceStoM3: sql<number>`SUM(${sq2.rgb_voice_m3})`.as('rgb_voice_sto_m3'),
                    rgbVoiceWokM3: sql<number>`SUM(SUM(${sq2.rgb_voice_m3})) OVER (PARTITION BY region, branch, wok)`.as('rgb_voice_wok_m3'),
                    rgbVoiceBranchM3: sql<number>`SUM(SUM(${sq2.rgb_voice_m3})) OVER (PARTITION BY region, branch)`.as('rgb_voice_branch_m3'),
                    rgbVoiceRegionM3: sql<number>`SUM(SUM(${sq2.rgb_voice_m3})) OVER (PARTITION BY region)`.as('rgb_voice_region_m3'),
                    rgbDigitalStoM3: sql<number>`SUM(${sq2.rgb_digital_m3})`.as('rgb_digital_sto_m3'),
                    rgbDigitalWokM3: sql<number>`SUM(SUM(${sq2.rgb_digital_m3})) OVER (PARTITION BY region, branch, wok)`.as('rgb_digital_wok_m3'),
                    rgbDigitalBranchM3: sql<number>`SUM(SUM(${sq2.rgb_digital_m3})) OVER (PARTITION BY region, branch)`.as('rgb_digital_branch_m3'),
                    rgbDigitalRegionM3: sql<number>`SUM(SUM(${sq2.rgb_digital_m3})) OVER (PARTITION BY region)`.as('rgb_digital_region_m3'),
                })
                .from(sq2)
                .groupBy(sql`1,2,3,4`)
                .orderBy(sql`1,2,3,4`)
                .prepare()

            const [revenue, rgb] = await Promise.all([
                q1.execute(),
                q2.execute()
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
                    subsM1: Number(row.subsM1Region) || 0,
                    subsM2: Number(row.subsM2Region) || 0,
                    subsM3: Number(row.subsM3Region) || 0,
                    payload: Number(row.payloadRegion) || 0,
                    payloadM1: Number(row.payloadM1Region) || 0,
                    arpu: Number(row.mtdRegion) / Number(row.subsRegion) || 0,
                    arpuM1: Number(row.m1Region) / Number(row.subsM1Region) || 0,
                    arpuM2: Number(row.m2Region) / Number(row.subsM2Region) || 0,
                    arpuM3: Number(row.m3Region) / Number(row.subsM3Region) || 0,
                    rgbAll: 0,
                    rgbData: 0,
                    rgbDigital: 0,
                    rgbVoice: 0,
                    rgbAllM1: 0,
                    rgbVoiceM1: 0,
                    rgbDigitalM1: 0,
                    rgbDataM1: 0,
                    rgbAllM2: 0,
                    rgbVoiceM2: 0,
                    rgbDigitalM2: 0,
                    rgbDataM2: 0,
                    rgbAllM3: 0,
                    rgbVoiceM3: 0,
                    rgbDigitalM3: 0,
                    rgbDataM3: 0,
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
                        subsM1: Number(row.subsM1Branch) || 0,
                        subsM2: Number(row.subsM2Branch) || 0,
                        subsM3: Number(row.subsM3Branch) || 0,
                        payload: Number(row.payloadBranch) || 0,
                        payloadM1: Number(row.payloadM1Branch) || 0,
                        arpu: Number(row.mtdBranch) / Number(row.subsBranch) || 0,
                        arpuM1: Number(row.m1Branch) / Number(row.subsM1Branch) || 0,
                        arpuM2: Number(row.m2Branch) / Number(row.subsM2Branch) || 0,
                        arpuM3: Number(row.m3Branch) / Number(row.subsM3Branch) || 0,
                        rgbAll: 0,
                        rgbData: 0,
                        rgbDigital: 0,
                        rgbVoice: 0,
                        rgbAllM1: 0,
                        rgbVoiceM1: 0,
                        rgbDigitalM1: 0,
                        rgbDataM1: 0,
                        rgbAllM2: 0,
                        rgbVoiceM2: 0,
                        rgbDigitalM2: 0,
                        rgbDataM2: 0,
                        rgbAllM3: 0,
                        rgbVoiceM3: 0,
                        rgbDigitalM3: 0,
                        rgbDataM3: 0,
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
                        subsM1: Number(row.subsM1Wok) || 0,
                        subsM2: Number(row.subsM2Wok) || 0,
                        subsM3: Number(row.subsM3Wok) || 0,
                        payload: Number(row.payloadWok) || 0,
                        payloadM1: Number(row.payloadM1Wok) || 0,
                        arpu: Number(row.mtdWok) / Number(row.subsWok) || 0,
                        arpuM1: Number(row.m1Wok) / Number(row.subsM1Wok) || 0,
                        arpuM2: Number(row.m2Wok) / Number(row.subsM2Wok) || 0,
                        arpuM3: Number(row.m3Wok) / Number(row.subsM3Wok) || 0,
                        rgbAll: 0,
                        rgbData: 0,
                        rgbDigital: 0,
                        rgbVoice: 0,
                        rgbAllM1: 0,
                        rgbVoiceM1: 0,
                        rgbDigitalM1: 0,
                        rgbDataM1: 0,
                        rgbAllM2: 0,
                        rgbVoiceM2: 0,
                        rgbDigitalM2: 0,
                        rgbDataM2: 0,
                        rgbAllM3: 0,
                        rgbVoiceM3: 0,
                        rgbDigitalM3: 0,
                        rgbDataM3: 0,
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
                        subs: Number(row.subsSto) || 0,
                        subsM1: Number(row.subsM1Sto) || 0,
                        subsM2: Number(row.subsM2Sto) || 0,
                        subsM3: Number(row.subsM3Sto) || 0,
                        payload: Number(row.payloadSto) || 0,
                        payloadM1: Number(row.payloadM1Sto) || 0,
                        arpu: Number(row.mtdSto) / Number(row.subsSto) || 0,
                        arpuM1: Number(row.m1Sto) / Number(row.subsM1Sto) || 0,
                        arpuM2: Number(row.m2Sto) / Number(row.subsM2Sto) || 0,
                        arpuM3: Number(row.m3Sto) / Number(row.subsM3Sto) || 0,
                        rgbAll: 0,
                        rgbData: 0,
                        rgbDigital: 0,
                        rgbVoice: 0,
                        rgbAllM1: 0,
                        rgbVoiceM1: 0,
                        rgbDigitalM1: 0,
                        rgbDataM1: 0,
                        rgbAllM2: 0,
                        rgbVoiceM2: 0,
                        rgbDigitalM2: 0,
                        rgbDataM2: 0,
                        rgbAllM3: 0,
                        rgbVoiceM3: 0,
                        rgbDigitalM3: 0,
                        rgbDataM3: 0,
                    });
                }
            });

            rgb.forEach(row => {
                const regionalName = row.region;
                const branchName = row.branch;
                const wokName = row.wok;
                const stoName = row.sto;

                const region = regionMap.get(regionalName) || regionMap.set(regionalName, {
                    name: regionalName,
                    revMtd: 0,
                    revM1: 0,
                    revM2: 0,
                    revM3: 0,
                    drMtd: 0,
                    drM1: 0,
                    drM2: 0,
                    drM3: 0,
                    subs: 0,
                    payload: 0,
                    payloadM1: 0,
                    arpu: 0,
                    arpuM1: 0,
                    arpuM2: 0,
                    arpuM3: 0,
                    rgbAll: 0,
                    rgbData: 0,
                    rgbDigital: 0,
                    rgbVoice: 0,
                    rgbAllM1: 0,
                    rgbVoiceM1: 0,
                    rgbDigitalM1: 0,
                    rgbDataM1: 0,
                    rgbAllM2: 0,
                    rgbVoiceM2: 0,
                    rgbDigitalM2: 0,
                    rgbDataM2: 0,
                    rgbAllM3: 0,
                    rgbVoiceM3: 0,
                    rgbDigitalM3: 0,
                    rgbDataM3: 0,
                    branches: new Map()
                }).get(regionalName)
                region.rgbAll = row.rgbAllRegion || 0
                region.rgbData = row.rgbDataRegion || 0
                region.rgbDigital = row.rgbDigitalRegion || 0
                region.rgbVoice = row.rgbVoiceRegion || 0
                region.rgbAllM1 = row.rgbAllRegionM1 || 0
                region.rgbDataM1 = row.rgbDataRegionM1 || 0
                region.rgbDigitalM1 = row.rgbDigitalRegionM1 || 0
                region.rgbVoiceM1 = row.rgbVoiceRegionM1 || 0
                region.rgbAllM2 = row.rgbAllRegionM2 || 0
                region.rgbDataM2 = row.rgbDataRegionM2 || 0
                region.rgbDigitalM2 = row.rgbDigitalRegionM2 || 0
                region.rgbVoiceM2 = row.rgbVoiceRegionM2 || 0
                region.rgbAllM3 = row.rgbAllRegionM3 || 0
                region.rgbDataM3 = row.rgbDataRegionM3 || 0
                region.rgbDigitalM3 = row.rgbDigitalRegionM3 || 0
                region.rgbVoiceM3 = row.rgbVoiceRegionM3 || 0

                // Initialize branch if not exists
                const branch = region.branches.get(branchName) ||
                    (region.branches.set(branchName, {
                        name: branchName,
                        revMtd: 0,
                        revM1: 0,
                        revM2: 0,
                        revM3: 0,
                        drMtd: 0,
                        drM1: 0,
                        drM2: 0,
                        drM3: 0,
                        subs: 0,
                        payload: 0,
                        payloadM1: 0,
                        arpu: 0,
                        arpuM1: 0,
                        arpuM2: 0,
                        arpuM3: 0,
                        rgbAll: 0,
                        rgbData: 0,
                        rgbDigital: 0,
                        rgbVoice: 0,
                        rgbAllM1: 0,
                        rgbVoiceM1: 0,
                        rgbDigitalM1: 0,
                        rgbDataM1: 0,
                        rgbAllM2: 0,
                        rgbVoiceM2: 0,
                        rgbDigitalM2: 0,
                        rgbDataM2: 0,
                        rgbAllM3: 0,
                        rgbVoiceM3: 0,
                        rgbDigitalM3: 0,
                        rgbDataM3: 0,
                        woks: new Map()
                    }), region.branches.get(branchName))
                branch.rgbAll = Number(row.rgbAllBranch)
                branch.rgbAll = row.rgbAllBranch || 0
                branch.rgbData = row.rgbDataBranch || 0
                branch.rgbDigital = row.rgbDigitalBranch || 0
                branch.rgbVoice = row.rgbVoiceBranch || 0
                branch.rgbAllM1 = row.rgbAllBranchM1 || 0
                branch.rgbDataM1 = row.rgbDataBranchM1 || 0
                branch.rgbDigitalM1 = row.rgbDigitalBranchM1 || 0
                branch.rgbVoiceM1 = row.rgbVoiceBranchM1 || 0
                branch.rgbAllM2 = row.rgbAllBranchM2 || 0
                branch.rgbDataM2 = row.rgbDataBranchM2 || 0
                branch.rgbDigitalM2 = row.rgbDigitalBranchM2 || 0
                branch.rgbVoiceM2 = row.rgbVoiceBranchM2 || 0
                branch.rgbAllM3 = row.rgbAllBranchM3 || 0
                branch.rgbDataM3 = row.rgbDataBranchM3 || 0
                branch.rgbDigitalM3 = row.rgbDigitalBranchM3 || 0
                branch.rgbVoiceM3 = row.rgbVoiceBranchM3 || 0

                // Initialize wok if not exists
                const wok = branch.woks.get(wokName) ||
                    (branch.woks.set(wokName, {
                        name: wokName,
                        revMtd: 0,
                        revM1: 0,
                        revM2: 0,
                        revM3: 0,
                        drMtd: 0,
                        drM1: 0,
                        drM2: 0,
                        drM3: 0,
                        subs: 0,
                        payload: 0,
                        payloadM1: 0,
                        arpu: 0,
                        arpuM1: 0,
                        arpuM2: 0,
                        arpuM3: 0,
                        rgbAll: 0,
                        rgbData: 0,
                        rgbDigital: 0,
                        rgbVoice: 0,
                        rgbAllM1: 0,
                        rgbVoiceM1: 0,
                        rgbDigitalM1: 0,
                        rgbDataM1: 0,
                        rgbAllM2: 0,
                        rgbVoiceM2: 0,
                        rgbDigitalM2: 0,
                        rgbDataM2: 0,
                        rgbAllM3: 0,
                        rgbVoiceM3: 0,
                        rgbDigitalM3: 0,
                        rgbDataM3: 0,
                        stos: new Map()
                    }), branch.woks.get(wokName))
                wok.rgbAll = Number(row.rgbAllWok)
                wok.rgbAll = row.rgbAllWok || 0
                wok.rgbData = row.rgbDataWok || 0
                wok.rgbDigital = row.rgbDigitalWok || 0
                wok.rgbVoice = row.rgbVoiceWok || 0
                wok.rgbAllM1 = row.rgbAllWokM1 || 0
                wok.rgbDataM1 = row.rgbDataWokM1 || 0
                wok.rgbDigitalM1 = row.rgbDigitalWokM1 || 0
                wok.rgbVoiceM1 = row.rgbVoiceWokM1 || 0
                wok.rgbAllM2 = row.rgbAllWokM2 || 0
                wok.rgbDataM2 = row.rgbDataWokM2 || 0
                wok.rgbDigitalM2 = row.rgbDigitalWokM2 || 0
                wok.rgbVoiceM2 = row.rgbVoiceWokM2 || 0
                wok.rgbAllM3 = row.rgbAllWokM3 || 0
                wok.rgbDataM3 = row.rgbDataWokM3 || 0
                wok.rgbDigitalM3 = row.rgbDigitalWokM3 || 0
                wok.rgbVoiceM3 = row.rgbVoiceWokM3 || 0

                // Initialize sto if not exists
                const sto = wok.stos.get(stoName) ||
                    (wok.stos.set(stoName, {
                        name: stoName,
                        revMtd: 0,
                        revM1: 0,
                        revM2: 0,
                        revM3: 0,
                        drMtd: 0,
                        drM1: 0,
                        drM2: 0,
                        drM3: 0,
                        subs: 0,
                        payload: 0,
                        payloadM1: 0,
                        arpu: 0,
                        arpuM1: 0,
                        arpuM2: 0,
                        arpuM3: 0,
                        rgbAll: 0,
                        rgbData: 0,
                        rgbDigital: 0,
                        rgbVoice: 0,
                        rgbAllM1: 0,
                        rgbVoiceM1: 0,
                        rgbDigitalM1: 0,
                        rgbDataM1: 0,
                        rgbAllM2: 0,
                        rgbVoiceM2: 0,
                        rgbDigitalM2: 0,
                        rgbDataM2: 0,
                        rgbAllM3: 0,
                        rgbVoiceM3: 0,
                        rgbDigitalM3: 0,
                        rgbDataM3: 0,
                    }), wok.stos.get(stoName))
                sto.rgbAll = Number(row.rgbAllSto)
                sto.rgbAll = row.rgbAllSto || 0
                sto.rgbData = row.rgbDataSto || 0
                sto.rgbDigital = row.rgbDigitalSto || 0
                sto.rgbVoice = row.rgbVoiceSto || 0
                sto.rgbAllM1 = row.rgbAllStoM1 || 0
                sto.rgbDataM1 = row.rgbDataStoM1 || 0
                sto.rgbDigitalM1 = row.rgbDigitalStoM1 || 0
                sto.rgbVoiceM1 = row.rgbVoiceStoM1 || 0
                sto.rgbAllM2 = row.rgbAllStoM2 || 0
                sto.rgbDataM2 = row.rgbDataStoM2 || 0
                sto.rgbDigitalM2 = row.rgbDigitalStoM2 || 0
                sto.rgbVoiceM2 = row.rgbVoiceStoM2 || 0
                sto.rgbAllM3 = row.rgbAllStoM3 || 0
                sto.rgbDataM3 = row.rgbDataStoM3 || 0
                sto.rgbDigitalM3 = row.rgbDigitalStoM3 || 0
                sto.rgbVoiceM3 = row.rgbVoiceStoM3 || 0
            })

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
    subsM1: number;
    subsM2: number;
    subsM3: number;
    payload: number;
    payloadM1: number;
    rgbAll: number;
    rgbVoice: number;
    rgbDigital: number;
    rgbData: number;
    rgbAllM1: number;
    rgbVoiceM1: number;
    rgbDigitalM1: number;
    rgbDataM1: number;
    rgbAllM2: number;
    rgbVoiceM2: number;
    rgbDigitalM2: number;
    rgbDataM2: number;
    rgbAllM3: number;
    rgbVoiceM3: number;
    rgbDigitalM3: number;
    rgbDataM3: number;
    arpu: number;
    arpuM1: number;
    arpuM2: number;
    arpuM3: number;
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