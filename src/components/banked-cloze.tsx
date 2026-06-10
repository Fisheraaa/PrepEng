"use client"

import { useState, useCallback } from "react"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

interface BankedClozeProps {
  passage: string
  bank: string[]  // ["A)accepted", "B)audiences", ...]
  blanks: { num: number; answer: string }[]  // [{num: 26, answer: "accepted"}, ...]
  onSubmit?: (answers: Record<number, string>) => void
}

export function BankedCloze({ passage, bank, blanks, onSubmit }: BankedClozeProps) {
  const [selectedWord, setSelectedWord] = useState<string | null>(null)
  const [filledBlanks, setFilledBlanks] = useState<Record<number, string>>({})
  const [submitted, setSubmitted] = useState(false)

  const handleBlankClick = useCallback((num: number) => {
    if (submitted) return
    if (selectedWord) {
      // 填入单词
      setFilledBlanks((prev) => ({ ...prev, [num]: selectedWord }))
      setSelectedWord(null)
    } else if (filledBlanks[num]) {
      // 清除已填的词
      setFilledBlanks((prev) => {
        const next = { ...prev }
        delete next[num]
        return next
      })
    }
  }, [selectedWord, filledBlanks, submitted])

  const handleWordClick = useCallback((word: string) => {
    if (submitted) return
    setSelectedWord((prev) => (prev === word ? null : word))
  }, [submitted])

  const handleSubmit = useCallback(() => {
    setSubmitted(true)
    onSubmit?.(filledBlanks)
  }, [filledBlanks, onSubmit])

  // 已使用的词
  const usedWords = new Set(Object.values(filledBlanks))

  // 渲染文章，将数字空白替换为可点击的填空
  const renderPassage = () => {
    const parts: React.ReactNode[] = []
    let remaining = passage
    let key = 0

    // 按空白号分割
    const blankNums = blanks.map((b) => b.num).sort((a, b) => a - b)

    for (const num of blankNums) {
      const idx = remaining.indexOf(String(num))
      if (idx === -1) continue

      // 空白前的文字
      if (idx > 0) {
        parts.push(<span key={key++}>{remaining.slice(0, idx)}</span>)
      }

      // 空白
      const filled = filledBlanks[num]
      const blank = blanks.find((b) => b.num === num)
      const isCorrect = submitted && filled === blank?.answer
      const isWrong = submitted && filled && filled !== blank?.answer

      parts.push(
        <button
          key={key++}
          onClick={() => handleBlankClick(num)}
          className={cn(
            "inline-block mx-1 px-2 py-0.5 rounded border-b-2 transition-all min-w-[80px] text-center",
            "hover:border-primary/50 hover:bg-accent/50",
            !filled && !submitted && "border-muted-foreground/30 bg-muted/30",
            filled && !submitted && "border-primary bg-primary/10",
            isCorrect && "border-emerald-500 bg-emerald-500/10",
            isWrong && "border-destructive bg-destructive/10"
          )}
        >
          {filled ? filled.replace(/^[A-Z]\)/, "") : `[${num}]`}
        </button>
      )

      remaining = remaining.slice(idx + String(num).length)
    }

    // 剩余文字
    if (remaining) {
      parts.push(<span key={key++}>{remaining}</span>)
    }

    return parts
  }

  return (
    <div className="space-y-6">
      {/* 文章 */}
      <div className="text-sm leading-relaxed">
        {renderPassage()}
      </div>

      {/* 词库 */}
      <div className="space-y-2">
        <h3 className="text-xs font-semibold text-muted-foreground">词库（点击选择，再点击空格填入）</h3>
        <div className="flex flex-wrap gap-2">
          {bank.map((word) => {
            const isUsed = usedWords.has(word)
            const isSelected = selectedWord === word
            return (
              <button
                key={word}
                onClick={() => handleWordClick(word)}
                disabled={isUsed || submitted}
                className={cn(
                  "px-3 py-1.5 rounded border text-xs font-medium transition-all",
                  "hover:border-primary/50",
                  isUsed && "opacity-30 cursor-not-allowed",
                  isSelected && "border-primary bg-primary text-primary-foreground",
                  !isSelected && !isUsed && "border-border bg-background"
                )}
              >
                {word}
              </button>
            )
          })}
        </div>
      </div>

      {/* 提交 */}
      {!submitted && (
        <button
          onClick={handleSubmit}
          disabled={Object.keys(filledBlanks).length < blanks.length}
          className="w-full py-2 px-4 bg-primary text-primary-foreground rounded font-medium text-sm disabled:opacity-50"
        >
          {Object.keys(filledBlanks).length < blanks.length
            ? `还有 ${blanks.length - Object.keys(filledBlanks).length} 空未填`
            : "提交答案"}
        </button>
      )}

      {/* 结果 */}
      {submitted && (
        <div className="text-sm text-muted-foreground">
          正确 {blanks.filter((b) => filledBlanks[b.num] === b.answer).length} / {blanks.length}
        </div>
      )}
    </div>
  )
}
