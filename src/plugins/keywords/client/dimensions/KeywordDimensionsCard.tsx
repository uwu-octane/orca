import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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
import {
  generateKeywordDimensions,
  getKeywordDimensions,
  saveKeywordDimensions,
} from "@/serverFunctions/keywordDimensions";
import { KeywordDimensionTabs } from "./KeywordDimensionTabs";
import { KeywordDecisionQuestions } from "./KeywordDecisionQuestions";
import type { KeywordDimension } from "@/types/schemas/keyword-dimensions";
import { asAppError } from "@/server/lib/errors";

export function KeywordDimensionsCard({
  projectId,
  searchId,
  disabled,
}: {
  projectId: string;
  searchId: string;
  disabled: boolean;
}) {
  const { t, active: language } = useLocale();
  const queryClient = useQueryClient();
  const queryKey = ["keywordDimensions", projectId, searchId];
  const saved = useQuery({
    queryKey,
    queryFn: () => getKeywordDimensions({ data: { projectId, searchId } }),
    retry: false,
    refetchOnWindowFocus: false,
  });
  const dimensions = saved.data?.dimensions ?? [];
  const [confirmReplacement, setConfirmReplacement] = useState(false);
  const generation = useMutation({
    mutationFn: () =>
      generateKeywordDimensions({
        data: {
          projectId,
          searchId,
          revision: saved.data!.revision,
          language,
        },
      }),
    retry: false,
    onSuccess: (data) => queryClient.setQueryData(queryKey, data),
  });
  const save = useMutation({
    mutationFn: (updated: KeywordDimension[]) =>
      saveKeywordDimensions({
        data: {
          projectId,
          searchId,
          revision: saved.data!.revision,
          dimensions: updated,
        },
      }),
    retry: false,
    onSuccess: (data) => queryClient.setQueryData(queryKey, data),
  });
  const error = saved.error ?? save.error ?? generation.error;
  const conflict = asAppError(error)?.code === "CONFLICT";
  const errorMessage = conflict
    ? t("Dimensions changed elsewhere. Reload them before saving.")
    : error
      ? getStandardErrorMessage(error, undefined, t)
      : undefined;
  const busy =
    disabled ||
    generation.isPending ||
    save.isPending ||
    saved.isFetching ||
    !saved.data ||
    conflict;
  async function changeDimensions(updated: KeywordDimension[]) {
    if (busy) return false;
    try {
      await save.mutateAsync(updated);
      return true;
    } catch {
      // Mutation state displays the error; the dialog retains the user's edits.
      return false;
    }
  }
  return (
    <Card
      aria-label={t("Keyword dimensions")}
      aria-busy={generation.isPending || saved.isFetching || save.isPending}
    >
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <CardTitle>{t("Keyword dimensions")}</CardTitle>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            pending={generation.isPending}
            disabled={busy}
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
        {error ? (
          <p role="alert" className="text-sm text-destructive">
            {errorMessage}
          </p>
        ) : null}
        {saved.isError || conflict ? (
          <Button
            variant="outline"
            disabled={saved.isFetching}
            onClick={async () => {
              const result = await saved.refetch();
              if (result.isSuccess) {
                save.reset();
                generation.reset();
              }
            }}
          >
            {t("Reload")}
          </Button>
        ) : null}
        {save.isPending ? (
          <p role="status" className="text-sm text-muted-foreground">
            {t("Saving...")}
          </p>
        ) : null}
        {generation.isPending || saved.isPending ? (
          <div className="min-h-36 space-y-4" role="status">
            <span className="text-sm text-muted-foreground">
              {t(
                generation.isPending
                  ? "Generating dimensions..."
                  : "Loading...",
              )}
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
          <>
            <KeywordDimensionTabs
              dimensions={dimensions}
              error={errorMessage}
              disabled={busy}
              onChange={changeDimensions}
            />
            {dimensions.some((dimension) => dimension.children.length) ? (
              <KeywordDecisionQuestions
                dimensions={dimensions}
                error={errorMessage}
                disabled={busy}
                onChange={changeDimensions}
              />
            ) : null}
          </>
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
              "The generated dimensions will replace your dimensions and their question configurations.",
            )}
          </p>
        </FormDialog>
      ) : null}
    </Card>
  );
}
