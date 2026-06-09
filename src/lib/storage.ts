// ============================================================
// 本地存储管理 — IndexedDB 封装
// ============================================================

import type { UserProgress, ExamSession, MistakeEntry, ExamType } from "@/types/exam"

const DB_NAME = "cet-prep"
const DB_VERSION = 1

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains("sessions")) {
        db.createObjectStore("sessions", { keyPath: "id" })
      }
      if (!db.objectStoreNames.contains("mistakes")) {
        const store = db.createObjectStore("mistakes", { keyPath: "question_id" })
        store.createIndex("exam_type", "exam_type")
        store.createIndex("next_review", "next_review")
      }
      if (!db.objectStoreNames.contains("progress")) {
        db.createObjectStore("progress", { keyPath: "exam_type" })
      }
    }

    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

// --- Progress ---

export async function getProgress(examType: ExamType): Promise<UserProgress> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction("progress", "readonly")
    const store = tx.objectStore("progress")
    const req = store.get(examType)
    req.onsuccess = () => {
      resolve(
        req.result ?? {
          exam_type: examType,
          sessions: [],
          mistakes: [],
          mastery_map: {},
          total_practiced: 0,
          streak_days: 0,
        }
      )
    }
    req.onerror = () => reject(req.error)
  })
}

export async function saveProgress(progress: UserProgress): Promise<void> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction("progress", "readwrite")
    const store = tx.objectStore("progress")
    const req = store.put(progress)
    req.onsuccess = () => resolve()
    req.onerror = () => reject(req.error)
  })
}

// --- Sessions ---

export async function saveSession(session: ExamSession): Promise<void> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction("sessions", "readwrite")
    const store = tx.objectStore("sessions")
    const req = store.put(session)
    req.onsuccess = () => resolve()
    req.onerror = () => reject(req.error)
  })
}

export async function getSessions(examType: ExamType): Promise<ExamSession[]> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction("sessions", "readonly")
    const store = tx.objectStore("sessions")
    const req = store.getAll()
    req.onsuccess = () => {
      const all = req.result as ExamSession[]
      resolve(all.filter((s) => s.exam_type === examType))
    }
    req.onerror = () => reject(req.error)
  })
}

// --- Mistakes ---

export async function saveMistake(mistake: MistakeEntry): Promise<void> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction("mistakes", "readwrite")
    const store = tx.objectStore("mistakes")
    const req = store.put(mistake)
    req.onsuccess = () => resolve()
    req.onerror = () => reject(req.error)
  })
}

export async function getMistakes(examType: ExamType): Promise<MistakeEntry[]> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction("mistakes", "readonly")
    const store = tx.objectStore("mistakes")
    const index = store.index("exam_type")
    const req = index.getAll(examType)
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

export async function getDueMistakes(examType: ExamType): Promise<MistakeEntry[]> {
  const mistakes = await getMistakes(examType)
  const now = Date.now()
  return mistakes.filter((m) => m.next_review <= now)
}
