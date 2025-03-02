import {
	int,
	text,
	mysqlTable,
	varchar,
	decimal,
	mysqlSchema,
	index,
} from "drizzle-orm/mysql-core";


export const hadoopSchema = mysqlSchema("hadoop");
export const dynamicResumeRevenuePumaTable = (year: string, month: string) => {
	return hadoopSchema.table(`resume_revenue_puma_${year}${month}`, {
		mtdDt: varchar("mtd_dt", { length: 24 }).notNull(),
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
		subs: varchar("subs", { length: 22 }).notNull(),
	}, (t) => [
		index("mtd_dt").on(t.mtdDt).using('btree'),
		index("kabupaten").on(t.kabupaten).using('btree')
	])
}

export const dynamicRevenueCVMTable = (year: string, month: string) => {
	return hadoopSchema.table(`bba_broadband_daily_${year}${month}`, {
		msisdn: varchar({ length: 18 }).notNull(),
		trxDate: varchar('trx_date', { length: 20 }).notNull(),
		contentId: varchar('content_id', { length: 100 }).notNull(),
		packId: varchar('pack_id', { length: 100 }),
		cpName: varchar('cp_name', { length: 100 }),
		region: varchar("region", { length: 20 }).notNull(),
		cluster: varchar("cluster", { length: 35 }).notNull(),
		branch: varchar("branch", { length: 35 }).notNull(),
		subbranch: varchar("sub_branch", { length: 35 }).notNull(),
		city: varchar("city", { length: 35 }).notNull(),
		kecamatan: varchar("kecamatan", { length: 100 }).notNull(),
		brand: varchar("brand", { length: 35 }).notNull(),
		harga: varchar("harga", { length: 22 }).notNull(),
		packageType: varchar("package_type", { length: 100 }),
		packageService: varchar("package_service", { length: 100 }),
		packageCategory: varchar("package_category", { length: 100 }),
		validity: varchar("validity", { length: 100 }),
		numericQuota: varchar('numeric_quota', { length: 100 }),
		periode: varchar('periode', { length: 100 }),
		zona: varchar('zona', { length: 100 }),
		channel: varchar('channel', { length: 100 }),
		detailQuota: varchar('detail_quota', { length: 100 }),
		actDate: varchar('act_date', { length: 100 }),
		losSegment: varchar('los_segment', { length: 100 }),
		newService: varchar('new_service', { length: 100 }),
		newTipe: varchar('new_tipe', { length: 100 }),
		category: varchar('category', { length: 100 }),
		trx: varchar('trx', { length: 22 }),
		revenue: varchar('revenue', { length: 22 }),
		channelId: varchar('channel_id', { length: 100 }),
		channelName: varchar('channel_name', { length: 100 }),
		vasCode: varchar('vas_code', { length: 100 }),
		l4Name: varchar('l4_name', { length: 100 }),
		lac: varchar('lac', { length: 100 }),
		ci: varchar('ci', { length: 100 }),
		paymentId: varchar('payment_id', { length: 100 }),
		paymentMethod: varchar('payment_method', { length: 100 }),
		flagGift: varchar('flag_gift', { length: 100 }),
		packageGroup: varchar('package_group', { length: 100 }),
		packageSubgroup: varchar('package_subgroup', { length: 100 }),
		channelNew: varchar('channel_new', { length: 100 }),
	}, t => [
		index('trx_date').on(t.trxDate).using('btree'),
		index('msisdn').on(t.msisdn).using('btree'),
		index('city').on(t.city).using('btree'),
	])
}

export const dynamicCbProfileTable = (year: string, month: string) => {
	return hadoopSchema.table(`cb_profile_${year}${month}`, {
		msisdn: varchar({ length: 18 }).notNull(),
		branch: varchar("branch", { length: 50 }),
		subbranch: varchar("sub_branch", { length: 50 }),
		clusterSales: varchar("cluster_sales", { length: 35 }),
		kabupaten: varchar("kabupaten", { length: 50 }),
		kecamatan: varchar("kecamatan", { length: 100 }),
		brand: varchar("brand", { length: 35 }),
		userId: varchar("user_id", { length: 100 }),
	})
}