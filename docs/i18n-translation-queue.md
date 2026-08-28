# 深页翻译工作单(i18n translation queue)

本文档是交给执行模型的工作单:把 orca fork 的深页 UI 翻译为简体中文。
架构(词典组织方式)已定型,**执行模型只做"加词条 + 包 `t()`",不得改动架构**。

## 架构速览(必读)

- **英文原文即 key**。`t("Dashboard")` 在 zh 激活时返回词典值,en 激活时直通英文原文。**没有 en 词典,也不要创建**。
- 词典在 `src/plugins/locale/locales/zh/` 下,**按 feature 一个文件**:

  ```ts
  // src/plugins/locale/locales/zh/dashboard.ts
  export const dashboardZh = {
    "Total pages crawled": "共抓取页面",
    "Pages with issues": "存在问题的页面",
  } satisfies Record<string, string>;
  ```

  然后在合并入口 `src/plugins/locale/locales/zh/index.ts` 加入:

  ```ts
  import { dashboardZh } from "./dashboard";
  export const zh = { ...shellZh, ...dashboardZh } as const;
  ```

  加进合并后 `ShellKey` 自动扩展,静态调用点获得编译期检查。

- 组件里取 `t`:

  ```tsx
  import { useLocale } from "@/plugins/client/context";

  export function Xxx() {
    const { t } = useLocale();
    // 静态文本:t("Total pages crawled")
    // 带插值:t("Page {page} of {totalPages}", { page, totalPages })
    // 动态 key(变量/映射表):t(label) —— 编译期不检查,靠词典完整性测试兜底
  }
  ```

## 硬性规则

1. **词典值语义必须与英文 key 完全一致**,不意译过头、不增删信息;保留 `{param}` 占位符且参数名不变。
2. **不翻译**:品牌/产品名(OpenSEO、DataForSEO、Google、Search Console、Autumn、PostHog、Sam 等)、API 返回的数据值、URL、域名、代码/配置键。
3. **只动文本**:不重构组件、不改样式、不改逻辑、不移动 JSX 结构。文件内可换行/缩进让 prettier 满意即可。
4. aria-label / title / alt 属性与可见文本一并翻译(同一个 `t` 调用)。
5. 数字/日期/百分比格式化**不要动**(已统一走 `getIntlLocale(readActiveLocale())`,phase 4 完成)。
6. 数据驱动文案**不翻译**:组件若直接渲染 API 返回值(如 DataForSEO 的 issue 标题、域名、关键词),保持原样——见各轮备注。
7. 若组件已有 `useLocale()` 导入(phase 3/4 改过的文件),复用即可,不要重复导入。
8. **不要动**:`src/plugins/locale/{t,store,locale-settings}.ts`、`zh/index.ts` 的合并结构(只加一行 import 和展开)、`src/plugins/client/`、`vendor/**`、`docs/PLUGINS.md`、`FORK.md`。
9. 每轮结束时 `pnpm ci:check && pnpm test` 必须全绿(136+ 测试文件)。词典新增词条不需单独写测试;若翻译了**动态 key**(映射表/变量),在该 feature 的词典处补一个完整性测试(参考 `src/plugins/locale/t.test.ts` 的 nav-labels 测试写法)。
10. 每轮一个 git 提交,提交信息格式:`i18n: translate <feature> pages to zh-CN`。

## 已翻译(跳过,勿重复)

`Sidebar.tsx`、`TablePagination.tsx`、`ThemePreferenceMenuItems.tsx`、
`AppShellParts.tsx`、`AuthPage.tsx`、`_auth.sign-in.tsx`、
`_app/settings.tsx`、`DefaultCatchBoundary.tsx`、error-messages 的 17 条错误文案。

## 工作单(按优先级,每轮一个 feature)

### 第 1 轮:dashboard

- `src/client/features/dashboard/DashboardPage.tsx`
- 词典:`zh/dashboard.ts` → `dashboardZh`

### 第 2 轮:domain

- `domain/DomainOverviewPage.tsx`
- `domain/components/DomainFilterPanel.tsx`
- `domain/components/DomainKeywordsPagination.tsx`
- `domain/components/DomainSearchCard.tsx`
- 词典:`zh/domain.ts`

### 第 3 轮:audit

- `audit/launch/LaunchView.tsx`
- `audit/launch/AuditHistorySection.tsx`
- `audit/launch/LaunchFormCard.tsx`
- `audit/results/AuditResultsTableFilters.tsx`
- `audit/results/IssuesView.tsx`
  - ⚠️ 只翻译该文件的静态标签(按钮、表头、筛选器);issue 标题/描述若来自 DataForSEO 返回值,**保持原样**
- 词典:`zh/audit.ts`

### 第 4 轮:keywords

- `keywords/page/KeywordResearchPage.tsx`
- `keywords/page/KeywordResearchDesktopResults.tsx`
- `keywords/page/KeywordResearchMobileResults.tsx`
- `keywords/page/KeywordResearchSearchBar.tsx`
- `keywords/page/KeywordResearchPagination.tsx`
- `keywords/components/KeywordUi.tsx`
- `keywords/components/SerpAnalysisCard.tsx`
- 词典:`zh/keywords.ts`

### 第 5 轮:saved-keywords

