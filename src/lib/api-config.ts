// ============================================================
// API 配置管理 — 支持任何 OpenAI 兼容接口
// ============================================================

export type AuthStyle = "bearer" | "api-key"

export interface APIConfig {
  provider: "openai-compatible" | "anthropic"
  baseUrl: string
  apiKey: string
  model: string
  authStyle: AuthStyle  // bearer = Authorization: Bearer xxx, api-key = api-key: xxx
}

const STORAGE_KEY = "cet-prep-api-config"

const defaultConfig: APIConfig = {
  provider: "openai-compatible",
  baseUrl: "https://api.openai.com/v1",
  apiKey: "",
  model: "gpt-4o-mini",
  authStyle: "bearer",
}

// 常见预设
export const presets: Record<string, Partial<APIConfig>> = {
  "小米 MiMo": {
    provider: "openai-compatible",
    baseUrl: "https://token-plan-cn.xiaomimimo.com/v1",
    model: "mimo-v2.5-pro",
    authStyle: "api-key",
  },
  "DeepSeek": {
    provider: "openai-compatible",
    baseUrl: "https://api.deepseek.com/v1",
    model: "deepseek-chat",
    authStyle: "bearer",
  },
  "OpenAI": {
    provider: "openai-compatible",
    baseUrl: "https://api.openai.com/v1",
    model: "gpt-4o-mini",
    authStyle: "bearer",
  },
  "Moonshot (Kimi)": {
    provider: "openai-compatible",
    baseUrl: "https://api.moonshot.cn/v1",
    model: "moonshot-v1-8k",
    authStyle: "bearer",
  },
  "Claude": {
    provider: "anthropic",
    baseUrl: "https://api.anthropic.com/v1",
    model: "claude-sonnet-4-20250514",
    authStyle: "bearer",
  },
  "硅基流动": {
    provider: "openai-compatible",
    baseUrl: "https://api.siliconflow.cn/v1",
    model: "deepseek-ai/DeepSeek-V3",
    authStyle: "bearer",
  },
}

export function loadConfig(): APIConfig {
  if (typeof window === "undefined") return defaultConfig
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return defaultConfig
    // 兼容旧配置（没有 authStyle 的）
    const parsed = JSON.parse(raw)
    return { ...defaultConfig, ...parsed, authStyle: parsed.authStyle ?? "bearer" }
  } catch {
    return defaultConfig
  }
}

export function saveConfig(config: APIConfig): void {
  if (typeof window === "undefined") return
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config))
  } catch {}
}

export function isConfigValid(config: APIConfig): boolean {
  return !!(config.baseUrl && config.apiKey && config.model)
}
