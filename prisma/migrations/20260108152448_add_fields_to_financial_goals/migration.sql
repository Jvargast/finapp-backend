/*
  Warnings:

  - The values [PURCHASE] on the enum `GoalType` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "GoalType_new" AS ENUM ('SAVING', 'DEBT', 'INVESTMENT', 'HOUSING', 'CONTROL', 'RETIREMENT');
ALTER TABLE "financial_goals" ALTER COLUMN "type" TYPE "GoalType_new" USING ("type"::text::"GoalType_new");
ALTER TYPE "GoalType" RENAME TO "GoalType_old";
ALTER TYPE "GoalType_new" RENAME TO "GoalType";
DROP TYPE "public"."GoalType_old";
COMMIT;

-- AlterTable
ALTER TABLE "financial_goals" ADD COLUMN     "estimatedYield" DECIMAL(65,30) DEFAULT 0,
ADD COLUMN     "monthlyQuota" DECIMAL(65,30) DEFAULT 0;
