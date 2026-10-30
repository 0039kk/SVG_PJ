# SVG Editor CLI

TypeScript 面向对象 SVG 编辑器，支持六种内置图形、嵌套分组、编辑撤销重做及 SVG 读写。

## 运行

推荐 Node.js 24（本次验证为 24.14.1）。完整兼容范围见 `package.json` 的 `engines`。

```sh
npm ci
npm run cli
```

输入 `help` 查看语法，EOF 结束（Windows 为 Ctrl+Z 后回车；macOS/Linux 为 Ctrl+D）。交互模式提示符为 `svg>`，管道回放不输出提示符。

```text
init 800 600
create g node
create rect r 120 100 160 60 #4a90d9 in node
create text t 155 135 "开始" in node
move node 0 100
undo
save drawing.svg
```

保存的 SVG 可直接拖入浏览器查看。命令错误输出 `error:`，当前会话继续。

## 验证与示例

```sh
npm run check
npm run examples
```

- `check`：类型检查、构建、架构规则检查和 79 项测试。
- `examples`：用编译后 CLI 回放两份需求示例，生成 `examples/flowchart.svg`、`examples/demo.svg`；回放记录位于忽略提交的 `.verification/`。
- `npm run build` 后也可使用 `npm start` 或 `node dist/main.js`。

PowerShell 回放文件：

```powershell
Get-Content -Encoding utf8 examples/flowchart.commands | npm run cli
```

支持 `rect/circle/ellipse/line/text/g`；本阶段不实现 box 或插件。读入范围为六类型和白名单属性，transform、非默认 viewBox 等不支持内容明确报错。

详细架构、语义决策、AI 协作过程、测试证据和交付自查见 [doc/README.md](doc/README.md)；原始需求见 [phase_cli_1.md](phase_cli_1.md)。
