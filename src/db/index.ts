import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";

import * as schema from "./schema";
import * as schema2 from "./schema2";

const poolConnection = mysql.createPool({
	host: process.env.DB_HOST!,
	user: process.env.DB_USERNAME!,
	password: process.env.DB_PASSWORD!,
	database: process.env.DB_NAME!,
});

const poolConnection2 = mysql.createPool({
	host: process.env.DB_HOST,
	user: process.env.DB_USERNAME,
	password: process.env.DB_PASSWORD,
	database: process.env.DB_NAME2,
});

// You can specify any property from the mysql2 connection options
export const db = drizzle({ client: poolConnection, mode: "default", schema });
export const db2 = drizzle({
	client: poolConnection2,
	mode: "default",
	schema: schema2,
});
