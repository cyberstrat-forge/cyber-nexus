# 更新日志

本文件记录仓库的所有重要变更。格式基于 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/)。

版本号说明：仓库版本反映整体状态，MAJOR=架构变更，MINOR=新插件，PATCH=插件更新。

---

## [1.0.26] - 2026-04-05

### 插件更新

#### market-radar v1.7.5

**修复**
- intel-pull 命令：所有脚本调用添加 `--root` 参数，修复路径错误

---

## [1.0.25] - 2026-04-05

### 插件更新

#### market-radar v1.7.4

**修复**
- TypeScript 类型定义：添加 `types: ["node"]` 到 tsconfig
- 配置文件位置：`pulse-sources.json` 移至项目根目录，避免升级覆盖
- 错误处理：rootDir 验证、mkdirSync 错误处理、迁移引导

---

## [1.0.24] - 2026-04-05

### 插件更新

#### market-radar v1.7.3

**变更**
- intel-pull 添加 `--root` 参数，状态文件统一在项目根目录
- 与 intel-distill 命令保持一致的路径逻辑

---

## [1.0.23] - 2026-04-05

### 插件更新

#### market-radar v1.7.2

**变更**
- intel-distill 默认参数优化：`--source` 默认 `./inbox`，`--output` 默认 `./intelligence`
- `archive/`、`converted/`、`.intel/` 始终在项目根目录下

---

## [1.0.22] - 2026-04-05

### 插件更新

#### market-radar v1.7.1

**变更**
- Obsidian Bases 索引位置：从各领域目录移至 intelligence 根目录，实现跨领域统一浏览
- Bases 视图优化：新增 5 个视图（全部情报、最近7天/30天按创建/发布时间），支持领域分组
- Frontmatter 模板清理：删除分隔注释块，保留干净的属性定义

**修复**
- scan-cards.ts：使用递归 glob pattern 支持年月子目录扫描
- migrate-to-yearly-folders.ts：多层错误处理增强健壮性

---

## [1.0.21] - 2026-04-05

### 插件更新

#### market-radar v1.7.0

**新增**
- 年月子目录结构：情报卡片输出改为 `{domain}/{YYYY}/{MM}/{filename}.md` 格式
- Obsidian Bases 索引：自动为各领域目录生成 `_index.base` 文件
- obsidian-cli skill：支持通过 Obsidian CLI 进行文件操作、属性读写、Bases 查询
- 历史文件迁移脚本：`migrate-to-yearly-folders.ts` 支持将扁平结构迁移到年月子目录

**变更**
- intelligence-analyzer Agent：更新输出路径逻辑，支持年月子目录结构
- intelligence-output-templates Skill：更新输出结构文档

**修复**
- scan-cards.ts：使用递归 glob pattern 支持年月子目录扫描
- migrate-to-yearly-folders.ts：多层错误处理增强健壮性

---

## [1.0.20] - 2026-04-03

### 插件更新

#### market-radar v1.6.1

**新增**
- update-state.ts 脚本：实现 intel-distill 步骤 8.4 状态更新
  - 更新 processed 记录（intelligence_ids, output_files 等）
  - 更新 review.pending 队列
  - 更新 stats.intelligence 统计计数器

**修复**
- 状态文件原子写入（临时文件 + rename 防止损坏）
- 损坏状态文件自动备份恢复
- 输入验证防止无效数据污染
- Pending ID 使用 timestamp + randomBytes 避免碰撞

---

## [1.0.19] - 2026-04-02

### 插件更新

#### market-radar v1.6.0

**新增**
- 情报卡片元数据四组层次结构
  - 第一组（核心标识）：intelligence_id, title, primary_domain, secondary_domains, security_relevance, tags
  - 第二组（item 来源追溯）：item_id, item_title, author, original_url, published_at, fetched_at 等
  - 第三组（情报源追溯）：source_id, source_name, source_url, source_tier, source_score
  - 第四组（处理状态）：review_status, generated_by, generated_session
- tags 嵌套命名空间格式（`geo:`, `business:` 前缀）

