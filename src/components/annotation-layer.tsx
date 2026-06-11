"use client"

import { useRef, useState, useEffect, useCallback } from "react"
import { cn } from "@/lib/utils"

// ============================================================
// 数据结构
// ============================================================

interface Point {
  x: number
  y: number
}

interface PenPath {
  id: string
  type: "pen"
  color: string
  width: number
  points: Point[]
}

interface TextMark {
  id: string
  type: "highlight" | "underline"
  color: string
  text: string
}

type Annotation = PenPath | TextMark

interface AnnotationLayerProps {
  containerRef: React.RefObject<HTMLElement | null>
  active: boolean
  tool: "pen" | "highlight" | "underline" | "eraser"
  color: string
  lineWidth: number
  onAnnotationsChange?: (annotations: Annotation[]) => void
  initialAnnotations?: Annotation[]
}

// ============================================================
// 工具函数
// ============================================================

function generateId() {
  return Math.random().toString(36).substr(2, 9)
}

// ============================================================
// 主组件
// ============================================================

export function AnnotationLayer({
  containerRef,
  active,
  tool,
  color,
  lineWidth,
  onAnnotationsChange,
  initialAnnotations = [],
}: AnnotationLayerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [annotations, setAnnotations] = useState<Annotation[]>(initialAnnotations)
  const [isDrawing, setIsDrawing] = useState(false)
  const [currentPenPath, setCurrentPenPath] = useState<Point[]>([])

  // 同步 canvas 大小
  useEffect(() => {
    const container = containerRef.current
    const canvas = canvasRef.current
    if (!container || !canvas) return

    const resizeObserver = new ResizeObserver(() => {
      canvas.width = container.scrollWidth
      canvas.height = container.scrollHeight
      redraw()
    })

    resizeObserver.observe(container)
    canvas.width = container.scrollWidth
    canvas.height = container.scrollHeight

    return () => resizeObserver.disconnect()
  }, [containerRef])

  // 重新绘制所有画笔路径
  const redraw = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    ctx.clearRect(0, 0, canvas.width, canvas.height)

    for (const ann of annotations) {
      if (ann.type === "pen") {
        drawPenPath(ctx, ann)
      }
    }

    // 绘制当前路径
    if (currentPenPath.length >= 2 && tool === "pen") {
      drawPenPath(ctx, {
        id: "current",
        type: "pen",
        color,
        width: lineWidth,
        points: currentPenPath,
      })
    }
  }, [annotations, currentPenPath, tool, color, lineWidth])

  useEffect(() => {
    redraw()
  }, [redraw])

  // 绘制画笔路径
  function drawPenPath(ctx: CanvasRenderingContext2D, path: PenPath) {
    if (path.points.length < 2) return
    ctx.beginPath()
    ctx.strokeStyle = path.color
    ctx.lineWidth = path.width
    ctx.lineCap = "round"
    ctx.lineJoin = "round"
    ctx.globalAlpha = 1
    ctx.moveTo(path.points[0].x, path.points[0].y)
    for (let i = 1; i < path.points.length; i++) {
      ctx.lineTo(path.points[i].x, path.points[i].y)
    }
    ctx.stroke()
  }

  // 获取相对于容器的坐标
  const getRelativePos = (e: MouseEvent | TouchEvent): Point => {
    const container = containerRef.current!
    const rect = container.getBoundingClientRect()
    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX
    const clientY = "touches" in e ? e.touches[0].clientY : e.clientY
    return {
      x: clientX - rect.left + container.scrollLeft,
      y: clientY - rect.top + container.scrollTop,
    }
  }

  // 鼠标事件处理
  useEffect(() => {
    const container = containerRef.current
    if (!container || !active) return

    const handleMouseDown = (e: MouseEvent) => {
      if (tool === "eraser") {
        const pos = getRelativePos(e)
        eraseAtPoint(pos)
      } else if (tool === "pen") {
        setIsDrawing(true)
        setCurrentPenPath([getRelativePos(e)])
      } else if (tool === "highlight" || tool === "underline") {
        handleTextMark(tool, color)
      }
    }

    const handleMouseMove = (e: MouseEvent) => {
      if (!isDrawing || tool !== "pen") return
      setCurrentPenPath((prev) => [...prev, getRelativePos(e)])
    }

    const handleMouseUp = () => {
      if (!isDrawing || tool !== "pen") return
      setIsDrawing(false)
      if (currentPenPath.length >= 2) {
        const newAnnotation: PenPath = {
          id: generateId(),
          type: "pen",
          color,
          width: lineWidth,
          points: currentPenPath,
        }
        setAnnotations((prev) => {
          const updated = [...prev, newAnnotation]
          onAnnotationsChange?.(updated)
          return updated
        })
      }
      setCurrentPenPath([])
    }

    container.addEventListener("mousedown", handleMouseDown)
    container.addEventListener("mousemove", handleMouseMove)
    container.addEventListener("mouseup", handleMouseUp)
    container.addEventListener("mouseleave", handleMouseUp)

    return () => {
      container.removeEventListener("mousedown", handleMouseDown)
      container.removeEventListener("mousemove", handleMouseMove)
      container.removeEventListener("mouseup", handleMouseUp)
      container.removeEventListener("mouseleave", handleMouseUp)
    }
  }, [containerRef, active, tool, color, lineWidth, isDrawing, currentPenPath])

  // 处理文字标记（高亮/下划线）
  const handleTextMark = (type: "highlight" | "underline", markColor: string) => {
    const selection = window.getSelection()
    if (!selection || selection.isCollapsed) return

    const selectedText = selection.toString().trim()
    if (!selectedText) return

    const range = selection.getRangeAt(0)

    // 创建标记元素
    const mark = document.createElement("span")
    mark.dataset.annotationId = generateId()
    mark.dataset.annotationType = type

    if (type === "highlight") {
      // 高亮：背景色，文字保持原色
      mark.style.backgroundColor = markColor + "40"
      mark.style.borderRadius = "3px"
      mark.style.padding = "2px 0"
    } else {
      // 下划线：只加下划线，不改变文字颜色
      mark.style.borderBottom = `2.5px solid ${markColor}`
      mark.style.paddingBottom = "2px"
    }

    try {
      range.surroundContents(mark)
    } catch {
      // 如果选区跨越多个元素
      const span = mark.cloneNode(false) as HTMLElement
      span.textContent = selectedText
      range.deleteContents()
      range.insertNode(span)
    }

    // 保存标注记录
    const newAnnotation: TextMark = {
      id: mark.dataset.annotationId!,
      type,
      color: markColor,
      text: selectedText,
    }

    setAnnotations((prev) => {
      const updated = [...prev, newAnnotation]
      onAnnotationsChange?.(updated)
      return updated
    })

    selection.empty()
  }

  // 橡皮擦：删除点击位置的标注
  const eraseAtPoint = (pos: Point) => {
    // 检查画笔路径
    for (const ann of annotations) {
      if (ann.type === "pen") {
        for (let i = 0; i < ann.points.length - 1; i++) {
          const p1 = ann.points[i]
          const p2 = ann.points[i + 1]
          const dist = pointToLineDistance(pos, p1, p2)
          if (dist < 10) {
            setAnnotations((prev) => {
              const updated = prev.filter((a) => a.id !== ann.id)
              onAnnotationsChange?.(updated)
              return updated
            })
            return
          }
        }
      }
    }

    // 检查文字标记
    const container = containerRef.current
    if (container) {
      const marks = container.querySelectorAll("[data-annotation-id]")
      marks.forEach((mark) => {
        const rect = mark.getBoundingClientRect()
        const containerRect = container.getBoundingClientRect()
        const markPos = {
          x: rect.left - containerRect.left + container.scrollLeft,
          y: rect.top - containerRect.top + container.scrollTop,
          width: rect.width,
          height: rect.height,
        }
        if (
          pos.x >= markPos.x &&
          pos.x <= markPos.x + markPos.width &&
          pos.y >= markPos.y &&
          pos.y <= markPos.y + markPos.height
        ) {
          const annId = (mark as HTMLElement).dataset.annotationId
          const text = mark.textContent || ""
          const parent = mark.parentNode
          if (parent) {
            parent.replaceChild(document.createTextNode(text), mark)
            parent.normalize()
          }
          setAnnotations((prev) => {
            const updated = prev.filter((a) => a.id !== annId)
            onAnnotationsChange?.(updated)
            return updated
          })
        }
      })
    }
  }

  function pointToLineDistance(point: Point, lineStart: Point, lineEnd: Point): number {
    const A = point.x - lineStart.x
    const B = point.y - lineStart.y
    const C = lineEnd.x - lineStart.x
    const D = lineEnd.y - lineStart.y

    const dot = A * C + B * D
    const lenSq = C * C + D * D
    let param = -1
    if (lenSq !== 0) param = dot / lenSq

    let xx: number, yy: number
    if (param < 0) {
      xx = lineStart.x
      yy = lineStart.y
    } else if (param > 1) {
      xx = lineEnd.x
      yy = lineEnd.y
    } else {
      xx = lineStart.x + param * C
      yy = lineStart.y + param * D
    }

    return Math.sqrt((point.x - xx) ** 2 + (point.y - yy) ** 2)
  }

  // 撤销
  const handleUndo = () => {
    setAnnotations((prev) => {
      const last = prev[prev.length - 1]
      if (last && last.type !== "pen") {
        const container = containerRef.current
        if (container) {
          const mark = container.querySelector(`[data-annotation-id="${last.id}"]`)
          if (mark) {
            const text = mark.textContent || ""
            const parent = mark.parentNode
            if (parent) {
              parent.replaceChild(document.createTextNode(text), mark)
              parent.normalize()
            }
          }
        }
      }
      const updated = prev.slice(0, -1)
      onAnnotationsChange?.(updated)
      return updated
    })
  }

  // 清空
  const handleClear = () => {
    const container = containerRef.current
    if (container) {
      const marks = container.querySelectorAll("[data-annotation-id]")
      marks.forEach((mark) => {
        const text = mark.textContent || ""
        const parent = mark.parentNode
        if (parent) {
          parent.replaceChild(document.createTextNode(text), mark)
          parent.normalize()
        }
      })
    }
    setAnnotations([])
    onAnnotationsChange?.([])
  }

  return (
    <>
      <canvas
        ref={canvasRef}
        className={cn(
          "absolute inset-0 pointer-events-none",
          active && tool === "pen" && "pointer-events-auto cursor-crosshair",
          active && tool === "eraser" && "pointer-events-auto cursor-pointer"
        )}
        style={{ zIndex: active ? 10 : -1 }}
      />

      {active && (
        <div className="fixed bottom-6 right-6 z-50 flex gap-2">
          <button
            onClick={handleUndo}
            className="px-4 py-2 rounded-lg text-sm bg-card border shadow-lg hover:bg-accent transition-all font-medium"
          >
            ↩ 撤销
          </button>
          <button
            onClick={handleClear}
            className="px-4 py-2 rounded-lg text-sm bg-card border shadow-lg hover:bg-accent transition-all font-medium"
          >
            🗑 清空
          </button>
        </div>
      )}
    </>
  )
}

