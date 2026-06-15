"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { usePathname } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Separator } from "@/components/ui/separator"
import { getExamPapers } from "@/lib/exam-data"
import { loadConfig, isConfigValid } from "@/lib/api-config"
import { cn } from "@/lib/utils"
import { AnnotationLayer, saveAnnotations, loadAnnotations } from "@/components/annotation-layer"
import type { WritingQuestion, ExamType } from "@/types/exam"
import { MarkdownContent } from "@/components/markdown-content"

// 自动存档
function saveDraft(examType: string, paperId: string, essay: string) {
  try {
    localStorage.setItem(`write-draft-${examType}-${paperId}`, JSON.stringify({ essay, savedAt: Date.now() }))
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

// 流式读取
async function streamAI(
  url: string,
  body: object,
  onChunk: (text: string) => void,
  onDone: () => void,
  onError: (err: string) => void
) {
  try {
    const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
    if (!res.ok) {
      const err = await res.text()
      try { onError(JSON.parse(err).error || `HTTP ${res.status}`) } catch { onError(`HTTP ${res.status}: ${err.slice(0, 200)}`) }
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
        try { const parsed = JSON.parse(data); if (parsed.content) onChunk(parsed.content) } catch {}
      }
    }
    onDone()
  } catch (err) {
    onError(err instanceof Error ? err.message : "网络错误")
  }
}

type Phase = "select" | "writing" | "feedback"

export default function WritePage() {
  const pathname = usePathname()
  const examType = (pathname.split("/")[1] || "cet4") as ExamType

  const [phase, setPhase] = useState<Phase>("select")
  const [selectedPaperId, setSelectedPaperId] = useState<string | null>(null)
  const [essay, setEssay] = useState("")
  const [isStreaming, setIsStreaming] = useState(false)
  const [streamedText, setStreamedText] = useState("")
  const [apiError, setApiError] = useState<string | null>(null)
  const [apiDone, setApiDone] = useState(false)
  const [savedDraft, setSavedDraft] = useState<string | null>(null)
  const [annotationActive, setAnnotationActive] = useState(false)
  const [annotationTool, setAnnotationTool] = useState<"pen" | "highlight" | "underline" | "eraser">("pen")
  const [annotationColor, setAnnotationColor] = useState("#ef4444")
  const contentRef = useRef<HTMLDivElement>(null)
  const feedbackRef = useRef<HTMLDivElement>(null)

  // 获取完整达到标准的试卷
  const allPapers = getExamPapers(examType)
  const writingPapers = allPapers.filter(p => {
    // 检查是否有写作题目
    const hasWriting = p.sections.some(s => s.type === "writing" && s.questions.length > 0)
    if (!hasWriting) return false

    // IELTS 只需要阅读达标 + 写作有范文
    if (examType === "ielts") {
      const readingSections = p.sections.filter(s => s.type === "reading")
      const readingQ = readingSections.flatMap(s => s.questions)
      const writingSection = p.sections.find(s => s.type === "writing")
      const hasSample = writingSection?.questions.some(q => 'sample_answer' in q && q.sample_answer)
      return readingSections.length === 3 && readingQ.length === 40 && hasSample
    }

    // CET 结构检查：听力3个section/25题，阅读4个section/30题
    const listeningSections = p.sections.filter(s => s.type === "listening")
    const readingSections = p.sections.filter(s => s.type === "reading")
    const listeningQ = listeningSections.flatMap(s => s.questions)
    const readingQ = readingSections.flatMap(s => s.questions)
    const hasTranslation = p.sections.some(s => s.type === "translation")

    if (listeningSections.length !== 3 || listeningQ.length !== 25) return false
    if (readingSections.length !== 4 || readingQ.length !== 30) return false
    if (!hasTranslation) return false

    // 检查所有题目都有答案和解析
    const allQ = [...listeningQ, ...readingQ]
    return allQ.every(q => {
      if ('answer' in q) {
        return q.answer && q.explanation && q.explanation !== "暂无解析"
      }
      return true
    })
  }).map(p => ({
    id: p.id,
    title: p.title,
    question: (p.sections.find(s => s.type === "writing")?.questions[0] as WritingQuestion)
  })).filter(p => p.question)

  // 当前选中的试卷
  const currentPaper = selectedPaperId ? writingPapers.find(p => p.id === selectedPaperId) : null
  const question = currentPaper?.question

  // 检测草稿
  useEffect(() => {
    if (!selectedPaperId) return
    const draft = loadDraft(examType, selectedPaperId)
    if (draft && draft.length > 20) setSavedDraft(draft)
    else setSavedDraft(null)
  }, [examType, selectedPaperId])

  // 自动存档
  useEffect(() => {
    if (phase === "writing" && essay.length > 0 && selectedPaperId) {
      const timer = setTimeout(() => saveDraft(examType, selectedPaperId, essay), 2000)
      return () => clearTimeout(timer)
    }
  }, [essay, phase, examType, selectedPaperId])

  // 自动滚动
  useEffect(() => {
    const el = feedbackRef.current
    if (!el || !isStreaming) return
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 100
    if (atBottom) el.scrollTop = el.scrollHeight
  }, [streamedText, isStreaming])

  const wordCount = essay.trim().split(/\s+/).filter(w => w.length > 0).length

  const handleSelectPaper = useCallback((paperId: string) => {
    setSelectedPaperId(paperId)
    setEssay("")
    setSavedDraft(null)
    setPhase("writing")
  }, [])

  const handleGrade = useCallback(async () => {
    if (!question || !selectedPaperId) return
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
    try { localStorage.removeItem(`write-draft-${examType}-${selectedPaperId}`) } catch {}

    await streamAI(
      "/api/grade-writing",
      { config: apiConfig, essay, prompt: question.prompt, word_limit: question.word_limit },
      (chunk) => setStreamedText(prev => prev + chunk),
      () => { setIsStreaming(false); setApiDone(true) },
      (err) => { setApiError(err); setIsStreaming(false); setApiDone(true) }
    )
  }, [question, essay, selectedPaperId])

  const handleReset = useCallback(() => {
    setEssay("")
    setStreamedText("")
    setApiError(null)
    setApiDone(false)
    setIsStreaming(false)
    setPhase("writing")
  }, [])

  const handleBackToList = useCallback(() => {
    setSelectedPaperId(null)
    setPhase("select")
    setEssay("")
    setSavedDraft(null)
  }, [])

  // --- 选题 ---
  if (phase === "select") {
    return (
      <div className="p-8 max-w-3xl mx-auto space-y-6">
        <div className="space-y-2">
          <h1 className="text-2xl font-bold">✍️ 写作练习</h1>
          <p className="text-muted-foreground">选择一套真题 → 你写 → 提交 → AI 实时批改</p>
        </div>

        {writingPapers.length === 0 ? (
          <Card className="bg-muted/50">
            <CardContent className="pt-6 pb-4 text-center">
              <span className="text-4xl">📭</span>
              <p className="text-muted-foreground mt-2">还没有{examType === "ielts" ? "雅思" : examType === "cet4" ? "四级" : "六级"}写作题。</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {writingPapers.map(p => (
              <Card key={p.id} className="cursor-pointer hover:border-primary/50 hover:bg-accent/50 transition-colors" onClick={() => handleSelectPaper(p.id)}>
                <CardContent className="pt-4 pb-3 px-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{p.title}</p>
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{p.question.prompt.slice(0, 100)}...</p>
                    </div>
                    <Badge variant="outline">30 分钟</Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    )
  }

  // --- 做题界面 ---
  if (phase === "writing") {
    return (
      <div className="flex flex-col h-screen">
        {/* 顶部工具栏 */}
        <div className="border-b border-border px-4 py-2 shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={handleBackToList} className="h-7 px-2">← 返回</Button>
              <span className="text-sm font-medium">写作练习</span>
            </div>
            <div className="flex items-center gap-3">
              <Button
                variant={annotationActive ? "default" : "outline"}
                size="sm"
                onClick={() => setAnnotationActive(!annotationActive)}
                className="h-7 px-2 text-xs"
              >
                {annotationActive ? "✏️ 标注中" : "📝 标注"}
              </Button>
            </div>
          </div>
          {/* 标注工具栏 */}
          {annotationActive && (
            <div className="flex items-center gap-3 mt-2 pt-2 border-t border-border">
              <span className="text-xs text-muted-foreground">工具：</span>
              <div className="flex gap-1">
                {[
                  { key: "pen", icon: "🖊", label: "画笔" },
                  { key: "highlight", icon: "🖍", label: "高亮" },
                  { key: "underline", icon: "📎", label: "下划线" },
                  { key: "eraser", icon: "🧹", label: "橡皮擦" },
                ].map((t) => (
                  <button
                    key={t.key}
                    onClick={() => setAnnotationTool(t.key as any)}
                    className={cn(
                      "px-2 py-1 rounded text-xs transition-all",
                      annotationTool === t.key
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground hover:bg-accent"
                    )}
                    title={t.label}
                  >
                    {t.icon}
                  </button>
                ))}
              </div>
              {annotationTool !== "eraser" && (
                <>
                  <span className="text-xs text-muted-foreground">颜色：</span>
                  <div className="flex gap-1.5">
                    {[
                      { name: "红", value: "#ef4444" },
                      { name: "蓝", value: "#3b82f6" },
                      { name: "绿", value: "#22c55e" },
                      { name: "黄", value: "#eab308" },
                    ].map((c) => (
                      <button
                        key={c.value}
                        onClick={() => setAnnotationColor(c.value)}
                        className={cn(
                          "w-5 h-5 rounded-full border-2 transition-all",
                          annotationColor === c.value ? "border-foreground scale-110" : "border-transparent"
                        )}
                        style={{ background: c.value }}
                        title={c.name}
                      />
                    ))}
                  </div>
                </>
              )}
              <Button size="sm" variant="ghost" className="text-xs ml-auto" onClick={() => setAnnotationActive(false)}>
                关闭标注
              </Button>
            </div>
          )}
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* 左：题目 + 评分标准 */}
          <div ref={contentRef} className="w-1/2 border-r border-border overflow-y-auto p-6 space-y-4 relative">
            <p className="text-sm leading-relaxed">{question?.prompt}</p>
            <Separator />
            <h3 className="text-xs font-semibold text-muted-foreground">评分标准</h3>
            <div className="space-y-2">
              {question?.scoring_rubric?.map(r => (
                <div key={r.level} className="flex gap-2 text-xs">
                  <Badge variant="outline" className="shrink-0">{r.level}档</Badge>
                  <span className="text-muted-foreground">{r.description}</span>
                </div>
              ))}
            </div>
            {selectedPaperId && annotationActive && (
              <AnnotationLayer
                containerRef={contentRef}
                active={annotationActive}
                tool={annotationTool}
                color={annotationColor}
                lineWidth={2}
                initialAnnotations={loadAnnotations(examType, selectedPaperId, 0)}
                onAnnotationsChange={(anns) => saveAnnotations(examType, selectedPaperId, 0, anns)}
              />
            )}
          </div>

          {/* 右：写作输入 */}
          <div className="w-1/2 flex flex-col">
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-muted-foreground">✍️ 你的作文</h2>
                <span className="text-xs text-muted-foreground">{wordCount} / {question?.word_limit ?? 150} 词</span>
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
              <Button onClick={handleGrade} disabled={wordCount < 50}>提交批改</Button>
            </div>
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
          {isStreaming && <Badge className="bg-primary/10 text-primary border-primary/20 animate-pulse">AI 批改中...</Badge>}
          {apiDone && !apiError && <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20">✅ 批改完成</Badge>}
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleReset}>重写</Button>
          <Button variant="ghost" size="sm" onClick={handleBackToList}>换题</Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto" ref={feedbackRef}>
        <div className="max-w-4xl mx-auto p-6 space-y-6">
          <div className="grid md:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground">📄 写作要求</CardTitle></CardHeader>
              <CardContent><p className="text-sm leading-relaxed">{question?.prompt}</p></CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground">✍️ 你的作文 ({wordCount} 词)</CardTitle></CardHeader>
              <CardContent><p className="text-sm leading-relaxed whitespace-pre-wrap">{essay}</p></CardContent>
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
                  <div className="prose prose-invert prose-sm max-w-none"><MarkdownContent text={streamedText} /></div>
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
