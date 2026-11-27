import { normalizeAnswer } from "./answer-judge";
import {
  MAX_ANSWER_LENGTH,
  MAX_BULK_CARDS,
  MAX_QUESTION_LENGTH,
} from "./quiz-input";

/** 1回に取り込める枚数。 */
export const MAX_IMPORT_CARDS = MAX_BULK_CARDS;
/** 取り込む文章の上限（文字数）。 */
export const MAX_IMPORT_LENGTH = 100_000;
/** 取り込むファイルの上限（バイト数）。 */
export const MAX_IMPORT_BYTES = 400_000;

/** 文章から読み取ったカードの候補。長さなどの検証は登録前に行う。 */
export type ImportCandidate = {
  /** 文章の中で指定されていなければ null。 */
  readonly subject: string | null;
  readonly question: string;
  readonly answer: string;
};

export type ImportResult = {
  readonly candidates: readonly ImportCandidate[];
  /** 登録済みのカードや、ほかの候補と同じだったため除いた数。 */
  readonly duplicateCount: number;
  /** 1回の上限を超えたため除いた数。 */
  readonly overflowCount: number;
};

const QUESTION_LINE = /^(?:q|問題|問)\s*\d*\s*[:：.．]\s*(.*)$/i;
const ANSWER_LINE = /^(?:a|解答|答え|答)\s*\d*\s*[:：.．]\s*(.*)$/i;
const DEFINITION_LINE = /^(.{1,40}?)とは[、,]?\s*(.+)$/;
/** 箇条書きや番号、引用の記号。「-1」や「1.5」は記号とみなさない。 */
const LIST_MARK = /^(?:[-*+]\s+|[•・>]\s*|\d+[.)]\s+|\d+[．）]\s*)/;
const TABLE_RULE = /^[\s|:-]+$/;
/** これより長い行は、カードの上限に収まらないため読まない。 */
const MAX_LINE_LENGTH = 1000;
const HEADER_WORDS = new Set([
  "問題",
  "問い",
  "質問",
  "答え",
  "解答",
  "回答",
  "科目",
  "question",
  "answer",
  "subject",
]);

/**
 * 文章からカードの候補を読み取る。次の形に対応する。
 * - 「Q: 問題」「A: 答え」
 * - 「問題,答え」「科目,問題,答え」（カンマ、タブ、表の縦棒）
 * - 「AとはB」（Bから、Aを答える問題にする）
 */
export function parseImportedCards(
  text: string,
  existing: readonly { readonly question: string; readonly answer: string }[],
): ImportResult {
  const found = readCandidates(text);
  const seen = new Set(existing.map(candidateKey));
  const unique = found.filter((candidate) => {
    const key = candidateKey(candidate);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  return {
    candidates: unique.slice(0, MAX_IMPORT_CARDS),
    duplicateCount: found.length - unique.length,
    overflowCount: Math.max(0, unique.length - MAX_IMPORT_CARDS),
  };
}

function readCandidates(text: string): ImportCandidate[] {
  const candidates: ImportCandidate[] = [];
  /** 「Q:」を読んでから「A:」が来るまでの問題文。 */
  let pending: string[] | null = null;

  for (const rawLine of text.replaceAll("\r\n", "\n").split("\n")) {
    if (rawLine.length > MAX_LINE_LENGTH) continue;
    const line = cleanLine(rawLine);
    if (line === "") continue;

    const questionMatch = QUESTION_LINE.exec(line);
    if (questionMatch !== null) {
      pending = [questionMatch[1] ?? ""];
      continue;
    }
    if (pending !== null) {
      const answerMatch = ANSWER_LINE.exec(line);
      if (answerMatch === null) {
        pending.push(line);
        continue;
      }
      pushIfFilled(candidates, null, pending.join("\n"), answerMatch[1] ?? "");
      pending = null;
      continue;
    }
    readSingleLine(candidates, rawLine.trim(), line);
  }
  return candidates;
}

function readSingleLine(
  candidates: ImportCandidate[],
  rawLine: string,
  line: string,
): void {
  const cells = splitCells(rawLine, line);
  if (cells !== null) {
    if (cells.every((cell) => HEADER_WORDS.has(cell.toLowerCase()))) return;
    const [first = "", second = "", third] = cells;
    if (third === undefined) pushIfFilled(candidates, null, first, second);
    else pushIfFilled(candidates, first, second, third);
    return;
  }
  const definition = DEFINITION_LINE.exec(line);
  if (definition !== null) {
    const term = (definition[1] ?? "").trim();
    const meaning = trimDefinition(definition[2] ?? "");
    if (meaning !== "") {
      pushIfFilled(candidates, null, `${meaning}を何という？`, term);
    }
  }
}

/** 2つか3つの欄に分けられる行なら、その欄を返す。 */
function splitCells(rawLine: string, line: string): string[] | null {
  if (rawLine.startsWith("|") && rawLine.endsWith("|")) {
    if (TABLE_RULE.test(rawLine)) return null;
    return twoOrThree(rawLine.slice(1, -1).split("|"));
  }
  if (rawLine.includes("\t")) return twoOrThree(rawLine.split("\t"));
  return twoOrThree(splitCsv(line));
}

function twoOrThree(cells: readonly string[]): string[] | null {
  const trimmed = cells.map(stripEmphasis);
  return trimmed.length === 2 || trimmed.length === 3 ? trimmed : null;
}

/** 「"」で囲まれた中のカンマは、区切りとして扱わない。 */
function splitCsv(line: string): string[] {
  const cells: string[] = [];
  let cell = "";
  let isQuoted = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (isQuoted && line[i + 1] === '"') {
        cell += '"';
        i++;
      } else {
        isQuoted = !isQuoted;
      }
    } else if (char === "," && !isQuoted) {
      cells.push(cell);
      cell = "";
    } else {
      cell += char;
    }
  }
  return [...cells, cell];
}

