"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { loadConfig, isConfigValid } from "@/lib/api-config"
import { cn } from "@/lib/utils"

interface ChatMessage {
  role: "user" | "assistant"
  content: string
}

interface SocraticChatProps {
  question: string
  options: string[]
  correctAnswer: string
  userAnswer: string
  passage?: string  // 文章内容
  onClose: () => void
}

export function SocraticChat({
  question,
  options,
  correctAnswer,
  userAnswer,
  passage,
  onClose,
}: SocraticChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState("")
  const [isStreaming, setIsStreaming] = useState(false)
  const [streamingText, setStreamingText] = useState("")
  const messagesRef = useRef<HTMLDivElement>(null)
  const hasStarted = useRef(false)

  // 自动滚到底部
  useEffect(() => {
    const el = messagesRef.current
    if (el) {
      const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 100
      if (atBottom) el.scrollTop = el.scrollHeight
    }
  }, [messages, streamingText])

  const sendMessage = useCallback(
    async (userMsg: string) => {
      if (!userMsg.trim() || isStreaming) return

      const apiConfig = loadConfig()
      if (!isConfigValid(apiConfig)) {
        setMessages((prev) => [
          ...prev,
          { role: "user", content: userMsg },
          { role: "assistant", content: "△ 未配置 API，请先去设置页配置。" },
        ])
        return
      }

      const newMessages: ChatMessage[] = [
        ...messages,
        { role: "user", content: userMsg },
      ]
      setMessages(newMessages)
      setInput("")
      setIsStreaming(true)
      setStreamingText("")

      try {
        const res = await fetch("/api/socratic", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            config: apiConfig,
            question,
            options,
            correct_answer: correctAnswer,
            user_answer: userAnswer,
            passage,  // 传入文章上下文
            chat_history: newMessages,
          }),
        })

        if (!res.ok) {
          const err = await res.text()
          setMessages((prev) => [
            ...prev,
            { role: "assistant", content: `△ 错误：${err.slice(0, 100)}` },
          ])
          setIsStreaming(false)
          return
        }

        const reader = res.body?.getReader()
        if (!reader) return

        const decoder = new TextDecoder()
        let buffer = ""
        let fullText = ""

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
            if (data === "[DONE]") break
            try {
              const parsed = JSON.parse(data)
              if (parsed.content) {
                fullText += parsed.content
                setStreamingText(fullText)
              }
            } catch {}
          }
        }

        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: fullText },
        ])
        setStreamingText("")
      } catch (err) {
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: `△ 网络错误：${err instanceof Error ? err.message : "未知"}`,
          },
        ])
      }

      setIsStreaming(false)
    },
    [messages, isStreaming, question, options, correctAnswer, userAnswer, passage]
  )

  // 自动开始第一次追问
  useEffect(() => {
    if (!hasStarted.current) {
      hasStarted.current = true
      sendMessage("我选错了这道题，请引导我理解正确答案。")
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <Card className="border-primary/30">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            {">"} 苏格拉底追问
            <Badge variant="outline" className="text-xs">
              AI 引导你理解
            </Badge>
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={onClose}>
            关闭
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* 消息区 */}
        <div
          ref={messagesRef}
          className="max-h-[300px] overflow-y-auto space-y-3 pr-2"
        >
          {messages.map((msg, i) => (
            <div
              key={i}
              className={cn(
                "flex",
                msg.role === "user" ? "justify-end" : "justify-start"
              )}
            >
              <div
                className={cn(
                  "max-w-[85%] rounded-lg px-3 py-2 text-sm leading-relaxed",
                  msg.role === "user"
                    ? "bg-primary/10 text-foreground"
                    : "bg-muted text-muted-foreground"
                )}
              >
                {msg.content}
              </div>
            </div>
          ))}

          {/* 流式输出中 */}
          {isStreaming && streamingText && (
            <div className="flex justify-start">
              <div className="max-w-[85%] rounded-lg px-3 py-2 text-sm leading-relaxed bg-muted text-muted-foreground">
                {streamingText}
              </div>
            </div>
          )}

          {isStreaming && !streamingText && (
            <div className="flex justify-start">
              <div className="rounded-lg px-3 py-2 text-sm bg-muted text-muted-foreground animate-pulse">
                AI 思考中...
              </div>
            </div>
          )}
        </div>

        {/* 输入区 */}
        <div className="flex gap-2">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault()
                sendMessage(input)
              }
            }}
            placeholder="说说你的想法..."
            className="min-h-[60px] resize-none text-sm"
            disabled={isStreaming}
          />
          <Button
            onClick={() => sendMessage(input)}
            disabled={!input.trim() || isStreaming}
            size="sm"
            className="shrink-0"
          >
            发送
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
