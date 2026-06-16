import { defineConfig } from "drizzle-kit";

export default defineConfig({
  dialect: "sqlite",
  schema: "./src/infrastructure/db/schema.ts",
  out: "./drizzle",
  dbCredentials: {
    url: process.env.TOKENTRACK_DB_PATH ?? "./tokentrack.sqlite"
  }
});
