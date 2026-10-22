import { useNavigate } from "@tanstack/react-router";
import { Tabs, TabsList, TabsTrigger } from "@/client/components/ui/tabs";
import { useLocale } from "@/plugins/client/context";

export function KeywordProviderTabs({
  provider,
}: {
  provider: "dataforseo" | "google_ads";
}) {
  const { t } = useLocale();
  const navigate = useNavigate({ from: "/p/$projectId/keywords" });
  return (
    <Tabs
      value={provider}
      onValueChange={(value) => {
        if (value !== "dataforseo" && value !== "google_ads") return;
        void navigate({
          search: (prev) => ({
            ...prev,
            provider: value === "google_ads" ? "google_ads" : undefined,
          }),
        });
      }}
    >
      <TabsList aria-label={t("Keyword provider")} variant="line">
        <TabsTrigger value="dataforseo">DataForSEO</TabsTrigger>
        <TabsTrigger value="google_ads">Google Ads</TabsTrigger>
      </TabsList>
    </Tabs>
  );
}
