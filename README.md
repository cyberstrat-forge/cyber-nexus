# Cyber Nexus

[![Version](https://img.shields.io/badge/version-1.0.6-blue.svg)](https://github.com/cyberstrat-forge/cyber-nexus/releases/tag/v1.0.6)
[![CI](https://github.com/cyberstrat-forge/cyber-nexus/actions/workflows/ci.yml/badge.svg)](https://github.com/cyberstrat-forge/cyber-nexus/actions/workflows/ci.yml)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)

> 利用 AI 赋能网络安全战略规划与产品管理

## 概述

Cyber Nexus 是一个正在构建的 Claude Code 插件集合，致力于将 AI 能力融入网络安全战略规划和产品管理的核心流程。

当前处于**早期开发阶段**，首个插件 market-radar 已发布，提供市场情报自动提取和主题分析功能。后续将持续扩展更多能力，覆盖战略分析的完整链路。

## 插件列表

| 插件 | 版本 | 状态 | 功能 |
|------|------|------|------|
| [market-radar](./plugins/market-radar) | 1.2.0 | ✅ 可用 | 市场情报提取与主题分析 |
| competitive-analysis | - | 📋 规划中 | 竞争对手分析 |
| product-management | - | 📋 规划中 | 产品管理 |

---

### market-radar 插件

市场情报自动提取工具，提供完整的情报处理链路。

**命令列表：**

| 命令 | 状态 | 功能 |
|------|------|------|
| `intel-distill` | ✅ 可用 | 情报蒸馏：从文档提取战略情报，生成情报卡片 |
| `thematic-analysis` | ✅ 可用 | 主题分析：跨文档识别趋势和模式，生成分析报告 |
| `insight-cards` | 📋 规划中 | 洞察卡片：生成结构化洞察报告 |
| `strategic-judgment` | 📋 规划中 | 战略判断：基于情报生成决策建议 |

**核心特性：**

- 🎯 **七大情报领域**：威胁态势、行业分析、厂商情报、新兴技术、客户市场、政策法规、资本动态
- 🤖 **智能分析**：Agent 自主完成文档读取、情报提取、卡片生成
- ✅ **Schema 校验**：JSON Schema 确保输出格式一致性
- 📈 **增量处理**：自动跳过已处理文件，仅处理新增或变更

## 快速开始

### 前置要求

- **Claude Code CLI**：已安装并配置
- **Node.js 18+**：用于 JSON Schema 校验

### 安装插件

```bash
# 从市场安装
/plugin install market-rader@cyber-nexus

# 或手动添加仓库
/plugin marketplace add cyberstrat-forge/cyber-nexus
/plugin install market-radar@cyber-nexus
```

### 首次使用

```bash
# 安装根目录依赖（Git Hooks: commitlint）
npm install

# 安装插件脚本依赖
cd plugins/market-radar/scripts && npm install
```

### 使用命令

```bash
# 显示帮助
/intel-distill --help

# 处理当前目录下的所有文档
/intel-distill

# 指定源目录和输出目录
/intel-distill --source ./docs --output ./intelligence

# 主题分析：识别情报卡片中的趋势和模式
/thematic-analysis --source ./intel

# 生成主题报告和全景报告
/thematic-analysis --source ./intel --report both
```

## 输出说明

### 情报卡片

按领域分类存储在输出目录：

```
{output_dir}/
├── Threat-Landscape/     # 威胁态势：攻击手法、威胁组织、安全事件
├── Industry-Analysis/    # 行业分析：市场规模、增长趋势、竞争格局
├── Vendor-Intelligence/  # 厂商情报：产品发布、战略调整、并购动态
├── Emerging-Tech/        # 新兴技术：AI安全、零信任、云安全
├── Customer-Market/      # 客户与市场：需求变化、采购行为、预算趋势
├── Policy-Regulation/    # 政策法规：新法规、合规要求、监管动态
└── Capital-Investment/   # 资本动态：融资、并购、IPO
```

### 管理文件

```
{output_dir}/.intel/
├── state.json            # 处理状态和统计
└── history/              # 历史归档
```

## 项目结构

```
cyber-nexus/
├── .claude-plugin/
│   └── marketplace.json              # 市场配置：插件仓库注册信息
└── plugins/
    └── market-radar/                 # 市场情报提取插件
        ├── .claude-plugin/
        │   └── plugin.json           # 插件元数据：名称、版本、作者
        ├── commands/                 # 命令定义
        │   ├── intel-distill.md      # intel-distill 命令
        │   ├── thematic-analysis.md  # thematic-analysis 命令
        │   └── references/
        │       ├── intel-distill-guide.md
        │       └── thematic-analysis-guide.md
        ├── agents/                   # 智能代理
        │   ├── intelligence-analyzer.md
        │   ├── intelligence-cluster.md
        │   ├── theme-analyzer.md
        │   ├── panorama-synthesizer.md
        │   └── references/
        │       └── json-format.md
        ├── skills/                   # 技能模块（预加载知识）
        │   ├── domain-knowledge/
        │   ├── analysis-methodology/
        │   ├── output-templates/
        │   ├── clustering-methodology/
        │   ├── thematic-methodology/
        │   └── thematic-templates/
        ├── schemas/                  # JSON Schema 定义
        │   ├── agent-result.schema.json
        │   ├── state.schema.json
        │   ├── intelligence-output.schema.json
        │   ├── themes-config.schema.json
        │   └── theme-state.schema.json
        ├── scripts/                  # 工具脚本
        │   ├── preprocess/           # 预处理模块
        │   ├── thematic/             # 主题分析脚本
        │   └── validate-json.ts
        └── README.md                 # 插件文档
```

## 开发环境

### Git Hooks

项目使用 husky + commitlint 实现本地提交校验：

- **commit-msg**: 校验提交信息符合 Conventional Commits 规范
- **pre-commit**: 阻止提交敏感文件

### CI/CD

GitHub Actions 自动运行：
- TypeScript 类型检查
- JSON Schema 校验
- 提交信息格式校验（PR）

### 提交规范

```
<type>(<scope>): <description>

# 示例
feat(market-radar): add new feature
fix: resolve issue
docs: update README
```

## 更新日志

详见 [CHANGELOG.md](./CHANGELOG.md)。

## 许可证

MIT

## 作者

luoweirong (weirong.luo@qq.com)