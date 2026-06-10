"use client"

import { useState, useCallback } from "react"
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
import { AudioPlayer } from "@/components/audio-player"
import { getListeningPapers, type ListeningPaper } from "@/lib/listening-data"
import { getExamPapers } from "@/lib/exam-data"
import type { ChoiceQuestion, ExamType } from "@/types/exam"

export default function ListenPage() {
  const pathname = usePathname()
  const examType = (pathname.split("/")[1] || "cet4") as "cet4" | "cet6"

  const [selected, setSelected] = useState<ListeningPaper | null>(null)
  const [submitted, setSubmitted] = useState(false)
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, string>>({})

  const papers = getListeningPapers(examType)

  // 获取有听力题目的 paper IDs
  const examPapersAll = getExamPapers(examType)
  const papersWithQuestions = new Set(
    examPapersAll
      .filter((p) => p.sections.some((s) => s.type === "listening" && s.questions.length > 0))
      .map((p) => p.id)
  )

  // 按年份分组
  const grouped = papers.reduce<Record<number, ListeningPaper[]>>((acc, p) => {
    if (!acc[p.year]) acc[p.year] = []
    acc[p.year].push(p)
    return acc
  }, {})
  const years = Object.keys(grouped).map(Number).sort((a, b) => b - a)

  // 查找对应的听力题目
  const examPapers = getExamPapers(examType)
  const matchingPaper = selected
    ? examPapers.find((p) => {
        const pid = p.id
        const sid = selected.id
        // 匹配逻辑：cet4-2023-12-1 匹配 cet4-2023-12-1
        return pid === sid || pid.startsWith(sid.replace(/-\d+$/, ""))
      })
    : null
  const listeningSection = matchingPaper?.sections.find((s) => s.type === "listening")
  const questions = (listeningSection?.questions ?? []) as ChoiceQuestion[]

  const handleSelect = useCallback((qId: string, letter: string) => {
    if (submitted) return
    setSelectedAnswers((prev) => ({ ...prev, [qId]: letter }))
  }, [submitted])

  const handleSubmit = useCallback(() => {
    setSubmitted(true)
  }, [])

  const handleReset = useCallback(() => {
    setSelectedAnswers({})
    setSubmitted(false)
  }, [])

  const correctCount = questions.filter((q) => selectedAnswers[q.id] === q.answer).length

  // --- 播放界面 ---
  if (selected) {
    return (
      <div className="p-8 max-w-3xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h1 className="text-2xl font-bold">🎧 听力练习</h1>
            <p className="text-sm text-muted-foreground">{selected.title}</p>
          </div>
          <Button variant="outline" size="sm" onClick={() => { setSelected(null); setSubmitted(false); setSelectedAnswers({}); }}>
            返回列表
          </Button>
        </div>

        {/* 音频播放器 */}
        <Card>
          <CardContent className="pt-6">
            <AudioPlayer src={selected.audio_url} title={selected.title} />
          </CardContent>
        </Card>

        {/* 听力题 */}
        {questions.length > 0 ? (
          <>
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-muted-foreground">
                听力选择题（{questions.length} 题）
              </h2>
              {submitted && (
                <Badge variant="outline">
                  {correctCount}/{questions.length} 正确
                </Badge>
              )}
            </div>

            <div className="space-y-4">
              {questions.map((q, idx) => (
                <div key={q.id} className="space-y-2">
                  <p className="text-sm font-medium">
                    {idx + 1}. {q.content}
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    {q.options.map((opt) => {
                      const letter = opt.charAt(0)
                      const isSelected = selectedAnswers[q.id] === letter
                      const isCorrect = letter === q.answer
                      return (
                        <button
                          key={opt}
                          onClick={() => handleSelect(q.id, letter)}
                          disabled={submitted}
                          className={cn(
                            "text-left p-2 rounded border text-xs transition-all",
                            "hover:border-primary/50",
                            isSelected && !submitted && "border-primary bg-primary/10",
                            submitted && isCorrect && "border-emerald-500 bg-emerald-500/10",
                            submitted && isSelected && !isCorrect && "border-destructive bg-destructive/10",
                            !isSelected && !submitted && "border-border"
                          )}
                        >
                          {opt}
                        </button>
                      )
                    })}
                  </div>
                  {submitted && (
                    <p className="text-xs text-muted-foreground">
                      {selectedAnswers[q.id] === q.answer ? "✅" : `❌ 正确答案：${q.answer}`}
                    </p>
                  )}
                </div>
              ))}
            </div>

            <div className="flex gap-3">
              {!submitted ? (
                <Button
                  onClick={handleSubmit}
                  disabled={Object.keys(selectedAnswers).length < questions.length}
                  className="w-full"
                >
                  {Object.keys(selectedAnswers).length < questions.length
                    ? `还有 ${questions.length - Object.keys(selectedAnswers).length} 题未答`
                    : "提交答案"}
                </Button>
              ) : (
                <Button variant="outline" onClick={handleReset} className="w-full">
                  重做
                </Button>
              )}
            </div>
          </>
        ) : (
          <Card className="bg-muted/30">
            <CardContent className="pt-4 text-sm text-muted-foreground">
              <p>暂无该套题的听力题目。只有音频可以播放。</p>
              <p className="text-xs mt-2">听力题目需要从 PDF 中提取，部分试卷尚未处理。</p>
            </CardContent>
          </Card>
        )}

        <Separator />

        {/* 练习技巧 */}
        <Card className="bg-muted/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">💡 听力练习技巧</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-2">
            <p><strong>第一遍</strong>：正常速度听，做题。不要暂停，模拟真实考试。</p>
            <p><strong>第二遍</strong>：0.75x 速度精听，对照答案，标出没听懂的地方。</p>
            <p><strong>第三遍</strong>：1x 速度跟读，模仿语音语调，注意连读和弱读。</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  // --- 列表界面 ---
  return (
    <div className="p-8 max-w-3xl mx-auto space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-bold">🎧 听力练习</h1>
        <p className="text-muted-foreground">
          选择一套真题听力开始练习。支持调速、快进快退。
        </p>
      </div>

      {years.map((year) => (
        <div key={year}>
          <h2 className="text-sm font-semibold text-muted-foreground mb-2">{year} 年</h2>
          <div className="grid gap-2 md:grid-cols-2">
            {grouped[year].map((paper) => (
              <Card
                key={paper.id}
                className="cursor-pointer hover:border-primary/50 hover:bg-accent/50 transition-colors"
                onClick={() => setSelected(paper)}
              >
                <CardContent className="pt-4 pb-3 px-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-xl">🎧</span>
                    <div>
                      <p className="text-sm font-medium">{paper.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {paper.month}月{paper.session ? ` · 第${paper.session}套` : ""}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {papersWithQuestions.has(paper.id) && (
                      <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 text-xs">
                        有题
                      </Badge>
                    )}
                    <Badge variant="outline" className="text-xs">▶ 播放</Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      ))}

      {papers.length === 0 && (
        <Card className="bg-muted/50">
          <CardContent className="pt-6 pb-4 text-center">
            <span className="text-4xl">📭</span>
            <p className="text-muted-foreground mt-2">
              还没有{examType === "cet4" ? "四级" : "六级"}听力音频。
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              把 MP3 文件放到 <code>public/{examType}/audio/</code> 目录下
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
