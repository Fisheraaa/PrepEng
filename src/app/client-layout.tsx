"use client"

import { useEffect } from "react"
import { AuthProvider, LoginPage, useAuth } from "@/components/login-guard"

function AuthGate({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth()

  if (!isAuthenticated) {
    return <LoginPage />
  }

  return <>{children}</>
}

function FetchInterceptor({ children }: { children: React.ReactNode }) {
  const { token } = useAuth()

  // 扩展 fetch 来自动带上 token
  useEffect(() => {
    if (!token) return

    const originalFetch = window.fetch
    window.fetch = async (input, init = {}) => {
      const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url

      if (url.startsWith("/api/") && !url.startsWith("/api/auth")) {
        const headers = new Headers(init.headers)
        headers.set("X-Session-Token", token)
        init.headers = headers
      }

      return originalFetch(input, init)
    }

    return () => {
      window.fetch = originalFetch
    }
  }, [token])

  return <>{children}</>
}

export function ClientLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <FetchInterceptor>
        <AuthGate>{children}</AuthGate>
      </FetchInterceptor>
    </AuthProvider>
  )
}
