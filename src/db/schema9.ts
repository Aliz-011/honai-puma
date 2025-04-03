import { index, mysqlSchema, varchar } from "drizzle-orm/mysql-core";

const multidim = mysqlSchema('multidim')

export const dynamicMultidimTable = (year: string, month: string, day: string) => {
    return multidim.table(`v_cb_multidim_${year}${month}${day}`, {
        trxDate: varchar('trx_date', { length: 20 }),
        msisdn: varchar('msisdn', { length: 18 }),
        digital_preference: varchar('digital_preference'),
        cgi_dom_mtd: varchar('cgi_dom_mtd'),
        activation_date: varchar('activation_date'),
        area_sales: varchar('area_sales'),
        region_sales: varchar('region_sales'),
        branch: varchar('branch'),
        subbranch: varchar('subbranch'),
        cluster_sales: varchar('cluster_sales'),
        kabupaten: varchar('kabupaten'),
        kecamatan: varchar('kecamatan'),
        vol_data_m1: varchar('vol_data_m1'),
        los: varchar('los'),
        status: varchar('status'),
        active_pack_data: varchar('active_pack_data'),
        active_pack_data_flag: varchar('active_pack_data_flag'),
        rev_data_m1: varchar('rev_data_m1'),
        rev_data_m2: varchar('rev_data_m2'),
        rev_data_m3: varchar('rev_data_m3'),
        rev_data_mtd: varchar('rev_data_mtd'),
        rev_voice_m1: varchar('rev_voice_m1'),
        rev_voice_m2: varchar('rev_voice_m2'),
        rev_voice_m3: varchar('rev_voice_m3'),
        rev_voice_mtd: varchar('rev_voice_mtd'),
        vol_data_mtd: varchar('vol_data_mtd'),
        rev_digital_mtd: varchar('rev_digital_mtd'),
        rev_digital_m1: varchar('rev_digital_m1'),
        rev_digital_m2: varchar('rev_digital_m2'),
        rev_digital_m3: varchar('rev_digital_m3'),
        brand: varchar('brand'),
        rev_m1: varchar('rev_m1'),
        rev_m2: varchar('rev_m2'),
        rev_m3: varchar('rev_m3'),
        rev_mtd: varchar('rev_mtd'),
        tsel_poin: varchar('tsel_poin'),
        site_id: varchar('site_id'),
        active_package: varchar('active_package'),
        balance: varchar('balance'),
        event_date: varchar('event_date'),
    }, t => ({
        msisdn: index('msisdn').on(t.msisdn).using('btree'),
        kabupaten: index('kabupaten').on(t.kabupaten).using('btree')
    }))
}