'use client'

import { useState, useMemo, useEffect, useRef, useCallback } from 'react'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { Search, SlidersHorizontal, Wrench, Zap } from 'lucide-react'
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
        <div className="flex items-center gap-2">
          <div className="relative flex-1 min-w-0 max-w-md">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[rgba(15,0,56,0.40)] pointer-events-none"
              aria-hidden
            />
            <Input
              ref={searchRef}
              type="search"
              placeholder="Search tools, teams, or owners…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-9 h-10 text-sm transition-all"
              aria-label="Search tools"
            />
          </div>

          <button
            onClick={() => setFiltersOpen((v) => !v)}
            aria-expanded={filtersOpen}
            className={`inline-flex items-center gap-2 h-10 px-3.5 rounded-lg border text-sm font-semibold transition-colors whitespace-nowrap flex-shrink-0 ${
              filtersOpen || activeFilterCount > 0
                ? 'bg-[#EEEEFF] text-[#2605EF] border-[#B0ADFF]'
                : 'bg-white text-[rgba(15,0,56,0.55)] border-[#E7E7E7] hover:border-[#D6D6D6] hover:text-[#0F0038]'
            }`}
          >
            <SlidersHorizontal className="h-3.5 w-3.5" aria-hidden />
            Filters
            {activeFilterCount > 0 && (
              <span className="inline-flex items-center justify-center rounded-full bg-[#2605EF] text-white text-[10px] font-bold min-w-[1.1rem] h-[1.1rem] px-1 leading-none">
                {activeFilterCount}
              </span>
            )}
          </button>

          {hasFilters && (
            <button
              onClick={clearFilters}
              className="text-xs text-[rgba(15,0,56,0.55)] hover:text-[#0F0038] transition-colors whitespace-nowrap underline underline-offset-2 flex-shrink-0"
            >
              Clear
            </button>
          )}
        </div>

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
              className={`px-3 py-2 rounded-lg text-xs font-semibold border transition-colors whitespace-nowrap ${
                mineOnly
                  ? 'bg-[#EEEEFF] text-[#2605EF] border-[#B0ADFF]'
                  : 'bg-white text-[rgba(15,0,56,0.55)] border-[#E7E7E7] hover:border-[#D6D6D6] hover:text-[#0F0038]'
              }`}
              aria-pressed={mineOnly}
            >
              My tools
            </button>
          </div>
        )}
      </div>

      {hasFilters && (
        <p className="text-xs text-[rgba(15,0,56,0.55)] mb-4">
          {filtered.length === 0
            ? 'No tools match your filters'
            : `${filtered.length} of ${tools.length} tool${tools.length !== 1 ? 's' : ''}`}
        </p>
      )}

      {filtered.length > 0 ? (
        <div className="space-y-5">

          {/* ── Featured ── */}
          {featuredTools.length > 0 && (
            <section>
              <div className="flex items-center gap-3 mb-5">
                <div className="flex items-center gap-2 flex-shrink-0">
                  <div className="h-5 w-5 rounded-md bg-[rgba(38,5,239,0.10)] flex items-center justify-center">
                    <Zap className="h-3 w-3 text-[#2605EF]" aria-hidden />
                  </div>
                  <span className="text-[11px] font-bold text-[rgba(15,0,56,0.55)] uppercase tracking-[0.14em]">
                    Ready to launch
                  </span>
                </div>
                <div className="flex-1 h-px bg-[#E7E7E7]" />
              </div>

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

          {/* ── Index list ── */}
          {listTools.length > 0 && (
            <section>
              <div className="flex items-center gap-3 mb-3">
                <div className="flex items-center gap-2 flex-shrink-0">
                  <div className="h-5 w-5 rounded-md bg-[#FAFAFA] flex items-center justify-center">
                    <Wrench className="h-3 w-3 text-[rgba(15,0,56,0.55)]" aria-hidden />
                  </div>
                  <span className="text-[11px] font-bold text-[rgba(15,0,56,0.55)] uppercase tracking-[0.14em]">
                    {featuredTools.length > 0 ? 'All tools' : 'Tools'}
                  </span>
                </div>
                <span className="inline-flex items-center justify-center h-4 min-w-[1rem] rounded bg-[#FAFAFA] text-[10px] font-bold text-[rgba(15,0,56,0.55)] px-1 flex-shrink-0 tabular-nums">
                  {listTools.length}
                </span>
                <div className="flex-1 h-px bg-[#E7E7E7]" />
              </div>

              <div className="rounded-xl border border-[#E7E7E7] overflow-hidden bg-white shadow-card">
                {listTools.map((tool) => (
                  <ToolRow key={tool.id} tool={tool} />
                ))}
              </div>
            </section>
          )}

        </div>
      ) : tools.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-[#EEEEFF] to-[#D5D4FF] flex items-center justify-center mb-5 shadow-xs">
            <Wrench className="h-7 w-7 text-[#2605EF]" aria-hidden />
          </div>
          <h3 className="font-display font-bold text-[17px] text-[#0F0038] mb-2">
            Your toolkit is empty
          </h3>
          <p className="text-sm text-[rgba(15,0,56,0.55)] mb-6 max-w-xs leading-relaxed">
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
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <p className="text-sm text-[rgba(15,0,56,0.55)] mb-2">No tools match your filters.</p>
          <button
            onClick={clearFilters}
            className="text-sm text-[#2605EF] hover:text-[#1E04C7] underline underline-offset-2 transition-colors"
          >
            Clear all filters
          </button>
        </div>
      )}
    </div>
  )
}
