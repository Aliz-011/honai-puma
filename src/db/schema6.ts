import { mysqlSchema, varchar, decimal, index, date } from "drizzle-orm/mysql-core";

export const upikBerkas = mysqlSchema("upik_berkas");

export const dynamicRedeemPVTable = (year: string, month: string) => {
    return upikBerkas.table(`claudia_enable_${year}${month}`, {
        eventDate: varchar('event_date', { length: 20 }),
        usedMsisdn: varchar('used_msisdn', { length: 20 }),
        voucherStatus: decimal('voucher_status', { precision: 18, scale: 2 }),
        nominal: decimal('nominal', { precision: 18, scale: 2 }),
        initDate: varchar('init_date', { length: 55 }),
        userName: varchar('user_name', { length: 50 }),
        activatedDatetime: varchar('activated_datetime', { length: 55 }),
        expiredDate: varchar('expire_date', { length: 55 }),
        activePeriod: decimal('active_period', { precision: 18, scale: 2 }),
        gracePeriod: decimal('grace_period', { precision: 18, scale: 2 }),
        brandId: decimal('brand_id', { precision: 18, scale: 2 }),
        regionId: decimal('region_id', { precision: 18, scale: 2 }),
        vasKeyword: varchar('vas_keyword', { length: 100 }),
        regional: varchar({ length: 100 }),
        branch: varchar({ length: 100 }),
        subbranch: varchar({ length: 100 }),
        cluster: varchar({ length: 100 }),
        resellerCity: varchar('reseller_city', { length: 50 }),
        resellerMsisdn: varchar('reseller_msisdn', { length: 20 }),
        resellerLacci: varchar('reseller_lacci', { length: 20 }),
        voucherType: decimal('voucher_type', { precision: 18, scale: 2 }),
        vasSplitid: decimal('vas_splitid', { precision: 18, scale: 2 }),
        serialNumber: varchar('serial_number', { length: 50 }),
        fileId: decimal('file_id', { precision: 18, scale: 2 }),
        loadTs: varchar('load_ts', { length: 55 }),
        loadUser: varchar('load_user', { length: 20 }),
    }, t => [
        index('Reseller_city').on(t.resellerCity).using('btree'),
        index('SERIAL_NUMBER').on(t.serialNumber).using('btree'),
    ])
}