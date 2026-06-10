import type { ExamPaper, ExamType, ChoiceQuestion } from "@/types/exam"

// ============================================================
// 题库数据加载 — 从 JSON 文件加载
// ============================================================

// 阅读数据（从 Word/PDF 提取）
import readingData from "@/data/reading-papers.json"

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

// 加载所有题库，按考试类型分组
const allPapers: Record<ExamType, ExamPaper[]> = {
  cet4: [],
  cet6: [],
  ielts: [],
}

for (const paper of readingData as ExtractedPaper[]) {
  const et = paper.exam_type as ExamType
  if (et === "cet4" || et === "cet6") {
    allPapers[et].push(convertToExamPaper(paper))
  }
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

// ============================================================
// 样例数据（写作/翻译模块仍在使用）
// ============================================================

export const sampleCET4Writing: ExamPaper = {
  id: "cet4-2024-june-1-writing",
  exam_type: "cet4",
  year: 2024,
  month: 6,
  session: 1,
  title: "2024年6月 写作",
  total_time: 30,
  sections: [
    {
      type: "writing",
      title: "Part I — Writing",
      time_limit: 30,
      questions: [
        {
          id: "cet4-2024june-1-write",
          type: "writing" as const,
          prompt: "Directions: For this part, you are allowed 30 minutes to write a short essay on the topic: The Importance of Developing Good Habits. You should write at least 120 words but no more than 180 words.",
          word_limit: 150,
          sample_answer: `Good habits are the foundation of a successful and fulfilling life. They shape our daily routines, influence our health, and determine our productivity.

First, good habits contribute significantly to physical and mental health. Regular exercise, a balanced diet, and adequate sleep are all habits that can prevent chronic diseases and improve our overall well-being. Research has consistently shown that people who maintain healthy habits tend to live longer and enjoy a higher quality of life.

Second, good habits enhance our efficiency and productivity. For instance, developing a habit of planning your day each morning can help you prioritize tasks and avoid wasting time. Similarly, the habit of reading regularly expands your knowledge and sharpens your thinking skills.

In conclusion, while developing good habits requires effort and consistency, the benefits are well worth it. As Aristotle once said, "We are what we repeatedly do. Excellence, then, is not an act, but a habit."`,
          scoring_rubric: [
            { level: 5, description: "切题，表达清楚，文字通顺，无重大语言错误", score_range: "14分档" },
            { level: 4, description: "基本切题，表达基本清楚，有少量语言错误", score_range: "11分档" },
            { level: 3, description: "基本切题，有较多语言错误，但不影响理解", score_range: "8分档" },
            { level: 2, description: "条理不清，语言错误较多", score_range: "5分档" },
            { level: 1, description: "与题目毫不相关", score_range: "2分档" },
          ],
        },
      ],
    },
  ],
}

export const sampleCET4Translation: ExamPaper = {
  id: "cet4-2024-june-1-translation",
  exam_type: "cet4",
  year: 2024,
  month: 6,
  session: 1,
  title: "2024年6月 翻译",
  total_time: 30,
  sections: [
    {
      type: "translation",
      title: "Part IV — Translation",
      time_limit: 30,
      questions: [
        {
          id: "cet4-2024june-1-trans",
          type: "translation" as const,
          source_text: "中国高铁（China's high-speed railway）是中国最具代表性的技术成就之一。自2008年第一条高速铁路开通以来，中国已建成世界上最长的高速铁路网络，总里程超过4万公里。高铁不仅极大地缩短了城市之间的旅行时间，也促进了沿线地区的经济发展。如今，高铁已成为中国人日常出行的重要方式，每天运送数百万旅客。中国高铁技术也已走出国门，帮助其他国家建设高速铁路。",
          reference_translation: "China's high-speed railway is one of the most representative technological achievements of China. Since the opening of the first high-speed railway in 2008, China has built the world's longest high-speed railway network, with a total length of over 40,000 kilometers. High-speed trains have not only significantly reduced travel time between cities but also promoted economic development along their routes. Today, high-speed rail has become an important means of daily transportation for Chinese people, carrying millions of passengers every day. China's high-speed railway technology has also gone global, helping other countries build their own high-speed railways.",
          scoring_points: [
            { key_phrase: "最具代表性的技术成就", correct_translation: "the most representative technological achievements", alternatives: ["the most iconic technological accomplishments"] },
            { key_phrase: "总里程超过4万公里", correct_translation: "with a total length of over 40,000 kilometers", alternatives: ["totaling more than 40,000 km"] },
            { key_phrase: "缩短了城市之间的旅行时间", correct_translation: "reduced travel time between cities", alternatives: ["shortened the journey time between cities"] },
            { key_phrase: "促进了沿线地区的经济发展", correct_translation: "promoted economic development along their routes", alternatives: ["boosted the economic growth of regions along the routes"] },
            { key_phrase: "走出国门", correct_translation: "gone global", alternatives: ["expanded internationally", "been exported to other countries"] },
          ],
        },
      ],
    },
  ],
}

export const sampleCET4Reading: ExamPaper = {
  id: "cet4-2024-june-1-reading",
  exam_type: "cet4",
  year: 2024,
  month: 6,
  session: 1,
  title: "2024年6月 阅读（样例）",
  total_time: 40,
  sections: [
    {
      type: "reading",
      subtype: "careful_reading",
      title: "Passage 1 — AI 与教育",
      time_limit: 20,
      passage: "In recent years, the rise of artificial intelligence (AI) has transformed numerous industries, and education is no exception. AI-powered tutoring systems are now being deployed in classrooms around the world, promising personalized learning experiences that adapt to each student's pace and style.\n\nProponents argue that AI tutors can identify knowledge gaps more efficiently than human teachers, providing targeted exercises and immediate feedback. A study conducted by researchers at Stanford University found that students using AI tutoring systems improved their test scores by an average of 15% compared to those in traditional classroom settings.\n\nHowever, critics raise concerns about the potential downsides. They argue that over-reliance on AI could diminish the critical human elements of education — empathy, mentorship, and the ability to inspire curiosity.",
      questions: [
        { id: "cet4-sample-r1", type: "choice" as const, content: "According to the passage, what is the main promise of AI-powered tutoring systems?", options: ["A) They can completely replace human teachers.", "B) They provide personalized learning experiences.", "C) They are cheaper than traditional education.", "D) They eliminate the need for homework."], answer: "B", explanation: "文章第一段明确提到 AI tutoring systems 提供 personalized learning experiences。" },
        { id: "cet4-sample-r2", type: "choice" as const, content: "What did the Stanford University study find?", options: ["A) They had no significant effect on test scores.", "B) They decreased student engagement.", "C) Students using them improved test scores by about 15%.", "D) They were only effective for math subjects."], answer: "C", explanation: "第二段说 students using AI tutoring systems improved their test scores by an average of 15%。" },
      ],
    },
  ],
}
