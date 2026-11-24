import { parseStudyLogInput, parseUuid } from "@/domain/study-log-input";
import { jstDayRange, type StudyLog } from "@/domain/study-time";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

const NO_STORE = { "Cache-Control": "no-store" };

/** 学習記録を1件保存する。 */
export async function POST(request: Request): Promise<Response> {
  const deviceId = parseUuid(request.headers.get("x-device-id"));
  if (!deviceId.ok) return badRequest(deviceId.error);

  const body = await readJson(request);
  const input = parseStudyLogInput(body, new Date());
  if (!input.ok) return badRequest(input.error);

  try {
    // 同じidの再送は無視し、二重登録を防ぐ。
    const { error } = await createSupabaseAdminClient()
      .from("study_logs")
      .upsert(
        {
          id: input.value.id,
          device_id: deviceId.value,
          subject: input.value.subject,
          started_at: input.value.startedAt,
          ended_at: input.value.endedAt,
        },
        { onConflict: "id", ignoreDuplicates: true },
      );
    if (error) return serverError("保存", error);
  } catch (error) {
    return serverError("保存", error);
  }
  return Response.json({ ok: true }, { status: 201, headers: NO_STORE });
}

/** この端末の、日本時間の今日の記録を新しい順に返す。 */
export async function GET(request: Request): Promise<Response> {
  const deviceId = parseUuid(request.headers.get("x-device-id"));
  if (!deviceId.ok) return badRequest(deviceId.error);

  const { start, end } = jstDayRange(new Date());
  try {
    const { data, error } = await createSupabaseAdminClient()
      .from("study_logs")
      .select("id, subject, started_at, ended_at, duration_seconds")
      .eq("device_id", deviceId.value)
      .gte("ended_at", start.toISOString())
      .lt("ended_at", end.toISOString())
      .order("ended_at", { ascending: false });
    if (error) return serverError("取得", error);

    const logs: StudyLog[] = data.map((row) => ({
      id: row.id,
      subject: row.subject,
      startedAt: row.started_at,
      endedAt: row.ended_at,
      durationSeconds: row.duration_seconds,
    }));
    return Response.json({ logs }, { headers: NO_STORE });
  } catch (error) {
    return serverError("取得", error);
  }
}

async function readJson(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    return null;
  }
}

function badRequest(message: string): Response {
  return Response.json(
    { error: message },
    { status: 400, headers: NO_STORE },
  );
}

/** 原因はサーバーのログにだけ残し、利用者には詳細を見せない。 */
function serverError(action: string, cause: unknown): Response {
  console.error(`学習記録の${action}に失敗`, cause);
  return Response.json(
    { error: `学習記録の${action}に失敗しました。時間をおいて試してください。` },
    { status: 500, headers: NO_STORE },
  );
}