**变更**
- review_status 状态语义重构：`passed`/`pending`/`approved`/`rejected`
- 元数据继承链路：intel-pull 采集元数据完整传递到情报卡片

---

## [1.0.18] - 2026-04-01

### 插件更新

#### market-radar v1.4.0

**新增**
- intel-pull 适配 cyber-pulse API v1
  - 新增 `--init` 参数：首次同步/重新同步
  - 新增 `--until` 参数：时间范围终点
  - 新增 `--preview` 参数：预览模式（不更新状态）
- 配置简化：`key_ref` → `api_key`（直接存储 API Key）
- 输出格式统一：5组结构化 frontmatter
- 预处理脚本：添加 cyber-pulse 文件处理分支

**变更**
- API 端点：`/api/v1/contents` → `/api/v1/items`
- 响应结构扁平化
- Cursor 格式：`item_{8位hex}`
- 字段映射：`source.id` → `source.source_id` 等

**移除**
- `--id` 参数和单条获取功能
- 错误码：`ENV_VAR_NOT_SET`、`CONTENT_NOT_FOUND`

---

## [1.0.17] - 2026-03-22

### 插件更新

#### market-radar v1.3.3

**修复**
- API 响应验证：添加运行时响应结构验证，防止无效数据导致静默失败
- YAML 字符串转义：修复特殊字符导致格式错误的问题
- 错误详情保留：catch 块保留 PulseError.code 和 details

**变更**
- 类型定义增强：新增 SourceTier/SourceType 字面量联合类型
- 错误消息改进：包含预期格式说明

---

## [1.0.16] - 2026-03-22

### 插件更新

#### market-radar v1.3.2

**修复**
- API 适配：适配 cyber-pulse API v1.3.0 规范变更
  - 更新 API 路径：`/content` → `/api/v1/contents`
  - 更新响应结构：`{ data, meta }` 替代 `{ items, next_cursor, has_more }`

**变更**
- 字段映射适配 API v1.3.0（`id` → `content_id`，`title`/`content`/`fetched_at` 重命名）
- 新增字段支持：`url`, `author`, `tags`, `published_at`, `quality_score`, `source`
- 移除已弃用字段：`last_seen_at`, `source_count`

---

## [1.0.15] - 2026-03-20

### 插件更新

#### market-radar v1.3.1

**修复**
- 分页循环：修复 API 响应 `has_more=true` 时只获取第一页的问题
- 错误处理：配置加载时只捕获 `CONFIG_NOT_FOUND`，其他错误正确抛出
- 重试逻辑：区分可重试错误和不可重试错误
- 类型安全：`PullSourceResult` 改为可辨识联合类型

**变更**
- 统一错误码命名、完善文档注释、优化代码结构

---

## [1.0.14] - 2026-03-20

### 插件更新

#### market-radar v1.3.0

**新增**
- intel-pull 命令：从 cyber-pulse 情报服务 API 拉取标准化情报内容
  - 支持增量拉取、时间范围拉取、单条拉取、多源并行拉取
  - 源管理功能：列出、添加、删除、设置默认源
  - 状态共享：与 intel-distill 共用 state.json

**新增模块**
- scripts/pulse/：TypeScript 脚本模块（types, config, state, api-client, output, index）
- schemas/pulse-sources.schema.json：配置文件 JSON Schema
- commands/intel-pull.md：命令定义文件

---

## [1.0.13] - 2026-03-15

### 插件更新

#### market-radar v1.2.7

**变更**
- 情报卡片模板优化：为七大情报领域的 Body Template 添加一级标题和元数据块，改善 Markdown 导出 PDF 时的阅读体验

---

## [1.0.12] - 2026-03-15

### 插件更新

#### market-radar v1.2.6

**变更**
- 脚本依赖检查：在情报提取和报告生成流程中添加依赖检查步骤，改善首次使用体验

---

## [1.0.11] - 2026-03-15

### 插件更新

#### market-radar v1.2.5