// ============================================================
// 存档管理
// ============================================================

export interface AnnotationSaveData {
  name: string
  annotations: Annotation[]
  createdAt: number
  updatedAt: number
}

const STORAGE_PREFIX = "annotation-"

export function getStorageKey(examType: string, paperId: string, sectionIdx: number): string {
  return `${STORAGE_PREFIX}${examType}-${paperId}-${sectionIdx}`
}

export function saveAnnotations(
  examType: string,
  paperId: string,
  sectionIdx: number,
  annotations: Annotation[],
  name?: string
): void {
  try {
    const key = getStorageKey(examType, paperId, sectionIdx)
    const existing = loadAnnotationSaveData(examType, paperId, sectionIdx)

    const data: AnnotationSaveData = {
      name: name || existing?.name || `存档 ${new Date().toLocaleString()}`,
      annotations,
      createdAt: existing?.createdAt || Date.now(),
      updatedAt: Date.now(),
    }
    localStorage.setItem(key, JSON.stringify(data))
  } catch {}
}

export function loadAnnotationSaveData(
  examType: string,
  paperId: string,
  sectionIdx: number
): AnnotationSaveData | null {
  try {
    const key = getStorageKey(examType, paperId, sectionIdx)
    const raw = localStorage.getItem(key)
    if (!raw) return null
    return JSON.parse(raw)
  } catch {
    return null
  }
}

