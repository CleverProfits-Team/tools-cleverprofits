-- AlterTable: add owner and maintainer fields to tools
ALTER TABLE "tools" ADD COLUMN "ownerName"       TEXT;
ALTER TABLE "tools" ADD COLUMN "ownerEmail"      TEXT;
ALTER TABLE "tools" ADD COLUMN "maintainerName"  TEXT;
ALTER TABLE "tools" ADD COLUMN "maintainerEmail" TEXT;
