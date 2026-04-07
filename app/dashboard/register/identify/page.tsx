'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, AlertCircle, CheckCircle2 } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { WizardShell } from '@/components/forms/wizard-shell'
import { nameToSlug } from '@/lib/validations'
import { cn } from '@/lib/utils'

type SlugState = 'idle' | 'checking' | 'available' | 'taken' | 'invalid'

function SlugStatus({ state, reason }: { state: SlugState; reason?: string }) {
  if (state === 'idle')      return null
  if (state === 'checking')  return <span className="flex items-center gap-1 text-xs text-[#94a3b8]"><Loader2 className="h-3 w-3 animate-spin" />Checking…</span>
  if (state === 'available') return <span className="flex items-center gap-1 text-xs text-emerald-600"><CheckCircle2 className="h-3 w-3" />Available</span>
  return <span className="flex items-center gap-1 text-xs text-red-500"><AlertCircle className="h-3 w-3" />{reason ?? 'Unavailable'}</span>
}

export default function IdentifyPage() {
  const router = useRouter()

  const [name,        setName]        = useState('')
  const [slug,        setSlug]        = useState('')
  const [slugEdited,  setSlugEdited]  = useState(false)
  const [slugState,   setSlugState]   = useState<SlugState>('idle')
  const [slugReason,  setSlugReason]  = useState<string>()
  const [url,         setUrl]         = useState('')
  const [github,      setGithub]      = useState('')
  const [description, setDescription] = useState('')
  const [errors,      setErrors]      = useState<Record<string, string>>({})
  const [loading,     setLoading]     = useState(false)
  const [serverErr,   setServerErr]   = useState('')

  const debounceRef = useRef<ReturnType<typeof setTimeout>>()
  const abortRef    = useRef<AbortController>()

  // Auto-generate slug from name
  useEffect(() => {
    if (!slugEdited) setSlug(nameToSlug(name))
  }, [name, slugEdited])

  // Debounced slug availability check
  const checkSlug = useCallback((value: string) => {
    clearTimeout(debounceRef.current)
    abortRef.current?.abort()
    if (!value) { setSlugState('idle'); return }
    setSlugState('checking')
    debounceRef.current = setTimeout(async () => {
      const ctrl = new AbortController()
      abortRef.current = ctrl
      try {
        const res  = await fetch(`/api/tools/check-slug?slug=${encodeURIComponent(value)}`, { signal: ctrl.signal })
        const data = await res.json()
        setSlugState(data.available ? 'available' : 'taken')
        setSlugReason(data.reason)
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') return
        setSlugState('invalid')
        setSlugReason('Could not verify availability')
      }
    }, 400)
  }, [])

  useEffect(() => { checkSlug(slug) }, [slug, checkSlug])

  function validate() {
    const errs: Record<string, string> = {}
    if (!name.trim())        errs.name = 'Tool name is required'
    if (!slug.trim())        errs.slug = 'URL slug is required'
    if (slugState === 'taken' || slugState === 'invalid') errs.slug = slugReason ?? 'Slug is unavailable'
    if (!url.trim()) {
      errs.url = 'Tool URL is required'
    } else if (!url.startsWith('https://') && !url.startsWith('http://')) {
      errs.url = 'URL must start with http:// or https://'
    }
    if (!github.trim())      errs.github = 'GitHub repo URL is required'
    else if (!github.includes('github.com')) errs.github = 'Must be a GitHub URL (github.com/…)'
    if (!description.trim()) errs.description = 'Brief description is required'
    return errs
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const errs = validate()
    setErrors(errs)
    if (Object.keys(errs).length) return

    setLoading(true)
    setServerErr('')
    try {
      const res = await fetch('/api/tools/draft', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name:          name.trim(),
          slug:          slug.trim(),
          externalUrl:   url.trim(),
          githubRepoUrl: github.trim(),
          description:   description.trim(),
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        if (data?.issues?.slug?.[0] || res.status === 409) {
          setErrors((p) => ({ ...p, slug: data?.issues?.slug?.[0] ?? 'This slug is already taken' }))
        } else {
          setServerErr(
            data?.issues?.externalUrl?.[0]   ??
            data?.issues?.githubRepoUrl?.[0] ??
            data?.issues?.description?.[0]   ??
            data?.error ?? 'Something went wrong'
          )
        }
        return
      }
      router.push(`/dashboard/register/ownership/${data.id}`)
    } catch {
      setServerErr('Network error. Check your connection and try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <WizardShell
      currentStep={1}
      title="Register a new tool"
      subtitle="Provide the basics — we'll use AI to fill in the rest automatically."
    >
      <form onSubmit={handleSubmit} noValidate className="space-y-6">

        {/* Tool name */}
        <div>
          <Label htmlFor="name">Tool name <span className="text-red-500">*</span></Label>
          <Input
            id="name"
            placeholder="e.g. KPIs Dashboard"
            value={name}
            onChange={(e) => { setName(e.target.value); setErrors((p) => ({ ...p, name: '' })) }}
            error={errors.name}
            autoFocus
            autoComplete="off"
          />
          {errors.name && <p className="text-xs text-red-500 mt-1.5">{errors.name}</p>}
        </div>

        {/* URL slug */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <Label htmlFor="slug" className="mb-0">URL slug <span className="text-red-500">*</span></Label>
            <SlugStatus state={slugState} reason={slugReason} />
          </div>
          <div className="flex items-center">
            <span className="flex-shrink-0 h-9 px-3 flex items-center border border-r-0 border-[#e2e8f0] rounded-l-md bg-[#f4f3f3] text-[#94a3b8] text-sm font-mono select-none">
              tools.cleverprofits.com/
            </span>
            <Input
              id="slug"
              placeholder="kpis-dashboard"
              value={slug}
              onChange={(e) => { setSlug(e.target.value); setSlugEdited(true); setErrors((p) => ({ ...p, slug: '' })) }}
              error={errors.slug}
              className={cn(
                'rounded-l-none font-mono',
                slugState === 'available' && 'border-emerald-300 focus-visible:ring-emerald-300',
                (slugState === 'taken' || slugState === 'invalid') && 'border-red-300 focus-visible:ring-red-300',
              )}
              autoComplete="off"
              spellCheck={false}
            />
          </div>
          {errors.slug
            ? <p className="text-xs text-red-500 mt-1.5">{errors.slug}</p>
            : <p className="text-xs text-[#94a3b8] mt-1.5">Auto-generated from name · lowercase, numbers, hyphens only</p>
          }
        </div>

        {/* Tool URL */}
        <div>
          <Label htmlFor="url">Tool URL <span className="text-red-500">*</span></Label>
          <Input
            id="url"
            type="url"
            placeholder="https://my-app.up.railway.app"
            value={url}
            onChange={(e) => { setUrl(e.target.value); setErrors((p) => ({ ...p, url: '' })) }}
            error={errors.url}
            autoComplete="off"
            spellCheck={false}
          />
          {errors.url
            ? <p className="text-xs text-red-500 mt-1.5">{errors.url}</p>
            : <p className="text-xs text-[#94a3b8] mt-1.5">The Railway (or any HTTPS) URL. Never exposed to end users.</p>
          }
        </div>

        {/* GitHub repo */}
        <div>
          <Label htmlFor="github">GitHub repository <span className="text-red-500">*</span></Label>
          <Input
            id="github"
            type="url"
            placeholder="https://github.com/operations-cleverprofits/my-tool"
            value={github}
            onChange={(e) => { setGithub(e.target.value); setErrors((p) => ({ ...p, github: '' })) }}
            error={errors.github}
            autoComplete="off"
            spellCheck={false}
          />
          {errors.github
            ? <p className="text-xs text-red-500 mt-1.5">{errors.github}</p>
            : <p className="text-xs text-[#94a3b8] mt-1.5">Used to read the README and tech stack for AI analysis.</p>
          }
        </div>

        {/* Description */}
        <div>
          <Label htmlFor="description">Brief description <span className="text-red-500">*</span></Label>
          <Textarea
            id="description"
            placeholder="What does this tool do? Who uses it and what problem does it solve?"
            value={description}
            onChange={(e) => { setDescription(e.target.value); setErrors((p) => ({ ...p, description: '' })) }}
            rows={3}
          />
          {errors.description
            ? <p className="text-xs text-red-500 mt-1.5">{errors.description}</p>
            : <p className="text-xs text-[#94a3b8] mt-1.5">2–3 sentences — the most important input for AI analysis.</p>
          }
        </div>

        {serverErr && (
          <div className="flex items-start gap-2 rounded-lg bg-red-50 border border-red-200 px-3.5 py-3 text-sm text-red-700">
            <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" aria-hidden />
            {serverErr}
          </div>
        )}

        <div className="flex items-center gap-3 pt-1 border-t border-[#e2e8f0]">
          <Button type="submit" disabled={loading || slugState === 'checking'}>
            {loading && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" aria-hidden />}
            {loading ? 'Creating…' : 'Continue'}
          </Button>
          <Button type="button" variant="ghost" onClick={() => router.push('/dashboard')}>
            Cancel
          </Button>
        </div>
      </form>
    </WizardShell>
  )
}
