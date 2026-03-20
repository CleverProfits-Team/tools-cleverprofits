'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircle2, AlertCircle, Loader2, ExternalLink, Copy, Check } from 'lucide-react'
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
  })
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
    const internalUrl = `${typeof window !== 'undefined' ? window.location.origin : 'https://tools.cleverprofits.com'}/${registeredSlug}`

    return (
      <div className="flex flex-col items-center text-center py-8 px-4 max-w-md mx-auto">
        <div className="h-12 w-12 rounded-full bg-emerald-50 flex items-center justify-center mb-4 ring-1 ring-emerald-200">
          <CheckCircle2 className="h-6 w-6 text-emerald-600" aria-hidden />
        </div>
        <h2 className="text-lg font-semibold text-slate-900 mb-1">Tool registered</h2>
        <p className="text-sm text-slate-500 mb-6">
          It&apos;s pending review. Once approved, it will be accessible at:
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
              setValues({ name: '', slug: '', externalUrl: '', description: '', team: '', accessLevel: '', notes: '' })
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
    <form onSubmit={handleSubmit} noValidate className="space-y-6 max-w-xl">

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
            /
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
          <p className="text-xs text-slate-400 mt-1">
            Auto-generated from name. Lowercase letters, numbers, and hyphens only.
          </p>
        )}
      </div>

      {/* External URL */}
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
        <p className="text-xs text-slate-400 mt-1">
          The Railway deployment URL that will be proxied. Never exposed to users.
        </p>
      </div>

      {/* Access level */}
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
      </div>

      {/* Team (optional) */}
      <div>
        <Label htmlFor="team">Team <span className="text-slate-400 font-normal">(optional)</span></Label>
        <Input
          id="team"
          placeholder="e.g. Finance, Marketing, Operations…"
          value={values.team}
          onChange={set('team')}
          autoComplete="off"
        />
      </div>

      {/* Description (optional) */}
      <div>
        <Label htmlFor="description">Description <span className="text-slate-400 font-normal">(optional)</span></Label>
        <Textarea
          id="description"
          placeholder="What does this tool do? Who should use it?"
          value={values.description}
          onChange={set('description')}
          rows={3}
        />
      </div>

      {/* Notes (optional) */}
      <div>
        <Label htmlFor="notes">Internal notes <span className="text-slate-400 font-normal">(optional)</span></Label>
        <Textarea
          id="notes"
          placeholder="Login credentials, onboarding tips, known issues…"
          value={values.notes}
          onChange={set('notes')}
          rows={3}
        />
        <p className="text-xs text-slate-400 mt-1">
          Only visible to platform admins — not shown to end users.
        </p>
      </div>

      {/* Server error */}
      {serverError && (
        <div className="flex items-start gap-2 rounded-lg bg-red-50 border border-red-200 px-3 py-2.5 text-sm text-red-700">
          <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" aria-hidden />
          {serverError}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-3 pt-2">
        <Button
          type="submit"
          disabled={submitting || slugState === 'checking'}
        >
          {submitting && <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />}
          {submitting ? 'Registering…' : 'Register tool'}
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
