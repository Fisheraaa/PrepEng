"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import {
  type APIConfig,
  type AuthStyle,
  loadConfig,
  saveConfig,
  presets,
  isConfigValid,
} from "@/lib/api-config"

export default function SettingsPage() {
  const [config, setConfig] = useState<APIConfig>({
    provider: "openai-compatible",
    baseUrl: "",
    apiKey: "",
    model: "",
    authStyle: "bearer",
  })
  const [saved, setSaved] = useState(false)
  const [showKey, setShowKey] = useState(false)
  const [testResult, setTestResult] = useState<string | null>(null)
  const [testing, setTesting] = useState(false)

  useEffect(() => {
    setConfig(loadConfig())
  }, [])

  const handleSave = () => {
    saveConfig(config)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const handlePreset = (name: string) => {
    const preset = presets[name]
    if (preset) {
      setConfig((prev) => {
        const next = { ...prev, ...preset }
        saveConfig(next)  // 点预设立即保存，避免旧缓存残留
        setSaved(true)
        setTimeout(() => setSaved(false), 2000)
        return next
      })
    }
  }

  const handleTest = async () => {
    setTesting(true)
    setTestResult(null)

    try {
      const res = await fetch("/api/test-connection", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      })
      const data = await res.json()
      if (res.ok) {
        setTestResult(`✅ 连接成功！模型：${data.model}`)
      } else {
        setTestResult(`❌ ${data.error}`)
      }
    } catch (err) {
      setTestResult(`❌ 网络错误：${err instanceof Error ? err.message : "未知"}`)
    }

    setTesting(false)
  }

  const valid = isConfigValid(config)

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="border-b border-border px-6 py-4">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <a href="/" className="flex items-center gap-2">
            <span className="text-xl">🎯</span>
            <span className="font-bold text-sm">PrepEng</span>
          </a>
          <Badge variant="outline">设置</Badge>
        </div>
      </header>

      <main className="p-6 max-w-2xl mx-auto space-y-6">
        <div className="space-y-2">
          <h1 className="text-2xl font-bold">⚙️ API 设置</h1>
          <p className="text-muted-foreground">
            配置 AI 接口，用于写作批改、翻译批改等功能。
            支持任何 OpenAI 兼容接口（DeepSeek、Moonshot、硅基流动等）。
          </p>
        </div>

        {/* 快捷预设 */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">快捷预设</CardTitle>
            <CardDescription className="text-xs">
              选一个预设，然后填入你的 API Key
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {Object.keys(presets).map((name) => (
                <Button
                  key={name}
                  variant="outline"
                  size="sm"
                  onClick={() => handlePreset(name)}
                  className={cn(
                    config.baseUrl === presets[name].baseUrl &&
                      "border-primary bg-primary/10"
                  )}
                >
                  {name}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* 详细配置 */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">接口配置</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Base URL */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium">
                API Base URL
              </label>
              <Input
                value={config.baseUrl}
                onChange={(e) =>
                  setConfig((prev) => ({ ...prev, baseUrl: e.target.value }))
                }
                placeholder="https://api.deepseek.com/v1"
              />
              <p className="text-xs text-muted-foreground">
                OpenAI 兼容接口地址，末尾通常以 /v1 结尾
              </p>
            </div>

            {/* API Key */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium">API Key</label>
              <div className="flex gap-2">
                <Input
                  type={showKey ? "text" : "password"}
                  value={config.apiKey}
                  onChange={(e) =>
                    setConfig((prev) => ({ ...prev, apiKey: e.target.value }))
                  }
                  placeholder="sk-..."
                  className="flex-1"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowKey(!showKey)}
                >
                  {showKey ? "隐藏" : "显示"}
                </Button>
              </div>
            </div>

            {/* Model */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium">模型名称</label>
              <Input
                value={config.model}
                onChange={(e) =>
                  setConfig((prev) => ({ ...prev, model: e.target.value }))
                }
                placeholder="deepseek-chat"
              />
              <p className="text-xs text-muted-foreground">
                填 API 提供商支持的模型 ID
              </p>
            </div>

            {/* Provider */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium">协议类型</label>
              <div className="flex gap-2">
                {(["openai-compatible", "anthropic"] as const).map((p) => (
                  <Button
                    key={p}
                    variant={config.provider === p ? "default" : "outline"}
                    size="sm"
                    onClick={() =>
                      setConfig((prev) => ({ ...prev, provider: p }))
                    }
                  >
                    {p === "openai-compatible" ? "OpenAI 兼容" : "Anthropic"}
                  </Button>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                大多数国内 API 都选 "OpenAI 兼容"
              </p>
            </div>

            {/* Auth Style */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium">认证方式</label>
              <div className="flex gap-2">
                {([
                  { value: "bearer" as AuthStyle, label: "Bearer Token", desc: "Authorization: Bearer sk-xxx" },
                  { value: "api-key" as AuthStyle, label: "api-key Header", desc: "api-key: xxx（小米等）" },
                ].map((a) => (
                  <Button
                    key={a.value}
                    variant={config.authStyle === a.value ? "default" : "outline"}
                    size="sm"
                    onClick={() =>
                      setConfig((prev) => ({ ...prev, authStyle: a.value }))
                    }
                  >
                    {a.label}
                  </Button>
                )))}
              </div>
              <p className="text-xs text-muted-foreground">
                小米 MiMo 用 "api-key Header"，其他大多用 "Bearer Token"
              </p>
            </div>
          </CardContent>
        </Card>

        {/* 操作按钮 */}
        <div className="flex gap-3">
          <Button onClick={handleSave} disabled={!valid}>
            {saved ? "✅ 已保存" : "保存配置"}
          </Button>
          <Button
            variant="outline"
            onClick={handleTest}
            disabled={!valid || testing}
          >
            {testing ? "测试中..." : "测试连接"}
          </Button>
        </div>

        {/* 测试结果 */}
        {testResult && (
          <Card
            className={cn(
              testResult.startsWith("✅")
                ? "border-emerald-500/30"
                : "border-destructive/30"
            )}
          >
            <CardContent className="pt-4">
              <p className="text-sm">{testResult}</p>
            </CardContent>
          </Card>
        )}

        {/* 状态提示 */}
        {!valid && (
          <Card className="bg-muted/50">
            <CardContent className="pt-4">
              <p className="text-sm text-muted-foreground">
                ⚠️ 请填写完整配置后保存。未配置 API 时，写作和翻译模块会使用本地批改（功能有限）。
              </p>
            </CardContent>
          </Card>
        )}

        <Separator />

        {/* 使用说明 */}
        <Card className="bg-muted/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">💡 怎么获取 API Key？</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-3">
            <div>
              <p className="font-medium text-foreground">推荐：小米 MiMo</p>
              <ul className="list-disc pl-4 space-y-1 mt-1">
                <li>
                  去{" "}
                  <a
                    href="https://platform.xiaomimimo.com"
                    target="_blank"
                    className="text-primary underline"
                  >
                    platform.xiaomimimo.com
                  </a>{" "}
                  注册
                </li>
                <li>控制台 → API Keys → 创建 Key</li>
                <li>预设选 "小米 MiMo"，认证方式选 "api-key Header"</li>
              </ul>
            </div>
            <div>
              <p className="font-medium text-foreground">其他选择</p>
              <ul className="list-disc pl-4 space-y-1 mt-1">
                <li><strong>DeepSeek</strong> — 便宜好用，platform.deepseek.com</li>
                <li><strong>Moonshot (Kimi)</strong> — platform.moonshot.cn</li>
                <li><strong>硅基流动</strong> — siliconflow.cn</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
