'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { AlertCircle, Loader2, X } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
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
  const [tags,        setTags]        = useState<string[]>((tool.tags ?? []).map((t) => t.name))
  const [tagInput,    setTagInput]    = useState('')

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
          tags,
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        setServerError(data?.error ?? 'Something went wrong. Check your connection and try again.')
        return
      }

      router.push(`/tools/${tool.slug}?updated=1`)
    } catch {
      setServerError('Network error. Check your connection and try again.')
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
            <span className="flex-shrink-0 h-9 px-3 flex items-center border border-r-0 border-[#e2e8f0] rounded-l-lg bg-[#f4f3f3] text-[#94a3b8] text-sm font-mono select-none">
              /
            </span>
            <input
              id="slug"
              value={tool.slug}
              disabled
              className="h-9 flex-1 rounded-r-lg border border-[#e2e8f0] bg-[#f4f3f3] px-3 text-sm font-mono text-[#94a3b8] cursor-not-allowed"
            />
          </div>
          <p className="text-xs text-[#94a3b8] mt-1.5">Slug cannot be changed after registration.</p>
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
            <Label htmlFor="team">Team <span className="text-[#94a3b8] font-normal normal-case tracking-normal">(optional)</span></Label>
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
          <p className="text-xs text-[#94a3b8] mt-1.5">Visible to platform admins only.</p>
        </div>
      </div>

      {/* ── Section 5: Tags ─────────────────────────────────────────── */}
      <div className="space-y-5">
        <SectionHeader label="Tags" note="optional" />
        <TagInput
          tags={tags}
          inputValue={tagInput}
          onInputChange={setTagInput}
          onAdd={(tag) => {
            if (!tags.includes(tag) && tags.length < 10) setTags((t) => [...t, tag])
            setTagInput('')
          }}
          onRemove={(tag) => setTags((t) => t.filter((x) => x !== tag))}
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
      <div className="flex items-center gap-3 pt-1 border-t border-[#e2e8f0]">
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
      <span className="text-xs font-semibold font-display uppercase tracking-wider text-[#94a3b8]">
        {label}
        {note && <span className="font-normal normal-case tracking-normal ml-1 text-[#94a3b8]/60">· {note}</span>}
      </span>
      <div className="flex-1 h-px bg-[#e2e8f0]" />
    </div>
  )
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
        'flex flex-wrap gap-1.5 min-h-9 w-full rounded-lg border border-[#e2e8f0] bg-white px-2.5 py-1.5',
        'focus-within:ring-2 focus-within:ring-[#2605EF]/25 focus-within:border-[#2605EF]/60 transition-colors',
      )}>
        {tags.map((tag) => (
          <span
            key={tag}
            className="inline-flex items-center gap-1 rounded-full bg-[#f4f3f3] px-2 py-0.5 text-xs font-medium font-display text-[#040B4D]"
          >
            {tag}
            <button
              type="button"
              onClick={() => onRemove(tag)}
              className="text-[#94a3b8] hover:text-[#040B4D] transition-colors focus-visible:ring-2 focus-visible:ring-[#2605EF]/30 focus-visible:ring-offset-1 rounded-full"
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
            className="flex-1 min-w-[120px] text-sm outline-none bg-transparent placeholder:text-[#94a3b8] py-0.5 text-[#040B4D]"
          />
        )}
      </div>
      <p className="text-xs text-[#94a3b8] mt-1.5">Up to 10 tags. Press Enter or comma to add.</p>
    </div>
  )
}
