"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"

interface NavItem {
  label: string
  href: string
  icon: string
  description: string
  examTypes?: string[] // 仅显示在指定考试类型中，不设置则全部显示
}

const navItems: NavItem[] = [
  { label: "仪表盘", href: "", icon: "◈", description: "进度概览" },
  { label: "听力", href: "/listen", icon: "🎧", description: "真题听力练习" },
  { label: "阅读", href: "/read", icon: "▣", description: "阅读理解精练" },
  { label: "写作", href: "/write", icon: "🖋", description: "AI 批改作文" },
  { label: "翻译", href: "/translate", icon: "▤", description: "汉译英练习", examTypes: ["cet4", "cet6"] },
  { label: "口语", href: "/speak", icon: "🗣", description: "口语练习", examTypes: ["ielts"] },
  { label: "错题本", href: "/review", icon: "◔", description: "复习错题" },
]

interface SidebarNavProps {
  examType: string
}

export function SidebarNav({ examType }: SidebarNavProps) {
  const pathname = usePathname()

  // 根据考试类型过滤导航项
  const filteredItems = navItems.filter(item =>
    !item.examTypes || item.examTypes.includes(examType)
  )

  return (
    <nav className="space-y-1">
      {filteredItems.map((item) => {
        const fullHref = `/${examType}${item.href}`
        const isActive =
          item.href === ""
            ? pathname === `/${examType}`
            : pathname.startsWith(fullHref)

        return (
          <Link
            key={item.href}
            href={fullHref}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors",
              isActive
                ? "bg-primary/10 text-primary font-medium"
                : "text-muted-foreground hover:bg-accent hover:text-foreground"
            )}
          >
            <span className="text-lg">{item.icon}</span>
            <div>
              <div>{item.label}</div>
              <div className="text-xs text-muted-foreground">
                {item.description}
              </div>
            </div>
          </Link>
        )
      })}
    </nav>
  )
}
