-- CreateTable
CREATE TABLE "favorites" (
    "id" TEXT NOT NULL,
    "userEmail" TEXT NOT NULL,
    "toolId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "favorites_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "favorites_userEmail_toolId_key" ON "favorites"("userEmail", "toolId");

-- CreateIndex
CREATE INDEX "favorites_userEmail_idx" ON "favorites"("userEmail");
