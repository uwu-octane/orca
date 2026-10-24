import { Context } from "cordis";
import KeywordsService from ".";
import SeoDataService from "@/plugins/seo-data";
import * as dataforseo from "@/plugins/dataforseo";
import { bootPlugins } from "@/plugins/shared/plugin";

/** Real domain and supplier registrations; tests intercept upstream execution. */
export async function createKeywordTestRuntime() {
  const ctx = new Context();
  await bootPlugins(
    ctx,
    [
      { id: "keywords", name: "keywords" },
      { id: "dataforseo", name: "dataforseo" },
      {
        id: "seo-data",
        name: "seo-data",
        config: { keywordMetrics: "dataforseo", serpLive: "dataforseo" },
      },
    ],
    {
      keywords: async () => ({ default: KeywordsService }),
      dataforseo: async () => dataforseo,
      "seo-data": async () => ({ default: SeoDataService }),
    },
  );
  return ctx;
}
