'use client'

import { useState, useMemo, useEffect, useRef, useCallback } from 'react'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { Search, SlidersHorizontal, Wrench } from 'lucide-react'
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
  const router      = useRouter()
  const pathname    = usePathname()
  const searchParams = useSearchParams()
  const searchRef   = useRef<HTMLInputElement>(null)

  // Initialise from URL params
  const [query,        setQuery]        = useState(() => searchParams.get('q')      ?? '')
  const [teamFilter,   setTeamFilter]   = useState(() => searchParams.get('team')   ?? '')
  const [statusFilter, setStatusFilter] = useState(() => searchParams.get('status') ?? '')
  const [accessFilter, setAccessFilter] = useState(() => searchParams.get('access') ?? '')
  const [tagFilter,    setTagFilter]    = useState(() => searchParams.get('tag')    ?? '')
  const [mineOnly,     setMineOnly]     = useState(() => searchParams.get('mine') === 'true')

  // All unique tags across all tools
  const allTags = useMemo(() => {
    const names = new Set<string>()
    tools.forEach((t) => (t.tags ?? []).forEach((tag) => names.add(tag.name)))
    return [...names].sort()
  }, [tools])

  const tagOptions = useMemo(() => [
    { value: '', label: 'All tags' },
    ...allTags.map((t) => ({ value: t, label: t })),
  ], [allTags])

  // Sync filters → URL (debounced 300 ms for the text query)
  const syncUrl = useCallback((
    q: string, team: string, status: string, access: string, tag: string, mine: boolean
  ) => {
    const params = new URLSearchParams()
    if (q)      params.set('q',      q)
    if (team)   params.set('team',   team)
    if (status) params.set('status', status)
    if (access) params.set('access', access)
    if (tag)    params.set('tag',    tag)
    if (mine)   params.set('mine',   'true')
    const qs = params.toString()
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false })
  }, [router, pathname])

  // Debounce query changes
  useEffect(() => {
    const t = setTimeout(() => syncUrl(query, teamFilter, statusFilter, accessFilter, tagFilter, mineOnly), 300)
    return () => clearTimeout(t)
  }, [query, teamFilter, statusFilter, accessFilter, tagFilter, mineOnly, syncUrl])

  // '/' key focuses the search input (skip if already in an input)
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key !== '/' ) return
      const tag = (e.target as HTMLElement).tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return
      e.preventDefault()
      searchRef.current?.focus()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  const teamOptions = useMemo(() => [
    { value: '', label: 'All teams' },
    ...teams.map((t) => ({ value: t, label: t })),
  ], [teams])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return tools.filter((t) => {
      if (q) {
        const haystack = [t.name, t.slug, t.description ?? '', t.team ?? '', t.notes ?? '', t.createdByName]
          .join(' ')
          .toLowerCase()
        if (!haystack.includes(q)) return false
      }
      if (teamFilter   && t.team        !== teamFilter)                               return false
      if (statusFilter && t.status      !== (statusFilter as ToolStatus))           return false
      if (accessFilter && t.accessLevel !== (accessFilter as AccessLevel))          return false
      if (tagFilter    && !(t.tags ?? []).some((tag) => tag.name === tagFilter))    return false
      if (mineOnly     && t.createdByEmail !== currentUserEmail)                    return false
      return true
    })
  }, [tools, query, teamFilter, statusFilter, accessFilter, mineOnly, currentUserEmail])

  const hasFilters = query || teamFilter || statusFilter || accessFilter || tagFilter || mineOnly

  function clearFilters() {
    setQuery('')
    setTeamFilter('')
    setStatusFilter('')
    setAccessFilter('')
    setTagFilter('')
    setMineOnly(false)
  }

  return (
    <div>
      {/* ── Filter bar ──────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row gap-2 mb-6">
        {/* Search */}
        <div className="relative flex-1 min-w-0 max-w-md">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none"
            aria-hidden
          />
          <Input
            ref={searchRef}
            type="search"
            placeholder="Search tools, teams, or owners… (press / to focus)"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-9 h-10 text-sm placeholder:text-slate-400 transition-all"
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

          {allTags.length > 0 && (
            <Select
              value={tagFilter}
              onChange={(e) => setTagFilter(e.target.value)}
              options={tagOptions}
              aria-label="Filter by tag"
              className="w-auto min-w-[120px]"
            />
          )}

          {/* Mine toggle */}
          <button
            onClick={() => setMineOnly((v) => !v)}
            className={`px-3 py-1.5 rounded-md text-xs font-medium border transition-colors whitespace-nowrap ${
              mineOnly
                ? 'bg-[#eeeeff] text-[#2605EF] border-[#b0adff]'
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
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-[#eeeeff] to-[#d5d4ff] flex items-center justify-center mb-5 shadow-xs">
            <Wrench className="h-7 w-7 text-[#2605EF]" aria-hidden />
          </div>
          <h3 className="text-base font-semibold text-[#040B4D] mb-1.5">Your toolkit is empty</h3>
          <p className="text-sm text-slate-400 mb-6 max-w-xs leading-relaxed">
            Register your first internal tool and make it available to the CleverProfits team.
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
            className="text-sm text-[#2605EF] hover:text-[#1e04cc] underline underline-offset-2"
          >
            Clear all filters
          </button>
        </div>
      )}
    </div>
  )
}
