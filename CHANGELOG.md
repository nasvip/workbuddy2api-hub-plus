# CHANGELOG

## 0.2.0

- 新增 `relay/`：同一套 hub 接入的 new-api 插件契约（apiVersion 1）版本。
  - 提供商页余额卡：`buildBalanceRequest` / `parseBalance` 读 hub 的
    `GET /v1/balance-summary`，密钥由网关附加，插件看不到；没有快照或密钥被拒时显示原因而不是 0。
  - 密钥提示（`keyHint`），预填国际版 20 个模型，`/v1/models` 走 relay 路由，可「拉取模型」。
  - 网关直通 `chat/completions`、`responses`，插件不逐请求运行。
- 根目录的 v2 供应商适配器不变（0.1.0）。

## 0.1.0

- 首个版本：为 AstrLink 增加 WorkBuddy2API Hub 提供商适配器。
- 国际版（20 个模型）与国内版（14 个模型）两种提供商类型，默认地址
  `http://127.0.0.1:8788/v1`，认证方式 `Bearer`。
- Chat Completions 与 Responses 两种协议直通，整段与流式都支持；其他协议由 AstrLink
  转换为 Chat Completions。
- 支持从 hub 的 `GET /v1/models` 拉取模型清单。
- 上游错误按 402 / 429 / 5xx 触发故障切换，401 / 403 不切换。
