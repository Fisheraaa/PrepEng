"use client"

import { Separator } from "@/components/ui/separator"

// ============================================================
// 简单 Markdown 渲染（标题、粗体、列表、代码、分隔线）
// ============================================================

export function MarkdownContent({ text }: { text: string }) {
  const lines = text.split("\n")

  return (
    <div className="space-y-1">
      {lines.map((line, i) => {
        const trimmed = line.trim()

        if (trimmed === "---" || trimmed === "***") {
          return <Separator key={i} className="my-3" />
        }

        if (trimmed.startsWith("### ")) {
          return (
            <h3 key={i} className="text-base font-bold mt-4 mb-1">
              {renderInline(trimmed.slice(4))}
            </h3>
          )
        }
        if (trimmed.startsWith("## ")) {
          return (
            <h2 key={i} className="text-lg font-bold mt-4 mb-1">
              {renderInline(trimmed.slice(3))}
            </h2>
          )
        }

        if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
          return (
            <div key={i} className="flex gap-2 ml-2">
              <span className="text-muted-foreground shrink-0">•</span>
              <span className="text-sm leading-relaxed">
                {renderInline(trimmed.slice(2))}
              </span>
            </div>
          )
        }

        if (/^\d+\.\s/.test(trimmed)) {
          const num = trimmed.match(/^(\d+)\./)?.[1]
          return (
            <div key={i} className="flex gap-2 ml-2">
              <span className="text-muted-foreground shrink-0 font-mono text-xs mt-0.5">
                {num}.
              </span>
              <span className="text-sm leading-relaxed">
                {renderInline(trimmed.replace(/^\d+\.\s/, ""))}
              </span>
            </div>
          )
        }

        if (!trimmed) {
          return <div key={i} className="h-2" />
        }

        return (
          <p key={i} className="text-sm leading-relaxed">
            {renderInline(trimmed)}
          </p>
        )
      })}
    </div>
  )
}

function renderInline(text: string): React.ReactNode {
  const parts: React.ReactNode[] = []
  let remaining = text
  let key = 0

  while (remaining.length > 0) {
    const boldMatch = remaining.match(/\*\*(.+?)\*\*/)
    const codeMatch = remaining.match(/`(.+?)`/)

    let firstMatch: {
      type: "bold" | "code"
      index: number
      full: string
      content: string
    } | null = null

    if (boldMatch && boldMatch.index !== undefined) {
      firstMatch = { type: "bold", index: boldMatch.index, full: boldMatch[0], content: boldMatch[1] }
    }
    if (codeMatch && codeMatch.index !== undefined) {
      if (!firstMatch || codeMatch.index < firstMatch.index) {
        firstMatch = { type: "code", index: codeMatch.index, full: codeMatch[0], content: codeMatch[1] }
      }
    }

    if (!firstMatch) { parts.push(remaining); break }

    if (firstMatch.index > 0) parts.push(remaining.slice(0, firstMatch.index))

    if (firstMatch.type === "bold") {
      parts.push(<strong key={key++} className="font-semibold text-foreground">{firstMatch.content}</strong>)
    } else {
      parts.push(<code key={key++} className="bg-muted px-1 py-0.5 rounded text-xs font-mono">{firstMatch.content}</code>)
    }

    remaining = remaining.slice(firstMatch.index + firstMatch.full.length)
  }

  return parts
}
