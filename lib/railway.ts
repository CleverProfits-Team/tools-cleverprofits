/**
 * lib/railway.ts — Railway GraphQL client for tool subdomain provisioning.
 *
 * Used at tool registration to attach `<slug>.cleverprofits.app` as a custom
 * domain on the tool's own Railway service. Each tool runs as a separate
 * Railway service — this lib does NOT create services, it only attaches a
 * custom domain to an existing one.
 *
 * Env var required:
 *   RAILWAY_API_TOKEN — account-level token (https://railway.app/account/tokens)
 *
 * Notes from the KPI cutover (2026-04-28):
 *   - Do NOT pass `targetPort` — let Railway pick. Setting it incorrectly fails the cert.
 *   - The verificationToken returned by Railway is already prefixed; copy verbatim.
 *   - Always include a custom User-Agent (matches Cloudflare WAF compatibility pattern).
 */

const RAILWAY_API = 'https://backboard.railway.com/graphql/v2'
const UA          = 'tools-cleverprofits/1.0'

function token(): string {
  const t = process.env.RAILWAY_API_TOKEN
  if (!t) throw new Error('RAILWAY_API_TOKEN is not set')
  return t
}

interface GqlResponse<T> { data?: T; errors?: Array<{ message: string }> }

async function gql<T>(query: string, variables?: Record<string, unknown>): Promise<T> {
  const res = await fetch(RAILWAY_API, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token()}`,
      'Content-Type':  'application/json',
      'User-Agent':    UA,
    },
    body: JSON.stringify({ query, variables }),
  })
  const body = await res.json() as GqlResponse<T>
  if (body.errors?.length) {
    throw new Error(`Railway API error: ${body.errors.map((e) => e.message).join('; ')}`)
  }
  if (!body.data) throw new Error(`Railway API: empty response (HTTP ${res.status})`)
  return body.data
}

export interface RailwayDnsRecord {
  fqdn:          string
  recordType:    'DNS_RECORD_TYPE_CNAME' | 'DNS_RECORD_TYPE_TXT' | string
  requiredValue: string
  currentValue:  string
  status:        'DNS_RECORD_STATUS_PROPAGATED' | 'DNS_RECORD_STATUS_REQUIRES_UPDATE' | string
}

export interface CustomDomain {
  id:                  string
  domain:              string
  records:             RailwayDnsRecord[]
  /** TXT-record host name Railway requires for ownership verification, e.g. `_railway-verify.calendar`. */
  verificationDnsHost: string | null
  /** TXT-record value (already prefixed with `railway-verify=`). */
  verificationToken:   string | null
  verified:            boolean
  certificateStatus:   string | null
}

export async function addCustomDomain(input: {
  domain:        string
  projectId:     string
  serviceId:     string
  environmentId: string
}): Promise<CustomDomain> {
  // Step 1: create the custom domain (returns CNAME requirements only).
  const created = await gql<{ customDomainCreate: { id: string; domain: string } }>(
    `mutation($input: CustomDomainCreateInput!) {
      customDomainCreate(input: $input) { id domain }
    }`,
    { input },
  )

  // Step 2: read the full status — this is where the TXT verification token
  // and verification host live. They are NOT exposed by the create mutation,
  // so callers that skip this step will miss the TXT record and the cert
  // will hang in CERTIFICATE_STATUS_TYPE_VALIDATING_OWNERSHIP indefinitely.
  return getCustomDomainStatus({
    id:        created.customDomainCreate.id,
    projectId: input.projectId,
  })
}

export async function removeCustomDomain(input: { id: string; projectId: string }): Promise<void> {
  await gql(
    `mutation($id: String!, $projectId: String!) { customDomainDelete(id: $id, projectId: $projectId) }`,
    input,
  )
}

export async function getCustomDomainStatus(input: { id: string; projectId: string }): Promise<CustomDomain> {
  const data = await gql<{
    customDomain: {
      id: string; domain: string;
      status: {
        dnsRecords:          RailwayDnsRecord[]
        verified:            boolean
        verificationDnsHost: string | null
        verificationToken:   string | null
        certificateStatus:   string | null
      }
    }
  }>(
    `query($id: String!, $projectId: String!) {
      customDomain(id: $id, projectId: $projectId) {
        id
        domain
        status {
          dnsRecords { fqdn recordType requiredValue currentValue status }
          verified
          verificationDnsHost
          verificationToken
          certificateStatus
        }
      }
    }`,
    input,
  )
  const c = data.customDomain
  return {
    id:                  c.id,
    domain:              c.domain,
    records:             c.status.dnsRecords,
    verificationDnsHost: c.status.verificationDnsHost,
    verificationToken:   c.status.verificationToken,
    verified:            c.status.verified,
    certificateStatus:   c.status.certificateStatus,
  }
}

/**
 * Looks up a Railway service by id, returning the project + environment ids
 * needed to attach a custom domain. Throws if the service does not exist or
 * the token doesn't have access to it.
 *
 * Used at tool registration: the user pastes a Railway service id into the
 * form, we resolve the surrounding context here so the approval flow can
 * call provisionTool() without further input.
 *
 * Multi-environment caveat: services usually have multiple environments
 * (production, staging, preview branches). We pick the one named "production"
 * if present, otherwise fall back to the first one. Callers can override.
 */
export async function findServiceById(serviceId: string): Promise<{
  serviceId:     string
  serviceName:   string
  projectId:     string
  projectName:   string
  environmentId: string
  envName:       string
}> {
  const data = await gql<{
    service: {
      id: string; name: string; projectId: string;
      project: {
        id: string; name: string;
        environments: { edges: Array<{ node: { id: string; name: string } }> }
      }
    } | null
  }>(
    `query($id: String!) {
      service(id: $id) {
        id name projectId
        project {
          id name
          environments { edges { node { id name } } }
        }
      }
    }`,
    { id: serviceId },
  )
  if (!data.service) throw new Error(`Railway service ${serviceId} not found`)

  const envs = data.service.project.environments.edges.map((e) => e.node)
  const env  = envs.find((e) => e.name === 'production') ?? envs[0]
  if (!env) throw new Error(`Railway service ${serviceId} has no environments`)

  return {
    serviceId:     data.service.id,
    serviceName:   data.service.name,
    projectId:     data.service.project.id,
    projectName:   data.service.project.name,
    environmentId: env.id,
    envName:       env.name,
  }
}

export async function listProjects(): Promise<Array<{
  id:           string
  name:         string
  services:     Array<{ id: string; name: string }>
  environments: Array<{ id: string; name: string }>
}>> {
  const data = await gql<{
    projects: { edges: Array<{ node: {
      id: string; name: string;
      services:     { edges: Array<{ node: { id: string; name: string } }> }
      environments: { edges: Array<{ node: { id: string; name: string } }> }
    } }> }
  }>(
    `query {
      projects {
        edges { node {
          id name
          services     { edges { node { id name } } }
          environments { edges { node { id name } } }
        } }
      }
    }`,
  )
  return data.projects.edges.map((e) => ({
    id:           e.node.id,
    name:         e.node.name,
    services:     e.node.services.edges.map((s) => s.node),
    environments: e.node.environments.edges.map((env) => env.node),
  }))
}
