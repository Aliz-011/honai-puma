import { db, db5 } from "@/db";
import { branches, clusters, kabupatens, regionals, subbranches, targetSO } from "@/db/schema";
import { dynamicRevenueSOTable } from "@/db/schema5";
import { zValidator } from "@hono/zod-validator";
import { endOfMonth, format, startOfMonth, subDays, subMonths, subYears } from "date-fns";
import { and, eq, gte, inArray, lte, not, sql } from "drizzle-orm";
import { MySqlRawQueryResult } from "drizzle-orm/mysql2";
import { Hono } from "hono";
import { z } from "zod";

const app = new Hono()
    .get('/',
        zValidator('query', z.object({ date: z.coerce.date().optional() })),
        async c => {
            const { date } = c.req.valid('query')
            const selectedDate = date ? new Date(date) : new Date()
            const month = (subDays(selectedDate, 3).getMonth() + 1).toString()

            // KOLOM DINAMIS UNTUK MEMILIH ANTARA KOLOM `m1-m12`
            const monthColumn = `m${month}` as keyof typeof targetSO.$inferSelect

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
            const currTrxSO = dynamicRevenueSOTable(currYear, currMonth)
            const prevMonthTrxSO = dynamicRevenueSOTable(prevMonthYear, prevMonth)
            const prevYearCurrMonthTrxSO = dynamicRevenueSOTable(prevYear, currMonth)
            const currYtdTrxSORev: string[] = [];
            for (let month = 1; month <= latestMonth; month++) {
                const monthStr = month.toString().padStart(2, '0')
                currYtdTrxSORev.push(`so_detil_${currYear}${monthStr}`)
            }
            const prevYtdTrxSORev: string[] = [];
            for (let month = 1; month <= latestMonth; month++) {
                const monthStr = month.toString().padStart(2, '0')
                prevYtdTrxSORev.push(`so_detil_${prevYear}${monthStr}`)
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


            const sq2 = db5
                .select({
                    regionName: sql<string>`CASE WHEN ${currTrxSO.regionSo} IN ('MALUKU DAN PAPUA', 'PUMA') THEN 'PUMA' END`.as('regionName'),
                    branchName: sql<string>`
                 CASE
                     WHEN ${currTrxSO.kabSo} IN (
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
                     WHEN ${currTrxSO.kabSo} IN (
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
                     WHEN ${currTrxSO.kabSo} IN (
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
                     WHEN ${currTrxSO.kabSo} IN (
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
                     WHEN ${currTrxSO.kabSo} IN (
                         'AMBON',
                         'KOTA AMBON',
                         'MALUKU TENGAH',
                         'SERAM BAGIAN TIMUR'
                     ) THEN 'AMBON'
                     WHEN ${currTrxSO.kabSo} IN (
                         'KEPULAUAN ARU',
                         'KOTA TUAL',
                         'MALUKU BARAT DAYA',
                         'MALUKU TENGGARA',
                         'MALUKU TENGGARA BARAT',
                         'KEPULAUAN TANIMBAR'
                     ) THEN 'KEPULAUAN AMBON'
                     WHEN ${currTrxSO.kabSo} IN ('BURU', 'BURU SELATAN', 'SERAM BAGIAN BARAT') THEN 'SERAM BURU'
                     WHEN ${currTrxSO.kabSo} IN ('KOTA JAYAPURA') THEN 'JAYAPURA'
                     WHEN ${currTrxSO.kabSo} IN (
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
                     WHEN ${currTrxSO.kabSo} IN ('MANOKWARI') THEN 'MANOKWARI'
                     WHEN ${currTrxSO.kabSo} IN (
                         'FAKFAK',
                         'FAK FAK',
                         'KAIMANA',
                         'MANOKWARI SELATAN',
                         'PEGUNUNGAN ARFAK',
                         'TELUK BINTUNI',
                         'TELUK WONDAMA'
                     ) THEN 'MANOKWARI OUTER'
                     WHEN ${currTrxSO.kabSo} IN (
                         'KOTA SORONG',
                         'MAYBRAT',
                         'RAJA AMPAT',
                         'SORONG',
                         'SORONG SELATAN',
                         'TAMBRAUW'
                     ) THEN 'SORONG RAJA AMPAT'
                     WHEN ${currTrxSO.kabSo} IN ('ASMAT', 'BOVEN DIGOEL', 'MAPPI', 'MERAUKE') THEN 'MERAUKE'
                     WHEN ${currTrxSO.kabSo} IN (
                         'INTAN JAYA',
                         'MIMIKA',
                         'PUNCAK',
                         'PUNCAK JAYA',
                         'TIMIKA'
                     ) THEN 'MIMIKA'
                     WHEN ${currTrxSO.kabSo} IN ('DEIYAI', 'DOGIYAI', 'NABIRE', 'PANIAI') THEN 'NABIRE'
                     ELSE NULL
                 END
                                `.as('subbranchName'),
                    clusterName: sql<string>`
                 CASE
                     WHEN ${currTrxSO.kabSo} IN (
                         'KOTA AMBON',
                         'MALUKU TENGAH',
                         'SERAM BAGIAN TIMUR'
                     ) THEN 'AMBON'
                     WHEN ${currTrxSO.kabSo} IN (
                         'KEPULAUAN ARU',
                         'KOTA TUAL',
                         'MALUKU BARAT DAYA',
                         'MALUKU TENGGARA',
                         'MALUKU TENGGARA BARAT',
                         'KEPULAUAN TANIMBAR'
                     ) THEN 'KEPULAUAN TUAL'
                     WHEN ${currTrxSO.kabSo} IN ('BURU', 'BURU SELATAN', 'SERAM BAGIAN BARAT') THEN 'SERAM BARAT BURU'
                     WHEN ${currTrxSO.kabSo} IN ('KOTA JAYAPURA') THEN 'KOTA JAYAPURA'
                     WHEN ${currTrxSO.kabSo} IN ('JAYAPURA', 'KEEROM', 'MAMBERAMO RAYA', 'SARMI') THEN 'JAYAPURA OUTER'
                     WHEN ${currTrxSO.kabSo} IN (
                         'BIAK',
                         'BIAK NUMFOR',
                         'KEPULAUAN YAPEN',
                         'SUPIORI',
                         'WAROPEN'
                     ) THEN 'NEW BIAK NUMFOR'
                     WHEN ${currTrxSO.kabSo} IN (
                         'JAYAWIJAYA',
                         'LANNY JAYA',
                         'MAMBERAMO TENGAH',
                         'NDUGA',
                         'PEGUNUNGAN BINTANG',
                         'TOLIKARA',
                         'YAHUKIMO',
                         'YALIMO'
                     ) THEN 'PAPUA PEGUNUNGAN'
                     WHEN ${currTrxSO.kabSo} IN ('MANOKWARI') THEN 'MANOKWARI'
                     WHEN ${currTrxSO.kabSo} IN (
                         'FAKFAK',
                         'FAK FAK',
                         'KAIMANA',
                         'MANOKWARI SELATAN',
                         'PEGUNUNGAN ARFAK',
                         'TELUK BINTUNI',
                         'TELUK WONDAMA'
                     ) THEN 'MANOKWARI OUTER'
                     WHEN ${currTrxSO.kabSo} IN (
                         'KOTA SORONG',
                         'MAYBRAT',
                         'RAJA AMPAT',
                         'SORONG',
                         'SORONG SELATAN',
                         'TAMBRAUW'
                     ) THEN 'NEW SORONG RAJA AMPAT'
                     WHEN ${currTrxSO.kabSo} IN (
                         'INTAN JAYA',
                         'MIMIKA',
                         'PUNCAK',
                         'PUNCAK JAYA',
                         'TIMIKA'
                     ) THEN 'MIMIKA PUNCAK'
                     WHEN ${currTrxSO.kabSo} IN ('DEIYAI', 'DOGIYAI', 'NABIRE', 'PANIAI') THEN 'NABIRE'
                     WHEN ${currTrxSO.kabSo} IN ('ASMAT', 'BOVEN DIGOEL', 'MAPPI', 'MERAUKE') THEN 'NEW MERAUKE'
                     ELSE NULL
                 END
                                `.as('clusterName'),
                    kabupaten: currTrxSO.kabSo,
                    trx: sql<number>`COUNT(${currTrxSO.so})`.as('trx')
                })
                .from(currTrxSO)
                .where(and(
                    not(eq(currTrxSO.kabSo, 'TMP')),
                    and(
                        inArray(currTrxSO.regionSo, ['MALUKU DAN PAPUA', 'PUMA']),
                        and(
                            gte(currTrxSO.dateSo, firstDayOfCurrMonth),
                            lte(currTrxSO.dateSo, currDate)
                        )
                    )
                ))
                .groupBy(sql`1,2,3,4,5`)
                .as('sq2')

            const sq3 = db5
                .select({
                    regionName: sql<string>`CASE WHEN ${prevMonthTrxSO.regionSo} IN ('MALUKU DAN PAPUA', 'PUMA') THEN 'PUMA' END`.as('regionName'),
                    branchName: sql<string>`
                 CASE
                     WHEN ${prevMonthTrxSO.kabSo} IN (
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
                     WHEN ${prevMonthTrxSO.kabSo} IN (
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
                     WHEN ${prevMonthTrxSO.kabSo} IN (
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
                     WHEN ${prevMonthTrxSO.kabSo} IN (
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
                     WHEN ${prevMonthTrxSO.kabSo} IN (
                         'AMBON',
                         'KOTA AMBON',
                         'MALUKU TENGAH',
                         'SERAM BAGIAN TIMUR'
                     ) THEN 'AMBON'
                     WHEN ${prevMonthTrxSO.kabSo} IN (
                         'KEPULAUAN ARU',
                         'KOTA TUAL',
                         'MALUKU BARAT DAYA',
                         'MALUKU TENGGARA',
                         'MALUKU TENGGARA BARAT',
                         'KEPULAUAN TANIMBAR'
                     ) THEN 'KEPULAUAN AMBON'
                     WHEN ${prevMonthTrxSO.kabSo} IN ('BURU', 'BURU SELATAN', 'SERAM BAGIAN BARAT') THEN 'SERAM BURU'
                     WHEN ${prevMonthTrxSO.kabSo} IN ('KOTA JAYAPURA') THEN 'JAYAPURA'
                     WHEN ${prevMonthTrxSO.kabSo} IN (
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
                     WHEN ${prevMonthTrxSO.kabSo} IN ('MANOKWARI') THEN 'MANOKWARI'
                     WHEN ${prevMonthTrxSO.kabSo} IN (
                         'FAKFAK',
                         'FAK FAK',
                         'KAIMANA',
                         'MANOKWARI SELATAN',
                         'PEGUNUNGAN ARFAK',
                         'TELUK BINTUNI',
                         'TELUK WONDAMA'
                     ) THEN 'MANOKWARI OUTER'
                     WHEN ${prevMonthTrxSO.kabSo} IN (
                         'KOTA SORONG',
                         'MAYBRAT',
                         'RAJA AMPAT',
                         'SORONG',
                         'SORONG SELATAN',
                         'TAMBRAUW'
                     ) THEN 'SORONG RAJA AMPAT'
                     WHEN ${prevMonthTrxSO.kabSo} IN ('ASMAT', 'BOVEN DIGOEL', 'MAPPI', 'MERAUKE') THEN 'MERAUKE'
                     WHEN ${prevMonthTrxSO.kabSo} IN (
                         'INTAN JAYA',
                         'MIMIKA',
                         'PUNCAK',
                         'PUNCAK JAYA',
                         'TIMIKA'
                     ) THEN 'MIMIKA'
                     WHEN ${prevMonthTrxSO.kabSo} IN ('DEIYAI', 'DOGIYAI', 'NABIRE', 'PANIAI') THEN 'NABIRE'
                     ELSE NULL
                 END
                                `.as('subbranchName'),
                    clusterName: sql<string>`
                 CASE
                     WHEN ${prevMonthTrxSO.kabSo} IN (
                         'KOTA AMBON',
                         'MALUKU TENGAH',
                         'SERAM BAGIAN TIMUR'
                     ) THEN 'AMBON'
                     WHEN ${prevMonthTrxSO.kabSo} IN (
                         'KEPULAUAN ARU',
                         'KOTA TUAL',
                         'MALUKU BARAT DAYA',
                         'MALUKU TENGGARA',
                         'MALUKU TENGGARA BARAT',
                         'KEPULAUAN TANIMBAR'
                     ) THEN 'KEPULAUAN TUAL'
                     WHEN ${prevMonthTrxSO.kabSo} IN ('BURU', 'BURU SELATAN', 'SERAM BAGIAN BARAT') THEN 'SERAM BARAT BURU'
                     WHEN ${prevMonthTrxSO.kabSo} IN ('KOTA JAYAPURA') THEN 'KOTA JAYAPURA'
                     WHEN ${prevMonthTrxSO.kabSo} IN ('JAYAPURA', 'KEEROM', 'MAMBERAMO RAYA', 'SARMI') THEN 'JAYAPURA OUTER'
                     WHEN ${prevMonthTrxSO.kabSo} IN (
                         'BIAK',
                         'BIAK NUMFOR',
                         'KEPULAUAN YAPEN',
                         'SUPIORI',
                         'WAROPEN'
                     ) THEN 'NEW BIAK NUMFOR'
                     WHEN ${prevMonthTrxSO.kabSo} IN (
                         'JAYAWIJAYA',
                         'LANNY JAYA',
                         'MAMBERAMO TENGAH',
                         'NDUGA',
                         'PEGUNUNGAN BINTANG',
                         'TOLIKARA',
                         'YAHUKIMO',
                         'YALIMO'
                     ) THEN 'PAPUA PEGUNUNGAN'
                     WHEN ${prevMonthTrxSO.kabSo} IN ('MANOKWARI') THEN 'MANOKWARI'
                     WHEN ${prevMonthTrxSO.kabSo} IN (
                         'FAKFAK',
                         'FAK FAK',
                         'KAIMANA',
                         'MANOKWARI SELATAN',
                         'PEGUNUNGAN ARFAK',
                         'TELUK BINTUNI',
                         'TELUK WONDAMA'
                     ) THEN 'MANOKWARI OUTER'
                     WHEN ${prevMonthTrxSO.kabSo} IN (
                         'KOTA SORONG',
                         'MAYBRAT',
                         'RAJA AMPAT',
                         'SORONG',
                         'SORONG SELATAN',
                         'TAMBRAUW'
                     ) THEN 'NEW SORONG RAJA AMPAT'
                     WHEN ${prevMonthTrxSO.kabSo} IN (
                         'INTAN JAYA',
                         'MIMIKA',
                         'PUNCAK',
                         'PUNCAK JAYA',
                         'TIMIKA'
                     ) THEN 'MIMIKA PUNCAK'
                     WHEN ${prevMonthTrxSO.kabSo} IN ('DEIYAI', 'DOGIYAI', 'NABIRE', 'PANIAI') THEN 'NABIRE'
                     WHEN ${prevMonthTrxSO.kabSo} IN ('ASMAT', 'BOVEN DIGOEL', 'MAPPI', 'MERAUKE') THEN 'NEW MERAUKE'
                     ELSE NULL
                 END
                                `.as('clusterName'),
                    kabupaten: prevMonthTrxSO.kabSo,
                    trx: sql<number>`COUNT(${prevMonthTrxSO.so})`.as('trx')
                })
                .from(prevMonthTrxSO)
                .where(and(
                    not(eq(prevMonthTrxSO.kabSo, 'TMP')),
                    and(
                        inArray(prevMonthTrxSO.regionSo, ['MALUKU DAN PAPUA', 'PUMA']),
                        and(
                            gte(prevMonthTrxSO.dateSo, firstDayOfPrevMonth),
                            lte(prevMonthTrxSO.dateSo, prevDate)
                        )
                    )
                ))
                .groupBy(sql`1,2,3,4,5`)
                .as('sq3')

            const sq4 = db5
                .select({
                    regionName: sql<string>`CASE WHEN ${prevYearCurrMonthTrxSO.regionSo} IN ('MALUKU DAN PAPUA', 'PUMA') THEN 'PUMA' END`.as('regionName'),
                    branchName: sql<string>`
                 CASE
                     WHEN ${prevYearCurrMonthTrxSO.kabSo} IN (
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
                     WHEN ${prevYearCurrMonthTrxSO.kabSo} IN (
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
                     WHEN ${prevYearCurrMonthTrxSO.kabSo} IN (
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
                     WHEN ${prevYearCurrMonthTrxSO.kabSo} IN (
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
                     WHEN ${prevYearCurrMonthTrxSO.kabSo} IN (
                         'AMBON',
                         'KOTA AMBON',
                         'MALUKU TENGAH',
                         'SERAM BAGIAN TIMUR'
                     ) THEN 'AMBON'
                     WHEN ${prevYearCurrMonthTrxSO.kabSo} IN (
                         'KEPULAUAN ARU',
                         'KOTA TUAL',
                         'MALUKU BARAT DAYA',
                         'MALUKU TENGGARA',
                         'MALUKU TENGGARA BARAT',
                         'KEPULAUAN TANIMBAR'
                     ) THEN 'KEPULAUAN AMBON'
                     WHEN ${prevYearCurrMonthTrxSO.kabSo} IN ('BURU', 'BURU SELATAN', 'SERAM BAGIAN BARAT') THEN 'SERAM BURU'
                     WHEN ${prevYearCurrMonthTrxSO.kabSo} IN ('KOTA JAYAPURA') THEN 'JAYAPURA'
                     WHEN ${prevYearCurrMonthTrxSO.kabSo} IN (
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
                     WHEN ${prevYearCurrMonthTrxSO.kabSo} IN ('MANOKWARI') THEN 'MANOKWARI'
                     WHEN ${prevYearCurrMonthTrxSO.kabSo} IN (
                         'FAKFAK',
                         'FAK FAK',
                         'KAIMANA',
                         'MANOKWARI SELATAN',
                         'PEGUNUNGAN ARFAK',
                         'TELUK BINTUNI',
                         'TELUK WONDAMA'
                     ) THEN 'MANOKWARI OUTER'
                     WHEN ${prevYearCurrMonthTrxSO.kabSo} IN (
                         'KOTA SORONG',
                         'MAYBRAT',
                         'RAJA AMPAT',
                         'SORONG',
                         'SORONG SELATAN',
                         'TAMBRAUW'
                     ) THEN 'SORONG RAJA AMPAT'
                     WHEN ${prevYearCurrMonthTrxSO.kabSo} IN ('ASMAT', 'BOVEN DIGOEL', 'MAPPI', 'MERAUKE') THEN 'MERAUKE'
                     WHEN ${prevYearCurrMonthTrxSO.kabSo} IN (
                         'INTAN JAYA',
                         'MIMIKA',
                         'PUNCAK',
                         'PUNCAK JAYA',
                         'TIMIKA'
                     ) THEN 'MIMIKA'
                     WHEN ${prevYearCurrMonthTrxSO.kabSo} IN ('DEIYAI', 'DOGIYAI', 'NABIRE', 'PANIAI') THEN 'NABIRE'
                     ELSE NULL
                 END
                                `.as('subbranchName'),
                    clusterName: sql<string>`
                 CASE
                     WHEN ${prevYearCurrMonthTrxSO.kabSo} IN (
                         'KOTA AMBON',
                         'MALUKU TENGAH',
                         'SERAM BAGIAN TIMUR'
                     ) THEN 'AMBON'
                     WHEN ${prevYearCurrMonthTrxSO.kabSo} IN (
                         'KEPULAUAN ARU',
                         'KOTA TUAL',
                         'MALUKU BARAT DAYA',
                         'MALUKU TENGGARA',
                         'MALUKU TENGGARA BARAT',
                         'KEPULAUAN TANIMBAR'
                     ) THEN 'KEPULAUAN TUAL'
                     WHEN ${prevYearCurrMonthTrxSO.kabSo} IN ('BURU', 'BURU SELATAN', 'SERAM BAGIAN BARAT') THEN 'SERAM BARAT BURU'
                     WHEN ${prevYearCurrMonthTrxSO.kabSo} IN ('KOTA JAYAPURA') THEN 'KOTA JAYAPURA'
                     WHEN ${prevYearCurrMonthTrxSO.kabSo} IN ('JAYAPURA', 'KEEROM', 'MAMBERAMO RAYA', 'SARMI') THEN 'JAYAPURA OUTER'
                     WHEN ${prevYearCurrMonthTrxSO.kabSo} IN (
                         'BIAK',
                         'BIAK NUMFOR',
                         'KEPULAUAN YAPEN',
                         'SUPIORI',
                         'WAROPEN'
                     ) THEN 'NEW BIAK NUMFOR'
                     WHEN ${prevYearCurrMonthTrxSO.kabSo} IN (
                         'JAYAWIJAYA',
                         'LANNY JAYA',
                         'MAMBERAMO TENGAH',
                         'NDUGA',
                         'PEGUNUNGAN BINTANG',
                         'TOLIKARA',
                         'YAHUKIMO',
                         'YALIMO'
                     ) THEN 'PAPUA PEGUNUNGAN'
                     WHEN ${prevYearCurrMonthTrxSO.kabSo} IN ('MANOKWARI') THEN 'MANOKWARI'
                     WHEN ${prevYearCurrMonthTrxSO.kabSo} IN (
                         'FAKFAK',
                         'FAK FAK',
                         'KAIMANA',
                         'MANOKWARI SELATAN',
                         'PEGUNUNGAN ARFAK',
                         'TELUK BINTUNI',
                         'TELUK WONDAMA'
                     ) THEN 'MANOKWARI OUTER'
                     WHEN ${prevYearCurrMonthTrxSO.kabSo} IN (
                         'KOTA SORONG',
                         'MAYBRAT',
                         'RAJA AMPAT',
                         'SORONG',
                         'SORONG SELATAN',
                         'TAMBRAUW'
                     ) THEN 'NEW SORONG RAJA AMPAT'
                     WHEN ${prevYearCurrMonthTrxSO.kabSo} IN (
                         'INTAN JAYA',
                         'MIMIKA',
                         'PUNCAK',
                         'PUNCAK JAYA',
                         'TIMIKA'
                     ) THEN 'MIMIKA PUNCAK'
                     WHEN ${prevYearCurrMonthTrxSO.kabSo} IN ('DEIYAI', 'DOGIYAI', 'NABIRE', 'PANIAI') THEN 'NABIRE'
                     WHEN ${prevYearCurrMonthTrxSO.kabSo} IN ('ASMAT', 'BOVEN DIGOEL', 'MAPPI', 'MERAUKE') THEN 'NEW MERAUKE'
                     ELSE NULL
                 END
                                `.as('clusterName'),
                    kabupaten: prevYearCurrMonthTrxSO.kabSo,
                    trx: sql<number>`COUNT(${prevYearCurrMonthTrxSO.so})`.as('trx')
                })
                .from(prevYearCurrMonthTrxSO)
                .where(and(
                    not(eq(prevYearCurrMonthTrxSO.kabSo, 'TMP')),
                    and(
                        inArray(prevYearCurrMonthTrxSO.regionSo, ['MALUKU DAN PAPUA', 'PUMA']),
                        and(
                            gte(prevYearCurrMonthTrxSO.dateSo, firstDayOfPrevYearCurrMonth),
                            lte(prevYearCurrMonthTrxSO.dateSo, prevYearCurrDate)
                        )
                    )
                ))
                .groupBy(sql`1,2,3,4,5`)
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
                    currMonthTargetRev: sql<number>`SUM(${targetSO[monthColumn]})`.as('currMonthTargetRev')
                })
                .from(regionals)
                .leftJoin(branches, eq(regionals.id, branches.regionalId))
                .leftJoin(subbranches, eq(branches.id, subbranches.branchId))
                .leftJoin(clusters, eq(subbranches.id, clusters.subbranchId))
                .leftJoin(kabupatens, eq(clusters.id, kabupatens.clusterId))
                .leftJoin(targetSO, eq(kabupatens.id, targetSO.kabupatenId))
                .groupBy(
                    regionals.regional,
                    branches.branchNew,
                    subbranches.subbranchNew,
                    clusters.cluster,
                    kabupatens.kabupaten
                )
                .prepare()

            const p2 = db5
                .select({
                    region: sql<string>`${sq2.regionName}`.as('region'),
                    branch: sql<string>`${sq2.branchName}`.as('branch'), // Keep only one branchName
                    subbranch: sql<string>`${sq2.subbranchName}`.as('subbranch'),
                    cluster: sql<string>`${sq2.clusterName}`.as('cluster'),
                    kabupaten: sql<string>`${sq2.kabupaten}`.as('kabupaten'),
                    currMonthKabupatenRev: sql<number>`SUM(${sq2.trx})`.as('currMonthKabupatenRev'),
                    currMonthClusterRev: sql<number>`SUM(SUM(${sq2.trx})) OVER (PARTITION BY ${sq2.regionName}, ${sq2.branchName}, ${sq2.subbranchName}, ${sq2.clusterName})`.as('currMonthClusterRev'),
                    currMonthSubbranchRev: sql<number>`SUM(SUM(${sq2.trx})) OVER (PARTITION BY ${sq2.regionName}, ${sq2.branchName}, ${sq2.subbranchName})`.as('currMonthSubbranchRev'),
                    currMonthBranchRev: sql<number>`SUM(SUM(${sq2.trx})) OVER (PARTITION BY ${sq2.regionName}, ${sq2.branchName})`.as('currMonthBranchRev'),
                    currMonthRegionalRev: sql<number>`SUM(SUM(${sq2.trx})) OVER (PARTITION BY ${sq2.regionName})`.as('currMonthRegionalRev')
                })
                .from(sq2)
                .groupBy(sql`1,2,3,4,5`)
                .prepare()


            // QUERY UNTUK MENDAPAT PREV MONTH REVENUE
            const p3 = db5
                .select({
                    region: sql<string>`${sq3.regionName}`.as('region'),
                    branch: sql<string>`${sq3.branchName}`.as('branch'), // Keep only one branchName
                    subbranch: sql<string>`${sq3.subbranchName}`.as('subbranch'),
                    cluster: sql<string>`${sq3.clusterName}`.as('cluster'),
                    kabupaten: sql<string>`${sq3.kabupaten}`.as('kabupaten'),
                    prevMonthKabupatenRev: sql<number>`SUM(${sq3.trx})`.as('currMonthKabupatenRev'),
                    prevMonthClusterRev: sql<number>`SUM(SUM(${sq3.trx})) OVER (PARTITION BY ${sq3.regionName}, ${sq3.branchName}, ${sq3.subbranchName}, ${sq3.clusterName})`.as('currMonthClusterRev'),
                    prevMonthSubbranchRev: sql<number>`SUM(SUM(${sq3.trx})) OVER (PARTITION BY ${sq3.regionName}, ${sq3.branchName}, ${sq3.subbranchName})`.as('currMonthSubbranchRev'),
                    prevMonthBranchRev: sql<number>`SUM(SUM(${sq3.trx})) OVER (PARTITION BY ${sq3.regionName}, ${sq3.branchName})`.as('currMonthBranchRev'),
                    prevMonthRegionalRev: sql<number>`SUM(SUM(${sq3.trx})) OVER (PARTITION BY ${sq3.regionName})`.as('currMonthRegionalRev')
                })
                .from(sq3)
                .groupBy(sql`1,2,3,4,5`)
                .prepare()

            // QUERY UNTUK MENDAPAT PREV YEAR CURR MONTH REVENUE
            const p4 = db5
                .select({
                    region: sql<string>`${sq4.regionName}`.as('region'),
                    branch: sql<string>`${sq4.branchName}`.as('branch'), // Keep only one branchName
                    subbranch: sql<string>`${sq4.subbranchName}`.as('subbranch'),
                    cluster: sql<string>`${sq4.clusterName}`.as('cluster'),
                    kabupaten: sql<string>`${sq4.kabupaten}`.as('kabupaten'),
                    prevYearCurrMonthKabupatenRev: sql<number>`SUM(${sq4.trx})`.as('currMonthKabupatenRev'),
                    prevYearCurrMonthClusterRev: sql<number>`SUM(SUM(${sq4.trx})) OVER (PARTITION BY ${sq4.regionName}, ${sq4.branchName}, ${sq4.subbranchName}, ${sq4.clusterName})`.as('currMonthClusterRev'),
                    prevYearCurrMonthSubbranchRev: sql<number>`SUM(SUM(${sq4.trx})) OVER (PARTITION BY ${sq4.regionName}, ${sq4.branchName}, ${sq4.subbranchName})`.as('currMonthSubbranchRev'),
                    prevYearCurrMonthBranchRev: sql<number>`SUM(SUM(${sq4.trx})) OVER (PARTITION BY ${sq4.regionName}, ${sq4.branchName})`.as('currMonthBranchRev'),
                    prevYearCurrMonthRegionalRev: sql<number>`SUM(SUM(${sq4.trx})) OVER (PARTITION BY ${sq4.regionName})`.as('currMonthRegionalRev')
                })
                .from(sq4)
                .groupBy(sql`1,2,3,4,5`)
                .prepare()

            const queryCurrYtd = currYtdTrxSORev.map(table => `
                    SELECT
                        CASE WHEN region_so IN ('PUMA', 'MALUKU DAN PAPUA') THEN 'PUMA' END as region,
                        CASE
                            WHEN upper(kab_so) IN (
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
                            WHEN upper(kab_so) IN (
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
                            WHEN upper(kab_so) IN (
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
                            WHEN upper(kab_so) IN (
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
                            WHEN upper(kab_so) IN (
                                'AMBON',
                                'KOTA AMBON',
                                'MALUKU TENGAH',
                                'SERAM BAGIAN TIMUR'
                            ) THEN 'AMBON'
                            WHEN upper(kab_so) IN (
                                'KEPULAUAN ARU',
                                'KOTA TUAL',
                                'MALUKU BARAT DAYA',
                                'MALUKU TENGGARA',
                                'MALUKU TENGGARA BARAT',
                                'KEPULAUAN TANIMBAR'
                            ) THEN 'KEPULAUAN AMBON'
                            WHEN upper(kab_so) IN ('BURU', 'BURU SELATAN', 'SERAM BAGIAN BARAT') THEN 'SERAM BURU'
                            WHEN upper(kab_so) IN ('KOTA JAYAPURA') THEN 'JAYAPURA'
                            WHEN upper(kab_so) IN (
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
                            WHEN upper(kab_so) IN ('MANOKWARI') THEN 'MANOKWARI'
                            WHEN upper(kab_so) IN (
                                'FAKFAK',
                                'FAK FAK',
                                'KAIMANA',
                                'MANOKWARI SELATAN',
                                'PEGUNUNGAN ARFAK',
                                'TELUK BINTUNI',
                                'TELUK WONDAMA'
                            ) THEN 'MANOKWARI OUTER'
                            WHEN upper(kab_so) IN (
                                'KOTA SORONG',
                                'MAYBRAT',
                                'RAJA AMPAT',
                                'SORONG',
                                'SORONG SELATAN',
                                'TAMBRAUW'
                            ) THEN 'SORONG RAJA AMPAT'
                            WHEN upper(kab_so) IN ('ASMAT', 'BOVEN DIGOEL', 'MAPPI', 'MERAUKE') THEN 'MERAUKE'
                            WHEN upper(kab_so) IN (
                                'INTAN JAYA',
                                'MIMIKA',
                                'PUNCAK',
                                'PUNCAK JAYA',
                                'TIMIKA'
                            ) THEN 'MIMIKA'
                            WHEN upper(kab_so) IN ('DEIYAI', 'DOGIYAI', 'NABIRE', 'PANIAI') THEN 'NABIRE'
                            ELSE NULL
                        END as subbranch,
                        CASE
                            WHEN upper(kab_so) IN (
                                'AMBON',
                                'KOTA AMBON',
                                'MALUKU TENGAH',
                                'SERAM BAGIAN TIMUR'
                            ) THEN 'AMBON'
                            WHEN upper(kab_so) IN (
                                'KEPULAUAN ARU',
                                'KOTA TUAL',
                                'MALUKU BARAT DAYA',
                                'MALUKU TENGGARA',
                                'MALUKU TENGGARA BARAT',
                                'KEPULAUAN TANIMBAR'
                            ) THEN 'KEPULAUAN TUAL'
                            WHEN upper(kab_so) IN ('BURU', 'BURU SELATAN', 'SERAM BAGIAN BARAT') THEN 'SERAM BARAT BURU'
                            WHEN upper(kab_so) IN ('KOTA JAYAPURA') THEN 'KOTA JAYAPURA'
                            WHEN upper(kab_so) IN ('JAYAPURA', 'KEEROM', 'MAMBERAMO RAYA', 'SARMI') THEN 'JAYAPURA OUTER'
                            WHEN upper(kab_so) IN (
                                'BIAK',
                                'BIAK NUMFOR',
                                'KEPULAUAN YAPEN',
                                'SUPIORI',
                                'WAROPEN'
                            ) THEN 'NEW BIAK NUMFOR'
                            WHEN upper(kab_so) IN (
                                'JAYAWIJAYA',
                                'LANNY JAYA',
                                'MAMBERAMO TENGAH',
                                'NDUGA',
                                'PEGUNUNGAN BINTANG',
                                'TOLIKARA',
                                'YAHUKIMO',
                                'YALIMO'
                            ) THEN 'PAPUA PEGUNUNGAN'
                            WHEN upper(kab_so) IN ('MANOKWARI') THEN 'MANOKWARI'
                            WHEN upper(kab_so) IN (
                                'FAKFAK',
                                'FAK FAK',
                                'KAIMANA',
                                'MANOKWARI SELATAN',
                                'PEGUNUNGAN ARFAK',
                                'TELUK BINTUNI',
                                'TELUK WONDAMA'
                            ) THEN 'MANOKWARI OUTER'
                            WHEN upper(kab_so) IN (
                                'KOTA SORONG',
                                'MAYBRAT',
                                'RAJA AMPAT',
                                'SORONG',
                                'SORONG SELATAN',
                                'TAMBRAUW'
                            ) THEN 'NEW SORONG RAJA AMPAT'
                            WHEN upper(kab_so) IN (
                                'INTAN JAYA',
                                'MIMIKA',
                                'PUNCAK',
                                'PUNCAK JAYA',
                                'TIMIKA'
                            ) THEN 'MIMIKA PUNCAK'
                            WHEN upper(kab_so) IN ('DEIYAI', 'DOGIYAI', 'NABIRE', 'PANIAI') THEN 'NABIRE'
                            WHEN upper(kab_so) IN ('ASMAT', 'BOVEN DIGOEL', 'MAPPI', 'MERAUKE') THEN 'NEW MERAUKE'
                            ELSE NULL
                        END as cluster,
                        kab_so AS kabupaten,
                        COUNT(so) as trx
                    FROM ${table} WHERE region_so IN ('MALUKU DAN PAPUA', 'PUMA') AND kab_so <> 'TMP' GROUP BY 1,2,3,4,5`).join(' UNION ALL ')

            const queryPrevYtd = prevYtdTrxSORev.map(table => `
                        SELECT
                            CASE WHEN region_so IN ('PUMA', 'MALUKU DAN PAPUA') THEN 'PUMA' END as region,
                            CASE
                                WHEN upper(kab_so) IN (
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
                                WHEN upper(kab_so) IN (
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
                                WHEN upper(kab_so) IN (
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
                                WHEN upper(kab_so) IN (
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
                                WHEN upper(kab_so) IN (
                                    'AMBON',
                                    'KOTA AMBON',
                                    'MALUKU TENGAH',
                                    'SERAM BAGIAN TIMUR'
                                ) THEN 'AMBON'
                                WHEN upper(kab_so) IN (
                                    'KEPULAUAN ARU',
                                    'KOTA TUAL',
                                    'MALUKU BARAT DAYA',
                                    'MALUKU TENGGARA',
                                    'MALUKU TENGGARA BARAT',
                                    'KEPULAUAN TANIMBAR'
                                ) THEN 'KEPULAUAN AMBON'
                                WHEN upper(kab_so) IN ('BURU', 'BURU SELATAN', 'SERAM BAGIAN BARAT') THEN 'SERAM BURU'
                                WHEN upper(kab_so) IN ('KOTA JAYAPURA') THEN 'JAYAPURA'
                                WHEN upper(kab_so) IN (
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
                                WHEN upper(kab_so) IN ('MANOKWARI') THEN 'MANOKWARI'
                                WHEN upper(kab_so) IN (
                                    'FAKFAK',
                                    'FAK FAK',
                                    'KAIMANA',
                                    'MANOKWARI SELATAN',
                                    'PEGUNUNGAN ARFAK',
                                    'TELUK BINTUNI',
                                    'TELUK WONDAMA'
                                ) THEN 'MANOKWARI OUTER'
                                WHEN upper(kab_so) IN (
                                    'KOTA SORONG',
                                    'MAYBRAT',
                                    'RAJA AMPAT',
                                    'SORONG',
                                    'SORONG SELATAN',
                                    'TAMBRAUW'
                                ) THEN 'SORONG RAJA AMPAT'
                                WHEN upper(kab_so) IN ('ASMAT', 'BOVEN DIGOEL', 'MAPPI', 'MERAUKE') THEN 'MERAUKE'
                                WHEN upper(kab_so) IN (
                                    'INTAN JAYA',
                                    'MIMIKA',
                                    'PUNCAK',
                                    'PUNCAK JAYA',
                                    'TIMIKA'
                                ) THEN 'MIMIKA'
                                WHEN upper(kab_so) IN ('DEIYAI', 'DOGIYAI', 'NABIRE', 'PANIAI') THEN 'NABIRE'
                                ELSE NULL
                            END as subbranch,
                            CASE
                                WHEN upper(kab_so) IN (
                                    'AMBON',
                                    'KOTA AMBON',
                                    'MALUKU TENGAH',
                                    'SERAM BAGIAN TIMUR'
                                ) THEN 'AMBON'
                                WHEN upper(kab_so) IN (
                                    'KEPULAUAN ARU',
                                    'KOTA TUAL',
                                    'MALUKU BARAT DAYA',
                                    'MALUKU TENGGARA',
                                    'MALUKU TENGGARA BARAT',
                                    'KEPULAUAN TANIMBAR'
                                ) THEN 'KEPULAUAN TUAL'
                                WHEN upper(kab_so) IN ('BURU', 'BURU SELATAN', 'SERAM BAGIAN BARAT') THEN 'SERAM BARAT BURU'
                                WHEN upper(kab_so) IN ('KOTA JAYAPURA') THEN 'KOTA JAYAPURA'
                                WHEN upper(kab_so) IN ('JAYAPURA', 'KEEROM', 'MAMBERAMO RAYA', 'SARMI') THEN 'JAYAPURA OUTER'
                                WHEN upper(kab_so) IN (
                                    'BIAK',
                                    'BIAK NUMFOR',
                                    'KEPULAUAN YAPEN',
                                    'SUPIORI',
                                    'WAROPEN'
                                ) THEN 'NEW BIAK NUMFOR'
                                WHEN upper(kab_so) IN (
                                    'JAYAWIJAYA',
                                    'LANNY JAYA',
                                    'MAMBERAMO TENGAH',
                                    'NDUGA',
                                    'PEGUNUNGAN BINTANG',
                                    'TOLIKARA',
                                    'YAHUKIMO',
                                    'YALIMO'
                                ) THEN 'PAPUA PEGUNUNGAN'
                                WHEN upper(kab_so) IN ('MANOKWARI') THEN 'MANOKWARI'
                                WHEN upper(kab_so) IN (
                                    'FAKFAK',
                                    'FAK FAK',
                                    'KAIMANA',
                                    'MANOKWARI SELATAN',
                                    'PEGUNUNGAN ARFAK',
                                    'TELUK BINTUNI',
                                    'TELUK WONDAMA'
                                ) THEN 'MANOKWARI OUTER'
                                WHEN upper(kab_so) IN (
                                    'KOTA SORONG',
                                    'MAYBRAT',
                                    'RAJA AMPAT',
                                    'SORONG',
                                    'SORONG SELATAN',
                                    'TAMBRAUW'
                                ) THEN 'NEW SORONG RAJA AMPAT'
                                WHEN upper(kab_so) IN (
                                    'INTAN JAYA',
                                    'MIMIKA',
                                    'PUNCAK',
                                    'PUNCAK JAYA',
                                    'TIMIKA'
                                ) THEN 'MIMIKA PUNCAK'
                                WHEN upper(kab_so) IN ('DEIYAI', 'DOGIYAI', 'NABIRE', 'PANIAI') THEN 'NABIRE'
                                WHEN upper(kab_so) IN ('ASMAT', 'BOVEN DIGOEL', 'MAPPI', 'MERAUKE') THEN 'NEW MERAUKE'
                                ELSE NULL
                            END as cluster,
                            kab_so as kabupaten,
                            COUNT(so) as trx
                        FROM ${table} WHERE region_so IN ('PUMA', 'MALUKU DAN PAPUA') AND kab_so <> 'TMP' GROUP BY 1,2,3,4,5`).join(' UNION ALL ')

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
                            SUM(trx) AS currYtdKabupatenRev,
                            SUM(SUM(trx)) OVER (PARTITION BY region, branch, subbranch, cluster) AS currYtdClusterRev,
                            SUM(SUM(trx)) OVER (PARTITION BY region, branch, subbranch) AS currYtdSubbranchRev,
                            SUM(SUM(trx)) OVER (PARTITION BY region, branch) AS currYtdBranchRev,
                            SUM(SUM(trx)) OVER (PARTITION BY region) AS currYtdRegionalRev
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
                            SUM(trx) AS prevYtdKabupatenRev,
                            SUM(SUM(trx)) OVER (PARTITION BY region, branch, subbranch, cluster) AS prevYtdClusterRev,
                            SUM(SUM(trx)) OVER (PARTITION BY region, branch, subbranch) AS prevYtdSubbranchRev,
                            SUM(SUM(trx)) OVER (PARTITION BY region, branch) AS prevYtdBranchRev,
                            SUM(SUM(trx)) OVER (PARTITION BY region) AS prevYtdRegionalRev
                        FROM sq5
                        GROUP BY 1, 2, 3, 4, 5
                            `

            const [targetRevenue, currMonthRevenue, prevMonthRevenue, prevYearCurrMonthRevenue, currYtdRev, prevYtdRev] = await Promise.all([
                p1.execute(),
                p2.execute(),
                p3.execute(),
                p4.execute(),
                db5.execute(sql.raw(sq)),
                db5.execute(sql.raw(sq5))
            ])

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

            return c.json({ data: finalDataRevenue }, 200)
        })

export default app