"use client"

import { useState, useEffect, useRef, useCallback } from "react"
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
import { cn } from "@/lib/utils"

// ============================================================
// 计时器 hook
// ============================================================

function useTimer(totalSeconds: number) {
  const [remaining, setRemaining] = useState(totalSeconds)
  const [running, setRunning] = useState(false)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const start = useCallback(() => {
    setRunning(true)
  }, [])

  const pause = useCallback(() => {
    setRunning(false)
  }, [])

  const reset = useCallback(() => {
    setRemaining(totalSeconds)
    setRunning(false)
  }, [totalSeconds])

  useEffect(() => {
    if (running) {
      intervalRef.current = setInterval(() => {
        setRemaining((prev) => {
          if (prev <= 1) {
            setRunning(false)
            return 0
          }
          return prev - 1
        })
      }, 1000)
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [running])

  const minutes = Math.floor(remaining / 60)
  const seconds = remaining % 60
  const progress = ((totalSeconds - remaining) / totalSeconds) * 100
  const isWarning = remaining < 300 // 最后5分钟
  const isCritical = remaining < 60 // 最后1分钟
  const isDone = remaining === 0

  return {
    remaining,
    minutes,
    seconds,
    progress,
    running,
    isWarning,
    isCritical,
    isDone,
    start,
    pause,
    reset,
  }
}

// ============================================================
// 主页面
// ============================================================

type Phase = "select" | "running" | "done"

const mockExams = [
  {
    id: "mock-2024-june-1",
    title: "2024年6月 第一套",
    sections: [
      { name: "写作", duration: 30, icon: "✍️" },
      { name: "听力", duration: 25, icon: "🎧" },
      { name: "阅读", duration: 40, icon: "📖" },
      { name: "翻译", duration: 30, icon: "🔄" },
    ],
    totalTime: 125,
  },
  {
    id: "mock-2024-june-2",
    title: "2024年6月 第二套",
    sections: [
      { name: "写作", duration: 30, icon: "✍️" },
      { name: "听力", duration: 25, icon: "🎧" },
      { name: "阅读", duration: 40, icon: "📖" },
      { name: "翻译", duration: 30, icon: "🔄" },
    ],
    totalTime: 125,
  },
]

export default function MockPage() {
  const pathname = usePathname()
  const examType = pathname.split("/")[1] || "cet4"

  const [phase, setPhase] = useState<Phase>("select")
  const [selectedExam, setSelectedExam] = useState<(typeof mockExams)[0] | null>(null)
  const [currentSectionIdx, setCurrentSectionIdx] = useState(0)

  const currentSection = selectedExam?.sections[currentSectionIdx]
  const sectionDuration = (currentSection?.duration ?? 0) * 60

  const timer = useTimer(sectionDuration)

  // 自动切到下一个 section
  useEffect(() => {
    if (timer.isDone && phase === "running" && selectedExam) {
      if (currentSectionIdx < selectedExam.sections.length - 1) {
        // 短暂暂停后切换
        const timeout = setTimeout(() => {
          setCurrentSectionIdx((prev) => prev + 1)
          timer.reset()
          timer.start()
        }, 2000)
        return () => clearTimeout(timeout)
      } else {
        setPhase("done")
      }
    }
  }, [timer.isDone]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleStart = useCallback(
    (exam: (typeof mockExams)[0]) => {
      setSelectedExam(exam)
      setCurrentSectionIdx(0)
      setPhase("running")
      // timer 会在 sectionDuration 变化后自动 reset
    },
    []
  )

  const handleReset = useCallback(() => {
    setPhase("select")
    setSelectedExam(null)
    setCurrentSectionIdx(0)
    timer.reset()
  }, [timer])

  // --- 选卷 ---
  if (phase === "select") {
    return (
      <div className="p-8 max-w-3xl mx-auto space-y-6">
        <div className="space-y-2">
          <h1 className="text-2xl font-bold">⏱️ 模拟考试</h1>
          <p className="text-muted-foreground">
            完整计时模拟。每个部分单独计时，到时自动切换。
          </p>
        </div>

        <div className="space-y-3">
          {mockExams.map((exam) => (
            <Card
              key={exam.id}
              className="cursor-pointer hover:border-primary/50 hover:bg-accent/50 transition-colors"
              onClick={() => handleStart(exam)}
            >
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">{exam.title}</CardTitle>
                  <Badge variant="outline">{exam.totalTime} 分钟</Badge>
                </div>
                <CardDescription>
                  {exam.sections
                    .map((s) => `${s.icon} ${s.name} ${s.duration}min`)
                    .join(" · ")}
                </CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  // --- 完成 ---
  if (phase === "done") {
    return (
      <div className="p-8 max-w-3xl mx-auto space-y-6">
        <div className="space-y-2 text-center">
          <span className="text-5xl">🎉</span>
          <h1 className="text-2xl font-bold">考试结束！</h1>
          <p className="text-muted-foreground">
            {selectedExam?.title} — 你完成了所有部分。
          </p>
        </div>
        <div className="flex justify-center gap-3">
          <Button onClick={handleReset}>再来一次</Button>
        </div>
      </div>
    )
  }

  // --- 考试中 ---
  return (
    <div className="flex flex-col h-screen">
      {/* 顶栏 */}
      <div className="border-b border-border px-6 py-3 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <h1 className="text-lg font-bold">⏱️ 模拟考试</h1>
          <Badge variant="outline">{selectedExam?.title}</Badge>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={timer.running ? timer.pause : timer.start}>
            {timer.running ? "⏸ 暂停" : "▶ 继续"}
          </Button>
          <Button variant="outline" size="sm" onClick={handleReset}>
            放弃
          </Button>
        </div>
      </div>

      {/* 计时器 + Section 进度 */}
      <div className="border-b border-border px-6 py-4 shrink-0">
        <div className="max-w-2xl mx-auto space-y-3">
          {/* Section tabs */}
          <div className="flex gap-2">
            {selectedExam?.sections.map((s, i) => (
              <button
                key={s.name}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors",
                  i === currentSectionIdx
                    ? "bg-primary text-primary-foreground"
                    : i < currentSectionIdx
                    ? "bg-emerald-500/10 text-emerald-400"
                    : "bg-muted text-muted-foreground"
                )}
              >
                <span>{s.icon}</span>
                {s.name}
                {i < currentSectionIdx && " ✓"}
              </button>
            ))}
          </div>

          {/* 计时器 */}
          <div className="text-center space-y-2">
            <div
              className={cn(
                "text-5xl font-mono font-bold",
                timer.isCritical && "text-red-400 animate-pulse",
                timer.isWarning && !timer.isCritical && "text-yellow-400"
              )}
            >
              {String(timer.minutes).padStart(2, "0")}:
              {String(timer.seconds).padStart(2, "0")}
            </div>
            <p className="text-sm text-muted-foreground">
              {currentSection?.icon} {currentSection?.name} — {currentSection?.duration} 分钟
            </p>
          </div>

          {/* 进度条 */}
          <div className="w-full bg-muted rounded-full h-1.5">
            <div
              className={cn(
                "h-1.5 rounded-full transition-all duration-1000",
                timer.isCritical
                  ? "bg-red-500"
                  : timer.isWarning
                  ? "bg-yellow-500"
                  : "bg-primary"
              )}
              style={{ width: `${timer.progress}%` }}
            />
          </div>
        </div>
      </div>

      {/* 内容区（提示用户去做题） */}
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center space-y-4">
          <span className="text-6xl">{currentSection?.icon}</span>
          <h2 className="text-2xl font-bold">
            {currentSection?.name} — {currentSection?.duration} 分钟
          </h2>
          <p className="text-muted-foreground max-w-md">
            {currentSection?.name === "写作" && "请在纸上或记事本中完成写作。时间到后自动切换到听力。"}
            {currentSection?.name === "听力" && "请播放听力音频并作答。时间到后自动切换到阅读。"}
            {currentSection?.name === "阅读" && "请在阅读模块中完成题目。时间到后自动切换到翻译。"}
            {currentSection?.name === "翻译" && "请在翻译模块中完成翻译。时间到后考试结束。"}
          </p>
          <a
            href={`/${examType}/${currentSection?.name === "写作" ? "write" : currentSection?.name === "阅读" ? "read" : currentSection?.name === "翻译" ? "translate" : "listen"}`}
            className="inline-block"
          >
            <Button size="lg">
              开始 {currentSection?.name} →
            </Button>
          </a>
        </div>
      </div>
    </div>
  )
}
