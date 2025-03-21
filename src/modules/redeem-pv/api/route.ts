import { Hono } from "hono";
import { z } from 'zod'
import { and, asc, between, eq, sql, not, like, notInArray, gte, lte } from "drizzle-orm";
import { subMonths, subDays, format, subYears, endOfMonth, startOfMonth } from 'date-fns'
import { MySqlRawQueryResult } from "drizzle-orm/mysql2";

import { db, db2 } from "@/db";
import {
    branches,
    regionals,
    clusters,
    kabupatens,
    subbranches,
    redeemPVPrabayar,
    redeemPVByu,
} from "@/db/schema";
import { dynamicRevenueCVMTable } from "@/db/schema2";
import { zValidator } from "@/lib/validator-wrapper";
import { index } from "drizzle-orm/mysql-core";

const app = new Hono()
    .get('/', zValidator('query', z.object({ date: z.coerce.date().optional() })),
        async c => {
            const { date } = c.req.valid('query')
            const selectedDate = date ? new Date(date) : subDays(new Date(), 2)
            const month = (selectedDate.getMonth() + 1).toString()

            // KOLOM DINAMIS UNTUK MEMILIH ANTARA KOLOM `m1-m12`
            const monthColumn = `m${month}` as keyof typeof redeemPVPrabayar.$inferSelect

            // VARIABLE TANGGAL UNTUK IMPORT TABEL SECARA DINAMIS
            const latestDataDate = subDays(selectedDate, 2); // - 2 days

            const currMonth = format(selectedDate, 'MM')
            const currYear = format(selectedDate, 'yyyy')
            const latestMonth = parseInt(format(selectedDate, 'M'), 10)
            const isPrevMonthLastYear = currMonth === '01'
            const prevMonth = isPrevMonthLastYear ? '12' : format(subMonths(selectedDate, 1), 'MM')
            const prevMonthYear = isPrevMonthLastYear ? format(subYears(selectedDate, 1), 'yyyy') : format(selectedDate, 'yyyy')
            const prevYear = format(subYears(selectedDate, 1), 'yyyy')

            const currMonthRedeemPVPrabayarRev = dynamicRevenueCVMTable(currYear, currMonth)
            const prevMonthRedeemPVPrabayarRev = dynamicRevenueCVMTable(prevMonthYear, prevMonth)
            const prevYearSameMonthRedeemPVPrabayarRev = dynamicRevenueCVMTable(prevYear, currMonth)
            const currYtdRedeemPVRev = [];
            for (let month = 1; month <= latestMonth; month++) {
                const monthStr = month.toString().padStart(2, '0')
                currYtdRedeemPVRev.push(`bba_broadband_daily_${currYear}${monthStr}`)
            }
            const prevYtdRedeemPVRev = [];
            for (let month = 1; month <= latestMonth; month++) {
                const monthStr = month.toString().padStart(2, '0')
                prevYtdRedeemPVRev.push(`bba_broadband_daily_${prevYear}${monthStr}`)
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
                    regionName: currMonthRedeemPVPrabayarRev.region,
                    branchName: sql<string>`
            CASE
             WHEN ${currMonthRedeemPVPrabayarRev.city} IN (
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
             WHEN ${currMonthRedeemPVPrabayarRev.city} IN (
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
             WHEN ${currMonthRedeemPVPrabayarRev.city} IN (
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
             WHEN ${currMonthRedeemPVPrabayarRev.city} IN (
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
             WHEN ${currMonthRedeemPVPrabayarRev.city} IN (
                 'AMBON',
                 'KOTA AMBON',
                 'MALUKU TENGAH',
                 'SERAM BAGIAN TIMUR'
             ) THEN 'AMBON'
             WHEN ${currMonthRedeemPVPrabayarRev.city} IN (
                 'KEPULAUAN ARU',
                 'KOTA TUAL',
                 'MALUKU BARAT DAYA',
                 'MALUKU TENGGARA',
                 'MALUKU TENGGARA BARAT',
                 'KEPULAUAN TANIMBAR'
             ) THEN 'KEPULAUAN AMBON'
             WHEN ${currMonthRedeemPVPrabayarRev.city} IN ('BURU', 'BURU SELATAN', 'SERAM BAGIAN BARAT') THEN 'SERAM BURU'
             WHEN ${currMonthRedeemPVPrabayarRev.city} IN ('KOTA JAYAPURA') THEN 'JAYAPURA'
             WHEN ${currMonthRedeemPVPrabayarRev.city} IN (
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
             WHEN ${currMonthRedeemPVPrabayarRev.city} IN ('MANOKWARI') THEN 'MANOKWARI'
             WHEN ${currMonthRedeemPVPrabayarRev.city} IN (
                 'FAKFAK',
                 'FAK FAK',
                 'KAIMANA',
                 'MANOKWARI SELATAN',
                 'PEGUNUNGAN ARFAK',
                 'TELUK BINTUNI',
                 'TELUK WONDAMA'
             ) THEN 'MANOKWARI OUTER'
             WHEN ${currMonthRedeemPVPrabayarRev.city} IN (
                 'KOTA SORONG',
                 'MAYBRAT',
                 'RAJA AMPAT',
                 'SORONG',
                 'SORONG SELATAN',
                 'TAMBRAUW'
             ) THEN 'SORONG RAJA AMPAT'
             WHEN ${currMonthRedeemPVPrabayarRev.city} IN ('ASMAT', 'BOVEN DIGOEL', 'MAPPI', 'MERAUKE') THEN 'MERAUKE'
             WHEN ${currMonthRedeemPVPrabayarRev.city} IN (
                 'INTAN JAYA',
                 'MIMIKA',
                 'PUNCAK',
                 'PUNCAK JAYA',
                 'TIMIKA'
             ) THEN 'MIMIKA'
             WHEN ${currMonthRedeemPVPrabayarRev.city} IN ('DEIYAI', 'DOGIYAI', 'NABIRE', 'PANIAI') THEN 'NABIRE'
             ELSE NULL
            END
                `.as('subbranchName'),
                    clusterName: sql<string>`
            CASE
             WHEN ${currMonthRedeemPVPrabayarRev.city} IN (
                 'KOTA AMBON',
                 'MALUKU TENGAH',
                 'SERAM BAGIAN TIMUR'
             ) THEN 'AMBON'
             WHEN ${currMonthRedeemPVPrabayarRev.city} IN (
                 'KEPULAUAN ARU',
                 'KOTA TUAL',
                 'MALUKU BARAT DAYA',
                 'MALUKU TENGGARA',
                 'MALUKU TENGGARA BARAT',
                 'KEPULAUAN TANIMBAR'
             ) THEN 'KEPULAUAN TUAL'
             WHEN ${currMonthRedeemPVPrabayarRev.city} IN ('BURU', 'BURU SELATAN', 'SERAM BAGIAN BARAT') THEN 'SERAM BARAT BURU'
             WHEN ${currMonthRedeemPVPrabayarRev.city} IN ('KOTA JAYAPURA') THEN 'KOTA JAYAPURA'
             WHEN ${currMonthRedeemPVPrabayarRev.city} IN ('JAYAPURA', 'KEEROM', 'MAMBERAMO RAYA', 'SARMI') THEN 'JAYAPURA OUTER'
             WHEN ${currMonthRedeemPVPrabayarRev.city} IN (
                 'BIAK',
                 'BIAK NUMFOR',
                 'KEPULAUAN YAPEN',
                 'SUPIORI',
                 'WAROPEN'
             ) THEN 'NEW BIAK NUMFOR'
             WHEN ${currMonthRedeemPVPrabayarRev.city} IN (
                 'JAYAWIJAYA',
                 'LANNY JAYA',
                 'MAMBERAMO TENGAH',
                 'NDUGA',
                 'PEGUNUNGAN BINTANG',
                 'TOLIKARA',
                 'YAHUKIMO',
                 'YALIMO'
             ) THEN 'PAPUA PEGUNUNGAN'
             WHEN ${currMonthRedeemPVPrabayarRev.city} IN ('MANOKWARI') THEN 'MANOKWARI'
             WHEN ${currMonthRedeemPVPrabayarRev.city} IN (
                 'FAKFAK',
                 'FAK FAK',
                 'KAIMANA',
                 'MANOKWARI SELATAN',
                 'PEGUNUNGAN ARFAK',
                 'TELUK BINTUNI',
                 'TELUK WONDAMA'
             ) THEN 'MANOKWARI OUTER'
             WHEN ${currMonthRedeemPVPrabayarRev.city} IN (
                 'KOTA SORONG',
                 'MAYBRAT',
                 'RAJA AMPAT',
                 'SORONG',
                 'SORONG SELATAN',
                 'TAMBRAUW'
             ) THEN 'NEW SORONG RAJA AMPAT'
             WHEN ${currMonthRedeemPVPrabayarRev.city} IN (
                 'INTAN JAYA',
                 'MIMIKA',
                 'PUNCAK',
                 'PUNCAK JAYA',
                 'TIMIKA'
             ) THEN 'MIMIKA PUNCAK'
             WHEN ${currMonthRedeemPVPrabayarRev.city} IN ('DEIYAI', 'DOGIYAI', 'NABIRE', 'PANIAI') THEN 'NABIRE'
             WHEN ${currMonthRedeemPVPrabayarRev.city} IN ('ASMAT', 'BOVEN DIGOEL', 'MAPPI', 'MERAUKE') THEN 'NEW MERAUKE'
             ELSE NULL
            END
                `.as('clusterName'),
                    kabupaten: currMonthRedeemPVPrabayarRev.city,
                    rev: currMonthRedeemPVPrabayarRev.revenue
                })
                .from(currMonthRedeemPVPrabayarRev, {
                    useIndex: [
                        index('trx_date').on(currMonthRedeemPVPrabayarRev.trxDate).using('btree'),
                        index('city').on(currMonthRedeemPVPrabayarRev.city).using('btree'),
                    ]
                })
                .where(and(
                    not(eq(currMonthRedeemPVPrabayarRev.city, 'TMP')),
                    and(
                        like(currMonthRedeemPVPrabayarRev.packageGroup, '04. PV'),
                        and(
                            gte(currMonthRedeemPVPrabayarRev.trxDate, firstDayOfCurrMonth),
                            lte(currMonthRedeemPVPrabayarRev.trxDate, currDate)
                        )
                    )))
                .as('sq2')

            const sq3 = db2
                .select({
                    regionName: prevMonthRedeemPVPrabayarRev.region,
                    branchName: sql<string>`
CASE
 WHEN ${prevMonthRedeemPVPrabayarRev.city} IN (
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
 WHEN ${prevMonthRedeemPVPrabayarRev.city} IN (
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
 WHEN ${prevMonthRedeemPVPrabayarRev.city} IN (
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
 WHEN ${prevMonthRedeemPVPrabayarRev.city} IN (
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
 WHEN ${prevMonthRedeemPVPrabayarRev.city} IN (
     'AMBON',
     'KOTA AMBON',
     'MALUKU TENGAH',
     'SERAM BAGIAN TIMUR'
 ) THEN 'AMBON'
 WHEN ${prevMonthRedeemPVPrabayarRev.city} IN (
     'KEPULAUAN ARU',
     'KOTA TUAL',
     'MALUKU BARAT DAYA',
     'MALUKU TENGGARA',
     'MALUKU TENGGARA BARAT',
     'KEPULAUAN TANIMBAR'
 ) THEN 'KEPULAUAN AMBON'
 WHEN ${prevMonthRedeemPVPrabayarRev.city} IN ('BURU', 'BURU SELATAN', 'SERAM BAGIAN BARAT') THEN 'SERAM BURU'
 WHEN ${prevMonthRedeemPVPrabayarRev.city} IN ('KOTA JAYAPURA') THEN 'JAYAPURA'
 WHEN ${prevMonthRedeemPVPrabayarRev.city} IN (
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
 WHEN ${prevMonthRedeemPVPrabayarRev.city} IN ('MANOKWARI') THEN 'MANOKWARI'
 WHEN ${prevMonthRedeemPVPrabayarRev.city} IN (
     'FAKFAK',
     'FAK FAK',
     'KAIMANA',
     'MANOKWARI SELATAN',
     'PEGUNUNGAN ARFAK',
     'TELUK BINTUNI',
     'TELUK WONDAMA'
 ) THEN 'MANOKWARI OUTER'
 WHEN ${prevMonthRedeemPVPrabayarRev.city} IN (
     'KOTA SORONG',
     'MAYBRAT',
     'RAJA AMPAT',
     'SORONG',
     'SORONG SELATAN',
     'TAMBRAUW'
 ) THEN 'SORONG RAJA AMPAT'
 WHEN ${prevMonthRedeemPVPrabayarRev.city} IN ('ASMAT', 'BOVEN DIGOEL', 'MAPPI', 'MERAUKE') THEN 'MERAUKE'
 WHEN ${prevMonthRedeemPVPrabayarRev.city} IN (
     'INTAN JAYA',
     'MIMIKA',
     'PUNCAK',
     'PUNCAK JAYA',
     'TIMIKA'
 ) THEN 'MIMIKA'
 WHEN ${prevMonthRedeemPVPrabayarRev.city} IN ('DEIYAI', 'DOGIYAI', 'NABIRE', 'PANIAI') THEN 'NABIRE'
 ELSE NULL
END
                `.as('subbranchName'),
                    clusterName: sql<string>`
CASE
 WHEN ${prevMonthRedeemPVPrabayarRev.city} IN (
     'KOTA AMBON',
     'MALUKU TENGAH',
     'SERAM BAGIAN TIMUR'
 ) THEN 'AMBON'
 WHEN ${prevMonthRedeemPVPrabayarRev.city} IN (
     'KEPULAUAN ARU',
     'KOTA TUAL',
     'MALUKU BARAT DAYA',
     'MALUKU TENGGARA',
     'MALUKU TENGGARA BARAT',
     'KEPULAUAN TANIMBAR'
 ) THEN 'KEPULAUAN TUAL'
 WHEN ${prevMonthRedeemPVPrabayarRev.city} IN ('BURU', 'BURU SELATAN', 'SERAM BAGIAN BARAT') THEN 'SERAM BARAT BURU'
 WHEN ${prevMonthRedeemPVPrabayarRev.city} IN ('KOTA JAYAPURA') THEN 'KOTA JAYAPURA'
 WHEN ${prevMonthRedeemPVPrabayarRev.city} IN ('JAYAPURA', 'KEEROM', 'MAMBERAMO RAYA', 'SARMI') THEN 'JAYAPURA OUTER'
 WHEN ${prevMonthRedeemPVPrabayarRev.city} IN (
     'BIAK',
     'BIAK NUMFOR',
     'KEPULAUAN YAPEN',
     'SUPIORI',
     'WAROPEN'
 ) THEN 'NEW BIAK NUMFOR'
 WHEN ${prevMonthRedeemPVPrabayarRev.city} IN (
     'JAYAWIJAYA',
     'LANNY JAYA',
     'MAMBERAMO TENGAH',
     'NDUGA',
     'PEGUNUNGAN BINTANG',
     'TOLIKARA',
     'YAHUKIMO',
     'YALIMO'
 ) THEN 'PAPUA PEGUNUNGAN'
 WHEN ${prevMonthRedeemPVPrabayarRev.city} IN ('MANOKWARI') THEN 'MANOKWARI'
 WHEN ${prevMonthRedeemPVPrabayarRev.city} IN (
     'FAKFAK',
     'FAK FAK',
     'KAIMANA',
     'MANOKWARI SELATAN',
     'PEGUNUNGAN ARFAK',
     'TELUK BINTUNI',
     'TELUK WONDAMA'
 ) THEN 'MANOKWARI OUTER'
 WHEN ${prevMonthRedeemPVPrabayarRev.city} IN (
     'KOTA SORONG',
     'MAYBRAT',
     'RAJA AMPAT',
     'SORONG',
     'SORONG SELATAN',
     'TAMBRAUW'
 ) THEN 'NEW SORONG RAJA AMPAT'
 WHEN ${prevMonthRedeemPVPrabayarRev.city} IN (
     'INTAN JAYA',
     'MIMIKA',
     'PUNCAK',
     'PUNCAK JAYA',
     'TIMIKA'
 ) THEN 'MIMIKA PUNCAK'
 WHEN ${prevMonthRedeemPVPrabayarRev.city} IN ('DEIYAI', 'DOGIYAI', 'NABIRE', 'PANIAI') THEN 'NABIRE'
 WHEN ${prevMonthRedeemPVPrabayarRev.city} IN ('ASMAT', 'BOVEN DIGOEL', 'MAPPI', 'MERAUKE') THEN 'NEW MERAUKE'
 ELSE NULL
END
                `.as('clusterName'),
                    cityName: prevMonthRedeemPVPrabayarRev.city,
                    rev: prevMonthRedeemPVPrabayarRev.revenue
                })
                .from(prevMonthRedeemPVPrabayarRev, {
                    useIndex: [
                        index('trx_date').on(prevMonthRedeemPVPrabayarRev.trxDate).using('btree'),
                        index('city').on(prevMonthRedeemPVPrabayarRev.city).using('btree'),
                    ]
                })
                .where(and(
                    not(eq(prevMonthRedeemPVPrabayarRev.city, 'TMP')),
                    and(
                        like(prevMonthRedeemPVPrabayarRev.packageGroup, '04. PV'),
                        and(
                            gte(prevMonthRedeemPVPrabayarRev.trxDate, firstDayOfPrevMonth),
                            lte(prevMonthRedeemPVPrabayarRev.trxDate, prevDate)
                        )
                    )
                ))
                .as('sq3')

            const sq4 = db2
                .select({
                    regionName: prevYearSameMonthRedeemPVPrabayarRev.region,
                    branchName: sql<string>`
CASE
 WHEN ${prevYearSameMonthRedeemPVPrabayarRev.city} IN (
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
 WHEN ${prevYearSameMonthRedeemPVPrabayarRev.city} IN (
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
 WHEN ${prevYearSameMonthRedeemPVPrabayarRev.city} IN (
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
 WHEN ${prevYearSameMonthRedeemPVPrabayarRev.city} IN (
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
 WHEN ${prevYearSameMonthRedeemPVPrabayarRev.city} IN (
     'AMBON',
     'KOTA AMBON',
     'MALUKU TENGAH',
     'SERAM BAGIAN TIMUR'
 ) THEN 'AMBON'
 WHEN ${prevYearSameMonthRedeemPVPrabayarRev.city} IN (
     'KEPULAUAN ARU',
     'KOTA TUAL',
     'MALUKU BARAT DAYA',
     'MALUKU TENGGARA',
     'MALUKU TENGGARA BARAT',
     'KEPULAUAN TANIMBAR'
 ) THEN 'KEPULAUAN AMBON'
 WHEN ${prevYearSameMonthRedeemPVPrabayarRev.city} IN ('BURU', 'BURU SELATAN', 'SERAM BAGIAN BARAT') THEN 'SERAM BURU'
 WHEN ${prevYearSameMonthRedeemPVPrabayarRev.city} IN ('KOTA JAYAPURA') THEN 'JAYAPURA'
 WHEN ${prevYearSameMonthRedeemPVPrabayarRev.city} IN (
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
 WHEN ${prevYearSameMonthRedeemPVPrabayarRev.city} IN ('MANOKWARI') THEN 'MANOKWARI'
 WHEN ${prevYearSameMonthRedeemPVPrabayarRev.city} IN (
     'FAKFAK',
     'FAK FAK',
     'KAIMANA',
     'MANOKWARI SELATAN',
     'PEGUNUNGAN ARFAK',
     'TELUK BINTUNI',
     'TELUK WONDAMA'
 ) THEN 'MANOKWARI OUTER'
 WHEN ${prevYearSameMonthRedeemPVPrabayarRev.city} IN (
     'KOTA SORONG',
     'MAYBRAT',
     'RAJA AMPAT',
     'SORONG',
     'SORONG SELATAN',
     'TAMBRAUW'
 ) THEN 'SORONG RAJA AMPAT'
 WHEN ${prevYearSameMonthRedeemPVPrabayarRev.city} IN ('ASMAT', 'BOVEN DIGOEL', 'MAPPI', 'MERAUKE') THEN 'MERAUKE'
 WHEN ${prevYearSameMonthRedeemPVPrabayarRev.city} IN (
     'INTAN JAYA',
     'MIMIKA',
     'PUNCAK',
     'PUNCAK JAYA',
     'TIMIKA'
 ) THEN 'MIMIKA'
 WHEN ${prevYearSameMonthRedeemPVPrabayarRev.city} IN ('DEIYAI', 'DOGIYAI', 'NABIRE', 'PANIAI') THEN 'NABIRE'
 ELSE NULL
END
                `.as('subbranchName'),
                    clusterName: sql<string>`
CASE
 WHEN ${prevYearSameMonthRedeemPVPrabayarRev.city} IN (
     'KOTA AMBON',
     'MALUKU TENGAH',
     'SERAM BAGIAN TIMUR'
 ) THEN 'AMBON'
 WHEN ${prevYearSameMonthRedeemPVPrabayarRev.city} IN (
     'KEPULAUAN ARU',
     'KOTA TUAL',
     'MALUKU BARAT DAYA',
     'MALUKU TENGGARA',
     'MALUKU TENGGARA BARAT',
     'KEPULAUAN TANIMBAR'
 ) THEN 'KEPULAUAN TUAL'
 WHEN ${prevYearSameMonthRedeemPVPrabayarRev.city} IN ('BURU', 'BURU SELATAN', 'SERAM BAGIAN BARAT') THEN 'SERAM BARAT BURU'
 WHEN ${prevYearSameMonthRedeemPVPrabayarRev.city} IN ('KOTA JAYAPURA') THEN 'KOTA JAYAPURA'
 WHEN ${prevYearSameMonthRedeemPVPrabayarRev.city} IN ('JAYAPURA', 'KEEROM', 'MAMBERAMO RAYA', 'SARMI') THEN 'JAYAPURA OUTER'
 WHEN ${prevYearSameMonthRedeemPVPrabayarRev.city} IN (
     'BIAK',
     'BIAK NUMFOR',
     'KEPULAUAN YAPEN',
     'SUPIORI',
     'WAROPEN'
 ) THEN 'NEW BIAK NUMFOR'
 WHEN ${prevYearSameMonthRedeemPVPrabayarRev.city} IN (
     'JAYAWIJAYA',
     'LANNY JAYA',
     'MAMBERAMO TENGAH',
     'NDUGA',
     'PEGUNUNGAN BINTANG',
     'TOLIKARA',
     'YAHUKIMO',
     'YALIMO'
 ) THEN 'PAPUA PEGUNUNGAN'
 WHEN ${prevYearSameMonthRedeemPVPrabayarRev.city} IN ('MANOKWARI') THEN 'MANOKWARI'
 WHEN ${prevYearSameMonthRedeemPVPrabayarRev.city} IN (
     'FAKFAK',
     'FAK FAK',
     'KAIMANA',
     'MANOKWARI SELATAN',
     'PEGUNUNGAN ARFAK',
     'TELUK BINTUNI',
     'TELUK WONDAMA'
 ) THEN 'MANOKWARI OUTER'
 WHEN ${prevYearSameMonthRedeemPVPrabayarRev.city} IN (
     'KOTA SORONG',
     'MAYBRAT',
     'RAJA AMPAT',
     'SORONG',
     'SORONG SELATAN',
     'TAMBRAUW'
 ) THEN 'NEW SORONG RAJA AMPAT'
 WHEN ${prevYearSameMonthRedeemPVPrabayarRev.city} IN (
     'INTAN JAYA',
     'MIMIKA',
     'PUNCAK',
     'PUNCAK JAYA',
     'TIMIKA'
 ) THEN 'MIMIKA PUNCAK'
 WHEN ${prevYearSameMonthRedeemPVPrabayarRev.city} IN ('DEIYAI', 'DOGIYAI', 'NABIRE', 'PANIAI') THEN 'NABIRE'
 WHEN ${prevYearSameMonthRedeemPVPrabayarRev.city} IN ('ASMAT', 'BOVEN DIGOEL', 'MAPPI', 'MERAUKE') THEN 'NEW MERAUKE'
 ELSE NULL
END
                `.as('clusterName'),
                    cityName: prevYearSameMonthRedeemPVPrabayarRev.city,
                    rev: prevYearSameMonthRedeemPVPrabayarRev.revenue
                })
                .from(prevYearSameMonthRedeemPVPrabayarRev, {
                    useIndex: [
                        index('trx_date').on(prevYearSameMonthRedeemPVPrabayarRev.trxDate).using('btree'),
                        index('city').on(prevYearSameMonthRedeemPVPrabayarRev.city).using('btree'),
                    ]
                })
                .where(and(
                    not(eq(prevYearSameMonthRedeemPVPrabayarRev.city, 'TMP')),
                    and(
                        like(prevYearSameMonthRedeemPVPrabayarRev.packageGroup, '04. PV'),
                        and(
                            gte(prevYearSameMonthRedeemPVPrabayarRev.trxDate, firstDayOfPrevYearCurrMonth),
                            lte(prevYearSameMonthRedeemPVPrabayarRev.trxDate, prevYearCurrDate)
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
                    currMonthTargetRev: sql<number>`CAST(SUM(${redeemPVPrabayar[monthColumn]}) AS DOUBLE PRECISION)`.as('currMonthTargetRev')
                })
                .from(regionals)
                .leftJoin(branches, eq(regionals.id, branches.regionalId))
                .leftJoin(subbranches, eq(branches.id, subbranches.branchId))
                .leftJoin(clusters, eq(subbranches.id, clusters.subbranchId))
                .leftJoin(kabupatens, eq(clusters.id, kabupatens.clusterId))
                .leftJoin(redeemPVPrabayar, eq(kabupatens.id, redeemPVPrabayar.kabupatenId))
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
                    kabupaten: sql<string>`${sq2.kabupaten}`.as('kabupaten'),
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

            const queryCurrYtd = currYtdRedeemPVRev.map(table => `
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
                        trx_date,
                        revenue as rev
                    FROM ${table}
                    WHERE package_group = '04. PV' AND city <> 'TMP'`).join(' UNION ALL ')

            const queryPrevYtd = prevYtdRedeemPVRev.map(table => `
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
                        trx_date,
                        revenue as rev
                    FROM ${table}
                    WHERE package_group = '04. PV' AND city <> 'TMP'`).join(' UNION ALL ')

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

            return c.json({ data: finalDataRevenue }, 200);
        })
    .get('/redeem-pv-byu', zValidator('query', z.object({ date: z.coerce.date().optional() })),
        async c => {
            const { date } = c.req.valid('query')
            const selectedDate = date ? new Date(date) : subDays(new Date(), 2)
            const month = (selectedDate.getMonth() + 1).toString()

            // KOLOM DINAMIS UNTUK MEMILIH ANTARA KOLOM `m1-m12`
            const monthColumn = `m${month}` as keyof typeof redeemPVByu.$inferSelect

            // VARIABLE TANGGAL UNTUK IMPORT TABEL SECARA DINAMIS
            const latestDataDate = subDays(selectedDate, 2); // - 2 days

            const currMonth = format(selectedDate, 'MM')
            const currYear = format(selectedDate, 'yyyy')
            const latestMonth = parseInt(format(selectedDate, 'M'), 10)
            const isPrevMonthLastYear = currMonth === '01'
            const prevMonth = isPrevMonthLastYear ? '12' : format(subMonths(selectedDate, 1), 'MM')
            const prevMonthYear = isPrevMonthLastYear ? format(subYears(selectedDate, 1), 'yyyy') : format(selectedDate, 'yyyy')
            const prevYear = format(subYears(selectedDate, 1), 'yyyy')

            const currMonthRedeemPVPrabayarRev = dynamicRevenueCVMTable(currYear, currMonth)
            const prevMonthRedeemPVPrabayarRev = dynamicRevenueCVMTable(prevMonthYear, prevMonth)
            const prevYearSameMonthRedeemPVPrabayarRev = dynamicRevenueCVMTable(prevYear, currMonth)
            const currYtdRedeemPVRev = [];
            for (let month = 1; month <= latestMonth; month++) {
                const monthStr = month.toString().padStart(2, '0')
                currYtdRedeemPVRev.push(`bba_broadband_daily_${currYear}${monthStr}`)
            }
            const prevYtdRedeemPVRev = [];
            for (let month = 1; month <= latestMonth; month++) {
                const monthStr = month.toString().padStart(2, '0')
                prevYtdRedeemPVRev.push(`bba_broadband_daily_${prevYear}${monthStr}`)
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
                    regionName: currMonthRedeemPVPrabayarRev.region,
                    branchName: sql<string>`
            CASE
             WHEN ${currMonthRedeemPVPrabayarRev.city} IN (
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
             WHEN ${currMonthRedeemPVPrabayarRev.city} IN (
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
             WHEN ${currMonthRedeemPVPrabayarRev.city} IN (
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
             WHEN ${currMonthRedeemPVPrabayarRev.city} IN (
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
             WHEN ${currMonthRedeemPVPrabayarRev.city} IN (
                 'AMBON',
                 'KOTA AMBON',
                 'MALUKU TENGAH',
                 'SERAM BAGIAN TIMUR'
             ) THEN 'AMBON'
             WHEN ${currMonthRedeemPVPrabayarRev.city} IN (
                 'KEPULAUAN ARU',
                 'KOTA TUAL',
                 'MALUKU BARAT DAYA',
                 'MALUKU TENGGARA',
                 'MALUKU TENGGARA BARAT',
                 'KEPULAUAN TANIMBAR'
             ) THEN 'KEPULAUAN AMBON'
             WHEN ${currMonthRedeemPVPrabayarRev.city} IN ('BURU', 'BURU SELATAN', 'SERAM BAGIAN BARAT') THEN 'SERAM BURU'
             WHEN ${currMonthRedeemPVPrabayarRev.city} IN ('KOTA JAYAPURA') THEN 'JAYAPURA'
             WHEN ${currMonthRedeemPVPrabayarRev.city} IN (
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
             WHEN ${currMonthRedeemPVPrabayarRev.city} IN ('MANOKWARI') THEN 'MANOKWARI'
             WHEN ${currMonthRedeemPVPrabayarRev.city} IN (
                 'FAKFAK',
                 'FAK FAK',
                 'KAIMANA',
                 'MANOKWARI SELATAN',
                 'PEGUNUNGAN ARFAK',
                 'TELUK BINTUNI',
                 'TELUK WONDAMA'
             ) THEN 'MANOKWARI OUTER'
             WHEN ${currMonthRedeemPVPrabayarRev.city} IN (
                 'KOTA SORONG',
                 'MAYBRAT',
                 'RAJA AMPAT',
                 'SORONG',
                 'SORONG SELATAN',
                 'TAMBRAUW'
             ) THEN 'SORONG RAJA AMPAT'
             WHEN ${currMonthRedeemPVPrabayarRev.city} IN ('ASMAT', 'BOVEN DIGOEL', 'MAPPI', 'MERAUKE') THEN 'MERAUKE'
             WHEN ${currMonthRedeemPVPrabayarRev.city} IN (
                 'INTAN JAYA',
                 'MIMIKA',
                 'PUNCAK',
                 'PUNCAK JAYA',
                 'TIMIKA'
             ) THEN 'MIMIKA'
             WHEN ${currMonthRedeemPVPrabayarRev.city} IN ('DEIYAI', 'DOGIYAI', 'NABIRE', 'PANIAI') THEN 'NABIRE'
             ELSE NULL
            END
                `.as('subbranchName'),
                    clusterName: sql<string>`
            CASE
             WHEN ${currMonthRedeemPVPrabayarRev.city} IN (
                 'KOTA AMBON',
                 'MALUKU TENGAH',
                 'SERAM BAGIAN TIMUR'
             ) THEN 'AMBON'
             WHEN ${currMonthRedeemPVPrabayarRev.city} IN (
                 'KEPULAUAN ARU',
                 'KOTA TUAL',
                 'MALUKU BARAT DAYA',
                 'MALUKU TENGGARA',
                 'MALUKU TENGGARA BARAT',
                 'KEPULAUAN TANIMBAR'
             ) THEN 'KEPULAUAN TUAL'
             WHEN ${currMonthRedeemPVPrabayarRev.city} IN ('BURU', 'BURU SELATAN', 'SERAM BAGIAN BARAT') THEN 'SERAM BARAT BURU'
             WHEN ${currMonthRedeemPVPrabayarRev.city} IN ('KOTA JAYAPURA') THEN 'KOTA JAYAPURA'
             WHEN ${currMonthRedeemPVPrabayarRev.city} IN ('JAYAPURA', 'KEEROM', 'MAMBERAMO RAYA', 'SARMI') THEN 'JAYAPURA OUTER'
             WHEN ${currMonthRedeemPVPrabayarRev.city} IN (
                 'BIAK',
                 'BIAK NUMFOR',
                 'KEPULAUAN YAPEN',
                 'SUPIORI',
                 'WAROPEN'
             ) THEN 'NEW BIAK NUMFOR'
             WHEN ${currMonthRedeemPVPrabayarRev.city} IN (
                 'JAYAWIJAYA',
                 'LANNY JAYA',
                 'MAMBERAMO TENGAH',
                 'NDUGA',
                 'PEGUNUNGAN BINTANG',
                 'TOLIKARA',
                 'YAHUKIMO',
                 'YALIMO'
             ) THEN 'PAPUA PEGUNUNGAN'
             WHEN ${currMonthRedeemPVPrabayarRev.city} IN ('MANOKWARI') THEN 'MANOKWARI'
             WHEN ${currMonthRedeemPVPrabayarRev.city} IN (
                 'FAKFAK',
                 'FAK FAK',
                 'KAIMANA',
                 'MANOKWARI SELATAN',
                 'PEGUNUNGAN ARFAK',
                 'TELUK BINTUNI',
                 'TELUK WONDAMA'
             ) THEN 'MANOKWARI OUTER'
             WHEN ${currMonthRedeemPVPrabayarRev.city} IN (
                 'KOTA SORONG',
                 'MAYBRAT',
                 'RAJA AMPAT',
                 'SORONG',
                 'SORONG SELATAN',
                 'TAMBRAUW'
             ) THEN 'NEW SORONG RAJA AMPAT'
             WHEN ${currMonthRedeemPVPrabayarRev.city} IN (
                 'INTAN JAYA',
                 'MIMIKA',
                 'PUNCAK',
                 'PUNCAK JAYA',
                 'TIMIKA'
             ) THEN 'MIMIKA PUNCAK'
             WHEN ${currMonthRedeemPVPrabayarRev.city} IN ('DEIYAI', 'DOGIYAI', 'NABIRE', 'PANIAI') THEN 'NABIRE'
             WHEN ${currMonthRedeemPVPrabayarRev.city} IN ('ASMAT', 'BOVEN DIGOEL', 'MAPPI', 'MERAUKE') THEN 'NEW MERAUKE'
             ELSE NULL
            END
                `.as('clusterName'),
                    kabupaten: currMonthRedeemPVPrabayarRev.city,
                    rev: currMonthRedeemPVPrabayarRev.revenue
                })
                .from(currMonthRedeemPVPrabayarRev, {
                    useIndex: [
                        index('trx_date').on(currMonthRedeemPVPrabayarRev.trxDate).using('btree'),
                        index('city').on(currMonthRedeemPVPrabayarRev.city).using('btree'),
                    ]
                })
                .where(and(
                    not(eq(currMonthRedeemPVPrabayarRev.city, 'TMP')),
                    not(eq(currMonthRedeemPVPrabayarRev.brand, 'kartuHALO')),
                    and(
                        like(currMonthRedeemPVPrabayarRev.packageGroup, '04. PV'),
                        between(currMonthRedeemPVPrabayarRev.trxDate, firstDayOfCurrMonth, currDate)
                    )))
                .as('sq2')

            const sq3 = db2
                .select({
                    regionName: prevMonthRedeemPVPrabayarRev.region,
                    branchName: sql<string>`
CASE
 WHEN ${prevMonthRedeemPVPrabayarRev.city} IN (
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
 WHEN ${prevMonthRedeemPVPrabayarRev.city} IN (
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
 WHEN ${prevMonthRedeemPVPrabayarRev.city} IN (
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
 WHEN ${prevMonthRedeemPVPrabayarRev.city} IN (
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
 WHEN ${prevMonthRedeemPVPrabayarRev.city} IN (
     'AMBON',
     'KOTA AMBON',
     'MALUKU TENGAH',
     'SERAM BAGIAN TIMUR'
 ) THEN 'AMBON'
 WHEN ${prevMonthRedeemPVPrabayarRev.city} IN (
     'KEPULAUAN ARU',
     'KOTA TUAL',
     'MALUKU BARAT DAYA',
     'MALUKU TENGGARA',
     'MALUKU TENGGARA BARAT',
     'KEPULAUAN TANIMBAR'
 ) THEN 'KEPULAUAN AMBON'
 WHEN ${prevMonthRedeemPVPrabayarRev.city} IN ('BURU', 'BURU SELATAN', 'SERAM BAGIAN BARAT') THEN 'SERAM BURU'
 WHEN ${prevMonthRedeemPVPrabayarRev.city} IN ('KOTA JAYAPURA') THEN 'JAYAPURA'
 WHEN ${prevMonthRedeemPVPrabayarRev.city} IN (
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
 WHEN ${prevMonthRedeemPVPrabayarRev.city} IN ('MANOKWARI') THEN 'MANOKWARI'
 WHEN ${prevMonthRedeemPVPrabayarRev.city} IN (
     'FAKFAK',
     'FAK FAK',
     'KAIMANA',
     'MANOKWARI SELATAN',
     'PEGUNUNGAN ARFAK',
     'TELUK BINTUNI',
     'TELUK WONDAMA'
 ) THEN 'MANOKWARI OUTER'
 WHEN ${prevMonthRedeemPVPrabayarRev.city} IN (
     'KOTA SORONG',
     'MAYBRAT',
     'RAJA AMPAT',
     'SORONG',
     'SORONG SELATAN',
     'TAMBRAUW'
 ) THEN 'SORONG RAJA AMPAT'
 WHEN ${prevMonthRedeemPVPrabayarRev.city} IN ('ASMAT', 'BOVEN DIGOEL', 'MAPPI', 'MERAUKE') THEN 'MERAUKE'
 WHEN ${prevMonthRedeemPVPrabayarRev.city} IN (
     'INTAN JAYA',
     'MIMIKA',
     'PUNCAK',
     'PUNCAK JAYA',
     'TIMIKA'
 ) THEN 'MIMIKA'
 WHEN ${prevMonthRedeemPVPrabayarRev.city} IN ('DEIYAI', 'DOGIYAI', 'NABIRE', 'PANIAI') THEN 'NABIRE'
 ELSE NULL
END
                `.as('subbranchName'),
                    clusterName: sql<string>`
CASE
 WHEN ${prevMonthRedeemPVPrabayarRev.city} IN (
     'KOTA AMBON',
     'MALUKU TENGAH',
     'SERAM BAGIAN TIMUR'
 ) THEN 'AMBON'
 WHEN ${prevMonthRedeemPVPrabayarRev.city} IN (
     'KEPULAUAN ARU',
     'KOTA TUAL',
     'MALUKU BARAT DAYA',
     'MALUKU TENGGARA',
     'MALUKU TENGGARA BARAT',
     'KEPULAUAN TANIMBAR'
 ) THEN 'KEPULAUAN TUAL'
 WHEN ${prevMonthRedeemPVPrabayarRev.city} IN ('BURU', 'BURU SELATAN', 'SERAM BAGIAN BARAT') THEN 'SERAM BARAT BURU'
 WHEN ${prevMonthRedeemPVPrabayarRev.city} IN ('KOTA JAYAPURA') THEN 'KOTA JAYAPURA'
 WHEN ${prevMonthRedeemPVPrabayarRev.city} IN ('JAYAPURA', 'KEEROM', 'MAMBERAMO RAYA', 'SARMI') THEN 'JAYAPURA OUTER'
 WHEN ${prevMonthRedeemPVPrabayarRev.city} IN (
     'BIAK',
     'BIAK NUMFOR',
     'KEPULAUAN YAPEN',
     'SUPIORI',
     'WAROPEN'
 ) THEN 'NEW BIAK NUMFOR'
 WHEN ${prevMonthRedeemPVPrabayarRev.city} IN (
     'JAYAWIJAYA',
     'LANNY JAYA',
     'MAMBERAMO TENGAH',
     'NDUGA',
     'PEGUNUNGAN BINTANG',
     'TOLIKARA',
     'YAHUKIMO',
     'YALIMO'
 ) THEN 'PAPUA PEGUNUNGAN'
 WHEN ${prevMonthRedeemPVPrabayarRev.city} IN ('MANOKWARI') THEN 'MANOKWARI'
 WHEN ${prevMonthRedeemPVPrabayarRev.city} IN (
     'FAKFAK',
     'FAK FAK',
     'KAIMANA',
     'MANOKWARI SELATAN',
     'PEGUNUNGAN ARFAK',
     'TELUK BINTUNI',
     'TELUK WONDAMA'
 ) THEN 'MANOKWARI OUTER'
 WHEN ${prevMonthRedeemPVPrabayarRev.city} IN (
     'KOTA SORONG',
     'MAYBRAT',
     'RAJA AMPAT',
     'SORONG',
     'SORONG SELATAN',
     'TAMBRAUW'
 ) THEN 'NEW SORONG RAJA AMPAT'
 WHEN ${prevMonthRedeemPVPrabayarRev.city} IN (
     'INTAN JAYA',
     'MIMIKA',
     'PUNCAK',
     'PUNCAK JAYA',
     'TIMIKA'
 ) THEN 'MIMIKA PUNCAK'
 WHEN ${prevMonthRedeemPVPrabayarRev.city} IN ('DEIYAI', 'DOGIYAI', 'NABIRE', 'PANIAI') THEN 'NABIRE'
 WHEN ${prevMonthRedeemPVPrabayarRev.city} IN ('ASMAT', 'BOVEN DIGOEL', 'MAPPI', 'MERAUKE') THEN 'NEW MERAUKE'
 ELSE NULL
END
                `.as('clusterName'),
                    cityName: prevMonthRedeemPVPrabayarRev.city,
                    rev: prevMonthRedeemPVPrabayarRev.revenue,
                    trxDate: prevMonthRedeemPVPrabayarRev.trxDate
                })
                .from(prevMonthRedeemPVPrabayarRev, {
                    useIndex: [
                        index('trx_date').on(prevMonthRedeemPVPrabayarRev.trxDate).using('btree'),
                        index('city').on(prevMonthRedeemPVPrabayarRev.city).using('btree'),
                    ]
                })
                .where(and(
                    not(eq(prevMonthRedeemPVPrabayarRev.city, 'TMP')),
                    not(eq(prevMonthRedeemPVPrabayarRev.brand, 'kartuHALO')),
                    and(
                        like(prevMonthRedeemPVPrabayarRev.packageGroup, '04. PV'),
                        between(prevMonthRedeemPVPrabayarRev.trxDate, firstDayOfPrevMonth, prevDate)
                    )
                ))
                .as('sq3')

            const sq4 = db2
                .select({
                    regionName: prevYearSameMonthRedeemPVPrabayarRev.region,
                    branchName: sql<string>`
CASE
 WHEN ${prevYearSameMonthRedeemPVPrabayarRev.city} IN (
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
 WHEN ${prevYearSameMonthRedeemPVPrabayarRev.city} IN (
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
 WHEN ${prevYearSameMonthRedeemPVPrabayarRev.city} IN (
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
 WHEN ${prevYearSameMonthRedeemPVPrabayarRev.city} IN (
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
 WHEN ${prevYearSameMonthRedeemPVPrabayarRev.city} IN (
     'AMBON',
     'KOTA AMBON',
     'MALUKU TENGAH',
     'SERAM BAGIAN TIMUR'
 ) THEN 'AMBON'
 WHEN ${prevYearSameMonthRedeemPVPrabayarRev.city} IN (
     'KEPULAUAN ARU',
     'KOTA TUAL',
     'MALUKU BARAT DAYA',
     'MALUKU TENGGARA',
     'MALUKU TENGGARA BARAT',
     'KEPULAUAN TANIMBAR'
 ) THEN 'KEPULAUAN AMBON'
 WHEN ${prevYearSameMonthRedeemPVPrabayarRev.city} IN ('BURU', 'BURU SELATAN', 'SERAM BAGIAN BARAT') THEN 'SERAM BURU'
 WHEN ${prevYearSameMonthRedeemPVPrabayarRev.city} IN ('KOTA JAYAPURA') THEN 'JAYAPURA'
 WHEN ${prevYearSameMonthRedeemPVPrabayarRev.city} IN (
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
 WHEN ${prevYearSameMonthRedeemPVPrabayarRev.city} IN ('MANOKWARI') THEN 'MANOKWARI'
 WHEN ${prevYearSameMonthRedeemPVPrabayarRev.city} IN (
     'FAKFAK',
     'FAK FAK',
     'KAIMANA',
     'MANOKWARI SELATAN',
     'PEGUNUNGAN ARFAK',
     'TELUK BINTUNI',
     'TELUK WONDAMA'
 ) THEN 'MANOKWARI OUTER'
 WHEN ${prevYearSameMonthRedeemPVPrabayarRev.city} IN (
     'KOTA SORONG',
     'MAYBRAT',
     'RAJA AMPAT',
     'SORONG',
     'SORONG SELATAN',
     'TAMBRAUW'
 ) THEN 'SORONG RAJA AMPAT'
 WHEN ${prevYearSameMonthRedeemPVPrabayarRev.city} IN ('ASMAT', 'BOVEN DIGOEL', 'MAPPI', 'MERAUKE') THEN 'MERAUKE'
 WHEN ${prevYearSameMonthRedeemPVPrabayarRev.city} IN (
     'INTAN JAYA',
     'MIMIKA',
     'PUNCAK',
     'PUNCAK JAYA',
     'TIMIKA'
 ) THEN 'MIMIKA'
 WHEN ${prevYearSameMonthRedeemPVPrabayarRev.city} IN ('DEIYAI', 'DOGIYAI', 'NABIRE', 'PANIAI') THEN 'NABIRE'
 ELSE NULL
END
                `.as('subbranchName'),
                    clusterName: sql<string>`
CASE
 WHEN ${prevYearSameMonthRedeemPVPrabayarRev.city} IN (
     'KOTA AMBON',
     'MALUKU TENGAH',
     'SERAM BAGIAN TIMUR'
 ) THEN 'AMBON'
 WHEN ${prevYearSameMonthRedeemPVPrabayarRev.city} IN (
     'KEPULAUAN ARU',
     'KOTA TUAL',
     'MALUKU BARAT DAYA',
     'MALUKU TENGGARA',
     'MALUKU TENGGARA BARAT',
     'KEPULAUAN TANIMBAR'
 ) THEN 'KEPULAUAN TUAL'
 WHEN ${prevYearSameMonthRedeemPVPrabayarRev.city} IN ('BURU', 'BURU SELATAN', 'SERAM BAGIAN BARAT') THEN 'SERAM BARAT BURU'
 WHEN ${prevYearSameMonthRedeemPVPrabayarRev.city} IN ('KOTA JAYAPURA') THEN 'KOTA JAYAPURA'
 WHEN ${prevYearSameMonthRedeemPVPrabayarRev.city} IN ('JAYAPURA', 'KEEROM', 'MAMBERAMO RAYA', 'SARMI') THEN 'JAYAPURA OUTER'
 WHEN ${prevYearSameMonthRedeemPVPrabayarRev.city} IN (
     'BIAK',
     'BIAK NUMFOR',
     'KEPULAUAN YAPEN',
     'SUPIORI',
     'WAROPEN'
 ) THEN 'NEW BIAK NUMFOR'
 WHEN ${prevYearSameMonthRedeemPVPrabayarRev.city} IN (
     'JAYAWIJAYA',
     'LANNY JAYA',
     'MAMBERAMO TENGAH',
     'NDUGA',
     'PEGUNUNGAN BINTANG',
     'TOLIKARA',
     'YAHUKIMO',
     'YALIMO'
 ) THEN 'PAPUA PEGUNUNGAN'
 WHEN ${prevYearSameMonthRedeemPVPrabayarRev.city} IN ('MANOKWARI') THEN 'MANOKWARI'
 WHEN ${prevYearSameMonthRedeemPVPrabayarRev.city} IN (
     'FAKFAK',
     'FAK FAK',
     'KAIMANA',
     'MANOKWARI SELATAN',
     'PEGUNUNGAN ARFAK',
     'TELUK BINTUNI',
     'TELUK WONDAMA'
 ) THEN 'MANOKWARI OUTER'
 WHEN ${prevYearSameMonthRedeemPVPrabayarRev.city} IN (
     'KOTA SORONG',
     'MAYBRAT',
     'RAJA AMPAT',
     'SORONG',
     'SORONG SELATAN',
     'TAMBRAUW'
 ) THEN 'NEW SORONG RAJA AMPAT'
 WHEN ${prevYearSameMonthRedeemPVPrabayarRev.city} IN (
     'INTAN JAYA',
     'MIMIKA',
     'PUNCAK',
     'PUNCAK JAYA',
     'TIMIKA'
 ) THEN 'MIMIKA PUNCAK'
 WHEN ${prevYearSameMonthRedeemPVPrabayarRev.city} IN ('DEIYAI', 'DOGIYAI', 'NABIRE', 'PANIAI') THEN 'NABIRE'
 WHEN ${prevYearSameMonthRedeemPVPrabayarRev.city} IN ('ASMAT', 'BOVEN DIGOEL', 'MAPPI', 'MERAUKE') THEN 'NEW MERAUKE'
 ELSE NULL
END
                `.as('clusterName'),
                    cityName: prevYearSameMonthRedeemPVPrabayarRev.city,
                    rev: prevYearSameMonthRedeemPVPrabayarRev.revenue,
                    trxDate: prevYearSameMonthRedeemPVPrabayarRev.trxDate
                })
                .from(prevYearSameMonthRedeemPVPrabayarRev, {
                    useIndex: [
                        index('trx_date').on(prevYearSameMonthRedeemPVPrabayarRev.trxDate).using('btree'),
                        index('city').on(prevYearSameMonthRedeemPVPrabayarRev.city).using('btree'),
                    ]
                })
                .where(and(
                    not(eq(prevYearSameMonthRedeemPVPrabayarRev.city, 'TMP')),
                    not(eq(prevYearSameMonthRedeemPVPrabayarRev.brand, 'kartuHALO')),
                    and(
                        like(prevYearSameMonthRedeemPVPrabayarRev.packageGroup, '04. PV'),
                        between(prevYearSameMonthRedeemPVPrabayarRev.trxDate, firstDayOfPrevYearCurrMonth, prevYearCurrDate)
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
                    currMonthTargetRev: sql<number>`CAST(SUM(${redeemPVByu[monthColumn]}) AS DOUBLE PRECISION)`.as('currMonthTargetRev')
                })
                .from(regionals)
                .leftJoin(branches, eq(regionals.id, branches.regionalId))
                .leftJoin(subbranches, eq(branches.id, subbranches.branchId))
                .leftJoin(clusters, eq(subbranches.id, clusters.subbranchId))
                .leftJoin(kabupatens, eq(clusters.id, kabupatens.clusterId))
                .leftJoin(redeemPVByu, eq(kabupatens.id, redeemPVByu.kabupatenId))
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
                    kabupaten: sql<string>`${sq2.kabupaten}`.as('kabupaten'),
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

            const queryCurrYtd = currYtdRedeemPVRev.map(table => `
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
                        trx_date,
                        revenue as rev
                    FROM ${table}
                    WHERE package_group LIKE '%PV%' AND city <> 'TMP' AND brand <> 'kartuHALO'`).join(' UNION ALL ')

            const queryPrevYtd = prevYtdRedeemPVRev.map(table => `
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
                        trx_date,
                        revenue as rev
                    FROM ${table}
                    WHERE package_group LIKE '%PV%' AND city <> 'TMP' AND brand <> 'kartuHALO'`).join(' UNION ALL ')

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

            return c.json({ data: finalDataRevenue }, 200);
        })

export default app