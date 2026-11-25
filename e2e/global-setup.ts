import { startFakeSupabase } from "./fake/server";

/** まねたSupabaseを起動する。返した関数が、最後に止める。 */
export default async function globalSetup(): Promise<() => Promise<void>> {
  return startFakeSupabase();
}
