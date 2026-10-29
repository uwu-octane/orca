import { buildKeywordMembershipInputs } from "@/plugins/keywords/membership";
import { useId, useState } from "react";
import { useLocale } from "@/plugins/client/context";
import { Button } from "@/client/components/ui/button";
import { Input } from "@/client/components/ui/input";
import { Field, FieldLabel } from "@/client/components/ui/field";
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/client/components/ui/accordion";
import type {
  KeywordDimension,
  KeywordDimensionField,
  KeywordMembershipQuestion,
} from "@/types/schemas/keyword-dimensions";
import { KeywordQuestionDialog } from "./KeywordQuestionDialog";
import type { DecisionInput } from "@/types/schemas/decision";

export function KeywordDecisionQuestions({
  dimensions,
  disabled,
  error,
  onChange,
}: {
  dimensions: KeywordDimension[];
  disabled: boolean;
  error?: string;
  onChange: (dimensions: KeywordDimension[]) => Promise<boolean>;
}) {
  const { t, active: language } = useLocale();
  const [childId, setChildId] = useState<string | null>(null);
  const child = dimensions
    .flatMap((dimension) => dimension.children)
    .find((entry) => entry.id === childId);
  function displayName(field: KeywordDimensionField) {
    return language === "zh" ? field.labelZh : field.name;
  }
  async function save(question: KeywordMembershipQuestion | undefined) {
    if (!child) return;
    const updated = dimensions.map((dimension) => ({
      ...dimension,
      children: dimension.children.map((entry) =>
        entry.id === child.id ? { ...entry, decision: question } : entry,
      ),
    }));
    if (await onChange(updated)) setChildId(null);
  }
  return (
    <section
      aria-label={t("Decision questions")}
      className="space-y-3 border-t pt-4"
    >
      <h3 className="text-sm font-medium">{t("Decision questions")}</h3>
      <Accordion defaultValue={dimensions[0] ? [dimensions[0].id] : []}>
        {dimensions
          .filter((dimension) => dimension.children.length)
          .map((dimension) => (
            <AccordionItem key={dimension.id} value={dimension.id}>
              <AccordionTrigger>{displayName(dimension)}</AccordionTrigger>
              <AccordionContent>
                <div className="divide-y">
                  {dimension.children.map((entry) => (
                    <div
                      key={entry.id}
                      className="flex items-center justify-between gap-4 py-3"
                    >
                      <div className="min-w-0 space-y-1">
                        <span className="text-sm font-medium">
                          {displayName(entry)}
                        </span>
                        {entry.decision ? (
                          <p
                            className="line-clamp-2 break-words text-sm text-muted-foreground"
                            data-ph-mask
                          >
                            {entry.decision.instructions}
                          </p>
                        ) : null}
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        className="shrink-0"
                        disabled={disabled}
                        onClick={() => setChildId(entry.id)}
                        aria-label={`${t(entry.decision ? "Edit question" : "Configure question")}: ${displayName(entry)}`}
                      >
                        {t(
                          entry.decision
                            ? "Edit question"
                            : "Configure question",
                        )}
                      </Button>
                    </div>
                  ))}
                </div>
              </AccordionContent>
            </AccordionItem>
          ))}
      </Accordion>
      {dimensions.some((dimension) =>
        dimension.children.some((entry) => entry.active && entry.decision),
      ) ? (
        <MembershipRequestPreview dimensions={dimensions} />
      ) : null}
      {child ? (
        <KeywordQuestionDialog
          key={child.id}
          name={displayName(child)}
          question={child.decision}
          disabled={disabled}
          error={error}
          onSave={save}
          onClose={() => setChildId(null)}
        />
      ) : null}
    </section>
  );
}

function MembershipRequestPreview({
  dimensions,
}: {
  dimensions: KeywordDimension[];
}) {
  const { t } = useLocale();
  const keywordId = useId();
  const [keyword, setKeyword] = useState("");
  const [open, setOpen] = useState(false);
  // This is a local preview. No inference or supplier request runs while editing.
  let requests: DecisionInput[] = [];
  let tooLarge = false;
  if (open && keyword.trim()) {
    try {
      requests = buildKeywordMembershipInputs(dimensions, keyword.trim());
    } catch {
      tooLarge = true;
    }
  }
  return (
    <Accordion
      value={open ? ["preview"] : []}
      onValueChange={(value) => setOpen(value.includes("preview"))}
    >
      <AccordionItem value="preview">
        <AccordionTrigger>{t("Request preview")}</AccordionTrigger>
        <AccordionContent className="space-y-3">
          <Field>
            <FieldLabel htmlFor={keywordId}>{t("Keyword")}</FieldLabel>
            <Input
              id={keywordId}
              value={keyword}
              maxLength={8_000}
              onChange={(event) => setKeyword(event.target.value)}
              data-ph-mask
            />
          </Field>
          {tooLarge ? (
            <p role="alert" className="text-sm text-destructive">
              {t("Decision input is too large.")}
            </p>
          ) : null}
          {requests.map((request) => (
            <pre
              key={Object.keys(request.questions)[0]}
              className="max-h-80 overflow-auto rounded-lg bg-muted p-3 text-xs"
              data-ph-mask
            >
              <code>{JSON.stringify(request, null, 2)}</code>
            </pre>
          ))}
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}
