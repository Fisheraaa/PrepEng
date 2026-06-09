"use client"

import { useState, useCallback } from "react"
import { usePathname } from "next/navigation"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { AudioPlayer } from "@/components/audio-player"
import { getListeningPapers, type ListeningPaper } from "@/lib/listening-data"

export default function ListenPage() {
  const pathname = usePathname()
  const examType = (pathname.split("/")[1] || "cet4") as "cet4" | "cet6"

  const [selected, setSelected] = useState<ListeningPaper | null>(null)

  const papers = getListeningPapers(examType)

  // 按年份分组
  const grouped = papers.reduce<Record<number, ListeningPaper[]>>((acc, p) => {
    if (!acc[p.year]) acc[p.year] = []
    acc[p.year].push(p)
    return acc
  }, {})
  const years = Object.keys(grouped).map(Number).sort((a, b) => b - a)

  // --- 播放界面 ---
  if (selected) {
    return (
      <div className="p-8 max-w-3xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h1 className="text-2xl font-bold">🎧 听力练习</h1>
            <p className="text-sm text-muted-foreground">{selected.title}</p>
          </div>
          <Button variant="outline" size="sm" onClick={() => setSelected(null)}>
            返回列表
          </Button>
        </div>

        <Card>
          <CardContent className="pt-6 space-y-4">
            <AudioPlayer src={selected.audio_url} title={selected.title} />
          </CardContent>
        </Card>

        <Separator />

        {/* 听力技巧 */}
        <Card className="bg-muted/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">💡 听力练习技巧</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-2">
            <p><strong>第一遍</strong>：正常速度听，做题。不要暂停，模拟真实考试。</p>
            <p><strong>第二遍</strong>：0.75x 速度精听，对照答案，标出没听懂的地方。</p>
            <p><strong>第三遍</strong>：1x 速度跟读，模仿语音语调，注意连读和弱读。</p>
            <p className="text-xs mt-2">使用 ⏪⏩ 按钮可以快退/快进 10 秒，倍速按钮切换播放速度。</p>
          </CardContent>
        </Card>

        {/* 题型说明 */}
        <div className="grid gap-3 md:grid-cols-3">
          {[
            { name: "短篇新闻", count: "7 题", desc: "3段新闻，每段2-3题", icon: "📰", tip: "抓首句，首句通常是主题" },
            { name: "长对话", count: "8 题", desc: "2段对话，每段4题", icon: "💬", tip: "注意转折词 but/however" },
            { name: "听力篇章", count: "10 题", desc: "3段短文，每段3-4题", icon: "📄", tip: "听清首尾，抓关键词" },
          ].map((s) => (
            <Card key={s.name}>
              <CardHeader className="pb-1">
                <div className="flex items-center gap-2">
                  <span className="text-lg">{s.icon}</span>
                  <CardTitle className="text-sm">{s.name}</CardTitle>
                </div>
                <CardDescription className="text-xs">{s.count} · {s.desc}</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">{s.tip}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  // --- 列表界面 ---
  return (
    <div className="p-8 max-w-3xl mx-auto space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-bold">🎧 听力练习</h1>
        <p className="text-muted-foreground">
          选择一套真题听力开始练习。支持调速、快进快退。
        </p>
      </div>

      {/* 音频列表 */}
      <div className="space-y-4">
        {years.map((year) => (
          <div key={year}>
            <h2 className="text-sm font-semibold text-muted-foreground mb-2">
              {year} 年
            </h2>
            <div className="grid gap-2 md:grid-cols-2">
              {grouped[year].map((paper) => (
                <Card
                  key={paper.id}
                  className="cursor-pointer hover:border-primary/50 hover:bg-accent/50 transition-colors"
                  onClick={() => setSelected(paper)}
                >
                  <CardContent className="pt-4 pb-3 px-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-xl">🎧</span>
                      <div>
                        <p className="text-sm font-medium">{paper.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {paper.month}月{paper.session ? ` · 第${paper.session}套` : ""}
                        </p>
                      </div>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      ▶ 播放
                    </Badge>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        ))}
      </div>

      {papers.length === 0 && (
        <Card className="bg-muted/50">
          <CardContent className="pt-6 pb-4 text-center">
            <span className="text-4xl">📭</span>
            <p className="text-muted-foreground mt-2">
              还没有{examType === "cet4" ? "四级" : "六级"}听力音频。
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              把 MP3 文件放到 <code>public/{examType}/audio/</code> 目录下
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
