"use client"

import { useState, useCallback } from "react"
import { usePathname } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"
import { AudioPlayer } from "@/components/audio-player"
import { getListeningPapers, type ListeningPaper } from "@/lib/listening-data"
import { getExamPapers } from "@/lib/exam-data"
import type { ChoiceQuestion, ExamType } from "@/types/exam"

export default function ListenPage() {
  const pathname = usePathname()
  const examType = (pathname.split("/")[1] || "cet4") as "cet4" | "cet6" | "ielts"

  const [selected, setSelected] = useState<ListeningPaper | null>(null)
  const [submittedSections, setSubmittedSections] = useState<Set<number>>(new Set())
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, string>>({})

  const papers = getListeningPapers(examType)
  const grouped = papers.reduce<Record<number, ListeningPaper[]>>((acc, p) => {
    if (!acc[p.year]) acc[p.year] = []
    acc[p.year].push(p)
    return acc
  }, {})
  const years = Object.keys(grouped).map(Number).sort((a, b) => b - a)

  // 从题库找听力题（按 section 分组）
  const examPapers = getExamPapers(examType)
  const listenSections: { title: string; questions: ChoiceQuestion[] }[] = []
  if (selected) {
    for (const p of examPapers) {
      if (p.id === selected.id) {
        for (const s of p.sections) {
          if (s.type === "listening") {
            listenSections.push({ title: s.title || "听力", questions: s.questions as ChoiceQuestion[] })
          }
        }
        break
      }
    }
  }

  const handleSelect = useCallback((qId: string, letter: string) => {
    setSelectedAnswers((prev) => ({ ...prev, [qId]: letter }))
  }, [])

  const handleSubmitSection = useCallback((sIdx: number) => {
    setSubmittedSections((prev) => new Set([...prev, sIdx]))
  }, [])

  const handleReset = useCallback(() => {
    setSelectedAnswers({})
    setSubmittedSections(new Set())
  }, [])

  const allQuestions = listenSections.flatMap((s) => s.questions)
  const totalCorrect = allQuestions.filter((q) => selectedAnswers[q.id] === q.answer).length
  const allSubmitted = submittedSections.size === listenSections.length

  // --- 播放界面 ---
  if (selected) {
    return (
      <div className="p-8 max-w-3xl mx-auto space-y-6">
        {/* 悬浮播放器 */}
        <div className="sticky top-0 z-40 bg-background/95 backdrop-blur border-b shadow-sm -mx-8 px-8 py-3">
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <AudioPlayer src={selected.audio_url} title={selected.title} />
            </div>
            <Button variant="ghost" size="sm" onClick={() => { setSelected(null); setSubmittedSections(new Set()); setSelectedAnswers({}); }} className="ml-4 shrink-0">
              ← 返回
            </Button>
          </div>
        </div>

        {/* 内容区域 */}
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold">🎧 听力练习</h1>
            <p className="text-sm text-muted-foreground">{selected.title}</p>
          </div>

          {listenSections.length > 0 ? (
            <div className="space-y-6">
              {listenSections.map((section, sIdx) => {
                const isSubmitted = submittedSections.has(sIdx)
                const sectionCorrect = section.questions.filter((q) => selectedAnswers[q.id] === q.answer).length
                const sectionAnswered = section.questions.filter((q) => selectedAnswers[q.id]).length

                return (
                  <div key={sIdx} className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h2 className="text-sm font-semibold">{section.title}</h2>
                      {isSubmitted && <Badge variant="outline">{sectionCorrect}/{section.questions.length}</Badge>}
                    </div>

                    <div className="space-y-4">
                      {section.questions.map((q, qIdx) => (
                        <div key={q.id} className="space-y-2">
                          <p className="text-sm font-medium">{qIdx + 1}. {q.content || "（听音频作答）"}</p>
                          <div className="space-y-1.5">
                            {q.options.map((opt) => {
                              const letter = opt.charAt(0)
                              const isSelected = selectedAnswers[q.id] === letter
                              const isCorrect = letter === q.answer
                              return (
                                <button
                                  key={opt}
                                  onClick={() => handleSelect(q.id, letter)}
                                  disabled={isSubmitted}
                                  className={cn(
                                    "w-full text-left p-2.5 rounded border text-sm transition-all",
                                    "hover:border-primary/50 hover:bg-accent/50",
                                    isSelected && !isSubmitted && "border-primary bg-primary/10",
                                    isSubmitted && isCorrect && "border-emerald-500 bg-emerald-500/10",
                                    isSubmitted && isSelected && !isCorrect && "border-destructive bg-destructive/10",
                                    !isSelected && !isSubmitted && "border-border"
                                  )}
                                >
                                  {opt}
                                </button>
                              )
                            })}
                          </div>
                          {isSubmitted && (
                            <div className="text-xs space-y-1">
                              <p className="text-muted-foreground">
                                {selectedAnswers[q.id] === q.answer ? "✅ 正确" : `❌ 正确答案：${q.answer}`}
                              </p>
                              {q.explanation && q.explanation !== "暂无解析" && (
                                <p className="text-muted-foreground/80">{q.explanation}</p>
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>

                    {/* 每个 section 单独提交 */}
                    {!isSubmitted ? (
                      <Button
                        onClick={() => handleSubmitSection(sIdx)}
                        disabled={sectionAnswered < section.questions.length}
                        className="w-full"
                        size="sm"
                      >
                        {sectionAnswered < section.questions.length
                          ? `还有 ${section.questions.length - sectionAnswered} 题未答`
                          : `提交 ${section.title}`}
                      </Button>
                    ) : (
                      <div className="text-center text-xs text-muted-foreground py-1">
                        ✅ {sectionCorrect}/{section.questions.length} 正确
                      </div>
                    )}

                    {sIdx < listenSections.length - 1 && <Separator />}
                  </div>
                )
              })}

              {/* 总分（所有 section 提交后） */}
              {allSubmitted && (
                <div className="text-center space-y-3 pt-4 border-t">
                  <div className="text-2xl font-bold">
                    {totalCorrect}/{allQuestions.length} 正确
                  </div>
                  <Button variant="outline" onClick={handleReset} className="w-full">全部重做</Button>
                </div>
              )}
            </div>
          ) : (
            <Card className="bg-muted/30">
              <CardContent className="pt-4 text-sm text-muted-foreground">
                <p>该套题暂无听力题目，只有音频。</p>
                <p className="text-xs mt-2">标了「有题」的试卷才有题目可做。</p>
              </CardContent>
            </Card>
          )}

          <Separator />

          <Card className="bg-muted/30">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">◇ 听力练习技巧</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground space-y-2">
              <p><strong>第一遍</strong>：正常速度听，做题。不要暂停。</p>
              <p><strong>第二遍</strong>：0.75x 速度精听，对照答案。</p>
              <p><strong>第三遍</strong>：1x 速度跟读。</p>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  // --- 列表界面 ---
  return (
    <div className="p-8 max-w-3xl mx-auto space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-bold">🎧 听力练习</h1>
        <p className="text-muted-foreground">选择一套真题听力开始练习。支持调速、快进快退。</p>
      </div>

      {(() => {
        // 只有完整达到标准的卷子才标"有题"
        // 标准：听力+阅读都有题目、答案、解析
        const papersWithQ = new Set(
          examPapers.filter((p) => {
            const listeningSections = p.sections.filter(s => s.type === "listening")
            const readingSections = p.sections.filter(s => s.type === "reading")
            const listeningQ = listeningSections.flatMap(s => s.questions)
            const readingQ = readingSections.flatMap(s => s.questions)

            // 根据考试类型检查结构
            const hasWriting = p.sections.some(s => s.type === "writing")
            const hasTranslation = p.sections.some(s => s.type === "translation")

            if (examType === "ielts") {
              // IELTS: 听力4个section/40题，阅读3个passage/40题
              if (listeningSections.length !== 4 || listeningQ.length !== 40) return false
              if (readingSections.length !== 3 || readingQ.length !== 40) return false
              if (!hasWriting) return false
            } else {
              // CET4/6: 听力3个section/25题，阅读4个section/30题
              if (listeningSections.length !== 3 || listeningQ.length !== 25) return false
              if (readingSections.length !== 4 || readingQ.length !== 30) return false
              if (!hasWriting || !hasTranslation) return false
            }

            // 检查所有题目都有答案和解析
            const allQ = [...listeningQ, ...readingQ]
            return allQ.every(q => {
              if ('answer' in q) {
                return q.answer && q.explanation && q.explanation !== "暂无解析"
              }
              return true
            })
          }).map((p) => p.id)
        )
        return years.map((year) => (
          <div key={year}>
            <h2 className="text-sm font-semibold text-muted-foreground mb-2">{year} 年</h2>
            <div className="grid gap-2 md:grid-cols-2">
              {grouped[year].map((paper) => (
                <Card key={paper.id} className="cursor-pointer hover:border-primary/50 hover:bg-accent/50 transition-colors" onClick={() => setSelected(paper)}>
                  <CardContent className="pt-4 pb-3 px-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-xl">🎧</span>
                      <div>
                        <p className="text-sm font-medium">{paper.title}</p>
                        <p className="text-xs text-muted-foreground">{paper.month}月{paper.session ? ` · 第${paper.session}套` : ""}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {papersWithQ.has(paper.id) && <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 text-xs">有题</Badge>}
                      <Badge variant="outline" className="text-xs">▶ 播放</Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        ))
      })()}

      {papers.length === 0 && (
        <Card className="bg-muted/50">
          <CardContent className="pt-6 pb-4 text-center">
            <span className="text-4xl">📭</span>
            <p className="text-muted-foreground mt-2">还没有{examType === "ielts" ? "雅思" : examType === "cet4" ? "四级" : "六级"}听力音频。</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
