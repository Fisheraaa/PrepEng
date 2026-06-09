"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { usePathname } from "next/navigation"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"
import { sampleCET4Translation } from "@/lib/exam-data"
import { loadConfig, isConfigValid } from "@/lib/api-config"
import { MarkdownContent } from "@/components/markdown-content"
import type { TranslationQuestion } from "@/types/exam"

// ============================================================
// 自动存档
// ============================================================

function saveDraft(examType: string, paperId: string, text: string) {
  try {
    localStorage.setItem(
      `trans-draft-${examType}-${paperId}`,
      JSON.stringify({ text, savedAt: Date.now() })
    )
  } catch {}
}

function loadDraft(examType: string, paperId: string): string | null {
  try {
    const raw = localStorage.getItem(`trans-draft-${examType}-${paperId}`)
    if (!raw) return null
    return JSON.parse(raw).text ?? null
  } catch {
    return null
  }
}

// ============================================================
// 流式读取 SSE
// ============================================================

async function streamAI(
  url: string,
  body: object,
  onChunk: (text: string) => void,
  onDone: () => void,
  onError: (err: string) => void
) {
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })

    if (!res.ok) {
      const err = await res.text()
      try {
        const parsed = JSON.parse(err)
        onError(parsed.error || `HTTP ${res.status}`)
      } catch {
        onError(`HTTP ${res.status}: ${err.slice(0, 200)}`)
      }
      return
    }

    const reader = res.body?.getReader()
    if (!reader) {
      onError("无法读取响应流")
      return
    }

    const decoder = new TextDecoder()
    let buffer = ""

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split("\n")
      buffer = lines.pop() ?? ""

      for (const line of lines) {
        const trimmed = line.trim()
        if (!trimmed || !trimmed.startsWith("data: ")) continue
        const data = trimmed.slice(6)
        if (data === "[DONE]") {
          onDone()
          return
        }
        try {
          const parsed = JSON.parse(data)
          if (parsed.content) {
            onChunk(parsed.content)
          }
        } catch {
          // skip
        }
      }
    }
    onDone()
  } catch (err) {
    onError(err instanceof Error ? err.message : "网络错误")
  }
}

// ============================================================
// 主页面
// ============================================================

type Phase = "select" | "translating" | "feedback"

