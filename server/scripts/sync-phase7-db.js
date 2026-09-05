const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function run() {
  console.log('🔄 Applying Phase 7 Database Schema Migration...');

  // 1. Create Enums if not exist
  await pool.query(`
    DO $$ BEGIN
      CREATE TYPE "RuleCategory" AS ENUM ('BASIC', 'ALLOWANCE', 'GROSS', 'DEDUCTION', 'NET');
    EXCEPTION
      WHEN duplicate_object THEN null;
    END $$;
  `);

  await pool.query(`
    DO $$ BEGIN
      CREATE TYPE "AmountType" AS ENUM ('FIXED', 'PERCENTAGE', 'CONTRACT_WAGE', 'COMPUTED');
    EXCEPTION
      WHEN duplicate_object THEN null;
    END $$;
  `);

  await pool.query(`
    DO $$ BEGIN
      CREATE TYPE "PercentageBase" AS ENUM ('BASIC', 'GROSS', 'CONTRACT_WAGE');
    EXCEPTION
      WHEN duplicate_object THEN null;
    END $$;
  `);
  console.log('✅ Enums created/verified');

  // 2. Adjust salary_structures table
  await pool.query(`
    DO $$ BEGIN
      IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'salary_structures' AND column_name = 'isActive'
      ) THEN
        ALTER TABLE "salary_structures" RENAME COLUMN "isActive" TO "active";
      END IF;
    END $$;
  `);

  await pool.query(`
    ALTER TABLE "salary_structures" 
    ADD COLUMN IF NOT EXISTS "active" BOOLEAN DEFAULT true;
  `);
  console.log('✅ salary_structures table updated');

  // 3. Clear existing old structure rules join table and rules to align with new one-to-many model
  await pool.query(`DROP TABLE IF EXISTS "_StructureRules" CASCADE;`);
  await pool.query(`DROP TABLE IF EXISTS "payslip_lines" CASCADE;`);
  await pool.query(`DROP TABLE IF EXISTS "salary_rules" CASCADE;`);

  // 4. Recreate salary_rules with Phase 7 schema
  await pool.query(`
    CREATE TABLE IF NOT EXISTS "salary_rules" (
      "id" TEXT PRIMARY KEY,
      "structureId" TEXT NOT NULL,
      "name" TEXT NOT NULL,
      "code" TEXT NOT NULL,
      "category" "RuleCategory" NOT NULL,
      "amountType" "AmountType" NOT NULL,
      "amount" DOUBLE PRECISION,
      "percentage" DOUBLE PRECISION,
      "percentageBase" "PercentageBase",
      "sequence" INTEGER NOT NULL,
      "active" BOOLEAN NOT NULL DEFAULT true,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "salary_rules_structureId_fkey" FOREIGN KEY ("structureId") REFERENCES "salary_structures"("id") ON DELETE CASCADE ON UPDATE CASCADE
    );
  `);

  await pool.query(`
    CREATE UNIQUE INDEX IF NOT EXISTS "salary_rules_structureId_code_key" ON "salary_rules"("structureId", "code");
  `);
  await pool.query(`
    CREATE UNIQUE INDEX IF NOT EXISTS "salary_rules_structureId_sequence_key" ON "salary_rules"("structureId", "sequence");
  `);
  console.log('✅ salary_rules table created with unique constraints');

  // 5. Recreate payslip_lines
  await pool.query(`
    CREATE TABLE IF NOT EXISTS "payslip_lines" (
      "id" TEXT PRIMARY KEY,
      "payslipId" TEXT NOT NULL,
      "salaryRuleId" TEXT,
      "name" TEXT NOT NULL,
      "code" TEXT NOT NULL,
      "category" TEXT,
      "sequence" INTEGER NOT NULL,
      "amount" DOUBLE PRECISION NOT NULL,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "payslip_lines_payslipId_fkey" FOREIGN KEY ("payslipId") REFERENCES "payslips"("id") ON DELETE CASCADE ON UPDATE CASCADE,
      CONSTRAINT "payslip_lines_salaryRuleId_fkey" FOREIGN KEY ("salaryRuleId") REFERENCES "salary_rules"("id") ON DELETE SET NULL ON UPDATE CASCADE
    );
  `);

  // 6. Ensure payslips table has salaryStructureId
  await pool.query(`
    ALTER TABLE "payslips" 
    ADD COLUMN IF NOT EXISTS "salaryStructureId" TEXT;
  `);

  await pool.query(`
    DO $$ BEGIN
      ALTER TABLE "payslips"
      ADD CONSTRAINT "payslips_salaryStructureId_fkey"
      FOREIGN KEY ("salaryStructureId") REFERENCES "salary_structures"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    EXCEPTION
      WHEN duplicate_object THEN null;
    END $$;
  `);

  console.log('✅ Phase 7 Database Schema Migration completed successfully!');
}

run()
  .catch((err) => {
    console.error('❌ Migration failed:', err);
    process.exit(1);
  })
  .finally(() => pool.end());
