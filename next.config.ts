import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // O next dev cria um AGENTS.md só para agentes. O projeto não usa esse arquivo.
  agentRules: false,
}

export default nextConfig
