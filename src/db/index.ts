import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";

import * as schema from "./schema";
import * as schema2 from "./schema2";
import * as schema3 from "./schema3";
import * as schema4 from "./schema4";
import * as schema5 from "./schema5";
import * as schema6 from "./schema6";

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

const poolConnection3 = mysql.createPool({
	host: process.env.DB_HOST,
	user: process.env.DB_USERNAME,
	password: process.env.DB_PASSWORD,
	database: process.env.DB_NAME3,
});

const poolConnection4 = mysql.createPool({
	host: process.env.DB_HOST,
	user: process.env.DB_USERNAME,
	password: process.env.DB_PASSWORD,
	database: process.env.DB_NAME4,
});

const poolConnection5 = mysql.createPool({
	host: process.env.DB_HOST2,
	user: process.env.DB_USERNAME2,
	password: process.env.DB_PASSWORD2,
	database: process.env.DB_NAME5,
})

const poolConnection6 = mysql.createPool({
	host: process.env.DB_HOST2,
	user: process.env.DB_USERNAME2,
	password: process.env.DB_PASSWORD2,
	database: process.env.DB_NAME6,
})

// You can specify any property from the mysql2 connection options
export const db = drizzle({ client: poolConnection, mode: 'default', schema })
export const db2 = drizzle({ client: poolConnection2, mode: 'default', schema: schema2 })
export const db3 = drizzle({ client: poolConnection3, mode: 'default', schema: schema3 })
export const db4 = drizzle({ client: poolConnection4, mode: "default", schema: schema4 });
export const db5 = drizzle({ client: poolConnection5, mode: "default", schema: schema5 });
export const db6 = drizzle({ client: poolConnection6, mode: "default", schema: schema6 });
