# CHANGELOG

## 0.3.3

- 补齐两条 hub 本来就有、而插件没声明的入口：
  - `/v1/responses/compact` → `/responses/compact`：Codex 整理上下文时自己会调，缺这条会被网关判"没有提供商"。
  - `/v1/completions` → `/completions`：旧版 Completions 客户端。
- 现在 relay 共 7 条路由，入口协议 6 个（models 不算协议）。

## 0.3.2

- 再修余额卡 401：0.3.1 写的 `Authorization` 到不了上游——传输层对每个出站请求都会删掉
  `Authorization`、`Cookie`、`X-Api-Key`、`X-Goog-Api-Key`（`transport/forwarder.go` 的
  `removeInboundCredentials`）。现在密钥同时放在 `Api-Key` 里（hub 也认这个拼写，且不在删除名单里），
  `Authorization` 保留给将来不再删它的版本。

## 0.3.1

- 修余额卡 401：余额请求不在 relay 路由里，网关只把 key 交给钩子、不替你加请求头
  （`pluginhost/relay.go` 的 `authFor`），所以插件现在自己写 `Authorization: Bearer <key>`。
  用户直接粘了带 `Bearer ` 前缀的 key 时不会重复添加。

## 0.3.0

- 改为 new-api 插件契约（apiVersion 1）：插件不再逐请求跑钩子，请求由网关按 relay 路由直通。
- 新增**余额卡**：`buildBalanceRequest` / `parseBalance` 读 hub 的 `GET /v1/balance-summary`，
  密钥由网关附加；没有快照或密钥被拒时显示原因而不是 0。
- 新增密钥提示（`keyHint`）。
- relay 路由：`/v1/chat/completions`、`/v1/responses` 直通；`/v1/messages` 与
  `/v1beta/models/{model}:generateContent` 经网关转换器转成 Chat Completions；`/v1/models` 供「拉取模型」。
- 提供商类型从「国际版 / 国内版」两个合并为一个（模型靠「拉取模型」精确化）。

## 0.2.0

- 新增 `relay/` 子目录版本（v1 契约），带余额卡；0.3.0 起并入根目录。

## 0.1.0

- 首个版本：v2 供应商适配器，国际版（20 个模型）与国内版（14 个模型）两种提供商类型。
- Chat Completions 与 Responses 直通，`GET /v1/models` 拉取模型，上游错误按 402/429/5xx 触发故障切换。
