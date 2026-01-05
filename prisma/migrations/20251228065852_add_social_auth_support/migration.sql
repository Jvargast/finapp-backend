-- CreateEnum
CREATE TYPE "AuthProvider" AS ENUM ('LOCAL', 'GOOGLE', 'APPLE');

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "provider" "AuthProvider" NOT NULL DEFAULT 'LOCAL',
ADD COLUMN     "socialId" TEXT,
ALTER COLUMN "password" DROP NOT NULL;
