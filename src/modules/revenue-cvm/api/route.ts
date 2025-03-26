import { Hono } from "hono";
import { z } from 'zod'
import { and, asc, between, eq, gte, like, lte, not, sql } from "drizzle-orm";
import { subMonths, subDays, format, subYears, endOfMonth, startOfMonth } from 'date-fns'
import { MySqlRawQueryResult } from "drizzle-orm/mysql2";
import { index } from "drizzle-orm/mysql-core";

import { db, db2, db7 } from "@/db";
import {
    branches,
    regionals,
    clusters,
    kabupatens,
    subbranches,
    revenueCVM,
    revenueCVMOutlet,
} from "@/db/schema";
import { zValidator } from "@/lib/validator-wrapper";
import { dynamicRevenueCVMTable } from "@/db/schema2";
import { dynamicPackageActivationTable, dynamicOutletReferenceTable } from "@/db/schema7";

const app = new Hono()
    .get("/", zValidator('query', z.object({ date: z.string().optional() })),
        async (c) => {
            const { date } = c.req.valid('query')
            const selectedDate = date ? new Date(date) : subDays(new Date(), 3)
            const month = (selectedDate.getMonth() + 1).toString()

            // KOLOM DINAMIS UNTUK MEMILIH ANTARA KOLOM `m1-m12`
            const monthColumn = `m${month}` as keyof typeof revenueCVM.$inferSelect

            // VARIABLE TANGGAL UNTUK IMPORT TABEL SECARA DINAMIS
            const latestDataDate = subDays(selectedDate, 3);

            const currMonth = format(selectedDate, 'MM')
            const currYear = format(selectedDate, 'yyyy')
            const latestMonth = parseInt(format(selectedDate, 'M'), 10)
            const isPrevMonthLastYear = currMonth === '01'
            const prevMonth = isPrevMonthLastYear ? '12' : format(subMonths(selectedDate, 1), 'MM')
            const prevMonthYear = isPrevMonthLastYear ? format(subYears(selectedDate, 1), 'yyyy') : format(selectedDate, 'yyyy')
            const prevYear = format(subYears(selectedDate, 1), 'yyyy')

            // TABEL `bba_broadband_daily_`
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
                    rev: currRevCVM.revenue
                })
                .from(currRevCVM, {
                    useIndex: [
                        index('trx_date').on(currRevCVM.trxDate).using('btree'),
                        index('city').on(currRevCVM.city).using('btree')
                    ]
                })
                .where(and(
                    not(eq(currRevCVM.city, 'TMP')),
                    and(
                        like(currRevCVM.packageGroup, '%CVM%'),
                        and(
                            gte(currRevCVM.trxDate, firstDayOfCurrMonth),
                            lte(currRevCVM.trxDate, currDate)
                        )
                    )
                ))
                .as('sq2')

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
                    rev: prevMonthRevCVM.revenue
                })
                .from(prevMonthRevCVM, {
                    useIndex: [
                        index('trx_date').on(prevMonthRevCVM.trxDate).using('btree'),
                        index('city').on(prevMonthRevCVM.city).using('btree')
                    ]
                })
                .where(and(
                    not(eq(prevMonthRevCVM.city, 'TMP')),
                    and(
                        like(prevMonthRevCVM.packageGroup, '%CVM%'),
                        and(
                            gte(prevMonthRevCVM.trxDate, firstDayOfPrevMonth),
                            lte(prevMonthRevCVM.trxDate, prevDate)
                        )
                    )
                ))
                .as('sq3')

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
                    rev: prevYearCurrMonthRevCVM.revenue
                })
                .from(prevYearCurrMonthRevCVM, {
                    useIndex: [
                        index('trx_date').on(prevYearCurrMonthRevCVM.trxDate).using('btree'),
                        index('city').on(prevYearCurrMonthRevCVM.city).using('btree')
                    ]
                })
                .where(and(
                    not(eq(prevYearCurrMonthRevCVM.city, 'TMP')),
                    and(
                        like(prevYearCurrMonthRevCVM.packageGroup, '%CVM%'),
                        and(
                            gte(prevYearCurrMonthRevCVM.trxDate, firstDayOfPrevYearCurrMonth),
                            lte(prevYearCurrMonthRevCVM.trxDate, prevYearCurrDate)
                        )
                    )
                ))
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
                .orderBy(asc(regionals.regional), asc(branches.branchNew))
                .prepare()

            //  QUERY UNTUK MENDAPAT CURRENT MONTH REVENUE (Mtd)
            const p2 = db2
                .select({
                    region: sql<string>`${sq2.regionName}`.as('region'),
                    branch: sql<string>`${sq2.branchName}`.as('branch'), // Keep only one branchName
                    subbranch: sql<string>`${sq2.subbranchName}`.as('subbranch'),
                    cluster: sql<string>`${sq2.clusterName}`.as('cluster'),
                    kabupaten: sql<string>`${sq2.cityName}`.as('kabupaten'),
                    currMonthKabupatenRev: sql<number>`SUM(${sq2.rev})`.as('currMonthKabupatenRev'),
                    currMonthClusterRev: sql<number>`SUM(SUM(${sq2.rev})) OVER (PARTITION BY ${sq2.regionName}, ${sq2.branchName}, ${sq2.subbranchName}, ${sq2.clusterName})`.as('currMonthClusterRev'),
                    currMonthSubbranchRev: sql<number>`SUM(SUM(${sq2.rev})) OVER (PARTITION BY ${sq2.regionName}, ${sq2.branchName}, ${sq2.subbranchName})`.as('currMonthSubbranchRev'),
                    currMonthBranchRev: sql<number>`SUM(SUM(${sq2.rev})) OVER (PARTITION BY ${sq2.regionName}, ${sq2.branchName})`.as('currMonthBranchRev'),
                    currMonthRegionalRev: sql<number>`SUM(SUM(${sq2.rev})) OVER (PARTITION BY ${sq2.regionName})`.as('currMonthRegionalRev')
                })
                .from(sq2)
                .groupBy(sql`1,2,3,4,5`)
                .prepare()

            // QUERY UNTUK MENDAPAT PREV MONTH REVENUE
            const p3 = db2
                .select({
                    region: sql<string>`${sq3.regionName}`.as('region'),
                    branch: sql<string>`${sq3.branchName}`.as('branch'), // Keep only one branchName
                    subbranch: sql<string>`${sq3.subbranchName}`.as('subbranch'),
                    cluster: sql<string>`${sq3.clusterName}`.as('cluster'),
                    kabupaten: sql<string>`${sq3.cityName}`.as('kabupaten'),
                    prevMonthKabupatenRev: sql<number>`SUM(${sq3.rev})`.as('currMonthKabupatenRev'),
                    prevMonthClusterRev: sql<number>`SUM(SUM(${sq3.rev})) OVER (PARTITION BY ${sq3.regionName}, ${sq3.branchName}, ${sq3.subbranchName}, ${sq3.clusterName})`.as('currMonthClusterRev'),
                    prevMonthSubbranchRev: sql<number>`SUM(SUM(${sq3.rev})) OVER (PARTITION BY ${sq3.regionName}, ${sq3.branchName}, ${sq3.subbranchName})`.as('currMonthSubbranchRev'),
                    prevMonthBranchRev: sql<number>`SUM(SUM(${sq3.rev})) OVER (PARTITION BY ${sq3.regionName}, ${sq3.branchName})`.as('currMonthBranchRev'),
                    prevMonthRegionalRev: sql<number>`SUM(SUM(${sq3.rev})) OVER (PARTITION BY ${sq3.regionName})`.as('currMonthRegionalRev')
                })
                .from(sq3)
                .groupBy(sql`1,2,3,4,5`)
                .prepare()

            // QUERY UNTUK MENDAPAT PREV YEAR CURR MONTH REVENUE
            const p4 = db2
                .select({
                    region: sql<string>`${sq4.regionName}`.as('region'),
                    branch: sql<string>`${sq4.branchName}`.as('branch'), // Keep only one branchName
                    subbranch: sql<string>`${sq4.subbranchName}`.as('subbranch'),
                    cluster: sql<string>`${sq4.clusterName}`.as('cluster'),
                    kabupaten: sql<string>`${sq4.cityName}`.as('kabupaten'),
                    prevYearCurrMonthKabupatenRev: sql<number>`SUM(${sq4.rev})`.as('currMonthKabupatenRev'),
                    prevYearCurrMonthClusterRev: sql<number>`SUM(SUM(${sq4.rev})) OVER (PARTITION BY ${sq4.regionName}, ${sq4.branchName}, ${sq4.subbranchName}, ${sq4.clusterName})`.as('currMonthClusterRev'),
                    prevYearCurrMonthSubbranchRev: sql<number>`SUM(SUM(${sq4.rev})) OVER (PARTITION BY ${sq4.regionName}, ${sq4.branchName}, ${sq4.subbranchName})`.as('currMonthSubbranchRev'),
                    prevYearCurrMonthBranchRev: sql<number>`SUM(SUM(${sq4.rev})) OVER (PARTITION BY ${sq4.regionName}, ${sq4.branchName})`.as('currMonthBranchRev'),
                    prevYearCurrMonthRegionalRev: sql<number>`SUM(SUM(${sq4.rev})) OVER (PARTITION BY ${sq4.regionName})`.as('currMonthRegionalRev')
                })
                .from(sq4)
                .groupBy(sql`1,2,3,4,5`)
                .prepare()

            // QUERY UNTUK YtD 2025
            const queryCurrYtd = currYtdCVMRev.map(table => `
                SELECT
                    region,
                    CASE
                        WHEN upper(city) IN (
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
                        WHEN upper(city) IN (
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
                        WHEN upper(city) IN (
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
                        WHEN upper(city) IN (
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
                        WHEN upper(city) IN (
                            'AMBON',
                            'KOTA AMBON',
                            'MALUKU TENGAH',
                            'SERAM BAGIAN TIMUR'
                        ) THEN 'AMBON'
                        WHEN upper(city) IN (
                            'KEPULAUAN ARU',
                            'KOTA TUAL',
                            'MALUKU BARAT DAYA',
                            'MALUKU TENGGARA',
                            'MALUKU TENGGARA BARAT',
                            'KEPULAUAN TANIMBAR'
                        ) THEN 'KEPULAUAN AMBON'
                        WHEN upper(city) IN ('BURU', 'BURU SELATAN', 'SERAM BAGIAN BARAT') THEN 'SERAM BURU'
                        WHEN upper(city) IN ('KOTA JAYAPURA') THEN 'JAYAPURA'
                        WHEN upper(city) IN (
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
                        WHEN upper(city) IN ('MANOKWARI') THEN 'MANOKWARI'
                        WHEN upper(city) IN (
                            'FAKFAK',
                            'FAK FAK',
                            'KAIMANA',
                            'MANOKWARI SELATAN',
                            'PEGUNUNGAN ARFAK',
                            'TELUK BINTUNI',
                            'TELUK WONDAMA'
                        ) THEN 'MANOKWARI OUTER'
                        WHEN upper(city) IN (
                            'KOTA SORONG',
                            'MAYBRAT',
                            'RAJA AMPAT',
                            'SORONG',
                            'SORONG SELATAN',
                            'TAMBRAUW'
                        ) THEN 'SORONG RAJA AMPAT'
                        WHEN upper(city) IN ('ASMAT', 'BOVEN DIGOEL', 'MAPPI', 'MERAUKE') THEN 'MERAUKE'
                        WHEN upper(city) IN (
                            'INTAN JAYA',
                            'MIMIKA',
                            'PUNCAK',
                            'PUNCAK JAYA',
                            'TIMIKA'
                        ) THEN 'MIMIKA'
                        WHEN upper(city) IN ('DEIYAI', 'DOGIYAI', 'NABIRE', 'PANIAI') THEN 'NABIRE'
                        ELSE NULL
                    END as subbranch,
                    CASE
                        WHEN upper(city) IN (
                            'AMBON',
                            'KOTA AMBON',
                            'MALUKU TENGAH',
                            'SERAM BAGIAN TIMUR'
                        ) THEN 'AMBON'
                        WHEN upper(city) IN (
                            'KEPULAUAN ARU',
                            'KOTA TUAL',
                            'MALUKU BARAT DAYA',
                            'MALUKU TENGGARA',
                            'MALUKU TENGGARA BARAT',
                            'KEPULAUAN TANIMBAR'
                        ) THEN 'KEPULAUAN TUAL'
                        WHEN upper(city) IN ('BURU', 'BURU SELATAN', 'SERAM BAGIAN BARAT') THEN 'SERAM BARAT BURU'
                        WHEN upper(city) IN ('KOTA JAYAPURA') THEN 'KOTA JAYAPURA'
                        WHEN upper(city) IN ('JAYAPURA', 'KEEROM', 'MAMBERAMO RAYA', 'SARMI') THEN 'JAYAPURA OUTER'
                        WHEN upper(city) IN (
                            'BIAK',
                            'BIAK NUMFOR',
                            'KEPULAUAN YAPEN',
                            'SUPIORI',
                            'WAROPEN'
                        ) THEN 'NEW BIAK NUMFOR'
                        WHEN upper(city) IN (
                            'JAYAWIJAYA',
                            'LANNY JAYA',
                            'MAMBERAMO TENGAH',
                            'NDUGA',
                            'PEGUNUNGAN BINTANG',
                            'TOLIKARA',
                            'YAHUKIMO',
                            'YALIMO'
                        ) THEN 'PAPUA PEGUNUNGAN'
                        WHEN upper(city) IN ('MANOKWARI') THEN 'MANOKWARI'
                        WHEN upper(city) IN (
                            'FAKFAK',
                            'FAK FAK',
                            'KAIMANA',
                            'MANOKWARI SELATAN',
                            'PEGUNUNGAN ARFAK',
                            'TELUK BINTUNI',
                            'TELUK WONDAMA'
                        ) THEN 'MANOKWARI OUTER'
                        WHEN upper(city) IN (
                            'KOTA SORONG',
                            'MAYBRAT',
                            'RAJA AMPAT',
                            'SORONG',
                            'SORONG SELATAN',
                            'TAMBRAUW'
                        ) THEN 'NEW SORONG RAJA AMPAT'
                        WHEN upper(city) IN (
                            'INTAN JAYA',
                            'MIMIKA',
                            'PUNCAK',
                            'PUNCAK JAYA',
                            'TIMIKA'
                        ) THEN 'MIMIKA PUNCAK'
                        WHEN upper(city) IN ('DEIYAI', 'DOGIYAI', 'NABIRE', 'PANIAI') THEN 'NABIRE'
                        WHEN upper(city) IN ('ASMAT', 'BOVEN DIGOEL', 'MAPPI', 'MERAUKE') THEN 'NEW MERAUKE'
                        ELSE NULL
                    END as cluster,
                    city as kabupaten,
                    revenue as rev,
                    trx_date
                FROM ${table}
                WHERE package_group LIKE '%CVM%' AND city <> 'TMP'`).join(' UNION ALL ')

            const queryPrevYtd = prevYtdCVMRev.map(table => `
                SELECT
                    region,
                    CASE
                        WHEN upper(city) IN (
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
                        WHEN upper(city) IN (
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
                        WHEN upper(city) IN (
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
                        WHEN upper(city) IN (
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
                        WHEN upper(city) IN (
                            'AMBON',
                            'KOTA AMBON',
                            'MALUKU TENGAH',
                            'SERAM BAGIAN TIMUR'
                        ) THEN 'AMBON'
                        WHEN upper(city) IN (
                            'KEPULAUAN ARU',
                            'KOTA TUAL',
                            'MALUKU BARAT DAYA',
                            'MALUKU TENGGARA',
                            'MALUKU TENGGARA BARAT',
                            'KEPULAUAN TANIMBAR'
                        ) THEN 'KEPULAUAN AMBON'
                        WHEN upper(city) IN ('BURU', 'BURU SELATAN', 'SERAM BAGIAN BARAT') THEN 'SERAM BURU'
                        WHEN upper(city) IN ('KOTA JAYAPURA') THEN 'JAYAPURA'
                        WHEN upper(city) IN (
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
                        WHEN upper(city) IN ('MANOKWARI') THEN 'MANOKWARI'
                        WHEN upper(city) IN (
                            'FAKFAK',
                            'FAK FAK',
                            'KAIMANA',
                            'MANOKWARI SELATAN',
                            'PEGUNUNGAN ARFAK',
                            'TELUK BINTUNI',
                            'TELUK WONDAMA'
                        ) THEN 'MANOKWARI OUTER'
                        WHEN upper(city) IN (
                            'KOTA SORONG',
                            'MAYBRAT',
                            'RAJA AMPAT',
                            'SORONG',
                            'SORONG SELATAN',
                            'TAMBRAUW'
                        ) THEN 'SORONG RAJA AMPAT'
                        WHEN upper(city) IN ('ASMAT', 'BOVEN DIGOEL', 'MAPPI', 'MERAUKE') THEN 'MERAUKE'
                        WHEN upper(city) IN (
                            'INTAN JAYA',
                            'MIMIKA',
                            'PUNCAK',
                            'PUNCAK JAYA',
                            'TIMIKA'
                        ) THEN 'MIMIKA'
                        WHEN upper(city) IN ('DEIYAI', 'DOGIYAI', 'NABIRE', 'PANIAI') THEN 'NABIRE'
                        ELSE NULL
                    END as subbranch,
                    CASE
                        WHEN upper(city) IN (
                            'AMBON',
                            'KOTA AMBON',
                            'MALUKU TENGAH',
                            'SERAM BAGIAN TIMUR'
                        ) THEN 'AMBON'
                        WHEN upper(city) IN (
                            'KEPULAUAN ARU',
                            'KOTA TUAL',
                            'MALUKU BARAT DAYA',
                            'MALUKU TENGGARA',
                            'MALUKU TENGGARA BARAT',
                            'KEPULAUAN TANIMBAR'
                        ) THEN 'KEPULAUAN TUAL'
                        WHEN upper(city) IN ('BURU', 'BURU SELATAN', 'SERAM BAGIAN BARAT') THEN 'SERAM BARAT BURU'
                        WHEN upper(city) IN ('KOTA JAYAPURA') THEN 'KOTA JAYAPURA'
                        WHEN upper(city) IN ('JAYAPURA', 'KEEROM', 'MAMBERAMO RAYA', 'SARMI') THEN 'JAYAPURA OUTER'
                        WHEN upper(city) IN (
                            'BIAK',
                            'BIAK NUMFOR',
                            'KEPULAUAN YAPEN',
                            'SUPIORI',
                            'WAROPEN'
                        ) THEN 'NEW BIAK NUMFOR'
                        WHEN upper(city) IN (
                            'JAYAWIJAYA',
                            'LANNY JAYA',
                            'MAMBERAMO TENGAH',
                            'NDUGA',
                            'PEGUNUNGAN BINTANG',
                            'TOLIKARA',
                            'YAHUKIMO',
                            'YALIMO'
                        ) THEN 'PAPUA PEGUNUNGAN'
                        WHEN upper(city) IN ('MANOKWARI') THEN 'MANOKWARI'
                        WHEN upper(city) IN (
                            'FAKFAK',
                            'FAK FAK',
                            'KAIMANA',
                            'MANOKWARI SELATAN',
                            'PEGUNUNGAN ARFAK',
                            'TELUK BINTUNI',
                            'TELUK WONDAMA'
                        ) THEN 'MANOKWARI OUTER'
                        WHEN upper(city) IN (
                            'KOTA SORONG',
                            'MAYBRAT',
                            'RAJA AMPAT',
                            'SORONG',
                            'SORONG SELATAN',
                            'TAMBRAUW'
                        ) THEN 'NEW SORONG RAJA AMPAT'
                        WHEN upper(city) IN (
                            'INTAN JAYA',
                            'MIMIKA',
                            'PUNCAK',
                            'PUNCAK JAYA',
                            'TIMIKA'
                        ) THEN 'MIMIKA PUNCAK'
                        WHEN upper(city) IN ('DEIYAI', 'DOGIYAI', 'NABIRE', 'PANIAI') THEN 'NABIRE'
                        WHEN upper(city) IN ('ASMAT', 'BOVEN DIGOEL', 'MAPPI', 'MERAUKE') THEN 'NEW MERAUKE'
                        ELSE NULL
                    END as cluster,
                    city as kabupaten,
                    revenue as rev,
                    trx_date
                FROM ${table}
                WHERE package_group LIKE '%CVM%' AND city <> 'TMP'`).join(' UNION ALL ')

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
                    SUM(rev) AS currYtdKabupatenRev,
                    SUM(SUM(rev)) OVER (PARTITION BY region, branch, subbranch, cluster) AS currYtdClusterRev,
                    SUM(SUM(rev)) OVER (PARTITION BY region, branch, subbranch) AS currYtdSubbranchRev,
                    SUM(SUM(rev)) OVER (PARTITION BY region, branch) AS currYtdBranchRev,
                    SUM(SUM(rev)) OVER (PARTITION BY region) AS currYtdRegionalRev
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
                    SUM(rev) AS prevYtdKabupatenRev,
                    SUM(SUM(rev)) OVER (PARTITION BY region, branch, subbranch, cluster) AS prevYtdClusterRev,
                    SUM(SUM(rev)) OVER (PARTITION BY region, branch, subbranch) AS prevYtdSubbranchRev,
                    SUM(SUM(rev)) OVER (PARTITION BY region, branch) AS prevYtdBranchRev,
                    SUM(SUM(rev)) OVER (PARTITION BY region) AS prevYtdRegionalRev
                FROM sq5
                WHERE trx_date BETWEEN '${prevJanuaryFirst}' AND '${prevYearCurrDate}'
                GROUP BY 1, 2, 3, 4, 5
                    `

            const [targetRevenue, currMonthRevenue, prevMonthRevenue, prevYearCurrMonthRevenue, currYtdRev, prevYtdRev] = await Promise.all([
                p1.execute(),
                p2.execute(),
                p3.execute(),
                p4.execute(),
                db2.execute(sql.raw(sq)),
                db2.execute(sql.raw(sq5)),
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

            currYtdRevenue.forEach((row) => {
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

            prevYtdRevenue.forEach((row) => {
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

            const finalDataRevenue: Regional[] = Array.from(regionalsMap.values()).map((regional: Regional) => ({
                ...regional,
                branches: Array.from(regional.branches.values()).map((branch) => ({
                    ...branch,
                    subbranches: Array.from(branch.subbranches.values()).map((subbranch) => ({
                        ...subbranch,
                        clusters: Array.from(subbranch.clusters.values()).map((cluster) => ({
                            ...cluster,
                            kabupatens: Array.from(cluster.kabupatens.values())
                        })),
                    })),
                })),
            }));

            return c.json({ data: finalDataRevenue }, 200);
        })
    .get('/revenue-cvm-outlet', zValidator('query', z.object({ date: z.coerce.date().optional() })),
        async (c) => {
            const { date } = c.req.valid('query');
            const selectedDate = date ? new Date(date) : subDays(new Date(), 1)
            const month = (selectedDate.getMonth() + 1).toString()

            // KOLOM DINAMIS UNTUK MEMILIH ANTARA KOLOM `m1-m12`
            const monthColumn = `m${month}` as keyof typeof revenueCVMOutlet.$inferSelect

            // VARIABLE TANGGAL UNTUK IMPORT TABEL SECARA DINAMIS
            const latestDataDate = subDays(selectedDate, 3);

            const currMonth = format(selectedDate, 'MM')
            const currYear = format(selectedDate, 'yyyy')
            const latestMonth = parseInt(format(selectedDate, 'M'), 10)
            const isPrevMonthLastYear = currMonth === '01'
            const prevMonth = isPrevMonthLastYear ? '12' : format(subMonths(selectedDate, 1), 'MM')
            const prevMonthYear = isPrevMonthLastYear ? format(subYears(selectedDate, 1), 'yyyy') : format(selectedDate, 'yyyy')
            const prevYear = format(subYears(selectedDate, 1), 'yyyy')

            // TABEL `bba_broadband_daily_` DAN `report_package_activation_`
            const currMonthOutletRefRev = dynamicOutletReferenceTable(currYear, currMonth)
            const prevMonthOutletRefRev = dynamicOutletReferenceTable(prevMonthYear, prevMonth)
            const prevYearCurrMonthOutletRefRev = dynamicOutletReferenceTable(prevYear, currMonth)
            const currMonthPackageActivationRev = dynamicPackageActivationTable(currYear, currMonth)
            const prevMonthPackageActivationRev = dynamicPackageActivationTable(prevMonthYear, prevMonth)
            const prevYearSameMonthPackageActivationRev = dynamicPackageActivationTable(prevYear, currMonth)

            const currYtdCVMRev = [];
            for (let month = 1; month <= latestMonth; month++) {
                const monthStr = month.toString().padStart(2, '0')
                currYtdCVMRev.push({
                    activationTable: `report_package_activation_${currYear}${monthStr}`,
                    referenceTable: `report_outlet_reference_${currYear}${monthStr}`
                })
            }
            const prevYtdCVMRev = [];
            for (let month = 1; month <= latestMonth; month++) {
                const monthStr = month.toString().padStart(2, '0')
                prevYtdCVMRev.push({
                    activationTable: `report_package_activation_${prevYear}${monthStr}`,
                    referenceTable: `report_outlet_reference_${prevYear}${monthStr}`
                })
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

            const sq2 = db7
                .select({
                    regionName: sql<string>`CASE WHEN ${currMonthOutletRefRev.regional} IN ('MALUKU DAN PAPUA', 'PUMA') THEN 'PUMA' END`.as('regionName'),
                    branchName: sql<string>`
            CASE
             WHEN ${currMonthOutletRefRev.kabupaten} IN (
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
             WHEN ${currMonthOutletRefRev.kabupaten} IN (
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
             WHEN ${currMonthOutletRefRev.kabupaten} IN (
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
             WHEN ${currMonthOutletRefRev.kabupaten} IN (
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
             WHEN ${currMonthOutletRefRev.kabupaten} IN (
                 'AMBON',
                 'KOTA AMBON',
                 'MALUKU TENGAH',
                 'SERAM BAGIAN TIMUR'
             ) THEN 'AMBON'
             WHEN ${currMonthOutletRefRev.kabupaten} IN (
                 'KEPULAUAN ARU',
                 'KOTA TUAL',
                 'MALUKU BARAT DAYA',
                 'MALUKU TENGGARA',
                 'MALUKU TENGGARA BARAT',
                 'KEPULAUAN TANIMBAR'
             ) THEN 'KEPULAUAN AMBON'
             WHEN ${currMonthOutletRefRev.kabupaten} IN ('BURU', 'BURU SELATAN', 'SERAM BAGIAN BARAT') THEN 'SERAM BURU'
             WHEN ${currMonthOutletRefRev.kabupaten} IN ('KOTA JAYAPURA') THEN 'JAYAPURA'
             WHEN ${currMonthOutletRefRev.kabupaten} IN (
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
             WHEN ${currMonthOutletRefRev.kabupaten} IN ('MANOKWARI') THEN 'MANOKWARI'
             WHEN ${currMonthOutletRefRev.kabupaten} IN (
                 'FAKFAK',
                 'FAK FAK',
                 'KAIMANA',
                 'MANOKWARI SELATAN',
                 'PEGUNUNGAN ARFAK',
                 'TELUK BINTUNI',
                 'TELUK WONDAMA'
             ) THEN 'MANOKWARI OUTER'
             WHEN ${currMonthOutletRefRev.kabupaten} IN (
                 'KOTA SORONG',
                 'MAYBRAT',
                 'RAJA AMPAT',
                 'SORONG',
                 'SORONG SELATAN',
                 'TAMBRAUW'
             ) THEN 'SORONG RAJA AMPAT'
             WHEN ${currMonthOutletRefRev.kabupaten} IN ('ASMAT', 'BOVEN DIGOEL', 'MAPPI', 'MERAUKE') THEN 'MERAUKE'
             WHEN ${currMonthOutletRefRev.kabupaten} IN (
                 'INTAN JAYA',
                 'MIMIKA',
                 'PUNCAK',
                 'PUNCAK JAYA',
                 'TIMIKA'
             ) THEN 'MIMIKA'
             WHEN ${currMonthOutletRefRev.kabupaten} IN ('DEIYAI', 'DOGIYAI', 'NABIRE', 'PANIAI') THEN 'NABIRE'
             ELSE NULL
            END
                            `.as('subbranchName'),
                    clusterName: sql<string>`
            CASE
             WHEN ${currMonthOutletRefRev.kabupaten} IN (
                 'KOTA AMBON',
                 'MALUKU TENGAH',
                 'SERAM BAGIAN TIMUR'
             ) THEN 'AMBON'
             WHEN ${currMonthOutletRefRev.kabupaten} IN (
                 'KEPULAUAN ARU',
                 'KOTA TUAL',
                 'MALUKU BARAT DAYA',
                 'MALUKU TENGGARA',
                 'MALUKU TENGGARA BARAT',
                 'KEPULAUAN TANIMBAR'
             ) THEN 'KEPULAUAN TUAL'
             WHEN ${currMonthOutletRefRev.kabupaten} IN ('BURU', 'BURU SELATAN', 'SERAM BAGIAN BARAT') THEN 'SERAM BARAT BURU'
             WHEN ${currMonthOutletRefRev.kabupaten} IN ('KOTA JAYAPURA') THEN 'KOTA JAYAPURA'
             WHEN ${currMonthOutletRefRev.kabupaten} IN ('JAYAPURA', 'KEEROM', 'MAMBERAMO RAYA', 'SARMI') THEN 'JAYAPURA OUTER'
             WHEN ${currMonthOutletRefRev.kabupaten} IN (
                 'BIAK',
                 'BIAK NUMFOR',
                 'KEPULAUAN YAPEN',
                 'SUPIORI',
                 'WAROPEN'
             ) THEN 'NEW BIAK NUMFOR'
             WHEN ${currMonthOutletRefRev.kabupaten} IN (
                 'JAYAWIJAYA',
                 'LANNY JAYA',
                 'MAMBERAMO TENGAH',
                 'NDUGA',
                 'PEGUNUNGAN BINTANG',
                 'TOLIKARA',
                 'YAHUKIMO',
                 'YALIMO'
             ) THEN 'PAPUA PEGUNUNGAN'
             WHEN ${currMonthOutletRefRev.kabupaten} IN ('MANOKWARI') THEN 'MANOKWARI'
             WHEN ${currMonthOutletRefRev.kabupaten} IN (
                 'FAKFAK',
                 'FAK FAK',
                 'KAIMANA',
                 'MANOKWARI SELATAN',
                 'PEGUNUNGAN ARFAK',
                 'TELUK BINTUNI',
                 'TELUK WONDAMA'
             ) THEN 'MANOKWARI OUTER'
             WHEN ${currMonthOutletRefRev.kabupaten} IN (
                 'KOTA SORONG',
                 'MAYBRAT',
                 'RAJA AMPAT',
                 'SORONG',
                 'SORONG SELATAN',
                 'TAMBRAUW'
             ) THEN 'NEW SORONG RAJA AMPAT'
             WHEN ${currMonthOutletRefRev.kabupaten} IN (
                 'INTAN JAYA',
                 'MIMIKA',
                 'PUNCAK',
                 'PUNCAK JAYA',
                 'TIMIKA'
             ) THEN 'MIMIKA PUNCAK'
             WHEN ${currMonthOutletRefRev.kabupaten} IN ('DEIYAI', 'DOGIYAI', 'NABIRE', 'PANIAI') THEN 'NABIRE'
             WHEN ${currMonthOutletRefRev.kabupaten} IN ('ASMAT', 'BOVEN DIGOEL', 'MAPPI', 'MERAUKE') THEN 'NEW MERAUKE'
             ELSE NULL
            END
                            `.as('clusterName'),
                    cityName: currMonthOutletRefRev.kabupaten,
                    price: currMonthPackageActivationRev.price,
                    trx: sql<number>`COUNT(${currMonthPackageActivationRev.bSharp})`.as('trx')
                })
                .from(currMonthOutletRefRev)
                .innerJoin(currMonthPackageActivationRev, eq(currMonthOutletRefRev.outletId, currMonthPackageActivationRev.outletId))
                .where(and(
                    eq(currMonthOutletRefRev.regional, 'MALUKU DAN PAPUA'),
                    between(currMonthPackageActivationRev.trxDate, firstDayOfCurrMonth, currDate)
                ))
                .groupBy(sql`1,2,3,4,5`)
                .as('sq2')

            const sq3 = db7
                .select({
                    regionName: sql<string>`CASE WHEN ${prevMonthOutletRefRev.regional} IN ('MALUKU DAN PAPUA', 'PUMA') THEN 'PUMA' END`.as('regionName'),
                    branchName: sql<string>`
            CASE
             WHEN ${prevMonthOutletRefRev.kabupaten} IN (
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
             WHEN ${prevMonthOutletRefRev.kabupaten} IN (
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
             WHEN ${prevMonthOutletRefRev.kabupaten} IN (
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
             WHEN ${prevMonthOutletRefRev.kabupaten} IN (
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
             WHEN ${prevMonthOutletRefRev.kabupaten} IN (
                 'AMBON',
                 'KOTA AMBON',
                 'MALUKU TENGAH',
                 'SERAM BAGIAN TIMUR'
             ) THEN 'AMBON'
             WHEN ${prevMonthOutletRefRev.kabupaten} IN (
                 'KEPULAUAN ARU',
                 'KOTA TUAL',
                 'MALUKU BARAT DAYA',
                 'MALUKU TENGGARA',
                 'MALUKU TENGGARA BARAT',
                 'KEPULAUAN TANIMBAR'
             ) THEN 'KEPULAUAN AMBON'
             WHEN ${prevMonthOutletRefRev.kabupaten} IN ('BURU', 'BURU SELATAN', 'SERAM BAGIAN BARAT') THEN 'SERAM BURU'
             WHEN ${prevMonthOutletRefRev.kabupaten} IN ('KOTA JAYAPURA') THEN 'JAYAPURA'
             WHEN ${prevMonthOutletRefRev.kabupaten} IN (
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
             WHEN ${prevMonthOutletRefRev.kabupaten} IN ('MANOKWARI') THEN 'MANOKWARI'
             WHEN ${prevMonthOutletRefRev.kabupaten} IN (
                 'FAKFAK',
                 'FAK FAK',
                 'KAIMANA',
                 'MANOKWARI SELATAN',
                 'PEGUNUNGAN ARFAK',
                 'TELUK BINTUNI',
                 'TELUK WONDAMA'
             ) THEN 'MANOKWARI OUTER'
             WHEN ${prevMonthOutletRefRev.kabupaten} IN (
                 'KOTA SORONG',
                 'MAYBRAT',
                 'RAJA AMPAT',
                 'SORONG',
                 'SORONG SELATAN',
                 'TAMBRAUW'
             ) THEN 'SORONG RAJA AMPAT'
             WHEN ${prevMonthOutletRefRev.kabupaten} IN ('ASMAT', 'BOVEN DIGOEL', 'MAPPI', 'MERAUKE') THEN 'MERAUKE'
             WHEN ${prevMonthOutletRefRev.kabupaten} IN (
                 'INTAN JAYA',
                 'MIMIKA',
                 'PUNCAK',
                 'PUNCAK JAYA',
                 'TIMIKA'
             ) THEN 'MIMIKA'
             WHEN ${prevMonthOutletRefRev.kabupaten} IN ('DEIYAI', 'DOGIYAI', 'NABIRE', 'PANIAI') THEN 'NABIRE'
             ELSE NULL
            END
                            `.as('subbranchName'),
                    clusterName: sql<string>`
            CASE
             WHEN ${prevMonthOutletRefRev.kabupaten} IN (
                 'KOTA AMBON',
                 'MALUKU TENGAH',
                 'SERAM BAGIAN TIMUR'
             ) THEN 'AMBON'
             WHEN ${prevMonthOutletRefRev.kabupaten} IN (
                 'KEPULAUAN ARU',
                 'KOTA TUAL',
                 'MALUKU BARAT DAYA',
                 'MALUKU TENGGARA',
                 'MALUKU TENGGARA BARAT',
                 'KEPULAUAN TANIMBAR'
             ) THEN 'KEPULAUAN TUAL'
             WHEN ${prevMonthOutletRefRev.kabupaten} IN ('BURU', 'BURU SELATAN', 'SERAM BAGIAN BARAT') THEN 'SERAM BARAT BURU'
             WHEN ${prevMonthOutletRefRev.kabupaten} IN ('KOTA JAYAPURA') THEN 'KOTA JAYAPURA'
             WHEN ${prevMonthOutletRefRev.kabupaten} IN ('JAYAPURA', 'KEEROM', 'MAMBERAMO RAYA', 'SARMI') THEN 'JAYAPURA OUTER'
             WHEN ${prevMonthOutletRefRev.kabupaten} IN (
                 'BIAK',
                 'BIAK NUMFOR',
                 'KEPULAUAN YAPEN',
                 'SUPIORI',
                 'WAROPEN'
             ) THEN 'NEW BIAK NUMFOR'
             WHEN ${prevMonthOutletRefRev.kabupaten} IN (
                 'JAYAWIJAYA',
                 'LANNY JAYA',
                 'MAMBERAMO TENGAH',
                 'NDUGA',
                 'PEGUNUNGAN BINTANG',
                 'TOLIKARA',
                 'YAHUKIMO',
                 'YALIMO'
             ) THEN 'PAPUA PEGUNUNGAN'
             WHEN ${prevMonthOutletRefRev.kabupaten} IN ('MANOKWARI') THEN 'MANOKWARI'
             WHEN ${prevMonthOutletRefRev.kabupaten} IN (
                 'FAKFAK',
                 'FAK FAK',
                 'KAIMANA',
                 'MANOKWARI SELATAN',
                 'PEGUNUNGAN ARFAK',
                 'TELUK BINTUNI',
                 'TELUK WONDAMA'
             ) THEN 'MANOKWARI OUTER'
             WHEN ${prevMonthOutletRefRev.kabupaten} IN (
                 'KOTA SORONG',
                 'MAYBRAT',
                 'RAJA AMPAT',
                 'SORONG',
                 'SORONG SELATAN',
                 'TAMBRAUW'
             ) THEN 'NEW SORONG RAJA AMPAT'
             WHEN ${prevMonthOutletRefRev.kabupaten} IN (
                 'INTAN JAYA',
                 'MIMIKA',
                 'PUNCAK',
                 'PUNCAK JAYA',
                 'TIMIKA'
             ) THEN 'MIMIKA PUNCAK'
             WHEN ${prevMonthOutletRefRev.kabupaten} IN ('DEIYAI', 'DOGIYAI', 'NABIRE', 'PANIAI') THEN 'NABIRE'
             WHEN ${prevMonthOutletRefRev.kabupaten} IN ('ASMAT', 'BOVEN DIGOEL', 'MAPPI', 'MERAUKE') THEN 'NEW MERAUKE'
             ELSE NULL
            END
                            `.as('clusterName'),
                    cityName: prevMonthOutletRefRev.kabupaten,
                    price: prevMonthPackageActivationRev.price,
                    trx: sql<number>`COUNT(${prevMonthPackageActivationRev.bSharp})`.as('trx')
                })
                .from(prevMonthOutletRefRev)
                .innerJoin(prevMonthPackageActivationRev, eq(prevMonthOutletRefRev.outletId, prevMonthPackageActivationRev.outletId))
                .where(and(
                    eq(prevMonthOutletRefRev.regional, 'MALUKU DAN PAPUA'),
                    between(prevMonthPackageActivationRev.trxDate, firstDayOfPrevMonth, prevDate)
                ))
                .groupBy(sql`1,2,3,4,5`)
                .as('sq3')

            const sq4 = db7
                .select({
                    regionName: sql<string>`CASE WHEN ${prevYearCurrMonthOutletRefRev.regional} IN ('MALUKU DAN PAPUA', 'PUMA') THEN 'PUMA' END`.as('regionName'),
                    branchName: sql<string>`
            CASE
             WHEN ${prevYearCurrMonthOutletRefRev.kabupaten} IN (
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
             WHEN ${prevYearCurrMonthOutletRefRev.kabupaten} IN (
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
             WHEN ${prevYearCurrMonthOutletRefRev.kabupaten} IN (
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
             WHEN ${prevYearCurrMonthOutletRefRev.kabupaten} IN (
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
             WHEN ${prevYearCurrMonthOutletRefRev.kabupaten} IN (
                 'AMBON',
                 'KOTA AMBON',
                 'MALUKU TENGAH',
                 'SERAM BAGIAN TIMUR'
             ) THEN 'AMBON'
             WHEN ${prevYearCurrMonthOutletRefRev.kabupaten} IN (
                 'KEPULAUAN ARU',
                 'KOTA TUAL',
                 'MALUKU BARAT DAYA',
                 'MALUKU TENGGARA',
                 'MALUKU TENGGARA BARAT',
                 'KEPULAUAN TANIMBAR'
             ) THEN 'KEPULAUAN AMBON'
             WHEN ${prevYearCurrMonthOutletRefRev.kabupaten} IN ('BURU', 'BURU SELATAN', 'SERAM BAGIAN BARAT') THEN 'SERAM BURU'
             WHEN ${prevYearCurrMonthOutletRefRev.kabupaten} IN ('KOTA JAYAPURA') THEN 'JAYAPURA'
             WHEN ${prevYearCurrMonthOutletRefRev.kabupaten} IN (
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
             WHEN ${prevYearCurrMonthOutletRefRev.kabupaten} IN ('MANOKWARI') THEN 'MANOKWARI'
             WHEN ${prevYearCurrMonthOutletRefRev.kabupaten} IN (
                 'FAKFAK',
                 'FAK FAK',
                 'KAIMANA',
                 'MANOKWARI SELATAN',
                 'PEGUNUNGAN ARFAK',
                 'TELUK BINTUNI',
                 'TELUK WONDAMA'
             ) THEN 'MANOKWARI OUTER'
             WHEN ${prevYearCurrMonthOutletRefRev.kabupaten} IN (
                 'KOTA SORONG',
                 'MAYBRAT',
                 'RAJA AMPAT',
                 'SORONG',
                 'SORONG SELATAN',
                 'TAMBRAUW'
             ) THEN 'SORONG RAJA AMPAT'
             WHEN ${prevYearCurrMonthOutletRefRev.kabupaten} IN ('ASMAT', 'BOVEN DIGOEL', 'MAPPI', 'MERAUKE') THEN 'MERAUKE'
             WHEN ${prevYearCurrMonthOutletRefRev.kabupaten} IN (
                 'INTAN JAYA',
                 'MIMIKA',
                 'PUNCAK',
                 'PUNCAK JAYA',
                 'TIMIKA'
             ) THEN 'MIMIKA'
             WHEN ${prevYearCurrMonthOutletRefRev.kabupaten} IN ('DEIYAI', 'DOGIYAI', 'NABIRE', 'PANIAI') THEN 'NABIRE'
             ELSE NULL
            END
                            `.as('subbranchName'),
                    clusterName: sql<string>`
            CASE
             WHEN ${prevYearCurrMonthOutletRefRev.kabupaten} IN (
                 'KOTA AMBON',
                 'MALUKU TENGAH',
                 'SERAM BAGIAN TIMUR'
             ) THEN 'AMBON'
             WHEN ${prevYearCurrMonthOutletRefRev.kabupaten} IN (
                 'KEPULAUAN ARU',
                 'KOTA TUAL',
                 'MALUKU BARAT DAYA',
                 'MALUKU TENGGARA',
                 'MALUKU TENGGARA BARAT',
                 'KEPULAUAN TANIMBAR'
             ) THEN 'KEPULAUAN TUAL'
             WHEN ${prevYearCurrMonthOutletRefRev.kabupaten} IN ('BURU', 'BURU SELATAN', 'SERAM BAGIAN BARAT') THEN 'SERAM BARAT BURU'
             WHEN ${prevYearCurrMonthOutletRefRev.kabupaten} IN ('KOTA JAYAPURA') THEN 'KOTA JAYAPURA'
             WHEN ${prevYearCurrMonthOutletRefRev.kabupaten} IN ('JAYAPURA', 'KEEROM', 'MAMBERAMO RAYA', 'SARMI') THEN 'JAYAPURA OUTER'
             WHEN ${prevYearCurrMonthOutletRefRev.kabupaten} IN (
                 'BIAK',
                 'BIAK NUMFOR',
                 'KEPULAUAN YAPEN',
                 'SUPIORI',
                 'WAROPEN'
             ) THEN 'NEW BIAK NUMFOR'
             WHEN ${prevYearCurrMonthOutletRefRev.kabupaten} IN (
                 'JAYAWIJAYA',
                 'LANNY JAYA',
                 'MAMBERAMO TENGAH',
                 'NDUGA',
                 'PEGUNUNGAN BINTANG',
                 'TOLIKARA',
                 'YAHUKIMO',
                 'YALIMO'
             ) THEN 'PAPUA PEGUNUNGAN'
             WHEN ${prevYearCurrMonthOutletRefRev.kabupaten} IN ('MANOKWARI') THEN 'MANOKWARI'
             WHEN ${prevYearCurrMonthOutletRefRev.kabupaten} IN (
                 'FAKFAK',
                 'FAK FAK',
                 'KAIMANA',
                 'MANOKWARI SELATAN',
                 'PEGUNUNGAN ARFAK',
                 'TELUK BINTUNI',
                 'TELUK WONDAMA'
             ) THEN 'MANOKWARI OUTER'
             WHEN ${prevYearCurrMonthOutletRefRev.kabupaten} IN (
                 'KOTA SORONG',
                 'MAYBRAT',
                 'RAJA AMPAT',
                 'SORONG',
                 'SORONG SELATAN',
                 'TAMBRAUW'
             ) THEN 'NEW SORONG RAJA AMPAT'
             WHEN ${prevYearCurrMonthOutletRefRev.kabupaten} IN (
                 'INTAN JAYA',
                 'MIMIKA',
                 'PUNCAK',
                 'PUNCAK JAYA',
                 'TIMIKA'
             ) THEN 'MIMIKA PUNCAK'
             WHEN ${prevYearCurrMonthOutletRefRev.kabupaten} IN ('DEIYAI', 'DOGIYAI', 'NABIRE', 'PANIAI') THEN 'NABIRE'
             WHEN ${prevYearCurrMonthOutletRefRev.kabupaten} IN ('ASMAT', 'BOVEN DIGOEL', 'MAPPI', 'MERAUKE') THEN 'NEW MERAUKE'
             ELSE NULL
            END
                            `.as('clusterName'),
                    cityName: prevYearCurrMonthOutletRefRev.kabupaten,
                    price: prevYearSameMonthPackageActivationRev.price,
                    trx: sql<number>`COUNT(${prevYearSameMonthPackageActivationRev.bSharp})`.as('trx')
                })
                .from(prevYearCurrMonthOutletRefRev)
                .innerJoin(prevYearSameMonthPackageActivationRev, eq(prevYearCurrMonthOutletRefRev.outletId, prevYearSameMonthPackageActivationRev.outletId))
                .where(and(
                    eq(prevYearCurrMonthOutletRefRev.regional, 'MALUKU DAN PAPUA'),
                    between(prevYearSameMonthPackageActivationRev.trxDate, firstDayOfPrevYearCurrMonth, prevYearCurrDate)
                ))
                .groupBy(sql`1,2,3,4,5`)
                .as('sq4')

            const p1 = db
                .select({
                    id: regionals.id,
                    region: regionals.regional,
                    branch: branches.branchNew,
                    subbranch: subbranches.subbranchNew,
                    cluster: clusters.cluster,
                    kabupaten: kabupatens.kabupaten,
                    currMonthTargetRev: sql<number>`CAST(SUM(${revenueCVMOutlet[monthColumn]}) AS DOUBLE PRECISION)`.as('currMonthTargetRev')
                })
                .from(regionals)
                .leftJoin(branches, eq(regionals.id, branches.regionalId))
                .leftJoin(subbranches, eq(branches.id, subbranches.branchId))
                .leftJoin(clusters, eq(subbranches.id, clusters.subbranchId))
                .leftJoin(kabupatens, eq(clusters.id, kabupatens.clusterId))
                .leftJoin(revenueCVMOutlet, eq(kabupatens.id, revenueCVMOutlet.kabupatenId))
                .groupBy(
                    regionals.regional,
                    branches.branchNew,
                    subbranches.subbranchNew,
                    clusters.cluster,
                    kabupatens.kabupaten
                )
                .orderBy(asc(branches.branchNew))
                .prepare()

            //  QUERY UNTUK MENDAPAT CURRENT MONTH REVENUE (Mtd)
            const p2 = db7
                .select({
                    region: sql<string>`${sq2.regionName}`.as('region'),
                    branch: sql<string>`${sq2.branchName}`.as('branch'), // Keep only one branchName
                    subbranch: sql<string>`${sq2.subbranchName}`.as('subbranch'),
                    cluster: sql<string>`${sq2.clusterName}`.as('cluster'),
                    kabupaten: sql<string>`${sq2.cityName}`.as('kabupaten'),
                    currMonthKabupatenRev: sql<number>`SUM(${sq2.price} * ${sq2.trx})`.as('currMonthKabupatenRev'),
                    currMonthClusterRev: sql<number>`SUM(SUM(${sq2.price} * ${sq2.trx})) OVER (PARTITION BY ${sq2.regionName}, ${sq2.branchName}, ${sq2.subbranchName}, ${sq2.clusterName})`.as('currMonthClusterRev'),
                    currMonthSubbranchRev: sql<number>`SUM(SUM(${sq2.price} * ${sq2.trx})) OVER (PARTITION BY ${sq2.regionName}, ${sq2.branchName}, ${sq2.subbranchName})`.as('currMonthSubbranchRev'),
                    currMonthBranchRev: sql<number>`SUM(SUM(${sq2.price} * ${sq2.trx})) OVER (PARTITION BY ${sq2.regionName}, ${sq2.branchName})`.as('currMonthBranchRev'),
                    currMonthRegionalRev: sql<number>`SUM(SUM(${sq2.price} * ${sq2.trx})) OVER (PARTITION BY ${sq2.regionName})`.as('currMonthRegionalRev')
                })
                .from(sq2)
                .groupBy(sql`1,2,3,4,5`)
                .prepare()

            // QUERY UNTUK MENDAPAT PREV MONTH REVENUE
            const p3 = db7
                .select({
                    region: sql<string>`${sq3.regionName}`.as('region'),
                    branch: sql<string>`${sq3.branchName}`.as('branch'), // Keep only one branchName
                    subbranch: sql<string>`${sq3.subbranchName}`.as('subbranch'),
                    cluster: sql<string>`${sq3.clusterName}`.as('cluster'),
                    kabupaten: sql<string>`${sq3.cityName}`.as('kabupaten'),
                    prevMonthKabupatenRev: sql<number>`SUM(${sq3.price} * ${sq3.trx})`.as('prevMonthKabupatenRev'),
                    prevMonthClusterRev: sql<number>`SUM(SUM(${sq3.price} * ${sq3.trx})) OVER (PARTITION BY ${sq3.regionName}, ${sq3.branchName}, ${sq3.subbranchName}, ${sq3.clusterName})`.as('prevMonthClusterRev'),
                    prevMonthSubbranchRev: sql<number>`SUM(SUM(${sq3.price} * ${sq3.trx})) OVER (PARTITION BY ${sq3.regionName}, ${sq3.branchName}, ${sq3.subbranchName})`.as('prevMonthSubbranchRev'),
                    prevMonthBranchRev: sql<number>`SUM(SUM(${sq3.price} * ${sq3.trx})) OVER (PARTITION BY ${sq3.regionName}, ${sq3.branchName})`.as('prevMonthBranchRev'),
                    prevMonthRegionalRev: sql<number>`SUM(SUM(${sq3.price} * ${sq3.trx})) OVER (PARTITION BY ${sq3.regionName})`.as('prevMonthRegionalRev')
                })
                .from(sq3)
                .groupBy(sql`1,2,3,4,5`)
                .prepare()

            // QUERY UNTUK MENDAPAT PREV YEAR CURR MONTH REVENUE
            const p4 = db7
                .select({
                    region: sql<string>`${sq4.regionName}`.as('region'),
                    branch: sql<string>`${sq4.branchName}`.as('branch'), // Keep only one branchName
                    subbranch: sql<string>`${sq4.subbranchName}`.as('subbranch'),
                    cluster: sql<string>`${sq4.clusterName}`.as('cluster'),
                    kabupaten: sql<string>`${sq4.cityName}`.as('kabupaten'),
                    prevYearCurrMonthKabupatenRev: sql<number>`SUM(${sq4.price} * ${sq4.trx})`.as('prevYearCurrMonthKabupatenRev'),
                    prevYearCurrMonthClusterRev: sql<number>`SUM(SUM(${sq4.price} * ${sq4.trx})) OVER (PARTITION BY ${sq4.regionName}, ${sq4.branchName}, ${sq4.subbranchName}, ${sq4.clusterName})`.as('prevYearCurrMonthClusterRev'),
                    prevYearCurrMonthSubbranchRev: sql<number>`SUM(SUM(${sq4.price} * ${sq4.trx})) OVER (PARTITION BY ${sq4.regionName}, ${sq4.branchName}, ${sq4.subbranchName})`.as('prevYearCurrMonthSubbranchRev'),
                    prevYearCurrMonthBranchRev: sql<number>`SUM(SUM(${sq4.price} * ${sq4.trx})) OVER (PARTITION BY ${sq4.regionName}, ${sq4.branchName})`.as('prevYearCurrMonthBranchRev'),
                    prevYearCurrMonthRegionalRev: sql<number>`SUM(SUM(${sq4.price} * ${sq4.trx})) OVER (PARTITION BY ${sq4.regionName})`.as('prevYearCurrMonthRegionalRev')
                })
                .from(sq4)
                .groupBy(sql`1,2,3,4,5`)
                .prepare()

            // QUERY UNTUK YtD 2025
            const queryCurrYtd = currYtdCVMRev.map(table => `
                            SELECT
                                CASE WHEN b.REGIONAL IN ('MALUKU DAN PAPUA', 'PUMA') THEN 'PUMA' END as region,
                                CASE
                                    WHEN upper(b.KABUPATEN) IN (
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
                                    WHEN upper(b.KABUPATEN) IN (
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
                                    WHEN upper(b.KABUPATEN) IN (
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
                                    WHEN upper(b.KABUPATEN) IN (
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
                                    WHEN upper(b.KABUPATEN) IN (
                                        'AMBON',
                                        'KOTA AMBON',
                                        'MALUKU TENGAH',
                                        'SERAM BAGIAN TIMUR'
                                    ) THEN 'AMBON'
                                    WHEN upper(b.KABUPATEN) IN (
                                        'KEPULAUAN ARU',
                                        'KOTA TUAL',
                                        'MALUKU BARAT DAYA',
                                        'MALUKU TENGGARA',
                                        'MALUKU TENGGARA BARAT',
                                        'KEPULAUAN TANIMBAR'
                                    ) THEN 'KEPULAUAN AMBON'
                                    WHEN upper(b.KABUPATEN) IN ('BURU', 'BURU SELATAN', 'SERAM BAGIAN BARAT') THEN 'SERAM BURU'
                                    WHEN upper(b.KABUPATEN) IN ('KOTA JAYAPURA') THEN 'JAYAPURA'
                                    WHEN upper(b.KABUPATEN) IN (
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
                                    WHEN upper(b.KABUPATEN) IN ('MANOKWARI') THEN 'MANOKWARI'
                                    WHEN upper(b.KABUPATEN) IN (
                                        'FAKFAK',
                                        'FAK FAK',
                                        'KAIMANA',
                                        'MANOKWARI SELATAN',
                                        'PEGUNUNGAN ARFAK',
                                        'TELUK BINTUNI',
                                        'TELUK WONDAMA'
                                    ) THEN 'MANOKWARI OUTER'
                                    WHEN upper(b.KABUPATEN) IN (
                                        'KOTA SORONG',
                                        'MAYBRAT',
                                        'RAJA AMPAT',
                                        'SORONG',
                                        'SORONG SELATAN',
                                        'TAMBRAUW'
                                    ) THEN 'SORONG RAJA AMPAT'
                                    WHEN upper(b.KABUPATEN) IN ('ASMAT', 'BOVEN DIGOEL', 'MAPPI', 'MERAUKE') THEN 'MERAUKE'
                                    WHEN upper(b.KABUPATEN) IN (
                                        'INTAN JAYA',
                                        'MIMIKA',
                                        'PUNCAK',
                                        'PUNCAK JAYA',
                                        'TIMIKA'
                                    ) THEN 'MIMIKA'
                                    WHEN upper(b.KABUPATEN) IN ('DEIYAI', 'DOGIYAI', 'NABIRE', 'PANIAI') THEN 'NABIRE'
                                    ELSE NULL
                                END as subbranch,
                                CASE
                                    WHEN upper(b.KABUPATEN) IN (
                                        'AMBON',
                                        'KOTA AMBON',
                                        'MALUKU TENGAH',
                                        'SERAM BAGIAN TIMUR'
                                    ) THEN 'AMBON'
                                    WHEN upper(b.KABUPATEN) IN (
                                        'KEPULAUAN ARU',
                                        'KOTA TUAL',
                                        'MALUKU BARAT DAYA',
                                        'MALUKU TENGGARA',
                                        'MALUKU TENGGARA BARAT',
                                        'KEPULAUAN TANIMBAR'
                                    ) THEN 'KEPULAUAN TUAL'
                                    WHEN upper(b.KABUPATEN) IN ('BURU', 'BURU SELATAN', 'SERAM BAGIAN BARAT') THEN 'SERAM BARAT BURU'
                                    WHEN upper(b.KABUPATEN) IN ('KOTA JAYAPURA') THEN 'KOTA JAYAPURA'
                                    WHEN upper(b.KABUPATEN) IN ('JAYAPURA', 'KEEROM', 'MAMBERAMO RAYA', 'SARMI') THEN 'JAYAPURA OUTER'
                                    WHEN upper(b.KABUPATEN) IN (
                                        'BIAK',
                                        'BIAK NUMFOR',
                                        'KEPULAUAN YAPEN',
                                        'SUPIORI',
                                        'WAROPEN'
                                    ) THEN 'NEW BIAK NUMFOR'
                                    WHEN upper(b.KABUPATEN) IN (
                                        'JAYAWIJAYA',
                                        'LANNY JAYA',
                                        'MAMBERAMO TENGAH',
                                        'NDUGA',
                                        'PEGUNUNGAN BINTANG',
                                        'TOLIKARA',
                                        'YAHUKIMO',
                                        'YALIMO'
                                    ) THEN 'PAPUA PEGUNUNGAN'
                                    WHEN upper(b.KABUPATEN) IN ('MANOKWARI') THEN 'MANOKWARI'
                                    WHEN upper(b.KABUPATEN) IN (
                                        'FAKFAK',
                                        'FAK FAK',
                                        'KAIMANA',
                                        'MANOKWARI SELATAN',
                                        'PEGUNUNGAN ARFAK',
                                        'TELUK BINTUNI',
                                        'TELUK WONDAMA'
                                    ) THEN 'MANOKWARI OUTER'
                                    WHEN upper(b.KABUPATEN) IN (
                                        'KOTA SORONG',
                                        'MAYBRAT',
                                        'RAJA AMPAT',
                                        'SORONG',
                                        'SORONG SELATAN',
                                        'TAMBRAUW'
                                    ) THEN 'NEW SORONG RAJA AMPAT'
                                    WHEN upper(b.KABUPATEN) IN (
                                        'INTAN JAYA',
                                        'MIMIKA',
                                        'PUNCAK',
                                        'PUNCAK JAYA',
                                        'TIMIKA'
                                    ) THEN 'MIMIKA PUNCAK'
                                    WHEN upper(b.KABUPATEN) IN ('DEIYAI', 'DOGIYAI', 'NABIRE', 'PANIAI') THEN 'NABIRE'
                                    WHEN upper(b.KABUPATEN) IN ('ASMAT', 'BOVEN DIGOEL', 'MAPPI', 'MERAUKE') THEN 'NEW MERAUKE'
                                    ELSE NULL
                                END as cluster,
                                b.KABUPATEN as kabupaten,
                                a.PRICE as price,
                                a.TRX_DATE,
                                COUNT(a.\`B#\`) as trx
                            FROM \`${table.activationTable}\` a INNER JOIN \`${table.referenceTable}\` b ON a.OUTLET_ID = b.\`ID OUTLET\` WHERE b.REGIONAL IN ('MALUKU DAN PAPUA', 'PUMA') GROUP BY 1,2,3,4,5`).join(' UNION ALL ')

            const queryPrevYtd = prevYtdCVMRev.map(table => `
                            SELECT
                                CASE WHEN b.REGIONAL IN ('MALUKU DAN PAPUA', 'PUMA') THEN 'PUMA' END as region,
                                CASE
                                    WHEN upper(b.KABUPATEN) IN (
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
                                    WHEN upper(b.KABUPATEN) IN (
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
                                    WHEN upper(b.KABUPATEN) IN (
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
                                    WHEN upper(b.KABUPATEN) IN (
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
                                    WHEN upper(b.KABUPATEN) IN (
                                        'AMBON',
                                        'KOTA AMBON',
                                        'MALUKU TENGAH',
                                        'SERAM BAGIAN TIMUR'
                                    ) THEN 'AMBON'
                                    WHEN upper(b.KABUPATEN) IN (
                                        'KEPULAUAN ARU',
                                        'KOTA TUAL',
                                        'MALUKU BARAT DAYA',
                                        'MALUKU TENGGARA',
                                        'MALUKU TENGGARA BARAT',
                                        'KEPULAUAN TANIMBAR'
                                    ) THEN 'KEPULAUAN AMBON'
                                    WHEN upper(b.KABUPATEN) IN ('BURU', 'BURU SELATAN', 'SERAM BAGIAN BARAT') THEN 'SERAM BURU'
                                    WHEN upper(b.KABUPATEN) IN ('KOTA JAYAPURA') THEN 'JAYAPURA'
                                    WHEN upper(b.KABUPATEN) IN (
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
                                    WHEN upper(b.KABUPATEN) IN ('MANOKWARI') THEN 'MANOKWARI'
                                    WHEN upper(b.KABUPATEN) IN (
                                        'FAKFAK',
                                        'FAK FAK',
                                        'KAIMANA',
                                        'MANOKWARI SELATAN',
                                        'PEGUNUNGAN ARFAK',
                                        'TELUK BINTUNI',
                                        'TELUK WONDAMA'
                                    ) THEN 'MANOKWARI OUTER'
                                    WHEN upper(b.KABUPATEN) IN (
                                        'KOTA SORONG',
                                        'MAYBRAT',
                                        'RAJA AMPAT',
                                        'SORONG',
                                        'SORONG SELATAN',
                                        'TAMBRAUW'
                                    ) THEN 'SORONG RAJA AMPAT'
                                    WHEN upper(b.KABUPATEN) IN ('ASMAT', 'BOVEN DIGOEL', 'MAPPI', 'MERAUKE') THEN 'MERAUKE'
                                    WHEN upper(b.KABUPATEN) IN (
                                        'INTAN JAYA',
                                        'MIMIKA',
                                        'PUNCAK',
                                        'PUNCAK JAYA',
                                        'TIMIKA'
                                    ) THEN 'MIMIKA'
                                    WHEN upper(b.KABUPATEN) IN ('DEIYAI', 'DOGIYAI', 'NABIRE', 'PANIAI') THEN 'NABIRE'
                                    ELSE NULL
                                END as subbranch,
                                CASE
                                    WHEN upper(b.KABUPATEN) IN (
                                        'AMBON',
                                        'KOTA AMBON',
                                        'MALUKU TENGAH',
                                        'SERAM BAGIAN TIMUR'
                                    ) THEN 'AMBON'
                                    WHEN upper(b.KABUPATEN) IN (
                                        'KEPULAUAN ARU',
                                        'KOTA TUAL',
                                        'MALUKU BARAT DAYA',
                                        'MALUKU TENGGARA',
                                        'MALUKU TENGGARA BARAT',
                                        'KEPULAUAN TANIMBAR'
                                    ) THEN 'KEPULAUAN TUAL'
                                    WHEN upper(b.KABUPATEN) IN ('BURU', 'BURU SELATAN', 'SERAM BAGIAN BARAT') THEN 'SERAM BARAT BURU'
                                    WHEN upper(b.KABUPATEN) IN ('KOTA JAYAPURA') THEN 'KOTA JAYAPURA'
                                    WHEN upper(b.KABUPATEN) IN ('JAYAPURA', 'KEEROM', 'MAMBERAMO RAYA', 'SARMI') THEN 'JAYAPURA OUTER'
                                    WHEN upper(b.KABUPATEN) IN (
                                        'BIAK',
                                        'BIAK NUMFOR',
                                        'KEPULAUAN YAPEN',
                                        'SUPIORI',
                                        'WAROPEN'
                                    ) THEN 'NEW BIAK NUMFOR'
                                    WHEN upper(b.KABUPATEN) IN (
                                        'JAYAWIJAYA',
                                        'LANNY JAYA',
                                        'MAMBERAMO TENGAH',
                                        'NDUGA',
                                        'PEGUNUNGAN BINTANG',
                                        'TOLIKARA',
                                        'YAHUKIMO',
                                        'YALIMO'
                                    ) THEN 'PAPUA PEGUNUNGAN'
                                    WHEN upper(b.KABUPATEN) IN ('MANOKWARI') THEN 'MANOKWARI'
                                    WHEN upper(b.KABUPATEN) IN (
                                        'FAKFAK',
                                        'FAK FAK',
                                        'KAIMANA',
                                        'MANOKWARI SELATAN',
                                        'PEGUNUNGAN ARFAK',
                                        'TELUK BINTUNI',
                                        'TELUK WONDAMA'
                                    ) THEN 'MANOKWARI OUTER'
                                    WHEN upper(b.KABUPATEN) IN (
                                        'KOTA SORONG',
                                        'MAYBRAT',
                                        'RAJA AMPAT',
                                        'SORONG',
                                        'SORONG SELATAN',
                                        'TAMBRAUW'
                                    ) THEN 'NEW SORONG RAJA AMPAT'
                                    WHEN upper(b.KABUPATEN) IN (
                                        'INTAN JAYA',
                                        'MIMIKA',
                                        'PUNCAK',
                                        'PUNCAK JAYA',
                                        'TIMIKA'
                                    ) THEN 'MIMIKA PUNCAK'
                                    WHEN upper(b.KABUPATEN) IN ('DEIYAI', 'DOGIYAI', 'NABIRE', 'PANIAI') THEN 'NABIRE'
                                    WHEN upper(b.KABUPATEN) IN ('ASMAT', 'BOVEN DIGOEL', 'MAPPI', 'MERAUKE') THEN 'NEW MERAUKE'
                                    ELSE NULL
                                END as cluster,
                                b.KABUPATEN as kabupaten,
                                a.PRICE as price,
                                a.TRX_DATE,
                                COUNT(a.\`B#\`) as trx
                            FROM \`${table.activationTable}\` a INNER JOIN \`${table.referenceTable}\` b ON a.OUTLET_ID = b.\`ID OUTLET\` WHERE b.REGIONAL IN ('MALUKU DAN PAPUA', 'PUMA') GROUP BY 1,2,3,4,5`).join(' UNION ALL ')

            const sq = `
                WITH thisYearYtd AS (
                    ${queryCurrYtd}
                )
                SELECT
                    region,
                    branch,
                    subbranch,
                    cluster,
                    kabupaten,
                    SUM(trx * price) AS currYtdKabupatenRev,
                    SUM(SUM(trx * price)) OVER (PARTITION BY region, branch, subbranch, cluster) AS currYtdClusterRev,
                    SUM(SUM(trx * price)) OVER (PARTITION BY region, branch, subbranch) AS currYtdSubbranchRev,
                    SUM(SUM(trx * price)) OVER (PARTITION BY region, branch) AS currYtdBranchRev,
                    SUM(SUM(trx * price)) OVER (PARTITION BY region) AS currYtdRegionalRev
                FROM thisYearYtd
                WHERE TRX_DATE BETWEEN '${currJanuaryFirst}' AND '${currDate}'
                GROUP BY 1,2,3,4,5
                    `

            const sq5 = `
                WITH prevYearYtd AS (
                    ${queryPrevYtd}
                )
                SELECT
                    region,
                    branch,
                    subbranch,
                    cluster,
                    kabupaten,
                    SUM(trx * price) AS prevYtdKabupatenRev,
                    SUM(SUM(trx * price)) OVER (PARTITION BY region, branch, subbranch, cluster) AS prevYtdClusterRev,
                    SUM(SUM(trx * price)) OVER (PARTITION BY region, branch, subbranch) AS prevYtdSubbranchRev,
                    SUM(SUM(trx * price)) OVER (PARTITION BY region, branch) AS prevYtdBranchRev,
                    SUM(SUM(trx * price)) OVER (PARTITION BY region) AS prevYtdRegionalRev
                FROM prevYearYtd
                WHERE TRX_DATE BETWEEN '${prevJanuaryFirst}' AND '${prevYearCurrDate}'
                GROUP BY 1, 2, 3, 4, 5
            `

            const [targetRevenue, currMonthRevenue, prevMonthRevenue, prevYearCurrMonthRevenue, currYtdRev, prevYtdRev] = await Promise.all([
                p1.execute(),
                p2.execute(),
                p3.execute(),
                p4.execute(),
                db7.execute(sql.raw(sq)),
                db7.execute(sql.raw(sq5)),
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

            currYtdRevenue.forEach((row) => {
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

            prevYtdRevenue.forEach((row) => {
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

            const finalDataRevenue: Regional[] = Array.from(regionalsMap.values()).map((regional: Regional) => ({
                ...regional,
                branches: Array.from(regional.branches.values()).map((branch) => ({
                    ...branch,
                    subbranches: Array.from(branch.subbranches.values()).map((subbranch) => ({
                        ...subbranch,
                        clusters: Array.from(subbranch.clusters.values().map((cluster) => ({
                            ...cluster,
                            kabupatens: Array.from(cluster.kabupatens.values())
                        }))),
                    })),
                })),
            }));

            return c.json({ data: finalDataRevenue }, 200);
        })

export default app;

