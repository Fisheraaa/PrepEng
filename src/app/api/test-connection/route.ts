import { NextRequest, NextResponse } from "next/server"

export async function POST(req: NextRequest) {
  try {
    const { provider, baseUrl, apiKey, model, authStyle } = await req.json()

    if (!baseUrl || !apiKey || !model) {
      return NextResponse.json({ error: "配置不完整" }, { status: 400 })
    }

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    }

    if (authStyle === "api-key") {
      headers["api-key"] = apiKey
    } else if (provider === "anthropic") {
      headers["x-api-key"] = apiKey
      headers["anthropic-version"] = "2023-06-01"
    } else {
      headers["Authorization"] = `Bearer ${apiKey}`
    }

    if (provider === "anthropic") {
      const url = `${baseUrl.replace(/\/+$/, "")}/messages`
      const res = await fetch(url, {
        method: "POST",
        headers,
        body: JSON.stringify({
          model,
          max_tokens: 10,
          messages: [{ role: "user", content: "Hi" }],
        }),
      })
      if (!res.ok) {
        const err = await res.text()
        return NextResponse.json(
          { error: `HTTP ${res.status}: ${err.slice(0, 500)}` },
          { status: 400 }
        )
      }
      return NextResponse.json({ model, status: "ok" })
    }

    // OpenAI 兼容
    const url = `${baseUrl.replace(/\/+$/, "")}/chat/completions`
    const body = {
      model,
      messages: [{ role: "user", content: "Hi" }],
      max_completion_tokens: 10,
      stream: false,
    }

    const res = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    })

    if (!res.ok) {
      const err = await res.text()
      return NextResponse.json(
        {
          error: `HTTP ${res.status}: ${err.slice(0, 500)}`,
          request_url: url,
          request_body: body,
        },
        { status: 400 }
      )
    }

    return NextResponse.json({ model, status: "ok" })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "未知错误"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
