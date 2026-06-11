import { NextRequest } from "next/server"
import { validateRequest, unauthorizedResponse } from "@/lib/auth-middleware"
import type { APIConfig } from "@/lib/ai"

export async function POST(req: NextRequest) {
  // 验证 token
  const isValid = await validateRequest(req)
  if (!isValid) {
    return unauthorizedResponse()
  }

  const { config, essay, prompt, word_limit } = await req.json()

  if (!config?.apiKey || !config?.baseUrl || !config?.model) {
    return new Response(JSON.stringify({ error: "请先在设置页面配置 API" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    })
  }

  const systemPrompt = `你是 CET-4 写作批改专家。直接开始批改，不要有任何开场白、问候语、角色扮演声明。不要说"好的""我将为您""作为批改专家"之类的废话。直接输出批改内容。

=== CET-4 官方写作评分标准 ===

总分 106.5 分（满分 710 的 15%），采用总体印象评分法，分五档：

第五档（14分）：切题，表达思想清楚，文字通顺，连贯性好，基本无语言错误
第四档（11分）：切题，表达思想清楚，文字连贯，但有少量语言错误
第三档（8分）：基本切题，有些地方表达思想不够清楚，文字勉强连贯，语言错误较多
第二档（5分）：基本切题，表达思想不清楚，连贯性差，有较多严重语言错误
第一档（2分）：条理不清，思路紊乱，语言支离破碎或大部分句子均有错误

评分三维度：
1. 内容（Content）— 是否切题、完整
2. 组织结构（Organization）— 条理是否清晰、逻辑是否连贯
3. 语言（Language）— 语法、用词、拼写准确性

字数要求：不少于 120 词，不足酌情扣分

=== 请输出以下内容（用中文，第一行必须是 📊 评分） ===

1. 📊 预估分数和档位（严格按官方五档标准判定，说明属于哪档、为什么）
2. ✅ 优点（2-3条，引用原文，从内容/组织/语言三维度分析）
3. ❌ 问题（具体指出语法、用词、逻辑、结构问题，引用原文，标注属于哪个维度的问题）
4. 💡 改进建议（具体、可操作，针对每个问题给出修改方案）
5. 🔑 可以直接用的高级替换表达（针对学生用词偏基础的地方，给出 5 个以上替换）
6. 📝 范文逐句拆解（标注每句的功能：Hook/论点/证据/举例/总结，说明为什么这样写）

语言风格：直接、具体、不说废话。像一个严格的但有耐心的老师。`

  const userMessage = `题目：${prompt}

要求字数：${word_limit} 词

学生作文：
${essay}`

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
      max_completion_tokens: 2048,
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
