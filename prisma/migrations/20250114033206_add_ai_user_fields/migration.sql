-- AlterTable
ALTER TABLE "User" ADD COLUMN     "aiOwner" TEXT,
ADD COLUMN     "isAI" BOOLEAN NOT NULL DEFAULT false;
