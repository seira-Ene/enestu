"use client";

import { useEffect, useState } from "react";
import type { LiveStatus } from "@/domain/live-connection";
import { useActiveSession } from "@/lib/active-session";
import { fetchNotes } from "@/lib/notes-api";
import { connectNotes } from "@/lib/notes-live";
import { useRemote } from "@/lib/use-remote";
import { useAccount } from "./AccountProvider";
import { ConnectionStatus } from "./ConnectionStatus";
import { PANEL } from "./form-styles";
import { LoginForm } from "./LoginForm";
import { NoteForm } from "./NoteForm";
import { NoteList } from "./NoteList";
import { ScreenHeader } from "./ScreenHeader";
import { useWorld } from "./WorldProvider";

export function NotesScreen() {
  const { theme } = useWorld();
  const { data, error } = useAccount();
  const isTimerActive = useActiveSession() !== null;
  const title = theme.terms.navNotes;

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-5 px-4 py-6 md:max-w-4xl">
      <ScreenHeader title={title} subtitle="写真とメモ" />
      {data?.kind === "signed_in" && (
        // 別の人に変わったら、前の人のメモを残さない。
        <NotesBoard
          key={data.account.id}
          userId={data.account.id}
          title={title}
        />
      )}
      {data !== null && data.kind !== "signed_in" && (
        <section className={PANEL}>
          <p>
            スマホで撮ったノートや疑問メモを、PCで開いている画面へすぐに届けます。使うにはログインが必要です。
          </p>
          {data.kind === "guest" && <LoginForm isBlocked={isTimerActive} />}
          {data.kind !== "guest" && (
            <p>上の「アカウント」から、ログインの状態を確かめてください。</p>
          )}
        </section>
      )}
      {data === null && (
        <section className={PANEL}>
          <p>{error ?? "確認しています…"}</p>
        </section>
      )}
    </main>
  );
}

function NotesBoard({ userId, title }: { userId: string; title: string }) {
  const notes = useRemote(fetchNotes);
  const [status, setStatus] = useState<LiveStatus>("connecting");
  const { reload } = notes;

  useEffect(
    () =>
      connectNotes(userId, {
        onStatus: setStatus,
        onChange: () => void reload(),
      }),
    [userId, reload],
  );

  return (
    <>
      <div className="panel px-4 py-2">
        <ConnectionStatus status={status} />
      </div>
      {/* 広い画面では、届いたメモがすぐ見えるよう横に並べる。 */}
      <div className="grid gap-5 md:grid-cols-2 md:items-start">
        <NoteForm onSaved={reload} />
        <NoteList title={title} notes={notes} />
      </div>
    </>
  );
}
