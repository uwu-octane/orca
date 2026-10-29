import { useQuery } from "@tanstack/react-query";
import { useLocale } from "@/plugins/client/context";
import { QueryError } from "@/client/components/QueryState";
import { Skeleton } from "@/client/components/ui/skeleton";
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@/client/components/ui/combobox";
import {
  llmModelSchema,
  gatewayDecisionModelSchema,
} from "@/types/schemas/ai-provider";
import type { GatewayModelPickerProps } from "../contracts";
import { gatewayModelsQuery } from "./gatewayModelsQuery";

export function GatewayModelPicker({
  projectId,
  kind,
  value,
  onChange,
  onBlur,
  id,
  disabled,
  className = "w-full",
}: GatewayModelPickerProps) {
  const { t } = useLocale();
  const query = useQuery(gatewayModelsQuery(projectId));
  // Text callers retain their existing DeepSeek-only policy. Evaluation models
  // have their own native contract; a language model is not a decision model.
  const models = (query.isError ? [] : (query.data ?? [])).filter(
    (model) =>
      model.kind === kind &&
      (kind === "evaluation"
        ? gatewayDecisionModelSchema
        : llmModelSchema
      ).safeParse(model.id).success,
  );
  return (
    <div className={className} aria-busy={query.isFetching}>
      {query.isPending ? (
        <Skeleton className="h-10 w-full" />
      ) : (
        <Combobox
          items={models.map((model) => model.id)}
          value={value}
          disabled={disabled}
          autoHighlight
          filter={(modelId, search) => {
            const model = models.find((item) => item.id === modelId);
            const text =
              `${modelId} ${model?.name ?? ""} ${model?.creator ?? ""}`
                .normalize("NFKC")
                .toLowerCase();
            return search
              .normalize("NFKC")
              .toLowerCase()
              .trim()
              .split(/\s+/)
              .every((term) => text.includes(term));
          }}
          onValueChange={(modelId) => {
            if (modelId) onChange(modelId);
          }}
        >
          <ComboboxInput
            id={id}
            onBlur={onBlur}
            disabled={disabled}
            className="w-full"
            aria-label={t("Model name")}
          />
          <ComboboxContent>
            <ComboboxEmpty>{t("No models found")}</ComboboxEmpty>
            <ComboboxList>
              {(modelId: string) => (
                <ComboboxItem key={modelId} value={modelId}>
                  {modelId}
                </ComboboxItem>
              )}
            </ComboboxList>
          </ComboboxContent>
        </Combobox>
      )}
      {query.isError && (
        <QueryError
          error={query.error}
          fallback={t("Couldn’t load the model list. Try again.")}
          onRetry={() => void query.refetch()}
          isRetrying={query.isFetching}
        />
      )}
    </div>
  );
}
