// workbuddy2api-hub-plus: adds WorkBuddy2API Hub as a provider AstrLink routes
// to. The hub answers in OpenAI's own protocols, so this adapter only names
// the paths and passes the requests and the answers through: the gateway
// still sends the key, keeps the traffic on the provider's address, and does
// routing, failover, records, prices and the privacy check.
//
// Two kinds are offered because the hub keeps two catalogues — the
// international one and the Chinese one — whose model ids differ. The key on
// the provider decides which realm the hub serves; the kind only decides the
// model list a new provider starts with.

export const meta = {
  apiVersion: 2,
  key: "workbuddy2api-hub-plus",
  name: "WorkBuddy2API Hub",
  version: "0.1.0",
  capabilities: ["provider"],
  providers: [
    {
      id: "workbuddy2api-hub",
      name: "WorkBuddy2API Hub（国际版）",
      baseUrl: "http://127.0.0.1:8788/v1",
      auth: "bearer",
      protocols: { "openai.chat": { stream: true }, "openai.responses": { stream: true } },
      // Clients speaking another protocol reach the hub as Chat Completions.
      convert: true,
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
    },
    {
      id: "workbuddy2api-hub-cn",
      name: "WorkBuddy2API Hub（国内版）",
      baseUrl: "http://127.0.0.1:8788/v1",
      auth: "bearer",
      protocols: { "openai.chat": { stream: true }, "openai.responses": { stream: true } },
      convert: true,
      models: [
        "hy4-preview-f",
        "hy3",
        "deepseek-v4.1-flash",
        "glm-5.3",
        "glm-5.3-flash",
        "glm-5.2",
        "glm-5.1",
        "glm-5v-turbo",
        "minimax-m3",
        "kimi-k3-1",
        "kimi-k2.8-preview",
        "kimi-k2.7",
        "kimi-k2.6",
        "deepseek-v4-pro",
      ],
    },
  ],
} satisfies AstrLinkPlugin.Meta;

/** Where the hub serves each protocol, under the provider's address. */
const protocolPaths: Record<string, string> = {
  "openai.chat": "/chat/completions",
  "openai.responses": "/responses",
};

/**
 * buildRequest describes the upstream request: the model list is a GET on the
 * hub's own /models, everything else is the request the gateway would have
 * sent, at the path of its protocol. The body is left as it is — the hub
 * normalizes the parameters of the clients it serves itself, and rewriting
 * them here would only fight it.
 */
export async function buildRequest(
  ctx: AstrLinkPlugin.ProviderContext,
): Promise<AstrLinkPlugin.ProviderRequest> {
  if (ctx.purpose === "models") return { method: "GET", url: "/models" };
  const path = protocolPaths[ctx.protocol ?? "openai.chat"] ?? "/chat/completions";
  return { url: path, body: ctx.body };
}

/**
 * parseResponse turns the hub's answer back into the protocol's: its model
 * list, or its response, which already is the protocol's own.
 */
export async function parseResponse(
  ctx: AstrLinkPlugin.ProviderContext,
  res: AstrLinkPlugin.ProviderResponse,
): Promise<AstrLinkPlugin.ProviderResult> {
  if (ctx.purpose === "models") {
    const list = res.json?.data;
    if (!Array.isArray(list)) throw new Error("the hub answered no model list");
    const models = list
      .map((model: unknown) => (model as { id?: unknown })?.id)
      .filter((id): id is string => typeof id === "string" && id !== "");
    return { models };
  }
  if (res.json == null) throw new Error("the hub answered no JSON");
  return { status: res.status, json: res.json };
}

/**
 * parseStreamEvent passes one event of the hub's stream on. The gateway does
 * the framing on both sides: the hub's comments and keepalives are already
 * gone by the time this sees an event.
 */
export async function parseStreamEvent(
  _ctx: AstrLinkPlugin.ProviderContext,
  event: AstrLinkPlugin.UpstreamEvent,
): Promise<AstrLinkPlugin.StreamStep<null>> {
  const data = event.data;
  if (typeof data === "string" && data.trim() === "[DONE]") {
    return { events: [{ data: "[DONE]" }], done: true };
  }
  // A failure that happens mid-stream arrives as a last event whose JSON
  // carries an error, instead of the terminator. Pass it on and stop reading.
  const failed =
    event.json != null && typeof event.json === "object" && "error" in event.json;
  const answer: AstrLinkPlugin.StreamStep<null> = {
    events: [event.event ? { event: event.event, data } : { data }],
  };
  if (failed) answer.done = true;
  return answer;
}

/** Statuses AstrLink may hand the request to another provider for. */
function retryable(status: number): boolean {
  return status >= 500 || status === 402 || status === 408 || status === 425 || status === 429;
}

/**
 * parseError reads the hub's {"error":{message,type,code}} into what the
 * gateway decides failover on. 402 (the upstream account is out of credit),
 * 429 (rate limited) and 5xx (including 503, no usable account) are worth
 * another provider; 401 and 403 are this provider's key or its quota, and
 * failover would only repeat the refusal.
 */
export async function parseError(
  _ctx: AstrLinkPlugin.ProviderContext,
  res: AstrLinkPlugin.ProviderResponse,
): Promise<AstrLinkPlugin.ProviderError> {
  const error = res.json?.error ?? {};
  const message = String(error.message ?? res.body ?? "").trim();
  return {
    status: res.status,
    code: String(error.code ?? error.type ?? "upstream_error"),
    message: message.slice(0, 2000) || "the hub refused the request",
    retryable: retryable(res.status),
  };
}