export default function TranslatePage() {
  const pathname = usePathname()
  const examType = pathname.split("/")[1] || "cet4"

  const [phase, setPhase] = useState<Phase>("select")
  const [userTranslation, setUserTranslation] = useState("")
  const [isStreaming, setIsStreaming] = useState(false)
  const [streamedText, setStreamedText] = useState("")
  const [apiError, setApiError] = useState<string | null>(null)
  const [apiDone, setApiDone] = useState(false)
  const [savedDraft, setSavedDraft] = useState<string | null>(null)
  const feedbackRef = useRef<HTMLDivElement>(null)

  const paper = sampleCET4Translation
  const transSection = paper.sections.find((s) => s.type === "translation")
  const question = transSection?.questions[0] as TranslationQuestion | undefined

  // 检测草稿（不自动恢复）
  useEffect(() => {
    const draft = loadDraft(examType, paper.id)
    if (draft && draft.length > 10) {
      setSavedDraft(draft)
    } else {
      setSavedDraft(null)
    }
  }, [examType, paper.id])

  // 自动存档
  useEffect(() => {
    if (phase === "translating" && userTranslation.length > 0) {
      const timer = setTimeout(
        () => saveDraft(examType, paper.id, userTranslation),
        2000
      )
      return () => clearTimeout(timer)
    }
  }, [userTranslation, phase, examType, paper.id])

  // 流式输出时：只在用户已经在底部时才自动滚
  useEffect(() => {
    const el = feedbackRef.current
    if (!el || !isStreaming) return
    // 距离底部 100px 以内视为"在底部"
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 100
    if (atBottom) {
      el.scrollTop = el.scrollHeight
    }
  }, [streamedText, isStreaming])

  const wordCount = userTranslation
    .trim()
    .split(/\s+/)
    .filter((w) => w.length > 0).length

  const handleCheck = useCallback(async () => {
    if (!question) return

    const apiConfig = loadConfig()
    if (!isConfigValid(apiConfig)) {
      setApiError("未配置 API。去设置页配置后可获得 AI 批改。")
      setPhase("feedback")
      return
    }

    setIsStreaming(true)
    setStreamedText("")
    setApiError(null)
    setApiDone(false)
    setPhase("feedback")
    // 提交后清除草稿，刷新不再恢复旧内容
    try { localStorage.removeItem(`trans-draft-${examType}-${paper.id}`) } catch {}

    await streamAI(
      "/api/grade-translation",
      {
        config: apiConfig,
        user_translation: userTranslation,
        source_text: question.source_text,
        reference_translation: question.reference_translation,
        scoring_points: question.scoring_points,
      },
      (chunk) => setStreamedText((prev) => prev + chunk),
      () => {
        setIsStreaming(false)
        setApiDone(true)
      },
      (err) => {
        setApiError(err)
        setIsStreaming(false)
        setApiDone(true)
      }
    )
  }, [question, userTranslation])

  const handleReset = useCallback(() => {
    setUserTranslation("")
    setStreamedText("")
    setApiError(null)
    setApiDone(false)
    setIsStreaming(false)
    setPhase("translating")
  }, [])

  // --- 选题 ---
  if (phase === "select") {
    return (
      <div className="p-8 max-w-3xl mx-auto space-y-6">
        <div className="space-y-2">
          <h1 className="text-2xl font-bold">🔄 翻译练习</h1>
          <p className="text-muted-foreground">
            中文 → 英文。提交后 AI 实时批改，逐句点评。
          </p>
        </div>

        {/* 草稿提示 */}
        {savedDraft && (
          <Card className="border-primary/30 bg-primary/5">
            <CardContent className="pt-4 pb-3 px-4 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">发现未完成的草稿</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {savedDraft.slice(0, 60)}...
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={() => {
                    setUserTranslation(savedDraft)
                    setPhase("translating")
                  }}
                >
                  继续翻译
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setSavedDraft(null)
                    try { localStorage.removeItem(`trans-draft-${examType}-${paper.id}`) } catch {}
                  }}
                >
                  丢弃
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        <Card
          className="cursor-pointer hover:border-primary/50 hover:bg-accent/50 transition-colors"
          onClick={() => setPhase("translating")}
        >
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>{paper.title} — 翻译</CardTitle>
              <Badge variant="outline">30 分钟</Badge>
            </div>
          </CardHeader>
        </Card>
      </div>
    )
  }

  // --- 做题界面（左右分栏） ---
  if (phase === "translating") {
    return (
      <div className="flex h-screen">
        {/* 左：中文原文 */}
        <div className="w-1/2 border-r border-border overflow-y-auto p-6 space-y-4">
          <h2 className="text-sm font-semibold text-muted-foreground">
            📄 中文原文
          </h2>
          <p className="text-sm leading-relaxed">{question?.source_text}</p>
        </div>

        {/* 右：翻译输入 */}
        <div className="w-1/2 flex flex-col">
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-muted-foreground">
                ✍️ 你的翻译
              </h2>
              <span className="text-xs text-muted-foreground">
                {wordCount} 词
              </span>
            </div>
            <Textarea
              value={userTranslation}
              onChange={(e) => setUserTranslation(e.target.value)}
              placeholder="Type your translation here..."
              className="min-h-[300px] resize-none text-sm leading-relaxed"
            />
          </div>

          {/* 底部提交栏 */}
          <div className="border-t border-border px-6 py-3 flex items-center justify-between shrink-0">
            <span className="text-xs text-muted-foreground">
              {isConfigValid(loadConfig()) ? (
                <span className="text-emerald-400">✅ AI 批改已配置</span>
              ) : (
                <span>
                  未配置 API，{" "}
                  <a href="/settings" className="text-primary underline">
                    去设置
                  </a>
                </span>
              )}
            </span>
            <Button
              onClick={handleCheck}
              disabled={wordCount < 10}
            >
              提交翻译
            </Button>
          </div>
        </div>
      </div>
    )
  }

  // --- 批改界面（全宽，流式输出） ---
  return (
    <div className="flex flex-col h-screen">
      {/* 顶栏 */}
      <div className="border-b border-border px-6 py-3 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <h1 className="text-lg font-bold">🔄 翻译批改</h1>
          {isStreaming && (
            <Badge className="bg-primary/10 text-primary border-primary/20 animate-pulse">
              AI 批改中...
            </Badge>
          )}
          {apiDone && !apiError && (
            <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20">
              ✅ 批改完成
            </Badge>
          )}
        </div>
        <Button variant="outline" size="sm" onClick={handleReset}>
          重翻
        </Button>
      </div>

      {/* 内容区 */}
      <div className="flex-1 overflow-y-auto" ref={feedbackRef}>
        <div className="max-w-4xl mx-auto p-6 space-y-6">
          {/* 原文 + 你的翻译（精简展示） */}
          <div className="grid md:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs text-muted-foreground">
                  📄 中文原文
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm leading-relaxed">
                  {question?.source_text}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs text-muted-foreground">
                  ✍️ 你的翻译
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm leading-relaxed whitespace-pre-wrap">
                  {userTranslation}
                </p>
              </CardContent>
            </Card>
          </div>

          <Separator />

          {/* 错误提示 */}
          {apiError && (
            <Card className="border-yellow-500/30 bg-yellow-500/5">
              <CardContent className="pt-3 pb-2 px-4">
                <p className="text-sm text-yellow-400">⚠️ {apiError}</p>
                <a
                  href="/settings"
                  className="text-xs text-primary underline mt-1 inline-block"
                >
                  去配置 API →
                </a>
              </CardContent>
            </Card>
          )}

          {/* AI 流式输出 */}
          {(streamedText || isStreaming) && (
            <Card>
              <CardContent className="pt-5 px-6 pb-6">
                {streamedText ? (
                  <div className="prose prose-invert prose-sm max-w-none">
                    <MarkdownContent text={streamedText} />
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground animate-pulse">
                    AI 正在分析你的翻译...
                  </p>
                )}
              </CardContent>
            </Card>
          )}

          {/* 参考译文 + 评分点（批改完成后） */}
          {apiDone && !apiError && question && (
            <>
              <Separator />

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">📝 参考译文</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm leading-relaxed">
                    {question.reference_translation}
                  </p>
                </CardContent>
              </Card>

              <div className="space-y-2">
                <h3 className="text-sm font-semibold text-muted-foreground">
                  🔑 评分关键点
                </h3>
                <div className="grid gap-2 md:grid-cols-2">
                  {question.scoring_points.map((point, i) => {
                    const userLower = userTranslation.toLowerCase()
                    const matched =
                      userLower.includes(
                        point.correct_translation.toLowerCase()
                      ) ||
                      point.alternatives.some((alt) =>
                        userLower.includes(alt.toLowerCase())
                      )
                    return (
                      <Card
                        key={i}
                        className={cn(
                          matched
                            ? "border-emerald-500/20"
                            : "border-destructive/20"
                        )}
                      >
                        <CardContent className="pt-2 pb-1.5 px-3 space-y-0.5">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs">
                              {matched ? "✅" : "❌"}
                            </span>
                            <Badge variant="secondary" className="text-xs">
                              {point.key_phrase}
                            </Badge>
                          </div>
                          <p className="text-xs">
                            <span className="text-emerald-400">✓</span>{" "}
                            {point.correct_translation}
                          </p>
                        </CardContent>
                      </Card>
                    )
                  })}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

// ============================================================
