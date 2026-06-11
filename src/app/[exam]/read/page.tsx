"use client"

import { useState, useCallback, useEffect, useRef } from "react"
import { usePathname } from "next/navigation"
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
import { cn } from "@/lib/utils"
import { getAvailablePapers, getExamPaper } from "@/lib/exam-data"
import { saveMistake } from "@/lib/storage"
import { SocraticChat } from "@/components/socratic-chat"
import { BankedCloze } from "@/components/banked-cloze"
import { MatchingSection } from "@/components/matching-section"
import {
  AnnotationLayer,
  saveAnnotations,
  loadAnnotations,
  hasAnnotations,
  loadAnnotationSaveData,
  getAnnotationsForPaper,
  renameAnnotationSave,
  deleteAnnotationDraft,
  generateDraftName
} from "@/components/annotation-layer"
import type { ChoiceQuestion, ExamPaper, Section, ExamType } from "@/types/exam"

// ============================================================
// 自动存档工具
// ============================================================

interface ReadProgress {
  paperId: string
  sectionIdx: number
  answers: Record<string, string>
  submitted: boolean
  savedAt: number
}

function saveReadProgress(examType: string, progress: ReadProgress) {
  try {
    localStorage.setItem(
      `read-progress-${examType}-${progress.paperId}`,
      JSON.stringify(progress)
    )
  } catch {}
}

