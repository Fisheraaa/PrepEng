"use client"

import { useState, useCallback } from "react"
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
        将每个陈述匹配到对应的段落（点击陈述，再点击段落字母）
      </p>

      {questions.map((q, idx) => {
        const selected = selectedAnswers[q.id]
        return (
          <div key={q.id} className="space-y-2">
            <p className="text-sm">
              <span className="font-medium">{idx + 36}.</span> {q.content}
            </p>
            <div className="flex flex-wrap gap-1.5">
              {paragraphs.slice(0, 10).map((letter) => {
                const isSelected = selected === letter
                return (
                  <button
                    key={letter}
                    onClick={() => onSelect(q.id, letter)}
                    disabled={submitted}
                    className={cn(
                      "w-8 h-8 rounded border text-xs font-medium transition-all",
                      "hover:border-primary/50",
                      isSelected && !submitted && "border-primary bg-primary text-primary-foreground",
                      submitted && isSelected && "border-emerald-500 bg-emerald-500/10",
                      !isSelected && !submitted && "border-border"
                    )}
                  >
                    {letter}
                  </button>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}
