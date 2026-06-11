"use client"

import { useRef, useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface Point {
  x: number
  y: number
}

interface DrawPath {
  tool: "pen" | "eraser" | "highlight" | "underline"
  color: string
  lineWidth: number
  points: Point[]
}

interface CanvasOverlayProps {
  width: number
  height: number
  active: boolean
  onSave?: (data: DrawPath[]) => void
  initialData?: DrawPath[]
}

const COLORS = [
  { name: "红", value: "#ef4444" },
  { name: "蓝", value: "#3b82f6" },
  { name: "绿", value: "#22c55e" },
  { name: "黄", value: "#eab308" },
]

const LINE_WIDTHS = [2, 4, 6]

export function CanvasOverlay({
  width,
  height,
  active,
  onSave,
  initialData = [],
}: CanvasOverlayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [tool, setTool] = useState<"pen" | "eraser" | "highlight" | "underline">("pen")
  const [color, setColor] = useState(COLORS[0].value)
  const [lineWidth, setLineWidth] = useState(2)
  const [isDrawing, setIsDrawing] = useState(false)
  const [paths, setPaths] = useState<DrawPath[]>(initialData)
  const [currentPath, setCurrentPath] = useState<Point[]>([])
  const [showToolbar, setShowToolbar] = useState(false)

  // 绘制所有路径
  const redraw = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    ctx.clearRect(0, 0, canvas.width, canvas.height)

    for (const path of paths) {
      if (path.points.length < 2) continue
      ctx.beginPath()
      ctx.strokeStyle = path.tool === "eraser" ? "#0c0e12" : path.color
      ctx.lineWidth = path.lineWidth
      ctx.lineCap = "round"
      ctx.lineJoin = "round"

      if (path.tool === "highlight") {
        ctx.globalAlpha = 0.3
        ctx.lineWidth = path.lineWidth * 4
      } else if (path.tool === "underline") {
        ctx.setLineDash([6, 3])
      } else {
        ctx.globalAlpha = 1
        ctx.setLineDash([])
      }

      ctx.moveTo(path.points[0].x, path.points[0].y)
      for (let i = 1; i < path.points.length; i++) {
        ctx.lineTo(path.points[i].x, path.points[i].y)
      }
      ctx.stroke()
      ctx.globalAlpha = 1
      ctx.setLineDash([])
    }

    // 绘制当前路径
    if (currentPath.length >= 2) {
      ctx.beginPath()
      ctx.strokeStyle = tool === "eraser" ? "#0c0e12" : color
      ctx.lineWidth = tool === "highlight" ? lineWidth * 4 : lineWidth
      ctx.lineCap = "round"
      ctx.lineJoin = "round"
      if (tool === "highlight") ctx.globalAlpha = 0.3
      if (tool === "underline") ctx.setLineDash([6, 3])
      ctx.moveTo(currentPath[0].x, currentPath[0].y)
      for (let i = 1; i < currentPath.length; i++) {
        ctx.lineTo(currentPath[i].x, currentPath[i].y)
      }
      ctx.stroke()
      ctx.globalAlpha = 1
      ctx.setLineDash([])
    }
  }, [paths, currentPath, tool, color, lineWidth])

  useEffect(() => {
    redraw()
  }, [redraw])

  // 鼠标事件
  const getPos = (e: React.MouseEvent | React.TouchEvent): Point => {
    const canvas = canvasRef.current!
    const rect = canvas.getBoundingClientRect()
    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX
    const clientY = "touches" in e ? e.touches[0].clientY : e.clientY
    return {
      x: clientX - rect.left,
      y: clientY - rect.top,
    }
  }

  const handleStart = (e: React.MouseEvent | React.TouchEvent) => {
    if (!active) return
    setIsDrawing(true)
    setCurrentPath([getPos(e)])
  }

  const handleMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing || !active) return
    setCurrentPath((prev) => [...prev, getPos(e)])
  }

  const handleEnd = () => {
    if (!isDrawing || !active) return
    setIsDrawing(false)
    if (currentPath.length >= 2) {
      const newPath: DrawPath = {
        tool,
        color,
        lineWidth,
        points: currentPath,
      }
      setPaths((prev) => [...prev, newPath])
    }
    setCurrentPath([])
  }

  // 撤销
  const handleUndo = () => {
    setPaths((prev) => prev.slice(0, -1))
  }

  // 清空
  const handleClear = () => {
    setPaths([])
  }

  // 保存
  useEffect(() => {
    if (onSave && paths.length > 0) {
      const timer = setTimeout(() => onSave(paths), 2000)
      return () => clearTimeout(timer)
    }
  }, [paths, onSave])

  return (
    <div className="relative" style={{ width, height }}>
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        className={cn(
          "absolute inset-0",
          active ? "cursor-crosshair" : "pointer-events-none"
        )}
        style={{ zIndex: active ? 10 : -1 }}
        onMouseDown={handleStart}
        onMouseMove={handleMove}
        onMouseUp={handleEnd}
        onMouseLeave={handleEnd}
        onTouchStart={handleStart}
        onTouchMove={handleMove}
        onTouchEnd={handleEnd}
      />

      {/* 工具栏 - 标注模式激活时自动显示 */}
      {active && (
        <div className="sticky top-0 z-20 bg-card border rounded-lg p-3 shadow-lg space-y-3 mb-3">
          {/* 工具选择 */}
          <div className="flex gap-1">
            {(["pen", "highlight", "underline", "eraser"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTool(t)}
                className={cn(
                  "flex-1 py-1.5 rounded text-xs transition-all",
                  tool === t
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:bg-accent"
                )}
                title={t === "pen" ? "画笔" : t === "highlight" ? "高亮" : t === "underline" ? "下划线" : "橡皮擦"}
              >
                {t === "pen" ? "🖊" : t === "highlight" ? "🖍" : t === "underline" ? "📎" : "🧹"}
              </button>
            ))}
          </div>

          {/* 颜色选择 */}
          {tool !== "eraser" && (
            <div className="flex gap-1.5 justify-center">
              {COLORS.map((c) => (
                <button
                  key={c.value}
                  onClick={() => setColor(c.value)}
                  className={cn(
                    "w-6 h-6 rounded-full border-2 transition-all",
                    color === c.value ? "border-foreground scale-110" : "border-transparent"
                  )}
                  style={{ background: c.value }}
                  title={c.name}
                />
              ))}
            </div>
          )}

          {/* 线宽选择 */}
          <div className="flex gap-1.5 justify-center">
            {LINE_WIDTHS.map((w) => (
              <button
                key={w}
                onClick={() => setLineWidth(w)}
                className={cn(
                  "w-8 h-8 rounded flex items-center justify-center transition-all",
                  lineWidth === w
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:bg-accent"
                )}
              >
                <div
                  className="rounded-full"
                  style={{
                    width: w * 2,
                    height: w * 2,
                    background: tool === "eraser" ? "#888" : color,
                  }}
                />
              </button>
            ))}
          </div>

          {/* 操作按钮 */}
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={handleUndo} className="flex-1 text-xs">
              撤销
            </Button>
            <Button size="sm" variant="outline" onClick={handleClear} className="flex-1 text-xs">
              清空
            </Button>
          </div>

          {/* 开关 */}
          <Button
            size="sm"
            variant={active ? "default" : "outline"}
            onClick={() => setShowToolbar(false)}
            className="w-full text-xs"
          >
            {active ? "关闭标注模式" : "开启标注模式"}
          </Button>
        </div>
      )}
    </div>
  )
}
