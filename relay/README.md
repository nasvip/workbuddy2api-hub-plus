# WorkBuddy2API Hub（带余额）— AstrLink 插件

同一套 WorkBuddy2API Hub 接入，换用 AstrLink 支持的 **new-api 插件契约（apiVersion 1）**，因此多了 v2 供应商适配器给不了的东西：

| | 本插件（v1 relay） | 根目录插件（v2 适配器） |
| --- | --- | --- |
| 提供商页**余额卡** | ✅ 用提供商自己的 key 读 hub 的 `/v1/balance-summary` | ❌ 平台不提供余额钩子 |
| 密钥提示（keyHint） | ✅ 密钥框下方有说明 | ❌ |
| 每提供商设置（channelConfig） | 可用，本插件暂未声明 | ❌ |
| 请求改写 | 网关直通，插件不跑 JS | 插件逐请求跑钩子 |
| 错误语义（402 触发故障切换等） | 按 HTTP 状态 | 可按错误体精细判定 |
| 提供商类型数量 | 1 个「WorkBuddy2API Hub（带余额）」 | 2 个（国际版 / 国内版） |
| 模型 | 预填国际版 20 个，可「拉取模型」 | 预填两套，可「拉取模型」 |

两个插件可以同时装、互不冲突（key 不同）；选一个用，另一个卸载即可。

## 安装

插件页 → 安装插件 → 粘贴**带子目录**的地址：

```
https://github.com/nasvip/workbuddy2api-hub-plus/tree/v0.2.0/relay
```

装完启用，然后：**提供商 → 添加 → 「插件」分组 → WorkBuddy2API Hub（带余额）** → 填地址和 key → 保存 → 拉取模型 → 测试。

地址默认 `http://127.0.0.1:8788/v1`；AstrLink 和 hub 不在同一台机器时改成 hub 的可达地址。

## 余额卡怎么来的

- `buildBalanceRequest` 让网关向 `GET {提供商地址}/balance-summary` 发一次请求，**密钥由网关附加**，插件看不到；
- `parseBalance` 把 hub 的 `{"balance": n, "unit":"credit"}` 读成 `{amount, currency:"CRD"}`；
- 提供商页每小时自动读一次，也可以点「读取」立即刷新；
- hub 没有余额快照（`balance: null`）或密钥被拒（401/403）时，卡片显示原因，不影响推理。

## 限制

- relay 路由目前只声明了 `chat/completions`、`responses`、`models`；Anthropic / Gemini 客户端由 AstrLink 转成 Chat 后再发（原因同根目录 README）。
- 列表里的图标仍是 AstrLink 给插件供应商的通用图标，品牌图只在添加页显示。
