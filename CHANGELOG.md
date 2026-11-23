# CHANGELOG

## 0.1.0

- 首个版本：为 AstrLink 增加 WorkBuddy2API Hub 提供商适配器。
- 国际版（20 个模型）与国内版（14 个模型）两种提供商类型，默认地址
  `http://127.0.0.1:8788/v1`，认证方式 `Bearer`。
- Chat Completions 与 Responses 两种协议直通，整段与流式都支持；其他协议由 AstrLink
  转换为 Chat Completions。
- 支持从 hub 的 `GET /v1/models` 拉取模型清单。
- 上游错误按 402 / 429 / 5xx 触发故障切换，401 / 403 不切换。