export function loadAnnotations(
  examType: string,
  paperId: string,
  sectionIdx: number
): Annotation[] {
  const data = loadAnnotationSaveData(examType, paperId, sectionIdx)
  return data?.annotations || []
}

export function deleteAnnotations(
  examType: string,
  paperId: string,
  sectionIdx: number
): void {
  try {
    const key = getStorageKey(examType, paperId, sectionIdx)
    localStorage.removeItem(key)
  } catch {}
}

export function hasAnnotations(
  examType: string,
  paperId: string,
  sectionIdx: number
): boolean {
  try {
    const key = getStorageKey(examType, paperId, sectionIdx)
    return localStorage.getItem(key) !== null
  } catch {
    return false
  }
}

export function getAnnotationsForPaper(
  examType: string,
  paperId: string
): Array<{ sectionIdx: number; data: AnnotationSaveData }> {
  try {
    const result: Array<{ sectionIdx: number; data: AnnotationSaveData }> = []
    for (let i = 0; i < 10; i++) {
      const data = loadAnnotationSaveData(examType, paperId, i)
      if (data) {
        result.push({ sectionIdx: i, data })
      }
    }
    return result
  } catch {
    return []
  }
}

// 重命名草稿
export function renameAnnotationSave(
  examType: string,
  paperId: string,
  sectionIdx: number,
  draftIdx: number,
  newName: string
): void {
  try {
    const key = `${getStorageKey(examType, paperId, sectionIdx)}-${draftIdx}`
    const raw = localStorage.getItem(key)
    if (raw) {
      const data: AnnotationSaveData = JSON.parse(raw)
      data.name = newName
      localStorage.setItem(key, JSON.stringify(data))
    }
  } catch {}
}

// 删除草稿
export function deleteAnnotationDraft(
  examType: string,
  paperId: string,
  sectionIdx: number,
  draftIdx: number
): void {
  try {
    const key = `${getStorageKey(examType, paperId, sectionIdx)}-${draftIdx}`
    localStorage.removeItem(key)
  } catch {}
}

// 生成默认草稿名
export function generateDraftName(
  examType: string,
  paperId: string,
  sectionIdx: number
): string {
  const existing = getAnnotationsForPaper(examType, paperId)
  const sectionDrafts = existing.filter(a => a.sectionIdx === sectionIdx)
  return `草稿${sectionDrafts.length + 1}`
}
