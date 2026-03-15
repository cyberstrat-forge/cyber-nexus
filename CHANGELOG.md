# 更新日志

本文件记录仓库的所有重要变更。格式基于 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/)。

版本号说明：仓库版本反映整体状态，MAJOR=架构变更，MINOR=新插件，PATCH=插件更新。

---

## [1.0.7] - 2026-03-15

### 插件更新

#### market-radar v1.2.1

**修复**
- Agent tools 字段格式优化：从字符串格式改为数组格式，提高解析器兼容性
- intel-distill 命令文档增强：明确列出 Agent 所需工具权限
- Skill 目录重命名：统一目录名与 SKILL.md 中的 name 字段一致

**相关 Issue**
- [#29](https://github.com/cyberstrat-forge/cyber-nexus/issues/29) P0 Agent 工具权限配置问题

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

[1.0.7]: https://github.com/cyberstrat-forge/cyber-nexus/compare/v1.0.6...v1.0.7
[1.0.6]: https://github.com/cyberstrat-forge/cyber-nexus/compare/v1.0.5...v1.0.6
[1.0.5]: https://github.com/cyberstrat-forge/cyber-nexus/compare/v1.0.4...v1.0.5
[1.0.4]: https://github.com/cyberstrat-forge/cyber-nexus/compare/v1.0.3...v1.0.4
[1.0.3]: https://github.com/cyberstrat-forge/cyber-nexus/compare/v1.0.2...v1.0.3
[1.0.2]: https://github.com/cyberstrat-forge/cyber-nexus/compare/v1.0.1...v1.0.2
[1.0.1]: https://github.com/cyberstrat-forge/cyber-nexus/compare/v1.0.0...v1.0.1
[1.0.0]: https://github.com/cyberstrat-forge/cyber-nexus/releases/tag/v1.0.0