function pushIfFilled(
  candidates: ImportCandidate[],
  subject: string | null,
  question: string,
  answer: string,
): void {
  const trimmed = {
    subject: subject === null || subject.trim() === "" ? null : subject.trim(),
    question: question.trim(),
    answer: answer.trim(),
  };
  if (trimmed.question !== "" && trimmed.answer !== "") candidates.push(trimmed);
}

/** 箇条書きの記号と、Markdownの見出しの記号を除く。強調の記号は残す。 */
export function stripListMark(line: string): string {
  return line.trim().replace(LIST_MARK, "").replace(/^#+s+/, "").trim();
}

/** 箇条書きの記号と、Markdownの強調・見出しの記号を除く。 */
export function cleanLine(line: string): string {
  return stripEmphasis(line.trim().replace(LIST_MARK, ""));
}

/** Markdownの強調（**太字**）と見出しの記号を除く。 */
function stripEmphasis(text: string): string {
  return text.replaceAll("**", "").replace(/^#+\s+/, "").trim();
}

/** 「〜のことである。」などの文末を除く。 */
export function trimDefinition(text: string): string {
  return text
    .trim()
    .replace(/[。．.]+$/, "")
    .replace(/(?:のこと)?(?:である|です|だ|を指す|をいう|を言う)?$/, "")
    .replace(/のこと$/, "")
    .trim();
}

export function candidateKey(card: {
  readonly question: string;
  readonly answer: string;
}): string {
  return JSON.stringify([
    normalizeAnswer(card.question),
    normalizeAnswer(card.answer),
  ]);
}

/** 自分のAIアプリに貼る指示文。返ってきた文章を、そのまま取り込める形にする。 */
export function buildAiPrompt(subject: string): string {
  const topic = subject.trim() === "" ? "" : `科目は「${subject.trim()}」です。`;
  return [
    `添付した資料（またはこの下に貼る文章）から、一問一答の問題を作ってください。${topic}`,
    "",
    "条件：",
    "- 最大20問。資料に書かれていることだけを使う。",
    `- 答えは単語か短い語句にし、${MAX_ANSWER_LENGTH}文字以内にする。`,
    `- 問題文は${MAX_QUESTION_LENGTH}文字以内にする。`,
    "- 答えが1つに決まる問題にする。",
    "- 前置きや解説は書かず、次の形だけを繰り返す。",
    "",
    "Q: 問題文",
    "A: 答え",
  ].join("\n");
}
