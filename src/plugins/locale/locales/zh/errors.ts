/**
 * zh error/feedback dictionary — user-facing error and success strings
 * (toasts, getStandardErrorMessage fallbacks, confirm dialogs). Keys are the
 * English source strings; call sites pass them through t() either as
 * fallbacks or as toast text. Merged into the zh dictionary by ../index.ts.
 */
export const errorsZh = {
  // toasts / feedback
  "Tag updated": "标签已更新",
  "Tag deleted": "标签已删除",
  "Could not update tag": "无法更新标签",
  "Could not delete tag. Detach it from all keywords and try again.":
    "无法删除标签,请先从所有关键词中移除该标签,再重试。",
  "No keywords to export": "没有可导出的关键词",
  "Could not export CSV": "无法导出 CSV",
  "Could not export to Sheets": "无法导出到 Google 表格",
  "Could not save keywords": "无法保存关键词",
  "Couldn't copy to clipboard": "无法复制到剪贴板",
  "Copied {count} keyword": "已复制 {count} 个关键词",
  "Copied {count} keywords": "已复制 {count} 个关键词",
  "Saved {count} keyword": "已保存 {count} 个关键词",
  "Saved {count} keywords": "已保存 {count} 个关键词",
  "Could not start Google sign-in": "无法开始 Google 登录",
  "Audit started!": "审计已开始!",
  "Audit deleted": "审计已删除",
  "Search Console connected": "已连接 Search Console",
  "Search Console disconnected": "已断开 Search Console",
  "A rank check is already running": "排名检查已在运行中",
  "Rank check started": "排名检查已开始",
  "Failed to start rank check": "无法开始排名检查",
  "Failed to remove keywords": "无法移除关键词",
  "Failed to add keywords": "无法添加关键词",
  "Added {count} keywords for tracking": "已添加 {count} 个关键词进行追踪",
  "Failed to save config": "无法保存配置",
  "Failed to update config": "无法更新配置",
  "Domain added for rank tracking": "已添加域名进行排名追踪",
  "Configuration updated": "配置已更新",
  "API key revoked": "API 密钥已撤销",
  "Failed to load API keys": "无法加载 API 密钥",
  "Failed to create the key": "创建密钥失败",
  "Failed to revoke the key": "撤销密钥失败",
  "Failed to load Lighthouse issues.": "无法加载 Lighthouse 问题列表。",
  "Download started": "下载已开始",
  "CSV download started": "CSV 下载已开始",
  "Failed to export payload": "导出失败",
  "Failed to copy payload": "复制失败",
  "Save failed.": "保存失败。",
  "Select at least one keyword first": "请先至少选择一个关键词",
  "Failed to load SERP data.": "无法加载 SERP 数据。",
  "Research failed.": "研究失败。",
  "Remove failed.": "移除失败。",
  "Could not update tags": "无法更新标签",
  "Could not update keyword stats.": "无法更新关键词数据。",
  "Updated tags for {count} keyword": "已更新 {count} 个关键词的标签",
  "Updated tags for {count} keywords": "已更新 {count} 个关键词的标签",
  "Updated stats for {count} keyword": "已更新 {count} 个关键词的数据",
  "Updated stats for {count} keywords": "已更新 {count} 个关键词的数据",
  "{count} keyword removed": "已移除 {count} 个关键词",
  "{count} keywords removed": "已移除 {count} 个关键词",
  "Couldn't save your changes": "无法保存更改",
  "Project context updated": "项目上下文已更新",
  "Couldn't migrate the workspaces. Try again.": "无法迁移工作区,请重试。",
  "Migrated {count} workspace into the shared workspace.":
    "已将 {count} 个工作区合并到共享工作区。",
  "Migrated {count} workspaces into the shared workspace.":
    "已将 {count} 个工作区合并到共享工作区。",
  "Could not load Ahrefs DR.": "无法加载 Ahrefs DR。",
  "Could not load AI agent setup status.": "无法加载 AI 代理设置状态。",
  "Could not load backlinks data.": "无法加载反链数据。",
  "Could not load this tab.": "无法加载此标签页。",
  "Enter a valid domain or page URL.": "请输入有效的域名或页面 URL。",
  "Unable to create account.": "无法创建账号。",
  "Google sign up is not available right now.": "暂时无法使用 Google 注册。",
  "We couldn't send the reset email.": "无法发送重置邮件。",
  "We couldn't send another email.": "无法再次发送邮件。",
  "A new email is on the way.": "新邮件正在发送。",
  "Metrics updated for {count} keywords": "已更新 {count} 个关键词的数据",
  "Failed to refresh keyword metrics": "无法刷新关键词数据",
  "No data to export": "没有可导出的数据",
  "Clipboard not available": "剪贴板不可用",
  "Could not copy to clipboard": "无法复制到剪贴板",
  "Keywords must be {max} characters or fewer.":
    "关键词不能超过 {max} 个字符。",
  "You are about to crawl {count} pages. This is okay, but it may take a while. Continue?":
    "你即将抓取 {count} 个页面。这是允许的,但可能需要一些时间。是否继续？",
  "We couldn't start checkout. Please refresh and try again.":
    "无法开始结算,请刷新后重试。",
  "Couldn't start the checkout. Please try again.": "无法开始结算,请重试。",
  "Please sign in to access your OpenSEO workspace.":
    "请登录以访问你的 OpenSEO 工作区。",
  "Copied data": "已复制数据",
  "Please complete the captcha to continue.": "请先完成验证码。",
  "Unable to create account right now. Please try again.":
    "暂时无法创建账号,请重试。",
  "Google sign in is not available right now.": "暂时无法使用 Google 登录。",
  "We couldn't send the reset email right now. Please try again.":
    "暂时无法发送重置邮件,请重试。",
  "We couldn't send another email right now. Please try again.":
    "暂时无法再次发送邮件,请重试。",
  "An unexpected error occurred. Please check server logs.":
    "发生意外错误,请检查服务器日志。",
  "We couldn't update your analytics setting.": "无法更新你的分析设置。",
  "Analytics enabled": "分析已开启",
  "Analytics disabled": "分析已关闭",
  "Use 'Check Now' to check these keywords": "使用“立即检查”来检查这些关键词",
  "Keywords copied to clipboard": "关键词已复制到剪贴板",
  "This link is no longer valid. Request a new email to keep going.":
    "此链接已失效,请重新请求一封邮件以继续。",
  "This link has expired. Request a new email to keep going.":
    "此链接已过期,请重新请求一封邮件以继续。",
  "We couldn't find this account anymore. Try creating it again.":
    "找不到此账号了,请重新创建。",
  "We couldn't confirm this email. Request a new email and try again.":
    "无法确认此邮箱,请重新请求一封邮件后再试。",
  "Verify email": "验证邮箱",
  "Email confirmation isn't available right now.": "暂时无法进行邮箱确认。",
  "We couldn't confirm your email": "无法确认你的邮箱",
  "Email confirmed": "邮箱已验证",
  "You're all set. Taking you to your account now.":
    "一切就绪,正在带你进入账号。",
  "Checking your email confirmation.": "正在检查你的邮箱确认状态。",
  "Verify your email": "验证你的邮箱",
  "Click the link we sent to {email} to verify your email.":
    "点击发送到 {email} 的链接以验证你的邮箱。",
  "Check your inbox for the link to verify your email.":
    "请查看收件箱中用于验证邮箱的链接。",
  "Redirecting you to billing so you can start a hosted subscription.":
    "正在将你重定向到账单页面以开通托管订阅。",

  // AUTH_CONFIG_MISSING details — the server passes "CODE: detail" through
  // toClientError (see src/server/lib/errors.ts), and getStandardErrorMessage
  // looks the detail up here.
  "Search Console is not configured. Set GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, and BETTER_AUTH_SECRET.":
    "Search Console 尚未配置,请设置 GOOGLE_CLIENT_ID、GOOGLE_CLIENT_SECRET 和 BETTER_AUTH_SECRET。",
  "Google Analytics is not configured. Set GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, and BETTER_AUTH_SECRET.":
    "Google Analytics 尚未配置,请设置 GOOGLE_CLIENT_ID、GOOGLE_CLIENT_SECRET 和 BETTER_AUTH_SECRET。",

  // auth config error card (src/client/components/AuthConfigErrorCard.tsx)
  "Authentication setup required": "需要完成认证设置",
  "Hosted mode requires": "托管模式需要",
  "(32+ characters),": "(32+ 字符),",
  ", and Google OAuth credentials on the deployment.":
    ",以及部署环境中的 Google OAuth 凭据。",
  "Cloudflare Access mode requires": "Cloudflare Access 模式需要",
  "(a full https URL) and": "(完整的 https URL) 和",
  "set on the deployment, with an Access application protecting this hostname.":
    "需在部署环境中设置,并有一个 Access 应用保护此主机名。",
  "Try Again": "重试",
  "Open Setup Guide": "打开设置指南",

  // SERP location combobox (src/client/components/SerpLocationCombobox.tsx)
  "Unable to load locations": "无法加载地点",
  'No locations found for "{query}"': "没有找到与 “{query}” 匹配的地点",
} satisfies Record<string, string>;
