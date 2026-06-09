import type { ExamPaper, ExamType } from "@/types/exam"

// ============================================================
// 题库数据加载
// ============================================================

// 内置的样例试卷 — 后续从 JSON 文件或 API 加载
const examPapers: Record<ExamType, ExamPaper[]> = {
  cet4: [],
  cet6: [],
  ielts: [],
}

export function getExamPapers(examType: ExamType): ExamPaper[] {
  return examPapers[examType] ?? []
}

export function getExamPaper(examType: ExamType, paperId: string): ExamPaper | undefined {
  return examPapers[examType]?.find((p) => p.id === paperId)
}

// ============================================================
// 样例 CET-4 阅读题（用于开发测试）
// ============================================================

export const sampleCET4Reading: ExamPaper = {
  id: "cet4-2024-june-1",
  exam_type: "cet4",
  year: 2024,
  month: 6,
  session: 1,
  title: "2024年6月 第一套",
  total_time: 125,
  sections: [
    {
      type: "reading",
      subtype: "careful_reading",
      title: "Section C — 仔细阅读",
      time_limit: 25,
      passage: `In recent years, the rise of artificial intelligence (AI) has transformed numerous industries, and education is no exception. AI-powered tutoring systems are now being deployed in classrooms around the world, promising personalized learning experiences that adapt to each student's pace and style.

Proponents argue that AI tutors can identify knowledge gaps more efficiently than human teachers, providing targeted exercises and immediate feedback. A study conducted by researchers at Stanford University found that students using AI tutoring systems improved their test scores by an average of 15% compared to those in traditional classroom settings.

However, critics raise concerns about the potential downsides. They argue that over-reliance on AI could diminish the critical human elements of education — empathy, mentorship, and the ability to inspire curiosity. Dr. Sarah Chen, an education psychologist at MIT, warns that "AI can deliver content, but it cannot replace the transformative impact of a great teacher who sees potential in a struggling student."

The debate is further complicated by issues of equity. While well-funded schools can afford cutting-edge AI tools, under-resourced institutions may fall further behind, widening the existing educational divide. A report by UNESCO estimates that only 12% of schools in developing countries have access to any form of AI-assisted learning.

Despite these challenges, the integration of AI in education appears inevitable. The key question is not whether AI will play a role in classrooms, but how to ensure it enhances rather than replaces the human elements that make education truly transformative.`,
      questions: [
        {
          id: "cet4-2024june-1-read-c1",
          type: "choice" as const,
          content:
            "According to the passage, what is the main promise of AI-powered tutoring systems?",
          options: [
            "A) They can completely replace human teachers.",
            "B) They provide personalized learning experiences.",
            "C) They are cheaper than traditional education.",
            "D) They eliminate the need for homework.",
          ],
          answer: "B",
          explanation:
            '文章第一段明确提到 "AI-powered tutoring systems are now being deployed... promising personalized learning experiences that adapt to each student\'s pace and style." 选项 A 太绝对（文章说 enhance not replace），C 和 D 文中未提及。',
        },
        {
          id: "cet4-2024june-1-read-c2",
          type: "choice" as const,
          content:
            "What did the Stanford University study find about AI tutoring systems?",
          options: [
            "A) They had no significant effect on test scores.",
            "B) They decreased student engagement.",
            "C) Students using them improved test scores by about 15%.",
            "D) They were only effective for math subjects.",
          ],
          answer: "C",
          explanation:
            '第二段明确说 "students using AI tutoring systems improved their test scores by an average of 15%"。这是细节定位题，答案直接来自原文。',
        },
        {
          id: "cet4-2024june-1-read-c3",
          type: "choice" as const,
          content:
            'What is Dr. Sarah Chen\'s main concern about AI in education?',
          options: [
            "A) AI is too expensive for most schools.",
            "B) AI cannot replace the human elements of teaching.",
            "C) AI will make students lazy.",
            "D) AI systems are not accurate enough.",
          ],
          answer: "B",
          explanation:
            'Dr. Chen 说 "AI can deliver content, but it cannot replace the transformative impact of a great teacher"。她的核心担忧是 AI 无法替代教育中的人文关怀（empathy, mentorship, inspiration）。A 是其他段落的内容，C 和 D 文中未提及。',
        },
        {
          id: "cet4-2024june-1-read-c4",
          type: "choice" as const,
          content:
            "According to the UNESCO report mentioned in the passage, what percentage of schools in developing countries have access to AI-assisted learning?",
          options: [
            "A) 25%",
            "B) 50%",
            "C) 12%",
            "D) 30%",
          ],
          answer: "C",
          explanation:
            '第四段直接给出数字 "only 12% of schools in developing countries have access to any form of AI-assisted learning"。这是纯细节题，定位到原文即可。',
        },
        {
          id: "cet4-2024june-1-read-c5",
          type: "choice" as const,
          content:
            "What does the author suggest about the future of AI in education?",
          options: [
            "A) AI will eventually replace all human teachers.",
            "B) AI should be banned from classrooms.",
            "C) The challenge is ensuring AI enhances rather than replaces human elements.",
            "D) AI will solve all educational problems.",
          ],
          answer: "C",
          explanation:
            '最后一段说 "The key question is not whether AI will play a role in classrooms, but how to ensure it enhances rather than replaces the human elements"。作者的态度是谨慎乐观：AI 是趋势，但关键是如何用好它。A 和 D 太极端，B 与作者立场相反。',
        },
      ],
    },
    {
      type: "reading",
      subtype: "careful_reading",
      title: "Section C — 仔细阅读 (2)",
      time_limit: 25,
      passage: `Sleep is often viewed as a passive state, but recent scientific discoveries reveal it to be a period of intense neurological activity. During sleep, the brain performs essential maintenance tasks that are critical for cognitive function, emotional regulation, and physical health.

One of the most significant findings in sleep research is the discovery of the glymphatic system. This waste-clearance mechanism, first identified in 2012, is most active during sleep. It flushes out toxic proteins, including beta-amyloid, which is associated with Alzheimer's disease. Studies show that even a single night of poor sleep can increase beta-amyloid levels in the brain.

Sleep also plays a crucial role in memory consolidation. During the deep sleep stages, the brain replays experiences from the day, strengthening neural connections and transferring information from short-term to long-term memory. Research by Dr. Matthew Walker at UC Berkeley demonstrates that sleep deprivation can reduce the ability to form new memories by up to 40%.

The implications extend beyond individual health. A growing body of evidence links chronic sleep deprivation to decreased workplace productivity, increased accident rates, and impaired decision-making. The National Safety Council estimates that fatigue-related productivity losses cost employers approximately $136 billion annually in health-related lost productivity.

Despite this knowledge, modern society continues to undervalue sleep. The "hustle culture" that glorifies minimal sleep as a sign of dedication is not only misguided but potentially dangerous. As Walker argues, "Sleep is not the absence of wakefulness. It is a highly active, metabolically deliberate, and brain-orchestrated state."`,
      questions: [
        {
          id: "cet4-2024june-1-read-d1",
          type: "choice" as const,
          content:
            "What is the glymphatic system according to the passage?",
          options: [
            "A) A system that helps the brain learn new languages.",
            "B) A waste-clearance mechanism most active during sleep.",
            "C) A type of memory storage in the brain.",
            "D) A method for measuring sleep quality.",
          ],
          answer: "B",
          explanation:
            '第二段说 "This waste-clearance mechanism, first identified in 2012, is most active during sleep"。glymphatic system 的核心功能是清除脑内废物（如 beta-amyloid）。A、C、D 都是干扰项。',
        },
        {
          id: "cet4-2024june-1-read-d2",
          type: "choice" as const,
          content:
            "According to Dr. Matthew Walker's research, sleep deprivation can reduce the ability to form new memories by up to:",
          options: [
            "A) 20%",
            "B) 30%",
            "C) 40%",
            "D) 50%",
          ],
          answer: "C",
          explanation:
            '第三段明确说 "sleep deprivation can reduce the ability to form new memories by up to 40%"。数字题，定位原文即可。',
        },
        {
          id: "cet4-2024june-1-read-d3",
          type: "choice" as const,
          content:
            "What does the passage say about the cost of fatigue-related productivity losses?",
          options: [
            "A) It costs about $136 billion annually in the US.",
            "B) It has no significant economic impact.",
            "C) It only affects the healthcare industry.",
            "D) It costs about $50 billion annually worldwide.",
          ],
          answer: "A",
          explanation:
            '第四段说 "fatigue-related productivity losses cost employers approximately $136 billion annually"。注意是美国的数据（National Safety Council 是美国机构）。B、C、D 均与原文不符。',
        },
        {
          id: "cet4-2024june-1-read-d4",
          type: "choice" as const,
          content:
            'What does Dr. Walker mean by saying "Sleep is not the absence of wakefulness"?',
          options: [
            "A) Sleep is a boring and passive state.",
            "B) Sleep is an active and important brain process.",
            "C) People should try to sleep less.",
            "D) Wakefulness is more important than sleep.",
          ],
          answer: "B",
          explanation:
            'Walker 的意思是睡眠不是简单的"醒着的反面"，而是一个 "highly active, metabolically deliberate, and brain-orchestrated state"。他在强调睡眠是主动的、有目的的大脑活动。A 和 C 与他的观点相反，D 文中未提及。',
        },
        {
          id: "cet4-2024june-1-read-d5",
          type: "choice" as const,
          content:
            "What is the author's attitude toward 'hustle culture'?",
          options: [
            "A) Supportive — it promotes hard work.",
            "B) Neutral — it has both pros and cons.",
            "C) Critical — it is misguided and dangerous.",
            "D) Indifferent — it doesn't affect health.",
          ],
          answer: "C",
          explanation:
            '最后一段说 "hustle culture" is "not only misguided but potentially dangerous"。作者明确持批评态度。这是观点态度题，抓住关键词 misguided 和 dangerous 即可判断。',
        },
      ],
    },
  ],
}

