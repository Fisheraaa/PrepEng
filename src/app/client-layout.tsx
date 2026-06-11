"use client"

import { useEffect, useCallback, useState } from "react"
import { AuthProvider, LoginPage, useAuth } from "@/components/login-guard"

function AuthGate({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth()

  if (!isAuthenticated) {
    return <LoginPage />
  }

  return <>{children}</>
}

export function ClientLayout({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(null)

  // 监听登录事件
  useEffect(() => {
    const handler = (e: Event) => {
      const customEvent = e as CustomEvent
      if (customEvent.detail?.token) {
        setToken(customEvent.detail.token)
      }
    }

    window.addEventListener("auth:login", handler)
    return () => window.removeEventListener("auth:login", handler)
  }, [])

  // 扩展 fetch 来自动带上 token
  useEffect(() => {
    if (!token) return

    const originalFetch = window.fetch
    window.fetch = async (input, init = {}) => {
      // 只对我们的 API 调用添加 token
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

  return (
    <AuthProvider>
      <AuthGate>{children}</AuthGate>
    </AuthProvider>
  )
}
