"use client"

import { useState, useCallback, useEffect, useRef } from "react"
import { usePathname } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Separator } from "@/components/ui/separator"
import { loadConfig, isConfigValid } from "@/lib/api-config"
import { cn } from "@/lib/utils"
import { MarkdownContent } from "@/components/markdown-content"

// ============================================================
// IELTS Speaking 题库
// ============================================================

interface SpeakingTopic {
  id: string
  name: string
  part1: string[]
  part2: {
    prompt: string
    points: string[]
  }
  part3: string[]
}

const speakingTopics: SpeakingTopic[] = [
  {
    id: "work",
    name: "Work & Study",
    part1: ["What job do you do?", "Why did you choose that particular job?", "What do you do every day at work?", "What other work would you consider doing?"],
    part2: { prompt: "Describe a job that you think is interesting.", points: ["What the job is", "How you know about this job", "What skills are needed", "Explain why you think it is interesting"] },
    part3: ["What jobs are most popular among young people in your country?", "Do you think technology will replace many jobs in the future?", "Is it important to enjoy your job, or is earning money more important?", "How has the way people work changed in recent years?"],
  },
  {
    id: "family",
    name: "Family & Relationships",
    part1: ["Do you have a big or a small family?", "Do you live together or nearby?", "What activities do you like to do together?", "Who is your favourite family member?"],
    part2: { prompt: "Describe a family member you spend the most time with.", points: ["Who this person is", "What you usually do together", "How often you see this person", "Explain why you spend the most time with them"] },
    part3: ["Do you think family relationships have changed in recent years?", "Is it important for families to eat meals together?", "How do you think families will change in the future?", "Do you think grandparents should help raise their grandchildren?"],
  },
  {
    id: "hobbies",
    name: "Hobbies & Interests",
    part1: ["What type of activities help you relax?", "Do you like to do these activities alone or with other people?", "Why do you think it is important for people to relax?", "Do you think people have enough time for relaxing?"],
    part2: { prompt: "Describe a hobby you have had for a long time.", points: ["What the hobby is", "When you started doing it", "How often you do it", "Explain why you have kept this hobby for so long"] },
    part3: ["Do you think hobbies should be educational?", "How have hobbies changed compared to the past?", "Do you think people spend too much time on their hobbies?", "Should schools encourage students to have hobbies?"],
  },
  {
    id: "travel",
    name: "Travel & Places",
    part1: ["Do you like travelling?", "Where was the last place you visited?", "Do you prefer travelling alone or with others?", "What kind of places do you like to visit?"],
    part2: { prompt: "Describe a country you would like to visit in the future.", points: ["Which country it is", "Where it is located", "What you could see there", "Explain why this country would be a good place to visit"] },
    part3: ["How has tourism changed in your country over the years?", "Do you think tourism does more harm than good?", "How do you think travel will change in the future?", "Is it important for young people to travel before starting work?"],
  },
  {
    id: "food",
    name: "Food & Cooking",
    part1: ["What kind of food do you like to eat?", "Do you prefer eating at home or in restaurants?", "Do you like cooking?", "What is a popular dish in your country?"],
    part2: { prompt: "Describe a meal that you remember well.", points: ["Where the meal was", "Who you were with", "What you ate", "Explain why you remember this meal"] },
    part3: ["How have eating habits changed in your country?", "Do you think people pay enough attention to healthy eating?", "How has technology affected the way people cook?", "Do you think traditional food will disappear in the future?"],
  },
  {
    id: "technology",
    name: "Technology",
    part1: ["How often do you use your phone?", "What do you use the internet for?", "Do you think children spend too much time on screens?", "What piece of technology do you use the most?"],
    part2: { prompt: "Describe a piece of technology that has changed your life.", points: ["What the technology is", "When you first started using it", "How you use it", "Explain how it has changed your life"] },
    part3: ["How has technology changed the way people communicate?", "Do you think people are too dependent on technology?", "What technological changes do you think will happen in the next 20 years?", "Should older people learn to use new technology?"],
  },
  {
    id: "education",
    name: "Education",
    part1: ["What did you study at school?", "Did you enjoy studying?", "What was your favourite subject?", "Do you think education is important?"],
    part2: { prompt: "Describe a teacher who had a big influence on you.", points: ["Who the teacher was", "What subject they taught", "What made them special", "Explain why they influenced you"] },
    part3: ["Do you think the education system in your country needs to change?", "Is it better to study alone or in a group?", "How has technology changed education?", "Do you think everyone should go to university?"],
  },
  {
    id: "weather",
    name: "Weather & Seasons",
    part1: ["What kind of weather do you like?", "What is the weather like in your city?", "Does the weather affect your mood?", "What is your favourite season?"],
    part2: { prompt: "Describe a time when the weather affected your plans.", points: ["When it happened", "What your plans were", "How the weather affected them", "Explain how you felt about it"] },
    part3: ["How does weather affect people's daily lives?", "Do you think climate change is a serious problem?", "How do people in your country deal with extreme weather?", "Do you think the weather has changed compared to the past?"],
  },
]