// ============================================================
// 样例 CET-4 写作题
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
          prompt:
            "Directions: For this part, you are allowed 30 minutes to write a short essay on the topic: The Importance of Developing Good Habits. You should write at least 120 words but no more than 180 words.",
          word_limit: 150,
          sample_answer: `Good habits are the foundation of a successful and fulfilling life. They shape our daily routines, influence our health, and determine our productivity.

First, good habits contribute significantly to physical and mental health. Regular exercise, a balanced diet, and adequate sleep are all habits that can prevent chronic diseases and improve our overall well-being. Research has consistently shown that people who maintain healthy habits tend to live longer and enjoy a higher quality of life.

Second, good habits enhance our efficiency and productivity. For instance, developing a habit of planning your day each morning can help you prioritize tasks and avoid wasting time. Similarly, the habit of reading regularly expands your knowledge and sharpens your thinking skills.

In conclusion, while developing good habits requires effort and consistency, the benefits are well worth it. As Aristotle once said, "We are what we repeatedly do. Excellence, then, is not an act, but a habit."`,
          scoring_rubric: [
            {
              level: 5,
              description: "切题，表达清楚，文字通顺，无重大语言错误",
              score_range: "14分档 (106.5 × 14/15 ≈ 99分)",
            },
            {
              level: 4,
              description: "基本切题，表达基本清楚，有少量语言错误",
              score_range: "11分档 (约78分)",
            },
            {
              level: 3,
              description: "基本切题，有较多语言错误，但不影响理解",
              score_range: "8分档 (约57分)",
            },
            {
              level: 2,
              description: "条理不清，语言错误较多，影响理解",
              score_range: "5分档 (约36分)",
            },
            {
              level: 1,
              description: "与题目毫不相关或仅有孤立的词句",
              score_range: "2分档 (约14分)",
            },
          ],
        },
      ],
    },
  ],
}

