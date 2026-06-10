import type { ExamPaper, ExamType } from "@/types/exam"

// ============================================================
// 题库数据加载
// ============================================================

interface ExtractedSection {
  type: string
  subtype?: string
  title?: string
  passage?: string
  bank?: string[]
  paragraphs?: Record<string, string>
  questions: {
    id: string
    content: string
    options?: string[]
    answer: string
    explanation: string
  }[]
  prompt?: string
  word_limit?: number
  source_text?: string
  reference_translation?: string
}

interface ExtractedPaper {
  id: string
  exam_type: string
  year: number
  month: number
  session?: number
  title: string
  sections: ExtractedSection[]
}

// 从 JSON 加载
import examData from "@/data/exam-papers.json"

function convertPaper(data: ExtractedPaper): ExamPaper {
  return {
    id: data.id,
    exam_type: data.exam_type as ExamType,
    year: data.year,
    month: data.month,
    session: data.session,
    title: data.title,
    total_time: 125,
    sections: data.sections.map((s) => ({
      type: s.type as "reading" | "writing" | "translation" | "listening",
      subtype: s.subtype as "careful_reading" | "banked_cloze" | "matching" | undefined,
      title: s.title || "",
      passage: s.passage,
      bank: s.bank,  // 词库（选词填空用）
      questions: (s.questions || []).map((q) => ({
        id: q.id,
        type: "choice" as const,
        content: q.content,
        options: q.options || [],
        answer: q.answer || "A",
        explanation: q.explanation || "暂无解析",
      })),
    })),
  }
}

// 加载所有题库，按考试类型分组
const allPapers: Record<ExamType, ExamPaper[]> = {
  cet4: [],
  cet6: [],
  ielts: [],
}

for (const paper of examData as ExtractedPaper[]) {
  const et = paper.exam_type as ExamType
  if (et === "cet4" || et === "cet6") {
    allPapers[et].push(convertPaper(paper))
  }
}

// 按时间倒序排列
for (const et of ["cet4", "cet6", "ielts"] as ExamType[]) {
  allPapers[et].sort((a, b) => {
    if (a.year !== b.year) return b.year - a.year
    if (a.month !== b.month) return b.month - a.month
    return (b.session || 0) - (a.session || 0)
  })
}

export function getExamPapers(examType: ExamType): ExamPaper[] {
  return allPapers[examType] ?? []
}

export function getExamPaper(examType: ExamType, paperId: string): ExamPaper | undefined {
  return allPapers[examType]?.find((p) => p.id === paperId)
}

export function getAvailablePapers(examType: ExamType) {
  return getExamPapers(examType).map((p) => ({
    id: p.id,
    title: p.title,
    year: p.year,
    month: p.month,
    session: p.session,
    questionCount: p.sections.reduce((acc, s) => acc + s.questions.length, 0),
    sectionTypes: [...new Set(p.sections.map((s) => s.type))],
  }))
}

// ============================================================
// 样例数据（写作/翻译独立练习用）
// ============================================================

export const sampleCET4Writing: ExamPaper = {
  id: "cet4-sample-writing",
  exam_type: "cet4",
  year: 2024,
  month: 6,
  title: "写作练习（样例）",
  total_time: 30,
  sections: [{
    type: "writing",
    title: "Part I — Writing",
    time_limit: 30,
    questions: [{
      id: "cet4-write-1",
      type: "writing" as const,
      prompt: "Directions: For this part, you are allowed 30 minutes to write a short essay on the topic: The Importance of Developing Good Habits. You should write at least 120 words but no more than 180 words.",
      word_limit: 150,
      sample_answer: "Good habits are the foundation of a successful and fulfilling life.\n\nFirst, good habits contribute significantly to physical and mental health. Regular exercise, a balanced diet, and adequate sleep can prevent chronic diseases.\n\nSecond, good habits enhance our efficiency. Planning your day each morning helps you prioritize tasks.\n\nIn conclusion, while developing good habits requires effort, the benefits are well worth it.",
      scoring_rubric: [
        { level: 5, description: "切题，表达清楚，文字通顺，基本无语言错误", score_range: "14分档" },
        { level: 4, description: "基本切题，有少量语言错误", score_range: "11分档" },
        { level: 3, description: "基本切题，语言错误较多", score_range: "8分档" },
        { level: 2, description: "条理不清，严重语言错误多", score_range: "5分档" },
        { level: 1, description: "与题目毫不相关", score_range: "2分档" },
      ],
    }],
  }],
}

export const sampleCET4Translation: ExamPaper = {
  id: "cet4-sample-translation",
  exam_type: "cet4",
  year: 2024,
  month: 6,
  title: "翻译练习（样例）",
  total_time: 30,
  sections: [{
    type: "translation",
    title: "Part IV — Translation",
    time_limit: 30,
    questions: [{
      id: "cet4-trans-1",
      type: "translation" as const,
      source_text: "中国高铁是中国最具代表性的技术成就之一。自2008年第一条高速铁路开通以来，中国已建成世界上最长的高速铁路网络，总里程超过4万公里。高铁不仅极大地缩短了城市之间的旅行时间，也促进了沿线地区的经济发展。",
      reference_translation: "China's high-speed railway is one of the most representative technological achievements of China. Since the opening of the first high-speed railway in 2008, China has built the world's longest high-speed railway network, with a total length of over 40,000 kilometers. High-speed trains have not only significantly reduced travel time between cities but also promoted economic development along their routes.",
      scoring_points: [
        { key_phrase: "最具代表性的技术成就", correct_translation: "the most representative technological achievements", alternatives: ["the most iconic technological accomplishments"] },
        { key_phrase: "总里程超过4万公里", correct_translation: "with a total length of over 40,000 kilometers", alternatives: ["totaling more than 40,000 km"] },
        { key_phrase: "缩短了旅行时间", correct_translation: "reduced travel time", alternatives: ["shortened the journey time"] },
        { key_phrase: "促进了经济发展", correct_translation: "promoted economic development", alternatives: ["boosted economic growth"] },
      ],
    }],
  }],
}

export const sampleCET4Reading: ExamPaper = {
  id: "cet4-sample-reading",
  exam_type: "cet4",
  year: 2024,
  month: 6,
  title: "阅读练习（样例）",
  total_time: 40,
  sections: [{
    type: "reading",
    subtype: "careful_reading",
    title: "Passage 1 — AI 与教育",
    time_limit: 20,
    passage: "In recent years, the rise of artificial intelligence has transformed education. AI-powered tutoring systems promise personalized learning experiences.\n\nProponents argue that AI tutors can identify knowledge gaps more efficiently. A Stanford study found students using AI improved test scores by 15%.\n\nHowever, critics worry about losing human elements — empathy, mentorship, and the ability to inspire curiosity.",
    questions: [
      { id: "cet4-sample-r1", type: "choice" as const, content: "What is the main promise of AI tutoring systems?", options: ["A) Replace human teachers", "B) Personalized learning", "C) Cheaper education", "D) No homework needed"], answer: "B", explanation: "第一段提到 personalized learning experiences。" },
      { id: "cet4-sample-r2", type: "choice" as const, content: "What did the Stanford study find?", options: ["A) No effect", "B) Less engagement", "C) 15% improvement", "D) Only for math"], answer: "C", explanation: "第二段说 improved test scores by 15%。" },
    ],
  }],
}
