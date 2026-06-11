"use client"

import { useState, useEffect, useCallback } from "react"
import { usePathname } from "next/navigation"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"
import { getMistakes, saveMistake } from "@/lib/storage"
import { getExamPaper } from "@/lib/exam-data"
import type { MistakeEntry, ExamType } from "@/types/exam"

export default function ReviewPage() {
  const pathname = usePathname()
  const examType = (pathname.split("/")[1] || "cet4") as ExamType

  const [mistakes, setMistakes] = useState<MistakeEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<"all" | "red" | "yellow" | "green">("all")

  const loadMistakes = useCallback(async () => {
    setLoading(true)
    try {
      const data = await getMistakes(examType)
      // 按时间倒序
      data.sort((a, b) => b.last_reviewed - a.last_reviewed)
      setMistakes(data)
    } catch {
      setMistakes([])
    }
    setLoading(false)
  }, [examType])

  useEffect(() => {
    loadMistakes()
  }, [loadMistakes])

  const handleMarkReviewed = useCallback(
    async (mistake: MistakeEntry) => {
      const now = Date.now()
      const newWrongCount = mistake.wrong_count + 1
      // 间隔复习：错得越多，间隔越短
      const intervals = [1, 3, 7, 14, 30] // 天
      const intervalDays = intervals[Math.min(newWrongCount - 1, intervals.length - 1)]
      const newMastery: MistakeEntry["mastery"] =
        newWrongCount >= 4 ? "red" : newWrongCount >= 2 ? "yellow" : "green"

      await saveMistake({
        ...mistake,
        wrong_count: newWrongCount,
        last_reviewed: now,
        next_review: now + intervalDays * 24 * 60 * 60 * 1000,
        mastery: newMastery,
      })
      loadMistakes()
    },
    [loadMistakes]
  )

  const handleRemove = useCallback(
    async (questionId: string) => {
      // 从 IndexedDB 删除
      const db = await new Promise<IDBDatabase>((resolve, reject) => {
        const req = indexedDB.open("cet-prep", 1)
        req.onsuccess = () => resolve(req.result)
        req.onerror = () => reject(req.error)
      })
      const tx = db.transaction("mistakes", "readwrite")
      tx.objectStore("mistakes").delete(questionId)
      await new Promise((resolve) => (tx.oncomplete = resolve))
      loadMistakes()
    },
    [loadMistakes]
  )

  const filtered =
    filter === "all" ? mistakes : mistakes.filter((m) => m.mastery === filter)

  const stats = {
    total: mistakes.length,
    red: mistakes.filter((m) => m.mastery === "red").length,
    yellow: mistakes.filter((m) => m.mastery === "yellow").length,
    green: mistakes.filter((m) => m.mastery === "green").length,
  }

  const sectionLabels: Record<string, string> = {
    reading: "📚 阅读",
    writing: "✏️ 写作",
    translation: "▤ 翻译",
    listening: "🎙 听力",
  }

  return (
    <div className="p-8 max-w-3xl mx-auto space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-bold">📋 错题本</h1>
        <p className="text-muted-foreground">
          做错的题自动归档。间隔复习，永久记忆。
        </p>
      </div>

      {/* 统计 */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: "全部", value: stats.total, filter: "all" as const, color: "" },
          { label: "🔴 未掌握", value: stats.red, filter: "red" as const, color: "text-red-400" },
          { label: "🟡 模糊", value: stats.yellow, filter: "yellow" as const, color: "text-yellow-400" },
          { label: "🟢 已掌握", value: stats.green, filter: "green" as const, color: "text-emerald-400" },
        ].map((s) => (
          <button
            key={s.filter}
            onClick={() => setFilter(s.filter)}
            className={cn(
              "p-3 rounded-lg border text-center transition-colors",
              filter === s.filter
                ? "border-primary bg-primary/10"
                : "border-border hover:border-primary/50"
            )}
          >
            <div className={cn("text-2xl font-bold", s.color)}>{s.value}</div>
            <div className="text-xs text-muted-foreground">{s.label}</div>
          </button>
        ))}
      </div>

      {/* 错题列表 */}
      {loading ? (
        <p className="text-sm text-muted-foreground text-center py-8">加载中...</p>
      ) : filtered.length === 0 ? (
        <Card className="bg-muted/50">
          <CardContent className="pt-6 pb-4 text-center space-y-3">
            <span className="text-4xl">✦</span>
            <p className="text-muted-foreground">
              {mistakes.length === 0
                ? "还没有错题。去做几道练习题吧！"
                : "当前筛选条件下没有错题。"}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((m) => (
            <Card key={m.question_id} className={cn(
              m.mastery === "red" && "border-red-500/20",
              m.mastery === "yellow" && "border-yellow-500/20",
              m.mastery === "green" && "border-emerald-500/20",
            )}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">
                      {sectionLabels[m.section_type] ?? m.section_type}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {getExamPaper(examType, m.paper_id)?.title ?? m.paper_id}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      错了 {m.wrong_count} 次
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    {m.mastery === "red" && <span className="text-xs text-red-400">🔴</span>}
                    {m.mastery === "yellow" && <span className="text-xs text-yellow-400">🟡</span>}
                    {m.mastery === "green" && <span className="text-xs text-emerald-400">🟢</span>}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm font-medium">{m.question_content}</p>

                {m.options && (
                  <div className="space-y-1">
                    {m.options.map((opt) => {
                      const letter = opt.charAt(0)
                      return (
                        <div
                          key={opt}
                          className={cn(
                            "text-xs px-2 py-1 rounded",
                            letter === m.correct_answer && "bg-emerald-500/10 text-emerald-400",
                            letter === m.user_answer && letter !== m.correct_answer && "bg-red-500/10 text-red-400"
                          )}
                        >
                          {opt}
                          {letter === m.user_answer && letter !== m.correct_answer && " ← 你选的"}
                          {letter === m.correct_answer && " ✓"}
                        </div>
                      )
                    })}
                  </div>
                )}

                <Separator />

                <div className="text-xs text-muted-foreground space-y-1">
                  <p><span className="text-red-400">你的答案：</span>{m.user_answer}</p>
                  <p><span className="text-emerald-400">正确答案：</span>{m.correct_answer}</p>
                </div>

                <p className="text-sm text-muted-foreground leading-relaxed">
                  {m.explanation}
                </p>

                <div className="flex gap-2 pt-1">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleMarkReviewed(m)}
                  >
                    再错一次（调整复习间隔）
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleRemove(m.question_id)}
                  >
                    移除
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
