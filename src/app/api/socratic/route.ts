import { NextRequest } from "next/server"
import { validateRequest, unauthorizedResponse } from "@/lib/auth-middleware"
import type { APIConfig } from "@/lib/ai"

export async function POST(req: NextRequest) {
  // 验证 token
  const isValid = await validateRequest(req)
  if (!isValid) {
    return unauthorizedResponse()
  }

  const { config, question, options, correct_answer, user_answer, passage, chat_history } =
    await req.json()

  if (!config?.apiKey || !config?.baseUrl || !config?.model) {
    return new Response(JSON.stringify({ error: "请先在设置页面配置 API" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    })
  }

  const systemPrompt = `你是一个用苏格拉底法教英语阅读理解的老师。学生做错了一道选择题。

规则：
- 不要直接告诉学生正确答案
- 通过提问引导学生自己发现错误
- 一次只问一个问题
- 如果学生卡住了，给提示而不是给答案
- 当学生理解了，让他们用自己的话总结为什么选错了
- 用中文交流
- 不要说"好的""让我""作为老师"之类的废话，直接开始追问
- 可以引用文章中的具体句子来引导学生`

  let context = ""

  if (passage) {
    context += `文章：
${passage}

`
  }

  context += `题目：${question}

选项：
${options.join("\n")}

正确答案：${correct_answer}
学生选的：${user_answer}`

  const messages = [
    ...(chat_history ?? []).map((m: { role: string; content: string }) => ({
      role: m.role,
      content: m.content,
    })),
  ]

  // 第一次对话，加入上下文
  if (messages.length === 0) {
    messages.push({
      role: "user",
      content: `${context}\n\n我选错了这道题，请用苏格拉底法引导我理解为什么错了。`,
    })
  }

  // 流式调用 AI
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  }
  if (config.authStyle === "api-key") {
    headers["api-key"] = config.apiKey
  } else {
    headers["Authorization"] = `Bearer ${config.apiKey}`
  }

  const aiUrl = `${config.baseUrl.replace(/\/+$/, "")}/chat/completions`
  const aiRes = await fetch(aiUrl, {
    method: "POST",
    headers,
    body: JSON.stringify({
      model: config.model,
      messages: [
        { role: "system", content: systemPrompt },
        ...messages,
      ],
      max_completion_tokens: 512,
      temperature: 0.5,
      stream: true,
    }),
  })

  if (!aiRes.ok) {
    const err = await aiRes.text()
    return new Response(
      JSON.stringify({ error: `API 错误 (${aiRes.status}): ${err.slice(0, 200)}` }),
      { status: aiRes.status, headers: { "Content-Type": "application/json" } }
    )
  }

  const reader = aiRes.body?.getReader()
  if (!reader) {
    return new Response(JSON.stringify({ error: "无法读取响应流" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    })
  }

  const encoder = new TextEncoder()
  const decoder = new TextDecoder()

  const stream = new ReadableStream({
    async start(controller) {
      let buffer = ""
      try {
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
            if (data === "[DONE]") {
              controller.enqueue(encoder.encode("data: [DONE]\n\n"))
              break
            }
            try {
              const parsed = JSON.parse(data)
              const content = parsed.choices?.[0]?.delta?.content
              if (content) {
                controller.enqueue(
                  encoder.encode(`data: ${JSON.stringify({ content })}\n\n`)
                )
              }
            } catch {}
          }
        }
      } finally {
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  })
}
