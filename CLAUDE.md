# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目简介

**PrepEng** — 可复用的英语备考平台，当前目标是 CET-4（四级），后续扩展到 CET-6 和 IELTS。
核心理念：苏格拉底法 + 做题驱动 + 永久记忆（不灌输，先做题再挖错因）。

## 常用命令

```bash
npm run dev          # 启动开发服务器 (http://localhost:3000)
npm run build        # 生产构建（检查 TypeScript 错误）
npm run lint         # ESLint 检查
npx shadcn@latest add <component>  # 添加 shadcn UI 组件
```

## 技术栈

- Next.js 16 (App Router) + TypeScript + Tailwind CSS v4 + shadcn/ui (base-nova)
- 数据存储：localStorage（API 配置、草稿）+ IndexedDB（用户进度、错题）
- AI 功能：任意 OpenAI 兼容 API（流式 SSE 输出），配置存 localStorage

## 项目结构

```
src/
├── app/
│   ├── page.tsx              # 首页：选考试类型
│   ├── settings/page.tsx     # 全局 API 设置页
│   └── [exam]/               # 动态路由：cet4/cet6/ielts
│       ├── layout.tsx        # 侧边栏布局
│       ├── sidebar-client.tsx # 侧边栏（client component）
│       ├── page.tsx          # 仪表盘：进度概览 + 模块入口
│       ├── read/page.tsx     # 阅读练习（一次展示全部题目，整篇提交）
│       ├── write/page.tsx    # 写作练习（左右做题 → 全宽流式 AI 批改）
│       ├── translate/page.tsx # 翻译练习（同上双布局）
│       ├── listen/page.tsx   # 听力练习
│       ├── speak/page.tsx    # 口语练习（IELTS）
│       └── review/page.tsx   # 错题本
├── components/
│   ├── ui/                   # shadcn UI 组件
│   └── markdown-content.tsx  # 共享 Markdown 渲染组件
├── lib/
│   ├── utils.ts              # cn() 工具函数
│   ├── storage.ts            # IndexedDB 封装
│   ├── exam-data.ts          # 题库数据（样例真题）
│   ├── ai.ts                 # AI 调用封装（支持 OpenAI 兼容 + Anthropic）
│   └── api-config.ts         # API 配置管理（localStorage，预设）
└── types/
    └── exam.ts               # 核心类型定义（考试无关，可复用）
```

## 核心数据模型

`src/types/exam.ts` 定义了所有类型。关键类型：
- `ExamType` — "cet4" | "cet6" | "ielts"
- `ExamPaper` — 完整试卷（含 sections/questions）
- `Question` — 联合类型：ChoiceQuestion | ClozeQuestion | MatchingQuestion | WritingQuestion | TranslationQuestion
- `UserProgress` / `MistakeEntry` — 用户进度和错题

## 开发注意事项

- shadcn/ui v4 (base-nova) 需要 `@base-ui/react` 依赖，不是纯 Radix
- Next.js 16 的 `params` 是 `Promise`，需要 `await`；本项目用 client component 读 `usePathname()` 绕过
- Tailwind CSS v4 用 `@theme inline` 而不是 `tailwind.config.js`
- 深色模式为默认（`<html className="dark">`）
- 所有页面都是 client component（需要交互状态）
- API 配置存 localStorage，不进 git；代码中无敏感信息
- 写作/翻译模块采用双布局：做题时左右分栏，提交后切全宽流式批改
