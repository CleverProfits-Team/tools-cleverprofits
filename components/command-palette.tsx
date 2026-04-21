'use client'

import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Search, ArrowUpRight, LayoutDashboard, PlusCircle, ClipboardList, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { getToolAccent } from '@/lib/colors'

interface PaletteTool {
  id: string
  name: string
  slug: string
  status: string
  team?: string | null
}

interface CommandPaletteProps {
  tools: PaletteTool[]
}

const STATIC_COMMANDS = [
  { id: 'nav-dashboard', label: 'Go to Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { id: 'nav-my-tools', label: 'Go to My Tools', href: '/dashboard/my-tools', icon: ClipboardList },
  {
    id: 'nav-register',
    label: 'Register a new tool',
    href: '/dashboard/register',
    icon: PlusCircle,
  },
]

export function CommandPalette({ tools }: CommandPaletteProps) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const router = useRouter()

  // Keyboard shortcut: Cmd+K / Ctrl+K
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setOpen((v) => !v)
      }
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  // Focus input when opening
  useEffect(() => {
    if (open) {
      setQuery('')
      setSelectedIndex(0)
      setTimeout(() => inputRef.current?.focus(), 0)
    }
  }, [open])

  const q = query.trim().toLowerCase()

  const filteredTools = useMemo(() => {
    if (!q) return tools.filter((t) => t.status === 'ACTIVE').slice(0, 5)
    return tools
      .filter((t) => {
        const haystack = `${t.name} ${t.team ?? ''}`.toLowerCase()
        return haystack.includes(q)
      })
      .slice(0, 8)
  }, [tools, q])

  const filteredCommands = useMemo(() => {
    if (!q) return STATIC_COMMANDS
    return STATIC_COMMANDS.filter((c) => c.label.toLowerCase().includes(q))
  }, [q])

  const totalResults = filteredTools.length + filteredCommands.length

  const navigate = useCallback(
    (href: string) => {
      setOpen(false)
      router.push(href)
    },
    [router],
  )

  const executeSelected = useCallback(() => {
    if (selectedIndex < filteredTools.length) {
      const tool = filteredTools[selectedIndex]
      if (tool.status === 'ACTIVE') {
        window.location.href = `/${tool.slug}`
      } else {
        navigate(`/tools/${tool.slug}`)
      }
    } else {
      const cmdIndex = selectedIndex - filteredTools.length
      if (cmdIndex < filteredCommands.length) {
        navigate(filteredCommands[cmdIndex].href)
      }
    }
  }, [selectedIndex, filteredTools, filteredCommands, navigate])

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIndex((i) => Math.min(i + 1, totalResults - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIndex((i) => Math.max(i - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      executeSelected()
    }
  }

  // Scroll selected item into view
  useEffect(() => {
    const el = listRef.current?.querySelector('[data-selected="true"]')
    el?.scrollIntoView({ block: 'nearest' })
  }, [selectedIndex])

  if (!open) return null

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 bg-[#040B4D]/30 backdrop-blur-sm"
        onClick={() => setOpen(false)}
        aria-hidden
      />

      {/* Palette */}
      <div className="fixed inset-x-0 top-[15vh] z-50 flex justify-center px-4">
        <div className="w-full max-w-lg bg-white rounded-2xl shadow-[0_24px_64px_-16px_rgba(4,11,77,0.25)] border border-[#E7E7E7] overflow-hidden">
          {/* Search input */}
          <div className="flex items-center gap-3 px-4 border-b border-[#E7E7E7]">
            <Search className="h-4 w-4 text-[rgba(4,11,77,0.40)] flex-shrink-0" aria-hidden />
            <input
              ref={inputRef}
              type="text"
              placeholder="Search tools or jump to..."
              value={query}
              onChange={(e) => {
                setQuery(e.target.value)
                setSelectedIndex(0)
              }}
              onKeyDown={handleKeyDown}
              className="flex-1 h-12 text-sm text-[#040B4D] placeholder:text-[rgba(4,11,77,0.40)] bg-transparent outline-none"
              aria-label="Command palette search"
            />
            <kbd className="hidden sm:inline-flex items-center rounded border border-[#E7E7E7] bg-[#FAFAFA] px-1.5 py-0.5 text-[10px] font-medium text-[rgba(4,11,77,0.40)]">
              ESC
            </kbd>
          </div>

          {/* Results */}
          <div ref={listRef} className="max-h-[320px] overflow-y-auto py-2">
            {/* Tools section */}
            {filteredTools.length > 0 && (
              <div>
                <p className="px-4 py-1.5 text-[10px] font-semibold tracking-widest uppercase text-[rgba(4,11,77,0.40)]">
                  Tools
                </p>
                {filteredTools.map((tool, i) => {
                  const accent = getToolAccent(tool.name)
                  const isSelected = i === selectedIndex
                  return (
                    <button
                      key={tool.id}
                      data-selected={isSelected}
                      onClick={() => {
                        if (tool.status === 'ACTIVE') {
                          window.location.href = `/${tool.slug}`
                        } else {
                          navigate(`/tools/${tool.slug}`)
                        }
                      }}
                      onMouseEnter={() => setSelectedIndex(i)}
                      className={cn(
                        'w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors',
                        isSelected ? 'bg-[#F8F8FC]' : 'hover:bg-[#FAFAFA]',
                      )}
                    >
                      <div
                        className={cn(
                          'h-7 w-7 rounded-lg flex items-center justify-center flex-shrink-0 text-white text-[10px] font-bold',
                          accent.bg,
                        )}
                        aria-hidden
                      >
                        {tool.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-[#040B4D] truncate">{tool.name}</p>
                        {tool.team && (
                          <p className="text-[11px] text-[rgba(4,11,77,0.40)] truncate">
                            {tool.team}
                          </p>
                        )}
                      </div>
                      {tool.status === 'ACTIVE' && (
                        <ArrowUpRight
                          className="h-3.5 w-3.5 text-[rgba(4,11,77,0.40)] flex-shrink-0"
                          aria-hidden
                        />
                      )}
                    </button>
                  )
                })}
              </div>
            )}

            {/* Commands section */}
            {filteredCommands.length > 0 && (
              <div>
                <p className="px-4 py-1.5 text-[10px] font-semibold tracking-widest uppercase text-[rgba(4,11,77,0.40)]">
                  Commands
                </p>
                {filteredCommands.map((cmd, i) => {
                  const globalIndex = filteredTools.length + i
                  const isSelected = globalIndex === selectedIndex
                  const Icon = cmd.icon
                  return (
                    <button
                      key={cmd.id}
                      data-selected={isSelected}
                      onClick={() => navigate(cmd.href)}
                      onMouseEnter={() => setSelectedIndex(globalIndex)}
                      className={cn(
                        'w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors',
                        isSelected ? 'bg-[#F8F8FC]' : 'hover:bg-[#FAFAFA]',
                      )}
                    >
                      <div className="h-7 w-7 rounded-lg bg-[#FAFAFA] flex items-center justify-center flex-shrink-0">
                        <Icon className="h-3.5 w-3.5 text-[rgba(4,11,77,0.55)]" aria-hidden />
                      </div>
                      <p className="text-sm font-medium text-[#040B4D]">{cmd.label}</p>
                    </button>
                  )
                })}
              </div>
            )}

            {totalResults === 0 && (
              <div className="py-8 text-center">
                <p className="text-sm text-[rgba(4,11,77,0.40)]">
                  No results for &ldquo;{query}&rdquo;
                </p>
              </div>
            )}
          </div>

          {/* Footer hint */}
          <div className="border-t border-[#E7E7E7] px-4 py-2 flex items-center gap-4 text-[10px] text-[rgba(4,11,77,0.40)]">
            <span className="inline-flex items-center gap-1">
              <kbd className="rounded border border-[#E7E7E7] bg-[#FAFAFA] px-1 py-px font-medium">
                ↑↓
              </kbd>
              navigate
            </span>
            <span className="inline-flex items-center gap-1">
              <kbd className="rounded border border-[#E7E7E7] bg-[#FAFAFA] px-1 py-px font-medium">
                ↵
              </kbd>
              open
            </span>
            <span className="inline-flex items-center gap-1">
              <kbd className="rounded border border-[#E7E7E7] bg-[#FAFAFA] px-1 py-px font-medium">
                esc
              </kbd>
              close
            </span>
          </div>
        </div>
      </div>
    </>
  )
}
