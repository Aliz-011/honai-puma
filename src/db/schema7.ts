import {
    varchar,
    mysqlSchema,
    index,
} from "drizzle-orm/mysql-core";


export const channelSchema = mysqlSchema("channel");
export const dynamicChannelTable = (year: string, month: string) => {
    return channelSchema.table(`report_package_activation_${year}${month}`, {
        trxDate: varchar('TRX_DATE', { length: 20 }),
        outletId: varchar('OUTLET_ID', { length: 20 }),
        rs: varchar('RS', { length: 18 }),
        bSharp: varchar('B#', { length: 18 }),
        packageKeyword: varchar('PACKAGE_KEYWORD', { length: 20 }),
        price: varchar('PRICE', { length: 20 }),
        trxType: varchar('TRX_TYPE', { length: 20 }),
        channel: varchar('CHANNEL', { length: 20 }),
        paymentMethod: varchar('PAYMENT_METHOD', { length: 20 })
    }, t => [
        index('TRX_DATE').on(t.trxDate).using('btree'),
        index('OUTLET_ID').on(t.outletId).using('btree'),
        index('RS').on(t.rs).using('btree'),
        index('B#').on(t.bSharp).using('btree'),
    ])
}