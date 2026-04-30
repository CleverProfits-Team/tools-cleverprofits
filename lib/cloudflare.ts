/**
 * lib/cloudflare.ts — Cloudflare DNS API client for tool subdomain provisioning.
 *
 * Used at tool registration to create the CNAME (and any verification TXT
 * records) for `<slug>.cleverprofits.app`. Mirror operations on tool deletion.
 *
 * Env vars required:
 *   CLOUDFLARE_API_TOKEN  — token with Zone:Read + Zone.DNS:Edit on the zone
 *   CLOUDFLARE_ZONE_ID    — zone id of cleverprofits.app
 *
 * Why the custom User-Agent: Cloudflare's WAF blocks the default Python/Node
 * fetch UA with a 1010 challenge. Always identify ourselves explicitly.
 */

const CF_API = 'https://api.cloudflare.com/client/v4'
const UA     = 'tools-cleverprofits/1.0'

function token(): string {
  const t = process.env.CLOUDFLARE_API_TOKEN
  if (!t) throw new Error('CLOUDFLARE_API_TOKEN is not set')
  return t
}

function zoneId(): string {
  const z = process.env.CLOUDFLARE_ZONE_ID
  if (!z) throw new Error('CLOUDFLARE_ZONE_ID is not set')
  return z
}

type CfResult<T> = { success: boolean; result: T; errors: Array<{ code: number; message: string }>; messages: unknown[] }

async function cf<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${CF_API}${path}`, {
    ...init,
    headers: {
      'Authorization': `Bearer ${token()}`,
      'Content-Type':  'application/json',
      'User-Agent':    UA,
      ...(init.headers ?? {}),
    },
  })
  const body = await res.json() as CfResult<T>
  if (!body.success) {
    const msg = body.errors?.map((e) => `[${e.code}] ${e.message}`).join('; ') ?? `HTTP ${res.status}`
    throw new Error(`Cloudflare API error: ${msg}`)
  }
  return body.result
}

export type DnsRecordType = 'CNAME' | 'TXT' | 'A' | 'AAAA'

export interface DnsRecord {
  id:      string
  name:    string
  type:    DnsRecordType
  content: string
  ttl:     number
  proxied: boolean
}

export async function createDnsRecord(input: {
  type:     DnsRecordType
  /** Subdomain only (e.g. "calendar"), or full FQDN — Cloudflare accepts both. */
  name:     string
  content:  string
  /** TTL=1 means "automatic". Defaults to 1. */
  ttl?:     number
  /**
   * Proxy through Cloudflare? Default false. Railway custom domains MUST be
   * unproxied — Railway terminates TLS itself; proxying breaks cert verification.
   */
  proxied?: boolean
  comment?: string
}): Promise<DnsRecord> {
  return cf<DnsRecord>(`/zones/${zoneId()}/dns_records`, {
    method: 'POST',
    body:   JSON.stringify({
      type:    input.type,
      name:    input.name,
      content: input.content,
      ttl:     input.ttl     ?? 1,
      proxied: input.proxied ?? false,
      comment: input.comment,
    }),
  })
}

export async function deleteDnsRecord(recordId: string): Promise<void> {
  await cf<{ id: string }>(`/zones/${zoneId()}/dns_records/${recordId}`, { method: 'DELETE' })
}

export async function listDnsRecords(filter?: { name?: string; type?: DnsRecordType }): Promise<DnsRecord[]> {
  const qs = new URLSearchParams()
  if (filter?.name) qs.set('name', filter.name)
  if (filter?.type) qs.set('type', filter.type)
  qs.set('per_page', '100')
  return cf<DnsRecord[]>(`/zones/${zoneId()}/dns_records?${qs}`)
}
