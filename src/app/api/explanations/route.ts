import { limitMessage } from "@/domain/limits";
import { judgeExplanation, type ExplanationLog } from "@/domain/explanation";
import { parseExplanationInput } from "@/domain/explanation-input";
import {
  badRequest,
  isRowLimit,
  limitReached,
  readJson,
  serverError,
  success,
} from "@/lib/api-response";
import { resolveOwner } from "@/lib/owner";

const HISTORY_LIMIT = 20;

/** 説明を判定して記録し、結果を返す。 */
export async function POST(request: Request): Promise<Response> {
  const owner = await resolveOwner(request);
  if (!owner.ok) return owner.response;

  const input = parseExplanationInput(await readJson(request), new Date());
  if (!input.ok) return badRequest(input.error);

  const action = "説明の判定";
  try {
    const found = await owner.value.db
      .from("explain_terms")
      .select("keywords")
      .eq("id", input.value.termId)
      .eq(owner.value.column, owner.value.id)
      .is("archived_at", null)
      .limit(1);
    if (found.error) return serverError(action, found.error);
    const keywords = found.data[0]?.keywords;
    if (keywords === undefined) return badRequest("用語が見つかりません。");

    const { missing } = judgeExplanation(input.value.body, keywords);
    const log: ExplanationLog = {
      ...input.value,
      totalCount: keywords.length,
      missing,
    };
    // 同じidの再送は無視し、二重登録を防ぐ。
    const { error } = await owner.value.db.from("explanation_logs").upsert(
      {
        id: log.id,
        ...owner.value.columns,
        term_id: log.termId,
        body: log.body,
        total_count: log.totalCount,
        missing: [...log.missing],
        explained_at: log.explainedAt,
      },
      { onConflict: "id", ignoreDuplicates: true },
    );
    if (isRowLimit(error)) return limitReached(limitMessage("explanation_logs"));
    return error ? serverError(action, error) : success({ log });
  } catch (error) {
    return serverError(action, error);
  }
}

/** 自分の直近の説明を新しい順に返す。 */
export async function GET(request: Request): Promise<Response> {
  const owner = await resolveOwner(request);
  if (!owner.ok) return owner.response;

  const action = "説明の記録の取得";
  try {
    const { data, error } = await owner.value.db
      .from("explanation_logs")
      .select("id, term_id, body, total_count, missing, explained_at")
      .eq(owner.value.column, owner.value.id)
      .order("explained_at", { ascending: false })
      .limit(HISTORY_LIMIT);
    if (error) return serverError(action, error);

    const logs: ExplanationLog[] = data.map((row) => ({
      id: row.id,
      termId: row.term_id,
      body: row.body,
      totalCount: row.total_count,
      missing: row.missing,
      explainedAt: row.explained_at,
    }));
    return success({ logs });
  } catch (error) {
    return serverError(action, error);
  }
}
