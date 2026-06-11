"use client"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import type { ChoiceQuestion } from "@/types/exam"

interface MatchingSectionProps {
  questions: ChoiceQuestion[]
  selectedAnswers: Record<string, string>
  submitted: boolean
  onSelect: (questionId: string, letter: string) => void
}

export function MatchingSection({
  questions,
  selectedAnswers,
  submitted,
  onSelect,
}: MatchingSectionProps) {
  // 段落选项（A-O）
  const paragraphs = "ABCDEFGHIJKLMNO".split("")

  return (
    <div className="space-y-4">
      <p className="text-xs text-muted-foreground">
        将每个陈述匹配到对应的段落（点击段落字母选择）
      </p>

      {questions.map((q, idx) => {
        const selected = selectedAnswers[q.id]
        const isCorrect = submitted && selected === q.answer
        const isWrong = submitted && selected && selected !== q.answer

        return (
          <div key={q.id} className="space-y-2">
            <p className="text-sm">
              <span className="font-medium">{idx + 36}.</span> {q.content}
            </p>
            <div className="flex flex-wrap gap-1.5">
              {paragraphs.slice(0, 10).map((letter) => {
                const isSelected = selected === letter
                const isOptionCorrect = letter === q.answer
                return (
                  <button
                    key={letter}
                    onClick={() => onSelect(q.id, letter)}
                    disabled={submitted}
                    className={cn(
                      "w-8 h-8 rounded border text-xs font-medium transition-all",
                      "hover:border-primary/50",
                      isSelected && !submitted && "border-primary bg-primary text-primary-foreground",
                      submitted && isOptionCorrect && "border-green-600/50 bg-green-600/10 text-green-400",
                      submitted && isSelected && !isOptionCorrect && "border-red-500/30 bg-red-500/5 text-red-400",
                      !isSelected && !submitted && "border-border"
                    )}
                  >
                    {letter}
                  </button>
                )
              })}
            </div>
            {/* 提交后显示答案和解析 */}
            {submitted && (
              <div className={cn(
                "p-3 rounded-lg text-xs border",
                isCorrect ? "border-green-600/20 bg-green-600/5" : "border-red-500/20 bg-red-500/5"
              )}>
                <div className="flex items-center gap-2 mb-1">
                  {isCorrect ? (
                    <span className="text-green-400">✓ 正确</span>
                  ) : (
                    <span className="text-red-400">✗ 你的答案：{selected || "未选"} · 正确答案：{q.answer}</span>
                  )}
                </div>
                {q.explanation && (
                  <p className="text-muted-foreground leading-relaxed">{q.explanation}</p>
                )}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
