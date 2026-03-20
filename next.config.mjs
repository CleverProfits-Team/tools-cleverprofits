/** @type {import('next').NextConfig} */
const config = {
  // Security headers for app-owned routes.
  // NOTE: The proxy route (/[slug]/[[...path]]) manages its own response
  // headers because it serves content from upstream services.
  async headers() {
    return [
      {
        source: '/(dashboard|admin|login|api)(.*)',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'X-XSS-Protection', value: '1; mode=block' },
        ],
      },
    ]
  },
}

export default config
