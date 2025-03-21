import { zValidator } from "@hono/zod-validator";
import { endOfMonth, format, startOfMonth, subDays, subMonths, subYears } from "date-fns";
import { and, count, eq, getTableColumns } from "drizzle-orm";
import { Hono } from "hono";
import { z } from "zod";
import Exceljs from "exceljs";
import { db2 } from "@/db";
import { revenueCVM } from "@/db/schema";
import { dynamicRevenueCVMTable } from "@/db/schema2";

const app = new Hono()
    .get('/', zValidator('query',
        z.object({ date: z.coerce.date().optional(), branch: z.string().optional(), subbranch: z.string().optional(), cluster: z.string().optional(), kabupaten: z.string().optional() })),
        async c => {
            const { date, branch, subbranch, cluster, kabupaten } = c.req.valid('query')
            const selectedDate = date ? new Date(date) : new Date()
            const month = (subDays(selectedDate, 3).getMonth() + 1).toString()

            // KOLOM DINAMIS UNTUK MEMILIH ANTARA KOLOM `m1-m12`
            const monthColumn = `m${month}` as keyof typeof revenueCVM.$inferSelect

            // VARIABLE TANGGAL UNTUK IMPORT TABEL SECARA DINAMIS
            const latestDataDate = subDays(selectedDate, 3); // - 3 days

            const currMonth = format(latestDataDate, 'MM')
            const currYear = format(latestDataDate, 'yyyy')
            const latestMonth = parseInt(format(latestDataDate, 'M'), 10)
            const isPrevMonthLastYear = currMonth === '01'
            const prevMonth = isPrevMonthLastYear ? '12' : format(subMonths(latestDataDate, 1), 'MM')
            const prevMonthYear = isPrevMonthLastYear ? format(subYears(latestDataDate, 1), 'yyyy') : format(latestDataDate, 'yyyy')
            const prevYear = format(subYears(latestDataDate, 1), 'yyyy')

            // TABEL `sa_detil_`
            const currRevCVM = dynamicRevenueCVMTable(currYear, currMonth)
            const prevMonthRevCVM = dynamicRevenueCVMTable(prevMonthYear, prevMonth)
            const prevYearCurrMonthRevCVM = dynamicRevenueCVMTable(prevYear, currMonth)
            const currYtdCVMRev: string[] = [];
            for (let month = 1; month <= latestMonth; month++) {
                const monthStr = month.toString().padStart(2, '0')
                currYtdCVMRev.push(`bba_broadband_daily_${currYear}${monthStr}`)
            }
            const prevYtdCVMRev: string[] = [];
            for (let month = 1; month <= latestMonth; month++) {
                const monthStr = month.toString().padStart(2, '0')
                prevYtdCVMRev.push(`bba_broadband_daily_${prevYear}${monthStr}`)
            }

            // VARIABLE TANGGAL
            // Get the last day of the selected month
            const lastDayOfSelectedMonth = endOfMonth(latestDataDate);
            const isEndOfMonth = latestDataDate.getDate() === lastDayOfSelectedMonth.getDate();

            const endOfCurrMonth = isEndOfMonth ? lastDayOfSelectedMonth : latestDataDate;
            const endOfPrevMonth = isEndOfMonth ? endOfMonth(subMonths(latestDataDate, 1)) : subMonths(latestDataDate, 1);
            const endOfPrevYearSameMonth = isEndOfMonth ? endOfMonth(subYears(latestDataDate, 1)) : subYears(latestDataDate, 1);

            // get the first day and last day of the selected month dynamically
            const firstDayOfCurrMonth = format(startOfMonth(latestDataDate), 'yyyy-MM-dd')
            const firstDayOfPrevMonth = format(startOfMonth(subMonths(latestDataDate, 1)), 'yyyy-MM-dd')
            const firstDayOfPrevYearCurrMonth = format(startOfMonth(subYears(latestDataDate, 1)), 'yyyy-MM-dd')

            const currDate = format(endOfCurrMonth, 'yyyy-MM-dd');
            const prevDate = format(endOfPrevMonth, 'yyyy-MM-dd');
            const prevYearCurrDate = format(endOfPrevYearSameMonth, 'yyyy-MM-dd');

            const p1 = db2
                .select({
                    ...getTableColumns(currRevCVM)
                })
                .from(currRevCVM)
                .where(
                    and(
                        eq(currRevCVM.packageType, 'btl'),
                        branch ? eq(currRevCVM.branch, branch) : undefined,
                        subbranch ? eq(currRevCVM.subbranch, subbranch) : undefined,
                        cluster ? eq(currRevCVM.cluster, cluster) : undefined,
                        kabupaten ? eq(currRevCVM.city, kabupaten) : undefined
                    )
                )
                .prepare()

            const [thisMonthRows] = await Promise.all([
                p1.execute()
            ])

            const workbook = new Exceljs.Workbook();
            const worksheet = workbook.addWorksheet('Sheet1');

            worksheet.columns = [
                { header: 'msisdn', key: 'msisdn', width: 25 },
                { header: 'trx_date', key: 'trx_date', width: 25 },
                { header: 'content_id', key: 'content_id', width: 25 },
                { header: 'pack_id', key: 'pack_id', width: 25 },
                { header: 'cp_name', key: 'cp_name', width: 25 },
                { header: 'region', key: 'region', width: 25 },
                { header: 'cluster', key: 'cluster', width: 25 },
                { header: 'branch', key: 'branch', width: 25 },
                { header: 'subbranch', key: 'subbranch', width: 25 },
                { header: 'city', key: 'city', width: 25 },
                { header: 'kecamatan', key: 'kecamatan', width: 25 },
                { header: 'brand', key: 'brand', width: 25 },
                { header: 'harga', key: 'harga', width: 25 },
                { header: 'package_type', key: 'package_type', width: 25 },
                { header: 'package_service', key: 'package_service', width: 25 },
                { header: 'package_category', key: 'package_category', width: 25 },
                { header: 'validity', key: 'validity', width: 25 },
                { header: 'numeric_quota', key: 'numeric_quota', width: 25 },
                { header: 'periode', key: 'periode', width: 25 },
                { header: 'zona', key: 'zona', width: 25 },
                { header: 'channel', key: 'channel', width: 25 },
                { header: 'detail_quota', key: 'detail_quota', width: 25 },
                { header: 'act_date', key: 'act_date', width: 25 },
                { header: 'los_segment', key: 'los_segment', width: 25 },
                { header: 'new_service', key: 'new_service', width: 25 },
                { header: 'new_tipe', key: 'new_tipe', width: 25 },
                { header: 'category', key: 'category', width: 25 },
                { header: 'trx', key: 'trx', width: 25 },
                { header: 'revenue', key: 'revenue', width: 25 },
                { header: 'channel_id', key: 'channel_id', width: 25 },
                { header: 'channel_name', key: 'channel_name', width: 25 },
                { header: 'vas_code', key: 'vas_code', width: 25 },
                { header: 'l4_name', key: 'l4_name', width: 25 },
                { header: 'lac', key: 'lac', width: 25 },
                { header: 'ci', key: 'ci', width: 25 },
                { header: 'payment_id', key: 'payment_id', width: 25 },
                { header: 'payment_method', key: 'payment_method', width: 25 },
                { header: 'flag_gift', key: 'flag_gift', width: 25 },
                { header: 'package_group', key: 'package_group', width: 25 },
                { header: 'package_subgroup', key: 'package_subgroup', width: 25 },
                { header: 'channel_new', key: 'channel_new', width: 25 },
            ]

            worksheet.addRows(thisMonthRows)

            const buffer = await workbook.xlsx.writeBuffer();

            return c.newResponse(buffer, 200, {
                'Content-Disposition': 'attachment; filename=report.xlsx',
                'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
            })
        })

export default app