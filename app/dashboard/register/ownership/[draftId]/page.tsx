'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, AlertCircle, ExternalLink } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { WizardShell } from '@/components/forms/wizard-shell'
import { cn } from '@/lib/utils'

const ACCESS_OPTIONS = [
  { value: 'INTERNAL',   label: 'Internal — all employees' },
  { value: 'RESTRICTED', label: 'Restricted — specific teams' },
  { value: 'LEADERSHIP', label: 'Leadership — exec only' },
]

interface DraftBrief {
  id:          string
  name:        string
  externalUrl: string
  team:        string | null
  accessLevel: string
  isExperimental: boolean
}

export default function OwnershipPage({ params }: { params: { draftId: string } }) {
  const { draftId } = params
  const router      = useRouter()

  const [draft,       setDraft]       = useState<DraftBrief | null>(null)
  const [loadErr,     setLoadErr]     = useState('')
  const [team,        setTeam]        = useState('')
  const [accessLevel, setAccessLevel] = useState('INTERNAL')
  const [isExp,       setIsExp]       = useState(false)
  const [errors,      setErrors]      = useState<Record<string, string>>({})
  const [loading,     setLoading]     = useState(false)
  const [serverErr,   setServerErr]   = useState('')

  useEffect(() => {
    fetch(`/api/tools/${draftId}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.error) { setLoadErr(d.error); return }
        setDraft(d)
        setTeam(d.team ?? '')
        setAccessLevel(d.accessLevel ?? 'INTERNAL')
        setIsExp(d.isExperimental ?? false)
      })
      .catch(() => setLoadErr('Failed to load draft'))
  }, [draftId])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const errs: Record<string, string> = {}
    if (!accessLevel) errs.accessLevel = 'Access level is required'
    setErrors(errs)
    if (Object.keys(errs).length) return

    setLoading(true)
    setServerErr('')
    try {
      const res = await fetch(`/api/tools/${draftId}/draft`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          team:           team.trim() || '',
          accessLevel,
          isExperimental: isExp,
        }),
      })
      if (!res.ok) {
        const data = await res.json()
        setServerErr(data?.error ?? 'Failed to save')
        return
      }
      router.push(`/dashboard/register/analyzing/${draftId}`)
    } catch {
      setServerErr('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <WizardShell
      currentStep={2}
      title="Ownership & access"
      subtitle="Who owns this tool and who should be able to use it?"
    >
      {/* Load error */}
      {loadErr && (
        <div className="flex items-start gap-2 rounded-lg bg-red-50 border border-red-200 px-3.5 py-3 text-sm text-red-700 mb-6">
          <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" aria-hidden />
          {loadErr}
        </div>
      )}

      {/* Draft context chip */}
      {draft && (
        <div className="flex items-center gap-3 rounded-xl bg-slate-50 border border-slate-200 px-4 py-3 mb-6">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-[#040B4D] truncate">{draft.name}</p>
            <p className="text-xs text-slate-400 font-mono truncate">{draft.externalUrl}</p>
          </div>
          <ExternalLink className="h-3.5 w-3.5 text-slate-400 flex-shrink-0" aria-hidden />
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate className="space-y-6">

        <div className="grid grid-cols-2 gap-4">
          {/* Access level */}
          <div>
            <Label htmlFor="accessLevel">
              Access level <span className="text-red-500">*</span>
            </Label>
            <Select
              id="accessLevel"
              value={accessLevel}
              onChange={(e) => { setAccessLevel(e.target.value); setErrors((p) => ({ ...p, accessLevel: '' })) }}
              options={ACCESS_OPTIONS}
              error={errors.accessLevel}
            />
            {errors.accessLevel && (
              <p className="text-xs text-red-500 mt-1.5">{errors.accessLevel}</p>
            )}
          </div>

          {/* Team */}
          <div>
            <Label htmlFor="team">
              Team{' '}
              <span className="font-normal text-slate-400">(optional)</span>
            </Label>
            <Input
              id="team"
              placeholder="Finance, Ops…"
              value={team}
              onChange={(e) => setTeam(e.target.value)}
              autoComplete="off"
            />
          </div>
        </div>

        {/* Experimental toggle */}
        <label className={cn(
          'flex items-start gap-3 rounded-xl border p-4 cursor-pointer transition-all duration-150',
          isExp
            ? 'border-amber-300 bg-amber-50'
            : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/50',
        )}>
          <input
            type="checkbox"
            checked={isExp}
            onChange={(e) => setIsExp(e.target.checked)}
            className="mt-0.5 h-4 w-4 rounded border-slate-300 text-[#2605EF] focus:ring-[#2605EF]/25 cursor-pointer"
          />
          <div>
            <p className={cn('text-sm font-semibold', isExp ? 'text-amber-700' : 'text-slate-700')}>
              Mark as experimental
            </p>
            <p className="text-xs text-slate-500 mt-0.5">
              Experimental tools are clearly labeled. Use this for prototypes or tools still in development.
            </p>
          </div>
        </label>

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
            {loading ? 'Saving…' : 'Continue to analysis'}
          </Button>
          <Button type="button" variant="ghost" onClick={() => router.back()}>
            Back
          </Button>
        </div>
      </form>
    </WizardShell>
  )
}
