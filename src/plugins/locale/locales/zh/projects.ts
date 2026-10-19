export const projectsZh = {
  "Project updated": "项目已更新",
  "Failed to update project": "更新项目失败",
  "Project name is required": "项目名称不能为空",
  General: "常规",
  Name: "名称",
  Domain: "域名",
  "(optional)": "（可选）",
  "Keyword, SERP, and domain data uses this country and language unless a call asks for a different one.":
    "关键词、SERP 和域名数据默认使用此国家/地区和语言,除非请求另有指定。",
  "Save changes": "保存更改",
  "Project archived": "项目已归档",
  "Failed to archive project": "归档项目失败",
  "Archive project": "归档项目",
  Archiving: "归档",
  "removes it from your workspace and stops its scheduled rank tracking. You can restore it later from the Projects page.":
    "会将其从工作区移除,并停止计划中的排名追踪。你之后可以在项目页面恢复它。",
  "Yes, archive project": "是,归档项目",
  Cancel: "取消",
  "Archive this project to remove it from your workspace.":
    "归档此项目可将其从工作区移除。",
  "You can't archive your only project.": "无法归档唯一的项目。",
  "Project created": "项目已创建",
  "Failed to create project": "创建项目失败",
  "New project": "新建项目",
  "You can connect Search Console and set up rank tracking after creating the project.":
    "创建项目后,你可以连接 Search Console 并设置排名追踪。",
  "Change it later in project settings.": "之后可以在项目设置中更改。",
  "Create project": "创建项目",
  Country: "国家/地区",
  Language: "语言",
  "Failed to load project context": "加载项目上下文失败",
  "What SAM, Claude Code, and any connected MCP client know about this project. They read it before they work and write back what they learn, so correct anything that looks wrong.":
    "SAM、Claude Code 和任何已连接的 MCP 客户端了解的项目内容。他们会在工作前读取这些信息,并写回新发现的内容,请修正任何看起来不准确的地方。",
  "Nothing written down yet. Fill in what you can — or ask SAM to draft it from your site and confirm what it got right.":
    "还没有记录内容。尽可能填写信息,也可以让 SAM 根据你的网站起草内容,然后确认结果是否准确。",
  Empty: "空",
  "Business overview": "业务概览",
  "Current goal": "当前目标",
  Positioning: "定位",
  "Writing preferences": "写作偏好",
  "What you sell, who buys it, and where.":
    "你销售什么、谁会购买以及面向哪些地区。",
  "What you're pushing for right now, and by when.":
    "你目前要推动什么,以及希望何时完成。",
  "Why someone picks you over the alternatives.":
    "用户选择你而不是其他方案的原因。",
  "Voice, words to avoid, topics that are off-limits.":
    "语气、需要避免的词语以及禁止涉及的主题。",
  "e.g. Booking software for independent restaurants in the US and Canada. Buyers are owner-operators, not marketers.":
    "例如:面向美国和加拿大独立餐厅的预订软件。购买者是经营者,而不是营销人员。",
  "e.g. Double organic signups by Q4. Comparison pages are the current bet.":
    "例如:在第四季度前将自然注册量提升一倍。目前重点是对比页面。",
  "e.g. The only booking tool that sets up in an afternoon. Cheaper than the incumbents, simpler than the DIY stack.":
    "例如:唯一能在一个下午完成设置的预订工具。比现有方案更便宜,比自行搭建的工具栈更简单。",
  "e.g. Plain and direct, no hype. Never say 'seamless' or 'game-changing'. Don't write about competitor pricing.":
    "例如:朴素直接,不夸大。不要说“无缝”或“颠覆性”。不要撰写竞争对手的定价。",
  "Custom sections": "自定义版块",
  "Anything an agent wrote down that didn't fit the sections above.":
    "代理记录但不适合归入上述版块的内容。",
  "Nothing here yet. Agents add a section when they learn something important that has nowhere else to live.":
    "这里还没有内容。代理发现重要信息且没有其他合适位置时,会在这里添加版块。",
  "Edit {title}": "编辑 {title}",
  "Delete {title}": "删除 {title}",
  "Section title": "版块标题",
  "Section content": "版块内容",
  "Research log": "研究日志",
  "What's already been looked up, so nobody buys the same data twice.":
    "记录已经查找过的内容,避免重复购买相同数据。",
  "Nothing logged yet. Agents record paid research here as they run it.":
    "还没有记录。代理执行付费研究时会在这里记录。",
  "Delete log entry from {date}": "删除 {date} 的日志条目",

  // project switcher (src/client/features/projects/ProjectSwitcher.tsx)
  "Switch project": "切换项目",
  "Select project": "选择项目",
  "Project settings": "项目设置",
  "Find project…": "查找项目…",
  "Filter projects": "筛选项目",
  "Manage projects": "管理项目",
  "No projects match “{query}”": "没有匹配 “{query}” 的项目",

  // project settings tabs (src/routes/_project/p/$projectId/settings.tsx)
  Context: "上下文",
  Integrations: "集成",

  // create-project modal example name
  "Acme Inc.": "某某公司",

  // project context — competitors (src/client/features/projects/project-context/CompetitorsSection.tsx)
  Competitors: "竞争对手",
  "The sites you measure yourself against.": "你用来衡量自己表现的网站。",
  "Add competitor": "添加竞争对手",
  "No competitors yet. Add the sites you compete with, or ask SAM to find them from your rankings and save them here.":
    "还没有竞争对手。添加你与之竞争的网站,或让 SAM 从你的排名中找出它们并保存。",
  "Competitor domain": "竞争对手域名",
  "Name (optional)": "名称(可选)",
  "Competitor name": "竞争对手名称",
  "Why they matter — e.g. wins every comparison keyword (optional)":
    "为什么重要——例如赢得所有对比关键词(可选)",
  "Competitor notes": "竞争对手备注",
  "Edit {domain}": "编辑 {domain}",
  "Remove {domain}": "移除 {domain}",

  // project context — key pages (src/client/features/projects/project-context/KeyPagesSection.tsx)
  "Key pages": "关键页面",
  "A shortlist of the pages that carry the site — not an inventory.":
    "承载网站的重要页面清单——不是完整目录。",
  "Add page": "添加页面",
  "No key pages yet. Add the handful that has to rank, or let an agent propose them from your last site audit.":
    "还没有关键页面。添加必须获得排名的少量页面,或让代理从你最近一次的站点审计中推荐。",
  "Page URL": "页面 URL",
  "Page role": "页面角色",
  "Target topic (optional)": "目标主题(可选)",
  "Target topic": "目标主题",
  "Notes (optional)": "备注(可选)",
  "Page notes": "页面备注",
  "Hub page": "枢纽页面",
  "Supporting page": "支撑页面",
  "Money page": "盈利页面",
  "Target: {topic}": "目标:{topic}",
  "Edit {url}": "编辑 {url}",
  "Remove {url}": "移除 {url}",
  "Adding your website starts a 50-page scan with JavaScript rendering. Rendering uses your credits.":
    "添加网站后会启动一次启用 JavaScript 渲染的扫描，最多扫描 50 个页面。渲染会消耗你的额度。",
  "Keyword, SERP, and domain data uses this country and language unless a call asks for a different one. Change it later in project settings.":
    "关键词、搜索结果页和域名数据默认使用此国家/地区和语言，除非查询时另有指定。之后可在项目设置中更改。",
  "No projects match.": "没有匹配的项目。",
  "Website URL": "网站网址",
  "Enter your website URL": "输入你的网站网址",
  "We couldn’t research this website. Check the URL, provider settings, and available usage credits, then try again.":
    "无法研究此网站。请检查网址、服务提供商设置和剩余额度，然后重试。",
  "Project settings sections": "项目设置栏目",
  "This can take up to a minute.": "可能需要一分钟。",
  "You can edit your": "你可以随时编辑",
  "at any time.": "。",
  "We’ll use the competitors already saved in your project context.":
    "将使用项目上下文中已保存的竞争对手。",
  Website: "网站",
  "We couldn’t save your project. Check the competitor names and websites, then try again.":
    "无法保存项目。请检查竞争对手名称和网站，然后重试。",
  Back: "返回",
  "No competitors yet": "尚未添加竞争对手",
  "Add the sites you compete with, or ask your agent to find them from your rankings and save them here.":
    "添加与你竞争的网站，也可以让智能体根据你的排名找出竞争对手并保存到这里。",
  "No key pages yet": "尚未添加关键页面",
  "Add the handful that has to rank, or let an agent propose them from your last site audit.":
    "添加少量需要争取排名的页面，也可以让智能体根据最近一次站点审计推荐。",
  "What Claude Code and any other connected MCP client know about this project. They read it before they work and write back what they learn, so correct anything that looks wrong.":
    "这里记录 Claude Code 及其他已连接的 MCP 客户端了解的项目信息。它们会在工作前读取这些内容，并写回新发现的信息；请修正其中不准确的地方。",
  "Nothing written down yet": "尚未记录内容",
  "Fill in what you can — or ask your agent to draft it from your site and confirm what it got right.":
    "填写你了解的信息，也可以让智能体根据网站起草，再核实内容是否准确。",
  "Nothing here yet": "暂无内容",
  "Agents add a section when they learn something important that has nowhere else to live.":
    "智能体发现重要信息但无法归入其他栏目时，会在这里新增栏目。",
  "Nothing logged yet": "暂无记录",
  "Agents record paid research here as they run it.":
    "智能体执行付费研究时，会在这里记录。",
  "Failed to load the project": "项目加载失败",
  "This project was not found.": "未找到此项目。",
  "Couldn't load your project.": "无法加载你的项目。",
  "Archiving removes the project from your workspace and stops its scheduled rank tracking. You can restore it later from the Projects page.":
    "归档会将项目从工作区移除，并停止其定时排名追踪。之后可在“项目”页面恢复。",
  "Archive {name}": "归档 {name}",
  "Project context saved": "项目上下文已保存",
  "Complete project setup": "完成项目设置",
  "Edit competitors": "编辑竞争对手",
  "Researching your website": "正在研究你的网站",
  "Finding competitors": "正在查找竞争对手",
  "Preparing topics and prompts": "正在准备主题和提示词",
  "Step {step} of {total}": "第 {step} 步，共 {total} 步",
  "Competitor {number} name": "竞争对手 {number} 的名称",
  "Competitor {number} website": "竞争对手 {number} 的网站",
  "Done editing competitor": "完成竞争对手编辑",
  "Remove {name}": "移除 {name}",
  "competitor {number}": "竞争对手 {number}",
  "Updated by {author} · {time}": "由{author}更新 · {time}",
  "Added by {author}": "由{author}添加",
  you: "你",
  "your AI client": "你的 AI 客户端",
  "Website saved. The first scan could not start.":
    "网站已保存，但首次扫描未能启动。",
  "Your 50-page site scan is running": "正在进行 50 页网站扫描",
  "Enter a project name.": "请输入项目名称。",
  "Enter a valid domain, like acme.com.": "请输入有效域名，例如 acme.com。",
  'A project named "Default" with no domain already exists. Pick a different name or add a domain.':
    "已存在一个名为“Default”且未设置域名的项目。请使用其他名称或添加域名。",
  Albanian: "阿尔巴尼亚语",
  Arabic: "阿拉伯语",
  French: "法语",
  Catalan: "加泰罗尼亚语",
  Portuguese: "葡萄牙语",
  Spanish: "西班牙语",
  Armenian: "亚美尼亚语",
  English: "英语",
  German: "德语",
  Azerbaijani: "阿塞拜疆语",
  Bengali: "孟加拉语",
  Dutch: "荷兰语",
  Bosnian: "波斯尼亚语",
  Malay: "马来语",
  Bulgarian: "保加利亚语",
  Croatian: "克罗地亚语",
  Greek: "希腊语",
  Czech: "捷克语",
  Danish: "丹麦语",
  Estonian: "爱沙尼亚语",
  Finnish: "芬兰语",
  "Chinese (Traditional)": "繁体中文",
  Hungarian: "匈牙利语",
  Icelandic: "冰岛语",
  Hindi: "印地语",
  Indonesian: "印度尼西亚语",
  Hebrew: "希伯来语",
  Italian: "意大利语",
  Japanese: "日语",
  Russian: "俄语",
  Latvian: "拉脱维亚语",
  Lithuanian: "立陶宛语",
  Romanian: "罗马尼亚语",
  Serbian: "塞尔维亚语",
  Macedonian: "马其顿语",
  "Norwegian (Bokmål)": "书面挪威语",
  Urdu: "乌尔都语",
  Tagalog: "他加禄语",
  Polish: "波兰语",
  "Chinese (Simplified)": "简体中文",
  Slovak: "斯洛伐克语",
  Slovenian: "斯洛文尼亚语",
  Korean: "韩语",
  Swedish: "瑞典语",
  Thai: "泰语",
  Turkish: "土耳其语",
  Ukrainian: "乌克兰语",
  Vietnamese: "越南语",
} satisfies Record<string, string>;
