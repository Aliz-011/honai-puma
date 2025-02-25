import { defineConfig } from "drizzle-kit";

export default defineConfig({
	dialect: "mysql",
	schema: "./src/db/schema.ts",
	breakpoints: true,
	strict: true,
	verbose: true,
});
