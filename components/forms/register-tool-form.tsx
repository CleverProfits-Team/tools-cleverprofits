'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircle2, AlertCircle, Loader2, ExternalLink, Copy, Check, X } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { nameToSlug } from '@/lib/validations'
import { cn } from '@/lib/utils'

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

type SlugState = 'idle' | 'checking' | 'available' | 'taken' | 'invalid'

interface FormValues {
  name:        string
  slug:        string
  externalUrl: string
  description: string
  team:        string
  accessLevel: string
  notes:       string
  tags:        string[]
}

interface FieldErrors {
  name?:        string
  slug?:        string
  externalUrl?: string
  accessLevel?: string
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

const ACCESS_OPTIONS = [
  { value: '',            label: 'Select access level…' },
  { value: 'INTERNAL',   label: 'Internal — all employees' },
  { value: 'RESTRICTED', label: 'Restricted — specific teams' },
  { value: 'LEADERSHIP', label: 'Leadership — exec only' },
]

function SlugStatus({ state, reason }: { state: SlugState; reason?: string }) {
  if (state === 'idle') return null

  if (state === 'checking') {
    return (
      <span className="flex items-center gap-1 text-xs text-slate-400">
        <Loader2 className="h-3 w-3 animate-spin" aria-hidden />
        Checking…
      </span>
    )
  }
  if (state === 'available') {
    return (
      <span className="flex items-center gap-1 text-xs text-emerald-600">
        <CheckCircle2 className="h-3 w-3" aria-hidden />
        Available
      </span>
    )
  }
  return (
    <span className="flex items-center gap-1 text-xs text-red-500">
      <AlertCircle className="h-3 w-3" aria-hidden />
      {reason ?? 'Unavailable'}
    </span>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

export function RegisterToolForm() {
  const router = useRouter()

  const [values, setValues] = useState<FormValues>({
    name:        '',
    slug:        '',
    externalUrl: '',
    description: '',
    team:        '',
    accessLevel: '',
    notes:       '',
    tags:        [],
  })
  const [tagInput, setTagInput] = useState('')
  const [fieldErrors,  setFieldErrors]  = useState<FieldErrors>({})
  const [slugState,    setSlugState]    = useState<SlugState>('idle')
  const [slugReason,   setSlugReason]   = useState<string>()
  const [slugEdited,   setSlugEdited]   = useState(false) // true once user manually edits slug

  const [submitting,   setSubmitting]   = useState(false)
  const [serverError,  setServerError]  = useState<string>()

  // Success state
  const [registeredSlug, setRegisteredSlug] = useState<string>()
  const [copied,         setCopied]         = useState(false)

  const debounceRef = useRef<ReturnType<typeof setTimeout>>()
  const abortRef    = useRef<AbortController>()

  // ── Auto-generate slug from name ────────────────────────────────────────
  useEffect(() => {
    if (!slugEdited) {
      setValues((v) => ({ ...v, slug: nameToSlug(v.name) }))
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [values.name])

  // ── Debounced slug availability check ───────────────────────────────────
  const checkSlug = useCallback((slug: string) => {
    clearTimeout(debounceRef.current)
    abortRef.current?.abort()

    if (!slug) {
      setSlugState('idle')
      return
    }

    setSlugState('checking')

    debounceRef.current = setTimeout(async () => {
      const ctrl = new AbortController()
      abortRef.current = ctrl

      try {
        const res = await fetch(
          `/api/tools/check-slug?slug=${encodeURIComponent(slug)}`,
          { signal: ctrl.signal },
        )
        if (!res.ok) throw new Error('Request failed')
        const data: { available: boolean; reason?: string } = await res.json()
        setSlugState(data.available ? 'available' : 'taken')
        setSlugReason(data.reason)
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') return
        setSlugState('invalid')
        setSlugReason('Could not verify availability')
      }
    }, 400)
  }, [])

  useEffect(() => {
    checkSlug(values.slug)
  }, [values.slug, checkSlug])

  // ── Field change handlers ────────────────────────────────────────────────
  function set(field: keyof FormValues) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
      const val = e.target.value
      setValues((v) => ({ ...v, [field]: val }))
      setFieldErrors((fe) => ({ ...fe, [field]: undefined }))
      if (field === 'slug') setSlugEdited(true)
    }
  }

  // ── Client-side validation ───────────────────────────────────────────────
  function validate(): boolean {
    const errors: FieldErrors = {}

    if (!values.name.trim())        errors.name        = 'Name is required'
    if (!values.slug.trim())        errors.slug        = 'Slug is required'
    if (!values.externalUrl.trim()) errors.externalUrl = 'External URL is required'
    if (!values.accessLevel)        errors.accessLevel = 'Access level is required'

    if (values.externalUrl && !values.externalUrl.startsWith('https://')) {
      errors.externalUrl = 'URL must start with https://'
    }

    if (slugState === 'taken' || slugState === 'invalid') {
      errors.slug = slugReason ?? 'Slug is unavailable'
    }

    setFieldErrors(errors)
    return Object.keys(errors).length === 0
  }

  // ── Submit ───────────────────────────────────────────────────────────────
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setServerError(undefined)

    if (!validate()) return

    setSubmitting(true)
    try {
      const res = await fetch('/api/tools', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name:        values.name.trim(),
          slug:        values.slug.trim(),
          externalUrl: values.externalUrl.trim(),
          description: values.description.trim() || undefined,
          team:        values.team.trim()         || undefined,
          accessLevel: values.accessLevel,
          notes:       values.notes.trim()        || undefined,
          tags:        values.tags,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        if (res.status === 409) {
          setFieldErrors((fe) => ({ ...fe, slug: 'This slug is already taken' }))
        } else if (data?.error) {
          setServerError(data.error)
        } else {
          setServerError('Something went wrong. Please try again.')
        }
        return
      }

      setRegisteredSlug(data.slug)
    } catch {
      setServerError('Network error. Please check your connection.')
    } finally {
      setSubmitting(false)
    }
  }

  async function copyUrl() {
    if (!registeredSlug) return
    const url = `${window.location.origin}/${registeredSlug}`
    await navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // ── Success screen ───────────────────────────────────────────────────────
  if (registeredSlug) {
    const internalUrl = `${typeof window !== 'undefined' ? window.location.origin : 'https://cleverprofits.app'}/${registeredSlug}`

    return (
      <div className="flex flex-col items-center text-center py-10 px-4 max-w-md mx-auto animate-in">
        <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-emerald-50 to-emerald-100 flex items-center justify-center mb-5 ring-1 ring-emerald-200 shadow-sm">
          <CheckCircle2 className="h-7 w-7 text-emerald-600" aria-hidden />
        </div>
        <h2 className="font-display font-bold text-xl text-[#0F0038] mb-2 tracking-tight">Your tool is in the queue</h2>
        <p className="text-sm text-slate-400 mb-6 leading-relaxed max-w-xs">
          An admin will review it shortly. Once approved, it'll be live at:
        </p>

        {/* URL pill */}
        <div className="flex items-center gap-2 w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 mb-6">
          <ExternalLink className="h-3.5 w-3.5 text-slate-400 flex-shrink-0" aria-hidden />
          <span className="text-sm font-mono text-slate-700 flex-1 min-w-0 truncate">
            {internalUrl}
          </span>
          <button
            onClick={copyUrl}
            className="flex-shrink-0 text-slate-400 hover:text-slate-600 transition-colors"
            aria-label="Copy URL"
          >
            {copied
              ? <Check className="h-3.5 w-3.5 text-emerald-500" aria-hidden />
              : <Copy className="h-3.5 w-3.5" aria-hidden />}
          </button>
        </div>

        <div className="flex gap-3">
          <Button variant="secondary" onClick={() => router.push('/dashboard')}>
            Back to dashboard
          </Button>
          <Button
            onClick={() => {
              setRegisteredSlug(undefined)
              setValues({ name: '', slug: '', externalUrl: '', description: '', team: '', accessLevel: '', notes: '', tags: [] })
              setSlugEdited(false)
              setSlugState('idle')
            }}
          >
            Register another
          </Button>
        </div>
      </div>
    )
  }

  // ── Form ─────────────────────────────────────────────────────────────────
  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-8 max-w-xl">

      {/* ── Welcome header ──────────────────────────────────────────── */}
      <div className="pb-2">
        <p className="text-xs font-semibold text-[#2605EF]/70 uppercase tracking-widest mb-1">New tool</p>
        <h2 className="font-display font-bold text-xl text-[#0F0038] tracking-tight">
          Add your tool — we&apos;ll handle the rest
        </h2>
        <p className="text-sm text-slate-400 mt-1 leading-relaxed">
          Give us a name and a URL. Your tool goes live after a quick review.
        </p>
      </div>

      {/* ── Step indicator ──────────────────────────────────────────── */}
      <div className="flex items-center gap-0">
        {[
          { n: 1, label: 'Identity' },
          { n: 2, label: 'Access' },
          { n: 3, label: 'Details' },
        ].map((step, i) => (
          <div key={step.n} className="flex items-center flex-1 last:flex-none">
            <div className="flex items-center gap-2 flex-shrink-0">
              <span className={cn(
                'h-5 w-5 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 transition-all duration-300',
                values.name && values.slug && step.n === 1
                  ? 'bg-[#2605EF] text-white scale-110'
                  : step.n === 1 ? 'bg-[#2605EF]/10 text-[#2605EF]'
                  : values.accessLevel && step.n === 2
                  ? 'bg-[#2605EF] text-white scale-110'
                  : step.n === 2 ? 'bg-slate-100 text-slate-400'
                  : 'bg-slate-100 text-slate-400',
              )}>
                {step.n}
              </span>
              <span className="text-[11px] font-medium text-slate-400 hidden sm:block">{step.label}</span>
            </div>
            {i < 2 && (
              <div className="flex-1 h-px mx-2 transition-colors duration-500"
                style={{
                  background: (i === 0 && values.name && values.slug)
                    ? '#2605EF'
                    : (i === 1 && values.accessLevel)
                    ? '#2605EF'
                    : '#f1f5f9',
                }}
              />
            )}
          </div>
        ))}
      </div>

      {/* ── Section 1: Identity ─────────────────────────────────────── */}
      <div className="space-y-5">
        <SectionHeader label="Identity" />

        {/* Name */}
        <div>
          <Label htmlFor="name">Tool name <span className="text-red-500">*</span></Label>
          <Input
            id="name"
            placeholder="e.g. Revenue Dashboard"
            value={values.name}
            onChange={set('name')}
            error={fieldErrors.name}
            autoFocus
            autoComplete="off"
          />
          {fieldErrors.name && <FieldError>{fieldErrors.name}</FieldError>}
        </div>

        {/* Slug */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <Label htmlFor="slug" className="mb-0">
              URL slug <span className="text-red-500">*</span>
            </Label>
            <SlugStatus state={slugState} reason={slugReason} />
          </div>
          <div className="flex items-center">
            <span className="flex-shrink-0 h-9 px-3 flex items-center border border-r-0 border-slate-200 rounded-l-md bg-slate-50 text-slate-400 text-sm font-mono select-none">
              cleverprofits.app/
            </span>
            <Input
              id="slug"
              placeholder="revenue-dashboard"
              value={values.slug}
              onChange={set('slug')}
              error={fieldErrors.slug}
              className={cn(
                'rounded-l-none font-mono',
                slugState === 'available' && 'border-emerald-300 focus-visible:ring-emerald-300',
                (slugState === 'taken' || slugState === 'invalid') && 'border-red-300 focus-visible:ring-red-300',
              )}
              autoComplete="off"
              spellCheck={false}
            />
          </div>
          {!fieldErrors.slug && (
            <p className="text-xs text-slate-400 mt-1.5">
              Auto-generated from name · lowercase letters, numbers, hyphens only
            </p>
          )}
          {fieldErrors.slug && <FieldError>{fieldErrors.slug}</FieldError>}
        </div>
      </div>

      {/* ── Section 2: Connection ───────────────────────────────────── */}
      <div className="space-y-5">
        <SectionHeader label="Connection" />

        <div>
          <Label htmlFor="externalUrl">
            Railway URL <span className="text-red-500">*</span>
          </Label>
          <Input
            id="externalUrl"
            type="url"
            placeholder="https://my-app.up.railway.app"
            value={values.externalUrl}
            onChange={set('externalUrl')}
            error={fieldErrors.externalUrl}
            autoComplete="off"
            spellCheck={false}
          />
          <p className="text-xs text-slate-400 mt-1.5">
            Proxied server-side — the Railway URL is never exposed to users.
          </p>
          {fieldErrors.externalUrl && <FieldError>{fieldErrors.externalUrl}</FieldError>}
        </div>
      </div>

      {/* ── Section 3: Access ───────────────────────────────────────── */}
      <div className="space-y-5">
        <SectionHeader label="Access" />

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="accessLevel">
              Access level <span className="text-red-500">*</span>
            </Label>
            <Select
              id="accessLevel"
              value={values.accessLevel}
              onChange={set('accessLevel')}
              options={ACCESS_OPTIONS}
              error={fieldErrors.accessLevel}
            />
            {fieldErrors.accessLevel && <FieldError>{fieldErrors.accessLevel}</FieldError>}
          </div>

          <div>
            <Label htmlFor="team">Team <span className="text-slate-400 font-normal">(optional)</span></Label>
            <Input
              id="team"
              placeholder="Finance, Ops…"
              value={values.team}
              onChange={set('team')}
              autoComplete="off"
            />
          </div>
        </div>
      </div>

      {/* ── Section 4: Details ──────────────────────────────────────── */}
      <div className="space-y-5">
        <SectionHeader label="Details" note="optional" />

        <div>
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            placeholder="What does this tool do? Who should use it?"
            value={values.description}
            onChange={set('description')}
            rows={3}
          />
        </div>

        <div>
          <Label htmlFor="notes">Internal notes</Label>
          <Textarea
            id="notes"
            placeholder="Login credentials, onboarding tips, known issues…"
            value={values.notes}
            onChange={set('notes')}
            rows={3}
          />
          <p className="text-xs text-slate-400 mt-1.5">
            Visible to platform admins only.
          </p>
        </div>
      </div>

      {/* ── Section 5: Tags ──────────────────────────────────────── */}
      <div className="space-y-5">
        <SectionHeader label="Tags" note="optional" />
        <TagInput
          tags={values.tags}
          inputValue={tagInput}
          onInputChange={setTagInput}
          onAdd={(tag) => {
            if (!values.tags.includes(tag) && values.tags.length < 10) {
              setValues((v) => ({ ...v, tags: [...v.tags, tag] }))
            }
            setTagInput('')
          }}
          onRemove={(tag) => setValues((v) => ({ ...v, tags: v.tags.filter((t) => t !== tag) }))}
        />
      </div>

      {/* Server error */}
      {serverError && (
        <div className="flex items-start gap-2 rounded-lg bg-red-50 border border-red-200 px-3.5 py-3 text-sm text-red-700">
          <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" aria-hidden />
          {serverError}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-3 pt-4 border-t border-slate-100">
        <Button
          type="submit"
          disabled={submitting || slugState === 'checking'}
        >
          {submitting && <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />}
          {submitting ? 'Adding your tool…' : 'Add your tool'}
        </Button>
        <Button
          type="button"
          variant="ghost"
          onClick={() => router.push('/dashboard')}
        >
          Cancel
        </Button>
      </div>
    </form>
  )
}

// ── Small helpers ─────────────────────────────────────────────────────────────

function SectionHeader({ label, note }: { label: string; note?: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
        {label}
        {note && <span className="font-normal normal-case tracking-normal ml-1 text-slate-300">· {note}</span>}
      </span>
      <div className="flex-1 h-px bg-slate-100" />
    </div>
  )
}

function FieldError({ children }: { children: React.ReactNode }) {
  return <p className="text-xs text-red-500 mt-1">{children}</p>
}

interface TagInputProps {
  tags:          string[]
  inputValue:    string
  onInputChange: (val: string) => void
  onAdd:         (tag: string) => void
  onRemove:      (tag: string) => void
}

function TagInput({ tags, inputValue, onInputChange, onAdd, onRemove }: TagInputProps) {
  function commitTag(raw: string) {
    const tag = raw.trim().replace(/,+$/, '').trim()
    if (tag) onAdd(tag)
  }

  return (
    <div>
      <Label>Tags</Label>
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
              aria-label={`Remove tag ${tag}`}
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
              if (e.key === 'Enter' || e.key === ',') {
                e.preventDefault()
                commitTag(inputValue)
              } else if (e.key === 'Backspace' && !inputValue && tags.length > 0) {
                onRemove(tags[tags.length - 1])
              }
            }}
            onBlur={() => { if (inputValue.trim()) commitTag(inputValue) }}
            placeholder={tags.length === 0 ? 'Add tags… (Enter or comma to confirm)' : ''}
            className="flex-1 min-w-[120px] text-sm outline-none bg-transparent placeholder:text-slate-300 py-0.5"
          />
        )}
      </div>
      <p className="text-xs text-slate-400 mt-1.5">
        Up to 10 tags. Press Enter or comma to add.
      </p>
    </div>
  )
}
