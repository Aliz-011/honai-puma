import { defineConfig } from "drizzle-kit";

export default defineConfig({
	dialect: "mysql",
	schema: ["./src/db/schema.ts", "./src/db/schema2.ts", "./src/db/schema3.ts", "./src/db/schema5", "./src/db/schema6.ts", "./src/db/schema7.ts"],
	breakpoints: true,
	strict: true,
	verbose: true,
});
