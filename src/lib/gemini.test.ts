import { describe, expect, it } from "vitest";
import { CARD_INSTRUCTION, CARD_RESPONSE_SCHEMA } from "@/domain/ai-cards";
import { checkGeminiKey, DEFAULT_GEMINI_MODEL, generateGeminiCards } from "./gemini";

/** テスト用のキー。本物のキーの形にはしない。 */
const KEY = "test-key-for-unit-tests";
const BASE = "https://gemini.test";

type Sent = { url: string; init: RequestInit };

/** 送った内容を記録し、決めた返事を順に返す fetch。 */
function fakeFetch(...replies: (Response | Error)[]) {
  const sent: Sent[] = [];
  const send = async (url: string, init: RequestInit) => {
    sent.push({ url, init });
    const reply = replies.shift() ?? new Response("{}", { status: 500 });
    if (reply instanceof Error) throw reply;
    return reply;
  };
  return { sent, send };
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
const answer = (text: string) => json({ candidates: [{ content: { parts: [{ text }] } }] });
const options = (send: ReturnType<typeof fakeFetch>["send"]) => ({ baseUrl: BASE, fetch: send });
const request = { text: "光合成とは、光で養分をつくるはたらき。", images: [{ mimeType: "image/jpeg" as const, data: "AAAA" }] };

describe("generateGeminiCards", () => {
  it("キーは見出しで渡し、URLには入れない。決まり・資料・写真・返事の形を送る", async () => {
    const { sent, send } = fakeFetch(answer('{"cards":[]}'));
    const result = await generateGeminiCards(KEY, request, options(send));
    expect(result).toEqual({ ok: true, value: '{"cards":[]}' });

    const [first] = sent;
    expect(first?.url).toBe(`${BASE}/v1beta/models/${DEFAULT_GEMINI_MODEL}:generateContent`);
    expect(first?.url).not.toContain(KEY);
    expect(new Headers(first?.init.headers).get("x-goog-api-key")).toBe(KEY);
    const body = JSON.parse(String(first?.init.body));
    expect(body.systemInstruction.parts[0].text).toBe(CARD_INSTRUCTION);
    expect(body.contents[0].parts[0].text).toContain("<資料>\n光合成とは");
    expect(body.contents[0].parts[1]).toEqual({ inlineData: { mimeType: "image/jpeg", data: "AAAA" } });
    expect(body.generationConfig).toMatchObject({
      responseMimeType: "application/json",
      responseJsonSchema: CARD_RESPONSE_SCHEMA,
    });
    // 会話を保存させる呼び方（Interactions API）は使わない。
    expect(JSON.stringify(body)).not.toContain("previous_interaction_id");
  });

  it("返事の形の指定に対応していなければ、指定を外してもう一度だけ頼む", async () => {
    const { sent, send } = fakeFetch(
      json({ error: { message: "Invalid JSON payload: unknown field responseJsonSchema" } }, 400),
      answer('{"cards":[]}'),
    );
    expect((await generateGeminiCards(KEY, request, options(send))).ok).toBe(true);
    expect(sent).toHaveLength(2);
    expect(JSON.parse(String(sent[1]?.init.body)).generationConfig.responseJsonSchema).toBeUndefined();
  });

  it.each([
    ["キーが使えない（400）", json({ error: { message: "API key not valid. Please pass a valid API key." } }, 400), "invalid_key"],
    ["キーが使えない（403）", json({ error: { message: "Permission denied" } }, 403), "invalid_key"],
    ["利用上限", json({ error: { message: "Resource has been exhausted" } }, 429), "quota"],
    ["Geminiの障害", json({ error: { message: "Internal" } }, 503), "unavailable"],
    ["つながらない", new TypeError("fetch failed"), "unavailable"],
    ["時間切れ", Object.assign(new Error("timeout"), { name: "TimeoutError" }), "timeout"],
    ["安全のために止められた", json({ promptFeedback: { blockReason: "SAFETY" } }), "blocked"],
    ["返事が空", json({ candidates: [] }), "bad_output"],
  ] as const)("%s", async (_, reply, failure) => {
    const { send } = fakeFetch(reply);
    expect(await generateGeminiCards(KEY, request, options(send))).toEqual({ ok: false, failure });
  });

  it("失敗の結果に、キーも資料も入れない", async () => {
    const { send } = fakeFetch(json({ error: { message: `bad key ${KEY}` } }, 403));
    const result = await generateGeminiCards(KEY, request, options(send));
    expect(JSON.stringify(result)).not.toContain(KEY);
    expect(JSON.stringify(result)).not.toContain("光合成");
  });

  it("モデルは、指定があれば替えられる", async () => {
    const { sent, send } = fakeFetch(answer("{}"));
    await generateGeminiCards(KEY, request, { ...options(send), model: "gemini-other" });
    expect(sent[0]?.url).toContain("/models/gemini-other:generateContent");
  });
});

describe("checkGeminiKey", () => {
  it("モデルの情報を読めれば、つながっている", async () => {
    const { sent, send } = fakeFetch(json({ name: `models/${DEFAULT_GEMINI_MODEL}` }));
    expect(await checkGeminiKey(KEY, options(send))).toEqual({
      ok: true,
      value: { model: DEFAULT_GEMINI_MODEL },
    });
    expect(sent[0]?.init.method).toBe("GET");
    expect(sent[0]?.url).toBe(`${BASE}/v1beta/models/${DEFAULT_GEMINI_MODEL}`);
  });

  it("キーが使えなければ、そう返す", async () => {
    const { send } = fakeFetch(json({ error: { message: "API key not valid" } }, 400));
    expect(await checkGeminiKey(KEY, options(send))).toEqual({ ok: false, failure: "invalid_key" });
  });
});
