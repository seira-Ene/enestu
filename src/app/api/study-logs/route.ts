import { parseStudyLogInput } from "@/domain/study-log-input";
import { jstDayRange, type StudyLog } from "@/domain/study-time";
import {
  badRequest,
  created,
  readJson,
  serverError,
  success,
} from "@/lib/api-response";
import { resolveOwner } from "@/lib/owner";

/** 学習記録を1件保存する。 */
export async function POST(request: Request): Promise<Response> {
  const owner = await resolveOwner(request);
  if (!owner.ok) return owner.response;

  const body = await readJson(request);
  const input = parseStudyLogInput(body, new Date());
  if (!input.ok) return badRequest(input.error);

  const action = "学習記録の保存";
  try {
    // 同じidの再送は無視し、二重登録を防ぐ。
    const { error } = await owner.value.db
      .from("study_logs")
      .upsert(
        {
          id: input.value.id,
          ...owner.value.columns,
          subject: input.value.subject,
          started_at: input.value.startedAt,
          ended_at: input.value.endedAt,
        },
        { onConflict: "id", ignoreDuplicates: true },
      );
    return error ? serverError(action, error) : created();
  } catch (error) {
    return serverError(action, error);
  }
}

/** 自分の、日本時間の今日の記録を新しい順に返す。 */
export async function GET(request: Request): Promise<Response> {
  const owner = await resolveOwner(request);
  if (!owner.ok) return owner.response;

  const action = "学習記録の取得";
  const { start, end } = jstDayRange(new Date());
  try {
    const { data, error } = await owner.value.db
      .from("study_logs")
      .select("id, subject, started_at, ended_at, duration_seconds")
      .eq(owner.value.column, owner.value.id)
      .gte("ended_at", start.toISOString())
      .lt("ended_at", end.toISOString())
      .order("ended_at", { ascending: false });
    if (error) return serverError(action, error);

    const logs: StudyLog[] = data.map((row) => ({
      id: row.id,
      subject: row.subject,
      startedAt: row.started_at,
      endedAt: row.ended_at,
      durationSeconds: row.duration_seconds,
    }));
    return success({ logs });
  } catch (error) {
    return serverError(action, error);
  }
}
