---
name: obsidian-cli
description: This skill should be used when the user wants to interact with Obsidian from Claude Code. Triggers when the user asks to "search obsidian", "query bases", "read note properties", "set note properties", "create notes in obsidian", or when commands need to generate Obsidian-specific files like .base files.
---

## 概述

此 skill 提供通过 Obsidian CLI 操作 Obsidian 的能力，支持两类使用场景：

1. **命令内部使用**：如 intel-distill 生成 Bases 索引文件
2. **用户直接使用**：在 Claude Code 中查询、搜索、操作 Obsidian vault

## 前置条件

- Obsidian 应用运行中（CLI 需要连接到运行中的 Obsidian）
- Obsidian 1.12+ 版本（CLI 支持）
- 用户已在 Obsidian 设置中启用 CLI（Settings → General → Command line interface）

## 常用命令

### 文件操作

```bash
# 创建文件
obsidian create path="folder/note.md" content="# Title\n\nContent"

# 读取文件
obsidian read file="note-name"

# 列出文件
obsidian files folder="folder-path"

# 搜索文件
obsidian search query="search term" path="folder"
```

### 属性操作

```bash
# 读取属性
obsidian property:read file="note-name" name="property-name"

# 设置属性
obsidian property:set file="note-name" name="property-name" value="value"
```

### Bases 操作

```bash
# 列出所有 .base 文件
obsidian bases

# 查询 base 结果
obsidian base:query file="base-name" view="view-name" format=json
```

## 使用示例

### 创建 Bases 索引文件

```bash
obsidian create path="intelligence/Threat-Landscape/_index.base" content="filters:
  and:
    - file.ext == \"md\"
    - file.name != \"_index\"

views:
  - type: table
    name: \"按发布时间\"
    order:
      - note.published_at
    direction: DESC"
```

### 搜索情报卡片

```bash
obsidian search query="ransomware" path="intelligence"
```

### 查询 Bases 视图

```bash
obsidian base:query file="Threat-Landscape/_index" view="最近 7 天新增" format=json
```

## 注意事项

- CLI 命令需要 Obsidian 应用运行中
- `file` 参数使用文件名（不需要完整路径和扩展名）
- `path` 参数需要完整路径（从 vault 根目录开始）
- 多行内容使用 `\n` 表示换行，`\t` 表示制表符

## 相关资源

- **`references/cli-commands.md`** - 完整 CLI 命令参考