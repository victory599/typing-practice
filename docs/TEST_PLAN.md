# 测试计划

## 1. 测试范围

本地打字练习应用：本机文件服务 API、前端构建，以及核心业务路径（词库、成绩、路径迁移、练习评分约定）。

## 2. 环境

- Node.js（本机已装）
- 项目目录：`typing-practice`
- 启动文件服务：`npm run dev:server`（或完整 `npm run dev`）
- 前端构建：`npm run build`

## 3. 测试用例

| 编号 | 模块 | 步骤 | 预期 | 优先级 |
|------|------|------|------|--------|
| T01 | 服务健康 | 启动服务后请求 `GET /api/health` | 返回 `{ ok: true }` | 高 |
| T02 | 配置读取 | `GET /api/settings` | 含固定 `configPath`、`configPathFixed: true`、默认 `resolvedDataPath` | 高 |
| T03 | 种子范文 | 首次或空词库时 `GET /api/texts` | 返回不少于 1 条范文 | 高 |
| T04 | 新增文本 | `POST /api/texts` 合法标题正文 | 201，列表中可见 | 高 |
| T05 | 成绩写入 | `POST /api/results` 后 `GET /api/results` | 列表含刚写入记录 | 高 |
| T06 | 清空成绩 | `DELETE /api/results` | 列表为空 | 高 |
| T07 | 数据迁移 | 将 dataPath 迁到新目录再迁回默认 | 文件被移动（非复制留双份）；配置更新 | 高 |
| T08 | 配置不可改路径 | `PUT /api/settings` 尝试改 dataPath | dataPath 不被该接口修改 | 中 |
| T09 | 前端构建 | 执行 `npm run build` | 成功无报错 | 高 |
| T10 | 评分公式 | 对已知 correctChars / elapsedMs 手算对比 `calcWpm` / `calcAccuracy` | 与 PRD 约定一致 | 中 |
| T11 | 练习页加载 | 浏览器打开练习页（需 `npm run dev`） | 可选文本与模式，可聚焦打字区 | 高 |
| T12 | 错误标红与退格 | 故意打错再退格 | 错误着色；退格后可改正确 | 高 |

## 4. 执行说明

- API 用例可用 curl 或同类工具
- T11/T12 为手工界面用例
- 结果记入 `TEST_REPORT.md`
