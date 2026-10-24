import { DEFAULT_LLM_MODEL, llmModelSchema } from "@/types/schemas/ai-provider";
import {
  Combobox,
  ComboboxInput,
  ComboboxContent,
  ComboboxList,
  ComboboxItem,
} from "@/client/components/ui/combobox";
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Sparkles } from "lucide-react";
import { useLocale } from "@/plugins/client/context";
import { FormDialog } from "@/client/components/FormDialog";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/client/components/ui/card";
import { Button } from "@/client/components/ui/button";
import { Skeleton } from "@/client/components/ui/skeleton";
import { getStandardErrorMessage } from "@/client/lib/error-messages";
import { generateKeywordDimensions } from "@/serverFunctions/keywordDimensions";
import {
  KeywordDimensionTabs,
  type KeywordDimension,
} from "./KeywordDimensionTabs";

export function KeywordDimensionsCard({
  projectId,
  keywords,
  disabled,
}: {
  projectId: string;
  keywords: string[];
  disabled: boolean;
}) {
  const { t, active: language } = useLocale();
  const [model, setModel] = useState<string>(DEFAULT_LLM_MODEL);
  const [dimensions, setDimensions] = useState<KeywordDimension[]>([]);
  const [confirmReplacement, setConfirmReplacement] = useState(false);
  const generation = useMutation({
    mutationFn: () =>
      generateKeywordDimensions({
        data: { projectId, keywords, language, model },
      }),
    retry: false,
    onSuccess: ({ dimensions: generated }) =>
      setDimensions(
        generated.map((dimension) => ({
          id: crypto.randomUUID(),
          name: dimension.name,
          children: dimension.children.map((name) => ({
            id: crypto.randomUUID(),
            name,
          })),
        })),
      ),
  });
  const busy = disabled || generation.isPending;
  return (
    <Card aria-label={t("Keyword dimensions")} aria-busy={generation.isPending}>
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <CardTitle>{t("Keyword dimensions")}</CardTitle>
        <div className="flex flex-wrap items-center gap-2">
          <Combobox
            items={[DEFAULT_LLM_MODEL, "deepseek/deepseek-v4-flash"]}
            inputValue={model}
            onInputValueChange={setModel}
            onValueChange={(value) => {
              if (typeof value === "string") setModel(value);
            }}
          >
            <ComboboxInput
              aria-label={t("Model name")}
              disabled={busy}
              className="w-full sm:w-72"
            />
            <ComboboxContent>
              <ComboboxList>
                {(item: string) => (
                  <ComboboxItem key={item} value={item}>
                    {item}
                  </ComboboxItem>
                )}
              </ComboboxList>
            </ComboboxContent>
          </Combobox>
          <Button
            type="button"
            variant="outline"
            pending={generation.isPending}
            disabled={busy || !llmModelSchema.safeParse(model).success}
            onClick={() => {
              if (busy) return;
              if (dimensions.length) setConfirmReplacement(true);
              else generation.mutate();
            }}
          >
            <Sparkles data-icon="inline-start" />
            {t(
              dimensions.length
                ? "Regenerate dimensions"
                : "Generate dimensions",
            )}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="min-h-36 space-y-3">
        {generation.isError ? (
          <p role="alert" className="text-sm text-destructive">
            {getStandardErrorMessage(generation.error, undefined, t)}
          </p>
        ) : null}
        {generation.isPending ? (
          <div className="min-h-36 space-y-4" role="status">
            <span className="text-sm text-muted-foreground">
              {t("Generating dimensions...")}
            </span>
            <div className="flex gap-2">
              <Skeleton className="h-8 w-24" />
              <Skeleton className="h-8 w-28" />
              <Skeleton className="h-8 w-20" />
            </div>
            <div className="flex flex-wrap gap-2">
              {[24, 32, 28, 20].map((width) => (
                <Skeleton
                  key={width}
                  className="h-8 rounded-full"
                  style={{ width: width * 4 }}
                />
              ))}
            </div>
          </div>
        ) : (
          <KeywordDimensionTabs
            dimensions={dimensions}
            disabled={busy}
            onChange={setDimensions}
          />
        )}
      </CardContent>
      {confirmReplacement ? (
        <FormDialog
          title={t("Regenerate dimensions?")}
          onClose={() => setConfirmReplacement(false)}
          actions={
            <>
              <Button
                variant="outline"
                onClick={() => setConfirmReplacement(false)}
              >
                {t("Cancel")}
              </Button>
              <Button
                onClick={() => {
                  generation.mutate();
                  setConfirmReplacement(false);
                }}
              >
                {t("Regenerate dimensions")}
              </Button>
            </>
          }
        >
          <p className="text-sm text-muted-foreground">
            {t(
              "The generated dimensions will replace this draft, including your edits.",
            )}
          </p>
        </FormDialog>
      ) : null}
    </Card>
  );
}