function loadReadProgress(examType: string, paperId: string): ReadProgress | null {
  try {
    const raw = localStorage.getItem(`read-progress-${examType}-${paperId}`)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

function clearReadProgress(examType: string, paperId: string) {
  try {
    localStorage.removeItem(`read-progress-${examType}-${paperId}`)
  } catch {}
}

// ============================================================
// 字号 hook
// ============================================================

function useFontSize() {
  const [size, setSize] = useState(14)
  const increase = useCallback(() => setSize((s) => Math.min(s + 2, 24)), [])
  const decrease = useCallback(() => setSize((s) => Math.max(s - 2, 10)), [])
  return { size, increase, decrease }
}

// ============================================================
// 主页面
// ============================================================

type Phase = "select" | "reading" | "review"

export default function ReadPage() {
  const pathname = usePathname()
  const examType = (pathname.split("/")[1] || "cet4") as ExamType

  const [phase, setPhase] = useState<Phase>("select")
  const [selectedPaperId, setSelectedPaperId] = useState<string | null>(null)
  const [currentSectionIdx, setCurrentSectionIdx] = useState(0)
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, string>>({})
  const [submitted, setSubmitted] = useState(false)
  const [socraticQuestionId, setSocraticQuestionId] = useState<string | null>(null)
  const [annotationActive, setAnnotationActive] = useState(false)
  const [annotationTool, setAnnotationTool] = useState<"pen" | "highlight" | "underline" | "eraser">("pen")
  const [annotationColor, setAnnotationColor] = useState("#ef4444")
  const [showAnnotationPrompt, setShowAnnotationPrompt] = useState(false)
  const [showNewDraftDialog, setShowNewDraftDialog] = useState(false)
  const [newDraftName, setNewDraftName] = useState("")
  const contentRef = useRef<HTMLDivElement>(null)

  const { size: fontSize, increase, decrease } = useFontSize()

  const availablePapers = getAvailablePapers(examType)
  const paper = selectedPaperId ? getExamPaper(examType, selectedPaperId) : null
  const sections = paper?.sections.filter((s) => s.type === "reading") ?? []
  const currentSection = sections[currentSectionIdx]
  const questions = (currentSection?.questions ?? []) as ChoiceQuestion[]

  const sectionLabel = (s: Section) => {
    if (s.subtype === "banked_cloze") return "选词填空"
    if (s.subtype === "matching") return "信息匹配"
    if (s.subtype === "careful_reading") return "仔细阅读"
    return s.title || "阅读"
  }

  // 所有 hooks 必须在条件渲染之前定义
  const handleSelectPaper = useCallback((paperId: string) => {
    setSelectedPaperId(paperId)
    setCurrentSectionIdx(0)
    setSelectedAnswers({})
    setSubmitted(false)
    setPhase("reading")
  }, [])

  const handleBackToList = useCallback(() => {
    setSelectedPaperId(null)
    setPhase("select")
    setCurrentSectionIdx(0)
    setSelectedAnswers({})
    setSubmitted(false)
  }, [])

  const handleGoToSection = useCallback((idx: number) => {
    setCurrentSectionIdx(idx)
    setSelectedAnswers({})
    setSubmitted(false)
  }, [])

  const handleRestart = useCallback(() => {
    if (!paper) return
    setCurrentSectionIdx(0)
    setSelectedAnswers({})
    setSubmitted(false)
    setPhase("reading")
    clearReadProgress(examType, paper.id)
  }, [examType, paper])

  const handleSelectAnswer = useCallback(
    (questionId: string, letter: string) => {
      if (submitted) return
      setSelectedAnswers((prev) => ({ ...prev, [questionId]: letter }))
    },
    [submitted]
  )

  const handleSubmit = useCallback(() => {
    if (!paper) return
    setSubmitted(true)
    saveReadProgress(examType, {
      paperId: paper.id,
      sectionIdx: currentSectionIdx,
      answers: selectedAnswers,
      submitted: true,
      savedAt: Date.now(),
    })
    const now = Date.now()
    questions.forEach((q) => {
      const userAns = selectedAnswers[q.id]
      if (userAns && userAns !== q.answer) {
        saveMistake({
          question_id: q.id,
          paper_id: paper.id,
          exam_type: examType,
          section_type: "reading",
          question_content: q.content,
          options: q.options,
          explanation: q.explanation,
          user_answer: userAns,
          correct_answer: q.answer,
          wrong_count: 1,
          last_reviewed: now,
          next_review: now + 24 * 60 * 60 * 1000,
          mastery: "red",
        }).catch(() => {})
      }
    })
  }, [selectedAnswers, currentSectionIdx, examType, paper, questions])

  const handleNextSection = useCallback(() => {
    if (currentSectionIdx < sections.length - 1) {
      setCurrentSectionIdx((prev) => prev + 1)
      setSelectedAnswers({})
      setSubmitted(false)
    } else {
      setPhase("review")
    }
  }, [currentSectionIdx, sections.length])

  // 标注按钮点击处理
  const handleAnnotationClick = useCallback(() => {
    if (annotationActive) {
      setAnnotationActive(false)
      return
    }
    if (selectedPaperId) {
      const existing = getAnnotationsForPaper(examType, selectedPaperId)
      const sectionDrafts = existing.filter(a => a.sectionIdx === currentSectionIdx)
      if (sectionDrafts.length > 0) {
        setShowAnnotationPrompt(true)
      } else {
        setNewDraftName(generateDraftName(examType, selectedPaperId, currentSectionIdx))
        setShowNewDraftDialog(true)
      }
    }
  }, [annotationActive, selectedPaperId, examType, currentSectionIdx])

  // 新建草稿确认
  const handleCreateDraft = useCallback(() => {
    if (!selectedPaperId || !newDraftName.trim()) return
    saveAnnotations(examType, selectedPaperId, currentSectionIdx, [], newDraftName.trim())
    setAnnotationActive(true)
    setShowNewDraftDialog(false)
  }, [selectedPaperId, examType, currentSectionIdx, newDraftName])

  // 自动恢复进度
  useEffect(() => {
    if (!selectedPaperId) return
    const saved = loadReadProgress(examType, selectedPaperId)
    if (saved && !saved.submitted) {
      setCurrentSectionIdx(saved.sectionIdx)
      setSelectedAnswers(saved.answers)
      setPhase("reading")
    }
  }, [examType, selectedPaperId])

  // 自动存档
  useEffect(() => {
    if (phase === "reading" && !submitted && selectedPaperId) {
      saveReadProgress(examType, {
        paperId: selectedPaperId,
        sectionIdx: currentSectionIdx,
        answers: selectedAnswers,
        submitted: false,
        savedAt: Date.now(),
      })
    }
  }, [phase, selectedAnswers, currentSectionIdx, submitted, examType, selectedPaperId])

  // 统计
  const correctCount = questions.filter(
    (q) => selectedAnswers[q.id] === q.answer
  ).length
  const answeredCount = Object.keys(selectedAnswers).length
  const totalQuestions = sections.reduce((acc, s) => acc + s.questions.length, 0)

  // --- 选卷页面 ---
  if (phase === "select") {
    return (
      <div className="p-8 max-w-3xl mx-auto space-y-6">
        <div className="space-y-2">
          <h1 className="text-2xl font-bold">📖 阅读理解</h1>
          <p className="text-muted-foreground">
            选择一套真题开始练习。所有题目一次放完，整篇提交。
          </p>
        </div>

        {availablePapers.length === 0 ? (
          <Card className="bg-muted/50">
            <CardContent className="pt-6 pb-4 text-center">
              <span className="text-4xl">📭</span>
              <p className="text-muted-foreground mt-2">
                还没有{examType === "cet4" ? "四级" : "六级"}阅读题。
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {availablePapers.map((p) => (
              <Card
                key={p.id}
                className={p.isComplete ? "cursor-pointer hover:border-primary/50 hover:bg-accent/50 transition-colors" : "opacity-50"}
                onClick={() => p.isComplete && handleSelectPaper(p.id)}
              >
                <CardContent className="pt-4 pb-3 px-4 flex items-center justify-between">
                  <div>
                    <p className="font-medium">{p.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {p.questionCount} 题
                    </p>
                  </div>
                  {p.isComplete ? (
                    <Badge variant="outline">有题</Badge>
                  ) : (
                    <Badge variant="secondary">未完成</Badge>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    )
  }

  // --- 结果回顾 ---
  if (phase === "review") {
    return (
      <div className="p-8 max-w-4xl mx-auto space-y-6">
        <div className="space-y-2">
          <h1 className="text-2xl font-bold">📊 练习完成</h1>
          <p className="text-muted-foreground">{paper?.title} — 阅读理解</p>
        </div>

        {/* 总分 */}
        <Card>
          <CardContent className="pt-6">
            <div className="text-center space-y-2">
              <div className="text-5xl font-bold">
                {totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0}%
              </div>
              <p className="text-muted-foreground">
                {correctCount} / {totalQuestions} 题正确
              </p>
            </div>
          </CardContent>
        </Card>

        {/* 分篇目回顾 */}
        {sections.map((section, sIdx) => {
          const sectionQuestions = section.questions as ChoiceQuestion[]
          const sectionCorrect = sectionQuestions.filter(
            (q) => selectedAnswers[q.id] === q.answer
          ).length
          return (
            <Card key={sIdx}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">{section.title}</CardTitle>
                  <Badge variant="outline">
                    {sectionCorrect}/{sectionQuestions.length}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {sectionQuestions.map((q, qIdx) => {
                  const userAns = selectedAnswers[q.id]
                  const isCorrect = userAns === q.answer
                  return (
                    <div
                      key={q.id}
                      className={cn(
                        "p-3 rounded-lg border text-sm",
                        isCorrect ? "border-green-600/20 bg-green-600/5" : "border-destructive/20 bg-destructive/5"
                      )}
                    >
                      <div className="flex items-start gap-2">
                        <span className="shrink-0">{isCorrect ? "✅" : "❌"}</span>
                        <div className="space-y-1 flex-1">
                          <p className="font-medium">Q{qIdx + 1}. {q.content}</p>
                          {!isCorrect && (
                            <div className="text-xs space-y-0.5">
                              <p><span className="text-destructive">你的：</span>{userAns ?? "未作答"}</p>
                              <p><span className="text-emerald-400">正确：</span>{q.answer}</p>
                            </div>
                          )}
                          <p className="text-muted-foreground text-xs mt-1">{q.explanation}</p>
                          {!isCorrect && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="mt-2 text-xs"
                              onClick={() => setSocraticQuestionId(q.id)}
                            >
                              🤔 追问：为什么我选错了？
                            </Button>
                          )}
                          {socraticQuestionId === q.id && (
                            <div className="mt-3">
                              <SocraticChat
                                question={q.content}
                                options={q.options}
                                correctAnswer={q.answer}
                                userAnswer={userAns ?? ""}
                                passage={section.passage}
                                onClose={() => setSocraticQuestionId(null)}
                              />
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </CardContent>
            </Card>
          )
        })}

        <div className="flex gap-3">
          <Button onClick={handleRestart}>再做一遍</Button>
          <Button variant="outline" onClick={handleBackToList}>换一套</Button>
        </div>
      </div>
    )
  }

  // --- 做题页面 ---

  // 草稿选择弹窗
  if (showAnnotationPrompt && selectedPaperId) {
    const sectionDrafts = getAnnotationsForPaper(examType, selectedPaperId)
      .filter(a => a.sectionIdx === currentSectionIdx)

    return (
      <div className="flex items-center justify-center h-screen">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>选择草稿</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              当前 section 有 {sectionDrafts.length} 个草稿，选择加载或新建：
            </p>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {sectionDrafts.map(({ data }, idx) => (
                <div key={idx} className="flex items-center gap-2 p-3 rounded-lg border">
                  <button
                    onClick={() => {
                      setAnnotationActive(true)
                      setShowAnnotationPrompt(false)
                    }}
                    className="flex-1 text-left"
                  >
                    <p className="text-sm font-medium">{data.name || `草稿${idx + 1}`}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {(data.annotations || []).length} 处标注 · {new Date(data.updatedAt || Date.now()).toLocaleString()}
                    </p>
                  </button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      const newName = prompt("重命名草稿:", data.name || `草稿${idx + 1}`)
                      if (newName && newName.trim()) {
                        renameAnnotationSave(examType, selectedPaperId, currentSectionIdx, idx, newName.trim())
                        setShowAnnotationPrompt(false)
                        setTimeout(() => setShowAnnotationPrompt(true), 10)
                      }
                    }}
                    className="h-7 px-2 text-xs"
                  >
                    重命名
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      if (confirm("确定删除这个草稿吗？")) {
                        deleteAnnotationDraft(examType, selectedPaperId, currentSectionIdx, idx)
                        setShowAnnotationPrompt(false)
                        setTimeout(() => setShowAnnotationPrompt(true), 10)
                      }
                    }}
                    className="h-7 px-2 text-xs text-destructive"
                  >
                    删除
                  </Button>
                </div>
              ))}
            </div>
            <div className="flex gap-3 pt-2 border-t">
              <Button
                variant="outline"
                onClick={() => {
                  setShowAnnotationPrompt(false)
                  setNewDraftName(generateDraftName(examType, selectedPaperId, currentSectionIdx))
                  setShowNewDraftDialog(true)
                }}
                className="flex-1"
              >
                新建草稿
              </Button>
              <Button
                variant="ghost"
                onClick={() => setShowAnnotationPrompt(false)}
                className="flex-1"
              >
                取消
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // 新建草稿命名弹窗
  if (showNewDraftDialog) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Card className="max-w-sm">
          <CardHeader>
            <CardTitle>新建草稿</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm text-muted-foreground">草稿名称：</label>
              <input
                type="text"
                value={newDraftName}
                onChange={(e) => setNewDraftName(e.target.value)}
                className="w-full mt-1 px-3 py-2 border rounded-lg bg-background text-foreground"
                placeholder="输入草稿名称"
                autoFocus
                onKeyDown={(e) => e.key === "Enter" && handleCreateDraft()}
              />
            </div>
            <div className="flex gap-3">
              <Button onClick={handleCreateDraft} className="flex-1" disabled={!newDraftName.trim()}>
                创建
              </Button>
              <Button variant="outline" onClick={() => setShowNewDraftDialog(false)} className="flex-1">
                取消
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // 顶部导航栏（所有 section 共用）
  const topBar = (
    <div className="border-b border-border px-4 py-2 shrink-0">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={handleBackToList} className="h-7 px-2">← 返回</Button>
          <span className="text-sm font-medium">{currentSection?.title}</span>
        </div>
        <div className="flex items-center gap-3">
          {/* 标注模式切换 */}
          <Button
            variant={annotationActive ? "default" : "outline"}
            size="sm"
            onClick={handleAnnotationClick}
            className="h-7 px-2 text-xs"
          >
            {annotationActive ? "✏️ 标注中" : "📝 标注"}
          </Button>
          <div className="flex items-center gap-1">
            <Button variant="outline" size="sm" onClick={decrease} className="h-6 w-6 p-0 text-xs">A</Button>
            <span className="text-xs text-muted-foreground w-6 text-center">{fontSize}</span>
            <Button variant="outline" size="sm" onClick={increase} className="h-6 w-6 p-0">A</Button>
          </div>
          <div className="flex gap-1">
            {sections.map((s, idx) => (
              <button
                key={idx}
                onClick={() => handleGoToSection(idx)}
                className={cn(
                  "px-2 py-1 rounded text-xs transition-colors",
                  idx === currentSectionIdx ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent"
                )}
              >
                {sectionLabel(s)}
              </button>
            ))}
          </div>
        </div>
      </div>
      {/* 标注工具栏 - 点击标注后展开 */}
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
  )

  // Section A: 选词填空 — 全屏布局
  if (currentSection?.subtype === "banked_cloze") {
    // 将字母答案转换为单词答案
    const bank = currentSection.bank || []
    const letterToWord = (letter: string) => {
      const item = bank.find((w) => w.startsWith(letter + ")"))
      return item ? item.replace(/^[A-Z]\)/, "") : letter
    }
    return (
      <div className="flex flex-col h-screen">
        {topBar}
        <div className="flex-1 overflow-y-auto p-8 max-w-4xl mx-auto w-full">
          <BankedCloze
            passage={currentSection.passage || ""}
            bank={bank}
            blanks={questions.map((q, i) => ({ num: 26 + i, answer: letterToWord(q.answer || ""), explanation: q.explanation || "" }))}
          />
        </div>
      </div>
    )
  }

  // Section B: 信息匹配 — 左文章右题目
  if (currentSection?.subtype === "matching") {
    return (
      <div className="flex flex-col h-screen">
        {topBar}
        <div className="flex flex-1 overflow-hidden">
          <div ref={contentRef} className="w-1/2 border-r border-border overflow-y-auto p-6 relative">
            <div className="text-sm leading-relaxed whitespace-pre-wrap" style={{ fontSize: `${fontSize}px` }}>
              {currentSection.passage || "（文章加载中...）"}
            </div>
            {selectedPaperId && annotationActive && (
              <AnnotationLayer
                containerRef={contentRef}
                active={annotationActive}
                tool={annotationTool}
                color={annotationColor}
                lineWidth={2}
                initialAnnotations={loadAnnotations(examType, selectedPaperId, currentSectionIdx)}
                onAnnotationsChange={(anns) => saveAnnotations(examType, selectedPaperId, currentSectionIdx, anns)}
              />
            )}
          </div>
          <div className="w-1/2 overflow-y-auto p-6 space-y-6">
            <MatchingSection
              questions={questions}
              selectedAnswers={selectedAnswers}
              submitted={submitted}
              onSelect={handleSelectAnswer}
            />
            <div className="sticky bottom-0 bg-background/80 backdrop-blur-sm pt-4 pb-2">
              {!submitted ? (
                <Button onClick={handleSubmit} disabled={answeredCount < questions.length} className="w-full">
                  {answeredCount < questions.length
                    ? `还有 ${questions.length - answeredCount} 题未答`
                    : "提交全部答案"}
                </Button>
              ) : (
                <Button onClick={handleNextSection} className="w-full">
                  {currentSectionIdx < sections.length - 1 ? "下一篇 →" : "查看结果"}
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Section C: 仔细阅读 — 左文章右题目
  return (
    <div className="flex flex-col h-screen">
      {topBar}
      <div className="flex flex-1 overflow-hidden">
        <div ref={contentRef} className="w-1/2 border-r border-border overflow-y-auto p-6 relative">
          <div className="text-sm leading-relaxed whitespace-pre-wrap" style={{ fontSize: `${fontSize}px` }}>
            {currentSection?.passage}
          </div>
          {selectedPaperId && annotationActive && (
            <AnnotationLayer
              containerRef={contentRef}
              active={annotationActive}
              tool={annotationTool}
              color={annotationColor}
              lineWidth={2}
              initialAnnotations={loadAnnotations(examType, selectedPaperId, currentSectionIdx)}
              onAnnotationsChange={(anns) => saveAnnotations(examType, selectedPaperId, currentSectionIdx, anns)}
            />
          )}
        </div>
        <div className="w-1/2 overflow-y-auto p-6 space-y-6">
          {questions.map((q, qIdx) => (
            <QuestionBlock
              key={q.id}
              question={q}
              index={qIdx}
              selected={selectedAnswers[q.id] ?? null}
              submitted={submitted}
              onSelect={(letter) => handleSelectAnswer(q.id, letter)}
              fontSize={fontSize}
              passage={currentSection?.passage}
            />
          ))}
          <div className="sticky bottom-0 bg-background/80 backdrop-blur-sm pt-4 pb-2">
            {!submitted ? (
              <Button onClick={handleSubmit} disabled={answeredCount < questions.length} className="w-full">
                {answeredCount < questions.length
                  ? `还有 ${questions.length - answeredCount} 题未答`
                  : "提交全部答案"}
              </Button>
            ) : (
              <Button onClick={handleNextSection} className="w-full">
                {currentSectionIdx < sections.length - 1 ? "下一篇 →" : "查看结果"}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ============================================================
// 单题组件
// ============================================================

function QuestionBlock({
  question,
  index,
  selected,
  submitted,
  onSelect,
  fontSize,
  passage,
}: {
  question: ChoiceQuestion
  index: number
  selected: string | null
  submitted: boolean
  onSelect: (letter: string) => void
  fontSize: number
  passage?: string
}) {
  const isCorrect = submitted && selected === question.answer
  const [showChat, setShowChat] = useState(false)

  return (
    <div className="space-y-3">
      <div className="flex items-start gap-3">
        <Badge variant="secondary" className="mt-0.5 shrink-0">Q{index + 1}</Badge>
        <p className="font-medium" style={{ fontSize: `${fontSize}px` }}>{question.content}</p>
      </div>

      <div className="space-y-2 ml-10">
        {question.options.map((option) => {
          const letter = option.charAt(0)
          const isSelected = selected === letter
          const isOptionCorrect = letter === question.answer

          return (
            <button
              key={option}
              onClick={() => onSelect(letter)}
              disabled={submitted}
              className={cn(
                "w-full text-left p-3 rounded-lg border transition-all",
                "hover:border-primary/50 hover:bg-accent/50",
                "disabled:cursor-not-allowed",
                isSelected && !submitted && "border-primary bg-primary/10",
                submitted && isOptionCorrect && "border-green-600/50 bg-green-600/10",
                submitted && isSelected && !isOptionCorrect && "border-destructive bg-destructive/10",
                !isSelected && !submitted && "border-border"
              )}
              style={{ fontSize: `${fontSize - 1}px` }}
            >
              {option}
            </button>
          )
        })}
      </div>

      {submitted && (
        <div className="ml-10 space-y-2">
          <Card className={cn(isCorrect ? "border-green-600/30" : "border-destructive/30")}>
            <CardContent className="pt-3 pb-2 px-4">
              <div className="flex items-center gap-2 mb-1">
                {isCorrect ? (
                  <Badge className="bg-green-600/10 text-green-400 border-green-600/20 text-xs">✅ 正确</Badge>
                ) : (
                  <Badge variant="destructive" className="text-xs">
                    ❌ 错误 · 你的：{selected ?? "未答"} · 正确：{question.answer}
                  </Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">{question.explanation}</p>
            </CardContent>
          </Card>

          {/* 错题显示追问按钮 */}
          {!isCorrect && !showChat && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowChat(true)}
              className="text-xs"
            >
              🤔 追问：为什么我选错了？
            </Button>
          )}

          {/* 追问对话框 */}
          {showChat && (
            <SocraticChat
              question={question.content}
              options={question.options}
              correctAnswer={question.answer}
              userAnswer={selected ?? ""}
              passage={passage}
              onClose={() => setShowChat(false)}
            />
          )}
        </div>
      )}
    </div>
  )
}
