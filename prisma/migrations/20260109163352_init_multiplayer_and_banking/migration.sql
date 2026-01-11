/*
  Warnings:

  - A unique constraint covering the columns `[shareToken]` on the table `financial_goals` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "GoalRole" AS ENUM ('OWNER', 'EDITOR', 'VIEWER');

-- CreateEnum
CREATE TYPE "InvitationStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED');

-- AlterTable
ALTER TABLE "accounts" ADD COLUMN     "externalId" TEXT,
ADD COLUMN     "institution" TEXT,
ADD COLUMN     "lastSyncedAt" TIMESTAMP(3),
ALTER COLUMN "type" SET DEFAULT 'Cash';

-- AlterTable
ALTER TABLE "financial_goals" ADD COLUMN     "shareToken" TEXT;

-- AlterTable
ALTER TABLE "transactions" ADD COLUMN     "externalId" TEXT,
ADD COLUMN     "goalId" TEXT;

-- CreateTable
CREATE TABLE "goal_participants" (
    "id" TEXT NOT NULL,
    "role" "GoalRole" NOT NULL DEFAULT 'VIEWER',
    "status" "InvitationStatus" NOT NULL DEFAULT 'PENDING',
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "invitedBy" TEXT,
    "userId" TEXT NOT NULL,
    "goalId" TEXT NOT NULL,

    CONSTRAINT "goal_participants_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "goal_participants_userId_goalId_key" ON "goal_participants"("userId", "goalId");

-- CreateIndex
CREATE UNIQUE INDEX "financial_goals_shareToken_key" ON "financial_goals"("shareToken");

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_goalId_fkey" FOREIGN KEY ("goalId") REFERENCES "financial_goals"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "goal_participants" ADD CONSTRAINT "goal_participants_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "goal_participants" ADD CONSTRAINT "goal_participants_goalId_fkey" FOREIGN KEY ("goalId") REFERENCES "financial_goals"("id") ON DELETE CASCADE ON UPDATE CASCADE;
