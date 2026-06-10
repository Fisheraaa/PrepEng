"use client"

import { useState, useCallback, useEffect } from "react"
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

  const { size: fontSize, increase, decrease } = useFontSize()

  const availablePapers = getAvailablePapers(examType)
  const paper = selectedPaperId ? getExamPaper(examType, selectedPaperId) : null
  // 只显示阅读类型的 section
  const sections = paper?.sections.filter((s) => s.type === "reading") ?? []
  const currentSection = sections[currentSectionIdx]
  const questions = (currentSection?.questions ?? []) as ChoiceQuestion[]

  // Section 类型显示名
  const sectionLabel = (s: Section) => {
    if (s.subtype === "banked_cloze") return "选词填空"
    if (s.subtype === "matching") return "信息匹配"
    if (s.subtype === "careful_reading") return "仔细阅读"
    return s.title || "阅读"
  }

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
    // 错题自动存入 IndexedDB
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

  const handleRestart = useCallback(() => {
    if (!paper) return
    setCurrentSectionIdx(0)
    setSelectedAnswers({})
    setSubmitted(false)
    setPhase("reading")
    clearReadProgress(examType, paper.id)
  }, [examType, paper])

  const handleGoToSection = useCallback((idx: number) => {
    setCurrentSectionIdx(idx)
    setSelectedAnswers({})
    setSubmitted(false)
    setPhase("reading")
  }, [])

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
                className="cursor-pointer hover:border-primary/50 hover:bg-accent/50 transition-colors"
                onClick={() => handleSelectPaper(p.id)}
              >
                <CardContent className="pt-4 pb-3 px-4 flex items-center justify-between">
                  <div>
                    <p className="font-medium">{p.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {p.questionCount} 题 · 仔细阅读
                    </p>
                  </div>
                  <Badge variant="outline">开始</Badge>
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
                        isCorrect ? "border-emerald-500/20 bg-emerald-500/5" : "border-destructive/20 bg-destructive/5"
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
  return (
    <div className="flex h-screen">
      {/* 左侧：文章 + 字号控制 */}
      <div className="w-1/2 border-r border-border overflow-y-auto p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={handleBackToList} className="h-7 px-2">
              ← 返回
            </Button>
            <h2 className="text-lg font-semibold">{currentSection?.title}</h2>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={decrease} className="h-7 w-7 p-0">A</Button>
            <span className="text-xs text-muted-foreground w-8 text-center">{fontSize}</span>
            <Button variant="outline" size="sm" onClick={increase} className="h-7 w-7 p-0 text-base">A</Button>
          </div>
        </div>
        <Separator />
        <div className="leading-relaxed whitespace-pre-wrap" style={{ fontSize: `${fontSize}px` }}>
          {currentSection?.passage}
        </div>
      </div>

      {/* 右侧：选题面板 + 所有题目 */}
      <div className="w-1/2 flex flex-col">
        {/* 顶部：选题目录面板 */}
        <div className="border-b border-border px-4 py-3 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">篇目导航</span>
            <span className="text-xs text-muted-foreground">
              {answeredCount}/{questions.length} 已答
            </span>
          </div>
          <div className="flex gap-1.5 flex-wrap">
            {sections.map((s, idx) => {
              const sQuestions = s.questions as ChoiceQuestion[]
              const sAnswered = sQuestions.filter((q) => selectedAnswers[q.id]).length
              return (
                <button
                  key={idx}
                  onClick={() => handleGoToSection(idx)}
                  className={cn(
                    "px-3 py-1.5 rounded-md text-xs font-medium transition-colors",
                    idx === currentSectionIdx ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-accent"
                  )}
                >
                  {sectionLabel(s)}
                  <span className="ml-1 opacity-60">{sAnswered}/{sQuestions.length}</span>
                </button>
              )
            })}
          </div>
        </div>

        {/* 题目区域 */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {questions.map((q, qIdx) => (
            <QuestionBlock
              key={q.id}
              question={q}
              index={qIdx}
              selected={selectedAnswers[q.id] ?? null}
              submitted={submitted}
              onSelect={(letter) => handleSelectAnswer(q.id, letter)}
              fontSize={fontSize}
            />
          ))}

          {/* 提交按钮 */}
          <div className="sticky bottom-0 bg-background/80 backdrop-blur-sm pt-4 pb-2">
            {!submitted ? (
              <Button
                onClick={handleSubmit}
                disabled={answeredCount < questions.length}
                className="w-full"
              >
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
}: {
  question: ChoiceQuestion
  index: number
  selected: string | null
  submitted: boolean
  onSelect: (letter: string) => void
  fontSize: number
}) {
  const isCorrect = submitted && selected === question.answer

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
                submitted && isOptionCorrect && "border-emerald-500 bg-emerald-500/10",
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
        <div className="ml-10">
          <Card className={cn(isCorrect ? "border-emerald-500/30" : "border-destructive/30")}>
            <CardContent className="pt-3 pb-2 px-4">
              <div className="flex items-center gap-2 mb-1">
                {isCorrect ? (
                  <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 text-xs">✅ 正确</Badge>
                ) : (
                  <Badge variant="destructive" className="text-xs">
                    ❌ 错误 · 你的：{selected ?? "未答"} · 正确：{question.answer}
                  </Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">{question.explanation}</p>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
