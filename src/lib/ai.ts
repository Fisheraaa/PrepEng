// ============================================================
// 通用 AI 封装 — 支持任何 OpenAI 兼容接口 + Anthropic
// ============================================================

export interface APIConfig {
  provider: "openai-compatible" | "anthropic"
  baseUrl: string
  apiKey: string
  model: string
  authStyle: "bearer" | "api-key"
}

// --- 通用调用 ---

async function callOpenAICompatible(
  config: APIConfig,
  systemPrompt: string,
  userMessage: string
): Promise<string> {
  const url = `${config.baseUrl.replace(/\/+$/, "")}/chat/completions`
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  }
  if (config.authStyle === "api-key") {
    headers["api-key"] = config.apiKey
  } else {
    headers["Authorization"] = `Bearer ${config.apiKey}`
  }
  const res = await fetch(url, {
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
      stream: false,
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`API 错误 (${res.status}): ${err.slice(0, 300)}`)
  }

  const data = await res.json()
  return data.choices[0].message.content
}

async function callAnthropic(
  config: APIConfig,
  systemPrompt: string,
  userMessage: string
): Promise<string> {
  const url = `${config.baseUrl.replace(/\/+$/, "")}/messages`
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "anthropic-version": "2023-06-01",
  }
  if (config.authStyle === "api-key") {
    headers["api-key"] = config.apiKey
  } else {
    headers["x-api-key"] = config.apiKey
  }
  const res = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify({
      model: config.model,
      max_tokens: 2048,
      system: systemPrompt,
      messages: [{ role: "user", content: userMessage }],
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Anthropic API 错误 (${res.status}): ${err.slice(0, 300)}`)
  }

  const data = await res.json()
  return data.content[0].text
}

async function callAI(
  config: APIConfig,
  systemPrompt: string,
  userMessage: string
): Promise<string> {
  if (config.provider === "anthropic") {
    return callAnthropic(config, systemPrompt, userMessage)
  }
  return callOpenAICompatible(config, systemPrompt, userMessage)
}

// ============================================================
// 写作批改
// ============================================================

export async function gradeWriting(
  config: APIConfig,
  essay: string,
  prompt: string,
  wordLimit: number
): Promise<string> {
  const systemPrompt = `你是 CET-4 写作批改专家。请按以下标准批改学生的作文：

评分标准（5档）：
- 5档（14分）：切题，表达清楚，文字通顺，无重大语言错误
- 4档（11分）：基本切题，表达基本清楚，有少量语言错误
- 3档（8分）：基本切题，有较多语言错误，但不影响理解
- 2档（5分）：条理不清，语言错误较多
- 1档（2分）：与题目毫不相关

请输出以下内容（用中文）：
1. 📊 预估分数和档位
2. ✅ 优点（2-3条）
3. ❌ 问题（具体指出语法、用词、逻辑、结构问题，引用原文）
4. 💡 改进建议（具体、可操作）
5. 🔑 可以直接用的高级替换表达（针对学生用词偏基础的地方）

语言风格：直接、具体、不说废话。像一个严格的但有耐心的老师。`

  const userMessage = `题目：${prompt}

要求字数：${wordLimit} 词

学生作文：
${essay}`

  return callAI(config, systemPrompt, userMessage)
}

// ============================================================
// 翻译批改
// ============================================================

export async function gradeTranslation(
  config: APIConfig,
  userTranslation: string,
  sourceText: string,
  referenceTranslation: string,
  scoringPoints: {
    key_phrase: string
    correct_translation: string
    alternatives: string[]
  }[]
): Promise<string> {
  const systemPrompt = `你是 CET-4 翻译批改专家。请对比学生的翻译和参考译文，给出详细批改。

你必须输出以下 5 个部分（用中文，每部分都要有实质内容）：

1. 📊 整体评分（满分15分档，给出具体分数和档位）

2. ✅ 翻译得好的地方（逐句分析，引用学生原文，说明为什么好——用词准确、句式恰当、表达地道等）

3. ❌ 错误和不准确的地方（逐句指出，引用学生的翻译，说明错在哪，为什么错，正确的写法是什么）

4. 💡 改进建议（针对学生的具体问题，给出可操作的改进方法，包括：可以替换的高级词汇、更好的句式结构、语法要点）

5. 📝 对比范文（逐句对比学生翻译和参考译文的差异，标注哪些地方学生写得好、哪些地方范文更好、学生可以怎么向范文靠拢）

语言风格：像一个严格的但有耐心的老师。直接引用学生原文，不要泛泛而谈。每条点评都要具体到词和句。`

  const userMessage = `中文原文：
${sourceText}

学生翻译：
${userTranslation}

参考译文：
${referenceTranslation}

评分关键点：
${scoringPoints.map((p) => `- ${p.key_phrase} → ${p.correct_translation}（也可以：${p.alternatives.join(" / ")}）`).join("\n")}`

  return callAI(config, systemPrompt, userMessage)
}
