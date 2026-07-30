# Codex Prompt: Generate a Presentation PPT for Live777 Player

Copy the prompt below into Codex (or any AI coding agent) to generate a
professional presentation deck about the Live777 Player project.

---

## Prompt

```
Create a presentation PPT (10-12 slides) about the "Live777 Player" project.
Use a dark blue / tech theme with clean typography. Each slide should have
a title, 3-5 bullet points, and optionally a diagram placeholder.

---

### Slide 1: Title Slide
**Live777 Player — AI Vibe Coding 重构实践**
副标题：基于 Live777 WebRTC SFU 的独立流媒体播放器客户端
标签：WebRTC / WHIP / WHEP / Rust / TypeScript / daisyUI

---

### Slide 2: 项目概述
Live777 Player 是什么：
- 基于 [Live777](https://github.com/binbat/live777) WebRTC SFU 引擎构建的独立播放器
- 支持 WHEP（拉流播放）+ WHIP（摄像头推流）双模式
- 全功能播放控制：播放/暂停/音量/全屏/画中画/截图
- 多路网格布局：1/4/9/16 路同时播放
- 响应式设计：桌面三栏布局 + 移动端触控优化
- RTSP 摄像头桥接：通过 Rust/Go 桥接服务接入 IP 摄像头

---

### Slide 3: 系统架构
技术架构图说明：
- 前端：React 18 + TypeScript (strict) + Tailwind CSS + daisyUI + Zustand
- WebRTC 协议栈：whip-whep 库 → WHEP 拉流 / WHIP 推流
- 服务端：Live777 SFU (Rust, v0.9.0) 运行在端口 7777
- RTSP 桥接：Rust + axum 0.8 (端口 4002) 或 Go (端口 4001)
- CI/CD：GitHub Actions → TypeCheck + Lint + Build + Playwright E2E + Rust Check

---

### Slide 4: AI Vibe Coding 设计理念
核心理念：让编译器帮你 Debug
- AI 多写 20% 的类型代码 → 换 80% 的 Debug 时间
- 选型原则：选编译期检查最严格的语言/框架
- 宁可多声明类型，也不要运行时 Debug

---

### Slide 5: 前端 — TypeScript 全量硬化
TypeScript 7 项 strict 标志全开：
- strict: true
- noUnusedLocals / noUnusedParameters — 死代码即时发现
- noUncheckedIndexedAccess — 数组访问强制 undefined 检查
- exactOptionalPropertyTypes — 可选属性精确检查
- noPropertyAccessFromIndexSignature — 禁止隐式 any 属性访问
- ESLint strictTypeChecked — 禁用 any / 不安全调用 / 不安全返回

---

### Slide 6: 前端 — 原子化 CSS 约束
UnoCSS → Tailwind CSS + daisyUI：
- daisyUI 提供语义组件类：btn, card, input, select...
- AI 不能再发明混乱的 class 组合
- 自定义 Live777 暗色主题（品牌蓝色系）
- 所有样式通过 daisyUI 组件 + Tailwind 原子类表达

---

### Slide 7: 后端 — Rust + axum 替代 Go
为什么 Rust：
- 编译期保证：无数据竞争、无 nil 指针、错误穷举
- Serde 编译期校验 JSON → 不会解析到错误类型
- thiserror 错误枚举 → match 穷举检查
- tracing 结构化日志 → 每个请求自动带 trace_id
- tower-http CORS → 类型安全的中间件

---

### Slide 8: 结构化日志系统
为 AI Debugging 设计的日志：
- JSON 格式输出 → AI 可 grep / jq 直接解析
- correlationId（关联 ID）→ 一次操作的全链路归因
- module 字段 → 快速定位代码组件
- 开发环境 → 彩色 pretty print + console 面板
- 后端 → tracing-subscriber JSON 格式

---

### Slide 9: CI/CD — 自动化回归测试
GitHub Actions 工作流：
- TypeCheck + Lint（每次 push）
- Vite Build（生产构建验证）
- Playwright E2E — 14 个测试场景：
  - URL 输入验证、协议切换
  - Play/Publish 模式切换
  - 频道管理（CRUD）
  - 网格模式切换
  - 设置面板（音量/自动播放/统计）
  - 移动端布局（375px viewport）
- Rust Bridge — cargo check + clippy + test

---

### Slide 10: 当前进展
已完成：
- ✅ TypeScript 7 项 strict 标志全开 + ESLint strictTypeChecked（0 错误）
- ✅ UnoCSS → Tailwind CSS v4 + daisyUI v5 迁移
- ✅ 前端结构化日志系统（JSON + 关联 ID）
- ✅ Rust + axum RTSP 桥接服务（编译通过）
- ✅ Playwright E2E 测试 + GitHub Actions CI 配置
- ✅ Live777 Server v0.9.0 部署运行
- ✅ README 文档全面更新

---

### Slide 11: 未来规划
下一步：
- Rust backend 集成测试 + 性能基准
- 增加 WebRTC 模拟测试的 Playwright 场景
- 多语言支持（i18n）
- 流录制和回放功能
- WebSocket 信令替代 HTTP 轮询

---

### Slide 12: Thank You
- GitHub: https://github.com/binbat/live777
- Live777 Player 代码库
- 感谢 Live777 团队的开源贡献
- Q&A
```

## Notes for Codex

- 目标格式：PowerPoint (.pptx) 或 Google Slides 或其他演示格式
- 主题色：主色 #3b82f6 (blue-500)，背景 #0b1121 (深蓝黑)，文字 #e5e7eb (浅灰)
- 推荐字体：系统默认 sans-serif（如 Segoe UI / SF Pro）
- 需要图表的话，可以用 Mermaid 或 ASCII art 生成架构图
- 演讲时长：约 15-20 分钟
