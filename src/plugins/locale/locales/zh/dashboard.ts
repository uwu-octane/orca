export const dashboardZh = {
  "What site are you working on?": "你正在处理哪个网站？",
  "Set your project's domain and every card on this page starts working for it — backlinks and audits.":
    "设置项目域名后,本页的每张卡片(反链、审计等)都会基于该域名开始工作。",
  Save: "保存",
  "Connect your AI agent": "连接你的 AI 代理",
  "OpenSEO is built to be used from agents like Claude. Connect once, then ask it to use OpenSEO to help build your SEO strategy.":
    "OpenSEO 专为 Claude 等代理打造。连接一次,然后让它使用 OpenSEO 帮助制定 SEO 策略。",
  "Show me how": "查看方法",
  "Connect Search Console": "连接 Search Console",
  "Your real queries and clicks, straight from Google.":
    "来自 Google 的真实查询和点击数据。",
  Connect: "连接",
  "Size up a competitor": "了解竞争对手",
  "Paste a competitor's domain to see what they rank for and who links to them.":
    "粘贴竞争对手的域名,查看他们排名的关键词,以及有哪些网站链接到他们。",
  "Open domain lookup": "打开域名查询",
  "Couldn't save the domain. Try again.": "无法保存域名,请重试。",
  "Onboarding checklist": "入门清单",
  "Previous step": "上一步",
  "Next step": "下一步",
  Done: "完成",
  "Your site's domain": "你的网站域名",
  Dashboard: "仪表盘",

  // MCP activation card (src/client/features/dashboard/McpConnectCard.tsx)
  Connected: "已连接",
  "I already connected": "我已连接",
  "Your agent is connected. Try asking it:": "你的代理已连接。试试这样问:",
  "Prompt copied": "提示词已复制",
  "Waiting for your first call — this card disappears once your agent talks to OpenSEO.":
    "等待你的首次调用 — 一旦你的代理与 OpenSEO 对话,这张卡片就会消失。",
  "OpenSEO is designed to give your AI agent the data it needs to build a great SEO strategy and help you execute it.":
    "OpenSEO 旨在为你的 AI 代理提供制定出色 SEO 策略所需的数据,并协助你执行。",
  "This way you aren't limited on “AI credits”.":
    "这样你就不会被“AI 额度”限制。",
  "You can work with your agent to figure out what automations make sense for you and it can help you write content too.":
    "你可以与代理一起规划适合你的自动化方案,它还可以帮你撰写内容。",
  "Set up in AI & MCP": "在 AI 与 MCP 中设置",

  // GA4 card (src/client/features/dashboard/Ga4Card.tsx)
  "Organic traffic": "自然搜索流量",
  "Google Analytics · last 28 days": "Google Analytics · 最近 28 天",
  Manage: "管理",
  "Couldn't load Google Analytics data. Try again shortly.":
    "无法加载 Google Analytics 数据,请稍后重试。",
  "No organic search traffic recorded in the last 28 days yet.":
    "最近 28 天还没有记录到自然搜索流量。",
  Sessions: "会话数",
  "Active users": "活跃用户",
  "Engagement rate": "互动率",
  "Key events": "关键事件",
  "{count} sessions": "{count} 次会话",

  // Dashboard cards (src/client/features/dashboard/DashboardCards.tsx)
  "Search performance": "搜索表现",
  "Google Search Console · last 28 days": "Google Search Console · 最近 28 天",
  "More details": "更多详情",
  "Couldn't load Search Console data. Try again shortly.":
    "无法加载 Search Console 数据,请稍后重试。",
  Clicks: "点击量",
  Impressions: "展示次数",
  CTR: "CTR",
  "Avg position": "平均排名",
  "Crawl your site for broken links, missing tags and indexability problems.":
    "抓取你的网站,检查死链、缺失标签和可索引性问题。",
  "Run an audit": "运行审计",
  "Site audit · crawled {count} pages · {date}":
    "站点审计 · 已抓取 {count} 页 · {date}",
  "crawl in progress": "抓取进行中",
  "last crawl failed": "上次抓取失败",
  "No issues found — your site looks healthy.":
    "未发现问题 — 你的网站看起来很健康。",
  "{count} page": "{count} 页",
  "{count} pages": "{count} 页",
  "+ {count} more issue": "+ 还有 {count} 个问题",
  "+ {count} more issues": "+ 还有 {count} 个问题",
  "Backlink pulse": "反链脉搏",
  "Taking your first snapshot…": "正在拍摄首个快照…",
  "We'll snapshot who links to your domain — nothing to set up.":
    "我们将记录谁链接到你的域名 — 无需任何设置。",
  "Backlinks · snapshot {date}": "反链 · 快照 {date}",
  "Backlinks · snapshot {date} · refreshing…": "反链 · 快照 {date} · 刷新中…",
  "Ref. domains": "引用域名",
  "New links": "新链接",
  "Lost links": "丢失的链接",
} satisfies Record<string, string>;
