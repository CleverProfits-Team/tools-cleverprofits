import type { Metadata } from 'next'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import { RegisterToolForm } from '@/components/forms/register-tool-form'

export const metadata: Metadata = { title: 'Register Tool' }

export default function RegisterPage() {
  return (
    <div className="max-w-xl">
      {/* ── Breadcrumb ──────────────────────────────────────────────── */}
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-1 text-sm text-slate-400 hover:text-slate-600 transition-colors mb-6"
      >
        <ChevronLeft className="h-3.5 w-3.5" aria-hidden />
        Back to Dashboard
      </Link>

      {/* ── Page header ─────────────────────────────────────────────── */}
      <div className="mb-8">
        <h1 className="font-display font-bold text-2xl text-[#040B4D] tracking-tight">Register Tool</h1>
        <p className="text-sm text-slate-500 mt-1">
          Add an internal tool to the CleverProfits platform. New tools start as{' '}
          <span className="font-medium text-amber-600">Pending</span> and require admin approval
          before they go live.
        </p>
      </div>

      {/* ── Form ────────────────────────────────────────────────────── */}
      <RegisterToolForm />
    </div>
  )
}
