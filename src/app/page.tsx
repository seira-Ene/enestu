import { StudyScreen } from "@/components/StudyScreen";
import { DEFAULT_WORLD_ID, themes } from "@/themes";

export default function Home() {
  return <StudyScreen theme={themes[DEFAULT_WORLD_ID]} />;
}
