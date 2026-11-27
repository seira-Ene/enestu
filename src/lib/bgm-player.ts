import {
  eventsBetween,
  eventTones,
  stepSeconds,
  stepsPerBar,
  type BgmSong,
} from "@/domain/bgm";
import { audioNow, playTonesAt } from "./sound-engine";

/**
 * BGMを鳴らす。少し先の音を先回りして予約するので、画面が重くても途切れにくい。
 * 曲を替えるときは、次の小節の頭から新しい曲の最初に移る。
 */

/** どれだけ先まで予約するか（秒）。 */
const LOOKAHEAD_SECONDS = 0.3;
const TICK_MS = 60;

let timer: ReturnType<typeof setInterval> | null = null;
let current: BgmSong | null = null;
let waiting: BgmSong | null = null;
/** 今の曲の頭からの、次に予約する区切り。 */
let step = 0;
/** 次に予約する区切りの、音の時計での時刻。0なら、まだ始めていない。 */
let nextTime = 0;

export function playBgm(song: BgmSong): void {
  if (current === null) {
    current = song;
    step = 0;
    nextTime = 0;
  } else {
    waiting = song === current ? null : song;
  }
  if (timer === null) timer = setInterval(tick, TICK_MS);
  tick();
}

export function stopBgm(): void {
  if (timer !== null) clearInterval(timer);
  timer = null;
  current = null;
  waiting = null;
}

function tick(): void {
  const now = audioNow();
  // まだ音を出せない（画面が押されていない）間は待つ。
  if (now === null || current === null) return;
  // 始めたばかりか、止まっていた後なら、今から少し後に合わせる。
  if (nextTime < now) nextTime = now + 0.05;
  while (nextTime < now + LOOKAHEAD_SECONDS) {
    if (waiting !== null && step % stepsPerBar(current) === 0) {
      current = waiting;
      waiting = null;
      step = 0;
    }
    for (const event of eventsBetween(current, step, step + 1)) {
      playTonesAt(eventTones(current, event), "bgm", nextTime);
    }
    nextTime += stepSeconds(current);
    step += 1;
  }
}
