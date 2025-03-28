import { Hono } from "hono";
import { z } from 'zod'
import { and, inArray, asc, between, eq, sql, not, gte, lte } from "drizzle-orm";
import { subMonths, subDays, format, subYears, endOfMonth, startOfMonth } from 'date-fns'

import { db, db2 } from "@/db";
import {
  branches,
  regionals,
  clusters,
  kabupatens,
  subbranches,
  revenueGrosses,
  revenueGrossPrabayar,
  revenueByu,
} from "@/db/schema";
import { dynamicResumeRevenuePumaTable } from "@/db/schema2";
import { zValidator } from "@/lib/validator-wrapper";
import { index } from "drizzle-orm/mysql-core";
import { MySqlRawQueryResult } from "drizzle-orm/mysql2";

const app = new Hono()
  .get("/", zValidator('query', z.object({ date: z.string().optional() })),
    async (c) => {
      const { date } = c.req.valid('query')
      const selectedDate = date ? new Date(date) : subDays(new Date(), 2)
      const month = (selectedDate.getMonth() + 1).toString()

      // KOLOM DINAMIS UNTUK MEMILIH ANTARA KOLOM `m1-m12`
      const monthColumn = `m${month}` as keyof typeof revenueGrosses.$inferSelect

      // VARIABLE TANGGAL UNTUK IMPORT TABEL SECARA DINAMIS
      const latestDataDate = subDays(selectedDate, 2); // - 2 days

      const currMonth = format(selectedDate, 'MM')
      const currYear = format(selectedDate, 'yyyy')
      const latestMonth = parseInt(format(selectedDate, 'M'), 10)
      const isPrevMonthLastYear = currMonth === '01'
      const prevMonth = isPrevMonthLastYear ? '12' : format(subMonths(selectedDate, 1), 'MM')
      const prevMonthYear = isPrevMonthLastYear ? format(subYears(selectedDate, 1), 'yyyy') : format(selectedDate, 'yyyy')
      const prevYear = format(subYears(selectedDate, 1), 'yyyy')

      // TABEL DINAMIS
      const currGrossPrabayarRev = dynamicResumeRevenuePumaTable(currYear, currMonth)
      const prevMonthGrossPrabayarRev = dynamicResumeRevenuePumaTable(prevMonthYear, prevMonth)
      const prevYearCurrMonthGrossPrabayarRev = dynamicResumeRevenuePumaTable(prevYear, currMonth)
      const currYtdGrossRev = [];
      for (let month = 1; month <= latestMonth; month++) {
        const monthStr = month.toString().padStart(2, '0')
        currYtdGrossRev.push(`resume_revenue_puma_${currYear}${monthStr}`)
      }
      const prevYtdGrossRev = [];
      for (let month = 1; month <= latestMonth; month++) {
        const monthStr = month.toString().padStart(2, '0')
        prevYtdGrossRev.push(`resume_revenue_puma_${prevYear}${monthStr}`)
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
          regionName: currGrossPrabayarRev.regionSales,
          branchName: sql<string>`
CASE
 WHEN ${currGrossPrabayarRev.kabupaten} IN (
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
 WHEN ${currGrossPrabayarRev.kabupaten} IN (
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
 WHEN ${currGrossPrabayarRev.kabupaten} IN (
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
 WHEN ${currGrossPrabayarRev.kabupaten} IN (
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
 WHEN ${currGrossPrabayarRev.kabupaten} IN (
     'AMBON',
     'KOTA AMBON',
     'MALUKU TENGAH',
     'SERAM BAGIAN TIMUR'
 ) THEN 'AMBON'
 WHEN ${currGrossPrabayarRev.kabupaten} IN (
     'KEPULAUAN ARU',
     'KOTA TUAL',
     'MALUKU BARAT DAYA',
     'MALUKU TENGGARA',
     'MALUKU TENGGARA BARAT',
     'KEPULAUAN TANIMBAR'
 ) THEN 'KEPULAUAN AMBON'
 WHEN ${currGrossPrabayarRev.kabupaten} IN ('BURU', 'BURU SELATAN', 'SERAM BAGIAN BARAT') THEN 'SERAM BURU'
 WHEN ${currGrossPrabayarRev.kabupaten} IN ('KOTA JAYAPURA') THEN 'JAYAPURA'
 WHEN ${currGrossPrabayarRev.kabupaten} IN (
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
 WHEN ${currGrossPrabayarRev.kabupaten} IN ('MANOKWARI') THEN 'MANOKWARI'
 WHEN ${currGrossPrabayarRev.kabupaten} IN (
     'FAKFAK',
     'FAK FAK',
     'KAIMANA',
     'MANOKWARI SELATAN',
     'PEGUNUNGAN ARFAK',
     'TELUK BINTUNI',
     'TELUK WONDAMA'
 ) THEN 'MANOKWARI OUTER'
 WHEN ${currGrossPrabayarRev.kabupaten} IN (
     'KOTA SORONG',
     'MAYBRAT',
     'RAJA AMPAT',
     'SORONG',
     'SORONG SELATAN',
     'TAMBRAUW'
 ) THEN 'SORONG RAJA AMPAT'
 WHEN ${currGrossPrabayarRev.kabupaten} IN ('ASMAT', 'BOVEN DIGOEL', 'MAPPI', 'MERAUKE') THEN 'MERAUKE'
 WHEN ${currGrossPrabayarRev.kabupaten} IN (
     'INTAN JAYA',
     'MIMIKA',
     'PUNCAK',
     'PUNCAK JAYA',
     'TIMIKA'
 ) THEN 'MIMIKA'
 WHEN ${currGrossPrabayarRev.kabupaten} IN ('DEIYAI', 'DOGIYAI', 'NABIRE', 'PANIAI') THEN 'NABIRE'
 ELSE NULL
END
    `.as('subbranchName'),
          clusterName: sql<string>`
CASE
 WHEN ${currGrossPrabayarRev.kabupaten} IN (
     'KOTA AMBON',
     'MALUKU TENGAH',
     'SERAM BAGIAN TIMUR'
 ) THEN 'AMBON'
 WHEN ${currGrossPrabayarRev.kabupaten} IN (
     'KEPULAUAN ARU',
     'KOTA TUAL',
     'MALUKU BARAT DAYA',
     'MALUKU TENGGARA',
     'MALUKU TENGGARA BARAT',
     'KEPULAUAN TANIMBAR'
 ) THEN 'KEPULAUAN TUAL'
 WHEN ${currGrossPrabayarRev.kabupaten} IN ('BURU', 'BURU SELATAN', 'SERAM BAGIAN BARAT') THEN 'SERAM BARAT BURU'
 WHEN ${currGrossPrabayarRev.kabupaten} IN ('KOTA JAYAPURA') THEN 'KOTA JAYAPURA'
 WHEN ${currGrossPrabayarRev.kabupaten} IN ('JAYAPURA', 'KEEROM', 'MAMBERAMO RAYA', 'SARMI') THEN 'JAYAPURA OUTER'
 WHEN ${currGrossPrabayarRev.kabupaten} IN (
     'BIAK',
     'BIAK NUMFOR',
     'KEPULAUAN YAPEN',
     'SUPIORI',
     'WAROPEN'
 ) THEN 'NEW BIAK NUMFOR'
 WHEN ${currGrossPrabayarRev.kabupaten} IN (
     'JAYAWIJAYA',
     'LANNY JAYA',
     'MAMBERAMO TENGAH',
     'NDUGA',
     'PEGUNUNGAN BINTANG',
     'TOLIKARA',
     'YAHUKIMO',
     'YALIMO'
 ) THEN 'PAPUA PEGUNUNGAN'
 WHEN ${currGrossPrabayarRev.kabupaten} IN ('MANOKWARI') THEN 'MANOKWARI'
 WHEN ${currGrossPrabayarRev.kabupaten} IN (
     'FAKFAK',
     'FAK FAK',
     'KAIMANA',
     'MANOKWARI SELATAN',
     'PEGUNUNGAN ARFAK',
     'TELUK BINTUNI',
     'TELUK WONDAMA'
 ) THEN 'MANOKWARI OUTER'
 WHEN ${currGrossPrabayarRev.kabupaten} IN (
     'KOTA SORONG',
     'MAYBRAT',
     'RAJA AMPAT',
     'SORONG',
     'SORONG SELATAN',
     'TAMBRAUW'
 ) THEN 'NEW SORONG RAJA AMPAT'
 WHEN ${currGrossPrabayarRev.kabupaten} IN (
     'INTAN JAYA',
     'MIMIKA',
     'PUNCAK',
     'PUNCAK JAYA',
     'TIMIKA'
 ) THEN 'MIMIKA PUNCAK'
 WHEN ${currGrossPrabayarRev.kabupaten} IN ('DEIYAI', 'DOGIYAI', 'NABIRE', 'PANIAI') THEN 'NABIRE'
 WHEN ${currGrossPrabayarRev.kabupaten} IN ('ASMAT', 'BOVEN DIGOEL', 'MAPPI', 'MERAUKE') THEN 'NEW MERAUKE'
 ELSE NULL
END
    `.as('clusterName'),
          kabupaten: currGrossPrabayarRev.kabupaten,
          rev: currGrossPrabayarRev.rev,
        })
        .from(currGrossPrabayarRev, { useIndex: index('mtd_dt').on(currGrossPrabayarRev.mtdDt).using('btree') })
        .where(and(
          inArray(currGrossPrabayarRev.branch, ['AMBON', 'TIMIKA', 'SORONG', 'JAYAPURA']),
          and(
            gte(currGrossPrabayarRev.mtdDt, firstDayOfCurrMonth),
            lte(currGrossPrabayarRev.mtdDt, currDate)
          )
        ))
        .as('sq2')

      const sq3 = db2
        .select({
          regionName: prevMonthGrossPrabayarRev.regionSales,
          branchName: sql<string>`
CASE
 WHEN ${prevMonthGrossPrabayarRev.kabupaten} IN (
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
 WHEN ${prevMonthGrossPrabayarRev.kabupaten} IN (
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
 WHEN ${prevMonthGrossPrabayarRev.kabupaten} IN (
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
 WHEN ${prevMonthGrossPrabayarRev.kabupaten} IN (
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
 WHEN ${prevMonthGrossPrabayarRev.kabupaten} IN (
     'AMBON',
     'KOTA AMBON',
     'MALUKU TENGAH',
     'SERAM BAGIAN TIMUR'
 ) THEN 'AMBON'
 WHEN ${prevMonthGrossPrabayarRev.kabupaten} IN (
     'KEPULAUAN ARU',
     'KOTA TUAL',
     'MALUKU BARAT DAYA',
     'MALUKU TENGGARA',
     'MALUKU TENGGARA BARAT',
     'KEPULAUAN TANIMBAR'
 ) THEN 'KEPULAUAN AMBON'
 WHEN ${prevMonthGrossPrabayarRev.kabupaten} IN ('BURU', 'BURU SELATAN', 'SERAM BAGIAN BARAT') THEN 'SERAM BURU'
 WHEN ${prevMonthGrossPrabayarRev.kabupaten} IN ('KOTA JAYAPURA') THEN 'JAYAPURA'
 WHEN ${prevMonthGrossPrabayarRev.kabupaten} IN (
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
 WHEN ${prevMonthGrossPrabayarRev.kabupaten} IN ('MANOKWARI') THEN 'MANOKWARI'
 WHEN ${prevMonthGrossPrabayarRev.kabupaten} IN (
     'FAKFAK',
     'FAK FAK',
     'KAIMANA',
     'MANOKWARI SELATAN',
     'PEGUNUNGAN ARFAK',
     'TELUK BINTUNI',
     'TELUK WONDAMA'
 ) THEN 'MANOKWARI OUTER'
 WHEN ${prevMonthGrossPrabayarRev.kabupaten} IN (
     'KOTA SORONG',
     'MAYBRAT',
     'RAJA AMPAT',
     'SORONG',
     'SORONG SELATAN',
     'TAMBRAUW'
 ) THEN 'SORONG RAJA AMPAT'
 WHEN ${prevMonthGrossPrabayarRev.kabupaten} IN ('ASMAT', 'BOVEN DIGOEL', 'MAPPI', 'MERAUKE') THEN 'MERAUKE'
 WHEN ${prevMonthGrossPrabayarRev.kabupaten} IN (
     'INTAN JAYA',
     'MIMIKA',
     'PUNCAK',
     'PUNCAK JAYA',
     'TIMIKA'
 ) THEN 'MIMIKA'
 WHEN ${prevMonthGrossPrabayarRev.kabupaten} IN ('DEIYAI', 'DOGIYAI', 'NABIRE', 'PANIAI') THEN 'NABIRE'
 ELSE NULL
END
    `.as('subbranchName'),
          clusterName: sql<string>`
CASE
 WHEN ${prevMonthGrossPrabayarRev.kabupaten} IN (
     'KOTA AMBON',
     'MALUKU TENGAH',
     'SERAM BAGIAN TIMUR'
 ) THEN 'AMBON'
 WHEN ${prevMonthGrossPrabayarRev.kabupaten} IN (
     'KEPULAUAN ARU',
     'KOTA TUAL',
     'MALUKU BARAT DAYA',
     'MALUKU TENGGARA',
     'MALUKU TENGGARA BARAT',
     'KEPULAUAN TANIMBAR'
 ) THEN 'KEPULAUAN TUAL'
 WHEN ${prevMonthGrossPrabayarRev.kabupaten} IN ('BURU', 'BURU SELATAN', 'SERAM BAGIAN BARAT') THEN 'SERAM BARAT BURU'
 WHEN ${prevMonthGrossPrabayarRev.kabupaten} IN ('KOTA JAYAPURA') THEN 'KOTA JAYAPURA'
 WHEN ${prevMonthGrossPrabayarRev.kabupaten} IN ('JAYAPURA', 'KEEROM', 'MAMBERAMO RAYA', 'SARMI') THEN 'JAYAPURA OUTER'
 WHEN ${prevMonthGrossPrabayarRev.kabupaten} IN (
     'BIAK',
     'BIAK NUMFOR',
     'KEPULAUAN YAPEN',
     'SUPIORI',
     'WAROPEN'
 ) THEN 'NEW BIAK NUMFOR'
 WHEN ${prevMonthGrossPrabayarRev.kabupaten} IN (
     'JAYAWIJAYA',
     'LANNY JAYA',
     'MAMBERAMO TENGAH',
     'NDUGA',
     'PEGUNUNGAN BINTANG',
     'TOLIKARA',
     'YAHUKIMO',
     'YALIMO'
 ) THEN 'PAPUA PEGUNUNGAN'
 WHEN ${prevMonthGrossPrabayarRev.kabupaten} IN ('MANOKWARI') THEN 'MANOKWARI'
 WHEN ${prevMonthGrossPrabayarRev.kabupaten} IN (
     'FAKFAK',
     'FAK FAK',
     'KAIMANA',
     'MANOKWARI SELATAN',
     'PEGUNUNGAN ARFAK',
     'TELUK BINTUNI',
     'TELUK WONDAMA'
 ) THEN 'MANOKWARI OUTER'
 WHEN ${prevMonthGrossPrabayarRev.kabupaten} IN (
     'KOTA SORONG',
     'MAYBRAT',
     'RAJA AMPAT',
     'SORONG',
     'SORONG SELATAN',
     'TAMBRAUW'
 ) THEN 'NEW SORONG RAJA AMPAT'
 WHEN ${prevMonthGrossPrabayarRev.kabupaten} IN (
     'INTAN JAYA',
     'MIMIKA',
     'PUNCAK',
     'PUNCAK JAYA',
     'TIMIKA'
 ) THEN 'MIMIKA PUNCAK'
 WHEN ${prevMonthGrossPrabayarRev.kabupaten} IN ('DEIYAI', 'DOGIYAI', 'NABIRE', 'PANIAI') THEN 'NABIRE'
 WHEN ${prevMonthGrossPrabayarRev.kabupaten} IN ('ASMAT', 'BOVEN DIGOEL', 'MAPPI', 'MERAUKE') THEN 'NEW MERAUKE'
 ELSE NULL
END
    `.as('clusterName'),
          kabupaten: prevMonthGrossPrabayarRev.kabupaten,
          rev: prevMonthGrossPrabayarRev.rev,
        })
        .from(prevMonthGrossPrabayarRev, { useIndex: index('mtd_dt').on(prevMonthGrossPrabayarRev.mtdDt).using('btree') })
        .where(
          and(
            inArray(prevMonthGrossPrabayarRev.branch, ['AMBON', 'TIMIKA', 'SORONG', 'JAYAPURA']),
            and(
              gte(prevMonthGrossPrabayarRev.mtdDt, firstDayOfPrevMonth),
              lte(prevMonthGrossPrabayarRev.mtdDt, prevDate)
            )
          )
        )
        .as('sq3')

      const sq4 = db2
        .select({
          regionName: sql<string>`CASE WHEN ${prevYearCurrMonthGrossPrabayarRev.regionSales} IN ('PUMA', 'MALUKU DAN PAPUA') THEN 'PUMA' END`.as('regionName'),
          branchName: sql<string>`
CASE
 WHEN ${prevYearCurrMonthGrossPrabayarRev.kabupaten} IN (
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
 WHEN ${prevYearCurrMonthGrossPrabayarRev.kabupaten} IN (
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
 WHEN ${prevYearCurrMonthGrossPrabayarRev.kabupaten} IN (
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
 WHEN ${prevYearCurrMonthGrossPrabayarRev.kabupaten} IN (
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
 WHEN ${prevYearCurrMonthGrossPrabayarRev.kabupaten} IN (
     'AMBON',
     'KOTA AMBON',
     'MALUKU TENGAH',
     'SERAM BAGIAN TIMUR'
 ) THEN 'AMBON'
 WHEN ${prevYearCurrMonthGrossPrabayarRev.kabupaten} IN (
     'KEPULAUAN ARU',
     'KOTA TUAL',
     'MALUKU BARAT DAYA',
     'MALUKU TENGGARA',
     'MALUKU TENGGARA BARAT',
     'KEPULAUAN TANIMBAR'
 ) THEN 'KEPULAUAN AMBON'
 WHEN ${prevYearCurrMonthGrossPrabayarRev.kabupaten} IN ('BURU', 'BURU SELATAN', 'SERAM BAGIAN BARAT') THEN 'SERAM BURU'
 WHEN ${prevYearCurrMonthGrossPrabayarRev.kabupaten} IN ('KOTA JAYAPURA') THEN 'JAYAPURA'
 WHEN ${prevYearCurrMonthGrossPrabayarRev.kabupaten} IN (
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
 WHEN ${prevYearCurrMonthGrossPrabayarRev.kabupaten} IN ('MANOKWARI') THEN 'MANOKWARI'
 WHEN ${prevYearCurrMonthGrossPrabayarRev.kabupaten} IN (
     'FAKFAK',
     'FAK FAK',
     'KAIMANA',
     'MANOKWARI SELATAN',
     'PEGUNUNGAN ARFAK',
     'TELUK BINTUNI',
     'TELUK WONDAMA'
 ) THEN 'MANOKWARI OUTER'
 WHEN ${prevYearCurrMonthGrossPrabayarRev.kabupaten} IN (
     'KOTA SORONG',
     'MAYBRAT',
     'RAJA AMPAT',
     'SORONG',
     'SORONG SELATAN',
     'TAMBRAUW'
 ) THEN 'SORONG RAJA AMPAT'
 WHEN ${prevYearCurrMonthGrossPrabayarRev.kabupaten} IN ('ASMAT', 'BOVEN DIGOEL', 'MAPPI', 'MERAUKE') THEN 'MERAUKE'
 WHEN ${prevYearCurrMonthGrossPrabayarRev.kabupaten} IN (
     'INTAN JAYA',
     'MIMIKA',
     'PUNCAK',
     'PUNCAK JAYA',
     'TIMIKA'
 ) THEN 'MIMIKA'
 WHEN ${prevYearCurrMonthGrossPrabayarRev.kabupaten} IN ('DEIYAI', 'DOGIYAI', 'NABIRE', 'PANIAI') THEN 'NABIRE'
 ELSE NULL
END
    `.as('subbranchName'),
          clusterName: sql<string>`
CASE
 WHEN ${prevYearCurrMonthGrossPrabayarRev.kabupaten} IN (
     'KOTA AMBON',
     'MALUKU TENGAH',
     'SERAM BAGIAN TIMUR'
 ) THEN 'AMBON'
 WHEN ${prevYearCurrMonthGrossPrabayarRev.kabupaten} IN (
     'KEPULAUAN ARU',
     'KOTA TUAL',
     'MALUKU BARAT DAYA',
     'MALUKU TENGGARA',
     'MALUKU TENGGARA BARAT',
     'KEPULAUAN TANIMBAR'
 ) THEN 'KEPULAUAN TUAL'
 WHEN ${prevYearCurrMonthGrossPrabayarRev.kabupaten} IN ('BURU', 'BURU SELATAN', 'SERAM BAGIAN BARAT') THEN 'SERAM BARAT BURU'
 WHEN ${prevYearCurrMonthGrossPrabayarRev.kabupaten} IN ('KOTA JAYAPURA') THEN 'KOTA JAYAPURA'
 WHEN ${prevYearCurrMonthGrossPrabayarRev.kabupaten} IN ('JAYAPURA', 'KEEROM', 'MAMBERAMO RAYA', 'SARMI') THEN 'JAYAPURA OUTER'
 WHEN ${prevYearCurrMonthGrossPrabayarRev.kabupaten} IN (
     'BIAK',
     'BIAK NUMFOR',
     'KEPULAUAN YAPEN',
     'SUPIORI',
     'WAROPEN'
 ) THEN 'NEW BIAK NUMFOR'
 WHEN ${prevYearCurrMonthGrossPrabayarRev.kabupaten} IN (
     'JAYAWIJAYA',
     'LANNY JAYA',
     'MAMBERAMO TENGAH',
     'NDUGA',
     'PEGUNUNGAN BINTANG',
     'TOLIKARA',
     'YAHUKIMO',
     'YALIMO'
 ) THEN 'PAPUA PEGUNUNGAN'
 WHEN ${prevYearCurrMonthGrossPrabayarRev.kabupaten} IN ('MANOKWARI') THEN 'MANOKWARI'
 WHEN ${prevYearCurrMonthGrossPrabayarRev.kabupaten} IN (
     'FAKFAK',
     'FAK FAK',
     'KAIMANA',
     'MANOKWARI SELATAN',
     'PEGUNUNGAN ARFAK',
     'TELUK BINTUNI',
     'TELUK WONDAMA'
 ) THEN 'MANOKWARI OUTER'
 WHEN ${prevYearCurrMonthGrossPrabayarRev.kabupaten} IN (
     'KOTA SORONG',
     'MAYBRAT',
     'RAJA AMPAT',
     'SORONG',
     'SORONG SELATAN',
     'TAMBRAUW'
 ) THEN 'NEW SORONG RAJA AMPAT'
 WHEN ${prevYearCurrMonthGrossPrabayarRev.kabupaten} IN (
     'INTAN JAYA',
     'MIMIKA',
     'PUNCAK',
     'PUNCAK JAYA',
     'TIMIKA'
 ) THEN 'MIMIKA PUNCAK'
 WHEN ${prevYearCurrMonthGrossPrabayarRev.kabupaten} IN ('DEIYAI', 'DOGIYAI', 'NABIRE', 'PANIAI') THEN 'NABIRE'
 WHEN ${prevYearCurrMonthGrossPrabayarRev.kabupaten} IN ('ASMAT', 'BOVEN DIGOEL', 'MAPPI', 'MERAUKE') THEN 'NEW MERAUKE'
 ELSE NULL
END
    `.as('clusterName'),
          kabupaten: prevYearCurrMonthGrossPrabayarRev.kabupaten,
          rev: prevYearCurrMonthGrossPrabayarRev.rev,
        })
        .from(prevYearCurrMonthGrossPrabayarRev, { useIndex: index('mtd_dt').on(prevYearCurrMonthGrossPrabayarRev.mtdDt).using('btree') })
        .where(and(
          inArray(prevYearCurrMonthGrossPrabayarRev.branch, ['AMBON', 'TIMIKA', 'SORONG', 'JAYAPURA']),
          and(
            gte(prevYearCurrMonthGrossPrabayarRev.mtdDt, firstDayOfPrevYearCurrMonth),
            lte(prevYearCurrMonthGrossPrabayarRev.mtdDt, prevYearCurrDate)
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
          currMonthTargetRev: sql<number>`CAST(SUM(${revenueGrosses[monthColumn]}) AS DOUBLE PRECISION)`.as('currMonthTargetRev')
        })
        .from(regionals)
        .leftJoin(branches, eq(regionals.id, branches.regionalId))
        .leftJoin(subbranches, eq(branches.id, subbranches.branchId))
        .leftJoin(clusters, eq(subbranches.id, clusters.subbranchId))
        .leftJoin(kabupatens, eq(clusters.id, kabupatens.clusterId))
        .leftJoin(revenueGrosses, eq(kabupatens.id, revenueGrosses.kabupatenId))
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
          kabupaten: sql<string>`${sq3.kabupaten}`.as('kabupaten'),
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
          kabupaten: sql<string>`${sq4.kabupaten}`.as('kabupaten'),
          prevYearCurrMonthKabupatenRev: sql<number>`SUM(${sq4.rev})`.as('currMonthKabupatenRev'),
          prevYearCurrMonthClusterRev: sql<number>`SUM(SUM(${sq4.rev})) OVER (PARTITION BY ${sq4.regionName}, ${sq4.branchName}, ${sq4.subbranchName}, ${sq4.clusterName})`.as('currMonthClusterRev'),
          prevYearCurrMonthSubbranchRev: sql<number>`SUM(SUM(${sq4.rev})) OVER (PARTITION BY ${sq4.regionName}, ${sq4.branchName}, ${sq4.subbranchName})`.as('currMonthSubbranchRev'),
          prevYearCurrMonthBranchRev: sql<number>`SUM(SUM(${sq4.rev})) OVER (PARTITION BY ${sq4.regionName}, ${sq4.branchName})`.as('currMonthBranchRev'),
          prevYearCurrMonthRegionalRev: sql<number>`SUM(SUM(${sq4.rev})) OVER (PARTITION BY ${sq4.regionName})`.as('currMonthRegionalRev')
        })
        .from(sq4)
        .groupBy(sql`1,2,3,4,5`)
        .prepare()

      const queryCurrYtd = currYtdGrossRev.map(table => `
          SELECT
              CASE WHEN region_sales IN ('MALUKU DAN PAPUA', 'PUMA') THEN 'PUMA' END as region,
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
              mtd_dt,
              rev
          FROM ${table}
          WHERE branch IN ('AMBON', 'TIMIKA', 'SORONG', 'JAYAPURA')`).join(' UNION ALL ')

      const queryPrevYtd = prevYtdGrossRev.map(table => `
          SELECT
              CASE WHEN region_sales IN ('MALUKU DAN PAPUA', 'PUMA') THEN 'PUMA' END as region,
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
              mtd_dt,
              rev
          FROM ${table}
          WHERE branch IN ('AMBON', 'TIMIKA', 'SORONG', 'JAYAPURA')`).join(' UNION ALL ')

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
                  WHERE mtd_dt BETWEEN '${currJanuaryFirst}' AND '${currDate}'
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
                  WHERE mtd_dt BETWEEN '${prevJanuaryFirst}' AND '${prevYearCurrDate}'
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

      // /var/lib/backup_mysql_2025/
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
  .get('/revenue-gross-prabayar', zValidator('query', z.object({ date: z.coerce.date().optional() })),
    async c => {
      const { date } = c.req.valid('query')
      const selectedDate = date ? new Date(date) : subDays(new Date(), 2)
      const month = (selectedDate.getMonth() + 1).toString()

      // KOLOM DINAMIS UNTUK MEMILIH ANTARA KOLOM `m1-m12`
      const monthColumn = `m${month}` as keyof typeof revenueGrossPrabayar.$inferSelect

      // VARIABLE TANGGAL UNTUK IMPORT TABEL SECARA DINAMIS
      const latestDataDate = subDays(selectedDate, 2); // - 2 days

      const currMonth = format(selectedDate, 'MM')
      const currYear = format(selectedDate, 'yyyy')
      const latestMonth = parseInt(format(selectedDate, 'M'), 10)
      const isPrevMonthLastYear = currMonth === '01'
      const prevMonth = isPrevMonthLastYear ? '12' : format(subMonths(selectedDate, 1), 'MM')
      const prevMonthYear = isPrevMonthLastYear ? format(subYears(selectedDate, 1), 'yyyy') : format(selectedDate, 'yyyy')
      const prevYear = format(subYears(selectedDate, 1), 'yyyy')

      // TABEL DINAMIS
      const currGrossPrabayarRev = dynamicResumeRevenuePumaTable(currYear, currMonth)
      const prevMonthGrossPrabayarRev = dynamicResumeRevenuePumaTable(prevMonthYear, prevMonth)
      const prevYearCurrMonthGrossPrabayarRev = dynamicResumeRevenuePumaTable(prevYear, currMonth)
      const currYtdGrossPrabayarRev = [];
      for (let month = 1; month <= latestMonth; month++) {
        const monthStr = month.toString().padStart(2, '0')
        currYtdGrossPrabayarRev.push(`resume_revenue_puma_${currYear}${monthStr}`)
      }
      const prevYtdGrossPrabayarRev = [];
      for (let month = 1; month <= latestMonth; month++) {
        const monthStr = month.toString().padStart(2, '0')
        prevYtdGrossPrabayarRev.push(`resume_revenue_puma_${prevYear}${monthStr}`)
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
          regionName: currGrossPrabayarRev.regionSales,
          branchName: sql<string>`
CASE
 WHEN ${currGrossPrabayarRev.kabupaten} IN (
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
 WHEN ${currGrossPrabayarRev.kabupaten} IN (
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
 WHEN ${currGrossPrabayarRev.kabupaten} IN (
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
 WHEN ${currGrossPrabayarRev.kabupaten} IN (
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
 WHEN ${currGrossPrabayarRev.kabupaten} IN (
     'AMBON',
     'KOTA AMBON',
     'MALUKU TENGAH',
     'SERAM BAGIAN TIMUR'
 ) THEN 'AMBON'
 WHEN ${currGrossPrabayarRev.kabupaten} IN (
     'KEPULAUAN ARU',
     'KOTA TUAL',
     'MALUKU BARAT DAYA',
     'MALUKU TENGGARA',
     'MALUKU TENGGARA BARAT',
     'KEPULAUAN TANIMBAR'
 ) THEN 'KEPULAUAN AMBON'
 WHEN ${currGrossPrabayarRev.kabupaten} IN ('BURU', 'BURU SELATAN', 'SERAM BAGIAN BARAT') THEN 'SERAM BURU'
 WHEN ${currGrossPrabayarRev.kabupaten} IN ('KOTA JAYAPURA') THEN 'JAYAPURA'
 WHEN ${currGrossPrabayarRev.kabupaten} IN (
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
 WHEN ${currGrossPrabayarRev.kabupaten} IN ('MANOKWARI') THEN 'MANOKWARI'
 WHEN ${currGrossPrabayarRev.kabupaten} IN (
     'FAKFAK',
     'FAK FAK',
     'KAIMANA',
     'MANOKWARI SELATAN',
     'PEGUNUNGAN ARFAK',
     'TELUK BINTUNI',
     'TELUK WONDAMA'
 ) THEN 'MANOKWARI OUTER'
 WHEN ${currGrossPrabayarRev.kabupaten} IN (
     'KOTA SORONG',
     'MAYBRAT',
     'RAJA AMPAT',
     'SORONG',
     'SORONG SELATAN',
     'TAMBRAUW'
 ) THEN 'SORONG RAJA AMPAT'
 WHEN ${currGrossPrabayarRev.kabupaten} IN ('ASMAT', 'BOVEN DIGOEL', 'MAPPI', 'MERAUKE') THEN 'MERAUKE'
 WHEN ${currGrossPrabayarRev.kabupaten} IN (
     'INTAN JAYA',
     'MIMIKA',
     'PUNCAK',
     'PUNCAK JAYA',
     'TIMIKA'
 ) THEN 'MIMIKA'
 WHEN ${currGrossPrabayarRev.kabupaten} IN ('DEIYAI', 'DOGIYAI', 'NABIRE', 'PANIAI') THEN 'NABIRE'
 ELSE NULL
END
    `.as('subbranchName'),
          clusterName: sql<string>`
CASE
 WHEN ${currGrossPrabayarRev.kabupaten} IN (
     'KOTA AMBON',
     'MALUKU TENGAH',
     'SERAM BAGIAN TIMUR'
 ) THEN 'AMBON'
 WHEN ${currGrossPrabayarRev.kabupaten} IN (
     'KEPULAUAN ARU',
     'KOTA TUAL',
     'MALUKU BARAT DAYA',
     'MALUKU TENGGARA',
     'MALUKU TENGGARA BARAT',
     'KEPULAUAN TANIMBAR'
 ) THEN 'KEPULAUAN TUAL'
 WHEN ${currGrossPrabayarRev.kabupaten} IN ('BURU', 'BURU SELATAN', 'SERAM BAGIAN BARAT') THEN 'SERAM BARAT BURU'
 WHEN ${currGrossPrabayarRev.kabupaten} IN ('KOTA JAYAPURA') THEN 'KOTA JAYAPURA'
 WHEN ${currGrossPrabayarRev.kabupaten} IN ('JAYAPURA', 'KEEROM', 'MAMBERAMO RAYA', 'SARMI') THEN 'JAYAPURA OUTER'
 WHEN ${currGrossPrabayarRev.kabupaten} IN (
     'BIAK',
     'BIAK NUMFOR',
     'KEPULAUAN YAPEN',
     'SUPIORI',
     'WAROPEN'
 ) THEN 'NEW BIAK NUMFOR'
 WHEN ${currGrossPrabayarRev.kabupaten} IN (
     'JAYAWIJAYA',
     'LANNY JAYA',
     'MAMBERAMO TENGAH',
     'NDUGA',
     'PEGUNUNGAN BINTANG',
     'TOLIKARA',
     'YAHUKIMO',
     'YALIMO'
 ) THEN 'PAPUA PEGUNUNGAN'
 WHEN ${currGrossPrabayarRev.kabupaten} IN ('MANOKWARI') THEN 'MANOKWARI'
 WHEN ${currGrossPrabayarRev.kabupaten} IN (
     'FAKFAK',
     'FAK FAK',
     'KAIMANA',
     'MANOKWARI SELATAN',
     'PEGUNUNGAN ARFAK',
     'TELUK BINTUNI',
     'TELUK WONDAMA'
 ) THEN 'MANOKWARI OUTER'
 WHEN ${currGrossPrabayarRev.kabupaten} IN (
     'KOTA SORONG',
     'MAYBRAT',
     'RAJA AMPAT',
     'SORONG',
     'SORONG SELATAN',
     'TAMBRAUW'
 ) THEN 'NEW SORONG RAJA AMPAT'
 WHEN ${currGrossPrabayarRev.kabupaten} IN (
     'INTAN JAYA',
     'MIMIKA',
     'PUNCAK',
     'PUNCAK JAYA',
     'TIMIKA'
 ) THEN 'MIMIKA PUNCAK'
 WHEN ${currGrossPrabayarRev.kabupaten} IN ('DEIYAI', 'DOGIYAI', 'NABIRE', 'PANIAI') THEN 'NABIRE'
 WHEN ${currGrossPrabayarRev.kabupaten} IN ('ASMAT', 'BOVEN DIGOEL', 'MAPPI', 'MERAUKE') THEN 'NEW MERAUKE'
 ELSE NULL
END
    `.as('clusterName'),
          kabupaten: currGrossPrabayarRev.kabupaten,
          rev: currGrossPrabayarRev.rev,
        })
        .from(currGrossPrabayarRev, { useIndex: index('mtd_dt').on(currGrossPrabayarRev.mtdDt) })
        .where(and(
          not(eq(currGrossPrabayarRev.brand, 'ByU')),
          and(
            inArray(currGrossPrabayarRev.branch, ['AMBON', 'TIMIKA', 'SORONG', 'JAYAPURA']), and(
              gte(currGrossPrabayarRev.mtdDt, firstDayOfCurrMonth),
              lte(currGrossPrabayarRev.mtdDt, currDate)
            )
          )
        ))
        .as('sq2')

      const sq3 = db2
        .select({
          regionName: prevMonthGrossPrabayarRev.regionSales,
          branchName: sql<string>`
CASE
 WHEN ${prevMonthGrossPrabayarRev.kabupaten} IN (
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
 WHEN ${prevMonthGrossPrabayarRev.kabupaten} IN (
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
 WHEN ${prevMonthGrossPrabayarRev.kabupaten} IN (
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
 WHEN ${prevMonthGrossPrabayarRev.kabupaten} IN (
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
 WHEN ${prevMonthGrossPrabayarRev.kabupaten} IN (
     'AMBON',
     'KOTA AMBON',
     'MALUKU TENGAH',
     'SERAM BAGIAN TIMUR'
 ) THEN 'AMBON'
 WHEN ${prevMonthGrossPrabayarRev.kabupaten} IN (
     'KEPULAUAN ARU',
     'KOTA TUAL',
     'MALUKU BARAT DAYA',
     'MALUKU TENGGARA',
     'MALUKU TENGGARA BARAT',
     'KEPULAUAN TANIMBAR'
 ) THEN 'KEPULAUAN AMBON'
 WHEN ${prevMonthGrossPrabayarRev.kabupaten} IN ('BURU', 'BURU SELATAN', 'SERAM BAGIAN BARAT') THEN 'SERAM BURU'
 WHEN ${prevMonthGrossPrabayarRev.kabupaten} IN ('KOTA JAYAPURA') THEN 'JAYAPURA'
 WHEN ${prevMonthGrossPrabayarRev.kabupaten} IN (
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
 WHEN ${prevMonthGrossPrabayarRev.kabupaten} IN ('MANOKWARI') THEN 'MANOKWARI'
 WHEN ${prevMonthGrossPrabayarRev.kabupaten} IN (
     'FAKFAK',
     'FAK FAK',
     'KAIMANA',
     'MANOKWARI SELATAN',
     'PEGUNUNGAN ARFAK',
     'TELUK BINTUNI',
     'TELUK WONDAMA'
 ) THEN 'MANOKWARI OUTER'
 WHEN ${prevMonthGrossPrabayarRev.kabupaten} IN (
     'KOTA SORONG',
     'MAYBRAT',
     'RAJA AMPAT',
     'SORONG',
     'SORONG SELATAN',
     'TAMBRAUW'
 ) THEN 'SORONG RAJA AMPAT'
 WHEN ${prevMonthGrossPrabayarRev.kabupaten} IN ('ASMAT', 'BOVEN DIGOEL', 'MAPPI', 'MERAUKE') THEN 'MERAUKE'
 WHEN ${prevMonthGrossPrabayarRev.kabupaten} IN (
     'INTAN JAYA',
     'MIMIKA',
     'PUNCAK',
     'PUNCAK JAYA',
     'TIMIKA'
 ) THEN 'MIMIKA'
 WHEN ${prevMonthGrossPrabayarRev.kabupaten} IN ('DEIYAI', 'DOGIYAI', 'NABIRE', 'PANIAI') THEN 'NABIRE'
 ELSE NULL
END
    `.as('subbranchName'),
          clusterName: sql<string>`
CASE
 WHEN ${prevMonthGrossPrabayarRev.kabupaten} IN (
     'KOTA AMBON',
     'MALUKU TENGAH',
     'SERAM BAGIAN TIMUR'
 ) THEN 'AMBON'
 WHEN ${prevMonthGrossPrabayarRev.kabupaten} IN (
     'KEPULAUAN ARU',
     'KOTA TUAL',
     'MALUKU BARAT DAYA',
     'MALUKU TENGGARA',
     'MALUKU TENGGARA BARAT',
     'KEPULAUAN TANIMBAR'
 ) THEN 'KEPULAUAN TUAL'
 WHEN ${prevMonthGrossPrabayarRev.kabupaten} IN ('BURU', 'BURU SELATAN', 'SERAM BAGIAN BARAT') THEN 'SERAM BARAT BURU'
 WHEN ${prevMonthGrossPrabayarRev.kabupaten} IN ('KOTA JAYAPURA') THEN 'KOTA JAYAPURA'
 WHEN ${prevMonthGrossPrabayarRev.kabupaten} IN ('JAYAPURA', 'KEEROM', 'MAMBERAMO RAYA', 'SARMI') THEN 'JAYAPURA OUTER'
 WHEN ${prevMonthGrossPrabayarRev.kabupaten} IN (
     'BIAK',
     'BIAK NUMFOR',
     'KEPULAUAN YAPEN',
     'SUPIORI',
     'WAROPEN'
 ) THEN 'NEW BIAK NUMFOR'
 WHEN ${prevMonthGrossPrabayarRev.kabupaten} IN (
     'JAYAWIJAYA',
     'LANNY JAYA',
     'MAMBERAMO TENGAH',
     'NDUGA',
     'PEGUNUNGAN BINTANG',
     'TOLIKARA',
     'YAHUKIMO',
     'YALIMO'
 ) THEN 'PAPUA PEGUNUNGAN'
 WHEN ${prevMonthGrossPrabayarRev.kabupaten} IN ('MANOKWARI') THEN 'MANOKWARI'
 WHEN ${prevMonthGrossPrabayarRev.kabupaten} IN (
     'FAKFAK',
     'FAK FAK',
     'KAIMANA',
     'MANOKWARI SELATAN',
     'PEGUNUNGAN ARFAK',
     'TELUK BINTUNI',
     'TELUK WONDAMA'
 ) THEN 'MANOKWARI OUTER'
 WHEN ${prevMonthGrossPrabayarRev.kabupaten} IN (
     'KOTA SORONG',
     'MAYBRAT',
     'RAJA AMPAT',
     'SORONG',
     'SORONG SELATAN',
     'TAMBRAUW'
 ) THEN 'NEW SORONG RAJA AMPAT'
 WHEN ${prevMonthGrossPrabayarRev.kabupaten} IN (
     'INTAN JAYA',
     'MIMIKA',
     'PUNCAK',
     'PUNCAK JAYA',
     'TIMIKA'
 ) THEN 'MIMIKA PUNCAK'
 WHEN ${prevMonthGrossPrabayarRev.kabupaten} IN ('DEIYAI', 'DOGIYAI', 'NABIRE', 'PANIAI') THEN 'NABIRE'
 WHEN ${prevMonthGrossPrabayarRev.kabupaten} IN ('ASMAT', 'BOVEN DIGOEL', 'MAPPI', 'MERAUKE') THEN 'NEW MERAUKE'
 ELSE NULL
END
    `.as('clusterName'),
          kabupaten: prevMonthGrossPrabayarRev.kabupaten,
          rev: prevMonthGrossPrabayarRev.rev,
        })
        .from(prevMonthGrossPrabayarRev, { useIndex: index('mtd_dt').on(prevMonthGrossPrabayarRev.mtdDt) })
        .where(and(
          not(eq(prevMonthGrossPrabayarRev.brand, 'ByU')),
          and(
            inArray(prevMonthGrossPrabayarRev.branch, ['AMBON', 'TIMIKA', 'SORONG', 'JAYAPURA']),
            and(
              gte(prevMonthGrossPrabayarRev.mtdDt, firstDayOfPrevMonth),
              lte(prevMonthGrossPrabayarRev.mtdDt, prevDate)
            )
          )
        ))
        .as('sq3')

      const sq4 = db2
        .select({
          regionName: sql<string>`CASE WHEN ${prevYearCurrMonthGrossPrabayarRev.regionSales} IN ('PUMA', 'MALUKU DAN PAPUA') THEN 'PUMA' END`.as('regionaName'),
          branchName: sql<string>`
CASE
 WHEN ${prevYearCurrMonthGrossPrabayarRev.kabupaten} IN (
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
 WHEN ${prevYearCurrMonthGrossPrabayarRev.kabupaten} IN (
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
 WHEN ${prevYearCurrMonthGrossPrabayarRev.kabupaten} IN (
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
 WHEN ${prevYearCurrMonthGrossPrabayarRev.kabupaten} IN (
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
 WHEN ${prevYearCurrMonthGrossPrabayarRev.kabupaten} IN (
     'AMBON',
     'KOTA AMBON',
     'MALUKU TENGAH',
     'SERAM BAGIAN TIMUR'
 ) THEN 'AMBON'
 WHEN ${prevYearCurrMonthGrossPrabayarRev.kabupaten} IN (
     'KEPULAUAN ARU',
     'KOTA TUAL',
     'MALUKU BARAT DAYA',
     'MALUKU TENGGARA',
     'MALUKU TENGGARA BARAT',
     'KEPULAUAN TANIMBAR'
 ) THEN 'KEPULAUAN AMBON'
 WHEN ${prevYearCurrMonthGrossPrabayarRev.kabupaten} IN ('BURU', 'BURU SELATAN', 'SERAM BAGIAN BARAT') THEN 'SERAM BURU'
 WHEN ${prevYearCurrMonthGrossPrabayarRev.kabupaten} IN ('KOTA JAYAPURA') THEN 'JAYAPURA'
 WHEN ${prevYearCurrMonthGrossPrabayarRev.kabupaten} IN (
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
 WHEN ${prevYearCurrMonthGrossPrabayarRev.kabupaten} IN ('MANOKWARI') THEN 'MANOKWARI'
 WHEN ${prevYearCurrMonthGrossPrabayarRev.kabupaten} IN (
     'FAKFAK',
     'FAK FAK',
     'KAIMANA',
     'MANOKWARI SELATAN',
     'PEGUNUNGAN ARFAK',
     'TELUK BINTUNI',
     'TELUK WONDAMA'
 ) THEN 'MANOKWARI OUTER'
 WHEN ${prevYearCurrMonthGrossPrabayarRev.kabupaten} IN (
     'KOTA SORONG',
     'MAYBRAT',
     'RAJA AMPAT',
     'SORONG',
     'SORONG SELATAN',
     'TAMBRAUW'
 ) THEN 'SORONG RAJA AMPAT'
 WHEN ${prevYearCurrMonthGrossPrabayarRev.kabupaten} IN ('ASMAT', 'BOVEN DIGOEL', 'MAPPI', 'MERAUKE') THEN 'MERAUKE'
 WHEN ${prevYearCurrMonthGrossPrabayarRev.kabupaten} IN (
     'INTAN JAYA',
     'MIMIKA',
     'PUNCAK',
     'PUNCAK JAYA',
     'TIMIKA'
 ) THEN 'MIMIKA'
 WHEN ${prevYearCurrMonthGrossPrabayarRev.kabupaten} IN ('DEIYAI', 'DOGIYAI', 'NABIRE', 'PANIAI') THEN 'NABIRE'
 ELSE NULL
END
    `.as('subbranchName'),
          clusterName: sql<string>`
CASE
 WHEN ${prevYearCurrMonthGrossPrabayarRev.kabupaten} IN (
     'KOTA AMBON',
     'MALUKU TENGAH',
     'SERAM BAGIAN TIMUR'
 ) THEN 'AMBON'
 WHEN ${prevYearCurrMonthGrossPrabayarRev.kabupaten} IN (
     'KEPULAUAN ARU',
     'KOTA TUAL',
     'MALUKU BARAT DAYA',
     'MALUKU TENGGARA',
     'MALUKU TENGGARA BARAT',
     'KEPULAUAN TANIMBAR'
 ) THEN 'KEPULAUAN TUAL'
 WHEN ${prevYearCurrMonthGrossPrabayarRev.kabupaten} IN ('BURU', 'BURU SELATAN', 'SERAM BAGIAN BARAT') THEN 'SERAM BARAT BURU'
 WHEN ${prevYearCurrMonthGrossPrabayarRev.kabupaten} IN ('KOTA JAYAPURA') THEN 'KOTA JAYAPURA'
 WHEN ${prevYearCurrMonthGrossPrabayarRev.kabupaten} IN ('JAYAPURA', 'KEEROM', 'MAMBERAMO RAYA', 'SARMI') THEN 'JAYAPURA OUTER'
 WHEN ${prevYearCurrMonthGrossPrabayarRev.kabupaten} IN (
     'BIAK',
     'BIAK NUMFOR',
     'KEPULAUAN YAPEN',
     'SUPIORI',
     'WAROPEN'
 ) THEN 'NEW BIAK NUMFOR'
 WHEN ${prevYearCurrMonthGrossPrabayarRev.kabupaten} IN (
     'JAYAWIJAYA',
     'LANNY JAYA',
     'MAMBERAMO TENGAH',
     'NDUGA',
     'PEGUNUNGAN BINTANG',
     'TOLIKARA',
     'YAHUKIMO',
     'YALIMO'
 ) THEN 'PAPUA PEGUNUNGAN'
 WHEN ${prevYearCurrMonthGrossPrabayarRev.kabupaten} IN ('MANOKWARI') THEN 'MANOKWARI'
 WHEN ${prevYearCurrMonthGrossPrabayarRev.kabupaten} IN (
     'FAKFAK',
     'FAK FAK',
     'KAIMANA',
     'MANOKWARI SELATAN',
     'PEGUNUNGAN ARFAK',
     'TELUK BINTUNI',
     'TELUK WONDAMA'
 ) THEN 'MANOKWARI OUTER'
 WHEN ${prevYearCurrMonthGrossPrabayarRev.kabupaten} IN (
     'KOTA SORONG',
     'MAYBRAT',
     'RAJA AMPAT',
     'SORONG',
     'SORONG SELATAN',
     'TAMBRAUW'
 ) THEN 'NEW SORONG RAJA AMPAT'
 WHEN ${prevYearCurrMonthGrossPrabayarRev.kabupaten} IN (
     'INTAN JAYA',
     'MIMIKA',
     'PUNCAK',
     'PUNCAK JAYA',
     'TIMIKA'
 ) THEN 'MIMIKA PUNCAK'
 WHEN ${prevYearCurrMonthGrossPrabayarRev.kabupaten} IN ('DEIYAI', 'DOGIYAI', 'NABIRE', 'PANIAI') THEN 'NABIRE'
 WHEN ${prevYearCurrMonthGrossPrabayarRev.kabupaten} IN ('ASMAT', 'BOVEN DIGOEL', 'MAPPI', 'MERAUKE') THEN 'NEW MERAUKE'
 ELSE NULL
END
    `.as('clusterName'),
          kabupaten: prevYearCurrMonthGrossPrabayarRev.kabupaten,
          rev: prevYearCurrMonthGrossPrabayarRev.rev,
        })
        .from(prevYearCurrMonthGrossPrabayarRev, { useIndex: index('mtd_dt').on(prevYearCurrMonthGrossPrabayarRev.mtdDt) })
        .where(and(
          not(eq(prevYearCurrMonthGrossPrabayarRev.brand, 'ByU')),
          and(
            inArray(prevYearCurrMonthGrossPrabayarRev.branch, ['AMBON', 'TIMIKA', 'SORONG', 'JAYAPURA']), and(
              gte(prevYearCurrMonthGrossPrabayarRev.mtdDt, firstDayOfPrevYearCurrMonth),
              lte(prevYearCurrMonthGrossPrabayarRev.mtdDt, prevYearCurrDate)
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
          currMonthTargetRev: sql<number>`CAST(SUM(${revenueGrossPrabayar[monthColumn]}) AS DOUBLE PRECISION)`.as('currMonthTargetRev')
        })
        .from(regionals)
        .leftJoin(branches, eq(regionals.id, branches.regionalId))
        .leftJoin(subbranches, eq(branches.id, subbranches.branchId))
        .leftJoin(clusters, eq(subbranches.id, clusters.subbranchId))
        .leftJoin(kabupatens, eq(clusters.id, kabupatens.clusterId))
        .leftJoin(revenueGrossPrabayar, eq(kabupatens.id, revenueGrossPrabayar.kabupatenId))
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
          kabupaten: sql<string>`${sq3.kabupaten}`.as('kabupaten'),
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
          kabupaten: sql<string>`${sq4.kabupaten}`.as('kabupaten'),
          prevYearCurrMonthKabupatenRev: sql<number>`SUM(${sq4.rev})`.as('currMonthKabupatenRev'),
          prevYearCurrMonthClusterRev: sql<number>`SUM(SUM(${sq4.rev})) OVER (PARTITION BY ${sq4.regionName}, ${sq4.branchName}, ${sq4.subbranchName}, ${sq4.clusterName})`.as('currMonthClusterRev'),
          prevYearCurrMonthSubbranchRev: sql<number>`SUM(SUM(${sq4.rev})) OVER (PARTITION BY ${sq4.regionName}, ${sq4.branchName}, ${sq4.subbranchName})`.as('currMonthSubbranchRev'),
          prevYearCurrMonthBranchRev: sql<number>`SUM(SUM(${sq4.rev})) OVER (PARTITION BY ${sq4.regionName}, ${sq4.branchName})`.as('currMonthBranchRev'),
          prevYearCurrMonthRegionalRev: sql<number>`SUM(SUM(${sq4.rev})) OVER (PARTITION BY ${sq4.regionName})`.as('currMonthRegionalRev')
        })
        .from(sq4)
        .groupBy(sql`1,2,3,4,5`)
        .prepare()

      const queryCurrYtd = currYtdGrossPrabayarRev.map(table => `
          SELECT
              CASE WHEN region_sales IN ('MALUKU DAN PAPUA', 'PUMA') THEN 'PUMA' END as region,
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
              mtd_dt,
              rev
          FROM ${table}
          WHERE brand <> 'ByU' AND branch IN ('AMBON', 'TIMIKA', 'SORONG', 'JAYAPURA')`).join(' UNION ALL ')

      const queryPrevYtd = prevYtdGrossPrabayarRev.map(table => `
          SELECT
              CASE WHEN region_sales IN ('MALUKU DAN PAPUA', 'PUMA') THEN 'PUMA' END as region,
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
              mtd_dt,
              rev
          FROM ${table}
          WHERE brand <> 'ByU' AND branch IN ('AMBON', 'TIMIKA', 'SORONG', 'JAYAPURA')`).join(' UNION ALL ')

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
                  WHERE mtd_dt BETWEEN '${currJanuaryFirst}' AND '${currDate}'
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
                  WHERE mtd_dt BETWEEN '${prevJanuaryFirst}' AND '${prevYearCurrDate}'
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

      // /var/lib/backup_mysql_2025/
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
  .get('/revenue-gross-byu', zValidator('query', z.object({ date: z.coerce.date().optional() })),
    async c => {
      const { date } = c.req.valid('query')
      const selectedDate = date ? new Date(date) : subDays(new Date(), 2)
      const month = (selectedDate.getMonth() + 1).toString()

      // KOLOM DINAMIS UNTUK MEMILIH ANTARA KOLOM `m1-m12`
      const monthColumn = `m${month}` as keyof typeof revenueByu.$inferSelect

      // VARIABLE TANGGAL UNTUK IMPORT TABEL SECARA DINAMIS
      const latestDataDate = subDays(selectedDate, 2); // - 2 days

      const currMonth = format(selectedDate, 'MM')
      const currYear = format(selectedDate, 'yyyy')
      const latestMonth = parseInt(format(selectedDate, 'M'), 10)
      const isPrevMonthLastYear = currMonth === '01'
      const prevMonth = isPrevMonthLastYear ? '12' : format(subMonths(selectedDate, 1), 'MM')
      const prevMonthYear = isPrevMonthLastYear ? format(subYears(selectedDate, 1), 'yyyy') : format(selectedDate, 'yyyy')
      const prevYear = format(subYears(selectedDate, 1), 'yyyy')

      // TABEL DINAMIS
      const currGrossPrabayarRev = dynamicResumeRevenuePumaTable(currYear, currMonth)
      const prevMonthGrossPrabayarRev = dynamicResumeRevenuePumaTable(prevMonthYear, prevMonth)
      const prevYearCurrMonthGrossPrabayarRev = dynamicResumeRevenuePumaTable(prevYear, currMonth)
      const currYtdGrossPrabayarRev = [];
      for (let month = 1; month <= latestMonth; month++) {
        const monthStr = month.toString().padStart(2, '0')
        currYtdGrossPrabayarRev.push(`resume_revenue_puma_${currYear}${monthStr}`)
      }
      const prevYtdGrossPrabayarRev = [];
      for (let month = 1; month <= latestMonth; month++) {
        const monthStr = month.toString().padStart(2, '0')
        prevYtdGrossPrabayarRev.push(`resume_revenue_puma_${prevYear}${monthStr}`)
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

      const queryCurrYtd = currYtdGrossPrabayarRev.map(table => `
        SELECT
            CASE WHEN region_sales IN ('MALUKU DAN PAPUA', 'PUMA') THEN 'PUMA' END as region,
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
            mtd_dt,
            rev
        FROM ${table}
        WHERE brand = 'ByU' AND branch IN ('AMBON', 'TIMIKA', 'SORONG', 'JAYAPURA')`).join(' UNION ALL ')

      const queryPrevYtd = prevYtdGrossPrabayarRev.map(table => `
        SELECT
            CASE WHEN region_sales IN ('MALUKU DAN PAPUA', 'PUMA') THEN 'PUMA' END as region,
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
            mtd_dt,
            rev
        FROM ${table}
        WHERE brand = 'ByU' AND branch IN ('AMBON', 'TIMIKA', 'SORONG', 'JAYAPURA')`).join(' UNION ALL ')

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
                WHERE mtd_dt BETWEEN '${currJanuaryFirst}' AND '${currDate}'
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
                WHERE mtd_dt BETWEEN '${prevJanuaryFirst}' AND '${prevYearCurrDate}'
                GROUP BY 1, 2, 3, 4, 5
                    `

      const sq2 = db2
        .select({
          regionName: currGrossPrabayarRev.regionSales,
          branchName: sql<string>`
CASE
 WHEN ${currGrossPrabayarRev.kabupaten} IN (
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
 WHEN ${currGrossPrabayarRev.kabupaten} IN (
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
 WHEN ${currGrossPrabayarRev.kabupaten} IN (
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
 WHEN ${currGrossPrabayarRev.kabupaten} IN (
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
 WHEN ${currGrossPrabayarRev.kabupaten} IN (
     'AMBON',
     'KOTA AMBON',
     'MALUKU TENGAH',
     'SERAM BAGIAN TIMUR'
 ) THEN 'AMBON'
 WHEN ${currGrossPrabayarRev.kabupaten} IN (
     'KEPULAUAN ARU',
     'KOTA TUAL',
     'MALUKU BARAT DAYA',
     'MALUKU TENGGARA',
     'MALUKU TENGGARA BARAT',
     'KEPULAUAN TANIMBAR'
 ) THEN 'KEPULAUAN AMBON'
 WHEN ${currGrossPrabayarRev.kabupaten} IN ('BURU', 'BURU SELATAN', 'SERAM BAGIAN BARAT') THEN 'SERAM BURU'
 WHEN ${currGrossPrabayarRev.kabupaten} IN ('KOTA JAYAPURA') THEN 'JAYAPURA'
 WHEN ${currGrossPrabayarRev.kabupaten} IN (
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
 WHEN ${currGrossPrabayarRev.kabupaten} IN ('MANOKWARI') THEN 'MANOKWARI'
 WHEN ${currGrossPrabayarRev.kabupaten} IN (
     'FAKFAK',
     'FAK FAK',
     'KAIMANA',
     'MANOKWARI SELATAN',
     'PEGUNUNGAN ARFAK',
     'TELUK BINTUNI',
     'TELUK WONDAMA'
 ) THEN 'MANOKWARI OUTER'
 WHEN ${currGrossPrabayarRev.kabupaten} IN (
     'KOTA SORONG',
     'MAYBRAT',
     'RAJA AMPAT',
     'SORONG',
     'SORONG SELATAN',
     'TAMBRAUW'
 ) THEN 'SORONG RAJA AMPAT'
 WHEN ${currGrossPrabayarRev.kabupaten} IN ('ASMAT', 'BOVEN DIGOEL', 'MAPPI', 'MERAUKE') THEN 'MERAUKE'
 WHEN ${currGrossPrabayarRev.kabupaten} IN (
     'INTAN JAYA',
     'MIMIKA',
     'PUNCAK',
     'PUNCAK JAYA',
     'TIMIKA'
 ) THEN 'MIMIKA'
 WHEN ${currGrossPrabayarRev.kabupaten} IN ('DEIYAI', 'DOGIYAI', 'NABIRE', 'PANIAI') THEN 'NABIRE'
 ELSE NULL
END
    `.as('subbranchName'),
          clusterName: sql<string>`
CASE
 WHEN ${currGrossPrabayarRev.kabupaten} IN (
     'KOTA AMBON',
     'MALUKU TENGAH',
     'SERAM BAGIAN TIMUR'
 ) THEN 'AMBON'
 WHEN ${currGrossPrabayarRev.kabupaten} IN (
     'KEPULAUAN ARU',
     'KOTA TUAL',
     'MALUKU BARAT DAYA',
     'MALUKU TENGGARA',
     'MALUKU TENGGARA BARAT',
     'KEPULAUAN TANIMBAR'
 ) THEN 'KEPULAUAN TUAL'
 WHEN ${currGrossPrabayarRev.kabupaten} IN ('BURU', 'BURU SELATAN', 'SERAM BAGIAN BARAT') THEN 'SERAM BARAT BURU'
 WHEN ${currGrossPrabayarRev.kabupaten} IN ('KOTA JAYAPURA') THEN 'KOTA JAYAPURA'
 WHEN ${currGrossPrabayarRev.kabupaten} IN ('JAYAPURA', 'KEEROM', 'MAMBERAMO RAYA', 'SARMI') THEN 'JAYAPURA OUTER'
 WHEN ${currGrossPrabayarRev.kabupaten} IN (
     'BIAK',
     'BIAK NUMFOR',
     'KEPULAUAN YAPEN',
     'SUPIORI',
     'WAROPEN'
 ) THEN 'NEW BIAK NUMFOR'
 WHEN ${currGrossPrabayarRev.kabupaten} IN (
     'JAYAWIJAYA',
     'LANNY JAYA',
     'MAMBERAMO TENGAH',
     'NDUGA',
     'PEGUNUNGAN BINTANG',
     'TOLIKARA',
     'YAHUKIMO',
     'YALIMO'
 ) THEN 'PAPUA PEGUNUNGAN'
 WHEN ${currGrossPrabayarRev.kabupaten} IN ('MANOKWARI') THEN 'MANOKWARI'
 WHEN ${currGrossPrabayarRev.kabupaten} IN (
     'FAKFAK',
     'FAK FAK',
     'KAIMANA',
     'MANOKWARI SELATAN',
     'PEGUNUNGAN ARFAK',
     'TELUK BINTUNI',
     'TELUK WONDAMA'
 ) THEN 'MANOKWARI OUTER'
 WHEN ${currGrossPrabayarRev.kabupaten} IN (
     'KOTA SORONG',
     'MAYBRAT',
     'RAJA AMPAT',
     'SORONG',
     'SORONG SELATAN',
     'TAMBRAUW'
 ) THEN 'NEW SORONG RAJA AMPAT'
 WHEN ${currGrossPrabayarRev.kabupaten} IN (
     'INTAN JAYA',
     'MIMIKA',
     'PUNCAK',
     'PUNCAK JAYA',
     'TIMIKA'
 ) THEN 'MIMIKA PUNCAK'
 WHEN ${currGrossPrabayarRev.kabupaten} IN ('DEIYAI', 'DOGIYAI', 'NABIRE', 'PANIAI') THEN 'NABIRE'
 WHEN ${currGrossPrabayarRev.kabupaten} IN ('ASMAT', 'BOVEN DIGOEL', 'MAPPI', 'MERAUKE') THEN 'NEW MERAUKE'
 ELSE NULL
END
    `.as('clusterName'),
          kabupaten: currGrossPrabayarRev.kabupaten,
          rev: currGrossPrabayarRev.rev,
        })
        .from(currGrossPrabayarRev, { useIndex: index('mtd_dt').on(currGrossPrabayarRev.mtdDt).using('btree') })
        .where(and(
          eq(currGrossPrabayarRev.brand, 'ByU'),
          and(
            inArray(currGrossPrabayarRev.branch, ['AMBON', 'TIMIKA', 'SORONG', 'JAYAPURA']),
            and(
              gte(currGrossPrabayarRev.mtdDt, firstDayOfCurrMonth),
              lte(currGrossPrabayarRev.mtdDt, currDate)
            )
          )
        ))
        .as('sq2')

      const sq3 = db2
        .select({
          regionName: prevMonthGrossPrabayarRev.regionSales,
          branchName: sql<string>`
CASE
 WHEN ${prevMonthGrossPrabayarRev.kabupaten} IN (
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
 WHEN ${prevMonthGrossPrabayarRev.kabupaten} IN (
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
 WHEN ${prevMonthGrossPrabayarRev.kabupaten} IN (
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
 WHEN ${prevMonthGrossPrabayarRev.kabupaten} IN (
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
 WHEN ${prevMonthGrossPrabayarRev.kabupaten} IN (
     'AMBON',
     'KOTA AMBON',
     'MALUKU TENGAH',
     'SERAM BAGIAN TIMUR'
 ) THEN 'AMBON'
 WHEN ${prevMonthGrossPrabayarRev.kabupaten} IN (
     'KEPULAUAN ARU',
     'KOTA TUAL',
     'MALUKU BARAT DAYA',
     'MALUKU TENGGARA',
     'MALUKU TENGGARA BARAT',
     'KEPULAUAN TANIMBAR'
 ) THEN 'KEPULAUAN AMBON'
 WHEN ${prevMonthGrossPrabayarRev.kabupaten} IN ('BURU', 'BURU SELATAN', 'SERAM BAGIAN BARAT') THEN 'SERAM BURU'
 WHEN ${prevMonthGrossPrabayarRev.kabupaten} IN ('KOTA JAYAPURA') THEN 'JAYAPURA'
 WHEN ${prevMonthGrossPrabayarRev.kabupaten} IN (
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
 WHEN ${prevMonthGrossPrabayarRev.kabupaten} IN ('MANOKWARI') THEN 'MANOKWARI'
 WHEN ${prevMonthGrossPrabayarRev.kabupaten} IN (
     'FAKFAK',
     'FAK FAK',
     'KAIMANA',
     'MANOKWARI SELATAN',
     'PEGUNUNGAN ARFAK',
     'TELUK BINTUNI',
     'TELUK WONDAMA'
 ) THEN 'MANOKWARI OUTER'
 WHEN ${prevMonthGrossPrabayarRev.kabupaten} IN (
     'KOTA SORONG',
     'MAYBRAT',
     'RAJA AMPAT',
     'SORONG',
     'SORONG SELATAN',
     'TAMBRAUW'
 ) THEN 'SORONG RAJA AMPAT'
 WHEN ${prevMonthGrossPrabayarRev.kabupaten} IN ('ASMAT', 'BOVEN DIGOEL', 'MAPPI', 'MERAUKE') THEN 'MERAUKE'
 WHEN ${prevMonthGrossPrabayarRev.kabupaten} IN (
     'INTAN JAYA',
     'MIMIKA',
     'PUNCAK',
     'PUNCAK JAYA',
     'TIMIKA'
 ) THEN 'MIMIKA'
 WHEN ${prevMonthGrossPrabayarRev.kabupaten} IN ('DEIYAI', 'DOGIYAI', 'NABIRE', 'PANIAI') THEN 'NABIRE'
 ELSE NULL
END
    `.as('subbranchName'),
          clusterName: sql<string>`
CASE
 WHEN ${prevMonthGrossPrabayarRev.kabupaten} IN (
     'KOTA AMBON',
     'MALUKU TENGAH',
     'SERAM BAGIAN TIMUR'
 ) THEN 'AMBON'
 WHEN ${prevMonthGrossPrabayarRev.kabupaten} IN (
     'KEPULAUAN ARU',
     'KOTA TUAL',
     'MALUKU BARAT DAYA',
     'MALUKU TENGGARA',
     'MALUKU TENGGARA BARAT',
     'KEPULAUAN TANIMBAR'
 ) THEN 'KEPULAUAN TUAL'
 WHEN ${prevMonthGrossPrabayarRev.kabupaten} IN ('BURU', 'BURU SELATAN', 'SERAM BAGIAN BARAT') THEN 'SERAM BARAT BURU'
 WHEN ${prevMonthGrossPrabayarRev.kabupaten} IN ('KOTA JAYAPURA') THEN 'KOTA JAYAPURA'
 WHEN ${prevMonthGrossPrabayarRev.kabupaten} IN ('JAYAPURA', 'KEEROM', 'MAMBERAMO RAYA', 'SARMI') THEN 'JAYAPURA OUTER'
 WHEN ${prevMonthGrossPrabayarRev.kabupaten} IN (
     'BIAK',
     'BIAK NUMFOR',
     'KEPULAUAN YAPEN',
     'SUPIORI',
     'WAROPEN'
 ) THEN 'NEW BIAK NUMFOR'
 WHEN ${prevMonthGrossPrabayarRev.kabupaten} IN (
     'JAYAWIJAYA',
     'LANNY JAYA',
     'MAMBERAMO TENGAH',
     'NDUGA',
     'PEGUNUNGAN BINTANG',
     'TOLIKARA',
     'YAHUKIMO',
     'YALIMO'
 ) THEN 'PAPUA PEGUNUNGAN'
 WHEN ${prevMonthGrossPrabayarRev.kabupaten} IN ('MANOKWARI') THEN 'MANOKWARI'
 WHEN ${prevMonthGrossPrabayarRev.kabupaten} IN (
     'FAKFAK',
     'FAK FAK',
     'KAIMANA',
     'MANOKWARI SELATAN',
     'PEGUNUNGAN ARFAK',
     'TELUK BINTUNI',
     'TELUK WONDAMA'
 ) THEN 'MANOKWARI OUTER'
 WHEN ${prevMonthGrossPrabayarRev.kabupaten} IN (
     'KOTA SORONG',
     'MAYBRAT',
     'RAJA AMPAT',
     'SORONG',
     'SORONG SELATAN',
     'TAMBRAUW'
 ) THEN 'NEW SORONG RAJA AMPAT'
 WHEN ${prevMonthGrossPrabayarRev.kabupaten} IN (
     'INTAN JAYA',
     'MIMIKA',
     'PUNCAK',
     'PUNCAK JAYA',
     'TIMIKA'
 ) THEN 'MIMIKA PUNCAK'
 WHEN ${prevMonthGrossPrabayarRev.kabupaten} IN ('DEIYAI', 'DOGIYAI', 'NABIRE', 'PANIAI') THEN 'NABIRE'
 WHEN ${prevMonthGrossPrabayarRev.kabupaten} IN ('ASMAT', 'BOVEN DIGOEL', 'MAPPI', 'MERAUKE') THEN 'NEW MERAUKE'
 ELSE NULL
END
    `.as('clusterName'),
          kabupaten: prevMonthGrossPrabayarRev.kabupaten,
          rev: prevMonthGrossPrabayarRev.rev,
        })
        .from(prevMonthGrossPrabayarRev, { useIndex: index('mtd_dt').on(prevMonthGrossPrabayarRev.mtdDt).using('btree') })
        .where(and(
          eq(prevMonthGrossPrabayarRev.brand, 'ByU'),
          and(
            inArray(prevMonthGrossPrabayarRev.branch, ['AMBON', 'TIMIKA', 'SORONG', 'JAYAPURA']),
            and(
              gte(prevMonthGrossPrabayarRev.mtdDt, firstDayOfPrevMonth),
              lte(prevMonthGrossPrabayarRev.mtdDt, prevDate)
            )
          )
        ))
        .as('sq3')

      const sq4 = db2
        .select({
          regionName: sql<string>`CASE WHEN ${prevYearCurrMonthGrossPrabayarRev.regionSales} IN ('PUMA', 'MALUKU DAN PAPUA') THEN 'PUMA' END`.as('regionaName'),
          branchName: sql<string>`
CASE
 WHEN ${prevYearCurrMonthGrossPrabayarRev.kabupaten} IN (
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
 WHEN ${prevYearCurrMonthGrossPrabayarRev.kabupaten} IN (
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
 WHEN ${prevYearCurrMonthGrossPrabayarRev.kabupaten} IN (
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
 WHEN ${prevYearCurrMonthGrossPrabayarRev.kabupaten} IN (
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
 WHEN ${prevYearCurrMonthGrossPrabayarRev.kabupaten} IN (
     'AMBON',
     'KOTA AMBON',
     'MALUKU TENGAH',
     'SERAM BAGIAN TIMUR'
 ) THEN 'AMBON'
 WHEN ${prevYearCurrMonthGrossPrabayarRev.kabupaten} IN (
     'KEPULAUAN ARU',
     'KOTA TUAL',
     'MALUKU BARAT DAYA',
     'MALUKU TENGGARA',
     'MALUKU TENGGARA BARAT',
     'KEPULAUAN TANIMBAR'
 ) THEN 'KEPULAUAN AMBON'
 WHEN ${prevYearCurrMonthGrossPrabayarRev.kabupaten} IN ('BURU', 'BURU SELATAN', 'SERAM BAGIAN BARAT') THEN 'SERAM BURU'
 WHEN ${prevYearCurrMonthGrossPrabayarRev.kabupaten} IN ('KOTA JAYAPURA') THEN 'JAYAPURA'
 WHEN ${prevYearCurrMonthGrossPrabayarRev.kabupaten} IN (
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
 WHEN ${prevYearCurrMonthGrossPrabayarRev.kabupaten} IN ('MANOKWARI') THEN 'MANOKWARI'
 WHEN ${prevYearCurrMonthGrossPrabayarRev.kabupaten} IN (
     'FAKFAK',
     'FAK FAK',
     'KAIMANA',
     'MANOKWARI SELATAN',
     'PEGUNUNGAN ARFAK',
     'TELUK BINTUNI',
     'TELUK WONDAMA'
 ) THEN 'MANOKWARI OUTER'
 WHEN ${prevYearCurrMonthGrossPrabayarRev.kabupaten} IN (
     'KOTA SORONG',
     'MAYBRAT',
     'RAJA AMPAT',
     'SORONG',
     'SORONG SELATAN',
     'TAMBRAUW'
 ) THEN 'SORONG RAJA AMPAT'
 WHEN ${prevYearCurrMonthGrossPrabayarRev.kabupaten} IN ('ASMAT', 'BOVEN DIGOEL', 'MAPPI', 'MERAUKE') THEN 'MERAUKE'
 WHEN ${prevYearCurrMonthGrossPrabayarRev.kabupaten} IN (
     'INTAN JAYA',
     'MIMIKA',
     'PUNCAK',
     'PUNCAK JAYA',
     'TIMIKA'
 ) THEN 'MIMIKA'
 WHEN ${prevYearCurrMonthGrossPrabayarRev.kabupaten} IN ('DEIYAI', 'DOGIYAI', 'NABIRE', 'PANIAI') THEN 'NABIRE'
 ELSE NULL
END
    `.as('subbranchName'),
          clusterName: sql<string>`
CASE
 WHEN ${prevYearCurrMonthGrossPrabayarRev.kabupaten} IN (
     'KOTA AMBON',
     'MALUKU TENGAH',
     'SERAM BAGIAN TIMUR'
 ) THEN 'AMBON'
 WHEN ${prevYearCurrMonthGrossPrabayarRev.kabupaten} IN (
     'KEPULAUAN ARU',
     'KOTA TUAL',
     'MALUKU BARAT DAYA',
     'MALUKU TENGGARA',
     'MALUKU TENGGARA BARAT',
     'KEPULAUAN TANIMBAR'
 ) THEN 'KEPULAUAN TUAL'
 WHEN ${prevYearCurrMonthGrossPrabayarRev.kabupaten} IN ('BURU', 'BURU SELATAN', 'SERAM BAGIAN BARAT') THEN 'SERAM BARAT BURU'
 WHEN ${prevYearCurrMonthGrossPrabayarRev.kabupaten} IN ('KOTA JAYAPURA') THEN 'KOTA JAYAPURA'
 WHEN ${prevYearCurrMonthGrossPrabayarRev.kabupaten} IN ('JAYAPURA', 'KEEROM', 'MAMBERAMO RAYA', 'SARMI') THEN 'JAYAPURA OUTER'
 WHEN ${prevYearCurrMonthGrossPrabayarRev.kabupaten} IN (
     'BIAK',
     'BIAK NUMFOR',
     'KEPULAUAN YAPEN',
     'SUPIORI',
     'WAROPEN'
 ) THEN 'NEW BIAK NUMFOR'
 WHEN ${prevYearCurrMonthGrossPrabayarRev.kabupaten} IN (
     'JAYAWIJAYA',
     'LANNY JAYA',
     'MAMBERAMO TENGAH',
     'NDUGA',
     'PEGUNUNGAN BINTANG',
     'TOLIKARA',
     'YAHUKIMO',
     'YALIMO'
 ) THEN 'PAPUA PEGUNUNGAN'
 WHEN ${prevYearCurrMonthGrossPrabayarRev.kabupaten} IN ('MANOKWARI') THEN 'MANOKWARI'
 WHEN ${prevYearCurrMonthGrossPrabayarRev.kabupaten} IN (
     'FAKFAK',
     'FAK FAK',
     'KAIMANA',
     'MANOKWARI SELATAN',
     'PEGUNUNGAN ARFAK',
     'TELUK BINTUNI',
     'TELUK WONDAMA'
 ) THEN 'MANOKWARI OUTER'
 WHEN ${prevYearCurrMonthGrossPrabayarRev.kabupaten} IN (
     'KOTA SORONG',
     'MAYBRAT',
     'RAJA AMPAT',
     'SORONG',
     'SORONG SELATAN',
     'TAMBRAUW'
 ) THEN 'NEW SORONG RAJA AMPAT'
 WHEN ${prevYearCurrMonthGrossPrabayarRev.kabupaten} IN (
     'INTAN JAYA',
     'MIMIKA',
     'PUNCAK',
     'PUNCAK JAYA',
     'TIMIKA'
 ) THEN 'MIMIKA PUNCAK'
 WHEN ${prevYearCurrMonthGrossPrabayarRev.kabupaten} IN ('DEIYAI', 'DOGIYAI', 'NABIRE', 'PANIAI') THEN 'NABIRE'
 WHEN ${prevYearCurrMonthGrossPrabayarRev.kabupaten} IN ('ASMAT', 'BOVEN DIGOEL', 'MAPPI', 'MERAUKE') THEN 'NEW MERAUKE'
 ELSE NULL
END
    `.as('clusterName'),
          kabupaten: prevYearCurrMonthGrossPrabayarRev.kabupaten,
          rev: prevYearCurrMonthGrossPrabayarRev.rev,
        })
        .from(prevYearCurrMonthGrossPrabayarRev, { useIndex: index('mtd_dt').on(prevYearCurrMonthGrossPrabayarRev.mtdDt).using('btree') })
        .where(and(
          eq(prevYearCurrMonthGrossPrabayarRev.brand, 'ByU'),
          and(
            inArray(prevYearCurrMonthGrossPrabayarRev.branch, ['AMBON', 'TIMIKA', 'SORONG', 'JAYAPURA']),
            and(
              gte(prevYearCurrMonthGrossPrabayarRev.mtdDt, firstDayOfPrevYearCurrMonth),
              lte(prevYearCurrMonthGrossPrabayarRev.mtdDt, prevYearCurrDate)
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
          currMonthTargetRev: sql<number>`CAST(SUM(${revenueByu[monthColumn]}) AS DOUBLE PRECISION)`.as('currMonthTargetRev')
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
          kabupaten: sql<string>`${sq3.kabupaten}`.as('kabupaten'),
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
          kabupaten: sql<string>`${sq4.kabupaten}`.as('kabupaten'),
          prevYearCurrMonthKabupatenRev: sql<number>`SUM(${sq4.rev})`.as('currMonthKabupatenRev'),
          prevYearCurrMonthClusterRev: sql<number>`SUM(SUM(${sq4.rev})) OVER (PARTITION BY ${sq4.regionName}, ${sq4.branchName}, ${sq4.subbranchName}, ${sq4.clusterName})`.as('currMonthClusterRev'),
          prevYearCurrMonthSubbranchRev: sql<number>`SUM(SUM(${sq4.rev})) OVER (PARTITION BY ${sq4.regionName}, ${sq4.branchName}, ${sq4.subbranchName})`.as('currMonthSubbranchRev'),
          prevYearCurrMonthBranchRev: sql<number>`SUM(SUM(${sq4.rev})) OVER (PARTITION BY ${sq4.regionName}, ${sq4.branchName})`.as('currMonthBranchRev'),
          prevYearCurrMonthRegionalRev: sql<number>`SUM(SUM(${sq4.rev})) OVER (PARTITION BY ${sq4.regionName})`.as('currMonthRegionalRev')
        })
        .from(sq4)
        .groupBy(sql`1,2,3,4,5`)
        .prepare()

      const [targetRevenue, currMonthRevenue, prevMonthRevenue, prevYearCurrMonthRevenue, currYtdRev, prevYtdRev] = await Promise.all([
        p1.execute(),
        p2.execute(),
        p3.execute(),
        p4.execute(),
        db2.execute(sql.raw(sq)),
        db2.execute(sql.raw(sq5)),
      ])

      // /var/lib/backup_mysql_2025/
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

export default app;

