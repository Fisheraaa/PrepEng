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
import { sampleCET4Writing } from "@/lib/exam-data"
import { loadConfig, isConfigValid } from "@/lib/api-config"
import type { WritingQuestion } from "@/types/exam"
import { MarkdownContent } from "@/components/markdown-content"

// ============================================================
// 自动存档
// ============================================================

function saveDraft(examType: string, paperId: string, essay: string) {
  try {
    localStorage.setItem(
      `write-draft-${examType}-${paperId}`,
      JSON.stringify({ essay, savedAt: Date.now() })
    )
  } catch {}
}

function loadDraft(examType: string, paperId: string): string | null {
  try {
    const raw = localStorage.getItem(`write-draft-${examType}-${paperId}`)
    if (!raw) return null
    return JSON.parse(raw).essay ?? null
  } catch {
    return null
  }
}

// ============================================================
// 流式读取
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
        onError(JSON.parse(err).error || `HTTP ${res.status}`)
      } catch {
        onError(`HTTP ${res.status}: ${err.slice(0, 200)}`)
      }
      return
    }
    const reader = res.body?.getReader()
    if (!reader) { onError("无法读取响应流"); return }
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
        if (data === "[DONE]") { onDone(); return }
        try {
          const parsed = JSON.parse(data)
          if (parsed.content) onChunk(parsed.content)
        } catch {}
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

type Phase = "select" | "writing" | "feedback"

