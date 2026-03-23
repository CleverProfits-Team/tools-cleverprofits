'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { AlertCircle, Loader2 } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import type { SerializedTool } from '@/types'
import type { AccessLevel } from '@prisma/client'

const ACCESS_OPTIONS = [
  { value: '',            label: 'Select access level…' },
  { value: 'INTERNAL',   label: 'Internal — all employees' },
  { value: 'RESTRICTED', label: 'Restricted — specific teams' },
  { value: 'LEADERSHIP', label: 'Leadership — exec only' },
]

interface FieldErrors {
  name?:        string
  externalUrl?: string
  accessLevel?: string
}

interface Props {
  tool:    SerializedTool
  isAdmin: boolean
}

export function EditToolForm({ tool, isAdmin: _isAdmin }: Props) {
  const router = useRouter()

  const [name,        setName]        = useState(tool.name)
  const [externalUrl, setExternalUrl] = useState(tool.externalUrl)
  const [accessLevel, setAccessLevel] = useState<AccessLevel>(tool.accessLevel)
  const [team,        setTeam]        = useState(tool.team ?? '')
  const [description, setDescription] = useState(tool.description ?? '')
  const [notes,       setNotes]       = useState(tool.notes ?? '')

  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [submitting,  setSubmitting]  = useState(false)
  const [serverError, setServerError] = useState<string>()

  function validate(): boolean {
    const errors: FieldErrors = {}
    if (!name.trim())        errors.name        = 'Name is required'
    if (!externalUrl.trim()) errors.externalUrl = 'External URL is required'
    if (!accessLevel)        errors.accessLevel = 'Access level is required'
    if (externalUrl && !externalUrl.startsWith('https://')) {
      errors.externalUrl = 'URL must start with https://'
    }
    setFieldErrors(errors)
    return Object.keys(errors).length === 0
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setServerError(undefined)
    if (!validate()) return

    setSubmitting(true)
    try {
      const res = await fetch(`/api/tools/${tool.id}`, {
        method:  'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name:        name.trim(),
          externalUrl: externalUrl.trim(),
          accessLevel,
          team:        team.trim()        || undefined,
          description: description.trim() || undefined,
          notes:       notes.trim()       || undefined,
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        setServerError(data?.error ?? 'Something went wrong. Please try again.')
        return
      }

      router.push(`/tools/${tool.slug}?updated=1`)
    } catch {
      setServerError('Network error. Please check your connection.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-8 max-w-xl">

      {/* ── Section 1: Identity ────────────────────────────────────── */}
      <div className="space-y-5">
        <SectionHeader label="Identity" />

        <div>
          <Label htmlFor="name">Tool name <span className="text-red-500">*</span></Label>
          <Input
            id="name"
            value={name}
            onChange={(e) => { setName(e.target.value); setFieldErrors((fe) => ({ ...fe, name: undefined })) }}
            error={fieldErrors.name}
            autoFocus
            autoComplete="off"
          />
        </div>

        <div>
          <Label htmlFor="slug">URL slug</Label>
          <div className="flex items-center">
            <span className="flex-shrink-0 h-9 px-3 flex items-center border border-r-0 border-slate-200 rounded-l-md bg-slate-50 text-slate-400 text-sm font-mono select-none">
              /
            </span>
            <input
              id="slug"
              value={tool.slug}
              disabled
              className="h-9 flex-1 rounded-r-md border border-slate-200 bg-slate-50 px-3 text-sm font-mono text-slate-400 cursor-not-allowed"
            />
          </div>
          <p className="text-xs text-slate-400 mt-1.5">Slug cannot be changed after registration.</p>
        </div>
      </div>

      {/* ── Section 2: Connection ──────────────────────────────────── */}
      <div className="space-y-5">
        <SectionHeader label="Connection" />

        <div>
          <Label htmlFor="externalUrl">
            Railway URL <span className="text-red-500">*</span>
          </Label>
          <Input
            id="externalUrl"
            type="url"
            value={externalUrl}
            onChange={(e) => { setExternalUrl(e.target.value); setFieldErrors((fe) => ({ ...fe, externalUrl: undefined })) }}
            error={fieldErrors.externalUrl}
            autoComplete="off"
            spellCheck={false}
          />
        </div>
      </div>

      {/* ── Section 3: Access ──────────────────────────────────────── */}
      <div className="space-y-5">
        <SectionHeader label="Access" />

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="accessLevel">
              Access level <span className="text-red-500">*</span>
            </Label>
            <Select
              id="accessLevel"
              value={accessLevel}
              onChange={(e) => { setAccessLevel(e.target.value as AccessLevel); setFieldErrors((fe) => ({ ...fe, accessLevel: undefined })) }}
              options={ACCESS_OPTIONS}
              error={fieldErrors.accessLevel}
            />
          </div>

          <div>
            <Label htmlFor="team">Team <span className="text-slate-400 font-normal">(optional)</span></Label>
            <Input
              id="team"
              value={team}
              onChange={(e) => setTeam(e.target.value)}
              autoComplete="off"
            />
          </div>
        </div>
      </div>

      {/* ── Section 4: Details ─────────────────────────────────────── */}
      <div className="space-y-5">
        <SectionHeader label="Details" note="optional" />

        <div>
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
          />
        </div>

        <div>
          <Label htmlFor="notes">Internal notes</Label>
          <Textarea
            id="notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
          />
          <p className="text-xs text-slate-400 mt-1.5">Visible to platform admins only.</p>
        </div>
      </div>

      {/* Server error */}
      {serverError && (
        <div className="flex items-start gap-2 rounded-lg bg-red-50 border border-red-200 px-3.5 py-3 text-sm text-red-700">
          <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" aria-hidden />
          {serverError}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-3 pt-1 border-t border-slate-100">
        <Button type="submit" disabled={submitting}>
          {submitting && <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />}
          {submitting ? 'Saving…' : 'Save changes'}
        </Button>
        <Button type="button" variant="ghost" onClick={() => router.back()}>
          Cancel
        </Button>
      </div>
    </form>
  )
}

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
