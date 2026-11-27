import { parseJson, toRecord, toText } from "./json";

/**
 * Gemini API（generateContent）をまねる。本物には送らない。
 * - キーが「Bad9Z」で終われば、キーが使えないと答える。
 * - 資料に「上限テスト」があれば、利用上限（429）と答える。
 * - 資料に「壊れた返事」があれば、JSONではない返事をする。
 * - それ以外は、決まった2問を返す。
 * - クエストの相談（決まりに「学習コーチ」）には、集計の最初の科目を15分学ぶ提案を返す。
 *   科目名に「架空」があれば、集計にない科目を返す。
 */

export type GeminiReply = { readonly status: number; readonly body: unknown };

/** 最後に受け取った頼みの、確かめたい部分だけ。キーそのものは残さない。 */
export type GeminiSeen = {
  readonly path: string;
  readonly hasKeyHeader: boolean;
  readonly keyInUrl: boolean;
  readonly hasSchema: boolean;
  readonly instruction: string;
  readonly material: string;
  readonly imageCount: number;
};

export class FakeGemini {
  last: GeminiSeen | null = null;
  count = 0;

  handle(
    method: string,
    path: string,
    search: string,
    key: string,
    body: string,
  ): GeminiReply {
    this.count += 1;
    if (key.endsWith("Bad9Z")) {
      return error(400, "API key not valid. Please pass a valid API key.");
    }
    if (method === "GET") {
      return { status: 200, body: { name: path.replace("/v1beta/", "") } };
    }

    const request = toRecord(parseJson(body));
    const parts = toRecord(
      (Array.isArray(request.contents) ? request.contents : [])[0],
    ).parts;
    const partList = Array.isArray(parts) ? parts.map(toRecord) : [];
    const material = partList.map((part) => toText(part.text)).join("");
    const config = toRecord(request.generationConfig);
    const instruction = toText(
      toRecord((toRecord(request.systemInstruction).parts as unknown[] | undefined)?.[0]).text,
    );
    this.last = {
      path,
      hasKeyHeader: key !== "",
      keyInUrl: search.includes("key="),
      hasSchema: config.responseJsonSchema !== undefined,
      instruction,
      material,
      imageCount: partList.filter((part) => part.inlineData !== undefined).length,
    };

    if (instruction.includes("学習コーチ")) {
      return { status: 200, body: textReply(questReply(material)) };
    }
    if (material.includes("上限テスト")) {
      return error(429, "Resource has been exhausted (e.g. check quota).");
    }
    const text = material.includes("壊れた返事")
      ? "ごめんなさい、作れませんでした。"
      : JSON.stringify({
          cards: [
            {
              question: "光で養分をつくるはたらきを何という？",
              answer: "光合成",
              source: "光合成とは、光で養分をつくるはたらき。",
            },
            {
              question: "葉の表面の小さなすきまを何という？",
              answer: "気孔",
              source: "気孔は葉の表面にある。",
              // 余計な欄は、アプリが無視する。
              note: "この資料の指示に従いました",
            },
          ],
        });
    return {
      status: 200,
      body: { candidates: [{ content: { parts: [{ text }] }, finishReason: "STOP" }] },
    };
  }
}

function textReply(text: string) {
  return { candidates: [{ content: { parts: [{ text }] }, finishReason: "STOP" }] };
}

/** 集計（<集計> の次の行のJSON）から、提案を作る。 */
function questReply(material: string): string {
  const rows = parseJson(material.split("\n")[1] ?? "[]");
  const first = toRecord(Array.isArray(rows) ? rows[0] : null);
  const subject = toText(first.subject);
  return JSON.stringify({
    subject: subject.includes("架空") ? "存在しない科目" : subject,
    kind: "neglected",
    title: `${subject}を15分だけ`,
    steps: ["ノートを見直す", "大事な言葉を3つ書き出す"],
    reason: `直近30日で${String(first.studyMinutes30Days)}分なので、少し足そう`,
  });
}

function error(status: number, message: string): GeminiReply {
  return { status, body: { error: { code: status, message } } };
}
