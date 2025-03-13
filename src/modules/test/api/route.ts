import { zValidator } from "@hono/zod-validator";
import { endOfMonth, format, startOfMonth, subDays, subMonths, subYears } from "date-fns";
import { and, count, eq } from "drizzle-orm";
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
                    rows: count()
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

            console.log(thisMonthRows);


            const workbook = new Exceljs.Workbook();
            const worksheet = workbook.addWorksheet('Sheet1');

            worksheet.columns = [
                { header: 'Rows', key: 'rows', width: 25 }
            ]

            worksheet.addRows(thisMonthRows)

            const buffer = await workbook.xlsx.writeBuffer();

            return c.newResponse(buffer, 200, {
                'Content-Disposition': 'attachment; filename=report.xlsx',
                'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
            })
        })

export default app