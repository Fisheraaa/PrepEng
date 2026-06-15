import { NextRequest } from "next/server"
import { validateRequest, unauthorizedResponse } from "@/lib/auth-middleware"

export async function POST(req: NextRequest) {
  const isValid = await validateRequest(req)
  if (!isValid) {
    return unauthorizedResponse()
  }

  const { config, part, topic, questions, answers } = await req.json()

  if (!config?.apiKey || !config?.baseUrl || !config?.model) {
    return new Response(JSON.stringify({ error: "请先在设置页面配置 API" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    })
  }

  const systemPrompt = `You are an IELTS speaking examiner. Evaluate the student's speaking responses for ${part}.

Rules:
- Give an estimated band score (1-9) for each IELTS criterion
- Be specific and reference the student's actual responses
- Give concrete improvement suggestions
- Be encouraging but honest
- Use Chinese for feedback, but keep IELTS terms in English
- Start directly with the evaluation, no greetings or filler`

  let userMessage = `Topic: ${topic}\n\n`

  if (part === "Part 1") {
    userMessage += `Part 1 Questions and Answers:\n`
    questions.forEach((q: string, i: number) => {
      userMessage += `\nQ: ${q}\nA: ${answers[i] || "(no answer)"}\n`
    })
  } else if (part === "Part 2") {
    userMessage += `Part 2 Cue Card: ${questions[0]}\n\nStudent's response:\n${answers[0] || "(no answer)"}`
  } else {
    userMessage += `Part 3 Questions and Answers:\n`
    questions.forEach((q: string, i: number) => {
      userMessage += `\nQ: ${q}\nA: ${answers[i] || "(no answer)"}\n`
    })
  }

  userMessage += `\n\nPlease evaluate based on IELTS speaking criteria:
1. Fluency and Coherence
2. Lexical Resource
3. Grammatic Range and Accuracy
4. Pronunciation (assess from written response)

Give band scores (1-9) for each criterion and an overall score. Provide specific feedback with examples from the student's responses.`

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
        { role: "user", content: userMessage },
      ],
      max_completion_tokens: 1024,
      temperature: 0.3,
      stream: true,
    }),
  })

  if (!aiRes.ok) {
    const err = await aiRes.text()
    return new Response(
      JSON.stringify({ error: `API 错误 (${aiRes.status}): ${err.slice(0, 300)}` }),
      { status: aiRes.status, headers: { "Content-Type": "application/json" } }
    )
  }

  const reader = aiRes.body?.getReader()
  if (!reader) {
    return new Response(JSON.stringify({ error: "无法读取 AI 响应流" }), {
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
