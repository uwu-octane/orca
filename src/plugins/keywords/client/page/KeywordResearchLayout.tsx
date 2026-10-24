import type { ReactNode } from "react";
import { PageHeader } from "@/client/components/PageHeader";
import { useLocale } from "@/plugins/client/context";
import { KeywordProviderTabs } from "./KeywordProviderTabs";

export function KeywordResearchLayout({
  provider,
  actions,
  children,
}: {
  provider: "dataforseo" | "google_ads";
  actions?: ReactNode;
  children: ReactNode;
}) {
  const { t } = useLocale();
  return (
    <div className="h-full overflow-auto px-4 py-4 pb-24 [scrollbar-gutter:stable] md:px-6 md:py-6 md:pb-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-4">
        <PageHeader
          title={t("Keyword Research")}
          description={t(
            "Discover keyword ideas, search demand, and ranking opportunities.",
          )}
        />
        <div className="flex items-center justify-between gap-4">
          <KeywordProviderTabs provider={provider} />
          {actions}
        </div>
        {children}
      </div>
    </div>
  );
}
