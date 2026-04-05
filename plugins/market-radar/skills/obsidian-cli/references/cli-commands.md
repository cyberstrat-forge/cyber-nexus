# Obsidian CLI 命令参考

本文档提供 Obsidian CLI 的完整命令参考，基于 Obsidian 1.12+ 版本。

## 文件操作

### `create` - 创建文件

```bash
obsidian create path="folder/note.md" content="# Title\n\nContent"

# 参数
name=<name>        # 文件名
path=<path>        # 文件路径
content=<text>     # 文件内容
template=<name>    # 使用的模板

# 标志
overwrite          # 覆盖已存在的文件
open               # 创建后打开文件
newtab             # 在新标签页打开
```

### `read` - 读取文件

```bash
obsidian read file="note-name"
obsidian read path="folder/note.md"
```

### `files` - 列出文件

```bash
obsidian files folder="folder-path"

# 参数
folder=<path>      # 过滤文件夹
ext=<extension>    # 过滤扩展名

# 标志
total              # 返回文件数量
```

### `search` - 搜索文件

```bash
obsidian search query="search term" path="folder"

# 参数
query=<text>       # (必填) 搜索查询
path=<folder>      # 限制文件夹
limit=<n>          # 最大文件数
format=text|json   # 输出格式

# 标志
total              # 返回匹配数量
case               # 区分大小写
```

## 属性操作

### `property:read` - 读取属性

```bash
obsidian property:read file="note-name" name="property-name"
```

### `property:set` - 设置属性

```bash
obsidian property:set file="note-name" name="status" value="done"

# 参数
name=<name>                                    # (必填) 属性名
value=<value>                                  # (必填) 属性值
type=text|list|number|checkbox|date|datetime   # 属性类型
file=<name>                                    # 文件名
path=<path>                                    # 文件路径
```

### `property:remove` - 删除属性

```bash
obsidian property:remove file="note-name" name="property-name"
```

### `properties` - 列出属性

```bash
obsidian properties

# 参数
file=<name>        # 显示指定文件的属性
path=<path>        # 文件路径
name=<name>        # 统计特定属性

# 标志
total              # 返回属性数量
counts             # 包含出现次数
active             # 显示当前活动文件的属性
```

## Bases 操作

### `bases` - 列出 Bases 文件

```bash
obsidian bases
```

### `base:views` - 列出 Base 视图

```bash
obsidian base:views file="base-name"
```

### `base:create` - 在 Base 中创建项目

```bash
obsidian base:create file="base-name" name="new-item"

# 参数
file=<name>        # base 文件名
path=<path>        # base 文件路径
view=<name>        # 视图名
name=<name>        # 新文件名
content=<text>     # 初始内容

# 标志
open               # 创建后打开
newtab             # 在新标签页打开
```

### `base:query` - 查询 Base

```bash
obsidian base:query file="base-name" format=json

# 参数
file=<name>                    # base 文件名
path=<path>                    # base 文件路径
view=<name>                    # 视图名
format=json|csv|tsv|md|paths   # 输出格式
```

## 标签操作

### `tags` - 列出标签

```bash
obsidian tags

# 参数
file=<name>        # 显示指定文件的标签
path=<path>        # 文件路径
sort=count         # 按数量排序

# 标志
total              # 返回标签数量
counts             # 包含出现次数
active             # 显示当前活动文件的标签
```

## 日常笔记

### `daily` - 打开今日笔记

```bash
obsidian daily
```

### `daily:append` - 追加内容到今日笔记

```bash
obsidian daily:append content="- [ ] New task"

# 标志
inline             # 不换行追加
open               # 追加后打开
```

### `daily:prepend` - 前置内容到今日笔记

```bash
obsidian daily:prepend content="# Heading"
```

## 任务操作

### `tasks` - 列出任务

```bash
obsidian tasks

# 参数
file=<name>        # 过滤文件
status="<char>"    # 过滤状态字符

# 标志
total              # 返回任务数量
done               # 显示已完成
todo               # 显示未完成
daily              # 显示日常笔记中的任务
```

### `task` - 显示/更新任务

```bash
obsidian task file="note-name" line=5 toggle

# 参数
ref=<path:line>    # 任务引用
line=<n>           # 行号
status="<char>"    # 设置状态字符

# 标志
toggle             # 切换状态
done               # 标记完成
todo               # 标记未完成
```

## Vault 操作

### `vault` - 显示 Vault 信息

```bash
obsidian vault

# 参数
info=name|path|files|folders|size  # 返回特定信息
```

### `vaults` - 列出所有 Vault

```bash
obsidian vaults

# 标志
total              # 返回数量
verbose            # 包含路径
```

## 开发者命令

### `eval` - 执行 JavaScript

```bash
obsidian eval code="app.vault.getFiles().length"
```

### `devtools` - 打开开发者工具

```bash
obsidian devtools
```

### `dev:screenshot` - 截图

```bash
obsidian dev:screenshot path="screenshot.png"
```