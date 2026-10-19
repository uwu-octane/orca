import { useLocale } from "@/plugins/client/context";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/client/components/ui/select";
import {
  RESEARCH_SCOPES,
  RESEARCH_SCOPE_DESCRIPTIONS,
  RESEARCH_SCOPE_EXAMPLES,
  RESEARCH_SCOPE_LABELS,
  type ResearchScope,
} from "@/shared/researchScope";

type Props = {
  value: ResearchScope;
  onChange: (scope: ResearchScope) => void;
  /** Greys the whole control (e.g. a brand-keyword lookup) with this reason. */
  disabledReason?: string;
  className?: string;
  "aria-label"?: string;
};

/**
 * The shared research-scope selector: Exact URL / Subfolder / Domain /
 * Subdomains. Each option explains what it covers. Every research input that
 * accepts a URL or domain renders this next to the input so scope is explicit
 * instead of inferred.
 */
export function ResearchScopeSelect({
  value,
  onChange,
  disabledReason,
  className,
  "aria-label": ariaLabel = "Research scope",
}: Props) {
  const { t } = useLocale();
  const scopeItems = RESEARCH_SCOPES.map((scope) => ({
    value: scope,
    label: t(RESEARCH_SCOPE_LABELS[scope]),
  }));
  return (
    <Select
      items={scopeItems}
      value={value}
      onValueChange={(scope) => {
        if (scope != null) onChange(scope);
      }}
      disabled={disabledReason != null}
    >
      <SelectTrigger
        className={className}
        aria-label={t(ariaLabel)}
        title={disabledReason ? t(disabledReason) : undefined}
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent align="end" alignItemWithTrigger={false} className="w-72">
        {RESEARCH_SCOPES.map((scope) => (
          <SelectItem key={scope} value={scope} className="items-start py-1.5">
            <span className="flex flex-col whitespace-normal">
              <span>{t(RESEARCH_SCOPE_LABELS[scope])}</span>
              <span className="text-xs text-muted-foreground">
                {t(RESEARCH_SCOPE_DESCRIPTIONS[scope])}
              </span>
              <span className="font-mono text-xs text-muted-foreground/70">
                {RESEARCH_SCOPE_EXAMPLES[scope]}
              </span>
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