export default function WritePage() {
  const pathname = usePathname()
  const examType = pathname.split("/")[1] || "cet4"

  const [phase, setPhase] = useState<Phase>("select")
  const [essay, setEssay] = useState("")
  const [isStreaming, setIsStreaming] = useState(false)
  const [streamedText, setStreamedText] = useState("")
  const [apiError, setApiError] = useState<string | null>(null)
  const [apiDone, setApiDone] = useState(false)
  const [savedDraft, setSavedDraft] = useState<string | null>(null)
  const feedbackRef = useRef<HTMLDivElement>(null)

  const paper = sampleCET4Writing
  const writingSection = paper.sections.find((s) => s.type === "writing")
  const question = writingSection?.questions[0] as WritingQuestion | undefined

  // 检测是否有草稿（不自动恢复）
  useEffect(() => {
    const draft = loadDraft(examType, paper.id)
    if (draft && draft.length > 20) {
      setSavedDraft(draft)
    } else {
      setSavedDraft(null)
    }
  }, [examType, paper.id])

  // 自动存档
  useEffect(() => {
    if (phase === "writing" && essay.length > 0) {
      const timer = setTimeout(() => saveDraft(examType, paper.id, essay), 2000)
      return () => clearTimeout(timer)
    }
  }, [essay, phase, examType, paper.id])

  // 流式输出时：只在底部时自动滚
  useEffect(() => {
    const el = feedbackRef.current
    if (!el || !isStreaming) return
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 100
    if (atBottom) el.scrollTop = el.scrollHeight
  }, [streamedText, isStreaming])

  const wordCount = essay.trim().split(/\s+/).filter((w) => w.length > 0).length

  const handleGrade = useCallback(async () => {
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
    try { localStorage.removeItem(`write-draft-${examType}-${paper.id}`) } catch {}

    await streamAI(
      "/api/grade-writing",
      { config: apiConfig, essay, prompt: question.prompt, word_limit: question.word_limit },
      (chunk) => setStreamedText((prev) => prev + chunk),
      () => { setIsStreaming(false); setApiDone(true) },
      (err) => { setApiError(err); setIsStreaming(false); setApiDone(true) }
    )
  }, [question, essay])

  const handleReset = useCallback(() => {
    setEssay("")
    setStreamedText("")
    setApiError(null)
    setApiDone(false)
    setIsStreaming(false)
    setPhase("writing")
  }, [])

  // --- 选题 ---
  if (phase === "select") {
    return (
      <div className="p-8 max-w-3xl mx-auto space-y-6">
        <div className="space-y-2">
          <h1 className="text-2xl font-bold">✍️ 写作练习</h1>
          <p className="text-muted-foreground">
            你写 → 提交 → AI 实时批改 → 逐句拆解范文
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
                    setEssay(savedDraft)
                    setPhase("writing")
                  }}
                >
                  继续写
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setSavedDraft(null)
                    try { localStorage.removeItem(`write-draft-${examType}-${paper.id}`) } catch {}
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
          onClick={() => setPhase("writing")}
        >
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>{paper.title} — 写作</CardTitle>
              <Badge variant="outline">30 分钟</Badge>
            </div>
          </CardHeader>
        </Card>
      </div>
    )
  }

  // --- 做题界面 ---
  if (phase === "writing") {
    return (
      <div className="flex h-screen">
        {/* 左：题目 + 评分标准 */}
        <div className="w-1/2 border-r border-border overflow-y-auto p-6 space-y-4">
          <h2 className="text-sm font-semibold text-muted-foreground">
            📄 写作要求
          </h2>
          <p className="text-sm leading-relaxed">{question?.prompt}</p>
          <Separator />
          <h3 className="text-xs font-semibold text-muted-foreground">
            评分标准
          </h3>
          <div className="space-y-2">
            {question?.scoring_rubric.map((r) => (
              <div key={r.level} className="flex gap-2 text-xs">
                <Badge variant="outline" className="shrink-0">{r.level}档</Badge>
                <span className="text-muted-foreground">{r.description}</span>
              </div>
            ))}
          </div>
        </div>

        {/* 右：写作输入 */}
        <div className="w-1/2 flex flex-col">
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-muted-foreground">
                ✍️ 你的作文
              </h2>
              <span className="text-xs text-muted-foreground">
                {wordCount} / {question?.word_limit ?? 150} 词
              </span>
            </div>
            <Textarea
              value={essay}
              onChange={(e) => setEssay(e.target.value)}
              placeholder="Write your essay here..."
              className="min-h-[350px] resize-none text-sm leading-relaxed"
            />
          </div>
          <div className="border-t border-border px-6 py-3 flex items-center justify-between shrink-0">
            <span className="text-xs text-muted-foreground">
              {isConfigValid(loadConfig()) ? (
                <span className="text-emerald-400">✅ AI 批改已配置</span>
              ) : (
                <span>未配置 API，<a href="/settings" className="text-primary underline">去设置</a></span>
              )}
            </span>
            <Button onClick={handleGrade} disabled={wordCount < 50}>
              提交批改
            </Button>
          </div>
        </div>
      </div>
    )
  }

  // --- 批改界面 ---
  return (
    <div className="flex flex-col h-screen">
      <div className="border-b border-border px-6 py-3 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <h1 className="text-lg font-bold">✍️ 写作批改</h1>
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
          重写
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto" ref={feedbackRef}>
        <div className="max-w-4xl mx-auto p-6 space-y-6">
          {/* 题目 + 作文 */}
          <div className="grid md:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs text-muted-foreground">📄 写作要求</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm leading-relaxed">{question?.prompt}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs text-muted-foreground">✍️ 你的作文 ({wordCount} 词)</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm leading-relaxed whitespace-pre-wrap">{essay}</p>
              </CardContent>
            </Card>
          </div>

          <Separator />

          {apiError && (
            <Card className="border-yellow-500/30 bg-yellow-500/5">
              <CardContent className="pt-3 pb-2 px-4">
                <p className="text-sm text-yellow-400">⚠️ {apiError}</p>
                <a href="/settings" className="text-xs text-primary underline mt-1 inline-block">去配置 API →</a>
              </CardContent>
            </Card>
          )}

          {(streamedText || isStreaming) && (
            <Card>
              <CardContent className="pt-5 px-6 pb-6">
                {streamedText ? (
                  <div className="prose prose-invert prose-sm max-w-none">
                    <MarkdownContent text={streamedText} />
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground animate-pulse">AI 正在分析你的作文...</p>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
