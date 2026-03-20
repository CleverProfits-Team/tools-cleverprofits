-- CreateEnum
CREATE TYPE "AccessLevel" AS ENUM ('INTERNAL', 'RESTRICTED', 'LEADERSHIP');

-- CreateEnum
CREATE TYPE "ToolStatus" AS ENUM ('ACTIVE', 'PENDING', 'ARCHIVED');

-- CreateTable
CREATE TABLE "tools" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "externalUrl" TEXT NOT NULL,
    "description" TEXT,
    "notes" TEXT,
    "team" TEXT,
    "accessLevel" "AccessLevel" NOT NULL DEFAULT 'INTERNAL',
    "status" "ToolStatus" NOT NULL DEFAULT 'PENDING',
    "createdByName" TEXT NOT NULL,
    "createdByEmail" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tools_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "tools_slug_key" ON "tools"("slug");
