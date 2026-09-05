const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function migrate() {
  const client = await pool.connect();
  try {
    console.log('🔄 Checking & applying Phase 8 database schema updates...');
    await client.query('BEGIN');

    // 1. Enums
    await client.query(`
      DO $$ BEGIN
        ALTER TYPE "AmountType" ADD VALUE IF NOT EXISTS 'FORMULA';
      EXCEPTION WHEN duplicate_object THEN null;
      END $$;
    `);

    await client.query(`
      DO $$ BEGIN
        ALTER TYPE "PayslipStatus" ADD VALUE IF NOT EXISTS 'DONE';
      EXCEPTION WHEN duplicate_object THEN null;
      END $$;
    `);

    // 2. Employee.bankAccountNo
    await client.query(`
      ALTER TABLE "employees"
      ADD COLUMN IF NOT EXISTS "bankAccountNo" TEXT;
    `);
    await client.query(`
      UPDATE "employees"
      SET "bankAccountNo" = "bankAccountNumber"
      WHERE "bankAccountNo" IS NULL AND "bankAccountNumber" IS NOT NULL;
    `);

    // 3. SalaryRule.formulaCode
    await client.query(`
      ALTER TABLE "salary_rules"
      ADD COLUMN IF NOT EXISTS "formulaCode" TEXT;
    `);

    // 4. Payrun updates
    await client.query(`
      ALTER TABLE "payruns"
      ADD COLUMN IF NOT EXISTS "createdById" TEXT;
    `);

    // Ensure createdById is populated with an existing admin user
    const adminRes = await client.query(`SELECT id FROM "users" WHERE role = 'ADMIN' LIMIT 1`);
    const defaultUserId = adminRes.rows[0]?.id;
    if (defaultUserId) {
      await client.query(`
        UPDATE "payruns"
        SET "createdById" = $1
        WHERE "createdById" IS NULL
      `, [defaultUserId]);
    }

    // Add FK constraint if not exists
    await client.query(`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'payruns_createdById_fkey'
        ) THEN
          ALTER TABLE "payruns"
          ADD CONSTRAINT "payruns_createdById_fkey"
          FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
        END IF;
      END $$;
    `);

    // 5. Payslip updates
    await client.query(`
      ALTER TABLE "payslips"
      ADD COLUMN IF NOT EXISTS "workedDays" INTEGER DEFAULT 0,
      ADD COLUMN IF NOT EXISTS "totalDays" INTEGER DEFAULT 0,
      ADD COLUMN IF NOT EXISTS "basic" DOUBLE PRECISION DEFAULT 0,
      ADD COLUMN IF NOT EXISTS "gross" DOUBLE PRECISION DEFAULT 0,
      ADD COLUMN IF NOT EXISTS "deductions" DOUBLE PRECISION DEFAULT 0,
      ADD COLUMN IF NOT EXISTS "net" DOUBLE PRECISION DEFAULT 0,
      ADD COLUMN IF NOT EXISTS "warnings" TEXT[] DEFAULT '{}',
      ADD COLUMN IF NOT EXISTS "pdfPath" TEXT,
      ADD COLUMN IF NOT EXISTS "sentAt" TIMESTAMP(3);
    `);

    // Populate new fields from old columns if old columns exist
    await client.query(`
      UPDATE "payslips"
      SET
        "basic" = COALESCE("basicSalary", "basic", 0),
        "gross" = COALESCE("grossSalary", "gross", 0),
        "deductions" = COALESCE("totalDeductions", "deductions", 0),
        "net" = COALESCE("netSalary", "net", 0)
      WHERE "basic" = 0 AND "basicSalary" IS NOT NULL;
    `);

    // Ensure salaryStructureId on payslips is not null
    await client.query(`
      UPDATE "payslips" p
      SET "salaryStructureId" = pr."salaryStructureId"
      FROM "payruns" pr
      WHERE p."payrunId" = pr.id AND p."salaryStructureId" IS NULL;
    `);

    // Fallback for any remaining null salaryStructureId
    const structRes = await client.query(`SELECT id FROM "salary_structures" LIMIT 1`);
    if (structRes.rows[0]?.id) {
      await client.query(`
        UPDATE "payslips"
        SET "salaryStructureId" = $1
        WHERE "salaryStructureId" IS NULL
      `, [structRes.rows[0].id]);
    }

    await client.query(`
      ALTER TABLE "payslips"
      ALTER COLUMN "salaryStructureId" SET NOT NULL;
    `);

    // 6. PayslipLine updates
    await client.query(`
      ALTER TABLE "payslip_lines"
      ADD COLUMN IF NOT EXISTS "ruleName" TEXT,
      ADD COLUMN IF NOT EXISTS "ruleCode" TEXT;
    `);

    // Drop NOT NULL on older name/code columns if they exist, and ensure createdAt default
    await client.query(`
      ALTER TABLE "payslip_lines"
      ALTER COLUMN "name" DROP NOT NULL,
      ALTER COLUMN "code" DROP NOT NULL,
      ALTER COLUMN "createdAt" SET DEFAULT CURRENT_TIMESTAMP;
    `);

    const cols = await client.query(`
      SELECT column_name, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'payslip_lines'
    `);
    console.log('payslip_lines columns:', cols.rows);

    await client.query(`
      UPDATE "payslip_lines"
      SET
        "ruleName" = COALESCE("ruleName", "name", 'Salary Rule'),
        "ruleCode" = COALESCE("ruleCode", "code", 'RULE')
      WHERE "ruleName" IS NULL OR "ruleCode" IS NULL;
    `);

    await client.query(`
      ALTER TABLE "payslip_lines"
      ALTER COLUMN "ruleName" SET NOT NULL,
      ALTER COLUMN "ruleCode" SET NOT NULL,
      ALTER COLUMN "category" SET NOT NULL;
    `);

    await client.query('COMMIT');
    console.log('✅ Phase 8 database schema synced successfully.');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Schema sync error:', err);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

migrate();
