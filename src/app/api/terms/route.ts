import type { ExplainTerm } from "@/domain/explanation";
import { parseTermInput } from "@/domain/explanation-input";
import {
  badRequest,
  created,
  readJson,
  serverError,
  success,
} from "@/lib/api-response";
import { resolveOwner } from "@/lib/owner";

/** 説明する用語を1つ登録する。 */
export async function POST(request: Request): Promise<Response> {
  const owner = await resolveOwner(request);
  if (!owner.ok) return owner.response;

  const input = parseTermInput(await readJson(request));
  if (!input.ok) return badRequest(input.error);

  const action = "用語の登録";
  try {
    // 同じidの再送は無視し、二重登録を防ぐ。
    const { error } = await owner.value.db.from("explain_terms").upsert(
      {
        id: input.value.id,
        ...owner.value.columns,
        subject: input.value.subject,
        term: input.value.term,
        keywords: [...input.value.keywords],
      },
      { onConflict: "id", ignoreDuplicates: true },
    );
    return error ? serverError(action, error) : created();
  } catch (error) {
    return serverError(action, error);
  }
}

/** 自分の用語を新しい順に返す。隠した用語は含まない。 */
export async function GET(request: Request): Promise<Response> {
  const owner = await resolveOwner(request);
  if (!owner.ok) return owner.response;

  const action = "用語の取得";
  try {
    const { data, error } = await owner.value.db
      .from("explain_terms")
      .select("id, subject, term, keywords")
      .eq(owner.value.column, owner.value.id)
      .is("archived_at", null)
      .order("created_at", { ascending: false });
    if (error) return serverError(action, error);

    const terms: ExplainTerm[] = data;
    return success({ terms });
  } catch (error) {
    return serverError(action, error);
  }
}
