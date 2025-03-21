import { Hono } from "hono";
import { z } from 'zod'
import { and, asc, between, eq, inArray, not, sql } from "drizzle-orm";
import { subMonths, subDays, format, subYears, endOfMonth, startOfMonth } from 'date-fns'

import { db, db5 } from "@/db";
import {
    branches,
    regionals,
    clusters,
    kabupatens,
    subbranches,
    trxSA,
    trxSAPrabayar,
    trxSAByu,
} from "@/db/schema";
import { zValidator } from "@/lib/validator-wrapper";
import { dynamicRevenueSATable } from "@/db/schema5";
import { MySqlRawQueryResult } from "drizzle-orm/mysql2";

const app = new Hono()
    .get('/', zValidator('query', z.object({ date: z.coerce.date().optional() })),
        async c => {
            const { date } = c.req.valid('query')
            const selectedDate = date ? new Date(date) : subDays(new Date(), 3)
            const month = (selectedDate.getMonth() + 1).toString()


            // KOLOM DINAMIS UNTUK MEMILIH ANTARA KOLOM `m1-m12`
            const monthColumn = `m${month}` as keyof typeof trxSA.$inferSelect

            // VARIABLE TANGGAL UNTUK IMPORT TABEL SECARA DINAMIS
            const latestDataDate = subDays(selectedDate, 3); // - 3 days

            const currMonth = format(selectedDate, 'MM')
            const currYear = format(selectedDate, 'yyyy')
            const latestMonth = parseInt(format(selectedDate, 'M'), 10)
            const isPrevMonthLastYear = currMonth === '01'
            const prevMonth = isPrevMonthLastYear ? '12' : format(subMonths(selectedDate, 1), 'MM')
            const prevMonthYear = isPrevMonthLastYear ? format(subYears(selectedDate, 1), 'yyyy') : format(selectedDate, 'yyyy')
            const prevYear = format(subYears(selectedDate, 1), 'yyyy')

            // TABEL `sa_detil_`
            const currTrxSa = dynamicRevenueSATable(currYear, currMonth)
            const prevMonthTrxSA = dynamicRevenueSATable(prevMonthYear, prevMonth)
            const prevYearCurrMonthTrxSA = dynamicRevenueSATable(prevYear, currMonth)
            const currYtdTrxSARev: string[] = [];
            for (let month = 1; month <= latestMonth; month++) {
                const monthStr = month.toString().padStart(2, '0')
                currYtdTrxSARev.push(`sa_detil_${currYear}${monthStr}`)
            }
            const prevYtdTrxSARev: string[] = [];
            for (let month = 1; month <= latestMonth; month++) {
                const monthStr = month.toString().padStart(2, '0')
                prevYtdTrxSARev.push(`sa_detil_${prevYear}${monthStr}`)
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

            const currJanuaryFirst = `${currYear}-01-01`
            const prevJanuaryFirst = `${prevYear}-01-01`

            const sq2 = db5
                .select({
                    regionName: sql<string>`CASE WHEN ${currTrxSa.regional} IN ('MALUKU DAN PAPUA', 'PUMA') THEN 'PUMA' END`.as('regionName'),
                    branchName: sql<string>`
     CASE
         WHEN ${currTrxSa.kabupaten} IN (
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
         WHEN ${currTrxSa.kabupaten} IN (
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
         WHEN ${currTrxSa.kabupaten} IN (
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
         WHEN ${currTrxSa.kabupaten} IN (
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
         WHEN ${currTrxSa.kabupaten} IN (
             'AMBON',
             'KOTA AMBON',
             'MALUKU TENGAH',
             'SERAM BAGIAN TIMUR'
         ) THEN 'AMBON'
         WHEN ${currTrxSa.kabupaten} IN (
             'KEPULAUAN ARU',
             'KOTA TUAL',
             'MALUKU BARAT DAYA',
             'MALUKU TENGGARA',
             'MALUKU TENGGARA BARAT',
             'KEPULAUAN TANIMBAR'
         ) THEN 'KEPULAUAN AMBON'
         WHEN ${currTrxSa.kabupaten} IN ('BURU', 'BURU SELATAN', 'SERAM BAGIAN BARAT') THEN 'SERAM BURU'
         WHEN ${currTrxSa.kabupaten} IN ('KOTA JAYAPURA') THEN 'JAYAPURA'
         WHEN ${currTrxSa.kabupaten} IN (
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
         WHEN ${currTrxSa.kabupaten} IN ('MANOKWARI') THEN 'MANOKWARI'
         WHEN ${currTrxSa.kabupaten} IN (
             'FAKFAK',
             'FAK FAK',
             'KAIMANA',
             'MANOKWARI SELATAN',
             'PEGUNUNGAN ARFAK',
             'TELUK BINTUNI',
             'TELUK WONDAMA'
         ) THEN 'MANOKWARI OUTER'
         WHEN ${currTrxSa.kabupaten} IN (
             'KOTA SORONG',
             'MAYBRAT',
             'RAJA AMPAT',
             'SORONG',
             'SORONG SELATAN',
             'TAMBRAUW'
         ) THEN 'SORONG RAJA AMPAT'
         WHEN ${currTrxSa.kabupaten} IN ('ASMAT', 'BOVEN DIGOEL', 'MAPPI', 'MERAUKE') THEN 'MERAUKE'
         WHEN ${currTrxSa.kabupaten} IN (
             'INTAN JAYA',
             'MIMIKA',
             'PUNCAK',
             'PUNCAK JAYA',
             'TIMIKA'
         ) THEN 'MIMIKA'
         WHEN ${currTrxSa.kabupaten} IN ('DEIYAI', 'DOGIYAI', 'NABIRE', 'PANIAI') THEN 'NABIRE'
         ELSE NULL
     END
                    `.as('subbranchName'),
                    clusterName: sql<string>`
     CASE
         WHEN ${currTrxSa.kabupaten} IN (
             'KOTA AMBON',
             'MALUKU TENGAH',
             'SERAM BAGIAN TIMUR'
         ) THEN 'AMBON'
         WHEN ${currTrxSa.kabupaten} IN (
             'KEPULAUAN ARU',
             'KOTA TUAL',
             'MALUKU BARAT DAYA',
             'MALUKU TENGGARA',
             'MALUKU TENGGARA BARAT',
             'KEPULAUAN TANIMBAR'
         ) THEN 'KEPULAUAN TUAL'
         WHEN ${currTrxSa.kabupaten} IN ('BURU', 'BURU SELATAN', 'SERAM BAGIAN BARAT') THEN 'SERAM BARAT BURU'
         WHEN ${currTrxSa.kabupaten} IN ('KOTA JAYAPURA') THEN 'KOTA JAYAPURA'
         WHEN ${currTrxSa.kabupaten} IN ('JAYAPURA', 'KEEROM', 'MAMBERAMO RAYA', 'SARMI') THEN 'JAYAPURA OUTER'
         WHEN ${currTrxSa.kabupaten} IN (
             'BIAK',
             'BIAK NUMFOR',
             'KEPULAUAN YAPEN',
             'SUPIORI',
             'WAROPEN'
         ) THEN 'NEW BIAK NUMFOR'
         WHEN ${currTrxSa.kabupaten} IN (
             'JAYAWIJAYA',
             'LANNY JAYA',
             'MAMBERAMO TENGAH',
             'NDUGA',
             'PEGUNUNGAN BINTANG',
             'TOLIKARA',
             'YAHUKIMO',
             'YALIMO'
         ) THEN 'PAPUA PEGUNUNGAN'
         WHEN ${currTrxSa.kabupaten} IN ('MANOKWARI') THEN 'MANOKWARI'
         WHEN ${currTrxSa.kabupaten} IN (
             'FAKFAK',
             'FAK FAK',
             'KAIMANA',
             'MANOKWARI SELATAN',
             'PEGUNUNGAN ARFAK',
             'TELUK BINTUNI',
             'TELUK WONDAMA'
         ) THEN 'MANOKWARI OUTER'
         WHEN ${currTrxSa.kabupaten} IN (
             'KOTA SORONG',
             'MAYBRAT',
             'RAJA AMPAT',
             'SORONG',
             'SORONG SELATAN',
             'TAMBRAUW'
         ) THEN 'NEW SORONG RAJA AMPAT'
         WHEN ${currTrxSa.kabupaten} IN (
             'INTAN JAYA',
             'MIMIKA',
             'PUNCAK',
             'PUNCAK JAYA',
             'TIMIKA'
         ) THEN 'MIMIKA PUNCAK'
         WHEN ${currTrxSa.kabupaten} IN ('DEIYAI', 'DOGIYAI', 'NABIRE', 'PANIAI') THEN 'NABIRE'
         WHEN ${currTrxSa.kabupaten} IN ('ASMAT', 'BOVEN DIGOEL', 'MAPPI', 'MERAUKE') THEN 'NEW MERAUKE'
         ELSE NULL
     END
                    `.as('clusterName'),
                    kabupaten: currTrxSa.kabupaten,
                    trx: sql<number>`COUNT(${currTrxSa.msisdn})`.as('trx')
                })
                .from(currTrxSa)
                .where(and(
                    not(eq(currTrxSa.kabupaten, 'TMP')),
                    and(
                        inArray(currTrxSa.regional, ['MALUKU DAN PAPUA', 'PUMA']),
                        between(currTrxSa.trxDate, firstDayOfCurrMonth, currDate)
                    )
                ))
                .groupBy(sql`1,2,3,4,5`)
                .as('sq2')

            const sq3 = db5
                .select({
                    regionName: sql<string>`CASE WHEN ${prevMonthTrxSA.regional} IN ('MALUKU DAN PAPUA', 'PUMA') THEN 'PUMA' END`.as('regionName'),
                    branchName: sql<string>`
     CASE
         WHEN ${prevMonthTrxSA.kabupaten} IN (
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
         WHEN ${prevMonthTrxSA.kabupaten} IN (
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
         WHEN ${prevMonthTrxSA.kabupaten} IN (
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
         WHEN ${prevMonthTrxSA.kabupaten} IN (
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
         WHEN ${prevMonthTrxSA.kabupaten} IN (
             'AMBON',
             'KOTA AMBON',
             'MALUKU TENGAH',
             'SERAM BAGIAN TIMUR'
         ) THEN 'AMBON'
         WHEN ${prevMonthTrxSA.kabupaten} IN (
             'KEPULAUAN ARU',
             'KOTA TUAL',
             'MALUKU BARAT DAYA',
             'MALUKU TENGGARA',
             'MALUKU TENGGARA BARAT',
             'KEPULAUAN TANIMBAR'
         ) THEN 'KEPULAUAN AMBON'
         WHEN ${prevMonthTrxSA.kabupaten} IN ('BURU', 'BURU SELATAN', 'SERAM BAGIAN BARAT') THEN 'SERAM BURU'
         WHEN ${prevMonthTrxSA.kabupaten} IN ('KOTA JAYAPURA') THEN 'JAYAPURA'
         WHEN ${prevMonthTrxSA.kabupaten} IN (
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
         WHEN ${prevMonthTrxSA.kabupaten} IN ('MANOKWARI') THEN 'MANOKWARI'
         WHEN ${prevMonthTrxSA.kabupaten} IN (
             'FAKFAK',
             'FAK FAK',
             'KAIMANA',
             'MANOKWARI SELATAN',
             'PEGUNUNGAN ARFAK',
             'TELUK BINTUNI',
             'TELUK WONDAMA'
         ) THEN 'MANOKWARI OUTER'
         WHEN ${prevMonthTrxSA.kabupaten} IN (
             'KOTA SORONG',
             'MAYBRAT',
             'RAJA AMPAT',
             'SORONG',
             'SORONG SELATAN',
             'TAMBRAUW'
         ) THEN 'SORONG RAJA AMPAT'
         WHEN ${prevMonthTrxSA.kabupaten} IN ('ASMAT', 'BOVEN DIGOEL', 'MAPPI', 'MERAUKE') THEN 'MERAUKE'
         WHEN ${prevMonthTrxSA.kabupaten} IN (
             'INTAN JAYA',
             'MIMIKA',
             'PUNCAK',
             'PUNCAK JAYA',
             'TIMIKA'
         ) THEN 'MIMIKA'
         WHEN ${prevMonthTrxSA.kabupaten} IN ('DEIYAI', 'DOGIYAI', 'NABIRE', 'PANIAI') THEN 'NABIRE'
         ELSE NULL
     END
                    `.as('subbranchName'),
                    clusterName: sql<string>`
     CASE
         WHEN ${prevMonthTrxSA.kabupaten} IN (
             'KOTA AMBON',
             'MALUKU TENGAH',
             'SERAM BAGIAN TIMUR'
         ) THEN 'AMBON'
         WHEN ${prevMonthTrxSA.kabupaten} IN (
             'KEPULAUAN ARU',
             'KOTA TUAL',
             'MALUKU BARAT DAYA',
             'MALUKU TENGGARA',
             'MALUKU TENGGARA BARAT',
             'KEPULAUAN TANIMBAR'
         ) THEN 'KEPULAUAN TUAL'
         WHEN ${prevMonthTrxSA.kabupaten} IN ('BURU', 'BURU SELATAN', 'SERAM BAGIAN BARAT') THEN 'SERAM BARAT BURU'
         WHEN ${prevMonthTrxSA.kabupaten} IN ('KOTA JAYAPURA') THEN 'KOTA JAYAPURA'
         WHEN ${prevMonthTrxSA.kabupaten} IN ('JAYAPURA', 'KEEROM', 'MAMBERAMO RAYA', 'SARMI') THEN 'JAYAPURA OUTER'
         WHEN ${prevMonthTrxSA.kabupaten} IN (
             'BIAK',
             'BIAK NUMFOR',
             'KEPULAUAN YAPEN',
             'SUPIORI',
             'WAROPEN'
         ) THEN 'NEW BIAK NUMFOR'
         WHEN ${prevMonthTrxSA.kabupaten} IN (
             'JAYAWIJAYA',
             'LANNY JAYA',
             'MAMBERAMO TENGAH',
             'NDUGA',
             'PEGUNUNGAN BINTANG',
             'TOLIKARA',
             'YAHUKIMO',
             'YALIMO'
         ) THEN 'PAPUA PEGUNUNGAN'
         WHEN ${prevMonthTrxSA.kabupaten} IN ('MANOKWARI') THEN 'MANOKWARI'
         WHEN ${prevMonthTrxSA.kabupaten} IN (
             'FAKFAK',
             'FAK FAK',
             'KAIMANA',
             'MANOKWARI SELATAN',
             'PEGUNUNGAN ARFAK',
             'TELUK BINTUNI',
             'TELUK WONDAMA'
         ) THEN 'MANOKWARI OUTER'
         WHEN ${prevMonthTrxSA.kabupaten} IN (
             'KOTA SORONG',
             'MAYBRAT',
             'RAJA AMPAT',
             'SORONG',
             'SORONG SELATAN',
             'TAMBRAUW'
         ) THEN 'NEW SORONG RAJA AMPAT'
         WHEN ${prevMonthTrxSA.kabupaten} IN (
             'INTAN JAYA',
             'MIMIKA',
             'PUNCAK',
             'PUNCAK JAYA',
             'TIMIKA'
         ) THEN 'MIMIKA PUNCAK'
         WHEN ${prevMonthTrxSA.kabupaten} IN ('DEIYAI', 'DOGIYAI', 'NABIRE', 'PANIAI') THEN 'NABIRE'
         WHEN ${prevMonthTrxSA.kabupaten} IN ('ASMAT', 'BOVEN DIGOEL', 'MAPPI', 'MERAUKE') THEN 'NEW MERAUKE'
         ELSE NULL
     END
                    `.as('clusterName'),
                    kabupaten: prevMonthTrxSA.kabupaten,
                    trx: sql<number>`COUNT(${prevMonthTrxSA.msisdn})`.as('trx')
                })
                .from(prevMonthTrxSA)
                .where(and(
                    not(eq(prevMonthTrxSA.kabupaten, 'TMP')),
                    and(
                        inArray(prevMonthTrxSA.regional, ['MALUKU DAN PAPUA', 'PUMA']),
                        between(prevMonthTrxSA.trxDate, firstDayOfPrevMonth, prevDate)
                    )
                ))
                .groupBy(sql`1,2,3,4,5`)
                .as('sq3')

            const sq4 = db5
                .select({
                    regionName: sql<string>`CASE WHEN ${prevYearCurrMonthTrxSA.regional} IN ('MALUKU DAN PAPUA', 'PUMA') THEN 'PUMA' END`.as('regionName'),
                    branchName: sql<string>`
     CASE
         WHEN ${prevYearCurrMonthTrxSA.kabupaten} IN (
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
         WHEN ${prevYearCurrMonthTrxSA.kabupaten} IN (
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
         WHEN ${prevYearCurrMonthTrxSA.kabupaten} IN (
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
         WHEN ${prevYearCurrMonthTrxSA.kabupaten} IN (
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
         WHEN ${prevYearCurrMonthTrxSA.kabupaten} IN (
             'AMBON',
             'KOTA AMBON',
             'MALUKU TENGAH',
             'SERAM BAGIAN TIMUR'
         ) THEN 'AMBON'
         WHEN ${prevYearCurrMonthTrxSA.kabupaten} IN (
             'KEPULAUAN ARU',
             'KOTA TUAL',
             'MALUKU BARAT DAYA',
             'MALUKU TENGGARA',
             'MALUKU TENGGARA BARAT',
             'KEPULAUAN TANIMBAR'
         ) THEN 'KEPULAUAN AMBON'
         WHEN ${prevYearCurrMonthTrxSA.kabupaten} IN ('BURU', 'BURU SELATAN', 'SERAM BAGIAN BARAT') THEN 'SERAM BURU'
         WHEN ${prevYearCurrMonthTrxSA.kabupaten} IN ('KOTA JAYAPURA') THEN 'JAYAPURA'
         WHEN ${prevYearCurrMonthTrxSA.kabupaten} IN (
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
         WHEN ${prevYearCurrMonthTrxSA.kabupaten} IN ('MANOKWARI') THEN 'MANOKWARI'
         WHEN ${prevYearCurrMonthTrxSA.kabupaten} IN (
             'FAKFAK',
             'FAK FAK',
             'KAIMANA',
             'MANOKWARI SELATAN',
             'PEGUNUNGAN ARFAK',
             'TELUK BINTUNI',
             'TELUK WONDAMA'
         ) THEN 'MANOKWARI OUTER'
         WHEN ${prevYearCurrMonthTrxSA.kabupaten} IN (
             'KOTA SORONG',
             'MAYBRAT',
             'RAJA AMPAT',
             'SORONG',
             'SORONG SELATAN',
             'TAMBRAUW'
         ) THEN 'SORONG RAJA AMPAT'
         WHEN ${prevYearCurrMonthTrxSA.kabupaten} IN ('ASMAT', 'BOVEN DIGOEL', 'MAPPI', 'MERAUKE') THEN 'MERAUKE'
         WHEN ${prevYearCurrMonthTrxSA.kabupaten} IN (
             'INTAN JAYA',
             'MIMIKA',
             'PUNCAK',
             'PUNCAK JAYA',
             'TIMIKA'
         ) THEN 'MIMIKA'
         WHEN ${prevYearCurrMonthTrxSA.kabupaten} IN ('DEIYAI', 'DOGIYAI', 'NABIRE', 'PANIAI') THEN 'NABIRE'
         ELSE NULL
     END
                    `.as('subbranchName'),
                    clusterName: sql<string>`
     CASE
         WHEN ${prevYearCurrMonthTrxSA.kabupaten} IN (
             'KOTA AMBON',
             'MALUKU TENGAH',
             'SERAM BAGIAN TIMUR'
         ) THEN 'AMBON'
         WHEN ${prevYearCurrMonthTrxSA.kabupaten} IN (
             'KEPULAUAN ARU',
             'KOTA TUAL',
             'MALUKU BARAT DAYA',
             'MALUKU TENGGARA',
             'MALUKU TENGGARA BARAT',
             'KEPULAUAN TANIMBAR'
         ) THEN 'KEPULAUAN TUAL'
         WHEN ${prevYearCurrMonthTrxSA.kabupaten} IN ('BURU', 'BURU SELATAN', 'SERAM BAGIAN BARAT') THEN 'SERAM BARAT BURU'
         WHEN ${prevYearCurrMonthTrxSA.kabupaten} IN ('KOTA JAYAPURA') THEN 'KOTA JAYAPURA'
         WHEN ${prevYearCurrMonthTrxSA.kabupaten} IN ('JAYAPURA', 'KEEROM', 'MAMBERAMO RAYA', 'SARMI') THEN 'JAYAPURA OUTER'
         WHEN ${prevYearCurrMonthTrxSA.kabupaten} IN (
             'BIAK',
             'BIAK NUMFOR',
             'KEPULAUAN YAPEN',
             'SUPIORI',
             'WAROPEN'
         ) THEN 'NEW BIAK NUMFOR'
         WHEN ${prevYearCurrMonthTrxSA.kabupaten} IN (
             'JAYAWIJAYA',
             'LANNY JAYA',
             'MAMBERAMO TENGAH',
             'NDUGA',
             'PEGUNUNGAN BINTANG',
             'TOLIKARA',
             'YAHUKIMO',
             'YALIMO'
         ) THEN 'PAPUA PEGUNUNGAN'
         WHEN ${prevYearCurrMonthTrxSA.kabupaten} IN ('MANOKWARI') THEN 'MANOKWARI'
         WHEN ${prevYearCurrMonthTrxSA.kabupaten} IN (
             'FAKFAK',
             'FAK FAK',
             'KAIMANA',
             'MANOKWARI SELATAN',
             'PEGUNUNGAN ARFAK',
             'TELUK BINTUNI',
             'TELUK WONDAMA'
         ) THEN 'MANOKWARI OUTER'
         WHEN ${prevYearCurrMonthTrxSA.kabupaten} IN (
             'KOTA SORONG',
             'MAYBRAT',
             'RAJA AMPAT',
             'SORONG',
             'SORONG SELATAN',
             'TAMBRAUW'
         ) THEN 'NEW SORONG RAJA AMPAT'
         WHEN ${prevYearCurrMonthTrxSA.kabupaten} IN (
             'INTAN JAYA',
             'MIMIKA',
             'PUNCAK',
             'PUNCAK JAYA',
             'TIMIKA'
         ) THEN 'MIMIKA PUNCAK'
         WHEN ${prevYearCurrMonthTrxSA.kabupaten} IN ('DEIYAI', 'DOGIYAI', 'NABIRE', 'PANIAI') THEN 'NABIRE'
         WHEN ${prevYearCurrMonthTrxSA.kabupaten} IN ('ASMAT', 'BOVEN DIGOEL', 'MAPPI', 'MERAUKE') THEN 'NEW MERAUKE'
         ELSE NULL
     END
                    `.as('clusterName'),
                    kabupaten: prevYearCurrMonthTrxSA.kabupaten,
                    trx: sql<number>`COUNT(${prevYearCurrMonthTrxSA.msisdn})`.as('trx')
                })
                .from(prevYearCurrMonthTrxSA)
                .where(and(
                    not(eq(prevYearCurrMonthTrxSA.kabupaten, 'TMP')),
                    and(
                        inArray(prevYearCurrMonthTrxSA.regional, ['MALUKU DAN PAPUA', 'PUMA']),
                        between(prevYearCurrMonthTrxSA.trxDate, firstDayOfPrevYearCurrMonth, prevYearCurrDate)
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
                    currMonthTargetRev: sql<number>`SUM(${trxSA[monthColumn]})`.as('currMonthTargetRev')
                })
                .from(regionals)
                .leftJoin(branches, eq(regionals.id, branches.regionalId))
                .leftJoin(subbranches, eq(branches.id, subbranches.branchId))
                .leftJoin(clusters, eq(subbranches.id, clusters.subbranchId))
                .leftJoin(kabupatens, eq(clusters.id, kabupatens.clusterId))
                .leftJoin(trxSA, eq(kabupatens.id, trxSA.kabupatenId))
                .groupBy(
                    regionals.regional,
                    branches.branchNew,
                    subbranches.subbranchNew,
                    clusters.cluster,
                    kabupatens.kabupaten
                )
                .orderBy(asc(regionals.regional))
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

            const queryCurrYtd = currYtdTrxSARev.map(table => `
                    SELECT
                        CASE WHEN regional IN ('PUMA', 'MALUKU DAN PAPUA') THEN 'PUMA' END as region,
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
                        trx_date,
                        COUNT(msisdn) as trx
                    FROM ${table} WHERE regional IN ('MALUKU DAN PAPUA', 'PUMA') GROUP BY 1,2,3,4,5`).join(' UNION ALL ')

            const queryPrevYtd = prevYtdTrxSARev.map(table => `
                        SELECT
                            CASE WHEN regional IN ('PUMA', 'MALUKU DAN PAPUA') THEN 'PUMA' END as region,
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
                            trx_date,
                            COUNT(msisdn) as trx
                    FROM ${table} WHERE regional IN ('PUMA', 'MALUKU DAN PAPUA') GROUP BY 1,2,3,4,5`).join(' UNION ALL ')

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
                        WHERE trx_date BETWEEN '${currJanuaryFirst}' AND '${currDate}' AND kabupaten <> 'TMP'
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
                        WHERE trx_date BETWEEN '${prevJanuaryFirst}' AND '${prevYearCurrDate}' AND kabupaten <> 'TMP'
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
    .get('/trx-sa-prabayar', zValidator('query', z.object({ date: z.coerce.date().optional() })),
        async c => {
            const { date } = c.req.valid('query')
            const selectedDate = date ? new Date(date) : subDays(new Date(), 3)
            const month = (selectedDate.getMonth() + 1).toString()


            // KOLOM DINAMIS UNTUK MEMILIH ANTARA KOLOM `m1-m12`
            const monthColumn = `m${month}` as keyof typeof trxSAPrabayar.$inferSelect

            // VARIABLE TANGGAL UNTUK IMPORT TABEL SECARA DINAMIS
            const latestDataDate = subDays(selectedDate, 3); // - 3 days

            const currMonth = format(selectedDate, 'MM')
            const currYear = format(selectedDate, 'yyyy')
            const latestMonth = parseInt(format(selectedDate, 'M'), 10)
            const isPrevMonthLastYear = currMonth === '01'
            const prevMonth = isPrevMonthLastYear ? '12' : format(subMonths(selectedDate, 1), 'MM')
            const prevMonthYear = isPrevMonthLastYear ? format(subYears(selectedDate, 1), 'yyyy') : format(selectedDate, 'yyyy')
            const prevYear = format(subYears(selectedDate, 1), 'yyyy')

            // TABEL `sa_detil_`
            const currTrxSa = dynamicRevenueSATable(currYear, currMonth)
            const prevMonthTrxSA = dynamicRevenueSATable(prevMonthYear, prevMonth)
            const prevYearCurrMonthTrxSA = dynamicRevenueSATable(prevYear, currMonth)
            const currYtdTrxSARev: string[] = [];
            for (let month = 1; month <= latestMonth; month++) {
                const monthStr = month.toString().padStart(2, '0')
                currYtdTrxSARev.push(`sa_detil_${currYear}${monthStr}`)
            }
            const prevYtdTrxSARev: string[] = [];
            for (let month = 1; month <= latestMonth; month++) {
                const monthStr = month.toString().padStart(2, '0')
                prevYtdTrxSARev.push(`sa_detil_${prevYear}${monthStr}`)
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

            const currJanuaryFirst = `${currYear}-01-01`
            const prevJanuaryFirst = `${prevYear}-01-01`

            const sq2 = db5
                .select({
                    regionName: sql<string>`CASE WHEN ${currTrxSa.regional} IN ('MALUKU DAN PAPUA', 'PUMA') THEN 'PUMA' END`.as('regionName'),
                    branchName: sql<string>`
     CASE
         WHEN ${currTrxSa.kabupaten} IN (
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
         WHEN ${currTrxSa.kabupaten} IN (
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
         WHEN ${currTrxSa.kabupaten} IN (
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
         WHEN ${currTrxSa.kabupaten} IN (
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
         WHEN ${currTrxSa.kabupaten} IN (
             'AMBON',
             'KOTA AMBON',
             'MALUKU TENGAH',
             'SERAM BAGIAN TIMUR'
         ) THEN 'AMBON'
         WHEN ${currTrxSa.kabupaten} IN (
             'KEPULAUAN ARU',
             'KOTA TUAL',
             'MALUKU BARAT DAYA',
             'MALUKU TENGGARA',
             'MALUKU TENGGARA BARAT',
             'KEPULAUAN TANIMBAR'
         ) THEN 'KEPULAUAN AMBON'
         WHEN ${currTrxSa.kabupaten} IN ('BURU', 'BURU SELATAN', 'SERAM BAGIAN BARAT') THEN 'SERAM BURU'
         WHEN ${currTrxSa.kabupaten} IN ('KOTA JAYAPURA') THEN 'JAYAPURA'
         WHEN ${currTrxSa.kabupaten} IN (
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
         WHEN ${currTrxSa.kabupaten} IN ('MANOKWARI') THEN 'MANOKWARI'
         WHEN ${currTrxSa.kabupaten} IN (
             'FAKFAK',
             'FAK FAK',
             'KAIMANA',
             'MANOKWARI SELATAN',
             'PEGUNUNGAN ARFAK',
             'TELUK BINTUNI',
             'TELUK WONDAMA'
         ) THEN 'MANOKWARI OUTER'
         WHEN ${currTrxSa.kabupaten} IN (
             'KOTA SORONG',
             'MAYBRAT',
             'RAJA AMPAT',
             'SORONG',
             'SORONG SELATAN',
             'TAMBRAUW'
         ) THEN 'SORONG RAJA AMPAT'
         WHEN ${currTrxSa.kabupaten} IN ('ASMAT', 'BOVEN DIGOEL', 'MAPPI', 'MERAUKE') THEN 'MERAUKE'
         WHEN ${currTrxSa.kabupaten} IN (
             'INTAN JAYA',
             'MIMIKA',
             'PUNCAK',
             'PUNCAK JAYA',
             'TIMIKA'
         ) THEN 'MIMIKA'
         WHEN ${currTrxSa.kabupaten} IN ('DEIYAI', 'DOGIYAI', 'NABIRE', 'PANIAI') THEN 'NABIRE'
         ELSE NULL
     END
                    `.as('subbranchName'),
                    clusterName: sql<string>`
     CASE
         WHEN ${currTrxSa.kabupaten} IN (
             'KOTA AMBON',
             'MALUKU TENGAH',
             'SERAM BAGIAN TIMUR'
         ) THEN 'AMBON'
         WHEN ${currTrxSa.kabupaten} IN (
             'KEPULAUAN ARU',
             'KOTA TUAL',
             'MALUKU BARAT DAYA',
             'MALUKU TENGGARA',
             'MALUKU TENGGARA BARAT',
             'KEPULAUAN TANIMBAR'
         ) THEN 'KEPULAUAN TUAL'
         WHEN ${currTrxSa.kabupaten} IN ('BURU', 'BURU SELATAN', 'SERAM BAGIAN BARAT') THEN 'SERAM BARAT BURU'
         WHEN ${currTrxSa.kabupaten} IN ('KOTA JAYAPURA') THEN 'KOTA JAYAPURA'
         WHEN ${currTrxSa.kabupaten} IN ('JAYAPURA', 'KEEROM', 'MAMBERAMO RAYA', 'SARMI') THEN 'JAYAPURA OUTER'
         WHEN ${currTrxSa.kabupaten} IN (
             'BIAK',
             'BIAK NUMFOR',
             'KEPULAUAN YAPEN',
             'SUPIORI',
             'WAROPEN'
         ) THEN 'NEW BIAK NUMFOR'
         WHEN ${currTrxSa.kabupaten} IN (
             'JAYAWIJAYA',
             'LANNY JAYA',
             'MAMBERAMO TENGAH',
             'NDUGA',
             'PEGUNUNGAN BINTANG',
             'TOLIKARA',
             'YAHUKIMO',
             'YALIMO'
         ) THEN 'PAPUA PEGUNUNGAN'
         WHEN ${currTrxSa.kabupaten} IN ('MANOKWARI') THEN 'MANOKWARI'
         WHEN ${currTrxSa.kabupaten} IN (
             'FAKFAK',
             'FAK FAK',
             'KAIMANA',
             'MANOKWARI SELATAN',
             'PEGUNUNGAN ARFAK',
             'TELUK BINTUNI',
             'TELUK WONDAMA'
         ) THEN 'MANOKWARI OUTER'
         WHEN ${currTrxSa.kabupaten} IN (
             'KOTA SORONG',
             'MAYBRAT',
             'RAJA AMPAT',
             'SORONG',
             'SORONG SELATAN',
             'TAMBRAUW'
         ) THEN 'NEW SORONG RAJA AMPAT'
         WHEN ${currTrxSa.kabupaten} IN (
             'INTAN JAYA',
             'MIMIKA',
             'PUNCAK',
             'PUNCAK JAYA',
             'TIMIKA'
         ) THEN 'MIMIKA PUNCAK'
         WHEN ${currTrxSa.kabupaten} IN ('DEIYAI', 'DOGIYAI', 'NABIRE', 'PANIAI') THEN 'NABIRE'
         WHEN ${currTrxSa.kabupaten} IN ('ASMAT', 'BOVEN DIGOEL', 'MAPPI', 'MERAUKE') THEN 'NEW MERAUKE'
         ELSE NULL
     END
                    `.as('clusterName'),
                    kabupaten: currTrxSa.kabupaten,
                    trx: sql<number>`COUNT(${currTrxSa.msisdn})`.as('trx')
                })
                .from(currTrxSa)
                .where(and(
                    not(eq(currTrxSa.kabupaten, 'TMP')),
                    eq(currTrxSa.brand, 'prepaid'),
                    and(
                        inArray(currTrxSa.regional, ['MALUKU DAN PAPUA', 'PUMA']),
                        between(currTrxSa.trxDate, firstDayOfCurrMonth, currDate)
                    )
                ))
                .groupBy(sql`1,2,3,4,5`)
                .as('sq2')

            const sq3 = db5
                .select({
                    regionName: sql<string>`CASE WHEN ${prevMonthTrxSA.regional} IN ('MALUKU DAN PAPUA', 'PUMA') THEN 'PUMA' END`.as('regionName'),
                    branchName: sql<string>`
     CASE
         WHEN ${prevMonthTrxSA.kabupaten} IN (
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
         WHEN ${prevMonthTrxSA.kabupaten} IN (
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
         WHEN ${prevMonthTrxSA.kabupaten} IN (
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
         WHEN ${prevMonthTrxSA.kabupaten} IN (
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
         WHEN ${prevMonthTrxSA.kabupaten} IN (
             'AMBON',
             'KOTA AMBON',
             'MALUKU TENGAH',
             'SERAM BAGIAN TIMUR'
         ) THEN 'AMBON'
         WHEN ${prevMonthTrxSA.kabupaten} IN (
             'KEPULAUAN ARU',
             'KOTA TUAL',
             'MALUKU BARAT DAYA',
             'MALUKU TENGGARA',
             'MALUKU TENGGARA BARAT',
             'KEPULAUAN TANIMBAR'
         ) THEN 'KEPULAUAN AMBON'
         WHEN ${prevMonthTrxSA.kabupaten} IN ('BURU', 'BURU SELATAN', 'SERAM BAGIAN BARAT') THEN 'SERAM BURU'
         WHEN ${prevMonthTrxSA.kabupaten} IN ('KOTA JAYAPURA') THEN 'JAYAPURA'
         WHEN ${prevMonthTrxSA.kabupaten} IN (
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
         WHEN ${prevMonthTrxSA.kabupaten} IN ('MANOKWARI') THEN 'MANOKWARI'
         WHEN ${prevMonthTrxSA.kabupaten} IN (
             'FAKFAK',
             'FAK FAK',
             'KAIMANA',
             'MANOKWARI SELATAN',
             'PEGUNUNGAN ARFAK',
             'TELUK BINTUNI',
             'TELUK WONDAMA'
         ) THEN 'MANOKWARI OUTER'
         WHEN ${prevMonthTrxSA.kabupaten} IN (
             'KOTA SORONG',
             'MAYBRAT',
             'RAJA AMPAT',
             'SORONG',
             'SORONG SELATAN',
             'TAMBRAUW'
         ) THEN 'SORONG RAJA AMPAT'
         WHEN ${prevMonthTrxSA.kabupaten} IN ('ASMAT', 'BOVEN DIGOEL', 'MAPPI', 'MERAUKE') THEN 'MERAUKE'
         WHEN ${prevMonthTrxSA.kabupaten} IN (
             'INTAN JAYA',
             'MIMIKA',
             'PUNCAK',
             'PUNCAK JAYA',
             'TIMIKA'
         ) THEN 'MIMIKA'
         WHEN ${prevMonthTrxSA.kabupaten} IN ('DEIYAI', 'DOGIYAI', 'NABIRE', 'PANIAI') THEN 'NABIRE'
         ELSE NULL
     END
                    `.as('subbranchName'),
                    clusterName: sql<string>`
     CASE
         WHEN ${prevMonthTrxSA.kabupaten} IN (
             'KOTA AMBON',
             'MALUKU TENGAH',
             'SERAM BAGIAN TIMUR'
         ) THEN 'AMBON'
         WHEN ${prevMonthTrxSA.kabupaten} IN (
             'KEPULAUAN ARU',
             'KOTA TUAL',
             'MALUKU BARAT DAYA',
             'MALUKU TENGGARA',
             'MALUKU TENGGARA BARAT',
             'KEPULAUAN TANIMBAR'
         ) THEN 'KEPULAUAN TUAL'
         WHEN ${prevMonthTrxSA.kabupaten} IN ('BURU', 'BURU SELATAN', 'SERAM BAGIAN BARAT') THEN 'SERAM BARAT BURU'
         WHEN ${prevMonthTrxSA.kabupaten} IN ('KOTA JAYAPURA') THEN 'KOTA JAYAPURA'
         WHEN ${prevMonthTrxSA.kabupaten} IN ('JAYAPURA', 'KEEROM', 'MAMBERAMO RAYA', 'SARMI') THEN 'JAYAPURA OUTER'
         WHEN ${prevMonthTrxSA.kabupaten} IN (
             'BIAK',
             'BIAK NUMFOR',
             'KEPULAUAN YAPEN',
             'SUPIORI',
             'WAROPEN'
         ) THEN 'NEW BIAK NUMFOR'
         WHEN ${prevMonthTrxSA.kabupaten} IN (
             'JAYAWIJAYA',
             'LANNY JAYA',
             'MAMBERAMO TENGAH',
             'NDUGA',
             'PEGUNUNGAN BINTANG',
             'TOLIKARA',
             'YAHUKIMO',
             'YALIMO'
         ) THEN 'PAPUA PEGUNUNGAN'
         WHEN ${prevMonthTrxSA.kabupaten} IN ('MANOKWARI') THEN 'MANOKWARI'
         WHEN ${prevMonthTrxSA.kabupaten} IN (
             'FAKFAK',
             'FAK FAK',
             'KAIMANA',
             'MANOKWARI SELATAN',
             'PEGUNUNGAN ARFAK',
             'TELUK BINTUNI',
             'TELUK WONDAMA'
         ) THEN 'MANOKWARI OUTER'
         WHEN ${prevMonthTrxSA.kabupaten} IN (
             'KOTA SORONG',
             'MAYBRAT',
             'RAJA AMPAT',
             'SORONG',
             'SORONG SELATAN',
             'TAMBRAUW'
         ) THEN 'NEW SORONG RAJA AMPAT'
         WHEN ${prevMonthTrxSA.kabupaten} IN (
             'INTAN JAYA',
             'MIMIKA',
             'PUNCAK',
             'PUNCAK JAYA',
             'TIMIKA'
         ) THEN 'MIMIKA PUNCAK'
         WHEN ${prevMonthTrxSA.kabupaten} IN ('DEIYAI', 'DOGIYAI', 'NABIRE', 'PANIAI') THEN 'NABIRE'
         WHEN ${prevMonthTrxSA.kabupaten} IN ('ASMAT', 'BOVEN DIGOEL', 'MAPPI', 'MERAUKE') THEN 'NEW MERAUKE'
         ELSE NULL
     END
                    `.as('clusterName'),
                    kabupaten: prevMonthTrxSA.kabupaten,
                    trx: sql<number>`COUNT(${prevMonthTrxSA.msisdn})`.as('trx')
                })
                .from(prevMonthTrxSA)
                .where(and(
                    not(eq(prevMonthTrxSA.kabupaten, 'TMP')),
                    eq(prevMonthTrxSA.brand, 'prepaid'),
                    and(
                        inArray(prevMonthTrxSA.regional, ['MALUKU DAN PAPUA', 'PUMA']),
                        between(prevMonthTrxSA.trxDate, firstDayOfPrevMonth, prevDate)
                    )
                ))
                .groupBy(sql`1,2,3,4,5`)
                .as('sq3')

            const sq4 = db5
                .select({
                    regionName: sql<string>`CASE WHEN ${prevYearCurrMonthTrxSA.regional} IN ('MALUKU DAN PAPUA', 'PUMA') THEN 'PUMA' END`.as('regionName'),
                    branchName: sql<string>`
     CASE
         WHEN ${prevYearCurrMonthTrxSA.kabupaten} IN (
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
         WHEN ${prevYearCurrMonthTrxSA.kabupaten} IN (
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
         WHEN ${prevYearCurrMonthTrxSA.kabupaten} IN (
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
         WHEN ${prevYearCurrMonthTrxSA.kabupaten} IN (
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
         WHEN ${prevYearCurrMonthTrxSA.kabupaten} IN (
             'AMBON',
             'KOTA AMBON',
             'MALUKU TENGAH',
             'SERAM BAGIAN TIMUR'
         ) THEN 'AMBON'
         WHEN ${prevYearCurrMonthTrxSA.kabupaten} IN (
             'KEPULAUAN ARU',
             'KOTA TUAL',
             'MALUKU BARAT DAYA',
             'MALUKU TENGGARA',
             'MALUKU TENGGARA BARAT',
             'KEPULAUAN TANIMBAR'
         ) THEN 'KEPULAUAN AMBON'
         WHEN ${prevYearCurrMonthTrxSA.kabupaten} IN ('BURU', 'BURU SELATAN', 'SERAM BAGIAN BARAT') THEN 'SERAM BURU'
         WHEN ${prevYearCurrMonthTrxSA.kabupaten} IN ('KOTA JAYAPURA') THEN 'JAYAPURA'
         WHEN ${prevYearCurrMonthTrxSA.kabupaten} IN (
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
         WHEN ${prevYearCurrMonthTrxSA.kabupaten} IN ('MANOKWARI') THEN 'MANOKWARI'
         WHEN ${prevYearCurrMonthTrxSA.kabupaten} IN (
             'FAKFAK',
             'FAK FAK',
             'KAIMANA',
             'MANOKWARI SELATAN',
             'PEGUNUNGAN ARFAK',
             'TELUK BINTUNI',
             'TELUK WONDAMA'
         ) THEN 'MANOKWARI OUTER'
         WHEN ${prevYearCurrMonthTrxSA.kabupaten} IN (
             'KOTA SORONG',
             'MAYBRAT',
             'RAJA AMPAT',
             'SORONG',
             'SORONG SELATAN',
             'TAMBRAUW'
         ) THEN 'SORONG RAJA AMPAT'
         WHEN ${prevYearCurrMonthTrxSA.kabupaten} IN ('ASMAT', 'BOVEN DIGOEL', 'MAPPI', 'MERAUKE') THEN 'MERAUKE'
         WHEN ${prevYearCurrMonthTrxSA.kabupaten} IN (
             'INTAN JAYA',
             'MIMIKA',
             'PUNCAK',
             'PUNCAK JAYA',
             'TIMIKA'
         ) THEN 'MIMIKA'
         WHEN ${prevYearCurrMonthTrxSA.kabupaten} IN ('DEIYAI', 'DOGIYAI', 'NABIRE', 'PANIAI') THEN 'NABIRE'
         ELSE NULL
     END
                    `.as('subbranchName'),
                    clusterName: sql<string>`
     CASE
         WHEN ${prevYearCurrMonthTrxSA.kabupaten} IN (
             'KOTA AMBON',
             'MALUKU TENGAH',
             'SERAM BAGIAN TIMUR'
         ) THEN 'AMBON'
         WHEN ${prevYearCurrMonthTrxSA.kabupaten} IN (
             'KEPULAUAN ARU',
             'KOTA TUAL',
             'MALUKU BARAT DAYA',
             'MALUKU TENGGARA',
             'MALUKU TENGGARA BARAT',
             'KEPULAUAN TANIMBAR'
         ) THEN 'KEPULAUAN TUAL'
         WHEN ${prevYearCurrMonthTrxSA.kabupaten} IN ('BURU', 'BURU SELATAN', 'SERAM BAGIAN BARAT') THEN 'SERAM BARAT BURU'
         WHEN ${prevYearCurrMonthTrxSA.kabupaten} IN ('KOTA JAYAPURA') THEN 'KOTA JAYAPURA'
         WHEN ${prevYearCurrMonthTrxSA.kabupaten} IN ('JAYAPURA', 'KEEROM', 'MAMBERAMO RAYA', 'SARMI') THEN 'JAYAPURA OUTER'
         WHEN ${prevYearCurrMonthTrxSA.kabupaten} IN (
             'BIAK',
             'BIAK NUMFOR',
             'KEPULAUAN YAPEN',
             'SUPIORI',
             'WAROPEN'
         ) THEN 'NEW BIAK NUMFOR'
         WHEN ${prevYearCurrMonthTrxSA.kabupaten} IN (
             'JAYAWIJAYA',
             'LANNY JAYA',
             'MAMBERAMO TENGAH',
             'NDUGA',
             'PEGUNUNGAN BINTANG',
             'TOLIKARA',
             'YAHUKIMO',
             'YALIMO'
         ) THEN 'PAPUA PEGUNUNGAN'
         WHEN ${prevYearCurrMonthTrxSA.kabupaten} IN ('MANOKWARI') THEN 'MANOKWARI'
         WHEN ${prevYearCurrMonthTrxSA.kabupaten} IN (
             'FAKFAK',
             'FAK FAK',
             'KAIMANA',
             'MANOKWARI SELATAN',
             'PEGUNUNGAN ARFAK',
             'TELUK BINTUNI',
             'TELUK WONDAMA'
         ) THEN 'MANOKWARI OUTER'
         WHEN ${prevYearCurrMonthTrxSA.kabupaten} IN (
             'KOTA SORONG',
             'MAYBRAT',
             'RAJA AMPAT',
             'SORONG',
             'SORONG SELATAN',
             'TAMBRAUW'
         ) THEN 'NEW SORONG RAJA AMPAT'
         WHEN ${prevYearCurrMonthTrxSA.kabupaten} IN (
             'INTAN JAYA',
             'MIMIKA',
             'PUNCAK',
             'PUNCAK JAYA',
             'TIMIKA'
         ) THEN 'MIMIKA PUNCAK'
         WHEN ${prevYearCurrMonthTrxSA.kabupaten} IN ('DEIYAI', 'DOGIYAI', 'NABIRE', 'PANIAI') THEN 'NABIRE'
         WHEN ${prevYearCurrMonthTrxSA.kabupaten} IN ('ASMAT', 'BOVEN DIGOEL', 'MAPPI', 'MERAUKE') THEN 'NEW MERAUKE'
         ELSE NULL
     END
                    `.as('clusterName'),
                    kabupaten: prevYearCurrMonthTrxSA.kabupaten,
                    trx: sql<number>`COUNT(${prevYearCurrMonthTrxSA.msisdn})`.as('trx')
                })
                .from(prevYearCurrMonthTrxSA)
                .where(and(
                    not(eq(prevYearCurrMonthTrxSA.kabupaten, 'TMP')),
                    eq(prevYearCurrMonthTrxSA.brand, 'prepaid'),
                    and(
                        inArray(prevYearCurrMonthTrxSA.regional, ['MALUKU DAN PAPUA', 'PUMA']),
                        between(prevYearCurrMonthTrxSA.trxDate, firstDayOfPrevYearCurrMonth, prevYearCurrDate)
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
                    currMonthTargetRev: sql<number>`SUM(${trxSAPrabayar[monthColumn]})`.as('currMonthTargetRev')
                })
                .from(regionals)
                .leftJoin(branches, eq(regionals.id, branches.regionalId))
                .leftJoin(subbranches, eq(branches.id, subbranches.branchId))
                .leftJoin(clusters, eq(subbranches.id, clusters.subbranchId))
                .leftJoin(kabupatens, eq(clusters.id, kabupatens.clusterId))
                .leftJoin(trxSAPrabayar, eq(kabupatens.id, trxSAPrabayar.kabupatenId))
                .groupBy(
                    regionals.regional,
                    branches.branchNew,
                    subbranches.subbranchNew,
                    clusters.cluster,
                    kabupatens.kabupaten
                )
                .orderBy(asc(regionals.regional))
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

            const queryCurrYtd = currYtdTrxSARev.map(table => `
                    SELECT
                        CASE WHEN regional IN ('PUMA', 'MALUKU DAN PAPUA') THEN 'PUMA' END as region,
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
                        trx_date,
                        COUNT(msisdn) as trx
                    FROM ${table} WHERE regional IN ('MALUKU DAN PAPUA', 'PUMA') AND brand = 'prepaid' AND kabupaten <> 'TMP' GROUP BY 1,2,3,4,5`).join(' UNION ALL ')

            const queryPrevYtd = prevYtdTrxSARev.map(table => `
                        SELECT
                            CASE WHEN regional IN ('PUMA', 'MALUKU DAN PAPUA') THEN 'PUMA' END as region,
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
                            trx_date,
                            COUNT(msisdn) as trx
                    FROM ${table} WHERE regional IN ('PUMA', 'MALUKU DAN PAPUA') AND brand = 'prepaid' AND kabupaten <> 'TMP' GROUP BY 1,2,3,4,5`).join(' UNION ALL ')

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
                        WHERE trx_date BETWEEN '${currJanuaryFirst}' AND '${currDate}'
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
                        WHERE trx_date BETWEEN '${prevJanuaryFirst}' AND '${prevYearCurrDate}'
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
    .get('/trx-sa-byu', zValidator('query', z.object({ date: z.coerce.date().optional() })),
        async c => {
            const { date } = c.req.valid('query')
            const selectedDate = date ? new Date(date) : subDays(new Date(), 3)
            const month = (selectedDate.getMonth() + 1).toString()


            // KOLOM DINAMIS UNTUK MEMILIH ANTARA KOLOM `m1-m12`
            const monthColumn = `m${month}` as keyof typeof trxSAByu.$inferSelect

            // VARIABLE TANGGAL UNTUK IMPORT TABEL SECARA DINAMIS
            const latestDataDate = subDays(selectedDate, 3); // - 3 days

            const currMonth = format(selectedDate, 'MM')
            const currYear = format(selectedDate, 'yyyy')
            const latestMonth = parseInt(format(selectedDate, 'M'), 10)
            const isPrevMonthLastYear = currMonth === '01'
            const prevMonth = isPrevMonthLastYear ? '12' : format(subMonths(selectedDate, 1), 'MM')
            const prevMonthYear = isPrevMonthLastYear ? format(subYears(selectedDate, 1), 'yyyy') : format(selectedDate, 'yyyy')
            const prevYear = format(subYears(selectedDate, 1), 'yyyy')

            // TABEL `sa_detil_`
            const currTrxSa = dynamicRevenueSATable(currYear, currMonth)
            const prevMonthTrxSA = dynamicRevenueSATable(prevMonthYear, prevMonth)
            const prevYearCurrMonthTrxSA = dynamicRevenueSATable(prevYear, currMonth)
            const currYtdTrxSARev: string[] = [];
            for (let month = 1; month <= latestMonth; month++) {
                const monthStr = month.toString().padStart(2, '0')
                currYtdTrxSARev.push(`sa_detil_${currYear}${monthStr}`)
            }
            const prevYtdTrxSARev: string[] = [];
            for (let month = 1; month <= latestMonth; month++) {
                const monthStr = month.toString().padStart(2, '0')
                prevYtdTrxSARev.push(`sa_detil_${prevYear}${monthStr}`)
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

            const currJanuaryFirst = `${currYear}-01-01`
            const prevJanuaryFirst = `${prevYear}-01-01`

            const sq2 = db5
                .select({
                    regionName: sql<string>`CASE WHEN ${currTrxSa.regional} IN ('MALUKU DAN PAPUA', 'PUMA') THEN 'PUMA' END`.as('regionName'),
                    branchName: sql<string>`
 CASE
     WHEN ${currTrxSa.kabupaten} IN (
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
     WHEN ${currTrxSa.kabupaten} IN (
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
     WHEN ${currTrxSa.kabupaten} IN (
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
     WHEN ${currTrxSa.kabupaten} IN (
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
     WHEN ${currTrxSa.kabupaten} IN (
         'AMBON',
         'KOTA AMBON',
         'MALUKU TENGAH',
         'SERAM BAGIAN TIMUR'
     ) THEN 'AMBON'
     WHEN ${currTrxSa.kabupaten} IN (
         'KEPULAUAN ARU',
         'KOTA TUAL',
         'MALUKU BARAT DAYA',
         'MALUKU TENGGARA',
         'MALUKU TENGGARA BARAT',
         'KEPULAUAN TANIMBAR'
     ) THEN 'KEPULAUAN AMBON'
     WHEN ${currTrxSa.kabupaten} IN ('BURU', 'BURU SELATAN', 'SERAM BAGIAN BARAT') THEN 'SERAM BURU'
     WHEN ${currTrxSa.kabupaten} IN ('KOTA JAYAPURA') THEN 'JAYAPURA'
     WHEN ${currTrxSa.kabupaten} IN (
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
     WHEN ${currTrxSa.kabupaten} IN ('MANOKWARI') THEN 'MANOKWARI'
     WHEN ${currTrxSa.kabupaten} IN (
         'FAKFAK',
         'FAK FAK',
         'KAIMANA',
         'MANOKWARI SELATAN',
         'PEGUNUNGAN ARFAK',
         'TELUK BINTUNI',
         'TELUK WONDAMA'
     ) THEN 'MANOKWARI OUTER'
     WHEN ${currTrxSa.kabupaten} IN (
         'KOTA SORONG',
         'MAYBRAT',
         'RAJA AMPAT',
         'SORONG',
         'SORONG SELATAN',
         'TAMBRAUW'
     ) THEN 'SORONG RAJA AMPAT'
     WHEN ${currTrxSa.kabupaten} IN ('ASMAT', 'BOVEN DIGOEL', 'MAPPI', 'MERAUKE') THEN 'MERAUKE'
     WHEN ${currTrxSa.kabupaten} IN (
         'INTAN JAYA',
         'MIMIKA',
         'PUNCAK',
         'PUNCAK JAYA',
         'TIMIKA'
     ) THEN 'MIMIKA'
     WHEN ${currTrxSa.kabupaten} IN ('DEIYAI', 'DOGIYAI', 'NABIRE', 'PANIAI') THEN 'NABIRE'
     ELSE NULL
 END
                `.as('subbranchName'),
                    clusterName: sql<string>`
 CASE
     WHEN ${currTrxSa.kabupaten} IN (
         'KOTA AMBON',
         'MALUKU TENGAH',
         'SERAM BAGIAN TIMUR'
     ) THEN 'AMBON'
     WHEN ${currTrxSa.kabupaten} IN (
         'KEPULAUAN ARU',
         'KOTA TUAL',
         'MALUKU BARAT DAYA',
         'MALUKU TENGGARA',
         'MALUKU TENGGARA BARAT',
         'KEPULAUAN TANIMBAR'
     ) THEN 'KEPULAUAN TUAL'
     WHEN ${currTrxSa.kabupaten} IN ('BURU', 'BURU SELATAN', 'SERAM BAGIAN BARAT') THEN 'SERAM BARAT BURU'
     WHEN ${currTrxSa.kabupaten} IN ('KOTA JAYAPURA') THEN 'KOTA JAYAPURA'
     WHEN ${currTrxSa.kabupaten} IN ('JAYAPURA', 'KEEROM', 'MAMBERAMO RAYA', 'SARMI') THEN 'JAYAPURA OUTER'
     WHEN ${currTrxSa.kabupaten} IN (
         'BIAK',
         'BIAK NUMFOR',
         'KEPULAUAN YAPEN',
         'SUPIORI',
         'WAROPEN'
     ) THEN 'NEW BIAK NUMFOR'
     WHEN ${currTrxSa.kabupaten} IN (
         'JAYAWIJAYA',
         'LANNY JAYA',
         'MAMBERAMO TENGAH',
         'NDUGA',
         'PEGUNUNGAN BINTANG',
         'TOLIKARA',
         'YAHUKIMO',
         'YALIMO'
     ) THEN 'PAPUA PEGUNUNGAN'
     WHEN ${currTrxSa.kabupaten} IN ('MANOKWARI') THEN 'MANOKWARI'
     WHEN ${currTrxSa.kabupaten} IN (
         'FAKFAK',
         'FAK FAK',
         'KAIMANA',
         'MANOKWARI SELATAN',
         'PEGUNUNGAN ARFAK',
         'TELUK BINTUNI',
         'TELUK WONDAMA'
     ) THEN 'MANOKWARI OUTER'
     WHEN ${currTrxSa.kabupaten} IN (
         'KOTA SORONG',
         'MAYBRAT',
         'RAJA AMPAT',
         'SORONG',
         'SORONG SELATAN',
         'TAMBRAUW'
     ) THEN 'NEW SORONG RAJA AMPAT'
     WHEN ${currTrxSa.kabupaten} IN (
         'INTAN JAYA',
         'MIMIKA',
         'PUNCAK',
         'PUNCAK JAYA',
         'TIMIKA'
     ) THEN 'MIMIKA PUNCAK'
     WHEN ${currTrxSa.kabupaten} IN ('DEIYAI', 'DOGIYAI', 'NABIRE', 'PANIAI') THEN 'NABIRE'
     WHEN ${currTrxSa.kabupaten} IN ('ASMAT', 'BOVEN DIGOEL', 'MAPPI', 'MERAUKE') THEN 'NEW MERAUKE'
     ELSE NULL
 END
                `.as('clusterName'),
                    kabupaten: currTrxSa.kabupaten,
                    trx: sql<number>`COUNT(${currTrxSa.msisdn})`.as('trx')
                })
                .from(currTrxSa)
                .where(and(
                    not(eq(currTrxSa.kabupaten, 'TMP')),
                    eq(currTrxSa.brand, 'byu'),
                    and(
                        inArray(currTrxSa.regional, ['MALUKU DAN PAPUA', 'PUMA']),
                        between(currTrxSa.trxDate, firstDayOfCurrMonth, currDate)
                    )
                ))
                .groupBy(sql`1,2,3,4,5`)
                .as('sq2')

            const sq3 = db5
                .select({
                    regionName: sql<string>`CASE WHEN ${prevMonthTrxSA.regional} IN ('MALUKU DAN PAPUA', 'PUMA') THEN 'PUMA' END`.as('regionName'),
                    branchName: sql<string>`
 CASE
     WHEN ${prevMonthTrxSA.kabupaten} IN (
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
     WHEN ${prevMonthTrxSA.kabupaten} IN (
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
     WHEN ${prevMonthTrxSA.kabupaten} IN (
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
     WHEN ${prevMonthTrxSA.kabupaten} IN (
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
     WHEN ${prevMonthTrxSA.kabupaten} IN (
         'AMBON',
         'KOTA AMBON',
         'MALUKU TENGAH',
         'SERAM BAGIAN TIMUR'
     ) THEN 'AMBON'
     WHEN ${prevMonthTrxSA.kabupaten} IN (
         'KEPULAUAN ARU',
         'KOTA TUAL',
         'MALUKU BARAT DAYA',
         'MALUKU TENGGARA',
         'MALUKU TENGGARA BARAT',
         'KEPULAUAN TANIMBAR'
     ) THEN 'KEPULAUAN AMBON'
     WHEN ${prevMonthTrxSA.kabupaten} IN ('BURU', 'BURU SELATAN', 'SERAM BAGIAN BARAT') THEN 'SERAM BURU'
     WHEN ${prevMonthTrxSA.kabupaten} IN ('KOTA JAYAPURA') THEN 'JAYAPURA'
     WHEN ${prevMonthTrxSA.kabupaten} IN (
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
     WHEN ${prevMonthTrxSA.kabupaten} IN ('MANOKWARI') THEN 'MANOKWARI'
     WHEN ${prevMonthTrxSA.kabupaten} IN (
         'FAKFAK',
         'FAK FAK',
         'KAIMANA',
         'MANOKWARI SELATAN',
         'PEGUNUNGAN ARFAK',
         'TELUK BINTUNI',
         'TELUK WONDAMA'
     ) THEN 'MANOKWARI OUTER'
     WHEN ${prevMonthTrxSA.kabupaten} IN (
         'KOTA SORONG',
         'MAYBRAT',
         'RAJA AMPAT',
         'SORONG',
         'SORONG SELATAN',
         'TAMBRAUW'
     ) THEN 'SORONG RAJA AMPAT'
     WHEN ${prevMonthTrxSA.kabupaten} IN ('ASMAT', 'BOVEN DIGOEL', 'MAPPI', 'MERAUKE') THEN 'MERAUKE'
     WHEN ${prevMonthTrxSA.kabupaten} IN (
         'INTAN JAYA',
         'MIMIKA',
         'PUNCAK',
         'PUNCAK JAYA',
         'TIMIKA'
     ) THEN 'MIMIKA'
     WHEN ${prevMonthTrxSA.kabupaten} IN ('DEIYAI', 'DOGIYAI', 'NABIRE', 'PANIAI') THEN 'NABIRE'
     ELSE NULL
 END
                `.as('subbranchName'),
                    clusterName: sql<string>`
 CASE
     WHEN ${prevMonthTrxSA.kabupaten} IN (
         'KOTA AMBON',
         'MALUKU TENGAH',
         'SERAM BAGIAN TIMUR'
     ) THEN 'AMBON'
     WHEN ${prevMonthTrxSA.kabupaten} IN (
         'KEPULAUAN ARU',
         'KOTA TUAL',
         'MALUKU BARAT DAYA',
         'MALUKU TENGGARA',
         'MALUKU TENGGARA BARAT',
         'KEPULAUAN TANIMBAR'
     ) THEN 'KEPULAUAN TUAL'
     WHEN ${prevMonthTrxSA.kabupaten} IN ('BURU', 'BURU SELATAN', 'SERAM BAGIAN BARAT') THEN 'SERAM BARAT BURU'
     WHEN ${prevMonthTrxSA.kabupaten} IN ('KOTA JAYAPURA') THEN 'KOTA JAYAPURA'
     WHEN ${prevMonthTrxSA.kabupaten} IN ('JAYAPURA', 'KEEROM', 'MAMBERAMO RAYA', 'SARMI') THEN 'JAYAPURA OUTER'
     WHEN ${prevMonthTrxSA.kabupaten} IN (
         'BIAK',
         'BIAK NUMFOR',
         'KEPULAUAN YAPEN',
         'SUPIORI',
         'WAROPEN'
     ) THEN 'NEW BIAK NUMFOR'
     WHEN ${prevMonthTrxSA.kabupaten} IN (
         'JAYAWIJAYA',
         'LANNY JAYA',
         'MAMBERAMO TENGAH',
         'NDUGA',
         'PEGUNUNGAN BINTANG',
         'TOLIKARA',
         'YAHUKIMO',
         'YALIMO'
     ) THEN 'PAPUA PEGUNUNGAN'
     WHEN ${prevMonthTrxSA.kabupaten} IN ('MANOKWARI') THEN 'MANOKWARI'
     WHEN ${prevMonthTrxSA.kabupaten} IN (
         'FAKFAK',
         'FAK FAK',
         'KAIMANA',
         'MANOKWARI SELATAN',
         'PEGUNUNGAN ARFAK',
         'TELUK BINTUNI',
         'TELUK WONDAMA'
     ) THEN 'MANOKWARI OUTER'
     WHEN ${prevMonthTrxSA.kabupaten} IN (
         'KOTA SORONG',
         'MAYBRAT',
         'RAJA AMPAT',
         'SORONG',
         'SORONG SELATAN',
         'TAMBRAUW'
     ) THEN 'NEW SORONG RAJA AMPAT'
     WHEN ${prevMonthTrxSA.kabupaten} IN (
         'INTAN JAYA',
         'MIMIKA',
         'PUNCAK',
         'PUNCAK JAYA',
         'TIMIKA'
     ) THEN 'MIMIKA PUNCAK'
     WHEN ${prevMonthTrxSA.kabupaten} IN ('DEIYAI', 'DOGIYAI', 'NABIRE', 'PANIAI') THEN 'NABIRE'
     WHEN ${prevMonthTrxSA.kabupaten} IN ('ASMAT', 'BOVEN DIGOEL', 'MAPPI', 'MERAUKE') THEN 'NEW MERAUKE'
     ELSE NULL
 END
                `.as('clusterName'),
                    kabupaten: prevMonthTrxSA.kabupaten,
                    trx: sql<number>`COUNT(${prevMonthTrxSA.msisdn})`.as('trx')
                })
                .from(prevMonthTrxSA)
                .where(and(
                    not(eq(prevMonthTrxSA.kabupaten, 'TMP')),
                    eq(prevMonthTrxSA.brand, 'byu'),
                    and(
                        inArray(prevMonthTrxSA.regional, ['MALUKU DAN PAPUA', 'PUMA']),
                        between(prevMonthTrxSA.trxDate, firstDayOfPrevMonth, prevDate)
                    )
                ))
                .groupBy(sql`1,2,3,4,5`)
                .as('sq3')

            const sq4 = db5
                .select({
                    regionName: sql<string>`CASE WHEN ${prevYearCurrMonthTrxSA.regional} IN ('MALUKU DAN PAPUA', 'PUMA') THEN 'PUMA' END`.as('regionName'),
                    branchName: sql<string>`
 CASE
     WHEN ${prevYearCurrMonthTrxSA.kabupaten} IN (
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
     WHEN ${prevYearCurrMonthTrxSA.kabupaten} IN (
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
     WHEN ${prevYearCurrMonthTrxSA.kabupaten} IN (
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
     WHEN ${prevYearCurrMonthTrxSA.kabupaten} IN (
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
     WHEN ${prevYearCurrMonthTrxSA.kabupaten} IN (
         'AMBON',
         'KOTA AMBON',
         'MALUKU TENGAH',
         'SERAM BAGIAN TIMUR'
     ) THEN 'AMBON'
     WHEN ${prevYearCurrMonthTrxSA.kabupaten} IN (
         'KEPULAUAN ARU',
         'KOTA TUAL',
         'MALUKU BARAT DAYA',
         'MALUKU TENGGARA',
         'MALUKU TENGGARA BARAT',
         'KEPULAUAN TANIMBAR'
     ) THEN 'KEPULAUAN AMBON'
     WHEN ${prevYearCurrMonthTrxSA.kabupaten} IN ('BURU', 'BURU SELATAN', 'SERAM BAGIAN BARAT') THEN 'SERAM BURU'
     WHEN ${prevYearCurrMonthTrxSA.kabupaten} IN ('KOTA JAYAPURA') THEN 'JAYAPURA'
     WHEN ${prevYearCurrMonthTrxSA.kabupaten} IN (
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
     WHEN ${prevYearCurrMonthTrxSA.kabupaten} IN ('MANOKWARI') THEN 'MANOKWARI'
     WHEN ${prevYearCurrMonthTrxSA.kabupaten} IN (
         'FAKFAK',
         'FAK FAK',
         'KAIMANA',
         'MANOKWARI SELATAN',
         'PEGUNUNGAN ARFAK',
         'TELUK BINTUNI',
         'TELUK WONDAMA'
     ) THEN 'MANOKWARI OUTER'
     WHEN ${prevYearCurrMonthTrxSA.kabupaten} IN (
         'KOTA SORONG',
         'MAYBRAT',
         'RAJA AMPAT',
         'SORONG',
         'SORONG SELATAN',
         'TAMBRAUW'
     ) THEN 'SORONG RAJA AMPAT'
     WHEN ${prevYearCurrMonthTrxSA.kabupaten} IN ('ASMAT', 'BOVEN DIGOEL', 'MAPPI', 'MERAUKE') THEN 'MERAUKE'
     WHEN ${prevYearCurrMonthTrxSA.kabupaten} IN (
         'INTAN JAYA',
         'MIMIKA',
         'PUNCAK',
         'PUNCAK JAYA',
         'TIMIKA'
     ) THEN 'MIMIKA'
     WHEN ${prevYearCurrMonthTrxSA.kabupaten} IN ('DEIYAI', 'DOGIYAI', 'NABIRE', 'PANIAI') THEN 'NABIRE'
     ELSE NULL
 END
                `.as('subbranchName'),
                    clusterName: sql<string>`
 CASE
     WHEN ${prevYearCurrMonthTrxSA.kabupaten} IN (
         'KOTA AMBON',
         'MALUKU TENGAH',
         'SERAM BAGIAN TIMUR'
     ) THEN 'AMBON'
     WHEN ${prevYearCurrMonthTrxSA.kabupaten} IN (
         'KEPULAUAN ARU',
         'KOTA TUAL',
         'MALUKU BARAT DAYA',
         'MALUKU TENGGARA',
         'MALUKU TENGGARA BARAT',
         'KEPULAUAN TANIMBAR'
     ) THEN 'KEPULAUAN TUAL'
     WHEN ${prevYearCurrMonthTrxSA.kabupaten} IN ('BURU', 'BURU SELATAN', 'SERAM BAGIAN BARAT') THEN 'SERAM BARAT BURU'
     WHEN ${prevYearCurrMonthTrxSA.kabupaten} IN ('KOTA JAYAPURA') THEN 'KOTA JAYAPURA'
     WHEN ${prevYearCurrMonthTrxSA.kabupaten} IN ('JAYAPURA', 'KEEROM', 'MAMBERAMO RAYA', 'SARMI') THEN 'JAYAPURA OUTER'
     WHEN ${prevYearCurrMonthTrxSA.kabupaten} IN (
         'BIAK',
         'BIAK NUMFOR',
         'KEPULAUAN YAPEN',
         'SUPIORI',
         'WAROPEN'
     ) THEN 'NEW BIAK NUMFOR'
     WHEN ${prevYearCurrMonthTrxSA.kabupaten} IN (
         'JAYAWIJAYA',
         'LANNY JAYA',
         'MAMBERAMO TENGAH',
         'NDUGA',
         'PEGUNUNGAN BINTANG',
         'TOLIKARA',
         'YAHUKIMO',
         'YALIMO'
     ) THEN 'PAPUA PEGUNUNGAN'
     WHEN ${prevYearCurrMonthTrxSA.kabupaten} IN ('MANOKWARI') THEN 'MANOKWARI'
     WHEN ${prevYearCurrMonthTrxSA.kabupaten} IN (
         'FAKFAK',
         'FAK FAK',
         'KAIMANA',
         'MANOKWARI SELATAN',
         'PEGUNUNGAN ARFAK',
         'TELUK BINTUNI',
         'TELUK WONDAMA'
     ) THEN 'MANOKWARI OUTER'
     WHEN ${prevYearCurrMonthTrxSA.kabupaten} IN (
         'KOTA SORONG',
         'MAYBRAT',
         'RAJA AMPAT',
         'SORONG',
         'SORONG SELATAN',
         'TAMBRAUW'
     ) THEN 'NEW SORONG RAJA AMPAT'
     WHEN ${prevYearCurrMonthTrxSA.kabupaten} IN (
         'INTAN JAYA',
         'MIMIKA',
         'PUNCAK',
         'PUNCAK JAYA',
         'TIMIKA'
     ) THEN 'MIMIKA PUNCAK'
     WHEN ${prevYearCurrMonthTrxSA.kabupaten} IN ('DEIYAI', 'DOGIYAI', 'NABIRE', 'PANIAI') THEN 'NABIRE'
     WHEN ${prevYearCurrMonthTrxSA.kabupaten} IN ('ASMAT', 'BOVEN DIGOEL', 'MAPPI', 'MERAUKE') THEN 'NEW MERAUKE'
     ELSE NULL
 END
                `.as('clusterName'),
                    kabupaten: prevYearCurrMonthTrxSA.kabupaten,
                    trx: sql<number>`COUNT(${prevYearCurrMonthTrxSA.msisdn})`.as('trx')
                })
                .from(prevYearCurrMonthTrxSA)
                .where(and(
                    not(eq(prevYearCurrMonthTrxSA.kabupaten, 'TMP')),
                    eq(prevYearCurrMonthTrxSA.brand, 'byu'),
                    and(
                        inArray(prevYearCurrMonthTrxSA.regional, ['MALUKU DAN PAPUA', 'PUMA']),
                        between(prevYearCurrMonthTrxSA.trxDate, firstDayOfPrevYearCurrMonth, prevYearCurrDate)
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
                    currMonthTargetRev: sql<number>`SUM(${trxSAByu[monthColumn]})`.as('currMonthTargetRev')
                })
                .from(regionals)
                .leftJoin(branches, eq(regionals.id, branches.regionalId))
                .leftJoin(subbranches, eq(branches.id, subbranches.branchId))
                .leftJoin(clusters, eq(subbranches.id, clusters.subbranchId))
                .leftJoin(kabupatens, eq(clusters.id, kabupatens.clusterId))
                .leftJoin(trxSAByu, eq(kabupatens.id, trxSAByu.kabupatenId))
                .groupBy(
                    regionals.regional,
                    branches.branchNew,
                    subbranches.subbranchNew,
                    clusters.cluster,
                    kabupatens.kabupaten
                )
                .orderBy(asc(regionals.regional))
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

            const queryCurrYtd = currYtdTrxSARev.map(table => `
                SELECT
                    CASE WHEN regional IN ('PUMA', 'MALUKU DAN PAPUA') THEN 'PUMA' END as region,
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
                    trx_date,
                    COUNT(msisdn) as trx
                FROM ${table} WHERE regional IN ('MALUKU DAN PAPUA', 'PUMA') AND brand = 'byu' AND kabupaten <> 'TMP' GROUP BY 1,2,3,4,5`).join(' UNION ALL ')

            const queryPrevYtd = prevYtdTrxSARev.map(table => `
                    SELECT
                        CASE WHEN regional IN ('PUMA', 'MALUKU DAN PAPUA') THEN 'PUMA' END as region,
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
                        trx_date,
                        COUNT(msisdn) as trx
                FROM ${table} WHERE regional IN ('PUMA', 'MALUKU DAN PAPUA') AND brand = 'byu' AND kabupaten <> 'TMP' GROUP BY 1,2,3,4,5`).join(' UNION ALL ')

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
                    WHERE trx_date BETWEEN '${currJanuaryFirst}' AND '${currDate}'
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
                    WHERE trx_date BETWEEN '${prevJanuaryFirst}' AND '${prevYearCurrDate}'
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