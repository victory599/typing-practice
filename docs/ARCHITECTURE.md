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
│   ├── components/   # 打字区、指标、结果卡
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
| 如何启动 | `npm run dev` 会并行启动文件服务与 Vite；也可单独 `npm run dev:server` |
| 如何停止 | 在运行该命令的终端按 **Ctrl+C** |
| 关浏览器会停吗 | **不会**。关掉网页后 Node 进程仍在，需手动结束终端进程 |

正式业务数据（配置、词库、成绩）**不**写入 IndexedDB。若将来必须在浏览器暂存，优先 `sessionStorage`，其次带过期时间的 `localStorage`，不使用 IndexedDB 堆业务数据。

## 3. 数据流

1. 页面通过 `fetch('/api/...')` 访问接口（开发态由 Vite 代理到 `8787`）
2. Node 服务读取固定 `config/settings.json`，解析当前数据目录（默认应用根下 `data/`，或用户迁移后的路径）
3. 对 JSON 文件做读写；写入采用「临时文件再替换」降低损坏风险
4. 迁移数据目录时移动 `texts.json` / `results.json`（跨盘则写入新位置再删除旧文件），不故意留双份

## 4. 前端核心

- **打字引擎** `src/composables/useTypingEngine.ts`：字符级比对、错误可继续、退格、限时结束、WPM/准确率
- **评分** `src/lib/metrics.ts`：与 PRD 一致
- **页面**：练习、词库、统计、设置（仅数据路径可迁，配置路径展示为固定）

## 5. 常用脚本

| 命令 | 作用 |
|------|------|
| `npm run dev` | 同时启动文件服务 + 前端开发服务器 |
| `npm run build` | 类型检查并打包前端 |
| `npm run dev:server` | 仅启动文件服务 |

更面向使用者的说明见根目录 `README.md`（不含技术细节）。
