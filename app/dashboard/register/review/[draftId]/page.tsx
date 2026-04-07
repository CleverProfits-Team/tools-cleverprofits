'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  Loader2, AlertCircle, AlertTriangle, Sparkles, X, User, Wrench,
} from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { WizardShell } from '@/components/forms/wizard-shell'
import { cn } from '@/lib/utils'

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface FullDraft {
  id:               string
  name:             string
  externalUrl:      string
  description:      string | null
  notes:            string | null
  team:             string | null
  ownerName:        string | null
  ownerEmail:       string | null
  maintainerName:   string | null
  maintainerEmail:  string | null
  analysisStatus:   string
  aiTitle:          string | null
  aiSummary:        string | null
  aiDescription:    string | null
  aiObjective:      string | null
  aiSuggestedUsers: string | null
  aiCategory:       string | null
  aiTechStack:      string | null
  aiFrameworkGuess: string | null
  aiConfidence:     number | null
  aiOverlapWarnings: unknown
  tags:             { id: string; name: string }[]
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function confidenceLabel(v: number): { text: string; color: string } {
  if (v >= 0.8) return { text: 'High',   color: 'text-emerald-700 bg-emerald-50 ring-1 ring-emerald-200' }
  if (v >= 0.5) return { text: 'Medium', color: 'text-amber-700   bg-amber-50   ring-1 ring-amber-200'   }
  return              { text: 'Low',    color: 'text-[#64748b]  bg-[#f4f3f3]  ring-1 ring-[#e2e8f0]'   }
}

function parseOverlapWarnings(raw: unknown): string[] {
  if (Array.isArray(raw)) return raw.filter((x) => typeof x === 'string') as string[]
  return []
}

function SectionDivider({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 pt-2">
      <span className="text-xs font-semibold font-display uppercase tracking-wider text-[#94a3b8]">{label}</span>
      <div className="flex-1 h-px bg-[#e2e8f0]" />
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Tag Input
// ─────────────────────────────────────────────────────────────────────────────

interface TagInputProps {
  tags:          string[]
  inputValue:    string
  onInputChange: (val: string) => void
  onAdd:         (tag: string) => void
  onRemove:      (tag: string) => void
}

function TagInput({ tags, inputValue, onInputChange, onAdd, onRemove }: TagInputProps) {
  function commit(raw: string) {
    const tag = raw.trim().replace(/,+$/, '').trim()
    if (tag && !tags.includes(tag) && tags.length < 10) onAdd(tag)
  }

  return (
    <div className={cn(
      'flex flex-wrap gap-1.5 min-h-9 w-full rounded-md border border-[#e2e8f0] bg-white px-2.5 py-1.5',
      'focus-within:ring-2 focus-within:ring-[#2605EF]/25 focus-within:border-[#2605EF]/60 transition-colors',
    )}>
      {tags.map((tag) => (
        <span
          key={tag}
          className="inline-flex items-center gap-1 rounded-full bg-[#f4f3f3] px-2 py-0.5 text-xs font-medium text-[#64748b]"
        >
          {tag}
          <button
            type="button"
            onClick={() => onRemove(tag)}
            className="text-[#94a3b8] hover:text-[#64748b] transition-colors"
            aria-label={`Remove ${tag}`}
          >
            <X className="h-2.5 w-2.5" aria-hidden />
          </button>
        </span>
      ))}
      {tags.length < 10 && (
        <input
          type="text"
          value={inputValue}
          onChange={(e) => onInputChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); commit(inputValue) }
            else if (e.key === 'Backspace' && !inputValue && tags.length > 0) onRemove(tags[tags.length - 1])
          }}
          onBlur={() => { if (inputValue.trim()) commit(inputValue) }}
          placeholder={tags.length === 0 ? 'Add tags… (Enter or comma)' : ''}
          className="flex-1 min-w-[120px] text-sm outline-none bg-transparent placeholder:text-[#94a3b8] py-0.5"
        />
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────────────────────────────────────

export default function ReviewPage({ params }: { params: { draftId: string } }) {
  const { draftId } = params
  const router      = useRouter()

  // Load state
  const [loading,  setLoading]  = useState(true)
  const [loadErr,  setLoadErr]  = useState('')

  // Form state
  const [name,            setName]            = useState('')
  const [summary,         setSummary]         = useState('')
  const [description,     setDescription]     = useState('')
  const [notes,           setNotes]           = useState('')
  const [ownerName,       setOwnerName]       = useState('')
  const [ownerEmail,      setOwnerEmail]      = useState('')
  const [maintainerName,  setMaintainerName]  = useState('')
  const [maintainerEmail, setMaintainerEmail] = useState('')
  const [tags,            setTags]            = useState<string[]>([])
  const [tagInput,        setTagInput]        = useState('')

  // AI metadata (display only)
  const [aiCategory,       setAiCategory]       = useState<string | null>(null)
  const [aiTechStack,      setAiTechStack]       = useState<string | null>(null)
  const [aiFrameworkGuess, setAiFrameworkGuess]  = useState<string | null>(null)
  const [aiSuggestedUsers, setAiSuggestedUsers]  = useState<string | null>(null)
  const [aiObjective,      setAiObjective]       = useState<string | null>(null)
  const [aiConfidence,     setAiConfidence]      = useState<number | null>(null)
  const [overlapWarnings,  setOverlapWarnings]   = useState<string[]>([])
  const [hasAi,            setHasAi]             = useState(false)

  // Submit state
  const [submitting, setSubmitting] = useState(false)
  const [serverErr,  setServerErr]  = useState('')

  useEffect(() => {
    fetch(`/api/tools/${draftId}`)
      .then((r) => r.json())
      .then((d: FullDraft) => {
        if ('error' in d) { setLoadErr((d as { error: string }).error); return }

        const hasAnalysis = d.analysisStatus === 'ANALYSIS_COMPLETE'
        setHasAi(hasAnalysis)

        // Pre-fill form — AI suggestions take precedence over draft defaults
        setName(d.aiTitle        || d.name        || '')
        setSummary(d.aiSummary   || '')
        setDescription(d.aiDescription || d.description || '')
        setNotes(d.notes         || '')
        setOwnerName(d.ownerName         || '')
        setOwnerEmail(d.ownerEmail       || '')
        setMaintainerName(d.maintainerName   || '')
        setMaintainerEmail(d.maintainerEmail || '')
        setTags(d.tags?.map((t) => t.name) ?? [])

        // Display-only AI metadata
        setAiCategory(d.aiCategory)
        setAiTechStack(d.aiTechStack)
        setAiFrameworkGuess(d.aiFrameworkGuess)
        setAiSuggestedUsers(d.aiSuggestedUsers)
        setAiObjective(d.aiObjective)
        setAiConfidence(d.aiConfidence)
        setOverlapWarnings(parseOverlapWarnings(d.aiOverlapWarnings))
      })
      .catch(() => setLoadErr('Failed to load draft'))
      .finally(() => setLoading(false))
  }, [draftId])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) { setServerErr('Tool name is required'); return }

    setSubmitting(true)
    setServerErr('')
    try {
      // Save edits to draft
      const patchRes = await fetch(`/api/tools/${draftId}/draft`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name:            name.trim(),
          description:     description.trim() || '',
          notes:           notes.trim()       || '',
          tags,
          aiSummary:       summary.trim()     || '',
          ownerName:       ownerName.trim()       || '',
          ownerEmail:      ownerEmail.trim()      || '',
          maintainerName:  maintainerName.trim()  || '',
          maintainerEmail: maintainerEmail.trim() || '',
        }),
      })
      if (!patchRes.ok) {
        const d = await patchRes.json()
        setServerErr(d?.error ?? 'Failed to save changes')
        return
      }

      // Transition DRAFT → PENDING
      const submitRes = await fetch(`/api/tools/${draftId}/submit`, { method: 'POST' })
      if (!submitRes.ok) {
        const d = await submitRes.json()
        setServerErr(d?.error ?? 'Failed to submit')
        return
      }

      router.push(`/dashboard/register/success/${draftId}`)
    } catch {
      setServerErr('Network error. Check your connection and try again.')
    } finally {
      setSubmitting(false)
    }
  }

  // ── Loading ────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <WizardShell currentStep={4} title="Review your tool" maxWidth="max-w-2xl">
        <div className="flex items-center gap-2 text-[#94a3b8] py-6">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          <span className="text-sm">Loading analysis results…</span>
        </div>
      </WizardShell>
    )
  }

  // ── Error ──────────────────────────────────────────────────────────────────
  if (loadErr) {
    return (
      <WizardShell currentStep={4} title="Review your tool" maxWidth="max-w-2xl">
        <div className="flex items-start gap-2 rounded-lg bg-red-50 border border-red-200 px-3.5 py-3 text-sm text-red-700">
          <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" aria-hidden />
          {loadErr}
        </div>
      </WizardShell>
    )
  }

  const conf = aiConfidence !== null ? confidenceLabel(aiConfidence) : null

  return (
    <WizardShell
      currentStep={4}
      title="Review & submit"
      subtitle={hasAi
        ? 'AI has pre-filled the details below. Review, edit if needed, then submit for approval.'
        : 'Fill in the details below and submit your tool for admin approval.'
      }
      maxWidth="max-w-2xl"
    >
      <form onSubmit={handleSubmit} noValidate className="space-y-8">

        {/* ── AI metadata bar ─────────────────────────────────────────── */}
        {hasAi && (
          <div className="rounded-xl border border-[#2605EF]/15 bg-[#2605EF]/[0.03] px-4 py-3 flex flex-wrap items-center gap-3">
            <Sparkles className="h-3.5 w-3.5 text-[#2605EF] flex-shrink-0" aria-hidden />
            <span className="text-xs font-semibold text-[#2605EF]">AI analysis complete</span>
            {conf && (
              <span className={cn('rounded-full px-2 py-0.5 text-[11px] font-semibold', conf.color)}>
                {conf.text} confidence
              </span>
            )}
            {aiCategory && (
              <span className="rounded-full bg-[#f4f3f3] px-2 py-0.5 text-[11px] font-medium text-[#64748b] capitalize">
                {aiCategory}
              </span>
            )}
            {aiFrameworkGuess && (
              <span className="text-xs text-[#64748b]">{aiFrameworkGuess}</span>
            )}
            {aiTechStack && aiTechStack !== aiFrameworkGuess && (
              <span className="text-xs text-[#94a3b8]">{aiTechStack}</span>
            )}
          </div>
        )}

        {/* ── Overlap warnings ────────────────────────────────────────── */}
        {overlapWarnings.length > 0 && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 space-y-1.5">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-600 flex-shrink-0" aria-hidden />
              <p className="text-sm font-semibold text-amber-800">Possible overlap detected</p>
            </div>
            <p className="text-xs text-amber-700">
              This tool may overlap with: {overlapWarnings.join(', ')}. Consider checking those tools before submitting.
            </p>
          </div>
        )}

        {/* ── Profile ─────────────────────────────────────────────────── */}
        <div className="space-y-5">
          <SectionDivider label="Profile" />

          {/* Name */}
          <div>
            <Label htmlFor="name">
              Tool name <span className="text-red-500">*</span>
            </Label>
            <Input
              id="name"
              placeholder="e.g. Revenue Dashboard"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoComplete="off"
            />
          </div>

          {/* Summary */}
          <div>
            <Label htmlFor="summary">
              Summary{' '}
              <span className="font-normal text-[#94a3b8]">(one sentence)</span>
            </Label>
            <Input
              id="summary"
              placeholder="What does this tool do in one sentence?"
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              autoComplete="off"
            />
          </div>

          {/* Description */}
          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="2–3 sentences with more context about functionality and purpose."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>
        </div>

        {/* ── Ownership ───────────────────────────────────────────────── */}
        <div className="space-y-5">
          <SectionDivider label="Ownership" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Owner */}
            <div className="rounded-lg border border-[#e2e8f0] p-3.5 space-y-3">
              <div className="flex items-center gap-2">
                <User className="h-3.5 w-3.5 text-[#94a3b8]" aria-hidden />
                <p className="text-[11px] font-semibold font-display text-[#94a3b8] uppercase tracking-wider">Product owner</p>
              </div>
              <div className="space-y-2">
                <div>
                  <Label htmlFor="review-ownerName" className="text-xs">Name</Label>
                  <Input
                    id="review-ownerName"
                    placeholder="Full name"
                    value={ownerName}
                    onChange={(e) => setOwnerName(e.target.value)}
                    autoComplete="off"
                    className="h-8 text-sm"
                  />
                </div>
                <div>
                  <Label htmlFor="review-ownerEmail" className="text-xs">Email</Label>
                  <Input
                    id="review-ownerEmail"
                    type="email"
                    placeholder="owner@cleverprofits.com"
                    value={ownerEmail}
                    onChange={(e) => setOwnerEmail(e.target.value)}
                    autoComplete="off"
                    className="h-8 text-sm"
                  />
                </div>
              </div>
            </div>
            {/* Maintainer */}
            <div className="rounded-lg border border-[#e2e8f0] p-3.5 space-y-3">
              <div className="flex items-center gap-2">
                <Wrench className="h-3.5 w-3.5 text-[#94a3b8]" aria-hidden />
                <p className="text-[11px] font-semibold font-display text-[#94a3b8] uppercase tracking-wider">Maintainer</p>
              </div>
              <div className="space-y-2">
                <div>
                  <Label htmlFor="review-maintainerName" className="text-xs">
                    Name <span className="font-normal text-[#94a3b8]">(optional)</span>
                  </Label>
                  <Input
                    id="review-maintainerName"
                    placeholder="Full name"
                    value={maintainerName}
                    onChange={(e) => setMaintainerName(e.target.value)}
                    autoComplete="off"
                    className="h-8 text-sm"
                  />
                </div>
                <div>
                  <Label htmlFor="review-maintainerEmail" className="text-xs">
                    Email <span className="font-normal text-[#94a3b8]">(optional)</span>
                  </Label>
                  <Input
                    id="review-maintainerEmail"
                    type="email"
                    placeholder="maintainer@cleverprofits.com"
                    value={maintainerEmail}
                    onChange={(e) => setMaintainerEmail(e.target.value)}
                    autoComplete="off"
                    className="h-8 text-sm"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── Additional context (AI display) ─────────────────────────── */}
        {(aiObjective || aiSuggestedUsers) && (
          <div className="space-y-3">
            <SectionDivider label="AI Insights" />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {aiObjective && (
                <div className="rounded-lg bg-[#f4f3f3] border border-[#e2e8f0] px-3.5 py-3">
                  <p className="text-[10px] font-semibold font-display text-[#94a3b8] uppercase tracking-wider mb-1">Objective</p>
                  <p className="text-sm text-[#64748b]">{aiObjective}</p>
                </div>
              )}
              {aiSuggestedUsers && (
                <div className="rounded-lg bg-[#f4f3f3] border border-[#e2e8f0] px-3.5 py-3">
                  <p className="text-[10px] font-semibold font-display text-[#94a3b8] uppercase tracking-wider mb-1">For</p>
                  <p className="text-sm text-[#64748b]">{aiSuggestedUsers}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Tags ────────────────────────────────────────────────────── */}
        <div className="space-y-5">
          <SectionDivider label="Tags" />
          <div>
            <Label>Tags</Label>
            <TagInput
              tags={tags}
              inputValue={tagInput}
              onInputChange={setTagInput}
              onAdd={(tag) => setTags((prev) => [...prev, tag])}
              onRemove={(tag) => setTags((prev) => prev.filter((t) => t !== tag))}
            />
            <p className="text-xs text-[#94a3b8] mt-1.5">
              Up to 10 tags. Press Enter or comma to add.
            </p>
          </div>
        </div>

        {/* ── Notes ───────────────────────────────────────────────────── */}
        <div className="space-y-5">
          <SectionDivider label="Notes" />
          <div>
            <Label htmlFor="notes">
              Internal notes{' '}
              <span className="font-normal text-[#94a3b8]">(optional)</span>
            </Label>
            <Textarea
              id="notes"
              placeholder="Login credentials, onboarding tips, known issues…"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
            <p className="text-xs text-[#94a3b8] mt-1.5">Visible to platform admins only.</p>
          </div>
        </div>

        {/* ── Server error ─────────────────────────────────────────────── */}
        {serverErr && (
          <div className="flex items-start gap-2 rounded-lg bg-red-50 border border-red-200 px-3.5 py-3 text-sm text-red-700">
            <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" aria-hidden />
            {serverErr}
          </div>
        )}

        {/* ── Actions ──────────────────────────────────────────────────── */}
        <div className="flex items-center gap-3 pt-1 border-t border-[#e2e8f0]">
          <Button type="submit" disabled={submitting}>
            {submitting && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" aria-hidden />}
            {submitting ? 'Submitting…' : 'Submit for review'}
          </Button>
          <Button
            type="button"
            variant="ghost"
            onClick={() => router.back()}
          >
            Back
          </Button>
        </div>
      </form>
    </WizardShell>
  )
}
