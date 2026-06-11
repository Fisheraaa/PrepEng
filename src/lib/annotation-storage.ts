// ============================================================
// 标注数据存储 - 支持命名存档
// ============================================================

interface Point {
  x: number
  y: number
}

interface DrawPath {
  id: string
  tool: "pen" | "eraser" | "highlight" | "underline"
  color: string
  lineWidth: number
  points: Point[]
}

interface AnnotationData {
  name: string
  paths: DrawPath[]
  createdAt: number
  updatedAt: number
}

const STORAGE_PREFIX = "annotation-"

function getKey(examType: string, paperId: string, sectionIdx: number): string {
  return `${STORAGE_PREFIX}${examType}-${paperId}-${sectionIdx}`
}

// 生成默认存档名
export function generateDefaultName(paperTitle: string, sectionTitle?: string): string {
  const now = new Date()
  const date = `${now.getMonth() + 1}/${now.getDate()} ${now.getHours()}:${String(now.getMinutes()).padStart(2, '0')}`
  return sectionTitle ? `${paperTitle} - ${sectionTitle} (${date})` : `${paperTitle} (${date})`
}

// 保存标注数据
export function saveAnnotation(
  examType: string,
  paperId: string,
  sectionIdx: number,
  paths: DrawPath[],
  name?: string
): void {
  try {
    const key = getKey(examType, paperId, sectionIdx)
    const existing = loadAnnotationData(examType, paperId, sectionIdx)

    const data: AnnotationData = {
      name: name || existing?.name || `存档 ${new Date().toLocaleString()}`,
      paths,
      createdAt: existing?.createdAt || Date.now(),
      updatedAt: Date.now(),
    }
    localStorage.setItem(key, JSON.stringify(data))
  } catch {}
}

// 加载标注数据（完整）
export function loadAnnotationData(
  examType: string,
  paperId: string,
  sectionIdx: number
): AnnotationData | null {
  try {
    const key = getKey(examType, paperId, sectionIdx)
    const raw = localStorage.getItem(key)
    if (!raw) return null
    return JSON.parse(raw)
  } catch {
    return null
  }
}

// 加载标注路径
export function loadAnnotation(
  examType: string,
  paperId: string,
  sectionIdx: number
): DrawPath[] | null {
  const data = loadAnnotationData(examType, paperId, sectionIdx)
  return data?.paths || null
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

// 重命名存档
export function renameAnnotation(
  examType: string,
  paperId: string,
  sectionIdx: number,
  newName: string
): void {
  try {
    const data = loadAnnotationData(examType, paperId, sectionIdx)
    if (data) {
      data.name = newName
      const key = getKey(examType, paperId, sectionIdx)
      localStorage.setItem(key, JSON.stringify(data))
    }
  } catch {}
}

// 获取指定试卷的所有标注存档
export function getAnnotationsForPaper(
  examType: string,
  paperId: string
): Array<{ sectionIdx: number; data: AnnotationData }> {
  try {
    const result: Array<{ sectionIdx: number; data: AnnotationData }> = []
    // 遍历可能的 section index (0-10)
    for (let i = 0; i < 10; i++) {
      const data = loadAnnotationData(examType, paperId, i)
      if (data) {
        result.push({ sectionIdx: i, data })
      }
    }
    return result
  } catch {
    return []
  }
}
