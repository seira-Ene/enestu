import { eventsBetween, eventTones, stepSeconds, type BgmSong } from "@/domain/bgm";
import { audioNow, createBgmLayer, fadeLayer, playTonesAt } from "./sound-engine";

/**
 * BGMを鳴らす。少し先の音を先回りして予約するので、画面が重くても途切れにくい。
 * 鳴らし始めは、だんだん大きくする（フェードイン）。
 * 曲を替えるときは、前の曲を小さくしながら、新しい曲を大きくして重ねる（クロスフェード）。
 */

/** どれだけ先まで予約するか（秒）。 */
const LOOKAHEAD_SECONDS = 0.3;
const TICK_MS = 60;
/** 鳴らし始めに、大きくしていく秒数。 */
export const FADE_IN_SECONDS = 1.5;
/** 曲を替えるときに、重ねる秒数。 */
export const CROSSFADE_SECONDS = 2;
/** 止めるときに、小さくしていく秒数。 */
export const FADE_OUT_SECONDS = 0.3;

/** 鳴らしている1曲。 */
type Playing = {
  readonly song: BgmSong;
  /** 曲の音量。まだ音を出せず、作っていなければ null。 */
  layer: GainNode | null;
  /** 大きくしていく秒数。 */
  readonly fadeIn: number;
  /** 曲の頭からの、次に予約する区切り。 */
  step: number;
  /** 次に予約する区切りの、音の時計での時刻。 */
  nextTime: number;
  /** 小さくしている途中なら、鳴り終わる時刻。 */
  endsAt: number | null;
};

let timer: ReturnType<typeof setInterval> | null = null;
/** 鳴らしている曲。最後のものが今の曲で、ほかは小さくしている途中。 */
let playing: Playing[] = [];

const currentSong = (): Playing | undefined =>
  playing.findLast((item) => item.endsAt === null);

export function playBgm(song: BgmSong): void {
  const current = currentSong();
  if (current?.song !== song) {
    if (current !== undefined) fadeOut(current, CROSSFADE_SECONDS);
    playing.push({
      song,
      layer: null,
      fadeIn: current === undefined ? FADE_IN_SECONDS : CROSSFADE_SECONDS,
      step: 0,
      nextTime: 0,
      endsAt: null,
    });
  }
  if (timer === null) timer = setInterval(tick, TICK_MS);
  tick();
}

export function stopBgm(seconds = FADE_OUT_SECONDS): void {
  for (const item of playing) if (item.endsAt === null) fadeOut(item, seconds);
  tick();
}

/** だんだん小さくして、seconds 秒後に鳴らすのをやめる。 */
function fadeOut(item: Playing, seconds: number): void {
  const now = audioNow();
  // まだ鳴らし始めていなければ、そのままやめる。
  if (now === null || item.layer === null) {
    item.endsAt = 0;
    return;
  }
  fadeLayer(item.layer, 0, seconds);
  item.endsAt = now + seconds;
}

function tick(): void {
  const now = audioNow();
  // まだ音を出せない（画面が押されていない）間は待つ。
  if (now !== null) {
    for (const item of playing) schedule(item, now);
  }
  playing = playing.filter((item) => item.endsAt === null || (now !== null && item.endsAt > now));
  if (playing.length === 0 && timer !== null) {
    clearInterval(timer);
    timer = null;
  }
}

function schedule(item: Playing, now: number): void {
  if (item.layer === null) {
    if (item.endsAt !== null) return;
    item.layer = createBgmLayer();
    if (item.layer === null) return;
    fadeLayer(item.layer, 1, item.fadeIn);
  }
  // 始めたばかりか、止まっていた後なら、今から少し後に合わせる。
  if (item.nextTime < now) item.nextTime = now + 0.05;
  const until = Math.min(now + LOOKAHEAD_SECONDS, item.endsAt ?? Infinity);
  while (item.nextTime < until) {
    for (const event of eventsBetween(item.song, item.step, item.step + 1)) {
      playTonesAt(eventTones(item.song, event), "bgm", item.nextTime, item.layer);
    }
    item.nextTime += stepSeconds(item.song);
    item.step += 1;
  }
}
