import { mysqlSchema, varchar, decimal, index, date } from "drizzle-orm/mysql-core";
import { relations } from "drizzle-orm";

export const digiposRevampSchema = mysqlSchema("digipos_revamp");
export const dynamicRevenueSATable = (year: string, month: string) => {
    return digiposRevampSchema.table(`sa_detil_${year}${month}`, {
        trxDate: date('trx_date', { mode: 'string' }),
        regional: varchar({ length: 100 }),
        branch: varchar({ length: 100 }),
        subbranch: varchar({ length: 100 }),
        cluster: varchar({ length: 100 }),
        kabupaten: varchar({ length: 100 }),
        outletId: varchar('outlet_id', { length: 100 }),
        noRs: varchar('no_rs', { length: 100 }),
        sbpType: varchar('sbp_type', { length: 100 }),
        saType: varchar('sa_type', { length: 100 }),
        packKeyword: varchar('pack_keyword', { length: 100 }),
        packageType: varchar('package_type', { length: 200 }),
        brand: varchar('brand', { length: 100 }),
        msisdn: varchar('msisdn', { length: 100 }),
        price: decimal('price', { precision: 38, scale: 2 }),
    }, t => [
        index('msisdn').on(t.msisdn).using('btree')
    ])
}