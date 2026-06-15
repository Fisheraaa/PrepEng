// ============================================================
// 听力真题数据 — 音频文件映射
// ============================================================

export interface ListeningPaper {
  id: string
  exam_type: "cet4" | "cet6" | "ielts"
  year: number
  month: number
  session?: number
  title: string
  audio_url: string
}

export const listeningPapers: ListeningPaper[] = [
  // CET-4
  { id: "cet4-2022-06", exam_type: "cet4", year: 2022, month: 6, title: "2022年6月 四级听力", audio_url: "/cet4/audio/2022-06.mp3" },
  { id: "cet4-2023-03", exam_type: "cet4", year: 2023, month: 3, title: "2023年3月 四级听力", audio_url: "/cet4/audio/2023-03.mp3" },
  { id: "cet4-2023-12-1", exam_type: "cet4", year: 2023, month: 12, session: 1, title: "2023年12月 第1套", audio_url: "/cet4/audio/2023-12-1.mp3" },
  { id: "cet4-2023-12-2", exam_type: "cet4", year: 2023, month: 12, session: 2, title: "2023年12月 第2套", audio_url: "/cet4/audio/2023-12-2.mp3" },
  { id: "cet4-2024-12-1", exam_type: "cet4", year: 2024, month: 12, session: 1, title: "2024年12月 第1套", audio_url: "/cet4/audio/2024-12-1.mp3" },
  { id: "cet4-2024-12-2", exam_type: "cet4", year: 2024, month: 12, session: 2, title: "2024年12月 第2套", audio_url: "/cet4/audio/2024-12-2.mp3" },
  { id: "cet4-2025-06-1", exam_type: "cet4", year: 2025, month: 6, session: 1, title: "2025年6月 第1套", audio_url: "/cet4/audio/2025-06-1.mp3" },
  { id: "cet4-2025-06-2", exam_type: "cet4", year: 2025, month: 6, session: 2, title: "2025年6月 第2套", audio_url: "/cet4/audio/2025-06-2.mp3" },

  // CET-6
  { id: "cet6-2021-06-1", exam_type: "cet6", year: 2021, month: 6, session: 1, title: "2021年6月 第1套", audio_url: "/cet6/audio/2021-06-1.mp3" },
  { id: "cet6-2021-06-2", exam_type: "cet6", year: 2021, month: 6, session: 2, title: "2021年6月 第2套", audio_url: "/cet6/audio/2021-06-2.mp3" },
  { id: "cet6-2021-12-1", exam_type: "cet6", year: 2021, month: 12, session: 1, title: "2021年12月 第1套", audio_url: "/cet6/audio/2021-12-1.mp3" },
  { id: "cet6-2021-12-2", exam_type: "cet6", year: 2021, month: 12, session: 2, title: "2021年12月 第2套", audio_url: "/cet6/audio/2021-12-2.mp3" },
  { id: "cet6-2022-06", exam_type: "cet6", year: 2022, month: 6, title: "2022年6月", audio_url: "/cet6/audio/2022-06.mp3" },
  { id: "cet6-2022-09", exam_type: "cet6", year: 2022, month: 9, title: "2022年9月", audio_url: "/cet6/audio/2022-09.mp3" },
  { id: "cet6-2022-12-1", exam_type: "cet6", year: 2022, month: 12, session: 1, title: "2022年12月 第1套", audio_url: "/cet6/audio/2022-12-1.mp3" },
  { id: "cet6-2022-12-2", exam_type: "cet6", year: 2022, month: 12, session: 2, title: "2022年12月 第2套", audio_url: "/cet6/audio/2022-12-2.mp3" },
  { id: "cet6-2023-03", exam_type: "cet6", year: 2023, month: 3, title: "2023年3月", audio_url: "/cet6/audio/2023-03.mp3" },
  { id: "cet6-2023-06-1", exam_type: "cet6", year: 2023, month: 6, session: 1, title: "2023年6月 第1套", audio_url: "/cet6/audio/2023-06-1.mp3" },
  { id: "cet6-2023-06-2", exam_type: "cet6", year: 2023, month: 6, session: 2, title: "2023年6月 第2套", audio_url: "/cet6/audio/2023-06-2.mp3" },
  { id: "cet6-2023-12-1", exam_type: "cet6", year: 2023, month: 12, session: 1, title: "2023年12月 第1套", audio_url: "/cet6/audio/2023-12-1.mp3" },
  { id: "cet6-2023-12-2", exam_type: "cet6", year: 2023, month: 12, session: 2, title: "2023年12月 第2套", audio_url: "/cet6/audio/2023-12-2.mp3" },
  { id: "cet6-2024-06-1", exam_type: "cet6", year: 2024, month: 6, session: 1, title: "2024年6月 第1套", audio_url: "/cet6/audio/2024-06-1.mp3" },
  { id: "cet6-2024-06-2", exam_type: "cet6", year: 2024, month: 6, session: 2, title: "2024年6月 第2套", audio_url: "/cet6/audio/2024-06-2.mp3" },
  { id: "cet6-2024-12-1", exam_type: "cet6", year: 2024, month: 12, session: 1, title: "2024年12月 第1套", audio_url: "/cet6/audio/2024-12-1.mp3" },
  { id: "cet6-2024-12-2", exam_type: "cet6", year: 2024, month: 12, session: 2, title: "2024年12月 第2套", audio_url: "/cet6/audio/2024-12-2.mp3" },
  { id: "cet6-2025-06-1", exam_type: "cet6", year: 2025, month: 6, session: 1, title: "2025年6月 第1套", audio_url: "/cet6/audio/2025-06-1.mp3" },
]

export function getListeningPapers(examType: "cet4" | "cet6" | "ielts"): ListeningPaper[] {
  return listeningPapers
    .filter((p) => p.exam_type === examType)
    .sort((a, b) => {
      if (a.year !== b.year) return b.year - a.year
      if (a.month !== b.month) return b.month - a.month
      return (b.session || 0) - (a.session || 0)
    })
}
