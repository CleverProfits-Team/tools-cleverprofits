/**
 * lib/provisioning.ts — End-to-end tool subdomain provisioning.
 *
 * Combines lib/railway.ts (custom domain) and lib/cloudflare.ts (DNS records)
 * into a single provisioning + deprovisioning flow. Called from the tool
 * registration approval flow.
 *
 *   provisionTool({ slug, projectId, serviceId, environmentId })
 *     → Idempotent: if records already exist, returns existing IDs.
 *     → Returns Cloudflare record IDs + Railway custom-domain id so they can
 *       be persisted on the Tool row for later cleanup.
 *
 *   deprovisionTool({ slug, ... })
 *     → Removes the Cloudflare DNS records and the Railway custom domain.
 *
 * The platform domain is fixed as `cleverprofits.app`. Override with the
 * NEXT_PUBLIC_PLATFORM_HOST env var if you ever rename.
 */

import {
  addCustomDomain,
  removeCustomDomain,
  getCustomDomainStatus,
  type RailwayDnsRecord,
} from '@/lib/railway'
import {
  createDnsRecord,
  deleteDnsRecord,
  listDnsRecords,
} from '@/lib/cloudflare'

const PLATFORM_HOST = (process.env.NEXT_PUBLIC_PLATFORM_HOST ?? 'cleverprofits.app').split(':')[0]

export interface ProvisionedRecords {
  /** Railway custom domain id — needed for deprovision */
  railwayDomainId:     string
  /** Cloudflare DNS record ids — needed for deprovision (one per record Railway required) */
  cloudflareRecordIds: string[]
  /** Final Railway DNS record states (after creating CF records) */
  records:             RailwayDnsRecord[]
}

function fqdn(slug: string): string {
  return `${slug}.${PLATFORM_HOST}`
}

export async function provisionTool(input: {
  slug:          string
  projectId:     string
  serviceId:     string
  environmentId: string
}): Promise<ProvisionedRecords> {
  const domain = fqdn(input.slug)

  // 1. Add the custom domain on Railway. Returns the DNS records we must
  //    create in Cloudflare (CNAME, possibly TXT for verification).
  const cd = await addCustomDomain({
    domain,
    projectId:     input.projectId,
    serviceId:     input.serviceId,
    environmentId: input.environmentId,
  })

  // 2. Build the list of DNS records we need to create in Cloudflare.
  //    Railway exposes these in two different places:
  //      - cd.records (CNAME, A, etc.) — the routing records
  //      - cd.verificationDnsHost + cd.verificationToken — the TXT record
  //        Railway uses to verify domain ownership before issuing a cert
  //
  //    The TXT verification record is critical: without it, the cert hangs
  //    in CERTIFICATE_STATUS_TYPE_VALIDATING_OWNERSHIP indefinitely and the
  //    browser shows ERR_CERT_COMMON_NAME_INVALID.
  type Pending = { type: 'CNAME' | 'TXT'; name: string; content: string }
  const pending: Pending[] = []

  for (const rec of cd.records) {
    if (rec.recordType === 'DNS_RECORD_TYPE_CNAME') {
      pending.push({ type: 'CNAME', name: rec.fqdn, content: rec.requiredValue })
    } else if (rec.recordType === 'DNS_RECORD_TYPE_TXT') {
      pending.push({ type: 'TXT', name: rec.fqdn, content: rec.requiredValue })
    }
  }

  if (cd.verificationDnsHost && cd.verificationToken) {
    // verificationDnsHost is a host segment like "_railway-verify.calendar".
    // Cloudflare's `name` field accepts either the segment or full FQDN.
    pending.push({
      type:    'TXT',
      name:    cd.verificationDnsHost,
      content: cd.verificationToken,
    })
  }

  // Create matching DNS records in Cloudflare (idempotent — skip any that
  // already exist with the right value).
  const cloudflareRecordIds: string[] = []
  for (const rec of pending) {
    const fullName = rec.name.includes('.') && rec.name.endsWith(PLATFORM_HOST)
      ? rec.name
      : `${rec.name}.${PLATFORM_HOST}`
    const existing = await listDnsRecords({ name: fullName, type: rec.type })
    const matched  = existing.find((r) => r.content === rec.content)
    if (matched) {
      cloudflareRecordIds.push(matched.id)
      continue
    }

    const created = await createDnsRecord({
      type:    rec.type,
      name:    rec.name,
      content: rec.content,
      proxied: false,                                 // Railway terminates TLS itself
      comment: `Provisioned by /lib/provisioning.ts for ${input.slug}`,
    })
    cloudflareRecordIds.push(created.id)
  }

  // 3. Re-read Railway status so the caller sees up-to-date propagation state.
  const status = await getCustomDomainStatus({ id: cd.id, projectId: input.projectId })

  return {
    railwayDomainId:     cd.id,
    cloudflareRecordIds,
    records:             status.records,
  }
}

export async function deprovisionTool(input: {
  railwayDomainId:     string
  cloudflareRecordIds: string[]
  projectId:           string
}): Promise<void> {
  // Delete Cloudflare records first so we don't leave stale DNS pointing at
  // a domain Railway no longer routes.
  for (const id of input.cloudflareRecordIds) {
    try { await deleteDnsRecord(id) }
    catch (err) { console.warn(`[deprovision] CF record ${id} delete failed (already gone?):`, err) }
  }
  try {
    await removeCustomDomain({ id: input.railwayDomainId, projectId: input.projectId })
  } catch (err) {
    console.warn(`[deprovision] Railway domain ${input.railwayDomainId} delete failed (already gone?):`, err)
  }
}

/** Wait until Railway reports DNS_RECORD_STATUS_PROPAGATED for all records. */
export async function waitForPropagation(input: {
  railwayDomainId: string
  projectId:       string
  timeoutMs?:      number
  pollMs?:         number
}): Promise<boolean> {
  const deadline = Date.now() + (input.timeoutMs ?? 5 * 60 * 1000)
  const poll     = input.pollMs ?? 5000

  while (Date.now() < deadline) {
    const status = await getCustomDomainStatus({ id: input.railwayDomainId, projectId: input.projectId })
    if (status.records.every((r) => r.status === 'DNS_RECORD_STATUS_PROPAGATED')) return true
    await new Promise((r) => setTimeout(r, poll))
  }
  return false
}