// ============================================================
// 样例 CET-4 翻译题
// ============================================================

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
          source_text:
            "中国高铁（China's high-speed railway）是中国最具代表性的技术成就之一。自2008年第一条高速铁路开通以来，中国已建成世界上最长的高速铁路网络，总里程超过4万公里。高铁不仅极大地缩短了城市之间的旅行时间，也促进了沿线地区的经济发展。如今，高铁已成为中国人日常出行的重要方式，每天运送数百万旅客。中国高铁技术也已走出国门，帮助其他国家建设高速铁路。",
          reference_translation:
            "China's high-speed railway is one of the most representative technological achievements of China. Since the opening of the first high-speed railway in 2008, China has built the world's longest high-speed railway network, with a total length of over 40,000 kilometers. High-speed trains have not only significantly reduced travel time between cities but also promoted economic development along their routes. Today, high-speed rail has become an important means of daily transportation for Chinese people, carrying millions of passengers every day. China's high-speed railway technology has also gone global, helping other countries build their own high-speed railways.",
          scoring_points: [
            {
              key_phrase: "最具代表性的技术成就",
              correct_translation: "the most representative technological achievements",
              alternatives: [
                "the most iconic technological accomplishments",
                "one of the greatest technological feats",
              ],
            },
            {
              key_phrase: "总里程超过4万公里",
              correct_translation: "with a total length of over 40,000 kilometers",
              alternatives: [
                "totaling more than 40,000 km",
                "covering a distance of over 40,000 kilometers",
              ],
            },
            {
              key_phrase: "缩短了城市之间的旅行时间",
              correct_translation: "reduced travel time between cities",
              alternatives: [
                "shortened the journey time between cities",
                "cut down the travel time between cities",
              ],
            },
            {
              key_phrase: "促进了沿线地区的经济发展",
              correct_translation: "promoted economic development along their routes",
              alternatives: [
                "boosted the economic growth of regions along the routes",
                "stimulated economic development in areas along the railway lines",
              ],
            },
            {
              key_phrase: "走出国门",
              correct_translation: "gone global",
              alternatives: [
                "expanded internationally",
                "been exported to other countries",
                "reached the international market",
              ],
            },
          ],
        },
      ],
    },
  ],
}
