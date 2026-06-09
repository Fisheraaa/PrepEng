import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

const exams = [
  {
    id: "cet4",
    name: "CET-4",
    subtitle: "大学英语四级",
    description: "总分 710，425 过线。听力 35% + 阅读 35% + 写作 15% + 翻译 15%",
    difficulty: "基础",
    color: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    icon: "📗",
  },
  {
    id: "cet6",
    name: "CET-6",
    subtitle: "大学英语六级",
    description: "总分 710，425 过线。题型与四级相同，难度更高",
    difficulty: "进阶",
    color: "bg-blue-500/10 text-blue-400 border-blue-500/20",
    icon: "📘",
  },
  {
    id: "ielts",
    name: "IELTS",
    subtitle: "雅思考试",
    description: "总分 9.0。听力 + 阅读 + 写作 + 口语，各 9 分",
    difficulty: "高级",
    color: "bg-purple-500/10 text-purple-400 border-purple-500/20",
    icon: "📕",
  },
]

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen">
      {/* Header */}
      <header className="border-b border-border px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🎯</span>
            <div>
              <h1 className="text-xl font-bold tracking-tight">PrepEng</h1>
              <p className="text-sm text-muted-foreground">
                苏格拉底式英语备考
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/settings">
              <Button variant="outline" size="sm">
                ⚙️ API 设置
              </Button>
            </Link>
            <Badge variant="outline" className="text-xs">
              Beta
            </Badge>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="flex-1 px-6 py-12">
        <div className="max-w-5xl mx-auto space-y-8">
          {/* Hero */}
          <div className="space-y-2">
            <h2 className="text-3xl font-bold tracking-tight">
              选择你的考试
            </h2>
            <p className="text-muted-foreground text-lg">
              不是先学再做题，而是<strong className="text-foreground">先做题再挖</strong>。
              做错了？我会用苏格拉底法帮你搞清楚为什么。
            </p>
          </div>

          {/* Exam Cards */}
          <div className="grid gap-6 md:grid-cols-3">
            {exams.map((exam) => (
              <Link key={exam.id} href={`/${exam.id}`}>
                <Card className="h-full transition-colors hover:border-primary/50 hover:bg-accent/50 cursor-pointer group">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <span className="text-3xl">{exam.icon}</span>
                      <Badge variant="outline" className={exam.color}>
                        {exam.difficulty}
                      </Badge>
                    </div>
                    <CardTitle className="text-xl group-hover:text-primary transition-colors">
                      {exam.name}
                    </CardTitle>
                    <CardDescription>{exam.subtitle}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">
                      {exam.description}
                    </p>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>

          {/* How it works */}
          <div className="mt-16 space-y-6">
            <h3 className="text-xl font-semibold">怎么用？</h3>
            <div className="grid gap-4 md:grid-cols-4">
              {[
                { step: "1", title: "做题", desc: "先做真题，不看讲解" },
                { step: "2", title: "犯错", desc: "做错了很正常，这是学习的起点" },
                { step: "3", title: "深挖", desc: "AI 追问你的思路，找到理解漏洞" },
                { step: "4", title: "掌握", desc: "错题归档，间隔复习，永久记忆" },
              ].map((item) => (
                <div key={item.step} className="space-y-2">
                  <div className="flex items-center gap-3">
                    <span className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary text-sm font-bold">
                      {item.step}
                    </span>
                    <span className="font-medium">{item.title}</span>
                  </div>
                  <p className="text-sm text-muted-foreground pl-11">
                    {item.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between text-sm text-muted-foreground">
          <span>PrepEng v0.1</span>
          <span>做题驱动 · 苏格拉底法 · 永久记忆</span>
        </div>
      </footer>
    </div>
  )
}
