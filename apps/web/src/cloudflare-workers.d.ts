/** The slice of the Workers runtime module this app reads; bindings are typed where they are used. */
declare module 'cloudflare:workers' {
  export const env: Record<string, unknown>
}
