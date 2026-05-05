-- DropIndex
DROP INDEX "Arena_accountStatus_idx";

-- AlterTable
ALTER TABLE "TvPresentationSettings" ADD COLUMN     "rankingTitle" TEXT NOT NULL DEFAULT '';
