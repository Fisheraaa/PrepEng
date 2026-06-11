"use client"

import { useRef, useState, useEffect, useCallback } from "react"
import { cn } from "@/lib/utils"

interface Point {
  x: number
  y: number
  width?: number
  height?: number
}

interface DrawPath {
  id: string
  tool: "pen" | "highlight" | "underline" | "eraser"
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

function generateId() {
  return Math.random().toString(36).substr(2, 9)
}

export function CanvasOverlay({
  width,
  height,
  active,
  tool = "pen",
  color = "#ef4444",
  lineWidth = 2,
  onSave,
  initialData = [],
}: CanvasOverlayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
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
      ctx.lineCap = "round"
      ctx.lineJoin = "round"

      if (path.tool === "highlight") {
        // 高亮：半透明粗线
        ctx.strokeStyle = path.color
        ctx.globalAlpha = 0.3
        ctx.lineWidth = 20
        ctx.moveTo(path.points[0].x, path.points[0].y)
        for (let i = 1; i < path.points.length; i++) {
          ctx.lineTo(path.points[i].x, path.points[i].y)
        }
        ctx.stroke()
      } else if (path.tool === "underline") {
        // 下划线：虚线
        ctx.strokeStyle = path.color
        ctx.globalAlpha = 1
        ctx.lineWidth = 2
        ctx.setLineDash([6, 3])
        ctx.moveTo(path.points[0].x, path.points[0].y)
        for (let i = 1; i < path.points.length; i++) {
          ctx.lineTo(path.points[i].x, path.points[i].y)
        }
        ctx.stroke()
        ctx.setLineDash([])
      } else if (path.tool === "pen") {
        // 画笔：实线
        ctx.strokeStyle = path.color
        ctx.globalAlpha = 1
        ctx.lineWidth = path.lineWidth
        ctx.moveTo(path.points[0].x, path.points[0].y)
        for (let i = 1; i < path.points.length; i++) {
          ctx.lineTo(path.points[i].x, path.points[i].y)
        }
        ctx.stroke()
      }
      ctx.globalAlpha = 1
    }

    // 绘制当前路径
    if (currentPath.length >= 2 && tool !== "eraser") {
      ctx.beginPath()
      ctx.lineCap = "round"
      ctx.lineJoin = "round"

      if (tool === "highlight") {
        ctx.strokeStyle = color
        ctx.globalAlpha = 0.3
        ctx.lineWidth = 20
      } else if (tool === "underline") {
        ctx.strokeStyle = color
        ctx.globalAlpha = 1
        ctx.lineWidth = 2
        ctx.setLineDash([6, 3])
      } else {
        ctx.strokeStyle = color
        ctx.globalAlpha = 1
        ctx.lineWidth = lineWidth
      }

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

  // 检查点击位置是否在某条线上
  const findPathAtPoint = (point: Point): DrawPath | null => {
    const threshold = 10 // 点击容差

    for (const path of paths) {
      for (let i = 0; i < path.points.length - 1; i++) {
        const p1 = path.points[i]
        const p2 = path.points[i + 1]

        // 计算点到线段的距离
        const A = point.x - p1.x
        const B = point.y - p1.y
        const C = p2.x - p1.x
        const D = p2.y - p1.y

        const dot = A * C + B * D
        const lenSq = C * C + D * D
        let param = -1
        if (lenSq !== 0) param = dot / lenSq

        let xx, yy
        if (param < 0) {
          xx = p1.x
          yy = p1.y
        } else if (param > 1) {
          xx = p2.x
          yy = p2.y
        } else {
          xx = p1.x + param * C
          yy = p1.y + param * D
        }

        const dist = Math.sqrt((point.x - xx) ** 2 + (point.y - yy) ** 2)
        if (dist < threshold) {
          return path
        }
      }
    }
    return null
  }

  const handleStart = (e: React.MouseEvent | React.TouchEvent) => {
    if (!active) return
    const pos = getPos(e)

    if (tool === "eraser") {
      // 橡皮擦：点击删除整条线
      const pathToDelete = findPathAtPoint(pos)
      if (pathToDelete) {
        setPaths((prev) => prev.filter((p) => p.id !== pathToDelete.id))
      }
    } else {
      setIsDrawing(true)
      setCurrentPath([pos])
    }
  }

  const handleMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing || !active || tool === "eraser") return
    setCurrentPath((prev) => [...prev, getPos(e)])
  }

  const handleEnd = () => {
    if (!isDrawing || !active) return
    setIsDrawing(false)
    if (currentPath.length >= 2) {
      const newPath: DrawPath = {
        id: generateId(),
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

  // 自动保存
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
          active ? (tool === "eraser" ? "cursor-pointer" : "cursor-crosshair") : "pointer-events-none"
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
