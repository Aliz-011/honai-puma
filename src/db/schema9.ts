import { index, mysqlSchema, varchar } from "drizzle-orm/mysql-core";

const multidim = mysqlSchema('multidim')

export const dynamicMultidimTable = (year: string, month: string, day: string) => {
    return multidim.table(`v_cb_multidim_${year}${month}${day}`, {
        trxDate: varchar('trx_date', { length: 20 }),
        msisdn: varchar('msisdn', { length: 18 }),
        digital_preference: varchar('digital_preference', { length: 100 }),
        cgi_dom_mtd: varchar('cgi_dom_mtd', { length: 100 }),
        activation_date: varchar('activation_date', { length: 100 }),
        area_sales: varchar('area_sales', { length: 50 }),
        region_sales: varchar('region_sales', { length: 50 }),
        branch: varchar('branch', { length: 50 }),
        subbranch: varchar('subbranch', { length: 50 }),
        cluster_sales: varchar('cluster_sales', { length: 50 }),
        kabupaten: varchar('kabupaten', { length: 50 }),
        kecamatan: varchar('kecamatan', { length: 50 }),
        vol_data_m1: varchar('vol_data_m1', { length: 100 }),
        los: varchar('los', { length: 100 }),
        status: varchar('status', { length: 100 }),
        active_pack_data: varchar('active_pack_data', { length: 100 }),
        active_pack_data_flag: varchar('active_pack_data_flag', { length: 100 }),
        rev_data_m1: varchar('rev_data_m1', { length: 100 }),
        rev_data_m2: varchar('rev_data_m2', { length: 100 }),
        rev_data_m3: varchar('rev_data_m3', { length: 100 }),
        rev_data_mtd: varchar('rev_data_mtd', { length: 100 }),
        rev_voice_m1: varchar('rev_voice_m1', { length: 100 }),
        rev_voice_m2: varchar('rev_voice_m2', { length: 100 }),
        rev_voice_m3: varchar('rev_voice_m3', { length: 100 }),
        rev_voice_mtd: varchar('rev_voice_mtd', { length: 100 }),
        vol_data_mtd: varchar('vol_data_mtd', { length: 100 }),
        rev_digital_mtd: varchar('rev_digital_mtd', { length: 100 }),
        rev_digital_m1: varchar('rev_digital_m1', { length: 100 }),
        rev_digital_m2: varchar('rev_digital_m2', { length: 100 }),
        rev_digital_m3: varchar('rev_digital_m3', { length: 100 }),
        brand: varchar('brand', { length: 100 }),
        rev_m1: varchar('rev_m1', { length: 100 }),
        rev_m2: varchar('rev_m2', { length: 100 }),
        rev_m3: varchar('rev_m3', { length: 100 }),
        rev_mtd: varchar('rev_mtd', { length: 100 }),
        tsel_poin: varchar('tsel_poin', { length: 100 }),
        site_id: varchar('site_id', { length: 20 }),
        active_package: varchar('active_package', { length: 100 }),
        vol_data_pack_remain: varchar('vol_data_pack_remain', { length: 100 }),
        balance: varchar('balance', { length: 100 }),
        event_date: varchar('event_date', { length: 50 }),
    }, t => [
        index('msisdn').on(t.msisdn).using('btree'),
        index('kabupaten').on(t.kabupaten).using('btree')
    ])
}