# /intel-distill 命令使用指南

> 从文档中提取战略情报并生成情报卡片

---

## 参数说明

| 参数 | 必填 | 说明 | 默认值 |
|------|------|------|--------|
| `--source <dir>` | 否 | 包含文档的源目录 | 当前目录 |
| `--output <dir>` | 否 | 情报卡片输出目录 | 当前目录 |
| `--review <action> [id]` | 否 | 审核操作：`list`/`approve`/`reject` | - |
| `--reason <text>` | 条件 | 审核原因（approve/reject 时推荐） | - |
| `--report <type> [period]` | 否 | 生成情报简报：`weekly`/`monthly` | - |
| `--help` | 否 | 显示此帮助信息 | - |

---

## 使用场景

### 场景 1：情报提取（默认模式）

```bash
# 处理当前目录下的所有文档
/intel-distill

# 处理指定目录下的文档
/intel-distill --source ./docs

# 指定输出位置
/intel-distill --source ./docs --output ./intelligence
```

**输出位置：**
| 内容 | 路径 |
|------|------|
| 情报卡片 | `{output}/intelligence/{domain}/` |
| 归档文件 | `{source}/archive/YYYY/MM/` |
| 转换文件 | `{source}/converted/YYYY/MM/` |
| 状态文件 | `{output}/.intel/state.json` |

---

### 场景 2：审核模式

```bash
# 列出所有待审核任务
/intel-distill --review list

# 批准待审核项
/intel-distill --review approve pending-threat-20260313-001 --reason "情报准确"

# 拒绝待审核项
/intel-distill --review reject pending-emerging-20260313-002 --reason "信息来源不可靠"
```

**审核流程：**
1. Agent 分析文档后，如果无法确定情报价值，会加入审核队列
2. 用户使用 `--review list` 查看待审核项
3. 用户决定批准或拒绝
4. 批准后生成情报卡片，拒绝后不生成

---

### 场景 3：报告模式

```bash
# 生成当前周报（从现有卡片）
/intel-distill --report weekly

# 生成指定周报
/intel-distill --report weekly 2026-W10

# 生成当前月报
/intel-distill --report monthly

# 生成指定月报
/intel-distill --report monthly 2026-03

# 指定情报卡片位置
/intel-distill --report weekly --output ./intel
```

**报告输出位置：**
| 类型 | 路径 |
|------|------|
| 周报 | `{output}/reports/weekly/{period}-briefing.md` |
| 月报 | `{output}/reports/monthly/{period}-briefing.md` |

---

## 目录结构

### 推荐目录布局

```
{source_dir}/
├── inbox/                          # 待处理文档（推荐入口）
│   ├── report-2026.pdf
│   ├── ai-article.docx
│   └── failed-doc.pdf.error.md     # 转换失败的错误日志
│
├── archive/                        # 已归档文档
│   └── 2026/03/
│       ├── report-2026.pdf
│       └── ai-article.docx
│
├── converted/                      # 转换后的 Markdown（含 frontmatter）
│   └── 2026/03/
│       ├── report-2026.md
│       └── ai-article.md
│
└── intelligence/                   # 情报卡片输出
    ├── threat-intelligence/
    ├── market-trends/
    └── ...
```

### 目录说明

| 目录 | 说明 | 用户可见性 |
|------|------|-----------|
| `inbox/` | 待处理文档目录 | ✅ 可见 |
| `inbox/*.error.md` | 转换失败的错误日志 | ✅ 可见 |
| `archive/YYYY/MM/` | 已归档文档目录 | ✅ 可见 |
| `converted/YYYY/MM/` | 转换后的 Markdown（含 frontmatter 元数据） | ✅ 可见 |
| `intelligence/` | 情报卡片输出 | ✅ 可见 |
| `.intel/` | 管理目录（状态文件） | ❌ 隐藏 |

---

## 支持的文件格式

| 格式 | 扩展名 | 说明 |
|------|--------|------|
| Markdown | `.md` | 直接处理 |
| 文本 | `.txt` | 直接处理 |
| PDF | `.pdf` | 大文件采用智能分页 |
| Word | `.docx` | 需要 pandoc 转换 |

---

## 增量处理机制

| 文件状态 | 处理方式 |
|----------|----------|
| 新文件 | 自动处理 |
| 已处理且无变更 | 自动跳过 |
| 已处理但有变更 | 重新处理 |
| 重复文件（相同哈希） | 自动跳过 |

