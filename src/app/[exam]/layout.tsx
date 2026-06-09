import { ExamSidebarClient } from "./sidebar-client"

export default function ExamLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex min-h-screen">
      <ExamSidebarClient />
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  )
}
