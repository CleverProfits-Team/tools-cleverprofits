'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { Loader2, AlertCircle, ExternalLink, User, Wrench } from 'lucide-react'
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
  id:              string
  name:            string
  externalUrl:     string
  team:            string | null
  accessLevel:     string
  isExperimental:  boolean
  ownerName:       string | null
  ownerEmail:      string | null
  maintainerName:  string | null
  maintainerEmail: string | null
}

function SectionDivider({ label, icon: Icon }: { label: string; icon: React.ElementType }) {
  return (
    <div className="flex items-center gap-3 pt-1">
      <div className="flex items-center gap-2 flex-shrink-0">
        <div className="h-5 w-5 rounded-full bg-[#f4f3f3] flex items-center justify-center">
          <Icon className="h-3 w-3 text-[#94a3b8]" aria-hidden />
        </div>
        <span className="text-[11px] font-bold font-display text-[#94a3b8] uppercase tracking-[0.12em]">{label}</span>
      </div>
      <div className="flex-1 h-px bg-[#e2e8f0]" />
    </div>
  )
}

export default function OwnershipPage({ params }: { params: { draftId: string } }) {
  const { draftId }    = params
  const router         = useRouter()
  const { data: session } = useSession()

  const [draft,           setDraft]           = useState<DraftBrief | null>(null)
  const [loadErr,         setLoadErr]         = useState('')
  const [team,            setTeam]            = useState('')
  const [accessLevel,     setAccessLevel]     = useState('INTERNAL')
  const [isExp,           setIsExp]           = useState(false)
  const [ownerName,       setOwnerName]       = useState('')
  const [ownerEmail,      setOwnerEmail]      = useState('')
  const [maintainerName,  setMaintainerName]  = useState('')
  const [maintainerEmail, setMaintainerEmail] = useState('')
  const [errors,          setErrors]          = useState<Record<string, string>>({})
  const [loading,         setLoading]         = useState(false)
  const [serverErr,       setServerErr]       = useState('')

  useEffect(() => {
    fetch(`/api/tools/${draftId}`)
      .then((r) => r.json())
      .then((d: DraftBrief & { error?: string }) => {
        if (d.error) { setLoadErr(d.error); return }
        setDraft(d)
        setTeam(d.team ?? '')
        setAccessLevel(d.accessLevel ?? 'INTERNAL')
        setIsExp(d.isExperimental ?? false)
        // Owner: use saved value or fall back to current session user
        setOwnerName(d.ownerName   ?? '')
        setOwnerEmail(d.ownerEmail ?? '')
        setMaintainerName(d.maintainerName   ?? '')
        setMaintainerEmail(d.maintainerEmail ?? '')
      })
      .catch(() => setLoadErr('Failed to load draft'))
  }, [draftId])

  // Auto-fill owner from session if still empty after draft loads
  useEffect(() => {
    if (!session?.user) return
    setOwnerName((prev)  => prev  || session.user?.name  || '')
    setOwnerEmail((prev) => prev  || session.user?.email || '')
  }, [session])

  function validate() {
    const errs: Record<string, string> = {}
    if (!accessLevel) errs.accessLevel = 'Access level is required'
    if (ownerEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(ownerEmail)) {
      errs.ownerEmail = 'Enter a valid email address'
    }
    if (maintainerEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(maintainerEmail)) {
      errs.maintainerEmail = 'Enter a valid email address'
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
      const res = await fetch(`/api/tools/${draftId}/draft`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          team:            team.trim() || '',
          accessLevel,
          isExperimental:  isExp,
          ownerName:       ownerName.trim()       || '',
          ownerEmail:      ownerEmail.trim()      || '',
          maintainerName:  maintainerName.trim()  || '',
          maintainerEmail: maintainerEmail.trim() || '',
        }),
      })
      if (!res.ok) {
        const data = await res.json()
        setServerErr(data?.error ?? 'Failed to save')
        return
      }
      router.push(`/dashboard/register/analyzing/${draftId}`)
    } catch {
      setServerErr('Network error. Check your connection and try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <WizardShell
      currentStep={2}
      title="Ownership & access"
      subtitle="Who owns this tool, who maintains it, and who should be able to use it?"
    >
      {loadErr && (
        <div className="flex items-start gap-2 rounded-lg bg-red-50 border border-red-200 px-3.5 py-3 text-sm text-red-700 mb-6">
          <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" aria-hidden />
          {loadErr}
        </div>
      )}

      {draft && (
        <div className="flex items-center gap-3 rounded-xl bg-[#f4f3f3] border border-[#e2e8f0] px-4 py-3 mb-6">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-[#040B4D] truncate">{draft.name}</p>
            <p className="text-xs text-[#94a3b8] font-mono truncate">{draft.externalUrl}</p>
          </div>
          <ExternalLink className="h-3.5 w-3.5 text-slate-400 flex-shrink-0" aria-hidden />
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate className="space-y-7">

        {/* ── Product owner ──────────────────────────────────────────── */}
        <div className="space-y-4">
          <SectionDivider label="Product owner" icon={User} />
          <p className="text-xs text-[#94a3b8] -mt-1">
            The person responsible for this tool's direction and purpose. Pre-filled with your account — edit if someone else owns it.
          </p>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="ownerName">Name</Label>
              <Input
                id="ownerName"
                placeholder="Full name"
                value={ownerName}
                onChange={(e) => setOwnerName(e.target.value)}
                autoComplete="off"
              />
            </div>
            <div>
              <Label htmlFor="ownerEmail">Email</Label>
              <Input
                id="ownerEmail"
                type="email"
                placeholder="owner@cleverprofits.com"
                value={ownerEmail}
                onChange={(e) => { setOwnerEmail(e.target.value); setErrors((p) => ({ ...p, ownerEmail: '' })) }}
                autoComplete="off"
              />
              {errors.ownerEmail && (
                <p className="text-xs text-red-500 mt-1.5">{errors.ownerEmail}</p>
              )}
            </div>
          </div>
        </div>

        {/* ── Maintainer ─────────────────────────────────────────────── */}
        <div className="space-y-4">
          <SectionDivider label="Maintainer" icon={Wrench} />
          <p className="text-xs text-[#94a3b8] -mt-1">
            The person responsible for keeping this tool running and up to date.{' '}
            <span className="text-[#e2e8f0]">Optional — leave blank if the owner maintains it.</span>
          </p>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="maintainerName">
                Name{' '}
                <span className="font-normal text-[#94a3b8]">(optional)</span>
              </Label>
              <Input
                id="maintainerName"
                placeholder="Full name"
                value={maintainerName}
                onChange={(e) => setMaintainerName(e.target.value)}
                autoComplete="off"
              />
            </div>
            <div>
              <Label htmlFor="maintainerEmail">
                Email{' '}
                <span className="font-normal text-[#94a3b8]">(optional)</span>
              </Label>
              <Input
                id="maintainerEmail"
                type="email"
                placeholder="maintainer@cleverprofits.com"
                value={maintainerEmail}
                onChange={(e) => { setMaintainerEmail(e.target.value); setErrors((p) => ({ ...p, maintainerEmail: '' })) }}
                autoComplete="off"
              />
              {errors.maintainerEmail && (
                <p className="text-xs text-red-500 mt-1.5">{errors.maintainerEmail}</p>
              )}
            </div>
          </div>
        </div>

        {/* ── Access & classification ────────────────────────────────── */}
        <div className="space-y-4">
          <SectionDivider label="Access" icon={ExternalLink} />
          <div className="grid grid-cols-2 gap-4">
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
            <div>
              <Label htmlFor="team">
                Team{' '}
                <span className="font-normal text-[#94a3b8]">(optional)</span>
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
        </div>

        {/* ── Experimental toggle ────────────────────────────────────── */}
        <label className={cn(
          'flex items-start gap-3 rounded-xl border p-4 cursor-pointer transition-all duration-150',
          isExp
            ? 'border-amber-300 bg-amber-50'
            : 'border-[#e2e8f0] bg-white hover:border-[#94a3b8] hover:bg-[#f4f3f3]/50',
        )}>
          <input
            type="checkbox"
            checked={isExp}
            onChange={(e) => setIsExp(e.target.checked)}
            className="mt-0.5 h-4 w-4 rounded border-slate-300 text-[#2605EF] focus:ring-[#2605EF]/25 cursor-pointer"
          />
          <div>
            <p className={cn('text-sm font-semibold', isExp ? 'text-amber-700' : 'text-[#040B4D]')}>
              Mark as experimental
            </p>
            <p className="text-xs text-[#64748b] mt-0.5">
              Experimental tools are clearly labeled. Use this for prototypes or tools still in development.
            </p>
          </div>
        </label>

        {serverErr && (
          <div className="flex items-start gap-2 rounded-lg bg-red-50 border border-red-200 px-3.5 py-3 text-sm text-red-700">
            <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" aria-hidden />
            {serverErr}
          </div>
        )}

        <div className="flex items-center gap-3 pt-1 border-t border-[#e2e8f0]">
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
