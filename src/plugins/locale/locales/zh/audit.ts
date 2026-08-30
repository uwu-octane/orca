export const auditZh = {
  "No audits yet": "还没有审计",
  "Previous Audits": "之前的审计",
  Date: "日期",
  URL: "URL",
  Status: "状态",
  Pages: "页面",
  Lighthouse: "Lighthouse",
  Yes: "是",
  View: "查看",
  "Audit actions": "审计操作",
  "Delete audit": "删除审计",
  "Start New Audit": "开始新审计",
  "Starting...": "启动中...",
  "Start Audit": "开始审计",
  "Crawl limit": "抓取上限",
  "Max pages": "最大页面数",
  "Enter any value from {min} to {max}.": "请输入 {min} 到 {max} 之间的数值。",
  Upgrade: "升级",
  "to crawl up to {pages} pages.": "以抓取最多 {pages} 个页面。",
  "Lighthouse measures the performance of your pages and identifies issues.":
    "Lighthouse 会衡量页面性能并识别问题。",
  "Include Lighthouse": "包含 Lighthouse",
  "We choose a sample of 20 pages to audit, removing pages from duplicate templates.":
    "我们会抽取 20 个页面进行审计,并去除同模板的重复页面。",
  "Please enter a URL.": "请输入 URL。",
  "Failed to start audit": "启动审计失败",
  "No issues recorded for this audit.": "此审计没有记录问题。",
  "Either the site is in great shape, or this audit ran before issue checks existed — run a new audit to get the full report.":
    "网站可能运行良好,也可能此审计运行时还没有问题检查,请运行新的审计以获取完整报告。",
  Critical: "严重",
  Warning: "警告",
  Info: "信息",
  "{count} {unit}": "{count} 个{unit}",
  page: "页面",
  pages: "页面",
  "How to fix:": "修复方法:",
  "…and {count} more — export the issues CSV for the full list.":
    "……还有 {count} 个,请导出问题 CSV 查看完整列表。",
  Search: "搜索",
  "URL, title, meta": "URL、标题、元数据",
  All: "全部",
  "Alt text": "替代文本",
  Missing: "缺失",
  "Missing alt": "缺失替代文本",
  "No missing alt": "无缺失替代文本",
  Words: "字数",
  "Speed ms": "速度 (毫秒)",
  Device: "设备",
  Desktop: "桌面端",
  Mobile: "移动端",
  OK: "正常",
  Failed: "失败",
  "Max LCP s": "最大 LCP (秒)",
  Perf: "性能",
  SEO: "SEO",
  "Toggle filters": "切换筛选",
  Filters: "筛选",
  "{count} of {total}": "{count} / {total}",
  Min: "最小值",
  Max: "最大值",
  "No pages match these filters.": "没有页面符合这些筛选条件。",
  "No performance results match these filters.":
    "没有性能结果符合这些筛选条件。",
  "We were blocked on {count} page.": "有 {count} 个页面被阻止抓取。",
  "We were blocked on {count} pages.": "有 {count} 个页面被阻止抓取。",
  "The site's bot protection challenged our crawler, so those pages couldn't be audited. We don't have a workaround for this yet. Desktop crawlers run from your own machine and usually get past it: try ":
    "网站的机器人防护对我们的爬虫发起了验证,这些页面因此无法被审计。我们目前还没有解决办法。桌面爬虫在你的本机运行,通常可以绕过:试试 ",
  " (free, open source) or ": " (免费、开源)或 ",
  " (free up to 500 URLs).": " (免费,最多 500 个 URL)。",
  "Issues ({count})": "问题({count})",
  "Pages ({count})": "页面({count})",
  "Performance ({count})": "性能({count})",
  "Pages crawled": "抓取页面数",
  "Issues found": "发现问题数",
  "Avg response": "平均响应时间",
  "Lighthouse tests": "Lighthouse 测试数",
  "Avg Lighthouse perf": "Lighthouse 平均性能分",
  "Avg Lighthouse SEO": "Lighthouse 平均 SEO 分",
  "Avg Lighthouse a11y": "Lighthouse 平均无障碍分",
  "Lighthouse failures": "Lighthouse 失败数",
  "View issues": "查看问题",
  ok: "正常",
  "Lighthouse returned no category scores": "Lighthouse 未返回任何类别分数",

  // Issue-type registry (src/shared/audit-issues.ts) — titles, explanations,
  // and how-to-fix copy rendered by IssuesView.
  "Crawler was blocked": "爬虫被拦截",
  "The site returned a bot challenge or access denial (e.g. a Cloudflare challenge, 403, or 429) instead of the page. We report this honestly rather than pretending the page is broken — but it means this page could not be audited, and other crawlers like search engines may face similar friction.":
    "该网站返回了机器人验证或访问拒绝(例如 Cloudflare 验证、403 或 429),而不是页面本身。我们会如实报告,而不是假装页面损坏——但这意味着此页面无法被审计,搜索引擎等其他爬虫也可能遇到类似的阻碍。",
  "Server error (5xx)": "服务器错误 (5xx)",
  "The page returned a 5xx server error. Search engines that repeatedly see server errors will crawl the site less and may drop the page from the index.":
    "页面返回了 5xx 服务器错误。反复出现服务器错误的网站会被搜索引擎减少抓取,页面甚至可能从索引中移除。",
  "Check the server logs for this URL and fix the underlying error. If the page is gone, return a 404/410 or redirect it to a relevant page instead of erroring.":
    "检查此 URL 的服务器日志并修复底层错误。如果页面已下线,请返回 404/410 或将其重定向到相关页面,而不是继续报错。",
  "Broken internal link": "内部链接失效",
  "This page links to an internal URL that returns an error status (4xx/5xx). Broken links waste crawl budget, leak link equity, and frustrate users — they are among the most common and most damaging technical SEO issues.":
    "此页面链接到的内部 URL 返回错误状态(4xx/5xx)。失效链接浪费抓取配额、流失链接权重,并让用户受挫——这是最常见也最具破坏性的技术 SEO 问题之一。",
  "Update the link to point at the correct live URL, or remove it. If the target was moved, prefer linking directly to the new URL rather than relying on a redirect.":
    "将链接更新为指向正确的有效 URL,或直接移除。如果目标已迁移,建议直接链接到新 URL,而不是依赖重定向。",
  "Missing title tag": "缺少标题标签",
  "The page has no <title>. The title is the strongest on-page relevance signal and the headline shown in search results; without it search engines generate one themselves, usually badly.":
    "页面没有 <title>。标题是最强的页面相关性信号,也是搜索结果中显示的标题;没有它,搜索引擎会自行生成,通常效果不佳。",
  "Add a unique, descriptive <title> of roughly 50–60 characters that includes the page's primary topic.":
    "添加一个约 50–60 个字符、唯一且具有描述性的 <title>,并包含页面的主要主题。",
  "Page returns an error (4xx)": "页面返回错误 (4xx)",
  "This crawled URL returned a client error (e.g. 404). If it is referenced from your sitemap or other pages, crawlers keep wasting requests on it.":
    "此被抓取的 URL 返回客户端错误(例如 404)。如果它被站点地图或其他页面引用,爬虫会持续浪费请求。",
  "If the page should exist, restore it. If it is intentionally gone, remove it from the sitemap and internal links, and consider a 301 redirect to the closest live page.":
    "如果页面应存在,请恢复它。如果是刻意移除,请从站点地图和内部链接中删除,并考虑 301 重定向到最接近的有效页面。",
  "Duplicate title": "标题重复",
  "Multiple pages share the same title tag. Search engines use titles to differentiate pages; duplicates make pages compete with each other and depress click-through rates.":
    "多个页面共用同一个标题标签。搜索引擎用标题区分页面;重复标题会让页面相互竞争,并拉低点击率。",
  "Write a unique title for each page describing its specific content. For templated pages, include the distinguishing attribute (name, category, location) in the template.":
    "为每个页面编写描述其具体内容的唯一标题。对于模板化页面,请在模板中包含区分属性(名称、类别、地区)。",
  "Duplicate meta description": "Meta 描述重复",
  "Multiple pages share the same meta description, so search results show identical snippets and users cannot tell the pages apart.":
    "多个页面共用同一个 meta 描述,导致搜索结果展示完全相同的摘要,用户无法区分页面。",
  "Write a unique meta description per page, or remove the duplicated one entirely — search engines will generate a snippet from page content, which beats a wrong duplicate.":
    "为每个页面编写唯一的 meta 描述,或彻底删除重复项——搜索引擎会根据页面内容生成摘要,这比错误的重复项更好。",
  "Duplicate page content": "页面内容重复",
  "Two or more URLs serve byte-identical visible text. Search engines pick one version to index and ignore the rest, and ranking signals get split across the duplicates.":
    "两个或多个 URL 提供逐字节相同的可见文本。搜索引擎只选择一个版本进行索引并忽略其余部分,排名信号也会在重复页面间被分散。",
  "Consolidate duplicates: pick the canonical URL, add rel=canonical from the others, and 301-redirect duplicate URLs where possible (common causes: trailing-slash variants, URL parameters, http/https or www variants).":
    "合并重复项:选定规范 URL,为其他页面添加 rel=canonical,并在可能的情况下 301 重定向重复 URL(常见原因:结尾斜杠变体、URL 参数、http/https 或 www 变体)。",
  "Missing meta description": "缺少 Meta 描述",
  "The page has no meta description. Search engines will assemble a snippet from page text, which is often less compelling and hurts click-through rate.":
    "页面没有 meta 描述。搜索引擎会从页面文本拼凑摘要,这通常说服力较弱,并损害点击率。",
  "Add a meta description of roughly 70–160 characters that summarizes the page and gives a reason to click.":
    "添加约 70–160 个字符的 meta 描述,概括页面内容并给出点击理由。",
  "Missing H1 heading": "缺少 H1 标题",
  "The page has no H1. The H1 tells users and search engines what the page is about; pages without one tend to have weaker topical clarity.":
    "页面没有 H1。H1 向用户和搜索引擎说明页面主题;没有 H1 的页面主题清晰度往往较弱。",
  "Add a single H1 that states the page's main topic, consistent with the title tag.":
    "添加一个与标题标签一致的 H1,说明页面的主要主题。",
  "Multiple H1 headings": "存在多个 H1 标题",
  "The page has more than one H1, which dilutes the main-topic signal and usually indicates a templating mistake (e.g. a logo and a headline both marked up as H1).":
    "页面有多个 H1,这会稀释主题信号,通常表明模板设置有误(例如徽标和标题都被标记为 H1)。",
  "Keep one H1 for the page's main heading and demote the others to H2/H3 (or unstyled elements for non-headings like logos).":
    "为页面主标题保留一个 H1,将其余降级为 H2/H3(非标题元素如徽标可使用无样式元素)。",
  "Redirect chain": "重定向链",
  "Reaching the final page requires two or more consecutive redirects. Each hop adds latency, leaks link equity, and burns crawl budget; long chains may not be followed at all.":
    "到达最终页面需要两次或更多连续重定向。每次跳转都会增加延迟、流失链接权重并消耗抓取配额;过长的链甚至可能完全不被跟随。",
  "Point the first URL (and any internal links) directly at the final destination so there is at most one redirect.":
    "将第一个 URL(及所有内部链接)直接指向最终目标,使重定向至多只有一次。",
  "Redirect loop": "重定向循环",
  "This redirect eventually points back to itself, so the URL never resolves. Browsers and crawlers give up with an error.":
    "该重定向最终指向自身,导致 URL 永远无法解析。浏览器和爬虫会报错放弃。",
  "Trace the redirect rules for this URL and break the cycle so the chain terminates at a real 200 page.":
    "追踪此 URL 的重定向规则并打破循环,使链终止于真实的 200 页面。",
  "Conflicting canonical signals": "规范信号冲突",
  "The page declares different canonical URLs in its HTML <link rel=canonical> and its HTTP Link header. When signals conflict, search engines ignore both and choose their own canonical.":
    "页面在 HTML <link rel=canonical> 和 HTTP Link 头中声明了不同的规范 URL。当信号冲突时,搜索引擎会忽略两者并自行选择规范 URL。",
  "Pick one canonical URL and declare it in exactly one place (HTML head is the most common); remove or align the other declaration.":
    "选择一个规范 URL,并只在一处声明(最常见的是 HTML head);移除或对齐另一处声明。",
  "Thin content": "内容单薄",
  "The page has very little visible text. Thin pages rarely rank, can drag down sitewide quality assessments, and (if the site renders client-side) may indicate content invisible to plain-HTML crawlers.":
    "页面可见文本非常少。内容单薄的页面很难获得排名,还可能拖累全站质量评估;(如果站点采用客户端渲染)也可能表明存在纯 HTML 爬虫看不到的内容。",
  "Either expand the page with genuinely useful content, noindex it, or consolidate it into a stronger page. If the content exists but is rendered by JavaScript, ensure it is server-rendered or pre-rendered.":
    "要么用真正有用的内容扩充页面,要么对其设置 noindex,要么合并到更优质的页面。如果内容存在但由 JavaScript 渲染,请确保采用服务端渲染或预渲染。",
  "Images missing alt text": "图片缺少替代文本",
  "One or more images on the page lack alt attributes. Alt text is an accessibility requirement and the main way search engines understand images.":
    "页面上一张或多张图片缺少 alt 属性。替代文本是无障碍访问的要求,也是搜索引擎理解图片的主要方式。",
  "Orphan page": "孤立页面",
  "No crawled page links to this URL — it was only discoverable via the sitemap. Pages without internal links receive little crawl attention and no internal link equity, and users can't find them by browsing.":
    "没有被抓取的页面链接到此 URL——它只能通过站点地图被发现。没有内部链接的页面很少被爬虫关注,也得不到内部链接权重,用户无法通过浏览找到它们。",
  "Link to this page from relevant pages (navigation, related content, hub pages), or remove it from the sitemap if it shouldn't be indexed.":
    "从相关页面(导航、相关内容、枢纽页)链接到此页面;如果不该被索引,请将其从站点地图中移除。",
  "Page has no outgoing links": "页面没有出站链接",
  "The page contains no links at all — a dead end. Link equity that flows into it stops there, crawlers have nowhere to go next, and users have to reach for the back button.":
    "页面完全没有任何链接——这是一条死胡同。流入的链接权重到此为止,爬虫无处可去,用户只能点击返回按钮。",
  "Add links to related pages, the parent category, or the homepage. If the page's navigation is rendered by JavaScript, make sure it also exists in the server-rendered HTML.":
    "添加指向相关页面、父级类别或首页的链接。如果页面导航由 JavaScript 渲染,请确保服务端渲染的 HTML 中也存在这些链接。",
  "Title too long": "标题过长",
  "The title exceeds ~60 characters, so search results will truncate it and the ending may be cut off mid-phrase.":
    "标题超过约 60 个字符,搜索结果会将其截断,结尾可能被切断。",
  "Shorten the title to roughly 50–60 characters, front-loading the most important words.":
    "将标题缩短至约 50–60 个字符,并把最重要的词放在前面。",
  "Title too short": "标题过短",
  "The title is under ~10 characters, which is usually too generic to describe the page or attract clicks.":
    "标题少于约 10 个字符,通常过于笼统,无法描述页面或吸引点击。",
  "Expand the title into a descriptive phrase (roughly 30–60 characters) that states what the page offers.":
    "将标题扩展为描述性短语(约 30–60 个字符),说明页面提供的内容。",
  "Meta description too long": "Meta 描述过长",
  "The meta description exceeds ~160 characters, so search engines will truncate the snippet.":
    "meta 描述超过约 160 个字符,搜索引擎会截断摘要。",
  "Trim the description to roughly 70–160 characters while keeping the core message and call to action.":
    "将描述精简至约 70–160 个字符,同时保留核心信息和行动号召。",
  "Meta description too short": "Meta 描述过短",
  "The meta description is under ~70 characters. Short descriptions waste the snippet space search results give you, and search engines often ignore them in favor of text pulled from the page.":
    "meta 描述少于约 70 个字符。过短的描述浪费了搜索结果给出的摘要空间,搜索引擎也常常忽略它们,转而采用页面提取的文本。",
  "Expand the description to roughly 70–160 characters that summarize the page and give a reason to click.":
    "将描述扩展至约 70–160 个字符,概括页面内容并给出点击理由。",
  "Heading levels skip": "标题层级跳跃",
  "The heading hierarchy skips levels (e.g. an H4 directly after an H2). This weakens document structure for accessibility tools and content parsing.":
    "标题层级跳级(例如 H2 之后直接是 H4)。这会削弱无障碍工具和内容解析对文档结构的理解。",
  "Adjust heading levels so they descend one step at a time (H1 → H2 → H3) without skipping.":
    "调整标题层级,使其逐级下降(H1 → H2 → H3),不要跳级。",
  "Slow server response": "服务器响应缓慢",
  "The HTML response took over 1.5 seconds. Slow time-to-first-byte drags down every downstream performance metric and reduces crawl rate on large sites.":
    "HTML 响应耗时超过 1.5 秒。缓慢的首字节时间会拖累所有下游性能指标,并在大型站点上降低抓取频率。",
  "Investigate server/database time and caching for this route; serving cached or statically generated HTML usually fixes it.":
    "调查此路由的服务器/数据库耗时和缓存;提供缓存或静态生成的 HTML 通常可以解决。",
  "Page is noindex": "页面为 noindex",
  "The page asks search engines not to index it (via robots meta tag or X-Robots-Tag header). That's often intentional — this is a heads-up, not an error.":
    "页面要求搜索引擎不要索引它(通过 robots meta 标签或 X-Robots-Tag 头)。这通常是刻意的——这是一个提醒,而不是错误。",
  "If this page should rank, remove the noindex directive. If it's intentional (admin, thank-you, filter pages), no action is needed.":
    "如果此页面需要参与排名,请移除 noindex 指令。如果是刻意设置(管理页、感谢页、筛选页),则无需操作。",
  "Canonicalized to another URL": "被规范到其他 URL",
  "The page declares a different URL as its canonical, telling search engines to index that URL instead. Fine when intentional (parameter pages, syndication) — a problem if this page was meant to rank.":
    "页面将另一个 URL 声明为规范 URL,告诉搜索引擎索引那个地址。刻意设置时没有问题(参数页、联合供稿)——但如果此页面本应参与排名,这就是问题。",
  "If this page should rank on its own, set its canonical to itself. Otherwise no action is needed.":
    "如果此页面应独立参与排名,请将其规范 URL 设置为自身。否则无需操作。",
  "Page is deep in the site structure": "页面位于网站结构深处",
  "The page is 5+ clicks from the homepage. Deep pages get crawled less often and receive less link equity.":
    "页面距离首页需要 5 次以上点击。深层页面被爬取频率更低,获得的链接权重也更少。",
  "Add links from higher-level pages (hubs, category pages, navigation) to flatten the path to this page.":
    "从更高级别的页面(枢纽页、类别页、导航)添加链接,以缩短到达此页面的路径。",
} satisfies Record<string, string>;