**重新处理所有文件：**
```bash
rm -rf .intel/
```

---

## 输出结构

### 情报卡片（用户可见）

```
{output_dir}/intelligence/
├── threat-intelligence/     # 威胁态势
├── market-trends/           # 行业分析
├── vendor-intelligence/     # 厂商情报
├── technology-innovation/   # 新兴技术
├── customer-market/         # 客户与市场
├── policy-regulation/       # 政策法规
├── capital-investment/      # 资本动态
└── reports/                 # 情报报告
    ├── weekly/
    └── monthly/
```

### 状态文件（隐藏）

```
{output_dir}/.intel/
├── state.json            # 处理状态和统计
└── history/              # 历史归档
```

---

## 七大情报领域

| 领域 | 说明 | intelligence_id 前缀 |
|------|------|---------------------|
| **Threat-Landscape** | 新型攻击手法、威胁组织、重大安全事件 | threat-intelligence |
| **Industry-Analysis** | 市场规模、增长趋势、行业格局变化 | market-trends |
| **Vendor-Intelligence** | 产品发布、战略调整、并购、财务数据 | vendor-intelligence |
| **Emerging-Tech** | 新技术原理、应用场景、安全影响 | technology-innovation |
| **Customer-Market** | 客户需求变化、采购行为、预算趋势 | customer-market |
| **Policy-Regulation** | 新法规发布、合规要求、监管动态 | policy-regulation |
| **Capital-Investment** | 融资、并购、IPO、投资趋势 | capital-investment |

---

## 典型工作流

```bash
# 1. 将文档放入 inbox 目录
cp ~/Downloads/report.pdf ./docs/inbox/

# 2. 执行情报提取
/intel-distill --source ./docs --output ./docs

# 3. 查看结果
ls ./docs/intelligence/

# 4. 如有待审核项，查看并处理
/intel-distill --review list
/intel-distill --review approve pending-threat-20260313-001 --reason "确认有价值"

# 5. 生成周报
/intel-distill --report weekly --source ./docs
```

---

## 前置要求

### 必需依赖

- **Node.js 18+** 和 **npm**：用于 JSON Schema 校验
  ```bash
  # 首次使用前安装校验依赖
  cd plugins/market-radar/scripts && npm install
  ```

### 可选依赖

处理 `.docx` 文件需要安装 pandoc：

```bash
# macOS
brew install pandoc

# Linux
sudo apt-get install pandoc
```

处理 `.pdf` 文件需要安装 poppler 或 PyMuPDF：

```bash
# macOS
brew install poppler

# 或使用 PyMuPDF（推荐，更好的结构）
pip install PyMuPDF
```

---

## 常见问题

### Q: 为什么有些文档没有生成情报卡片？

A: 情报提取数量不设上限，根据源文档实际内容和情报价值决定。0 条情报也是正常的（无战略价值则不提取）。

### Q: 如何重新处理所有文件？

A: 删除 `{output_dir}/.intel/` 目录后重新运行命令。

### Q: 待审核项是什么？

A: 当 Agent 无法确定文档是否具有战略价值时，会将其加入审核队列，等待人工确认。

### Q: 删除源文件后情报卡片会丢失吗？

A: 不会。情报卡片完全独立于源文件，包含追溯所需的元数据。

### Q: 处理失败怎么办？

**转换失败**：源文件保留在 `inbox/`，同时生成 `.error.md` 错误日志，说明失败原因和建议操作。修复问题后删除 `.error.md` 文件，重新运行命令即可。

**情报提取失败**：查看状态文件 `state.json` 中的错误信息。

**错误码说明：**

| 错误码 | 说明 |
|--------|------|
| `READ_FAILED` | 无法读取源文件 |
| `CONVERSION_FAILED` | 文件格式转换失败 |
| `WRITE_FAILED` | 写入情报卡片失败 |
| `ANALYSIS_FAILED` | 内容分析失败 |
| `TOOL_UNAVAILABLE` | 必需工具不可用 |

---

## 相关资源

- 详细执行流程：`commands/intel-distill.md`
- JSON 输出格式：`agents/references/json-format.md`
- 领域模板：`skills/intelligence-output-templates/references/templates.md`
- 更新日志：`plugins/market-radar/CHANGELOG.md`