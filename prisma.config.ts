// prisma/prisma.config.ts
import * as path from "path"
import * as fs from "fs"
import * as dotenv from "dotenv"
import { IEnvType } from "./src/shared/types/config/env.types"

const __dirname = process.cwd()

function loadEnv(nodeEnvType: IEnvType) {
  const nodeEnv = process.env.NODE_ENV || nodeEnvType
  const envFile = path.resolve(__dirname, `.env.${nodeEnv}`)

  if (fs.existsSync(envFile)) {
    dotenv.config({ path: envFile })
    console.log(`✅ Loaded env file: .env.${nodeEnv}`)
  } else {
    console.warn(`⚠️  Env file not found: .env.${nodeEnv}`)
  }
}

loadEnv("development")

export default {
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: process.env.DATABASE_URL,
  },
}