- `saved-keywords/SavedKeywordsHeader.tsx`
- `saved-keywords/SavedKeywordsFilterPanel.tsx`
- `saved-keywords/SavedKeywordsTagFilter.tsx`
- `saved-keywords/SavedKeywordsBulkTagsModal.tsx`
- `saved-keywords/SavedKeywordsPagination.tsx`
- 词典:`zh/saved-keywords.ts`

### 第 6 轮:backlinks

- `backlinks/BacklinksPage.tsx`
- `backlinks/BacklinksPageStates.tsx`
- `backlinks/BacklinksOverviewPanels.tsx`
- `backlinks/BacklinksFilterPanel.tsx`
- `backlinks/BacklinksTableColumns.tsx`
- `backlinks/ReferringDomainsTable.tsx`
- 词典:`zh/backlinks.ts`

### 第 7 轮:rank-tracking

- `rank-tracking/RankTrackingOverview.tsx`
- `rank-tracking/RankTrackingFilters.tsx`
- `rank-tracking/RankTrackingConfigModal.tsx`
- `rank-tracking/RankTrackingDomainList.tsx`
- `rank-tracking/RankTrackingHistoryMatrix.tsx`
- `rank-tracking/RankTrackingTrendChart.tsx`
- `rank-tracking/KeywordTrendModal.tsx`
- `rank-tracking/CheckConfirmModal.tsx`
- `rank-tracking/SearchTargetingField.tsx`
- 注:前 4 个文件已含 `getIntlLocale` 导入(phase 4),可顺带在同一 import 加 `useLocale`
- 词典:`zh/rank-tracking.ts`

### 第 8 轮:gsc + search-performance + lighthouse(合并轮,量小)

- `gsc/SitePicker.tsx`
- `search-performance/SearchPerformancePage.tsx`
- `lighthouse/issues/LighthouseIssuesParts.tsx`
  - ⚠️ Lighthouse 报告字段若来自 API 返回值保持原样
- 词典:`zh/gsc.ts`、`zh/search-performance.ts`、`zh/lighthouse.ts`

### 第 9 轮:ai-search

- `ai-search/PromptExplorerPage.tsx`
- `ai-search/BrandLookupPage.tsx`
- `ai-search/components/PromptExplorerForm.tsx`
- `ai-search/components/PromptExplorerResults.tsx`
- `ai-search/components/BrandLookupFilterPanel.tsx`
- `ai-search/components/BrandLookupCitationTables.tsx`
- `ai-search/components/BrandLookupShareOfVoice.tsx`
- ⚠️ AI 生成的文本(搜索结果、引用)是数据,**不翻译**
- 词典:`zh/ai-search.ts`

### 第 10 轮:billing + projects

- `billing/BillingFeatureBreakdown.tsx`
- `billing/BillingUsageChart.tsx`
- `projects/ProjectGeneralSettings.tsx`
- `projects/CreateProjectModal.tsx`
- `projects/ProjectMarketFields.tsx`
- `projects/project-context/ProjectContextPage.tsx`
- 词典:`zh/billing.ts`、`zh/projects.ts`

### 第 11 轮:onboarding + integrations + sam + ga4

- `onboarding/SearchConsoleOnboardingStep.tsx`
- `onboarding/OnboardingChat.tsx`
- `onboarding/OnboardingChatParts.tsx`
- `integrations/GoogleOAuthSetupWarning.tsx`
- `sam/SamSetupGate.tsx`
- `sam/SamSidebarPanel.tsx`
- `sam/SamChat.tsx`
- `sam/SamConversation.tsx`
- `ga4/Ga4PropertyPicker.tsx`
- `ga4/GoogleAnalyticsConnectionCard.tsx`
- ⚠️ Sam 聊天回复是数据,不翻译
- 词典:`zh/onboarding.ts`、`zh/sam.ts`、`zh/ga4.ts`(integrations 并入 onboarding)

### 第 12 轮:共享组件与路由收尾

- `src/client/components/NotFound.tsx`
- `src/client/components/UnauthenticatedErrorCard.tsx`
- `src/routes/_authenticated.oauth-consent.tsx`
- `src/routes/_authenticated.subscribe.tsx`
- `src/routes/_app/projects.tsx`
- `src/routes/_app/ai.tsx`
- `src/routes/_app/support.tsx`
- `src/routes/_app/billing.tsx`
- `src/routes/_app/help/openrouter-api-key.tsx`
- `src/routes/_app/help/dataforseo-api-key.tsx`
- `src/routes/_project/p/$projectId/audit/index.tsx`
- `src/routes/_project/p/$projectId/rank-tracking.tsx`
- 词典:`zh/routes.ts` 或按页面拆

## 不在本工作单范围(由维护者另行处理)

- **服务端错误文案审计**:35 处 `throw new Error(...)` 走 `getStandardErrorMessage` 的映射覆盖情况(客户端错误卡片已翻译 17 条;未映射的错误码需要补)
- **DataForSEO / API 数据驱动文案**:与 seoData 适配器阶段绑定
- **每路由 meta title**(目前静态 "OpenSEO")
- **FORK.md 记账**:维护者在每轮合并后统一记录

## 每轮验收

1. `pnpm ci:check` 全绿(prettier/knip/tsc/oxlint/sync-plugin-skills)
2. `pnpm test` 全绿
3. `pnpm dev`(端口 8989)→ 该 feature 页面:选 中文 显示中文、选 English 还原、刷新保持
4. 一个提交,信息:`i18n: translate <feature> pages to zh-CN`
