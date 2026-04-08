'use client'

import { useState, useMemo, useEffect, useRef, useCallback } from 'react'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { Search, SlidersHorizontal, Wrench, Zap, SearchX } from 'lucide-react'
import { ToolCard } from '@/components/dashboard/tool-card'
import { ToolRow } from '@/components/dashboard/tool-row'
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

const FEATURED_COUNT = 3

export function ToolsGrid({ tools, teams, currentUserEmail }: ToolsGridProps) {
  const router       = useRouter()
  const pathname     = usePathname()
  const searchParams = useSearchParams()
  const searchRef    = useRef<HTMLInputElement>(null)

  const [query,        setQuery]        = useState(() => searchParams.get('q')      ?? '')
  const [teamFilter,   setTeamFilter]   = useState(() => searchParams.get('team')   ?? '')
  const [statusFilter, setStatusFilter] = useState(() => searchParams.get('status') ?? '')
  const [accessFilter, setAccessFilter] = useState(() => searchParams.get('access') ?? '')
  const [tagFilter,    setTagFilter]    = useState(() => searchParams.get('tag')    ?? '')
  const [mineOnly,     setMineOnly]     = useState(() => searchParams.get('mine') === 'true')
  const [filtersOpen,  setFiltersOpen]  = useState(false)

  const allTags = useMemo(() => {
    const names = new Set<string>()
    tools.forEach((t) => (t.tags ?? []).forEach((tag) => names.add(tag.name)))
    return [...names].sort()
  }, [tools])

  const tagOptions = useMemo(() => [
    { value: '', label: 'All tags' },
    ...allTags.map((t) => ({ value: t, label: t })),
  ], [allTags])

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

  useEffect(() => {
    const t = setTimeout(() => syncUrl(query, teamFilter, statusFilter, accessFilter, tagFilter, mineOnly), 300)
    return () => clearTimeout(t)
  }, [query, teamFilter, statusFilter, accessFilter, tagFilter, mineOnly, syncUrl])

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key !== '/') return
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
      if (teamFilter   && t.team        !== teamFilter)                              return false
      if (statusFilter && t.status      !== (statusFilter as ToolStatus))            return false
      if (accessFilter && t.accessLevel !== (accessFilter as AccessLevel))           return false
      if (tagFilter    && !(t.tags ?? []).some((tag) => tag.name === tagFilter))     return false
      if (mineOnly     && t.createdByEmail !== currentUserEmail)                     return false
      return true
    })
  }, [tools, query, teamFilter, statusFilter, accessFilter, mineOnly, currentUserEmail, tagFilter])

  const hasFilters = query || teamFilter || statusFilter || accessFilter || tagFilter || mineOnly
  const activeFilterCount = [teamFilter, statusFilter, accessFilter, tagFilter, mineOnly ? 'mine' : ''].filter(Boolean).length

  function clearFilters() {
    setQuery('')
    setTeamFilter('')
    setStatusFilter('')
    setAccessFilter('')
    setTagFilter('')
    setMineOnly(false)
  }

  const featuredTools = useMemo(() => {
    if (hasFilters) return []
    return filtered.filter((t) => t.status === 'ACTIVE').slice(0, FEATURED_COUNT)
  }, [filtered, hasFilters])

  const featuredIds = useMemo(() => new Set(featuredTools.map((t) => t.id)), [featuredTools])

  const listTools = useMemo(() => {
    if (hasFilters) return filtered
    return filtered.filter((t) => !featuredIds.has(t.id))
  }, [filtered, hasFilters, featuredIds])

  return (
    <div>
      {/* ── Filter bar ──────────────────────────────────────────────── */}
      <div className="mb-6 space-y-2">
        {/* Row 1: Search + filter toggle */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1 min-w-0 max-w-md">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#94a3b8] pointer-events-none"
              aria-hidden
            />
            <Input
              ref={searchRef}
              type="search"
              placeholder="Search tools, teams, or owners…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-9 h-10 text-sm placeholder:text-[#94a3b8] transition-all"
              aria-label="Search tools"
            />
          </div>

          <button
            onClick={() => setFiltersOpen((v) => !v)}
            aria-expanded={filtersOpen}
            className={`inline-flex items-center gap-2 h-10 px-3.5 rounded-lg border text-sm font-medium font-display transition-colors duration-150 whitespace-nowrap flex-shrink-0 focus-visible:ring-2 focus-visible:ring-[#2605EF]/30 focus-visible:ring-offset-2 ${
              filtersOpen || activeFilterCount > 0
                ? 'bg-[#eeeeff] text-[#2605EF] border-[#b0adff]'
                : 'bg-white text-[#64748b] border-[#e2e8f0] hover:border-[#94a3b8] hover:text-[#040B4D]'
            }`}
          >
            <SlidersHorizontal className="h-3.5 w-3.5" aria-hidden />
            Filters
            {activeFilterCount > 0 && (
              <span className="inline-flex items-center justify-center rounded bg-[#2605EF] text-white text-[10px] font-bold min-w-[1.1rem] h-[1.1rem] px-1 leading-none">
                {activeFilterCount}
              </span>
            )}
          </button>

          {hasFilters && (
            <button
              onClick={clearFilters}
              className="text-xs text-[#94a3b8] hover:text-[#64748b] transition-colors whitespace-nowrap underline underline-offset-2 flex-shrink-0 focus-visible:ring-2 focus-visible:ring-[#2605EF]/30 focus-visible:ring-offset-2 rounded"
            >
              Clear
            </button>
          )}
        </div>

        {/* Row 2: Filter dropdowns (collapsible) */}
        {filtersOpen && (
          <div className="flex items-center gap-2 flex-wrap pt-1">
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

            <button
              onClick={() => setMineOnly((v) => !v)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium font-display border transition-colors duration-150 whitespace-nowrap focus-visible:ring-2 focus-visible:ring-[#2605EF]/30 focus-visible:ring-offset-2 ${
                mineOnly
                  ? 'bg-[#eeeeff] text-[#2605EF] border-[#b0adff]'
                  : 'bg-white text-[#64748b] border-[#e2e8f0] hover:border-[#94a3b8] hover:text-[#040B4D]'
              }`}
              aria-pressed={mineOnly}
            >
              My tools
            </button>
          </div>
        )}
      </div>

      {/* ── Results count (filters active) ──────────────────────────── */}
      {hasFilters && (
        <p className="text-xs text-[#94a3b8] mb-4">
          {filtered.length === 0
            ? 'No tools match your filters'
            : `${filtered.length} of ${tools.length} tool${tools.length !== 1 ? 's' : ''}`}
        </p>
      )}

      {/* ── Content ─────────────────────────────────────────────────── */}
      {filtered.length > 0 ? (
        <div className="space-y-8">

          {/* ── Featured: spotlight section ── */}
          {featuredTools.length > 0 && (
            <section>
              {/* Section divider with embedded label */}
              <div className="flex items-center gap-3 mb-5">
                <div className="flex items-center gap-2 flex-shrink-0">
                  <div className="h-5 w-5 rounded-full bg-[#2605EF]/10 flex items-center justify-center">
                    <Zap className="h-3 w-3 text-[#2605EF]" aria-hidden />
                  </div>
                  <span className="font-display font-semibold text-xs tracking-widest uppercase text-[#040B4D]/50">
                    Ready to launch
                  </span>
                </div>
                <div className="flex-1 h-px bg-[#e2e8f0]" />
              </div>

              {/* Staggered card grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {featuredTools.map((tool, i) => (
                  <div
                    key={tool.id}
                    className="animate-in"
                    style={{ animationDelay: `${i * 55}ms` }}
                  >
                    <ToolCard tool={tool} />
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* ── Index: unified panel for remaining tools ── */}
          {listTools.length > 0 && (
            <section>
              {/* Section divider with count badge */}
              <div className="flex items-center gap-3 mb-3">
                <span className="font-display font-semibold text-xs tracking-widest uppercase text-[#040B4D]/50 flex-shrink-0">
                  {featuredTools.length > 0 ? 'All tools' : 'Tools'}
                </span>
                <span className="ml-0.5 inline-flex items-center justify-center rounded-full bg-[#2605EF]/10 text-[#2605EF] text-xs font-display font-semibold px-2 py-0.5 flex-shrink-0 tabular-nums">
                  {listTools.length}
                </span>
                <div className="flex-1 h-px bg-[#e2e8f0]" />
              </div>

              {/* Premium unified panel */}
              <div className="rounded-xl border border-[#e2e8f0] overflow-hidden bg-white shadow-card">
                {listTools.map((tool) => (
                  <ToolRow key={tool.id} tool={tool} />
                ))}
              </div>
            </section>
          )}

        </div>
      ) : tools.length === 0 ? (
        /* Empty state — no tools at all */
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="h-14 w-14 rounded-full bg-gradient-to-br from-[#eeeeff] to-[#d5d4ff] flex items-center justify-center mb-5 shadow-xs">
            <Wrench className="h-7 w-7 text-[#2605EF]" aria-hidden />
          </div>
          <h3 className="font-display font-bold text-[17px] text-[#040B4D] mb-2">
            Your toolkit is empty
          </h3>
          <p className="text-sm text-[#64748b] mb-6 max-w-xs leading-relaxed">
            Register your first internal tool and make it available to the CleverProfits team.
          </p>
          <Button asChild size="sm">
            <Link href="/dashboard/register">
              <PlusCircle className="h-3.5 w-3.5" aria-hidden />
              Register tool
            </Link>
          </Button>
        </div>
      ) : (
        /* Empty state — filters returned nothing */
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="h-12 w-12 rounded-full bg-[#f4f3f3] flex items-center justify-center mb-4">
            <SearchX className="h-5 w-5 text-[#94a3b8]" aria-hidden />
          </div>
          <p className="font-display font-semibold text-[#040B4D] text-sm mb-1">No tools found</p>
          <p className="text-xs text-[#94a3b8] font-sans mb-4">Try adjusting your filters or search terms</p>
          <Button size="sm" onClick={clearFilters}>Clear filters</Button>
        </div>
      )}
    </div>
  )
}
