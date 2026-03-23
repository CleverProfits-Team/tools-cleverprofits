'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, AlertCircle, ChevronDown } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { WizardShell } from '@/components/forms/wizard-shell'
import { cn } from '@/lib/utils'

export default function IdentifyPage() {
  const router = useRouter()

  const [url,        setUrl]        = useState('')
  const [name,       setName]       = useState('')
  const [github,     setGithub]     = useState('')
  const [showGithub, setShowGithub] = useState(false)
  const [errors,     setErrors]     = useState<Record<string, string>>({})
  const [loading,    setLoading]    = useState(false)
  const [serverErr,  setServerErr]  = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const errs: Record<string, string> = {}
    if (!url.trim()) {
      errs.url = 'Tool URL is required'
    } else if (!url.startsWith('https://') && !url.startsWith('http://')) {
      errs.url = 'URL must start with http:// or https://'
    }
    setErrors(errs)
    if (Object.keys(errs).length) return

    setLoading(true)
    setServerErr('')
    try {
      const res = await fetch('/api/tools/draft', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          externalUrl:   url.trim(),
          name:          name.trim()   || undefined,
          githubRepoUrl: github.trim() || undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        const msg =
          data?.issues?.externalUrl?.[0]    ??
          data?.issues?.githubRepoUrl?.[0]  ??
          data?.error                        ??
          'Something went wrong'
        setServerErr(msg)
        return
      }
      router.push(`/dashboard/register/ownership/${data.id}`)
    } catch {
      setServerErr('Network error. Please check your connection.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <WizardShell
      currentStep={1}
      title="Register a new tool"
      subtitle="Start with the tool's URL — we'll analyze it automatically and fill in the details."
    >
      <form onSubmit={handleSubmit} noValidate className="space-y-6">

        {/* Tool URL */}
        <div>
          <Label htmlFor="url">
            Tool URL <span className="text-red-500">*</span>
          </Label>
          <Input
            id="url"
            type="url"
            placeholder="https://my-app.up.railway.app"
            value={url}
            onChange={(e) => { setUrl(e.target.value); setErrors((p) => ({ ...p, url: '' })) }}
            error={errors.url}
            autoFocus
            autoComplete="off"
            spellCheck={false}
          />
          {errors.url
            ? <p className="text-xs text-red-500 mt-1.5">{errors.url}</p>
            : <p className="text-xs text-slate-400 mt-1.5">
                The Railway (or any HTTPS) URL of the tool. Never exposed to end users.
              </p>
          }
        </div>

        {/* Tool name (optional) */}
        <div>
          <Label htmlFor="name">
            Tool name{' '}
            <span className="font-normal text-slate-400">(optional)</span>
          </Label>
          <Input
            id="name"
            placeholder="Auto-generated from URL if left blank"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoComplete="off"
          />
        </div>

        {/* GitHub (collapsible) */}
        <div>
          <button
            type="button"
            onClick={() => setShowGithub((v) => !v)}
            className="flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-700 transition-colors"
          >
            <ChevronDown
              className={cn('h-3.5 w-3.5 transition-transform duration-150', showGithub && 'rotate-180')}
              aria-hidden
            />
            Add GitHub repository{' '}
            <span className="font-normal text-slate-400">(optional)</span>
          </button>

          {showGithub && (
            <div className="mt-3">
              <Input
                id="github"
                type="url"
                placeholder="https://github.com/org/repo"
                value={github}
                onChange={(e) => setGithub(e.target.value)}
                autoComplete="off"
                spellCheck={false}
              />
              <p className="text-xs text-slate-400 mt-1.5">
                Enriches AI analysis with README, tech stack, and topics.
              </p>
            </div>
          )}
        </div>

        {/* Server error */}
        {serverErr && (
          <div className="flex items-start gap-2 rounded-lg bg-red-50 border border-red-200 px-3.5 py-3 text-sm text-red-700">
            <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" aria-hidden />
            {serverErr}
          </div>
        )}

        <div className="flex items-center gap-3 pt-1 border-t border-slate-100">
          <Button type="submit" disabled={loading}>
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
