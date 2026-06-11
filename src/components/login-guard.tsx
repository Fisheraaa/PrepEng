"use client"

import { useState, useEffect, useCallback, createContext, useContext } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

// Auth Context
interface AuthContextType {
  token: string | null
  isAuthenticated: boolean
  logout: () => void
  setToken: (token: string | null) => void
}

const AuthContext = createContext<AuthContextType>({
  token: null,
  isAuthenticated: false,
  logout: () => {},
  setToken: () => {},
})

export function useAuth() {
  return useContext(AuthContext)
}

// Auth Provider
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(null)

  // 验证现有 token
  useEffect(() => {
    if (!token) return

    const verify = async () => {
      try {
        const res = await fetch("/api/auth", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "verify", token }),
        })
        const data = await res.json()
        if (!data.valid) {
          setToken(null)
        }
      } catch {
        setToken(null)
      }
    }

    verify()

    // 每 5 分钟验证一次
    const interval = setInterval(verify, 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [token])

  const logout = useCallback(() => {
    setToken(null)
  }, [])

  return (
    <AuthContext.Provider value={{ token, isAuthenticated: !!token, logout, setToken }}>
      {children}
    </AuthContext.Provider>
  )
}

// Login Page
export function LoginPage() {
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const { isAuthenticated, setToken } = useAuth()

  const handleLogin = useCallback(async () => {
    if (!password.trim()) return

    setLoading(true)
    setError("")

    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "login", password }),
      })

      const data = await res.json()

      if (data.success && data.token) {
        setToken(data.token)
      } else {
        setError(data.error || "登录失败")
      }
    } catch {
      setError("网络错误")
    } finally {
      setLoading(false)
    }
  }, [password, setToken])

  if (isAuthenticated) {
    return null
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <Card className="w-full max-w-md mx-4">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">📚 PrepEng</CardTitle>
          <p className="text-sm text-muted-foreground mt-2">英语备考工具</p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Input
              type="password"
              placeholder="请输入访问密码"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleLogin()}
              disabled={loading}
            />
            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}
          </div>
          <Button
            className="w-full"
            onClick={handleLogin}
            disabled={loading || !password.trim()}
          >
            {loading ? "验证中..." : "进入"}
          </Button>
          <p className="text-xs text-muted-foreground text-center">
            密码每次访问都需要输入，不会保存
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
