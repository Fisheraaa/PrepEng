// ============================================================
// 可复用的考试数据模型 — 支持 CET-4, CET-6, IELTS
// ============================================================

export type ExamType = "cet4" | "cet6" | "ielts"

export type SectionType = "listening" | "reading" | "writing" | "translation"

export type ReadingSubtype =
  | "banked_cloze"      // 选词填空
  | "matching"          // 信息匹配
  | "careful_reading"   // 仔细阅读

export type ListeningSubtype =
  | "news_report"       // 短篇新闻
  | "long_conversation" // 长对话
  | "passage"           // 听力篇章

// --- 单题 ---

export interface ChoiceQuestion {
  id: string
  type: "choice"
  content: string           // 题目文本
  options: string[]         // 选项
  answer: string            // 正确答案 (A/B/C/D)
  explanation: string       // 解析
  audio_url?: string        // 听力题的音频路径
  audio_start?: number      // 音频开始秒
  audio_end?: number        // 音频结束秒
}

export interface ClozeQuestion {
  id: string
  type: "cloze"
  content: string           // 带空格的句子/段落
  blanks: {
    index: number           // 空格编号
    options: string[]       // 候选词
    answer: string          // 正确答案
  }[]
  explanation: string
}

export interface MatchingQuestion {
  id: string
  type: "matching"
  content: string           // 需要匹配的段落内容
  statements: {
    id: string              // 题号
    text: string            // 陈述句
    answer: string          // 对应段落编号
  }[]
  explanation: string
}

export interface WritingQuestion {
  id: string
  type: "writing"
  prompt: string            // 写作题目/要求
  word_limit: number        // 字数要求
  sample_answer?: string    // 范文
  scoring_rubric: {
    level: number           // 档位 (1-5)
    description: string     // 该档位描述
    score_range: string     // 分数范围
  }[]
}

export interface TranslationQuestion {
  id: string
  type: "translation"
  source_text: string       // 中文原文
  reference_translation: string  // 参考译文
  scoring_points: {
    key_phrase: string      // 关键短语
    correct_translation: string
    alternatives: string[]
  }[]
}

// --- Section ---

export type Question =
  | ChoiceQuestion
  | ClozeQuestion
  | MatchingQuestion
  | WritingQuestion
  | TranslationQuestion

export interface Section {
  type: SectionType
  subtype?: ReadingSubtype | ListeningSubtype
  title: string             // e.g. "Section A - 选词填空"
  time_limit?: number       // 该部分时间限制（分钟）
  passage?: string          // 阅读理解的文章正文
  bank?: string[]           // 词库（选词填空用）
  questions: Question[]
}

// --- 完整试卷 ---

export interface ExamPaper {
  id: string                // e.g. "cet4-2024-june-1"
  exam_type: ExamType
  year: number
  month?: number            // IELTS 可能没有月份
  session?: number          // 第几套
  title: string             // e.g. "2024年6月 第一套"
  total_time: number        // 总时间（分钟）
  sections: Section[]
}

// --- 用户进度 ---

export interface UserAnswer {
  question_id: string
  user_answer: string
  is_correct: boolean
  timestamp: number
  time_spent: number        // 秒
}

export interface ExamSession {
  id: string
  exam_type: ExamType
  paper_id: string
  started_at: number
  completed_at?: number
  section_scores: Record<SectionType, number>
  total_score: number
  answers: UserAnswer[]
}

export interface MistakeEntry {
  question_id: string
  paper_id: string
  exam_type: ExamType
  section_type: SectionType       // reading / writing / translation
  question_content: string        // 题目文本（用于错题本展示）
  options?: string[]              // 选项（选择题）
  explanation: string             // 解析
  user_answer: string
  correct_answer: string
  wrong_count: number       // 错了几次
  last_reviewed: number     // 上次复习时间
  next_review: number       // 下次复习时间（间隔复习）
  mastery: "red" | "yellow" | "green"  // 🔴🟡🟢
}

export interface UserProgress {
  exam_type: ExamType
  sessions: ExamSession[]
  mistakes: MistakeEntry[]
  mastery_map: Record<string, "red" | "yellow" | "green">
  total_practiced: number
  streak_days: number
}

// --- AI 对话 ---

export interface ChatMessage {
  role: "user" | "assistant"
  content: string
  timestamp: number
}

export interface SocraticContext {
  question_id: string
  user_answer: string
  correct_answer: string
  chat_history: ChatMessage[]
}
