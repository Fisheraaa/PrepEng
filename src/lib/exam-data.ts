import type { ExamPaper, ExamType, ChoiceQuestion } from "@/types/exam"

// ============================================================
// 题库数据加载 — 从 JSON 文件加载
// ============================================================

// CET-6 阅读数据（从 Word 文档提取）
import cet6ReadingData from "@/data/cet6-reading.json"

interface ExtractedQuestion {
  id: string
  content: string
  options: string[]
  answer: string
  explanation: string
}

interface ExtractedPassage {
  passage: string
  questions: ExtractedQuestion[]
}

interface ExtractedPaper {
  id: string
  exam_type: string
  year: number
  month: number
  session?: number
  title: string
  passages: ExtractedPassage[]
}

// 转换为 ExamPaper 格式
function convertToExamPaper(data: ExtractedPaper): ExamPaper {
  return {
    id: data.id,
    exam_type: data.exam_type as ExamType,
    year: data.year,
    month: data.month,
    session: data.session,
    title: data.title,
    total_time: 40, // 阅读40分钟
    sections: data.passages.map((p, idx) => ({
      type: "reading" as const,
      subtype: "careful_reading" as const,
      title: `Passage ${idx + 1}`,
      time_limit: 20,
      passage: p.passage,
      questions: p.questions.map((q) => ({
        id: q.id,
        type: "choice" as const,
        content: q.content,
        options: q.options,
        answer: q.answer || "A", // 默认A，待补充答案
        explanation: q.explanation || "暂无解析",
      })),
    })),
  }
}

// 加载所有题库
const allPapers: Record<ExamType, ExamPaper[]> = {
  cet4: [], // CET-4 暂无数据（PDF是扫描版）
  cet6: (cet6ReadingData as ExtractedPaper[]).map(convertToExamPaper),
  ielts: [],
}

export function getExamPapers(examType: ExamType): ExamPaper[] {
  return allPapers[examType] ?? []
}

export function getExamPaper(examType: ExamType, paperId: string): ExamPaper | undefined {
  return allPapers[examType]?.find((p) => p.id === paperId)
}

// 获取可用的试卷列表（用于选题界面）
export function getAvailablePapers(examType: ExamType) {
  return getExamPapers(examType).map((p) => ({
    id: p.id,
    title: p.title,
    year: p.year,
    month: p.month,
    session: p.session,
    questionCount: p.sections.reduce((acc, s) => acc + s.questions.length, 0),
  }))
}
