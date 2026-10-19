import { useLocale } from "@/plugins/client/context";
import {
  AI_ENGINE_LABELS,
  aiNoAnswerLabel,
  type AiEngine,
  type AiObservationRow,
} from "@/shared/ai-visibility";
import { EngineLabel } from "./EngineLabel";

export function EngineResult({
  engine,
  row,
}: {
  engine: AiEngine;
  row: AiObservationRow | undefined;
}) {
  const { t } = useLocale();

  const own = row?.brands.find((brand) => brand.own);
  const result = !row
    ? t("No result available")
    : row.status === "failed"
      ? t("Failed")
      : row.status === "pending"
        ? t("Running")
        : row.answerStatus === "no_answer"
          ? t(aiNoAnswerLabel(engine))
          : row.answerStatus !== "answered"
            ? t("Answer unavailable")
            : own?.mentioned
              ? t("Mentioned")
              : t("Not mentioned");
  return (
    <span
      title={`${AI_ENGINE_LABELS[engine]}: ${result}`}
      className={`inline-flex h-6 items-center text-xs ${result === t("Mentioned") ? "text-success" : result === t("Failed") ? "text-destructive" : "text-muted-foreground"}`}
    >
      <EngineLabel engine={engine} />
    </span>
  );
}
