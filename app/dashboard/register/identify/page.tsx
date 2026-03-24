'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, AlertCircle } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { WizardShell } from '@/components/forms/wizard-shell'

export default function IdentifyPage() {
  const router = useRouter()

  const [url,         setUrl]         = useState('')
  const [name,        setName]        = useState('')
  const [github,      setGithub]      = useState('')
  const [description, setDescription] = useState('')
  const [errors,      setErrors]      = useState<Record<string, string>>({})
  const [loading,     setLoading]     = useState(false)
  const [serverErr,   setServerErr]   = useState('')

  function validate() {
    const errs: Record<string, string> = {}
    if (!url.trim()) {
      errs.url = 'Tool URL is required'
    } else if (!url.startsWith('https://') && !url.startsWith('http://')) {
      errs.url = 'URL must start with http:// or https://'
    }
    if (!github.trim()) {
      errs.github = 'GitHub repo URL is required'
    } else if (!github.includes('github.com')) {
      errs.github = 'Must be a GitHub URL (github.com/…)'
    }
    if (!description.trim()) {
      errs.description = 'Brief description is required'
    }
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
          externalUrl:   url.trim(),
          name:          name.trim()        || undefined,
          githubRepoUrl: github.trim(),
          description:   description.trim(),
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        const msg =
          data?.issues?.externalUrl?.[0]   ??
          data?.issues?.githubRepoUrl?.[0] ??
          data?.issues?.description?.[0]   ??
          data?.error                       ??
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
      subtitle="Provide the tool URL, its GitHub repo, and a brief description so we can analyze it accurately."
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
            : <p className="text-xs text-slate-400 mt-1.5">The Railway (or any HTTPS) URL. Never exposed to end users.</p>
          }
        </div>

        {/* GitHub repo */}
        <div>
          <Label htmlFor="github">
            GitHub repository <span className="text-red-500">*</span>
          </Label>
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
            : <p className="text-xs text-slate-400 mt-1.5">Used to read the README and tech stack for AI analysis.</p>
          }
        </div>

        {/* Description */}
        <div>
          <Label htmlFor="description">
            Brief description <span className="text-red-500">*</span>
          </Label>
          <Textarea
            id="description"
            placeholder="What does this tool do? Who uses it and what problem does it solve?"
            value={description}
            onChange={(e) => { setDescription(e.target.value); setErrors((p) => ({ ...p, description: '' })) }}
            rows={3}
          />
          {errors.description
            ? <p className="text-xs text-red-500 mt-1.5">{errors.description}</p>
            : <p className="text-xs text-slate-400 mt-1.5">2–3 sentences in your own words — this is the most important input for AI analysis.</p>
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
