// ============================================================
// 标注数据存储
// ============================================================

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

interface AnnotationData {
  paths: DrawPath[]
  savedAt: number
}

const STORAGE_PREFIX = "annotation-"

function getKey(examType: string, paperId: string, sectionIdx: number): string {
  return `${STORAGE_PREFIX}${examType}-${paperId}-${sectionIdx}`
}

// 保存标注数据
export function saveAnnotation(
  examType: string,
  paperId: string,
  sectionIdx: number,
  paths: DrawPath[]
): void {
  try {
    const key = getKey(examType, paperId, sectionIdx)
    const data: AnnotationData = {
      paths,
      savedAt: Date.now(),
    }
    localStorage.setItem(key, JSON.stringify(data))
  } catch {}
}

// 加载标注数据
export function loadAnnotation(
  examType: string,
  paperId: string,
  sectionIdx: number
): DrawPath[] | null {
  try {
    const key = getKey(examType, paperId, sectionIdx)
    const raw = localStorage.getItem(key)
    if (!raw) return null
    const data: AnnotationData = JSON.parse(raw)
    return data.paths || null
  } catch {
    return null
  }
}

// 删除标注数据
export function deleteAnnotation(
  examType: string,
  paperId: string,
  sectionIdx: number
): void {
  try {
    const key = getKey(examType, paperId, sectionIdx)
    localStorage.removeItem(key)
  } catch {}
}

// 检查是否有标注存档
export function hasAnnotation(
  examType: string,
  paperId: string,
  sectionIdx: number
): boolean {
  try {
    const key = getKey(examType, paperId, sectionIdx)
    return localStorage.getItem(key) !== null
  } catch {
    return false
  }
}

// 获取所有标注存档列表
export function listAnnotations(examType: string): Array<{
  paperId: string
  sectionIdx: number
  savedAt: number
}> {
  try {
    const result: Array<{ paperId: string; sectionIdx: number; savedAt: number }> = []
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (!key || !key.startsWith(STORAGE_PREFIX)) continue
      if (!key.includes(examType)) continue
      const raw = localStorage.getItem(key)
      if (!raw) continue
      try {
        const data: AnnotationData = JSON.parse(raw)
        const parts = key.replace(STORAGE_PREFIX, "").split("-")
        if (parts.length >= 3) {
          result.push({
            paperId: parts.slice(0, -1).join("-"),
            sectionIdx: parseInt(parts[parts.length - 1]),
            savedAt: data.savedAt,
          })
        }
      } catch {}
    }
    return result
  } catch {
    return []
  }
}