**变更**
- Obsidian 链接格式支持：`archived_source` 和 `converted_file` 字段改用 `[[]]` 格式，支持在 Obsidian 中建立文件链接

---

## [1.0.10] - 2026-03-15

### 插件更新

#### market-radar v1.2.4

**变更**
- 元数据存储架构重构：从 `.meta` 文件迁移到 Markdown frontmatter 存储
- 错误处理优化：转换失败时生成用户友好的 `.error.md` 错误日志
- Agent 参数精简：从 5 个参数减少到 3 个（`source`、`output`、`session_id`）
- 跨平台兼容性：支持 CRLF/LF 行尾，YAML 字符串正确转义

**修复**
- 修复预处理归档顺序问题，确保原子性
- 移除未使用的 `getMimeType` 函数（死代码）
- 增强 `fs.readdirSync` 错误处理

---

## [1.0.9] - 2026-03-15

### 插件更新

#### market-radar v1.2.3

**变更**
- 情报卡片数量限制移除：移除所有文件中的"0-3 条"硬性限制
- 写作原则规范化：新增"提炼而非摘抄"原则，规范关键数据呈现格式
- 数据呈现格式优化：改用表格格式呈现数据，数值自动加粗

---

## [1.0.8] - 2026-03-15

### 插件更新

#### market-radar v1.2.2

**变更**
- 情报提取方法论优化：移除数量上限限制，改为根据实际价值灵活判断
- 新增 AI 行业重塑关注点：关注 AI 对开发模式、架构演进、产品形态、商业模式、竞争格局的影响
- 输出模板优化：移除核心事实章节的原文引用冗余，统一放置到原文关键引用章节
- 核心事实差异化：为7个情报领域设计差异化的核心事实描述

---

## [1.0.7] - 2026-03-15

### 插件更新

#### market-radar v1.2.1

**修复**
- Agent tools 字段格式优化：从字符串格式改为数组格式，提高解析器兼容性
- intel-distill 命令文档增强：明确列出 Agent 所需工具权限
- Skill 目录重命名：统一目录名与 SKILL.md 中的 name 字段一致
- geo_scope 字段必填强化：模板和检查清单中明确标注不可省略

