import { ExamSidebarClient } from "./sidebar-client"

export default function ExamLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex h-screen overflow-hidden">
      <ExamSidebarClient />
      <main className="flex-1 overflow-y-auto">{children}</main>
    </div>
  )
}
