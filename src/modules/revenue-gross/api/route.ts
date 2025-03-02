import { Hono } from "hono";
import { z } from 'zod'
import { and, inArray, asc, between, eq, sql } from "drizzle-orm";
import { subMonths, subDays, format, subYears } from 'date-fns'

import { db, db2 } from "@/db";
import {
  branches,
  regionals,
  clusters,
  kabupatens,
  subbranches,
  revenueGrosses,
} from "@/db/schema";
import { dynamicResumeRevenuePumaTable } from "@/db/schema2";
import { zValidator } from "@/lib/validator-wrapper";
import { index } from "drizzle-orm/mysql-core";

const app = new Hono().get("/", zValidator('query', z.object({ date: z.string().optional() })),
  async (c) => {
    const { date } = c.req.valid('query')
    const selectedDate = date ? new Date(date) : new Date()
    const month = (subDays(selectedDate, 2).getMonth() + 1).toString()

    // KOLOM DINAMIS UNTUK MEMILIH ANTARA KOLOM `m1-m12`
    const monthColumn = `m${month}` as keyof typeof revenueGrosses.$inferSelect

    // VARIABLE TANGGAL UNTUK IMPORT TABEL SECARA DINAMIS
    const latestDataDate = subDays(selectedDate, 2); // - 2 days

    const currMonth = format(latestDataDate, 'MM')
    const currYear = format(latestDataDate, 'yyyy')
    const isPrevMonthLastYear = currMonth === '01'
    const prevMonth = isPrevMonthLastYear ? '12' : format(subMonths(latestDataDate, 1), 'MM')
    const prevMonthYear = isPrevMonthLastYear ? format(subYears(latestDataDate, 1), 'yyyy') : format(latestDataDate, 'yyyy')
    const prevYear = format(subYears(latestDataDate, 1), 'yyyy')

    // TABEL DINAMIS
    const currGrossPrabayarRev = dynamicResumeRevenuePumaTable(currYear, currMonth)
    const prevMonthGrossPrabayarRev = dynamicResumeRevenuePumaTable(prevMonthYear, prevMonth)
    const prevYearCurrMonthGrossPrabayarRev = dynamicResumeRevenuePumaTable(prevYear, currMonth)

    // VARIABLE TANGGAL
    const firstDayOfCurrMonth = format(new Date(latestDataDate.getFullYear(), latestDataDate.getMonth(), 1), 'yyyy-MM-dd')
    const firstDayOfPrevMonth = format(subMonths(new Date(latestDataDate.getFullYear(), latestDataDate.getMonth(), 1), 1), 'yyyy-MM-dd')
    const firstDayOfPrevYearCurrMonth = format(subYears(new Date(latestDataDate.getFullYear(), latestDataDate.getMonth(), 1), 1), 'yyyy-MM-dd')
    const currDate = format(latestDataDate, 'yyyy-MM-dd')
    const prevDate = format(subMonths(latestDataDate, 1), 'yyyy-MM-dd')
    const prevYearCurrDate = format(subYears(latestDataDate, 1), 'yyyy-MM-dd')

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
      .from(currGrossPrabayarRev)
      .where(and(
        inArray(currGrossPrabayarRev.branch, ['AMBON', 'TIMIKA', 'SORONG', 'JAYAPURA']),
        between(currGrossPrabayarRev.mtdDt, firstDayOfCurrMonth, currDate)
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
      .from(prevMonthGrossPrabayarRev)
      .where(
        and(
          inArray(prevMonthGrossPrabayarRev.branch, ['AMBON', 'TIMIKA', 'SORONG', 'JAYAPURA']),
          between(prevMonthGrossPrabayarRev.mtdDt, firstDayOfPrevMonth, prevDate)
        )
      )
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
      .from(prevYearCurrMonthGrossPrabayarRev)
      .where(and(
        inArray(prevYearCurrMonthGrossPrabayarRev.branch, ['AMBON', 'TIMIKA', 'SORONG', 'JAYAPURA']),
        between(prevYearCurrMonthGrossPrabayarRev.mtdDt, firstDayOfPrevYearCurrMonth, prevYearCurrDate)
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

    const [targetRevenue, currMonthRevenue, prevMonthRevenue, prevYearCurrMonthRevenue] = await Promise.all([
      p1.execute(),
      p2.execute(),
      p3.execute(),
      p4.execute()
    ]);

    const regionalsMap = new Map();

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
          prevMonthRevenue: 0,
          prevYearCurrMonthRevenue: 0
        }), cluster.kabupatens.get(kabupatenName));
      kabupaten.prevYearCurrMonthRevenue = Number(row.prevYearCurrMonthKabupatenRev)
    })

    const finalDataRevenue = Array.from(regionalsMap.values()).map((regional: any) => ({
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
  });

export default app;

