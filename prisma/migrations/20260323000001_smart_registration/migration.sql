-- ─────────────────────────────────────────────────────────────────────────────
-- Smart Registration: Schema additions
-- Phase 1 of the intelligent tool registration redesign.
--
-- Changes:
--   1. Add DRAFT value to ToolStatus enum
--   2. Create AnalysisStatus enum
--   3. Add Smart Registration + AI analysis columns to tools table
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Add DRAFT to the existing ToolStatus enum.
--    Note: ALTER TYPE … ADD VALUE cannot be rolled back if the transaction
--    aborts, but it is safe to run on PostgreSQL 12+ (Railway uses PG 16).
ALTER TYPE "ToolStatus" ADD VALUE 'DRAFT';

-- 2. Create the new AnalysisStatus enum.
CREATE TYPE "AnalysisStatus" AS ENUM (
  'PENDING_ANALYSIS',
  'ANALYZING',
  'ANALYSIS_COMPLETE',
  'ANALYSIS_FAILED'
);

-- 3. Add new columns to tools table.
ALTER TABLE "tools"
  -- Smart Registration metadata
  ADD COLUMN "githubRepoUrl"     TEXT,
  ADD COLUMN "isExperimental"    BOOLEAN      NOT NULL DEFAULT false,

  -- Analysis pipeline state
  ADD COLUMN "analysisStatus"    "AnalysisStatus" NOT NULL DEFAULT 'PENDING_ANALYSIS',
  ADD COLUMN "analysisError"     TEXT,
  ADD COLUMN "lastAnalyzedAt"    TIMESTAMP(3),
  ADD COLUMN "analysisSnapshot"  TEXT,

  -- AI-generated profile
  ADD COLUMN "aiTitle"           TEXT,
  ADD COLUMN "aiSummary"         TEXT,
  ADD COLUMN "aiDescription"     TEXT,
  ADD COLUMN "aiObjective"       TEXT,
  ADD COLUMN "aiSuggestedUsers"  TEXT,
  ADD COLUMN "aiCategory"        TEXT,
  ADD COLUMN "aiTechStack"       TEXT,
  ADD COLUMN "aiFrameworkGuess"  TEXT,
  ADD COLUMN "aiConfidence"      DOUBLE PRECISION,
  ADD COLUMN "aiOverlapWarnings" JSONB;
