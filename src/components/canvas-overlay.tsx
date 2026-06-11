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
  tool?: "pen" | "eraser" | "highlight" | "underline"
  color?: string
  lineWidth?: number
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
  tool: externalTool,
  color: externalColor,
  lineWidth: externalLineWidth,
  onSave,
  initialData = [],
}: CanvasOverlayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const tool = externalTool || "pen"
  const color = externalColor || COLORS[0].value
  const lineWidth = externalLineWidth || 2
  const [isDrawing, setIsDrawing] = useState(false)
  const [paths, setPaths] = useState<DrawPath[]>(initialData)
  const [currentPath, setCurrentPath] = useState<Point[]>([])

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

      {/* 操作按钮 - 标注模式激活时显示 */}
      {active && (
        <div className="absolute bottom-2 right-2 z-20 flex gap-1">
          <button
            onClick={handleUndo}
            className="px-2 py-1 rounded text-xs bg-card border shadow-sm hover:bg-accent transition-all"
            title="撤销"
          >
            ↩ 撤销
          </button>
          <button
            onClick={handleClear}
            className="px-2 py-1 rounded text-xs bg-card border shadow-sm hover:bg-accent transition-all"
            title="清空"
          >
            🗑 清空
          </button>
        </div>
      )}
    </div>
  )
}
