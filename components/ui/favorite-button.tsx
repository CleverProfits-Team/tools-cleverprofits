'use client'

import { useState, useTransition } from 'react'
import { Star } from 'lucide-react'
import { cn } from '@/lib/utils'

interface FavoriteButtonProps {
  toolId: string
  initialFavorited: boolean
  className?: string
}

export function FavoriteButton({ toolId, initialFavorited, className }: FavoriteButtonProps) {
  const [favorited, setFavorited] = useState(initialFavorited)
  const [isPending, startTransition] = useTransition()

  function toggle() {
    const next = !favorited
    setFavorited(next) // optimistic

    startTransition(async () => {
      try {
        const res = await fetch('/api/favorites', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ toolId }),
        })
        if (!res.ok) setFavorited(!next) // revert on error
      } catch {
        setFavorited(!next) // revert on network error
      }
    })
  }

  return (
    <button
      onClick={(e) => {
        e.preventDefault()
        e.stopPropagation()
        toggle()
      }}
      disabled={isPending}
      className={cn(
        'p-1 rounded transition-colors duration-150 flex-shrink-0',
        favorited
          ? 'text-amber-400 hover:text-amber-500'
          : 'text-[#94a3b8]/40 hover:text-amber-400',
        className,
      )}
      aria-label={favorited ? 'Remove from favorites' : 'Add to favorites'}
      title={favorited ? 'Remove from favorites' : 'Add to favorites'}
    >
      <Star
        className={cn('h-4 w-4', favorited && 'fill-current')}
        aria-hidden
      />
    </button>
  )
}
