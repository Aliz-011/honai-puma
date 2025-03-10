import { mysqlSchema, varchar, index } from "drizzle-orm/mysql-core";

export const hadoopNewSchema = mysqlSchema("hadoop_new");

export const dynamicMergeNewSalesPumaTable = (year: string, month: string) => {
    return hadoopNewSchema.table(`merge_new_sales_puma_${year}${month}`, {
        mtdDt: varchar("mtd_dt", { length: 24 }).notNull(),
        msisdn: varchar({ length: 14 }),
        cat: varchar("cat", { length: 10 }).notNull(),
        brand: varchar({ length: 40 }).notNull(),
        regionSales: varchar("region_sales", { length: 50 }).notNull(),
        areaSales: varchar("area_sales", { length: 50 }).notNull(),
        clusterSales: varchar("cluster_sales", { length: 50 }).notNull(),
        branch: varchar("branch", { length: 50 }).notNull(),
        subbranch: varchar("sub_branch", { length: 50 }).notNull(),
        kabupaten: varchar("kabupaten", { length: 60 }).notNull(),
        kabupatenBaru: varchar("kabupaten_baru", { length: 60 }).notNull(),
        kecamatan: varchar("kecamatan", { length: 60 }).notNull(),
        l1Name: varchar("l1_name", { length: 50 }).notNull(),
        l2Name: varchar("l2_name", { length: 50 }).notNull(),
        l3Name: varchar("l3_name", { length: 125 }).notNull(),
        l4Name: varchar("l4_name", { length: 150 }).notNull(),
        contentId: varchar("content_id", { length: 50 }).notNull(),
        rev: varchar("rev", { length: 22 }).notNull(),
        trx: varchar("trx", { length: 22 }).notNull(),
    }, (t) => [
        index("mtd_dt").on(t.mtdDt).using('btree'),
        index("kabupaten").on(t.kabupaten).using('btree')
    ])
}