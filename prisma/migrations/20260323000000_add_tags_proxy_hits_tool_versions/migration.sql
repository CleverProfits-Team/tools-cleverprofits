-- CreateTable: tags
CREATE TABLE "tags" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "tags_pkey" PRIMARY KEY ("id")
);

-- CreateTable: _ToolTags (many-to-many join table)
CREATE TABLE "_ToolTags" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

-- CreateTable: proxy_hits
CREATE TABLE "proxy_hits" (
    "id" TEXT NOT NULL,
    "toolId" TEXT NOT NULL,
    "toolSlug" TEXT NOT NULL,
    "toolName" TEXT NOT NULL,
    "method" TEXT NOT NULL,
    "path" VARCHAR(2048) NOT NULL,
    "statusCode" INTEGER NOT NULL,
    "durationMs" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "proxy_hits_pkey" PRIMARY KEY ("id")
);

-- CreateTable: tool_versions
CREATE TABLE "tool_versions" (
    "id" TEXT NOT NULL,
    "toolId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "changes" JSONB NOT NULL,
    "changedByEmail" TEXT NOT NULL,
    "changedByName" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tool_versions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "tags_name_key" ON "tags"("name");

-- CreateIndex
CREATE UNIQUE INDEX "_ToolTags_AB_unique" ON "_ToolTags"("A", "B");

-- CreateIndex
CREATE INDEX "_ToolTags_B_index" ON "_ToolTags"("B");

-- CreateIndex
CREATE INDEX "proxy_hits_toolId_idx" ON "proxy_hits"("toolId");

-- CreateIndex
CREATE INDEX "proxy_hits_createdAt_idx" ON "proxy_hits"("createdAt" DESC);

-- CreateIndex
CREATE INDEX "tool_versions_toolId_version_idx" ON "tool_versions"("toolId", "version");

-- AddForeignKey
ALTER TABLE "_ToolTags" ADD CONSTRAINT "_ToolTags_A_fkey" FOREIGN KEY ("A") REFERENCES "tags"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ToolTags" ADD CONSTRAINT "_ToolTags_B_fkey" FOREIGN KEY ("B") REFERENCES "tools"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "proxy_hits" ADD CONSTRAINT "proxy_hits_toolId_fkey" FOREIGN KEY ("toolId") REFERENCES "tools"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tool_versions" ADD CONSTRAINT "tool_versions_toolId_fkey" FOREIGN KEY ("toolId") REFERENCES "tools"("id") ON DELETE CASCADE ON UPDATE CASCADE;
