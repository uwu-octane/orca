/**
 * zh shell dictionary — the key set is the source of truth for the shell
 * scope. Keys are the English source strings, so a lookup miss IS the
 * English fallback (there is no separate en dictionary). Deep feature pages
 * stay untranslated in this phase; add their keys here as they are covered.
 *
 * Static `t("literal")` calls are type-checked against ShellKey (see t.ts
 * overloads); dynamic call sites (nav labels, error messages) are covered
 * by tests instead. Merged into the zh dictionary by ../index.ts.
 */
export const shellZh = {
  // navigation (src/client/navigation/items.ts)
  "AI & MCP": "AI 与 MCP",
  Backlinks: "反链",
  "Brand Lookup": "品牌查询",
  Connect: "连接",
  Dashboard: "仪表盘",
  "Domain Overview": "域名概览",
  "GSC Insights": "GSC 洞察",
  "Keyword Research": "关键词研究",
  "My Site": "我的站点",
  Overview: "概览",
  "Prompt Explorer": "提示词探索",
  "Rank Tracking": "排名追踪",
  Research: "研究",
  "Saved Keywords": "已存关键词",
  "Site Audit": "站点审计",

  // sidebar / user menu
  Settings: "设置",
  Billing: "账单",
  "Sign out": "退出登录",
  "Help & Community": "帮助与社区",
  Browse: "浏览",
  Chat: "对话",

  // settings page sections
  Appearance: "外观",
  Analytics: "分析",
  Language: "语言",

  // theme preferences
  Theme: "主题",
  System: "跟随系统",
  Light: "浅色",
  Dark: "深色",

  // shared table chrome
  "Rows per page": "每页行数",
  "Page {page} of {totalPages}": "第 {page} / {totalPages} 页",
  "Page {page}": "第 {page} 页",
  "Next page": "下一页",
  "Previous page": "上一页",

  // shell / modals
  "Close sidebar": "关闭侧边栏",
  "Open account menu": "打开账户菜单",
  Dismiss: "忽略",
  "Open setup guide": "打开设置指南",
  "Forgot password?": "忘记密码？",
  "Create account": "创建账号",
  "Continue with email": "使用邮箱继续",
  "Opening Google...": "正在打开 Google…",
  "Something went wrong. Please try again.": "出错了,请重试。",

  // auth pages (exact strings from _auth.* routes)
  "Sign in": "登录",
  "Signing in...": "登录中…",
  "Email address...": "邮箱地址…",
  "Password...": "密码…",
  "Continue with Google": "使用 Google 继续",
  "Enter a valid email address.": "请输入有效的邮箱地址。",
  "Enter your password.": "请输入密码。",
  "We couldn't sign you in.": "无法登录。",
  "Unable to sign in right now. Please try again.": "暂时无法登录,请稍后再试。",

  // standard error messages (src/client/lib/error-messages.ts)
  "Please sign in and try again.": "请登录后重试。",
  "OpenSEO auth is not configured. Follow the README setup steps for Cloudflare Access.":
    "OpenSEO 认证未配置,请按 README 中的 Cloudflare Access 设置步骤操作。",
  "An active hosted subscription is required before you can use OpenSEO.":
    "使用 OpenSEO 前需要有效的托管订阅。",
  "You've run out of credits. Add more credits or upgrade your plan to continue.":
    "额度已用完,请充值或升级套餐后继续。",
  "You do not have access to this resource.": "你没有访问此资源的权限。",
  "The requested resource was not found.": "请求的资源不存在。",
  "Free plan audits are limited to {max} pages. Upgrade to run larger audits.":
    "免费方案的审计上限为 {max} 页,升级套餐后可运行更大规模的审计。",
  "You've reached audit capacity for your account. Delete old audits from your projects to start a new one.":
    "账户的审计额度已达上限,请删除项目中的旧审计后再新建。",
  "You already have an audit running. Wait for it to finish or delete it before starting another.":
    "已有一个审计正在运行,请等待其完成或删除后再新建。",
  "Please check your input and try again.": "请检查输入后重试。",
  "This crawl target is blocked by security policy.":
    "该抓取目标被安全策略阻止。",
  "The connected DataForSEO account has a billing or balance issue.":
    "关联的 DataForSEO 账户存在计费或余额问题。",
  "DataForSEO rejected the API key. Check that DATAFORSEO_API_KEY is the base64 of your DataForSEO login:password.":
    "DataForSEO 拒绝了 API 密钥,请确认 DATAFORSEO_API_KEY 是 login:password 的 base64 编码。",
  "Too many requests. Please wait and try again.": "请求过于频繁,请稍后重试。",
  "The data provider is temporarily unavailable. Please retry in a moment.":
    "数据服务暂时不可用,请稍后重试。",
  "This request conflicts with existing data.": "请求与现有数据冲突。",
  "An unexpected error occurred. Please check server logs and try again.":
    "发生未知错误,请查看服务器日志后重试。",

  // app shell (src/client/layout/AppShell.tsx, AppShellParts.tsx)
  "Toggle sidebar": "切换侧边栏",
  "One quick setup step": "一个快速设置步骤",
  "Add your DataForSEO API key to start using OpenSEO.":
    "添加你的 DataForSEO API 密钥即可开始使用 OpenSEO。",
  "Setup needed: add your DataForSEO API key to use OpenSEO features. See the quick steps on the":
    "需要设置:添加 DataForSEO API 密钥即可使用 OpenSEO 功能。前往",
  "We could not verify your DataForSEO setup. If features are not working, check the setup steps on the":
    "无法验证你的 DataForSEO 设置。如果功能无法使用,请查看",
  "help page": "帮助页面",
  ".": "。",

  // chat message actions (src/client/components/chat/ChatMessage.tsx)
  "Save & resend": "保存并重新发送",
  "Copy message": "复制消息",
  Copy: "复制",
  "Edit message": "编辑消息",
  "Edit and resend": "编辑并重新发送",
  "Undo from this message": "从这条消息撤销",
  "Undo — remove this message and everything after it":
    "撤销 — 移除这条消息及其后的所有内容",
  "Thinking…": "思考中…",
  "Thought process": "思考过程",
  "Activating {skill}": "正在启动 {skill}",
  "Skill: {skill}": "技能:{skill}",

  // table chrome (src/client/components/table/**)
  Close: "关闭",
  "Open a new Google Sheet and paste to fill it.":
    "打开一个新的 Google 表格,粘贴即可填充。",
  "Open new Google Sheet": "打开新的 Google 表格",
  "Copied {count} row to your clipboard": "已将 {count} 行复制到剪贴板",
  "Copied {count} rows to your clipboard": "已将 {count} 行复制到剪贴板",
  "Bulk actions": "批量操作",
  "Clear selection": "清除选择",
  selected: "已选择",
  Export: "导出",
  "Select all rows": "全选所有行",
  "Select row": "选择行",

  // location pickers
  "Select country": "选择国家/地区",
  "Search countries": "搜索国家/地区",
  "No countries match “{query}”": "没有匹配 “{query}” 的国家/地区",
} satisfies Record<string, string>;
