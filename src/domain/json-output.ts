/** AIの返事の前後に余計な文が付いていても、最初の { から最後の } までをJSONとして読む。 */
export function extractJson(output: string): unknown {
  const start = output.indexOf("{");
  const end = output.lastIndexOf("}");
  if (start < 0 || end < start) return null;
  try {
    return JSON.parse(output.slice(start, end + 1));
  } catch {
    return null;
  }
}
