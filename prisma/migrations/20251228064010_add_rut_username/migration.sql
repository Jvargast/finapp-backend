/*
  Warnings:

  - A unique constraint covering the columns `[username]` on the table `user_profiles` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[rut]` on the table `user_profiles` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "user_profiles" ADD COLUMN     "rut" TEXT,
ADD COLUMN     "username" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "user_profiles_username_key" ON "user_profiles"("username");

-- CreateIndex
CREATE UNIQUE INDEX "user_profiles_rut_key" ON "user_profiles"("rut");