**相关 Issue**
- [#29](https://github.com/cyberstrat-forge/cyber-nexus/issues/29) P0 Agent 工具权限配置问题
- [#29](https://github.com/cyberstrat-forge/cyber-nexus/issues/29) P1 geo_scope 字段缺失率高

---

## [1.0.6] - 2026-03-13

### 插件更新

#### market-radar v1.2.0

**新增**
- 重构 intel-distill 工作流
  - 新增 `inbox/` 目录作为待处理文档推荐入口
  - 源文件归档到 `archive/YYYY/MM/`，按年月组织
  - 转换文件输出到 `converted/YYYY/MM/`
  - 元数据文件保存在 archive/ 目录
  - 基于源文件哈希实现去重机制
- 情报卡片持久化支持
  - 卡片包含 `source_hash`、`archived_source`、`converted_file` 等元数据
  - 支持删除源文件后卡片仍可追溯
  - 审核机制：待审核不生成卡片，批准后才生成
- 新增 `scan-queue.ts` 扫描队列脚本

**变更**
- 统一 Schema 和文档格式
  - `processed` 类型统一为 object
  - 字段命名统一：`stats`、`updated_at`
  - `intelligence_id` 正则放宽支持多单词前缀
- 改进错误处理

**修复**
- Schema 与文档不一致问题
- 静默失败问题

#### market-radar v1.1.0

**新增**
- 情报报告功能
  - 支持 `--report weekly` 生成周报
  - 支持 `--report monthly` 生成月报

---

## [1.0.5] - 2026-03-13

### 插件更新

#### market-radar v1.1.0

- 情报报告功能：支持周报/月报生成

---

## [1.0.4] - 2026-03-11

### 插件更新

#### market-radar

- 新增 `geo_scope` 字段，用于标识情报的地域范围
- 新增 `business_model_tags` 字段，用于识别网络安全行业业务模式

---

## [1.0.3] - 2026-03-11

### 插件更新

#### market-radar

- 预处理管道：格式转换、噪声清洗、增量处理

---

## [1.0.2] - 2026-03-10

### 插件更新

#### market-radar

- 使用 content hash (MD5) 替代 mtime 进行变更检测
- 明确定义去重规则和归档规则

---

## [1.0.1] - 2026-03-10

### 插件更新

#### market-radar

- 优化 intel-distill 上下文架构
- 添加 JSON Schema 校验支持

---

## [1.0.0] - 2026-03-10

### 新增

- **market-radar** 插件首个正式版本
  - intel-distill 命令实现情报提取
  - 支持七大情报领域自动分类
  - 支持 Markdown、PDF、Word 文档处理
  - 实现增量处理机制

---

[1.0.26]: https://github.com/cyberstrat-forge/cyber-nexus/compare/v1.0.25...v1.0.26
[1.0.25]: https://github.com/cyberstrat-forge/cyber-nexus/compare/v1.0.24...v1.0.25
[1.0.24]: https://github.com/cyberstrat-forge/cyber-nexus/compare/v1.0.23...v1.0.24
[1.0.23]: https://github.com/cyberstrat-forge/cyber-nexus/compare/v1.0.22...v1.0.23
[1.0.22]: https://github.com/cyberstrat-forge/cyber-nexus/compare/v1.0.21...v1.0.22
[1.0.21]: https://github.com/cyberstrat-forge/cyber-nexus/compare/v1.0.20...v1.0.21
[1.0.20]: https://github.com/cyberstrat-forge/cyber-nexus/compare/v1.0.19...v1.0.20
[1.0.19]: https://github.com/cyberstrat-forge/cyber-nexus/compare/v1.0.18...v1.0.19
[1.0.18]: https://github.com/cyberstrat-forge/cyber-nexus/compare/v1.0.17...v1.0.18
[1.0.17]: https://github.com/cyberstrat-forge/cyber-nexus/compare/v1.0.16...v1.0.17
[1.0.15]: https://github.com/cyberstrat-forge/cyber-nexus/compare/v1.0.14...v1.0.15
[1.0.14]: https://github.com/cyberstrat-forge/cyber-nexus/compare/v1.0.13...v1.0.14
[1.0.13]: https://github.com/cyberstrat-forge/cyber-nexus/compare/v1.0.12...v1.0.13
[1.0.12]: https://github.com/cyberstrat-forge/cyber-nexus/compare/v1.0.11...v1.0.12
[1.0.11]: https://github.com/cyberstrat-forge/cyber-nexus/compare/v1.0.10...v1.0.11
[1.0.10]: https://github.com/cyberstrat-forge/cyber-nexus/compare/v1.0.9...v1.0.10
[1.0.9]: https://github.com/cyberstrat-forge/cyber-nexus/compare/v1.0.8...v1.0.9
[1.0.8]: https://github.com/cyberstrat-forge/cyber-nexus/compare/v1.0.7...v1.0.8
[1.0.7]: https://github.com/cyberstrat-forge/cyber-nexus/compare/v1.0.6...v1.0.7
[1.0.6]: https://github.com/cyberstrat-forge/cyber-nexus/compare/v1.0.5...v1.0.6
[1.0.5]: https://github.com/cyberstrat-forge/cyber-nexus/compare/v1.0.4...v1.0.5
[1.0.4]: https://github.com/cyberstrat-forge/cyber-nexus/compare/v1.0.3...v1.0.4
[1.0.3]: https://github.com/cyberstrat-forge/cyber-nexus/compare/v1.0.2...v1.0.3
[1.0.2]: https://github.com/cyberstrat-forge/cyber-nexus/compare/v1.0.1...v1.0.2
[1.0.1]: https://github.com/cyberstrat-forge/cyber-nexus/compare/v1.0.0...v1.0.1
[1.0.0]: https://github.com/cyberstrat-forge/cyber-nexus/releases/tag/v1.0.0