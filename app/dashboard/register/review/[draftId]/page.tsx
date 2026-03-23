'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  Loader2, AlertCircle, AlertTriangle, Sparkles, X,
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
  return              { text: 'Low',    color: 'text-slate-500   bg-slate-100  ring-1 ring-slate-200'   }
}

function parseOverlapWarnings(raw: unknown): string[] {
  if (Array.isArray(raw)) return raw.filter((x) => typeof x === 'string') as string[]
  return []
}

function SectionDivider({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 pt-2">
      <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">{label}</span>
      <div className="flex-1 h-px bg-slate-100" />
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
      'flex flex-wrap gap-1.5 min-h-9 w-full rounded-md border border-slate-200 bg-white px-2.5 py-1.5',
      'focus-within:ring-2 focus-within:ring-[#d5d4ff] focus-within:border-[#2605EF] transition-colors',
    )}>
      {tags.map((tag) => (
        <span
          key={tag}
          className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700"
        >
          {tag}
          <button
            type="button"
            onClick={() => onRemove(tag)}
            className="text-slate-400 hover:text-slate-700 transition-colors"
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
          className="flex-1 min-w-[120px] text-sm outline-none bg-transparent placeholder:text-slate-300 py-0.5"
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
  const [name,        setName]        = useState('')
  const [summary,     setSummary]     = useState('')
  const [description, setDescription] = useState('')
  const [notes,       setNotes]       = useState('')
  const [tags,        setTags]        = useState<string[]>([])
  const [tagInput,    setTagInput]    = useState('')

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
          name:        name.trim(),
          description: description.trim() || '',
          notes:       notes.trim()       || '',
          tags,
          aiSummary:   summary.trim()     || '',
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
      setServerErr('Network error. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  // ── Loading ────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <WizardShell currentStep={4} title="Review your tool" maxWidth="max-w-2xl">
        <div className="flex items-center gap-2 text-slate-400 py-6">
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
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600 capitalize">
                {aiCategory}
              </span>
            )}
            {aiFrameworkGuess && (
              <span className="text-xs text-slate-500">{aiFrameworkGuess}</span>
            )}
            {aiTechStack && aiTechStack !== aiFrameworkGuess && (
              <span className="text-xs text-slate-400">{aiTechStack}</span>
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
              <span className="font-normal text-slate-400">(one sentence)</span>
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

        {/* ── Additional context (AI display) ─────────────────────────── */}
        {(aiObjective || aiSuggestedUsers) && (
          <div className="space-y-3">
            <SectionDivider label="AI Insights" />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {aiObjective && (
                <div className="rounded-lg bg-slate-50 border border-slate-200 px-3.5 py-3">
                  <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Objective</p>
                  <p className="text-sm text-slate-700">{aiObjective}</p>
                </div>
              )}
              {aiSuggestedUsers && (
                <div className="rounded-lg bg-slate-50 border border-slate-200 px-3.5 py-3">
                  <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">For</p>
                  <p className="text-sm text-slate-700">{aiSuggestedUsers}</p>
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
            <p className="text-xs text-slate-400 mt-1.5">
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
              <span className="font-normal text-slate-400">(optional)</span>
            </Label>
            <Textarea
              id="notes"
              placeholder="Login credentials, onboarding tips, known issues…"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
            <p className="text-xs text-slate-400 mt-1.5">Visible to platform admins only.</p>
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
        <div className="flex items-center gap-3 pt-1 border-t border-slate-100">
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
