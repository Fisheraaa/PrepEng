"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { SidebarNav } from "@/components/sidebar-nav"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"

const examLabels: Record<string, string> = {
  cet4: "CET-4 四级",
  cet6: "CET-6 六级",
  ielts: "IELTS 雅思",
}

const examColors: Record<string, string> = {
  cet4: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  cet6: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  ielts: "bg-purple-500/10 text-purple-400 border-purple-500/20",
}

export function ExamSidebarClient() {
  const pathname = usePathname()
  const examType = pathname.split("/")[1] || "cet4"

  return (
    <aside className="w-64 border-r border-border bg-sidebar flex flex-col">
      {/* Logo */}
      <div className="p-4">
        <Link href="/" className="flex items-center gap-2">
          <span className="text-xl">🎯</span>
          <span className="font-bold text-sm">PrepEng</span>
        </Link>
      </div>

      <Separator />

      {/* Exam Badge */}
      <div className="p-4">
        <Badge variant="outline" className={examColors[examType]}>
          {examLabels[examType] || examType}
        </Badge>
      </div>

      {/* Nav */}
      <div className="flex-1 px-3 pb-4">
        <SidebarNav examType={examType} />
      </div>

      {/* Footer */}
      <div className="border-t border-border p-4 space-y-2">
        <Link
          href="/settings"
          className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          <span>⚙️</span>
          <span>API 设置</span>
        </Link>
        <p className="text-xs text-muted-foreground">
          做题驱动 · 苏格拉底法
        </p>
      </div>
    </aside>
  )
}
