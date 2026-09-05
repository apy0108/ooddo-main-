-- AlterTable
ALTER TABLE "attendance" ADD COLUMN     "notes" TEXT,
ADD COLUMN     "overtime" DOUBLE PRECISION DEFAULT 0,
ALTER COLUMN "checkIn" DROP NOT NULL;
