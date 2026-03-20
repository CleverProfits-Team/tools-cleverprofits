'use client'

import { useState, useMemo } from 'react'
import { Search, SlidersHorizontal } from 'lucide-react'
import { ToolCard } from '@/components/dashboard/tool-card'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import type { SerializedTool } from '@/types'
import type { AccessLevel, ToolStatus } from '@prisma/client'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { PlusCircle } from 'lucide-react'

interface ToolsGridProps {
  tools: SerializedTool[]
  teams: string[]
  currentUserEmail: string
}

const STATUS_OPTIONS = [
  { value: '',         label: 'All statuses' },
  { value: 'ACTIVE',   label: 'Active' },
  { value: 'PENDING',  label: 'Pending' },
  { value: 'ARCHIVED', label: 'Archived' },
]

const ACCESS_OPTIONS = [
  { value: '',            label: 'All access levels' },
  { value: 'INTERNAL',   label: 'Internal' },
  { value: 'RESTRICTED', label: 'Restricted' },
  { value: 'LEADERSHIP', label: 'Leadership' },
]

export function ToolsGrid({ tools, teams, currentUserEmail }: ToolsGridProps) {
  const [query,       setQuery]       = useState('')
  const [teamFilter,  setTeamFilter]  = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [accessFilter, setAccessFilter] = useState('')
  const [mineOnly,    setMineOnly]    = useState(false)

  const teamOptions = useMemo(() => [
    { value: '', label: 'All teams' },
    ...teams.map((t) => ({ value: t, label: t })),
  ], [teams])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return tools.filter((t) => {
      if (q) {
        const haystack = [t.name, t.slug, t.description ?? '', t.team ?? '']
          .join(' ')
          .toLowerCase()
        if (!haystack.includes(q)) return false
      }
      if (teamFilter   && t.team        !== teamFilter)                     return false
      if (statusFilter && t.status      !== (statusFilter as ToolStatus))   return false
      if (accessFilter && t.accessLevel !== (accessFilter as AccessLevel))  return false
      if (mineOnly     && t.createdByEmail !== currentUserEmail)             return false
      return true
    })
  }, [tools, query, teamFilter, statusFilter, accessFilter, mineOnly, currentUserEmail])

  const hasFilters = query || teamFilter || statusFilter || accessFilter || mineOnly

  function clearFilters() {
    setQuery('')
    setTeamFilter('')
    setStatusFilter('')
    setAccessFilter('')
    setMineOnly(false)
  }

  return (
    <div>
      {/* ── Filter bar ──────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row gap-2 mb-6">
        {/* Search */}
        <div className="relative flex-1 min-w-0">
          <Search
            className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none"
            aria-hidden
          />
          <Input
            type="search"
            placeholder="Search tools…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-8"
            aria-label="Search tools"
          />
        </div>

        {/* Dropdowns */}
        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
          <SlidersHorizontal className="h-4 w-4 text-slate-400 flex-shrink-0 hidden sm:block" aria-hidden />

          {teams.length > 0 && (
            <Select
              value={teamFilter}
              onChange={(e) => setTeamFilter(e.target.value)}
              options={teamOptions}
              aria-label="Filter by team"
              className="w-auto min-w-[130px]"
            />
          )}

          <Select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            options={STATUS_OPTIONS}
            aria-label="Filter by status"
            className="w-auto min-w-[130px]"
          />

          <Select
            value={accessFilter}
            onChange={(e) => setAccessFilter(e.target.value)}
            options={ACCESS_OPTIONS}
            aria-label="Filter by access level"
            className="w-auto min-w-[150px]"
          />

          {/* Mine toggle */}
          <button
            onClick={() => setMineOnly((v) => !v)}
            className={`px-3 py-1.5 rounded-md text-xs font-medium border transition-colors whitespace-nowrap ${
              mineOnly
                ? 'bg-blue-50 text-blue-700 border-blue-200'
                : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300 hover:text-slate-700'
            }`}
            aria-pressed={mineOnly}
          >
            My tools
          </button>

          {hasFilters && (
            <button
              onClick={clearFilters}
              className="text-xs text-slate-400 hover:text-slate-600 transition-colors whitespace-nowrap underline underline-offset-2"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* ── Results count ───────────────────────────────────────────── */}
      {hasFilters && (
        <p className="text-xs text-slate-400 mb-4">
          {filtered.length === 0
            ? 'No tools match your filters'
            : `${filtered.length} of ${tools.length} tool${tools.length !== 1 ? 's' : ''}`}
        </p>
      )}

      {/* ── Grid ────────────────────────────────────────────────────── */}
      {filtered.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((tool) => (
            <ToolCard key={tool.id} tool={tool} />
          ))}
        </div>
      ) : tools.length === 0 ? (
        /* Empty state — no tools at all */
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="h-12 w-12 rounded-xl bg-slate-100 flex items-center justify-center mb-4">
            <PlusCircle className="h-6 w-6 text-slate-400" aria-hidden />
          </div>
          <h3 className="text-sm font-semibold text-slate-900 mb-1">No tools yet</h3>
          <p className="text-sm text-slate-500 mb-4 max-w-xs">
            Register your first internal tool to get started.
          </p>
          <Button asChild size="sm">
            <Link href="/dashboard/register">
              <PlusCircle className="h-3.5 w-3.5" aria-hidden />
              Register Tool
            </Link>
          </Button>
        </div>
      ) : (
        /* Empty state — filters returned nothing */
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <p className="text-sm text-slate-500 mb-2">No tools match your filters.</p>
          <button
            onClick={clearFilters}
            className="text-sm text-blue-600 hover:text-blue-700 underline underline-offset-2"
          >
            Clear all filters
          </button>
        </div>
      )}
    </div>
  )
}
