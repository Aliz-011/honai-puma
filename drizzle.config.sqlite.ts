import type { Config } from "drizzle-kit";

export default {
    dialect: 'sqlite',
    schema: './src/db/schema8',
    dbCredentials: {
        url: './src/sqlite.db',
    }
} satisfies Config