import {
  candidateKey,
  MAX_IMPORT_CARDS,
  stripListMark,
  trimDefinition,
  type ImportCandidate,
} from "./card-import";
import { MAX_ANSWER_LENGTH, MAX_QUESTION_LENGTH } from "./quiz-input";

/**
 * 教科書やノートのような普通の文章から、一問一答カードの候補を作る（AIは使わない）。
 * 形が合う文だけを読み、合わない文は読まない。候補には元の文を添え、本人が確かめてから登録する。
 */

/** 一度に読む文章の上限（文字数）。 */
export const MAX_GENERATE_LENGTH = 20_000;
/** 答えにする語の上限（文字数）。 */
export const MAX_TERM_LENGTH = 40;
/** 「〜を何という？」の「〜」が、これより短ければ問題にしない。 */
const MIN_MEANING_LENGTH = 4;

/** どの形から作ったか。 */
export type GenerationRule = "naming" | "definition" | "glossary" | "cloze" | "ai";

export type GeneratedCandidate = ImportCandidate & {
  /** 候補を作った元の文。 */
  readonly source: string;
  readonly rule: GenerationRule;
};

export type GenerationResult = {
  readonly candidates: readonly GeneratedCandidate[];
  /** 登録済みのカードや、ほかの候補と同じだったため除いた数。 */
  readonly duplicateCount: number;
  /** 1回の上限を超えたため除いた数。 */
  readonly overflowCount: number;
};

/** 文章を受け取り、候補を返す。AIで作る方法も、この形にそろえる。 */
export type CardGenerator = (
  text: string,
  existing: readonly { readonly question: string; readonly answer: string }[],
) => GenerationResult;

/** 「〜を光合成という」「〜と呼ぶ」。語の前の、最後の「を」で区切る。 */
const NAMING = /^(.+)を[「『]?([^「」『』、。を]+?)[」』]?(?:という|と言う|といい|と呼ぶ|と呼ばれる|とよぶ)[。．]?$/;
/** 「AとはB」 */
const DEFINITION = /^(.{1,40}?)とは[、,]?\s*(.+?)[。．]?$/;
/** 用語集の「A：B」「A＝B」「A ― B」 */
const GLOSSARY = /^([^：:＝=―—。、]{1,40}?)\s*(?:[：:＝=―—]| - )\s*(.+)$/;
/** 強調した語。**A** と【A】 */
const MARKED = /\*\*(.+?)\*\*|【(.+?)】/g;
/** 問題と答えの行（取り込みの書式）。文章から作るときは読まない。 */
const QA_LABEL = /^(?:q|a|問題|問|答え|解答|答)\s*\d*$/i;

export const generateCards: CardGenerator = (text, existing) => {
  const found = readText(text.slice(0, MAX_GENERATE_LENGTH));
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
};

function readText(text: string): GeneratedCandidate[] {
  const candidates: GeneratedCandidate[] = [];
  for (const rawLine of text.replaceAll("\r\n", "\n").split("\n")) {
    const line = stripListMark(rawLine);
    if (line === "") continue;
    const glossary = readGlossary(line);
    if (glossary !== null) {
      candidates.push(glossary);
      continue;
    }
    for (const sentence of splitSentences(line)) {
      candidates.push(...readSentence(sentence));
    }
  }
  return candidates;
}

/** 句点などで文に分ける。句点は文に残す。 */
function splitSentences(line: string): string[] {
  return line
    .split(/(?<=[。．！？!?])/)
    .map((sentence) => sentence.trim())
    .filter((sentence) => sentence !== "");
}

function readGlossary(line: string): GeneratedCandidate | null {
  // 文が続く行は、用語集ではない。
  if (/[。．].+/.test(line)) return null;
  const match = GLOSSARY.exec(unmark(line));
  if (match === null) return null;
  const term = (match[1] ?? "").trim();
  if (QA_LABEL.test(term)) return null;
  return naming(trimDefinition(match[2] ?? ""), term, line, "glossary");
}

function readSentence(sentence: string): GeneratedCandidate[] {
  const marked = [...sentence.matchAll(MARKED)];
  if (marked.length > 0) {
    return marked.flatMap((match, index) => {
      const term = (match[1] ?? match[2] ?? "").trim();
      const question = cloze(sentence, index);
      return valid(question, term) ? [candidate(question, term, sentence, "cloze")] : [];
    });
  }
  const named = NAMING.exec(sentence);
  if (named !== null) {
    const result = naming(named[1] ?? "", named[2] ?? "", sentence, "naming");
    return result === null ? [] : [result];
  }
  const defined = DEFINITION.exec(sentence);
  if (defined !== null) {
    const result = naming(
      trimDefinition(defined[2] ?? ""),
      defined[1] ?? "",
      sentence,
      "definition",
    );
    return result === null ? [] : [result];
  }
  return [];
}

/** 「（意味）を何という？」で、語を答える問題にする。 */
function naming(
  meaning: string,
  term: string,
  source: string,
  rule: GenerationRule,
): GeneratedCandidate | null {
  const trimmedMeaning = meaning.trim();
  const trimmedTerm = term.trim();
  if ([...trimmedMeaning].length < MIN_MEANING_LENGTH) return null;
  const question = `${trimmedMeaning}を何という？`;
  return valid(question, trimmedTerm)
    ? candidate(question, trimmedTerm, source, rule)
    : null;
}

/** index 番目の強調した語を（　）にし、ほかの強調は外す。 */
function cloze(sentence: string, index: number): string {
  let count = -1;
  return sentence.replace(MARKED, (_, bold: string | undefined, bracket: string | undefined) => {
    count += 1;
    return count === index ? "（　）" : (bold ?? bracket ?? "");
  });
}

function unmark(text: string): string {
  return text.replace(MARKED, (_, bold: string | undefined, bracket: string | undefined) => bold ?? bracket ?? "");
}

function valid(question: string, answer: string): boolean {
  const answerLength = [...answer].length;
  return (
    answerLength > 0 &&
    answerLength <= Math.min(MAX_TERM_LENGTH, MAX_ANSWER_LENGTH) &&
    [...question].length <= MAX_QUESTION_LENGTH &&
    question.trim() !== ""
  );
}

function candidate(
  question: string,
  answer: string,
  source: string,
  rule: GenerationRule,
): GeneratedCandidate {
  return { subject: null, question, answer, source: unmark(source), rule };
}
