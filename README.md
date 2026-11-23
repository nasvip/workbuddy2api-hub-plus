# WorkBuddy2API Hub Plus

把 [WorkBuddy2API Hub](https://github.com/niyouqianma/workbuddy2api-hub) 接成 [AstrLink](https://github.com/QuantumNous/AstrLink)
里的一种提供商：添加时选 **WorkBuddy2API Hub**，填上地址和密钥就能用，和内置厂商一样参与路由、故障切换、用量统计和隐私检查；提供商页还会显示 hub 的**剩余额度**。

插件用 AstrLink 支持的 new-api 插件契约（apiVersion 1）写成：请求由网关直通，插件只负责两件小事——告诉网关 hub 的路径、读一次余额。它不联网读你的内容，也不保存任何数据。

## 它做了什么

| 能力 | 说明 |
| --- | --- |
| 默认地址 | `http://127.0.0.1:8788/v1`，hub 在别的机器上时改成可达地址 |
| 认证方式 | `Authorization: Bearer`；密钥提示写在密钥框下面 |
| Chat Completions | 直通 `POST /v1/chat/completions`（整段与流式） |
| Responses | 直通 `POST /v1/responses`（Codex 一类客户端保真度最高） |
| Claude Code | `/v1/messages` 由 AstrLink 转成 Chat Completions 再发给 hub |
| Gemini 客户端 | `/v1beta/models/{model}:generateContent` 同样转成 Chat Completions |
| 模型清单 | 预填国际版 20 个；保存后可「拉取模型」读 hub 的 `/v1/models` |
| 余额卡 | 用提供商自己的密钥读 hub 的 `GET /v1/balance-summary`，每小时自动刷新，也能手动读 |

## 安装

插件页 → 安装插件 → 粘贴本仓库地址：

```
https://github.com/nasvip/workbuddy2api-hub-plus
```

装最新标签（`v0.3.0`），审查里通过后启用。

## 使用

1. **API 提供商 → 添加 API 提供商 → 「插件」分组 → WorkBuddy2API Hub**。
2. 地址默认 `http://127.0.0.1:8788/v1`；AstrLink 和 hub 不在同一台机器时改成 hub 的可达地址（hub 用
   `start-wb-proxy-lan` 起才是监听所有网卡，并且强制要求 API Key）。
3. 密钥填 hub 的 API Key：看板「设置 → API Key」，或 LAN 模式启动时控制台打印的那个。
4. **先保存**，再点「拉取模型」（按钮要提供商存下来才可用），最后点「测试」。
5. 客户端连 AstrLink 仍然使用 **AstrLink 访问令牌**，不是 hub 的密钥。

## 余额卡怎么来的

- 插件声明 `buildBalanceRequest`，网关向 `GET {提供商地址}/balance-summary` 发一次请求，**密钥由网关附加**，插件看不到明文；
- `parseBalance` 把 `{"balance": n, "unit": "credit"}` 读成 `{amount, currency: "CRD"}`——hub 计的是积分，不是货币，所以用三字母码 `CRD`；
- hub 没有余额快照（`balance: null`）、密钥被拒（401/403）或应答不是 JSON 时，卡片显示原因，**不会显示成 0**，也不影响推理。

## 模型

- 预填国际版目录：`default-model`、`gpt-6-astra`、`gpt-6.1-sol`、`gpt-5.6-sol`、`grok-4.7`、`gemini-3.8-flash`、
  `glm-5.3`、`kimi-k3.1-pro`、`minimax-m3.1-flash`、`deepseek-v4.1-flash` 等 20 个。
- 你的密钥绑定哪个区、能开哪些模型，由 hub 决定；「拉取模型」拿到的是真实可用清单（国内版账号会返回
  `hy4-preview-f`、`glm-5.2`、`minimax-m3` 这类）。
- 客户端发的模型名和 hub 的 id 往往不一样（Claude Code 发 `claude-sonnet-4-5`）。在提供商的「模型重定向」里逐条加规则：

| 客户端发送 | 重定向到 | 场景 |
| --- | --- | --- |
| `claude-sonnet-4-5` | `gpt-6-sol` | Claude Code 走 GPT 系 |
| `claude-opus-4-1` | `gpt-6.1-sol` | 长上下文、复杂任务 |
| `gpt-5-codex` | `gpt-5.6-sol` | Codex 系 |
| `gpt-5` | `default-model` | 让老客户端也能用 |

重定向是**逐条精确匹配**，没有通配符。

## 为什么不直通 hub 的 Anthropic / Gemini 接口

hub 有这两个接口，但都是转成 Chat Completions 的桥，而且：

- Anthropic 桥默认**关闭**，hub 的提示写着「把请求转成 Chat Completions 并忽略 `cache_control`，可能造成积分过度消耗」（hub issue #367）；
- Gemini 路由是 hub 内部回环调自己的 chat，流式还是一次性返回（`Content-Length`），不是增量。

所以这里让 AstrLink 的转换器把 Claude / Gemini 请求变成 Chat Completions 发给 hub，走的是 hub 自己的主链路，更省积分也更稳。

## 排错

| 现象 | 原因 |
| --- | --- |
| 401 | 密钥填错，或 hub 开了鉴权而密钥为空 |
| 402 | hub 上游账号余额/积分不足 |
| 403 | 该密钥的每日 token 额度用完，或内容被上游拒绝 |
| 429 | 上游限流或该密钥并发超限 |
| 503 | hub 当前没有可用账号，检查 hub 看板 |
| 拉取模型失败 | 地址少了 `/v1`、hub 没启动、或密钥没有模型权限 |
| 余额卡写「还没有余额快照」 | hub 还没扫到账号余额，等它自己刷新或点「读取」 |

## 已知限制

1. **提供商列表里是通用插件图标**，品牌图只在「添加提供商」的选择页出现——AstrLink 按类型画图标，插件没有字段能覆盖。
2. **没有每提供商独立设置**（插件可以声明，但目前用不上）。
3. **错误语义按 HTTP 状态**：402 这类 4xx 不会触发故障切换（v0.1 的 v2 适配器可以精细判定，已不再维护，见 `v0.1.0` 标签）。

## 版本

- `0.3.0`：改为 new-api 插件契约（apiVersion 1），新增余额卡、密钥提示，Claude / Gemini 客户端经网关转换接入。
- `0.2.0`：新增 `relay/` 版本（已在 0.3.0 合并到根目录）。
- `0.1.0`：v2 供应商适配器（两种提供商类型、模型拉取、错误映射）。代码在 `v0.1.0` 标签里。

## 从 0.1 升级

0.3.0 换了插件形态，**旧的提供商要删掉重建**：老的服务记的是 `workbuddy2api-hub` / `workbuddy2api-hub-cn` 两种类型，新版本只有一种（`relay`）。插件本身覆盖安装，设置和记录不受影响。

## 声明

- 对接 [WorkBuddy2API Hub](https://github.com/niyouqianma/workbuddy2api-hub)（MIT），仅供个人自用，遵守其上游使用条款。
- 插件图标来自 [LobeHub Icons](https://github.com/lobehub/lobe-icons)（MIT）。
- 本插件与 AstrLink、WorkBuddy2API Hub 的维护者无隶属关系。
