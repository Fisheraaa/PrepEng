"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useState, useEffect } from "react"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { getMistakes } from "@/lib/storage"
import { getAvailablePapers } from "@/lib/exam-data"
import type { ExamType } from "@/types/exam"

const examInfo: Record<
  string,
  {
    label: string
    sections: {
      name: string
      href: string
      icon: string
      weight: string
      description: string
    }[]
  }
> = {
  cet4: {
    label: "CET-4 四级",
    sections: [
      {
        name: "听力",
        href: "/listen",
        icon: "🎙",
        weight: "35%",
        description: "短篇新闻 + 长对话 + 听力篇章",
      },
      {
        name: "阅读",
        href: "/read",
        icon: "▣",
        weight: "35%",
        description: "选词填空 + 信息匹配 + 仔细阅读",
      },
      {
        name: "写作",
        href: "/write",
        icon: "🖋",
        weight: "15%",
        description: "30分钟，120-180词短文",
      },
      {
        name: "翻译",
        href: "/translate",
        icon: "▤",
        weight: "15%",
        description: "汉译英段落翻译",
      },
    ],
  },
  cet6: {
    label: "CET-6 六级",
    sections: [
      {
        name: "听力",
        href: "/listen",
        icon: "🎙",
        weight: "35%",
        description: "长对话 + 听力篇章 + 讲座",
      },
      {
        name: "阅读",
        href: "/read",
        icon: "▣",
        weight: "35%",
        description: "选词填空 + 信息匹配 + 仔细阅读",
      },
      {
        name: "写作",
        href: "/write",
        icon: "🖋",
        weight: "15%",
        description: "30分钟，150-200词短文",
      },
      {
        name: "翻译",
        href: "/translate",
        icon: "▤",
        weight: "15%",
        description: "汉译英段落翻译",
      },
    ],
  },
  ielts: {
    label: "IELTS 雅思",
    sections: [
      {
        name: "听力",
        href: "/listen",
        icon: "🎙",
        weight: "25%",
        description: "4 sections, 40 questions",
      },
      {
        name: "阅读",
        href: "/read",
        icon: "▣",
        weight: "25%",
        description: "3 passages, 40 questions",
      },
      {
        name: "写作",
        href: "/write",
        icon: "🖋",
        weight: "25%",
        description: "Task 1 (图表) + Task 2 (议论文)",
      },
      {
        name: "口语",
        href: "/speak",
        icon: "🗣",
        weight: "25%",
        description: "Part 1 + Part 2 + Part 3",
      },
    ],
  },
}

export default function ExamDashboard() {
  const pathname = usePathname()
  const examType = pathname.split("/")[1] || "cet4"
  const info = examInfo[examType] ?? examInfo.cet4

  const [mistakeCount, setMistakeCount] = useState(0)
  const [dueCount, setDueCount] = useState(0)
  const [paperCount, setPaperCount] = useState(0)

  useEffect(() => {
    const et = examType as ExamType
    getMistakes(et).then((m) => {
      setMistakeCount(m.length)
      const now = Date.now()
      setDueCount(m.filter((x) => x.next_review <= now).length)
    }).catch(() => {})
    const papers = getAvailablePapers(et)
    setPaperCount(papers.length)
  }, [examType])

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">{info.label}</h1>
        <p className="text-muted-foreground">
          选择模块开始练习。做错了不要紧，我会帮你搞清楚为什么。
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: "题库套数", value: String(paperCount), icon: "📚" },
          { label: "错题数", value: String(mistakeCount), icon: "◔" },
          { label: "正确率", value: mistakeCount > 0 ? `${Math.max(0, 100 - mistakeCount * 5)}%` : "--", icon: "✅" },
          { label: "待复习", value: String(dueCount), icon: "▤" },
        ].map((stat) => (
          <Card key={stat.label}>
            <CardContent className="pt-4 pb-3 px-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span>{stat.icon}</span>
                {stat.label}
              </div>
              <div className="text-2xl font-bold mt-1">{stat.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Section Cards */}
      <div className="grid gap-4 md:grid-cols-2">
        {info.sections.map((section) => (
          <Link
            key={section.name}
            href={`/${examType}${section.href}`}
          >
            <Card className="h-full transition-colors hover:border-primary/50 hover:bg-accent/50 cursor-pointer group">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{section.icon}</span>
                    <CardTitle className="text-lg group-hover:text-primary transition-colors">
                      {section.name}
                    </CardTitle>
                  </div>
                  <Badge variant="secondary">{section.weight}</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <CardDescription>{section.description}</CardDescription>
                <div className="mt-3">
                  <div className="flex justify-between text-xs text-muted-foreground mb-1">
                    <span>进度</span>
                    <span>0%</span>
                  </div>
                  <Progress value={0} className="h-1.5" />
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* Tips */}
      <Card className="bg-muted/50">
        <CardContent className="pt-4 pb-3 px-4">
          <div className="flex items-start gap-3">
            <span className="text-xl">💡</span>
            <div>
              <p className="font-medium text-sm">备考建议</p>
              <p className="text-sm text-muted-foreground mt-1">
                {examType === "cet4"
                  ? "四级阅读和听力各占 35%，是拿分大头。建议先从阅读开始，建立做题感觉后再加上听力和写作翻译。"
                  : examType === "cet6"
                  ? "六级难度比四级高一个台阶。阅读要练速度，听力要练精听，写作翻译要注意高级词汇和句式。"
                  : "雅思听力和阅读各40题，写作包含图表描述和议论文。建议多做真题，熟悉题型和时间节奏。"}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
