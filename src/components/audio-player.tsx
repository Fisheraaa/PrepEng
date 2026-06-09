"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface AudioPlayerProps {
  src: string
  title?: string
  onTimeUpdate?: (currentTime: number, duration: number) => void
}

export function AudioPlayer({ src, title, onTimeUpdate }: AudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null)
  const progressRef = useRef<HTMLDivElement>(null)
  const [playing, setPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [speed, setSpeed] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  const speeds = [0.5, 0.75, 1, 1.25, 1.5, 2]

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return

    const onLoaded = () => {
      setDuration(audio.duration)
      setLoading(false)
    }
    const onTime = () => {
      setCurrentTime(audio.currentTime)
      onTimeUpdate?.(audio.currentTime, audio.duration)
    }
    const onEnd = () => setPlaying(false)
    const onError = () => {
      setError(true)
      setLoading(false)
    }

    audio.addEventListener("loadedmetadata", onLoaded)
    audio.addEventListener("timeupdate", onTime)
    audio.addEventListener("ended", onEnd)
    audio.addEventListener("error", onError)

    return () => {
      audio.removeEventListener("loadedmetadata", onLoaded)
      audio.removeEventListener("timeupdate", onTime)
      audio.removeEventListener("ended", onEnd)
      audio.removeEventListener("error", onError)
    }
  }, [src, onTimeUpdate])

  const togglePlay = useCallback(() => {
    const audio = audioRef.current
    if (!audio) return
    if (playing) {
      audio.pause()
    } else {
      audio.play().catch(() => {})
    }
    setPlaying(!playing)
  }, [playing])

  const seek = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const bar = progressRef.current
    const audio = audioRef.current
    if (!bar || !audio || !duration) return
    const rect = bar.getBoundingClientRect()
    const pct = (e.clientX - rect.left) / rect.width
    audio.currentTime = pct * duration
  }, [duration])

  const cycleSpeed = useCallback(() => {
    const idx = speeds.indexOf(speed)
    const next = speeds[(idx + 1) % speeds.length]
    setSpeed(next)
    if (audioRef.current) audioRef.current.playbackRate = next
  }, [speed])

  const skip = useCallback((seconds: number) => {
    const audio = audioRef.current
    if (!audio) return
    audio.currentTime = Math.max(0, Math.min(duration, audio.currentTime + seconds))
  }, [duration])

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60)
    const sec = Math.floor(s % 60)
    return `${m}:${sec.toString().padStart(2, "0")}`
  }

  if (error) {
    return (
      <div className="flex items-center gap-2 p-3 bg-destructive/10 rounded-lg text-sm text-destructive">
        <span>⚠️ 音频加载失败</span>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <audio ref={audioRef} src={src} preload="metadata" />

      {title && (
        <p className="text-xs text-muted-foreground">{title}</p>
      )}

      {/* 进度条 */}
      <div
        ref={progressRef}
        className="w-full h-1.5 bg-muted rounded-full cursor-pointer group"
        onClick={seek}
      >
        <div
          className="h-1.5 bg-primary rounded-full relative transition-all"
          style={{ width: duration ? `${(currentTime / duration) * 100}%` : "0%" }}
        >
          <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-primary rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
      </div>

      {/* 控制栏 */}
      <div className="flex items-center gap-2">
        {/* 后退 10s */}
        <Button variant="ghost" size="sm" onClick={() => skip(-10)} className="h-7 w-7 p-0">
          ⏪
        </Button>

        {/* 播放/暂停 */}
        <Button
          variant="outline"
          size="sm"
          onClick={togglePlay}
          disabled={loading}
          className="h-8 w-8 p-0"
        >
          {loading ? "⏳" : playing ? "⏸" : "▶"}
        </Button>

        {/* 前进 10s */}
        <Button variant="ghost" size="sm" onClick={() => skip(10)} className="h-7 w-7 p-0">
          ⏩
        </Button>

        {/* 时间 */}
        <span className="text-xs text-muted-foreground font-mono">
          {formatTime(currentTime)} / {formatTime(duration)}
        </span>

        {/* 倍速 */}
        <Button
          variant="outline"
          size="sm"
          onClick={cycleSpeed}
          className="h-7 px-2 text-xs ml-auto"
        >
          {speed}x
        </Button>
      </div>
    </div>
  )
}
