import { afterEach, describe, expect, it, vi } from 'vitest'

describe('trust proxy configuration', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.resetModules()
  })

  it('does not trust proxy hops by default', async () => {
    const { createApp } = await import('../src/app.js')

    expect(createApp().get('trust proxy')).toBe(false)
  })

  it('trusts the configured number of proxy hops', async () => {
    vi.stubEnv('TRUST_PROXY_HOPS', '3')
    vi.resetModules()

    const { createApp } = await import('../src/app.js')

    expect(createApp().get('trust proxy')).toBe(3)
  })
})
