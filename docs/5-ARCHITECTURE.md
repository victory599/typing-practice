# 架构说明

## 1. 总体结构

本项目是「浏览器前端 + 本机 Node 文件服务」的本地应用：

- 前端：Vue 3 + TypeScript + Vue Router（Vite 开发与打包）
- 后端：仅服务本机的小型 Node（Express）进程，负责读写磁盘上的配置与数据文件

```text
typing-practice/
├── config/           # 固定配置目录（不可由用户改路径）
├── data/             # 默认数据目录（可迁移）
├── docs/             # 中文文档
├── server/           # 本机文件服务
├── src/              # Vue 前端
│   ├── api/          # 调用 /api
│   ├── components/   # 打字区、指标、结果卡；StatsCharts（统计按需图表）
│   ├── composables/  # 打字引擎
│   ├── views/        # 练习 / 词库 / 统计 / 设置
│   └── ...
└── package.json
```

## 2. 为什么需要本机 Node 小服务

浏览器中的前端 JavaScript **不能**直接把文件写入工程目录下的 `config/`、`data/`。  
为了把词库、成绩、配置以「本地文件夹里看得见的文件」形式保存，并避免把业务数据堆进 IndexedDB，应用启动时会同时运行一个 **只监听 `127.0.0.1` 的 Node 文件服务**。

| 项目 | 说明 |
|------|------|
| 默认端口 | `8787`（前端开发服务器通过代理访问 `/api`） |
| 绑定地址 | 仅 `127.0.0.1`，不对外网开放 |
| 读写内容 | `config/settings.json`；数据目录下 `texts.json`、`results.json` |
| 如何启动 | `npm run dev`（`scripts/dev.mjs` 先起文件服务再起 Vite，并打印浏览器地址与文件服务地址） |
| 如何停止 | 在运行该命令的终端按 **Ctrl+C** |
| 关浏览器会停吗 | **不会**。关掉网页后 Node 进程仍在，需手动结束终端进程 |
| 端口占用 | 若 8787/5173 被旧进程占用会启动失败；用 `lsof -i :8787` 查找后结束进程 |

正式业务数据（配置、词库、成绩）**不**写入 IndexedDB。若将来必须在浏览器暂存，优先 `sessionStorage`，其次带过期时间的 `localStorage`，不使用 IndexedDB 堆业务数据。

## 3. 数据流

1. 页面通过 `fetch('/api/...')` 访问接口（开发态由 Vite 代理到 `8787`）
2. Node 服务读取固定 `config/settings.json`，解析当前数据目录（默认应用根下 `data/`，或用户迁移后的路径）
3. 对 JSON 文件做读写；写入采用「临时文件再替换」降低损坏风险
4. 迁移数据目录时移动 `texts.json` / `results.json`（跨盘则写入新位置再删除旧文件），不故意留双份
5. 词库批量/全部删除：`POST /api/texts/bulk-delete`（body：`{ ids: [] }` 或 `{ all: true }`）
6. 范文种子：仅当 `texts.json` **不存在**时写入；空数组表示用户已清空，不再自动灌回

## 4. 前端核心

- **打字引擎** `src/composables/useTypingEngine.ts`：字符级比对、错误可继续、退格、限时结束、WPM/准确率
- **评分** `src/lib/metrics.ts`：与 PRD 一致
- **页面**：
  - 练习：随机选题；结算「换一篇 / 去词库」
  - 词库：勾选批量删除、全部删除
  - 设置：数据路径确认迁移、恢复默认、无变更时按钮置灰
  - 统计：成绩列表与清空；`StatsCharts` 按需生成模式饼图 / WPM·准确率条形图（Chart.js + vue-chartjs，仅前端可视化）

## 5. 常用脚本

| 命令 | 作用 |
|------|------|
| `npm install` | 安装依赖。首次使用时必须执行 |
| `npm run dev` | 启动文件服务 + 前端，并打印浏览器访问地址 |
| `npm run dev:server` | 仅启动文件服务 |
| `npm run build` | 类型检查并打包前端 |
| `npm start` | 生产模式：由文件服务托管 `dist`（需先 build） |
| `npm run clean` | 清理依赖（`node_modules`） + 构建产物（`dist`） |
| `npm run clean:dist` | 清理构建产物（`dist`） |
