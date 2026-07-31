-- AlterTable
ALTER TABLE "Player" ADD COLUMN     "birthDate" TIMESTAMP(3),
ADD COLUMN     "category" TEXT,
ADD COLUMN     "email" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "gender" TEXT,
ADD COLUMN     "notes" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "phone" TEXT NOT NULL DEFAULT '';
