/** Settings page dictionary (API key management). */
export const settingsZh = {
  "API keys": "API 密钥",
  "Authenticate MCP clients when OAuth doesn't work":
    "在 OAuth 不可用时为 MCP 客户端提供认证",
  "Use this for remote agents like Hermes where the normal login flow doesn't work.":
    "适用于 Hermes 等远程代理,这类场景下常规登录流程无法使用。",
  "Create API key": "创建 API 密钥",
  "We couldn't load your API keys.": "无法加载你的 API 密钥。",
  Key: "密钥",
  Created: "创建时间",
  "Last used": "最后使用",
  "Unnamed key": "未命名密钥",
  Never: "从未",
  "Actions for {name}": "对 {name} 的操作",
  "API key": "API 密钥",
  'Revoke "{name}"? Clients using it will stop working.':
    '撤销"{name}"？使用该密钥的客户端将停止工作。',
  "Revoke key": "撤销密钥",
  "Copy your new API key": "复制新的 API 密钥",
  "It won't be shown again. Send it as": "密钥仅显示一次。将其作为",
  " to ": "发送至",
  "API key copied": "API 密钥已复制",
  "Creating…": "创建中…",
  "Claude Code on laptop": "笔记本电脑上的 Claude Code",

  // analytics opt-out + self-hosted about section
  "Help improve Orca": "帮助改进 Orca",
  "Share analytics and usage data.": "分享分析和使用数据。",
  "Enable product analytics": "启用产品分析",
  About: "关于",
  Version: "版本",
  "Name is required": "请输入名称",
  "Failed to load API keys": "加载 API 密钥失败",
  "Failed to create the key": "创建密钥失败",
  "Failed to revoke the key": "撤销密钥失败",
  "No API keys yet.": "暂无 API 密钥。",
  "Revoke “{name}”?": "要撤销“{name}”吗？",
  "Clients using it will stop working.": "使用此密钥的客户端将无法继续连接。",
  "Copy API key": "复制 API 密钥",
  to: "发送至",
  "Crawler access": "爬虫访问权限",
  "Crawler access removed": "爬虫访问权限已移除",
  "Let the audit crawler through Shopify": "允许审计爬虫访问 Shopify 商店",
  "Paste the signature you created in Shopify admin under Online Store → Preferences → Crawler access. Every audit of that domain in your organization sends it with each request.":
    "粘贴你在 Shopify 后台“在线商店 → 偏好设置 → 爬虫访问权限”中创建的签名。组织内对此域名进行审计时，每次请求都会携带该签名。",
  "Add signature": "添加签名",
  "We couldn't load your crawler access.": "无法加载爬虫访问权限。",
  Type: "类型",
  Added: "添加时间",
  Expires: "到期时间",
  "Shopify signature": "Shopify 签名",
  Unknown: "未知",
  Expired: "已过期",
  "Remove crawler access for {host}": "移除 {host} 的爬虫访问权限",
  "Enter a domain.": "请输入域名。",
  "Enter Signature-Input.": "请输入 Signature-Input。",
  "Enter Signature.": "请输入 Signature。",
  "This signature has already expired. Create a new one in Shopify admin.":
    "此签名已过期，请在 Shopify 后台创建新签名。",
  "Crawler access saved for {host}": "已保存 {host} 的爬虫访问权限",
  "This signature was created for {signedHost}, not {host}. In Shopify admin, create a signature for {host}.":
    "此签名适用于 {signedHost}，不适用于 {host}。请在 Shopify 后台为 {host} 创建签名。",
  "Shopify won't accept this signature for {host}. Check that you created it for {host} and copied both values in full.":
    "Shopify 不接受此签名用于 {host}。请确认签名是为 {host} 创建的，并且两个值都已完整复制。",
  "Shopify also shows a Signature-Agent value. You don't need to paste it: Orca sends it with every request.":
    "Shopify 还会显示 Signature-Agent 值，无需粘贴，Orca 会随每次请求自动发送。",
  "Save signature": "保存签名",
} satisfies Record<string, string>;