// ============================================================
// 流式 AI 调用
// ============================================================

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

// ============================================================
// 主页面
// ============================================================

type Phase = "select" | "practice" | "part-feedback"

export default function SpeakPage() {
  const pathname = usePathname()
  const examType = (pathname.split("/")[1] || "ielts") as "cet4" | "cet6" | "ielts"

  const [phase, setPhase] = useState<Phase>("select")
  const [selectedTopic, setSelectedTopic] = useState<SpeakingTopic | null>(null)
  const [currentPart, setCurrentPart] = useState<0 | 1 | 2>(0) // 0=part1, 1=part2, 2=part3
  const [currentQIdx, setCurrentQIdx] = useState(0)
  const [userAnswer, setUserAnswer] = useState("")
  const [partAnswers, setPartAnswers] = useState<string[]>([]) // 当前 part 的所有答案
  const [isStreaming, setIsStreaming] = useState(false)
  const [streamedText, setStreamedText] = useState("")
  const [apiError, setApiError] = useState<string | null>(null)
  const [timer, setTimer] = useState(0)
  const [isTimerRunning, setIsTimerRunning] = useState(false)
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    if (isTimerRunning) {
      timerRef.current = setInterval(() => setTimer(t => t + 1), 1000)
    } else {
      if (timerRef.current) clearInterval(timerRef.current)
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [isTimerRunning])

  const formatTime = (s: number) => `${Math.floor(s / 60).toString().padStart(2, "0")}:${(s % 60).toString().padStart(2, "0")}`

  const getPartQuestions = useCallback((partIdx: number, topic: SpeakingTopic): string[] => {
    if (partIdx === 0) return topic.part1
    if (partIdx === 1) return [topic.part2.prompt]
    return topic.part3
  }, [])

  const getPartLabel = (partIdx: number) => `Part ${partIdx + 1}`

  const handleSelectTopic = useCallback((topic: SpeakingTopic) => {
    setSelectedTopic(topic)
    setCurrentPart(0)
    setCurrentQIdx(0)
    setUserAnswer("")
    setPartAnswers([])
    setStreamedText("")
    setApiError(null)
    setTimer(0)
    setIsTimerRunning(true)
    setPhase("practice")
  }, [])

  const handleSaveAndNext = useCallback(() => {
    if (!selectedTopic) return
    const questions = getPartQuestions(currentPart, selectedTopic)
    const newAnswers = [...partAnswers]
    newAnswers[currentQIdx] = userAnswer
    setPartAnswers(newAnswers)

    if (currentQIdx < questions.length - 1) {
      setCurrentQIdx(prev => prev + 1)
      setUserAnswer(newAnswers[currentQIdx + 1] || "")
    } else {
      // Part 结束，进入评分
      setPhase("part-feedback")
      handleGradePart(newAnswers)
    }
  }, [selectedTopic, currentPart, currentQIdx, userAnswer, partAnswers])

  const handleGradePart = useCallback(async (answers: string[]) => {
    if (!selectedTopic) return

    const apiConfig = loadConfig()
    if (!isConfigValid(apiConfig)) {
      setApiError("未配置 API。去设置页配置后可获得 AI 评分。")
      return
    }

    setIsStreaming(true)
    setStreamedText("")
    setApiError(null)

    const questions = getPartQuestions(currentPart, selectedTopic)
    const partLabel = getPartLabel(currentPart)

    await streamAI(
      "/api/grade-speaking",
      { config: apiConfig, part: partLabel, topic: selectedTopic.name, questions, answers },
      (chunk) => setStreamedText(prev => prev + chunk),
      () => setIsStreaming(false),
      (err) => { setApiError(err); setIsStreaming(false) }
    )
  }, [selectedTopic, currentPart])

  const handleNextPart = useCallback(() => {
    if (currentPart < 2) {
      const nextPart = (currentPart + 1) as 0 | 1 | 2
      setCurrentPart(nextPart)
      setCurrentQIdx(0)
      setUserAnswer("")
      setPartAnswers([])
      setStreamedText("")
      setApiError(null)
      setPhase("practice")
    } else {
      // 所有 part 完成
      setIsTimerRunning(false)
      setPhase("select")
    }
  }, [currentPart])

  const handleGoToPart = useCallback((partIdx: number) => {
    setCurrentPart(partIdx as 0 | 1 | 2)
    setCurrentQIdx(0)
    setUserAnswer("")
    setPartAnswers([])
    setStreamedText("")
    setApiError(null)
    setPhase("practice")
  }, [])

  const handleGoToQuestion = useCallback((qIdx: number) => {
    setCurrentQIdx(qIdx)
    setUserAnswer(partAnswers[qIdx] || "")
  }, [partAnswers])

  const handleBackToSelect = useCallback(() => {
    setSelectedTopic(null)
    setPhase("select")
    setIsTimerRunning(false)
    setTimer(0)
    setStreamedText("")
    setApiError(null)
  }, [])

  // --- 选题页面 ---
  if (phase === "select") {
    return (
      <div className="p-8 max-w-4xl mx-auto space-y-6">
        <div className="space-y-2">
          <h1 className="text-2xl font-bold">🗣 IELTS Speaking</h1>
          <p className="text-muted-foreground">选择一个话题开始口语练习。每个 Part 结束后自动评分。</p>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {speakingTopics.map((topic) => (
            <Card key={topic.id} className="cursor-pointer hover:border-primary/50 hover:bg-accent/50 transition-colors" onClick={() => handleSelectTopic(topic)}>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">{topic.name}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-1 text-sm text-muted-foreground">
                  <p>Part 1: {topic.part1.length} questions</p>
                  <p>Part 2: {topic.part2.prompt.slice(0, 50)}...</p>
                  <p>Part 3: {topic.part3.length} questions</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  // --- 评分页面 ---
  if (phase === "part-feedback") {
    return (
      <div className="flex flex-col h-screen">
        <div className="border-b border-border px-4 py-2 shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={handleBackToSelect} className="h-7 px-2">← 返回</Button>
              <span className="text-sm font-medium">{selectedTopic?.name}</span>
              <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20">{getPartLabel(currentPart)} 评分</Badge>
            </div>
            <span className="text-sm font-mono text-muted-foreground">{formatTime(timer)}</span>
          </div>
          {/* Part 切换导航 */}
          <div className="flex items-center gap-2 mt-2">
            {[0, 1, 2].map((p) => (
              <button
                key={p}
                onClick={() => handleGoToPart(p)}
                className={cn(
                  "px-2.5 py-1 rounded text-xs transition-colors border",
                  p === currentPart
                    ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20 font-medium"
                    : "text-muted-foreground hover:bg-accent border-transparent"
                )}
              >
                Part {p + 1}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="max-w-3xl mx-auto p-6 space-y-4">
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
                    <p className="text-sm text-muted-foreground animate-pulse">AI 正在分析你的回答...</p>
                  )}
                </CardContent>
              </Card>
            )}

            {!isStreaming && streamedText && (
              <div className="flex gap-3">
                {currentPart < 2 ? (
                  <Button onClick={handleNextPart}>继续 Part {currentPart + 2} →</Button>
                ) : (
                  <Button onClick={handleBackToSelect}>完成，返回选题</Button>
                )}
                <Button variant="outline" onClick={() => {
                  setPhase("practice")
                  setStreamedText("")
                }}>修改答案</Button>
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  // --- 练习页面 ---
  if (!selectedTopic) return null

  const questions = getPartQuestions(currentPart, selectedTopic)
  const isPart2 = currentPart === 1
  const currentQuestion = questions[currentQIdx]
  const answeredCount = partAnswers.filter(a => a && a.trim()).length + (userAnswer.trim() ? 1 : 0)

  return (
    <div className="flex flex-col h-screen">
      {/* 顶部导航栏 */}
      <div className="border-b border-border px-4 py-2 shrink-0 space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={handleBackToSelect} className="h-7 px-2">← 返回</Button>
            <span className="text-sm font-medium">{selectedTopic.name}</span>
          </div>
          <span className="text-sm font-mono text-muted-foreground">{formatTime(timer)}</span>
        </div>

        <div className="flex items-center gap-3">
          {/* Part 切换 */}
          <div className="flex gap-1">
            {[0, 1, 2].map((p) => {
              const isActive = currentPart === p
              const colors = ["bg-blue-500/10 text-blue-400 border-blue-500/20", "bg-purple-500/10 text-purple-400 border-purple-500/20", "bg-orange-500/10 text-orange-400 border-orange-500/20"]
              return (
                <button
                  key={p}
                  onClick={() => handleGoToPart(p)}
                  className={cn(
                    "px-2.5 py-1 rounded text-xs transition-colors border",
                    isActive ? `${colors[p]} font-medium` : "text-muted-foreground hover:bg-accent border-transparent"
                  )}
                >
                  Part {p + 1}
                </button>
              )
            })}
          </div>

          <div className="w-px h-4 bg-border" />

          {/* 题目切换 */}
          {!isPart2 && (
            <div className="flex gap-1 flex-wrap">
              {questions.map((_, idx) => {
                const isActive = currentQIdx === idx
                const hasAnswer = partAnswers[idx] && partAnswers[idx].trim()
                return (
                  <button
                    key={idx}
                    onClick={() => handleGoToQuestion(idx)}
                    className={cn(
                      "px-2 py-1 rounded text-xs transition-colors",
                      isActive ? "bg-primary text-primary-foreground" : hasAnswer ? "bg-emerald-500/10 text-emerald-400 hover:bg-accent" : "text-muted-foreground hover:bg-accent"
                    )}
                  >
                    Q{idx + 1}
                  </button>
                )
              })}
            </div>
          )}

          {isPart2 && <Badge className="bg-purple-500/10 text-purple-400 border-purple-500/20">Cue Card</Badge>}

          <span className="text-xs text-muted-foreground ml-auto">
            {!isPart2 ? `${currentQIdx + 1}/${questions.length}` : "2 min talk"}
          </span>
        </div>
      </div>

      {/* 内容区域 */}
      <div className="flex-1 overflow-y-auto p-6 max-w-3xl mx-auto w-full space-y-6">
        {/* Part 2 Cue Card */}
        {isPart2 && (
          <Card className="border-purple-500/30">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Cue Card</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="font-medium">{selectedTopic.part2.prompt}</p>
              <p className="text-sm text-muted-foreground">You should say:</p>
              <ul className="space-y-1">
                {selectedTopic.part2.points.map((point, i) => (
                  <li key={i} className="text-sm text-muted-foreground ml-4">• {point}</li>
                ))}
              </ul>
              <p className="text-xs text-muted-foreground mt-2">You have 1 minute to prepare and 2 minutes to talk.</p>
            </CardContent>
          </Card>
        )}

        {/* 当前问题 */}
        <div className="space-y-2">
          <h2 className="text-lg font-semibold">{currentQuestion}</h2>
        </div>

        {/* 输入区域 */}
        <div className="space-y-3">
          <Textarea
            value={userAnswer}
            onChange={(e) => setUserAnswer(e.target.value)}
            placeholder={isPart2 ? "Prepare your 2-minute talk here..." : "Type your answer here..."}
            className="min-h-[200px] resize-none text-sm leading-relaxed"
          />
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">
              {userAnswer.trim().split(/\s+/).filter(w => w.length > 0).length} words
            </span>
            <Button onClick={handleSaveAndNext}>
              {isPart2 ? "Submit & Get Feedback" : currentQIdx < questions.length - 1 ? "Next Question →" : "Submit Part & Get Feedback"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
