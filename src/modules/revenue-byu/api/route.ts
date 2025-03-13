import { Hono } from "hono";
import { z } from 'zod'
import { and, asc, between, eq, isNotNull, sql } from "drizzle-orm";
import { subMonths, subDays, format, subYears, endOfMonth, startOfMonth } from 'date-fns'

import { db, db3 } from "@/db";
import {
    branches,
    regionals,
    clusters,
    kabupatens,
    subbranches,
    revenueByu,
} from "@/db/schema";
import { zValidator } from "@/lib/validator-wrapper";
import { dynamicByuTable } from "@/db/schema3";

const app = new Hono().get("/",
    zValidator('query', z.object({ date: z.string().optional() })),
    async (c) => {
        const { date } = c.req.valid('query')
        const selectedDate = date ? new Date(date) : new Date()
        const month = (subDays(selectedDate, 2).getMonth() + 1).toString()

        // KOLOM DINAMIS UNTUK MEMILIH ANTARA KOLOM `m1-m12`
        const monthColumn = `m${month}` as keyof typeof revenueByu.$inferSelect

        // VARIABLE TANGGAL UNTUK IMPORT TABEL SECARA DINAMIS
        const latestDataDate = subDays(selectedDate, 2);

        const currMonth = format(selectedDate, 'MM')
        const currYear = format(selectedDate, 'yyyy')
        const isPrevMonthLastYear = currMonth === '01'
        const prevMonth = isPrevMonthLastYear ? '12' : format(subMonths(selectedDate, 1), 'MM')
        const prevMonthYear = isPrevMonthLastYear ? format(subYears(selectedDate, 1), 'yyyy') : format(selectedDate, 'yyyy')
        const prevYear = format(subYears(selectedDate, 1), 'yyyy')

        // TABEL DINAMIS
        const currRevByu = dynamicByuTable(currYear, currMonth)
        const prevMonthRevByu = dynamicByuTable(prevMonthYear, prevMonth)
        const prevYearCurrMonthRevByu = dynamicByuTable(prevYear, currMonth)

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

        const sq2 = db3
            .select({
                regionName: sql<string>`CASE WHEN ${currRevByu.regionSales} IN ('MALUKU DAN PAPUA', 'PUMA') THEN 'PUMA' END`.as('regionName'),
                branchName: sql<string>`
             CASE
                 WHEN ${currRevByu.kabupaten} IN (
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
                 WHEN ${currRevByu.kabupaten} IN (
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
                 WHEN ${currRevByu.kabupaten} IN (
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
                 WHEN ${currRevByu.kabupaten} IN (
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
                 WHEN ${currRevByu.kabupaten} IN (
                     'AMBON',
                     'KOTA AMBON',
                     'MALUKU TENGAH',
                     'SERAM BAGIAN TIMUR'
                 ) THEN 'AMBON'
                 WHEN ${currRevByu.kabupaten} IN (
                     'KEPULAUAN ARU',
                     'KOTA TUAL',
                     'MALUKU BARAT DAYA',
                     'MALUKU TENGGARA',
                     'MALUKU TENGGARA BARAT',
                     'KEPULAUAN TANIMBAR'
                 ) THEN 'KEPULAUAN AMBON'
                 WHEN ${currRevByu.kabupaten} IN ('BURU', 'BURU SELATAN', 'SERAM BAGIAN BARAT') THEN 'SERAM BURU'
                 WHEN ${currRevByu.kabupaten} IN ('KOTA JAYAPURA') THEN 'JAYAPURA'
                 WHEN ${currRevByu.kabupaten} IN (
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
                 WHEN ${currRevByu.kabupaten} IN ('MANOKWARI') THEN 'MANOKWARI'
                 WHEN ${currRevByu.kabupaten} IN (
                     'FAKFAK',
                     'FAK FAK',
                     'KAIMANA',
                     'MANOKWARI SELATAN',
                     'PEGUNUNGAN ARFAK',
                     'TELUK BINTUNI',
                     'TELUK WONDAMA'
                 ) THEN 'MANOKWARI OUTER'
                 WHEN ${currRevByu.kabupaten} IN (
                     'KOTA SORONG',
                     'MAYBRAT',
                     'RAJA AMPAT',
                     'SORONG',
                     'SORONG SELATAN',
                     'TAMBRAUW'
                 ) THEN 'SORONG RAJA AMPAT'
                 WHEN ${currRevByu.kabupaten} IN ('ASMAT', 'BOVEN DIGOEL', 'MAPPI', 'MERAUKE') THEN 'MERAUKE'
                 WHEN ${currRevByu.kabupaten} IN (
                     'INTAN JAYA',
                     'MIMIKA',
                     'PUNCAK',
                     'PUNCAK JAYA',
                     'TIMIKA'
                 ) THEN 'MIMIKA'
                 WHEN ${currRevByu.kabupaten} IN ('DEIYAI', 'DOGIYAI', 'NABIRE', 'PANIAI') THEN 'NABIRE'
                 ELSE NULL
             END
                    `.as('subbranchName'),
                clusterName: sql<string>`
             CASE
                 WHEN ${currRevByu.kabupaten} IN (
                     'KOTA AMBON',
                     'MALUKU TENGAH',
                     'SERAM BAGIAN TIMUR'
                 ) THEN 'AMBON'
                 WHEN ${currRevByu.kabupaten} IN (
                     'KEPULAUAN ARU',
                     'KOTA TUAL',
                     'MALUKU BARAT DAYA',
                     'MALUKU TENGGARA',
                     'MALUKU TENGGARA BARAT',
                     'KEPULAUAN TANIMBAR'
                 ) THEN 'KEPULAUAN TUAL'
                 WHEN ${currRevByu.kabupaten} IN ('BURU', 'BURU SELATAN', 'SERAM BAGIAN BARAT') THEN 'SERAM BARAT BURU'
                 WHEN ${currRevByu.kabupaten} IN ('KOTA JAYAPURA') THEN 'KOTA JAYAPURA'
                 WHEN ${currRevByu.kabupaten} IN ('JAYAPURA', 'KEEROM', 'MAMBERAMO RAYA', 'SARMI') THEN 'JAYAPURA OUTER'
                 WHEN ${currRevByu.kabupaten} IN (
                     'BIAK',
                     'BIAK NUMFOR',
                     'KEPULAUAN YAPEN',
                     'SUPIORI',
                     'WAROPEN'
                 ) THEN 'NEW BIAK NUMFOR'
                 WHEN ${currRevByu.kabupaten} IN (
                     'JAYAWIJAYA',
                     'LANNY JAYA',
                     'MAMBERAMO TENGAH',
                     'NDUGA',
                     'PEGUNUNGAN BINTANG',
                     'TOLIKARA',
                     'YAHUKIMO',
                     'YALIMO'
                 ) THEN 'PAPUA PEGUNUNGAN'
                 WHEN ${currRevByu.kabupaten} IN ('MANOKWARI') THEN 'MANOKWARI'
                 WHEN ${currRevByu.kabupaten} IN (
                     'FAKFAK',
                     'FAK FAK',
                     'KAIMANA',
                     'MANOKWARI SELATAN',
                     'PEGUNUNGAN ARFAK',
                     'TELUK BINTUNI',
                     'TELUK WONDAMA'
                 ) THEN 'MANOKWARI OUTER'
                 WHEN ${currRevByu.kabupaten} IN (
                     'KOTA SORONG',
                     'MAYBRAT',
                     'RAJA AMPAT',
                     'SORONG',
                     'SORONG SELATAN',
                     'TAMBRAUW'
                 ) THEN 'NEW SORONG RAJA AMPAT'
                 WHEN ${currRevByu.kabupaten} IN (
                     'INTAN JAYA',
                     'MIMIKA',
                     'PUNCAK',
                     'PUNCAK JAYA',
                     'TIMIKA'
                 ) THEN 'MIMIKA PUNCAK'
                 WHEN ${currRevByu.kabupaten} IN ('DEIYAI', 'DOGIYAI', 'NABIRE', 'PANIAI') THEN 'NABIRE'
                 WHEN ${currRevByu.kabupaten} IN ('ASMAT', 'BOVEN DIGOEL', 'MAPPI', 'MERAUKE') THEN 'NEW MERAUKE'
                 ELSE NULL
             END
                    `.as('clusterName'),
                kabupaten: currRevByu.kabupaten,
                rev: currRevByu.rev,
            })
            .from(currRevByu)
            .where(between(currRevByu.eventDate, firstDayOfCurrMonth, currDate))
            .as('sq2')

        const sq3 = db3
            .select({
                regionName: sql<string>`CASE WHEN ${prevMonthRevByu.regionSales} IN ('MALUKU DAN PAPUA', 'PUMA') THEN 'PUMA' END`.as('regionName'),
                branchName: sql<string>`
             CASE
                 WHEN ${prevMonthRevByu.kabupaten} IN (
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
                 WHEN ${prevMonthRevByu.kabupaten} IN (
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
                 WHEN ${prevMonthRevByu.kabupaten} IN (
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
                 WHEN ${prevMonthRevByu.kabupaten} IN (
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
                 WHEN ${prevMonthRevByu.kabupaten} IN (
                     'AMBON',
                     'KOTA AMBON',
                     'MALUKU TENGAH',
                     'SERAM BAGIAN TIMUR'
                 ) THEN 'AMBON'
                 WHEN ${prevMonthRevByu.kabupaten} IN (
                     'KEPULAUAN ARU',
                     'KOTA TUAL',
                     'MALUKU BARAT DAYA',
                     'MALUKU TENGGARA',
                     'MALUKU TENGGARA BARAT',
                     'KEPULAUAN TANIMBAR'
                 ) THEN 'KEPULAUAN AMBON'
                 WHEN ${prevMonthRevByu.kabupaten} IN ('BURU', 'BURU SELATAN', 'SERAM BAGIAN BARAT') THEN 'SERAM BURU'
                 WHEN ${prevMonthRevByu.kabupaten} IN ('KOTA JAYAPURA') THEN 'JAYAPURA'
                 WHEN ${prevMonthRevByu.kabupaten} IN (
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
                 WHEN ${prevMonthRevByu.kabupaten} IN ('MANOKWARI') THEN 'MANOKWARI'
                 WHEN ${prevMonthRevByu.kabupaten} IN (
                     'FAKFAK',
                     'FAK FAK',
                     'KAIMANA',
                     'MANOKWARI SELATAN',
                     'PEGUNUNGAN ARFAK',
                     'TELUK BINTUNI',
                     'TELUK WONDAMA'
                 ) THEN 'MANOKWARI OUTER'
                 WHEN ${prevMonthRevByu.kabupaten} IN (
                     'KOTA SORONG',
                     'MAYBRAT',
                     'RAJA AMPAT',
                     'SORONG',
                     'SORONG SELATAN',
                     'TAMBRAUW'
                 ) THEN 'SORONG RAJA AMPAT'
                 WHEN ${prevMonthRevByu.kabupaten} IN ('ASMAT', 'BOVEN DIGOEL', 'MAPPI', 'MERAUKE') THEN 'MERAUKE'
                 WHEN ${prevMonthRevByu.kabupaten} IN (
                     'INTAN JAYA',
                     'MIMIKA',
                     'PUNCAK',
                     'PUNCAK JAYA',
                     'TIMIKA'
                 ) THEN 'MIMIKA'
                 WHEN ${prevMonthRevByu.kabupaten} IN ('DEIYAI', 'DOGIYAI', 'NABIRE', 'PANIAI') THEN 'NABIRE'
                 ELSE NULL
             END
                    `.as('subbranchName'),
                clusterName: sql<string>`
             CASE
                 WHEN ${prevMonthRevByu.kabupaten} IN (
                     'KOTA AMBON',
                     'MALUKU TENGAH',
                     'SERAM BAGIAN TIMUR'
                 ) THEN 'AMBON'
                 WHEN ${prevMonthRevByu.kabupaten} IN (
                     'KEPULAUAN ARU',
                     'KOTA TUAL',
                     'MALUKU BARAT DAYA',
                     'MALUKU TENGGARA',
                     'MALUKU TENGGARA BARAT',
                     'KEPULAUAN TANIMBAR'
                 ) THEN 'KEPULAUAN TUAL'
                 WHEN ${prevMonthRevByu.kabupaten} IN ('BURU', 'BURU SELATAN', 'SERAM BAGIAN BARAT') THEN 'SERAM BARAT BURU'
                 WHEN ${prevMonthRevByu.kabupaten} IN ('KOTA JAYAPURA') THEN 'KOTA JAYAPURA'
                 WHEN ${prevMonthRevByu.kabupaten} IN ('JAYAPURA', 'KEEROM', 'MAMBERAMO RAYA', 'SARMI') THEN 'JAYAPURA OUTER'
                 WHEN ${prevMonthRevByu.kabupaten} IN (
                     'BIAK',
                     'BIAK NUMFOR',
                     'KEPULAUAN YAPEN',
                     'SUPIORI',
                     'WAROPEN'
                 ) THEN 'NEW BIAK NUMFOR'
                 WHEN ${prevMonthRevByu.kabupaten} IN (
                     'JAYAWIJAYA',
                     'LANNY JAYA',
                     'MAMBERAMO TENGAH',
                     'NDUGA',
                     'PEGUNUNGAN BINTANG',
                     'TOLIKARA',
                     'YAHUKIMO',
                     'YALIMO'
                 ) THEN 'PAPUA PEGUNUNGAN'
                 WHEN ${prevMonthRevByu.kabupaten} IN ('MANOKWARI') THEN 'MANOKWARI'
                 WHEN ${prevMonthRevByu.kabupaten} IN (
                     'FAKFAK',
                     'FAK FAK',
                     'KAIMANA',
                     'MANOKWARI SELATAN',
                     'PEGUNUNGAN ARFAK',
                     'TELUK BINTUNI',
                     'TELUK WONDAMA'
                 ) THEN 'MANOKWARI OUTER'
                 WHEN ${prevMonthRevByu.kabupaten} IN (
                     'KOTA SORONG',
                     'MAYBRAT',
                     'RAJA AMPAT',
                     'SORONG',
                     'SORONG SELATAN',
                     'TAMBRAUW'
                 ) THEN 'NEW SORONG RAJA AMPAT'
                 WHEN ${prevMonthRevByu.kabupaten} IN (
                     'INTAN JAYA',
                     'MIMIKA',
                     'PUNCAK',
                     'PUNCAK JAYA',
                     'TIMIKA'
                 ) THEN 'MIMIKA PUNCAK'
                 WHEN ${prevMonthRevByu.kabupaten} IN ('DEIYAI', 'DOGIYAI', 'NABIRE', 'PANIAI') THEN 'NABIRE'
                 WHEN ${prevMonthRevByu.kabupaten} IN ('ASMAT', 'BOVEN DIGOEL', 'MAPPI', 'MERAUKE') THEN 'NEW MERAUKE'
                 ELSE NULL
             END
                    `.as('clusterName'),
                kabupaten: prevMonthRevByu.kabupaten,
                rev: prevMonthRevByu.rev,
            })
            .from(prevMonthRevByu)
            .where(between(prevMonthRevByu.eventDate, firstDayOfPrevMonth, prevDate))
            .as('sq3')

        const sq4 = db3
            .select({
                regionName: sql<string>`CASE WHEN ${prevYearCurrMonthRevByu.regionSales} IN ('MALUKU DAN PAPUA', 'PUMA') THEN 'PUMA' END`.as('regionName'),
                branchName: sql<string>`
             CASE
                 WHEN ${prevYearCurrMonthRevByu.kabupaten} IN (
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
                 WHEN ${prevYearCurrMonthRevByu.kabupaten} IN (
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
                 WHEN ${prevYearCurrMonthRevByu.kabupaten} IN (
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
                 WHEN ${prevYearCurrMonthRevByu.kabupaten} IN (
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
                 WHEN ${prevYearCurrMonthRevByu.kabupaten} IN (
                     'AMBON',
                     'KOTA AMBON',
                     'MALUKU TENGAH',
                     'SERAM BAGIAN TIMUR'
                 ) THEN 'AMBON'
                 WHEN ${prevYearCurrMonthRevByu.kabupaten} IN (
                     'KEPULAUAN ARU',
                     'KOTA TUAL',
                     'MALUKU BARAT DAYA',
                     'MALUKU TENGGARA',
                     'MALUKU TENGGARA BARAT',
                     'KEPULAUAN TANIMBAR'
                 ) THEN 'KEPULAUAN AMBON'
                 WHEN ${prevYearCurrMonthRevByu.kabupaten} IN ('BURU', 'BURU SELATAN', 'SERAM BAGIAN BARAT') THEN 'SERAM BURU'
                 WHEN ${prevYearCurrMonthRevByu.kabupaten} IN ('KOTA JAYAPURA') THEN 'JAYAPURA'
                 WHEN ${prevYearCurrMonthRevByu.kabupaten} IN (
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
                 WHEN ${prevYearCurrMonthRevByu.kabupaten} IN ('MANOKWARI') THEN 'MANOKWARI'
                 WHEN ${prevYearCurrMonthRevByu.kabupaten} IN (
                     'FAKFAK',
                     'FAK FAK',
                     'KAIMANA',
                     'MANOKWARI SELATAN',
                     'PEGUNUNGAN ARFAK',
                     'TELUK BINTUNI',
                     'TELUK WONDAMA'
                 ) THEN 'MANOKWARI OUTER'
                 WHEN ${prevYearCurrMonthRevByu.kabupaten} IN (
                     'KOTA SORONG',
                     'MAYBRAT',
                     'RAJA AMPAT',
                     'SORONG',
                     'SORONG SELATAN',
                     'TAMBRAUW'
                 ) THEN 'SORONG RAJA AMPAT'
                 WHEN ${prevYearCurrMonthRevByu.kabupaten} IN ('ASMAT', 'BOVEN DIGOEL', 'MAPPI', 'MERAUKE') THEN 'MERAUKE'
                 WHEN ${prevYearCurrMonthRevByu.kabupaten} IN (
                     'INTAN JAYA',
                     'MIMIKA',
                     'PUNCAK',
                     'PUNCAK JAYA',
                     'TIMIKA'
                 ) THEN 'MIMIKA'
                 WHEN ${prevYearCurrMonthRevByu.kabupaten} IN ('DEIYAI', 'DOGIYAI', 'NABIRE', 'PANIAI') THEN 'NABIRE'
                 ELSE NULL
             END
                    `.as('subbranchName'),
                clusterName: sql<string>`
             CASE
                 WHEN ${prevYearCurrMonthRevByu.kabupaten} IN (
                     'KOTA AMBON',
                     'MALUKU TENGAH',
                     'SERAM BAGIAN TIMUR'
                 ) THEN 'AMBON'
                 WHEN ${prevYearCurrMonthRevByu.kabupaten} IN (
                     'KEPULAUAN ARU',
                     'KOTA TUAL',
                     'MALUKU BARAT DAYA',
                     'MALUKU TENGGARA',
                     'MALUKU TENGGARA BARAT',
                     'KEPULAUAN TANIMBAR'
                 ) THEN 'KEPULAUAN TUAL'
                 WHEN ${prevYearCurrMonthRevByu.kabupaten} IN ('BURU', 'BURU SELATAN', 'SERAM BAGIAN BARAT') THEN 'SERAM BARAT BURU'
                 WHEN ${prevYearCurrMonthRevByu.kabupaten} IN ('KOTA JAYAPURA') THEN 'KOTA JAYAPURA'
                 WHEN ${prevYearCurrMonthRevByu.kabupaten} IN ('JAYAPURA', 'KEEROM', 'MAMBERAMO RAYA', 'SARMI') THEN 'JAYAPURA OUTER'
                 WHEN ${prevYearCurrMonthRevByu.kabupaten} IN (
                     'BIAK',
                     'BIAK NUMFOR',
                     'KEPULAUAN YAPEN',
                     'SUPIORI',
                     'WAROPEN'
                 ) THEN 'NEW BIAK NUMFOR'
                 WHEN ${prevYearCurrMonthRevByu.kabupaten} IN (
                     'JAYAWIJAYA',
                     'LANNY JAYA',
                     'MAMBERAMO TENGAH',
                     'NDUGA',
                     'PEGUNUNGAN BINTANG',
                     'TOLIKARA',
                     'YAHUKIMO',
                     'YALIMO'
                 ) THEN 'PAPUA PEGUNUNGAN'
                 WHEN ${prevYearCurrMonthRevByu.kabupaten} IN ('MANOKWARI') THEN 'MANOKWARI'
                 WHEN ${prevYearCurrMonthRevByu.kabupaten} IN (
                     'FAKFAK',
                     'FAK FAK',
                     'KAIMANA',
                     'MANOKWARI SELATAN',
                     'PEGUNUNGAN ARFAK',
                     'TELUK BINTUNI',
                     'TELUK WONDAMA'
                 ) THEN 'MANOKWARI OUTER'
                 WHEN ${prevYearCurrMonthRevByu.kabupaten} IN (
                     'KOTA SORONG',
                     'MAYBRAT',
                     'RAJA AMPAT',
                     'SORONG',
                     'SORONG SELATAN',
                     'TAMBRAUW'
                 ) THEN 'NEW SORONG RAJA AMPAT'
                 WHEN ${prevYearCurrMonthRevByu.kabupaten} IN (
                     'INTAN JAYA',
                     'MIMIKA',
                     'PUNCAK',
                     'PUNCAK JAYA',
                     'TIMIKA'
                 ) THEN 'MIMIKA PUNCAK'
                 WHEN ${prevYearCurrMonthRevByu.kabupaten} IN ('DEIYAI', 'DOGIYAI', 'NABIRE', 'PANIAI') THEN 'NABIRE'
                 WHEN ${prevYearCurrMonthRevByu.kabupaten} IN ('ASMAT', 'BOVEN DIGOEL', 'MAPPI', 'MERAUKE') THEN 'NEW MERAUKE'
                 ELSE NULL
             END
                    `.as('clusterName'),
                kabupaten: prevYearCurrMonthRevByu.kabupaten,
                rev: prevYearCurrMonthRevByu.rev,
            })
            .from(prevYearCurrMonthRevByu)
            .where(between(prevYearCurrMonthRevByu.eventDate, firstDayOfPrevYearCurrMonth, prevYearCurrDate))
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
        const p2 = db3
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
        const p3 = db3
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
        const p4 = db3
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

        // QUERY UNTUK YtD 2025

        const [targetRevenue, currMonthRevenue, prevMonthRevenue, prevYearCurrMonthRevenue] = await Promise.all([
            p1.execute(),
            p2.execute(),
            p3.execute(),
            p4.execute()
        ])
        // /var/lib/backup_mysql_2025/
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

