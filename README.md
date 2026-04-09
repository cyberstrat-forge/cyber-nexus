# Cyber Nexus

[![Version](https://img.shields.io/badge/version-1.0.39-blue.svg)](https://github.com/cyberstrat-forge/cyber-nexus/releases/tag/v1.0.39)
[![CI](https://github.com/cyberstrat-forge/cyber-nexus/actions/workflows/ci.yml/badge.svg)](https://github.com/cyberstrat-forge/cyber-nexus/actions/workflows/ci.yml)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)

> 将 AI 能力融入网络安全战略规划与产品管理

## 概述

Cyber Nexus 是一个 Claude Code 插件集合，致力于将 AI 能力融入网络安全战略规划和产品管理的核心流程。

当前处于**早期开发阶段**，首个插件 market-radar 已发布。后续将持续扩展更多能力，覆盖战略分析的完整链路。

## 插件列表

| 插件 | 版本 | 状态 | 描述 |
|------|------|------|------|
| [market-radar](./plugins/market-radar) | 1.9.7 | ✅ 可用 | 从文档中提取战略情报，生成情报卡片和主题分析报告 |
| competitive-analysis | - | 📋 规划中 | 竞争对手分析与对比 |
| product-management | - | 📋 规划中 | 产品管理与决策支持 |

## 快速开始

### 前置要求

- **Claude Code CLI**：已安装并配置
- **Node.js 18+**：用于 JSON Schema 校验

### 安装

```bash
# 安装根目录依赖（Git Hooks: commitlint）
pnpm install

# 安装插件脚本依赖
cd plugins/market-radar/scripts && pnpm install
```

### 使用示例

```bash
# 情报拉取：从 cyber-pulse API 拉取标准化情报
/intel-pull

# 情报提取：从文档中提取战略情报
/intel-distill --source ./docs --output ./intelligence

# 主题分析：识别情报卡片中的趋势和模式
/thematic-analysis --source ./intelligence --report both
```

更多使用方法请参考各插件的 [README](./plugins/market-radar/README.md)。

## 项目结构

```
cyber-nexus/
├── .claude-plugin/
│   └── marketplace.json          # 插件市场配置
├── plugins/
│   └── market-radar/             # 市场情报插件
│       ├── commands/             # 命令定义
│       ├── agents/               # 智能代理
│       ├── skills/               # 技能模块
│       ├── schemas/              # JSON Schema
│       └── scripts/              # 工具脚本
├── CLAUDE.md                     # 开发规范（AI 助手工作指南）
├── CHANGELOG.md                  # 更新日志
└── README.md
```

## 开发规范

本项目使用：
- **Git Hooks**：husky + commitlint 实现提交信息校验
- **CI/CD**：GitHub Actions 自动运行类型检查、Schema 校验
- **提交规范**：Conventional Commits

详细规范请参考 [CLAUDE.md](./CLAUDE.md)。

## 更新日志

详见 [CHANGELOG.md](./CHANGELOG.md)。

## 许可证

MIT

## 作者

luoweirong (weirong.luo@qq.com)