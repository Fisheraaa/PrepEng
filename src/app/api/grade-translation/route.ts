import { NextRequest } from "next/server"
import type { APIConfig } from "@/lib/ai"

export async function POST(req: NextRequest) {
  const { config, user_translation, source_text, reference_translation, scoring_points } =
    await req.json()

  if (!config?.apiKey || !config?.baseUrl || !config?.model) {
    return new Response(JSON.stringify({ error: "请先在设置页面配置 API" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    })
  }

  const systemPrompt = `你是 CET-4 翻译批改专家。直接开始批改，不要有任何开场白、问候语、角色扮演声明。不要说"好的""我将为您""作为批改专家"之类的废话。直接输出批改内容。

=== CET-4 官方翻译评分标准 ===

翻译满分 15 分，采用总体印象评分法，分五档：

第一档（13-15分）：译文准确表达了原文的意思，用词贴切、行文流畅，基本无语言错误
第二档（9-12分）：译文基本表达了原文的意思，文字通顺连贯，无重大语言错误
第三档（5-8分）：译文勉强表达了原文的意思，语言错误较多，其中有些是严重错误
第四档（1-4分）：译文仅翻译了一小部分原文的意思，有较多严重语言错误
第五档（0分）：未作答，或只有几个孤立的词语，或译文与原文毫不相关

评分四维度：
1. 准确性 — 是否准确传达了原文的意思（最重要）
2. 流畅性 — 译文是否通顺自然
3. 语言质量 — 语法、用词、拼写是否有错误
4. 完整性 — 是否完整翻译了原文内容

注意：评分采取扣分制，重点评估整体翻译质量和表达效果。漏译部分内容按比例降档。

=== 请输出以下内容（用中文，第一行必须是 📊 评分） ===

1. 📊 整体评分（严格按官方五档标准判定，给出具体分数和档位，说明属于哪档、为什么）
2. ✅ 翻译得好的地方（逐句分析，引用学生原文，从准确性/流畅性/语言质量/完整性四维度说明为什么好）
3. ❌ 错误和不准确的地方（逐句指出，引用学生的翻译，说明错在哪，正确的写法是什么，属于哪个维度的问题）
4. 💡 改进建议（针对学生的具体问题，给出可操作的改进方法，包括可替换的高级词汇和更好的句式）
5. 📝 对比范文（逐句对比学生翻译和参考译文的差异，标注哪些地方学生写得好、哪些地方范文更好、学生可以怎么向范文靠拢）

语言风格：像一个严格的但有耐心的老师。直接引用学生原文，不要泛泛而谈。每条点评都要具体到词和句。`

  const userMessage = `中文原文：
${source_text}

学生翻译：
${user_translation}

参考译文：
${reference_translation}

评分关键点：
${scoring_points.map((p: { key_phrase: string; correct_translation: string; alternatives: string[] }) => `- ${p.key_phrase} → ${p.correct_translation}（也可以：${p.alternatives.join(" / ")}）`).join("\n")}`

  // 流式请求 AI
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

  // 转发 SSE 流给客户端
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
            } catch {
              // 跳过解析失败的行
            }
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
