// FORK: retain locale subscriptions across upstream component changes.
import { useLocale } from "@/plugins/client/context";
import { useId } from "react";
import { Link, Link2, Unlink } from "lucide-react";
import { SegmentedToggle } from "@/client/components/SegmentedToggle";
import { DataTableFilterGroup } from "@/client/components/table/DataTableToolbar";
import { Checkbox } from "@/client/components/ui/checkbox";
import { Label } from "@/client/components/ui/label";
import { DomainFilterPanel } from "@/client/features/domain/components/DomainFilterPanel";
import type { BacklinksTab } from "@/types/schemas/backlinks";
import {
  BACKLINKS_FILTER_FIELDS,
  REFERRING_DOMAINS_FILTER_FIELDS,
  TOP_PAGES_FILTER_FIELDS,
  countFilterConditions,
  type BacklinksTabFilterValues,
} from "./backlinksFilterTypes";
import type { BacklinksFiltersState } from "./useBacklinksFilters";

/**
 * Filters are applied explicitly (not per keystroke) because every change
 * triggers a billed DataForSEO request. Each include/exclude term and each
 * set field costs one DataForSEO filter condition, capped per request —
 * DomainFilterPanel surfaces the count and gates Apply.
 */
export function BacklinksFilterPanel({
  activeTab,
  filters,
  onApplied,
  maxConditions,
}: {
  activeTab: BacklinksTab;
  filters: BacklinksFiltersState;
  onApplied: () => void;
  /** Scope filters can consume part of the DataForSEO condition budget. */
  maxConditions?: number;
}) {
  const { t } = useLocale();

  if (activeTab === "backlinks") {
    const state = filters.backlinks;
    return (
      <DomainFilterPanel
        key="backlinks"
        appliedFilters={state.values}
        fields={BACKLINKS_FILTER_FIELDS}
        activeFilterCount={state.activeFilterCount}
        countConditions={countFilterConditions}
        maxConditions={maxConditions}
        textFields={[
          {
            key: "include",
            label: t("Source URL Contains"),
            placeholder: t("example.com, blog"),
          },
          {
            key: "exclude",
            label: t("Source URL Excludes"),
            placeholder: t("spam, forum"),
          },
        ]}
        rangeFields={[
          {
            title: t("Domain Authority"),
            minKey: "minDomainRank",
            maxKey: "maxDomainRank",
          },
          {
            title: t("Link Authority"),
            minKey: "minLinkAuthority",
            maxKey: "maxLinkAuthority",
          },
          {
            title: t("Spam Score"),
            minKey: "minSpamScore",
            maxKey: "maxSpamScore",
            step: "0.1",
          },
        ]}
        onApply={(values) => {
          state.apply(values);
          onApplied();
        }}
        onClear={() => {
          state.reset();
          onApplied();
        }}
        renderExtra={(draft, setValue) => (
          <BacklinksToggleControls draft={draft} setValue={setValue} />
        )}
      />
    );
  }

  if (activeTab === "domains") {
    const state = filters.domains;
    return (
      <DomainFilterPanel
        key="domains"
        appliedFilters={state.values}
        fields={REFERRING_DOMAINS_FILTER_FIELDS}
        activeFilterCount={state.activeFilterCount}
        countConditions={countFilterConditions}
        maxConditions={maxConditions}
        textFields={[
          {
            key: "include",
            label: t("Domain Contains"),
            placeholder: t("example.com, blog"),
          },
          {
            key: "exclude",
            label: t("Domain Excludes"),
            placeholder: t("spam, forum"),
          },
        ]}
        rangeFields={[
          {
            title: t("Backlinks"),
            minKey: "minBacklinks",
            maxKey: "maxBacklinks",
          },
          { title: t("Rank"), minKey: "minRank", maxKey: "maxRank" },
          {
            title: t("Spam Score"),
            minKey: "minSpamScore",
            maxKey: "maxSpamScore",
            step: "0.1",
          },
        ]}
        onApply={(values) => {
          state.apply(values);
          onApplied();
        }}
        onClear={() => {
          state.reset();
          onApplied();
        }}
      />
    );
  }

  const state = filters.pages;
  return (
    <DomainFilterPanel
      key="pages"
      appliedFilters={state.values}
      fields={TOP_PAGES_FILTER_FIELDS}
      activeFilterCount={state.activeFilterCount}
      countConditions={countFilterConditions}
      maxConditions={maxConditions}
      textFields={[
        {
          key: "include",
          label: t("Page URL Contains"),
          placeholder: t("/blog, /products"),
        },
        {
          key: "exclude",
          label: t("Page URL Excludes"),
          placeholder: t("/tag, /author"),
        },
      ]}
      rangeFields={[
        {
          title: t("Backlinks"),
          minKey: "minBacklinks",
          maxKey: "maxBacklinks",
        },
        {
          title: t("Referring Domains"),
          minKey: "minReferringDomains",
          maxKey: "maxReferringDomains",
        },
        { title: t("Rank"), minKey: "minRank", maxKey: "maxRank" },
      ]}
      onApply={(values) => {
        state.apply(values);
        onApplied();
      }}
      onClear={() => {
        state.reset();
        onApplied();
      }}
    />
  );
}

function BacklinksToggleControls({
  draft,
  setValue,
}: {
  draft: BacklinksTabFilterValues;
  setValue: (key: keyof BacklinksTabFilterValues, value: string) => void;
}) {
  const { t } = useLocale();
  const LINK_TYPE_ITEMS = [
    { value: "all", icon: <Link2 />, label: t("All") },
    { value: "dofollow", icon: <Link />, label: t("Dofollow") },
    { value: "nofollow", icon: <Unlink />, label: t("Nofollow") },
  ];

  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
      <DataTableFilterGroup label={t("Link Type")}>
        <SegmentedToggle
          showLabels
          items={LINK_TYPE_ITEMS}
          value={draft.linkType || "all"}
          onChange={(value) =>
            setValue("linkType", value === "all" ? "" : value)
          }
        />
      </DataTableFilterGroup>

      <DataTableFilterGroup label={t("Visibility")}>
        <div className="flex h-7 items-center gap-4">
          <VisibilityCheckbox
            label={t("Hide lost")}
            checked={draft.hideLost === "true"}
            onCheckedChange={(checked) =>
              setValue("hideLost", checked ? "true" : "")
            }
          />
          <VisibilityCheckbox
            label={t("Hide broken")}
            checked={draft.hideBroken === "true"}
            onCheckedChange={(checked) =>
              setValue("hideBroken", checked ? "true" : "")
            }
          />
        </div>
      </DataTableFilterGroup>
    </div>
  );
}

function VisibilityCheckbox({
  label,
  checked,
  onCheckedChange,
}: {
  label: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}) {
  const id = useId();
  return (
    <div className="flex items-center gap-2">
      <Checkbox id={id} checked={checked} onCheckedChange={onCheckedChange} />
      <Label htmlFor={id} className="text-xs font-normal">
        {label}
      </Label>
    </div>
  );
}
