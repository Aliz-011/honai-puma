import { dynamicMrCbIndihomeTable, dynamicIhOrderingDetailOrderTable } from "@/db/schema6";
import { zValidator } from "@/lib/validator-wrapper";
import { endOfMonth, format, subMonths } from "date-fns";
import { Hono } from "hono";
import { z } from "zod";

const app = new Hono()
    .get('/linein-service', zValidator('query', z.object({ date: z.coerce.date().optional() })),
        async c => {
            const { date } = c.req.valid('query')
            const selectedDate = date ? new Date(date) : new Date()

            // VARIABEL TANGGAL
            const closingDate = endOfMonth(selectedDate)
            const isEndOfMonth = selectedDate.getDate() === closingDate.getDate();
            const endOfCurrMonth = isEndOfMonth ? closingDate : selectedDate
            const currDate = format(endOfCurrMonth, 'yyyy-MM-dd')
            const currYear = format(selectedDate, 'yyyy')
            const currMonth = format(selectedDate, 'MM')

            const mrcbdate = isEndOfMonth ? format(selectedDate, 'MM') : format(subMonths(selectedDate, 1), 'MM')
            const mrcbIndihome = dynamicMrCbIndihomeTable(currYear, mrcbdate)
            const ihOrderingDetailOrder = dynamicIhOrderingDetailOrderTable(currYear, currMonth)
        })

export default app