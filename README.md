# WorkBuddy2API Hub Plus

把 [WorkBuddy2API Hub](https://github.com/niyouqianma/workbuddy2api-hub) 变成
[AstrLink](https://github.com/QuantumNous/AstrLink) 里的一种提供商：在「添加 API
提供商」里直接选 **WorkBuddy2API Hub（国际版 / 国内版）**，填上地址和密钥就能用，和内置厂商一样参与路由、故障切换、用量统计和隐私检查。

插件只申请 `provider` 一项能力：不联网、不读请求正文、不存数据、没有界面代码。上游请求由 AstrLink
发出，密钥始终在 AstrLink 手里，插件看不到。

## 两个版本，装一个就行

| 插件 | 地址 | 特点 |
| --- | --- | --- |
| **本目录**（v2 供应商适配器） | `https://github.com/nasvip/workbuddy2api-hub-plus` | 国际版 / 国内版两种类型；错误语义可按错误体判定（402 也能故障切换）；插件逐请求跑钩子 |
| **[relay/](relay/README.md)**（v1 new-api 契约） | `https://github.com/nasvip/workbuddy2api-hub-plus/tree/v0.2.0/relay` | 提供商页有**余额卡**（读 hub 的 `/v1/balance-summary`，用提供商自己的 key）、密钥提示；网关直通，插件不跑 JS |

两者可以同时装（key 不同），但同一个 hub 建议只留一个提供商，免得重复路由。

## 它做了什么

| 能力 | 说明 |
| --- | --- |
| 默认地址 | `http://127.0.0.1:8788/v1`，本机 Docker / NAS 部署时改成对应地址即可 |
| 认证方式 | `Authorization: Bearer`，密钥填在提供商的「密钥」里 |
| Chat Completions | 直通 `POST /v1/chat/completions`（整段与流式） |
| Responses | 直通 `POST /v1/responses`（Codex 一类客户端保真度更高） |
| 其他协议 | Anthropic Messages / Gemini 的请求由 AstrLink 转成 Chat Completions 再发出（原因见下） |
| 模型清单 | 预填国际版 / 国内版各自的模型；保存后可点「拉取模型」从 hub 取当前密钥真正可用的清单 |
| 错误语义 | 402 余额、429 限流、503 无可用账号、5xx 会交给下一家提供商；401 / 403 不切换，直接报配置或额度问题 |

## 安装

在 AstrLink 的「插件」页点「安装插件」：

- **从 GitHub**：粘贴本仓库地址，装最新的版本标签。
- **从本地文件夹**：点「选择文件夹」，选这个项目目录（开发时用）。

安装时只会申请 `provider` 一项能力，确认并启用即可。插件启用后，提供商类型才会出现在添加页。

## 使用

1. **API 提供商 → 添加 API 提供商 → 「插件」分组 → WorkBuddy2API Hub（国际版 / 国内版）**。
2. 地址默认是 `http://127.0.0.1:8788/v1`。hub 在 Docker、NAS 或另一台机器上时，换成
   `http://<主机>:8788/v1`。
3. 密钥填 hub 的 API Key：Web 看板「设置 → API Key」，或首次用
   `start-wb-proxy-lan` 启动时控制台打印的那个；hub 关闭鉴权时随便填一个非空值。
4. 保存后打开提供商，点「拉取模型」核对清单；也可以在编辑器里手动增删。
5. 用「测试」发一句话，确认能回复。

客户端连 AstrLink 仍然使用 **AstrLink 访问令牌**，不是 hub 的密钥。

## 国际版和国内版是两套清单，不是两套接口

同一台 hub 可以同时挂国际版和国内版的账号，一次请求走哪个区由「密钥绑定的区 → 请求头
`X-Realm` → hub 当前区（默认国际版）」决定。两个提供商类型的**地址完全一样**，区别只有添加时预填的模型清单，因为两区的模型 id 不同（国际版 `gpt-6-sol`、国内版 `hy4-preview-f`）。只用一个区时，加对应的那一个就行，另一个无视即可；两个区各有一把密钥时，各加一个、填各自的密钥最省事。

## 为什么不直通 Anthropic Messages 和 Gemini

hub 有这两个接口，但都是转成 Chat Completions 的桥，而且：

- Anthropic 桥在 hub 里默认是**关闭**的，提示写着「把请求转成 Chat Completions 并忽略
  `cache_control`，可能造成积分过度消耗」，要等 prompt-cache 对齐后才默认打开（hub issue #367）。
- Gemini 路由是 hub 内部回环调用自己的 chat，而且流式应答是一次性返回（`Content-Length`），不是增量。

所以让 AstrLink 把 Claude Code / Gemini 的请求转成 Chat Completions 发给 hub，走的是 hub
自己的主链路，更省积分也更稳。如果你确实要让插件声明这两个原生协议，改 `src/plugin.ts`
里 `protocols` 一行即可（前提是 hub 已打开对应开关）。

## 模型

- **国际版**预填 hub 国际站的常用模型：`default-model`、`gpt-6-astra`、`gpt-6.1-sol`、`gpt-5.6-sol`、
  `grok-4.7`、`gemini-3.8-flash`、`glm-5.3`、`kimi-k3.1-pro`、`minimax-m3.1-flash`、`deepseek-v4.1-flash` 等 20 个。
- **国内版**预填国内站目录：`hy4-preview-f`、`glm-5.3`、`glm-5.2`、`minimax-m3`、`kimi-k3-1`、
  `deepseek-v4-pro` 等 14 个。
- 两边的模型 id 来自 hub 自己的目录，**你的密钥绑定了哪个区，就用哪个区的清单**；不确定时先拉取一次。

客户端发的模型名和 hub 的 id 往往不一样（例如 Claude Code 发 `claude-sonnet-4-5`，hub 只认自己的
id）。在提供商的「模型重定向」里加几条规则即可，例如：

| 客户端发送 | 重定向到 | 场景 |
| --- | --- | --- |
| `claude-sonnet-4-5` | `gpt-6-sol` | Claude Code 走 GPT 系 |
| `claude-opus-4-1` | `gpt-6.1-sol` | 长上下文、复杂任务 |
| `gpt-5-codex` | `gpt-5.6-sol` | Codex 系 |
| `gpt-5` | `default-model` | 让老客户端也能用 |

重定向是**逐条精确匹配**，没有通配符：客户端可能发的每个模型名都要单列一条，或者等
`0.3.0` 的可选自动兜底（`route` 钩子，把清单外的模型名统一换成一个目标模型）。

## 排错

| 现象 | 原因 |
| --- | --- |
| 401 `invalid_api_key` | 密钥填错，或 hub 开了鉴权而密钥为空 |
| 402 | hub 上游账号余额/积分不足，插件会让 AstrLink 换下一家提供商 |
| 403 | 该密钥的每日 token 额度用完，或内容被上游拒绝 |
| 429 | 上游限流或该密钥并发超限，可稍后重试 |
| 503 | hub 当前没有可用账号（全部掉线/被限），检查 hub 看板 |
| 拉取模型失败 | 地址少了 `/v1`、hub 没启动，或密钥无模型权限 |
| 502 / 超时 | hub 到上游的连接问题，看 hub 自己的日志 |

## 已知限制

AstrLink 插件平台现在的边界，纯插件绕不过去（本项目也不改 AstrLink 源码）：

1. **提供商列表里是通用插件图标**，品牌图标只出现在「添加提供商」的选择页。
2. **没有 AstrLink 原生的余额卡**（原因见下一节）。
3. **没有每提供商独立设置**，所以用两个提供商类型区分国际版 / 国内版。

## 密钥与额度

- 你在「提供商」里填的地址和密钥由 AstrLink 保管，请求时附加到 HTTP 头上；插件代码读不到明文。这是插件平台的安全边界——换来的好处是插件即使有问题也偷不到你的密钥。
- 所以 v0.1 不显示余额，额度看 hub 自己的看板即可。
- v0.2 会在**插件设置**里单独问一次 hub 地址和密钥（可以就是同一把 key），只用来读
  `/health` 和 `/v1/balance-summary`，显示成概览卡片和提供商页卡片。`/health` 本身免鉴权，所以健康状态连密钥都不用填。

## 版本

- `0.1.0`：提供商适配器（Chat / Responses 直通、模型拉取、错误映射、双区模型清单）。
- `0.2.0`：新增 [relay/](relay/README.md) —— new-api 插件契约（apiVersion 1）版本，带提供商页余额卡和密钥提示；本目录的 v2 适配器不变。

后续：客户端模型名自动兜底（`route` 钩子，设置里可关）。

## 声明

- 对接 [WorkBuddy2API Hub](https://github.com/niyouqianma/workbuddy2api-hub)（MIT），仅供个人自用，遵守其上游使用条款。
- 插件图标来自 [LobeHub Icons](https://github.com/lobehub/lobe-icons)（MIT）。
- 本插件与 AstrLink、WorkBuddy2API Hub 的维护者无隶属关系。
