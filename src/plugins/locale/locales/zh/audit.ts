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
  "Failed to load the audit results": "无法加载审计结果",
  "Failed to load audit history": "无法加载审计历史",
  "Site audit · Started {date}": "站点审计 · 开始时间：{date}",
  "This audit stopped before it crawled any pages.":
    "此次审计尚未抓取任何页面就已停止。",
  "This site's bot protection blocked our crawler.":
    "此网站的机器人防护拦截了我们的爬虫。",
  "This audit stopped early after {count} page.":
    "此次审计抓取 {count} 个页面后提前停止。",
  "This audit stopped early after {count} pages.":
    "此次审计抓取 {count} 个页面后提前停止。",
  "The results below cover everything crawled before it stopped. Run a new audit to try again, or email":
    "以下结果涵盖停止前抓取的全部内容。请重新审计，或发送邮件至",
  "{done} / {total} checks": "{done} / {total} 项检查",
  "{done} / {total} pages": "{done} / {total} 个页面",
  "Enter any value from {min} to {max}": "请输入 {min} 到 {max} 之间的数值",
  " Audits that render JavaScript are limited to this many pages.":
    " 启用 JavaScript 渲染的审计最多支持此数量的页面。",
  "to crawl up to {count} pages.": "后最多可抓取 {count} 个页面。",
  "Loads each page in a browser before auditing it. Slower.":
    "先在浏览器中加载每个页面，再进行审计。速度较慢。",
  "Render JavaScript": "渲染 JavaScript",
  "This deployment has no browser, so rendering needs a Context.dev API key. Set":
    "当前部署没有浏览器，渲染需要 Context.dev API 密钥。请设置",
  ", restart Orca, then reload this page.": "，重启 Orca 后重新加载此页面。",
  "Start a large audit?": "开始大规模审计？",
  "Crawl result": "抓取结果",
  Read: "已读取",
  Blocked: "被拦截",
  "Rate limited": "触发限流",
  "Fetching or rendering failed, so this page was not checked for content issues.":
    "抓取或渲染失败，因此未检查此页面的内容问题。",
  Images: "图片",
  Speed: "响应时间",
  missing: "缺失",
  redirect: "重定向",
  "No pages crawled": "尚未抓取页面",
  "Some pages may need JavaScript to show their content.":
    "部分页面可能需要 JavaScript 才能显示内容。",
  "They were still loading after rendering, so we couldn't check them.":
    "渲染后这些页面仍在加载，因此未能检查。",
  "Turn on Render JavaScript and run the audit again to check them.":
    "启用“渲染 JavaScript”并重新审计，以检查这些页面。",
  "We couldn't read {count} page.": "无法读取 {count} 个页面。",
  "We couldn't read {count} pages.": "无法读取 {count} 个页面。",
  "To see them, open Pages and filter Crawl result by Failed.":
    "打开“页面”，将“抓取结果”筛选为“失败”即可查看。",
  "JavaScript rendering was enabled for this audit.":
    "此次审计已启用 JavaScript 渲染。",
  "No Lighthouse results": "暂无 Lighthouse 结果",
  A11y: "无障碍",
  "Bot protection blocked our crawler on {count} page.":
    "机器人防护在 {count} 个页面上拦截了我们的爬虫。",
  "Bot protection blocked our crawler on {count} pages.":
    "机器人防护在 {count} 个页面上拦截了我们的爬虫。",
  "The crawl stopped early because of the site’s rate limit.":
    "由于网站限流，抓取提前停止。",
  "The site rate limited us on {count} page.":
    "网站对 {count} 个页面的抓取进行了限流。",
  "The site rate limited us on {count} pages.":
    "网站对 {count} 个页面的抓取进行了限流。",
  "The requested cooldown exceeded the audit time limit, so some URLs were left unvisited. This report is incomplete. ":
    "网站要求的等待时间超过审计时限，因此部分网址未被访问，此报告不完整。 ",
  "Pages that returned 429 Too Many Requests could not be audited. ":
    "返回 429 Too Many Requests 的页面无法审计。 ",
  'Re-run the audit after the rate limit resets, or ask the site owner to allow the "Orca-Audit" crawler.':
    "请在限流解除后重新审计，或请网站所有者允许“Orca-Audit”爬虫访问。",
  "Average response time": "平均响应时间",
  "Lighthouse performance": "Lighthouse 性能",
  "Lighthouse SEO": "Lighthouse SEO",
  "Lighthouse accessibility": "Lighthouse 无障碍",
  "Starting…": "正在启动…",
  "Re-run audit": "重新审计",
  "Shopify limited this crawl despite your signature. To check that it was created for":
    "尽管已使用签名，Shopify 仍限制了此次抓取。要确认签名是否为以下域名创建：",
  ", paste it again in": "，请将其重新粘贴到",
  ". If it was, Shopify is still throttling this store: re-run the audit later or with fewer pages.":
    "。如果签名对应此域名，说明 Shopify 仍在限制此商店的抓取速度；请稍后重试，或减少审计页面数。",
  "Crawler access is saved for": "已保存以下域名的爬虫访问授权：",
  ". Re-run the audit to crawl with it.": "。请重新审计以使用该授权抓取。",
  "Your Shopify signature for this store has expired.":
    "此商店的 Shopify 签名已过期。",
  "It ran out on {date}, so requests after that went out unsigned and Shopify limited them. Signatures can't be renewed: create a fresh one in Shopify admin and paste it below to replace the stored values.":
    "签名已于 {date} 过期，此后的请求未附带签名，因此被 Shopify 限制。签名无法续期；请在 Shopify 后台创建新签名，并粘贴到下方以替换已保存的值。",
  "Shopify limited this crawl.": "Shopify 限制了此次抓取。",
  "Shopify rate-limits crawlers it hasn't authorized, so parts of this report are missing. If you own this store, authorizing Orca takes about a minute.":
    "Shopify 会对未经授权的爬虫限流，因此此报告缺少部分内容。如果你是店主，为 Orca 授权大约需要一分钟。",
  "In Shopify admin, go to Online Store → Preferences → Crawler access and click Create signature.":
    "在 Shopify 后台，前往在线商店（Online Store）→ 偏好设置（Preferences）→ 爬虫访问（Crawler access），点击创建签名（Create signature）。",
  "Pick the domain": "选择域名",
  "and an expiry (up to 3 months).": "并设置有效期（最长 3 个月）。",
  "Paste the two values below.": "将这两个值粘贴到下方。",
  "Shopify's crawler access guide": "Shopify 爬虫访问指南",
  "Turn on Render JavaScript and run the audit again. To avoid the extra cost, use a free desktop crawler like":
    "启用“渲染 JavaScript”后重新审计。如需避免额外费用，可使用免费的桌面爬虫，例如",
  "Rendering couldn't get past it. ": "启用渲染后仍未能通过防护。 ",
  "Try a free desktop crawler like": "可尝试免费的桌面爬虫，例如",
  "Rendering up to {pages} pages needs {cost} of credits available. Lower the page limit or add credits.":
    "渲染最多 {pages} 个页面需要 {cost} 的可用额度。请降低页面上限或增加额度。",
  "Estimated {low} to {high} for up to {pages} pages. Sites with aggressive bot detection need our more capable renderer and cost more.":
    "渲染最多 {pages} 个页面预计花费 {low} 至 {high}。机器人检测严格的网站需要使用能力更强的渲染器，费用会更高。",
  desktop: "桌面端",
  mobile: "移动端",
  "The site returned a bot challenge or access denial (e.g. a Cloudflare challenge or a 403) instead of the page. We report this honestly rather than pretending the page is broken — but it means this page could not be audited, and other crawlers like search engines may face similar friction.":
    "网站返回了机器人验证或访问拒绝（例如 Cloudflare 验证或 403），而非页面内容。我们如实报告此情况，不将其误报为页面损坏。这意味着无法审计该页面，搜索引擎等其他爬虫也可能遇到类似阻碍。",
  'If you own this site, allowlist the "OpenSEO-Audit" user agent in your WAF/bot-protection settings (on Cloudflare: a WAF custom rule that skips bot protection when the user agent contains "OpenSEO-Audit"; on some free tiers you may need to relax bot protection). Then re-run the audit. On Shopify, use Crawler access instead (Online Store → Preferences → Crawler access) and paste the signature into OpenSEO under Settings → Crawler access. How to allow and verify the crawler: https://openseo.so/docs/crawler':
    "如果你拥有此网站，请在 WAF 或机器人防护设置中放行“OpenSEO-Audit”用户代理。在 Cloudflare 中，可创建 WAF 自定义规则：当用户代理包含“OpenSEO-Audit”时跳过机器人防护；部分免费套餐可能需要放宽防护。然后重新审计。Shopify 商店请使用“在线商店 → 偏好设置 → 爬虫访问”，并将签名粘贴到 Orca 的“设置 → 爬虫访问”中。放行与验证方法：https://openseo.so/docs/crawler",
  "Content may require JavaScript": "内容可能需要 JavaScript",
  "The page's HTML contains a JavaScript app container with very little readable content and no headings, links, or images. The page may load its content in the browser, or it was still loading when rendered. Content checks were skipped because this HTML may not represent the complete page.":
    "页面 HTML 包含 JavaScript 应用容器，但可读文本很少，且没有标题、链接或图片。页面内容可能需要在浏览器中加载，或在渲染时仍未加载完成。由于这份 HTML 可能不是完整页面，已跳过内容检查。",
  'If this audit did not render JavaScript, start a new audit with "Render JavaScript" enabled to check the loaded content. For reliable crawling, serve important content and navigation in the initial HTML using server-side rendering or prerendering. This warning does not prove that search engines cannot index the page.':
    "如果此次审计未渲染 JavaScript，请启用“渲染 JavaScript”后重新审计，以检查加载完成后的内容。为确保可靠抓取，请通过服务端渲染或预渲染，在初始 HTML 中提供重要内容和导航。此警告并不证明搜索引擎无法索引该页面。",
  "Rate limited (429)": "触发限流（429）",
  "The server answered 429 Too Many Requests, so this page could not be audited. The crawler paused for the server's Retry-After and tried the page once more before moving on.":
    "服务器返回了 429 Too Many Requests，因此无法审计此页面。爬虫已按服务器的 Retry-After 要求等待，并重试了一次。",
  'Raise the rate limit for crawlers, or allowlist the "OpenSEO-Audit" user agent in your rate-limiting rules (on Cloudflare: a rate-limiting rule exception matching that user agent). Then re-run the audit. Re-running with fewer pages also helps if the limit is strict. On Shopify, use Crawler access instead (Online Store → Preferences → Crawler access) and paste the signature into OpenSEO under Settings → Crawler access. How to allow and verify the crawler: https://openseo.so/docs/crawler':
    "请提高对爬虫的速率限制，或在限流规则中放行“OpenSEO-Audit”用户代理。在 Cloudflare 中，可添加匹配该用户代理的限流规则例外，然后重新审计。如果限流严格，也可减少审计页面数后重试。Shopify 商店请使用“在线商店 → 偏好设置 → 爬虫访问”，并将签名粘贴到 Orca 的“设置 → 爬虫访问”中。放行与验证方法：https://openseo.so/docs/crawler",
  "Crawl stopped early: rate limit": "抓取提前停止：触发限流",
  "The site refused several pages in a row with 429 Too Many Requests, or kept the crawler waiting for too long, so we stopped requesting pages. This report is incomplete; URLs we did not fetch are not recorded as broken or rate limited.":
    "网站连续返回 429 Too Many Requests，或等待时间过长，因此我们停止了页面请求。此报告不完整；未抓取的网址不会被记为损坏或触发限流。",
  "Re-run the audit after the site's rate limit resets, or ask the site owner to allow the OpenSEO-Audit crawler (https://openseo.so/docs/crawler). On Shopify, use Crawler access instead (Online Store → Preferences → Crawler access) and paste the signature into OpenSEO under Settings → Crawler access.":
    "请在网站限流解除后重新审计，或请网站所有者允许 OpenSEO-Audit 爬虫访问。Shopify 商店请使用“在线商店 → 偏好设置 → 爬虫访问”，并将签名粘贴到 Orca 的“设置 → 爬虫访问”中。放行与验证方法：https://openseo.so/docs/crawler",
  'Add descriptive alt text to meaningful images; use an empty alt (alt="") only for purely decorative ones.':
    '为有意义的图片添加描述性替代文本；仅对纯装饰性图片使用空 alt 属性（alt=""）。',
  "Costs up to {cost}.": "费用最高 {cost}。",
  "Sites that block our browser need an advanced renderer. If the cost is higher than expected, it will stop.":
    "阻止浏览器访问的网站需要高级渲染服务。费用超出预估时将停止。",
  "Crawl stopped early: time limit": "抓取提前停止：达到时限",
  "Audits that render JavaScript stop crawling after 22 hours, and this one reached that limit. This report is incomplete; URLs we did not fetch are not recorded as broken.":
    "启用 JavaScript 渲染的审计会在 22 小时后停止抓取，本次已达到时限。此报告不完整；未抓取的网址不会被记为损坏。",
  "Re-run the audit with a lower page limit, or without Render JavaScript if the site's content and links are in its HTML. Rendering is billed only for pages actually rendered.":
    "请降低页面上限后重新审计；如果网页内容和链接已包含在 HTML 中，也可以关闭 JavaScript 渲染。仅对实际渲染的页面计费。",
  "Crawl stopped early: cost limit reached": "抓取提前停止：达到费用上限",
  "Many pages on this site needed our advanced renderer, so the audit reached its cost limit and stopped. You were only charged for the pages we rendered.":
    "该网站有大量页面需要高级渲染服务，审计已达到费用上限并停止。仅对已渲染的页面计费。",
  "If the site doesn't need JavaScript to show its content, re-run with Render JavaScript off.":
    "如果网站无需 JavaScript 即可展示内容，请关闭 JavaScript 渲染后重新审计。",
} satisfies Record<string, string>;
