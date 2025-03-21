import {
    varchar,
    mysqlSchema,
    index,
} from "drizzle-orm/mysql-core";


export const channelSchema = mysqlSchema("channel");
export const dynamicPackageActivationTable = (year: string, month: string) => {
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

export const dynamicOutletReferenceTable = (year: string, month: string) => {
    return channelSchema.table(`report_outlet_reference_${year}${month}`, {
        createdAt: varchar('CREATED_AT', { length: 25 }),
        outletId: varchar('ID OUTLET', { length: 20 }),
        outletName: varchar('NAMA OUTLET', { length: 255 }),
        kelurahan: varchar('KELURAHAN', { length: 100 }),
        kecamatan: varchar('KECAMATAN', { length: 100 }),
        kabupaten: varchar('KABUPATEN', { length: 60 }),
        cluster: varchar('CLUSTER', { length: 60 }),
        branch: varchar('BRANCH', { length: 60 }),
        regional: varchar('REGIONAL', { length: 60 }),
        area: varchar('AREA', { length: 60 }),
        longitude: varchar('LONGITUDE', { length: 60 }),
        latitude: varchar('LATTITUDE', { length: 60 }),
        noRs: varchar('`NO RS`', { length: 60 }),
        noKonfirmasi: varchar('NO KONFIRMASI', { length: 60 }),
        kategori: varchar('KATEGORI', { length: 60 }),
        tipeOutlet: varchar('TIPE OUTLET', { length: 60 }),
        fisik: varchar('FISIK', { length: 60 }),
        tipeLokasi: varchar('TIPE LOKASI', { length: 60 }),
        klasifikasi: varchar('KLASIFIKASI', { length: 60 }),
        terakhirDikunjungi: varchar('TERAKHIR DIKUNJUNGI', { length: 60 }),
    }, t => [
        index('ID OUTLET').on(t.outletId).using('btree'),
        index('KABUPATEN').on(t.kabupaten).using('btree'),
        index('NO RS').on(t.noRs).using('btree'),
    ])
}