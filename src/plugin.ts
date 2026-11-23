// workbuddy2api-hub-plus: WorkBuddy2API Hub as a provider AstrLink serves
// through the new-api plugin contract (apiVersion 1).
//
// This contract is the one that carries the balance hooks — the plugin sees
// the provider's key there, which the v2 provider adapter does not — so the
// provider page shows the hub's remaining credits, read with the provider's
// own key.
//
// Requests themselves are the gateway's: each relay route below names the
// hub's path, the gateway sends the body it built (after the privacy check,
// model mapping and failover), and AstrLink's own converters turn a Claude or
// Gemini request into a Chat Completions one before it leaves.
//
// The hub speaks OpenAI's protocols itself, so nothing here converts a body.

export const meta = {
  apiVersion: 1,
  key: "workbuddy2api-hub-plus",
  name: { en: "WorkBuddy2API Hub", "zh-CN": "WorkBuddy2API Hub" },
  version: "0.3.0",
  author: { name: "nasvip" },
  description: {
    en: "WorkBuddy2API Hub as a provider, with its credits on the provider page.",
    "zh-CN": "把 WorkBuddy2API Hub 接成提供商，并在提供商页显示剩余额度。",
  },
  baseUrl: "http://127.0.0.1:8788/v1",
  keyHint: {
    en: "The hub's API key: Settings → API Key on the hub's dashboard.",
    "zh-CN": "hub 的 API Key：看板「设置 → API Key」，或 LAN 模式启动时控制台打印的那个。",
  },
  // What a new provider starts with: the hub's international catalogue, which
  // is its default realm. "拉取模型" reads the key's own list — the realm and
  // the permissions decide it — and replaces this one.
  models: [
    "default-model",
    "deepseek-v4.1-flash",
    "deepseek-v4.1-flash-sg",
    "hy4-preview",
    "hy3",
    "gpt-6-astra",
    "gpt-6.1-sol",
    "gpt-6-sol",
    "gpt-6-luna",
    "gpt-5.6-sol",
    "gpt-5.6-terra",
    "gpt-5.6-luna",
    "grok-4.7",
    "gemini-3.8-flash",
    "glm-5.3",
    "glm-5.3-flash",
    "kimi-k3.1-pro",
    "kimi-k3.1-pro-highspeed",
    "kimi-k3",
    "minimax-m3.1-flash",
  ],
  relay: [
    // Chat Completions and Responses go to the hub as they are: it serves both
    // itself, and its Responses layer is written for Codex-like clients.
    { incoming_path: "/v1/chat/completions", upstream_path: "/chat/completions" },
    { incoming_path: "/v1/responses", upstream_path: "/responses" },
    // Claude Code and Gemini clients reach the hub's Chat Completions path
    // through the gateway's converters: the hub's own /v1/messages is off by
    // default and ignores cache_control, and its Gemini route answers whole
    // bodies only.
    {
      incoming_path: "/v1/messages",
      upstream_path: "/chat/completions",
      converter: "anthropic_messages_to_openai_chat_completions",
    },
    {
      incoming_path: "/v1beta/models/{model}:generateContent",
      upstream_path: "/chat/completions",
      converter: "gemini_generate_content_to_openai_chat_completions",
    },
    // The management route the providers page reads the model list through.
    { incoming_path: "/v1/models", upstream_path: "/models" },
  ],
};

/** What every balance hook gets: the provider's address and its key. */
interface BalanceContext {
  baseUrl: string;
  apiKey: string;
  config?: Record<string, unknown>;
}

/** An answer of the hub, as parseBalance gets it. */
interface BalanceAnswer {
  status: number;
  headers: Record<string, string>;
  body: string;
}

/**
 * buildBalanceRequest asks the hub for the credit snapshot it keeps of a key.
 * The gateway sends it to the provider's own address with the provider's key,
 * so this names the path only. The hub answers from its cache and never calls
 * upstream for it.
 */
export function buildBalanceRequest(_ctx: BalanceContext) {
  return { method: "GET", path: "/balance-summary" };
}

/**
 * parseBalance reads {"balance": n, "unit": "credit", "realm": "…"} into what
 * the provider page shows. The hub counts credits, not a currency, so the
 * amount carries "CRD" as its three-letter code and the page draws the number
 * with that code. A hub that has no snapshot yet, or a key it refuses, says so
 * instead of showing a zero balance.
 */
export function parseBalance(_ctx: BalanceContext, answer: BalanceAnswer) {
  if (answer.status === 401 || answer.status === 403) {
    return { error: "密钥无效或没有权限（" + answer.status + "）" };
  }
  if (answer.status >= 400) {
    return { error: "hub 返回 " + answer.status };
  }
  let body: Record<string, unknown>;
  try {
    body = JSON.parse(answer.body) as Record<string, unknown>;
  } catch {
    return { error: "hub 的应答不是 JSON" };
  }
  if (typeof body.balance !== "number") {
    return { error: "hub 还没有这个 key 的余额快照" };
  }
  return { amount: body.balance, currency: "CRD" };
}
