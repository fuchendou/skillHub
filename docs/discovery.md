# Skill Hub Public-Platform Discovery Archive

Research date: 2026-06-15  
Scope: archival research on representative public AI skill / agent skill hub websites. This file is **not** the implementation brief for Skill Hub v1; use [`spec.md`](spec.md), [`schema.md`](schema.md), [`api.md`](api.md), and [`implement.md`](implement.md) for the current internal product contract.

> **Direction update (2026-06-15): internal company tool, not a public marketplace.**
> Skill Hub has since been scoped as an **internal, login-gated tool**. Everyone signs in; there is
> no anonymous "visitor" browsing. Users are **members** (employees who belong to a department) and
> **admins** (who review/publish and decide which departments each published skill is available to).
> The platforms below were researched as *public* hubs, so read this report selectively:
> - **Reuse** the structural patterns that still apply — catalog/skill cards, a detail page with
>   clear install command + source link, status badges, and an admin review/curation queue.
> - **Treat as out of scope** the public-only patterns — anonymous SEO/landing pages, a
>   marketing-first public homepage, visitor-to-detail conversion funnels, public rankings, and
>   community/news/tutorial portals. These do not apply to a gated internal catalog.
>
> The competitive analysis below is preserved for source traceability. The only current-product
> recommendations in this file are in [Internal v1 Takeaways](#internal-v1-takeaways).

## Selection Summary

I selected three platforms:

1. **SkillHub.club**: a global, marketplace-style Agent Skills hub with strong ranking, category, quality-score, and install-oriented patterns.
2. **SkillHub.swaggin.cn**: a Chinese AI skill marketplace concept with homepage, skill library, ranking, tutorial, community, and detail-page flows.
3. **skills.aiproducthub.cn**: an SEO/directory-oriented Chinese SkillHub under AIProductHub, useful for tag-driven discovery and article-style detail pages.

I also reviewed `skillhub.cn`, but its public HTML is mainly a JavaScript shell plus metadata, so it was less useful for detailed IA and page-structure analysis than the three platforms above.

## Cross-Platform Comparison

| Dimension | SkillHub.club | SkillHub.swaggin.cn | skills.aiproducthub.cn |
| --- | --- | --- | --- |
| Primary model | Marketplace + ranking hub | Skill marketplace + learning/community portal | Directory + editorial/SEO pages |
| Primary users | Developers using agent skills across Claude/Codex/Gemini/OpenCode-style tools | Chinese AI users/developers seeking ready-made AI skills | Chinese users browsing AI skills, agents, plugins, and external resources |
| Homepage role | Product positioning, hot skills, categories, stacks, quick-start education | Broad portal: hero, live news, top skills, categories, reasons to trust, quick start | Navigation/search portal: search tabs, platform intro, all skills, rankings, supported platforms |
| Listing role | High-density catalog with categories, sort, rating, pagination | Filterable skill library with stats, categories, status filters, sort, cards | Directory category page with description, sorting, item list, tags, external destinations |
| Detail role | Deep skill evidence: preview, scores, tags, compatible agents, full SKILL.md content | Marketplace/product detail: install, docs, examples, changelog, reviews, author, related skills | Article-style resource detail: breadcrumb, stats, summary, external link, tags, long-form guide, related items |
| Discovery emphasis | Semantic search, category filters, hot/rated ranks, stacks, creator spotlight | Search, category, status badges, ranking, news/tutorial/community side routes | Search engine tabs, categories, tags, sort by activity, rankings, SEO content |

## Platform 1: SkillHub.club

Sources: homepage[^club-home], all skills listing[^club-list], skill detail page[^club-detail], stacks listing[^club-stacks].

### Overall IA And Navigation Logic

SkillHub.club is organized around a marketplace/catalog mental model. The top navigation exposes:

- **SKILLHUB / Home**
- **All Skills**
- **Stacks**
- **KOL**
- **Hot**
- **OpenClaw**
- **Launch App**
- **Language selector**

The IA separates individual skills from bundled workflow packages. The homepage introduces the value proposition, shows high-signal ranked content, then provides category and stack-based discovery. The listing page narrows the experience into catalog browsing, while detail pages are evidence-heavy and installation-oriented.

The navigation logic is:

1. User lands on broad positioning and proof points.
2. User discovers via hot skills, S-rank/must-have skills, categories, or stacks.
3. User browses the full catalog with filters and sorting.
4. User opens a detail page to inspect description, preview, quality scores, compatibility, and source content.
5. User installs/copies/tries the skill or follows the GitHub/source path.

### Key Page Layouts

#### Homepage

The homepage structure is a stacked discovery funnel:

1. **Top header**: brand, primary nav, product entry, language.
2. **Hero**: headline focused on agent skills, supported agents, aggregate stats, and CLI-oriented examples for installation and semantic search.
3. **Hot Skills**: leaderboard-like list with rank, name, author, description, score/activity signals, tags, and try/copy affordances.
4. **Category filter strip**: Development, Frontend, Backend, Data, AI/ML, Productivity, Writing, etc.
5. **Must-Have / S-rank section**: quality-gated list for highly rated skills.
6. **Skill Stacks**: bundled workflows with featured cards, included skill counts, credit/pricing hints, and detail links.
7. **Trending Now**: another hot skills surface to keep the page fresh.
8. **Quick Start Guide**: FAQ-style onboarding explaining what skills are, how to install, supported agents, creation, and ratings.
9. **Newsletter and footer**: retention, links, docs, GitHub, terms, contact.

This page mixes **marketing**, **catalog discovery**, and **education**, which helps first-time users understand both what a skill is and how to act on one.

#### Course / Skill Listing Page

The listing page is a dense catalog:

- Page title: **All Skills**
- Count summary: total skills found
- Category row: All, Development, DevOps, Testing, Documentation, Security, Data, AI/ML, Frontend, Backend, Mobile, Cloud, Productivity, Writing, Design, Meta, Integration, Communication, Research, Creator Spotlight, Collections
- Sort row: Recommended, Popular, Stars, Newest
- Rating row: S, A, B
- Page size control: 12, 24, 48
- Skill cards/list rows
- Pagination
- Footer

Skill list items include:

- Rank number
- Author
- Rating grade and numeric score where available
- Skill name
- Description
- Tags
- Usage or popularity metric
- Try action
- Category label

The page favors scan efficiency over visual storytelling. The strongest pattern is a **filter bar plus ranked result rows**, which is a practical model for a simple skill hub.

#### Detail Page

The skill detail page uses a long-form evidence layout:

1. **Header and back link**
2. **Title and author block**
3. **GitHub/source link and popularity signals**
4. **Short description**
5. **Output preview** with a copy affordance
6. **Evaluation metrics** such as security, clarity, practicality, quality, maintainability, and innovation
7. **Category and tags**
8. **Compatible agents** with install paths for Claude Code, Codex CLI, Gemini CLI, OpenCode, OpenClaw, Cursor, Windsurf, Cline, Roo Code, and others
9. **Full SKILL.md / documentation content**

This is a detail page designed to answer: *What does this skill do, is it safe/good, where does it work, and can I inspect the underlying instructions?*

### Key UI Components

#### Header

The header is compact and utility-driven. It prioritizes catalog routes and product launch rather than many marketing pages. This is appropriate for a tool marketplace where returning users mostly need search, browse, and install paths.

#### Search / Filter System

Search appears conceptually in two ways:

- CLI-style semantic search examples on the homepage.
- Listing-page filters for category, sort, rating, and result count.

The notable idea is that search is not just a text box; it is positioned as **semantic skill retrieval**. For a new hub, this suggests supporting natural-language queries such as "I need to write automated tests" rather than only exact keyword matching.

#### Skill Cards

Skill cards/list rows are information-dense. They combine:

- Identity: name and author
- Trust: grade, numeric score, stars/activity
- Utility: concise description
- Taxonomy: tags and category
- Action: Try/copy/install

This card anatomy is worth copying because it helps users compare skills quickly.

#### Footer

The footer reinforces:

- Brand description
- Quick links
- Rankings/API docs
- GitHub and Claude Docs
- Terms
- Contact/report bug
- Content-source disclaimer

For a new hub, the footer should include contribution, source policy, and reporting links early, because skill hubs depend on community trust.

### Content Organization And Discovery

SkillHub.club uses multiple discovery paths:

- **Categories** for domain browsing.
- **Ratings** for quality browsing.
- **Hot/trending lists** for popularity browsing.
- **S-rank / must-have lists** for trust-led browsing.
- **Stacks** for workflow browsing.
- **Creator/KOL routes** for author-led browsing.
- **Tags** for granular skill topics.
- **Compatible agents** for environment-based discovery.

The most useful structural idea is separating **single skills** from **skill stacks**. A simple hub can start with individual skills, then add stacks later as curated collections.

### Notable Patterns To Reference

- Use a **quality grade** or review score to reduce catalog anxiety.
- Include **install/copy/try actions directly on cards**.
- Provide **agent compatibility** on detail pages.
- Treat **skill stacks** as curated bundles for task-oriented users.
- Add a **Quick Start / FAQ section** on the homepage to explain a new concept without forcing users into docs.
- Show **source transparency** through GitHub or author links.

## Platform 2: SkillHub.swaggin.cn

Sources: homepage[^swaggin-home], skill listing[^swaggin-list], skill detail[^swaggin-detail], rankings[^swaggin-rankings], tutorials[^swaggin-tutorials], community[^swaggin-community].

### Overall IA And Navigation Logic

SkillHub.swaggin.cn is structured as a broader AI portal, not only a skill catalog. The main navigation includes:

- 首页
- 排行榜
- AI快讯
- 技能库
- 教程
- 社区
- AI导航

The IA combines marketplace, content, and community:

1. **Homepage** introduces the value proposition and top skills.
2. **Skill library** supports direct skill discovery.
3. **Ranking** gives social proof and freshness.
4. **AI news** keeps repeat visits alive.
5. **Tutorials** educate users and can feed skill adoption.
6. **Community** supports peer discovery and social interaction.
7. **AI navigation** expands the platform into a broader AI resource directory.

This is a strong reference if the new skill hub wants to grow from a simple catalog into a content/community ecosystem.

### Key Page Layouts

#### Homepage

The homepage is a complete portal landing page:

1. **Header navigation**
2. **Real-time hot news ticker**
3. **Hero**: "discover and use powerful AI skills" positioning, stats, search, and quick category chips
4. **Featured Top 50**: curated card grid/list with official badges, skill names, descriptions, tags, downloads, ratings, and copy-install actions
5. **24-hour AI news**
6. **Skill categories**: content creation, development assistance, image processing, data analysis, automation, utility tools
7. **Why choose SkillHub**: speed, curation/safety, open community
8. **Quick start**: search skill, copy command, install
9. **Footer**

Compared with SkillHub.club, this homepage is more localized and user-education-heavy. It also mixes the skill catalog with AI news and community hooks.

#### Course / Skill Listing Page

The listing page is a classic faceted catalog:

- Hero/title: AI技能库
- Platform stats: skill count, developers, downloads
- Search area
- Category filters:
  - 全部
  - 内容创作
  - 开发辅助
  - 图像处理
  - 数据分析
  - 自动化
  - 实用工具
- Status filters:
  - 官方认证
  - 安全审计
  - 精选推荐
- Clear filters
- Sort options:
  - 下载量
  - 评分
  - 最新发布
  - 名称
- Skill card list
- Pagination
- Footer

The filter model is very suitable for a simple MVP because it is understandable: category, trust status, and sort.

#### Detail Page

The detail page is closer to a product/package detail page:

1. **Header navigation**
2. **Breadcrumb**: skill library > category > skill name
3. **Status badges**: official certification, security audit, featured recommendation
4. **Title and description**
5. **Metadata**: publisher, release date, version, license
6. **Stats**: downloads, rating/reviews, followers, dependencies
7. **Install command** with copy action
8. **Primary actions**: one-click install, online trial, follow, share
9. **Detailed description**
10. **Core features**
11. **Use cases**
12. **Configuration block**
13. **Usage examples** in Python and command line
14. **Changelog**
15. **User reviews**
16. **Author information**
17. **Related skills**
18. **Tags**
19. **Dependencies**
20. **Footer**

This is the most complete detail-page model among the three selected platforms. It gives users enough confidence to install and enough documentation to evaluate implementation effort.

### Key UI Components

#### Header

The header is a portal nav with product, content, and community sections. For a simple skill hub, this is more than needed at launch, but it gives a clear growth path:

- Start with Home + Skills.
- Add Rankings after enough usage data exists.
- Add Tutorials after onboarding friction is visible.
- Add Community when there is enough user activity.

#### Search / Filter System

The listing filter system combines:

- Search
- Category
- Status/trust badges
- Sort
- Clear filters

The "status" filter is especially useful. It lets users browse only official, audited, or featured skills without inventing complicated taxonomy.

#### Skill Cards

Cards show:

- Skill name
- Short description
- Tags
- Download count
- Rating
- Certification badge when present
- Copy install command action

The cards are action-oriented rather than purely informational, which is a good pattern for utility marketplaces.

#### Footer

The footer groups:

- Product links
- Resources
- Community
- About/legal

This footer is a good baseline for a hub that will include docs, examples, and community channels.

### Content Organization And Discovery

SkillHub.swaggin.cn uses:

- **Top 50 / featured curation**
- **Categories**
- **Status badges**
- **Sorting by downloads, rating, latest, name**
- **Rankings**
- **AI news**
- **Tutorials**
- **Learning paths**
- **Community profiles and nearby/social discovery**
- **Related skills**
- **Tags and dependencies**

The site is strongest when it connects skills to surrounding content. Tutorials and learning paths create a path from "I am curious" to "I can use this skill."

### Notable Patterns To Reference

- Use **official / audited / featured badges** as first-class filters.
- Put **copy install command** on both cards and detail pages.
- Include **version, license, release date, and dependencies** on detail pages.
- Add **usage examples** and **configuration snippets** directly in the detail page.
- Include **related skills** to keep discovery moving.
- Use rankings and tutorials as future growth modules, not required MVP scope.

## Platform 3: skills.aiproducthub.cn

Sources: homepage[^aiph-home], category/listing page[^aiph-list], detail page[^aiph-detail], tag page[^aiph-tag].

### Overall IA And Navigation Logic

skills.aiproducthub.cn is a directory-style skill hub. Its navigation connects the SkillHub subsite to the broader AIProductHub ecosystem:

- AI Skills Agents Plugins Hub
- AI产品库官网
- 社区
- AI产品大全
- Search/navigation tabs for site search, common search engines, tools, community, and life services

The IA is less like a SaaS marketplace and more like a Chinese web directory:

1. User arrives through homepage, search, category, tag, or SEO.
2. User browses a directory category such as AI skills / agents.
3. User sorts by publish/update/views/likes.
4. User opens a resource detail page.
5. User can open the external site, read a long-form guide, inspect tags, or browse related resources.

This model is useful for a new hub if SEO and content acquisition matter as much as in-app installation.

### Key Page Layouts

#### Homepage

The homepage combines search portal, platform introduction, and directory content:

1. **Brand/header area**
2. **Top ecosystem links** to AIProductHub, community, and AI product directory
3. **Search module** with tabs for site/common/tool/community/life searches
4. **Hero intro** describing the platform as a Chinese AI Skills, Agents, and Plugins collection/sharing platform
5. **Supported agent platforms** list such as OpenClaw, Claude Code, CoPaw, WorkBuddy, ArkClaw, QClaw, DuClaw, KimiClaw, MaxClaw, AutoClaw
6. **Primary CTA** to explore the skill library
7. **All Skill section** listing skill resources
8. **Skill item cards/list rows** with title, summary, external domain, metrics, and tags
9. **Featured skills ranking**
10. **Supported platforms area**
11. **Footer with ecosystem links, legal links, submission, sitemap, and email**

The homepage is optimized for browsing and SEO. It surfaces many outbound destinations and tag links instead of focusing only on in-app conversion.

#### Course / Skill Listing Page

The listing/category page has a directory pattern:

- Category title: AI skills / Agent directory
- Item count
- Category description explaining the scope
- Sort links:
  - 发布
  - 更新
  - 浏览
  - 点赞
- Item list
- Tags below each item
- Metrics per item
- Footer
- Feedback widget

List items include:

- Skill/resource title
- Short summary
- External source domain
- Metrics such as comments/views/likes
- Tags

This is less interactive than the other two platforms, but stronger for browseable taxonomy, search indexing, and editorial discoverability.

#### Detail Page

The detail page is an editorial resource page:

1. **Header and ecosystem navigation**
2. **Breadcrumb**: Home > category > detail
3. **Title**
4. **Update time and metrics**
5. **Favorite/collect action**
6. **Short summary**
7. **Collection date**
8. **Open website CTA**
9. **Mobile viewing affordance**
10. **Category and tag links**
11. **Preview images**
12. **Article summary**
13. **Long-form content sections**
14. **Official/source links**
15. **Installation/getting-started notes where available**
16. **Competitive comparison, scenarios, FAQ, references**
17. **Data statistics / site evaluation**
18. **Disclaimer**
19. **Related navigation**
20. **Comments area**
21. **Footer**

The long-form detail layout is useful when a skill hub wants to explain why a skill matters, not just list metadata.

### Key UI Components

#### Header

The header is ecosystem-first. It sends users between the skill hub, AIProductHub, community, and AI product directory. For a new skill hub, this is most relevant if the skill hub is one module inside a larger AI resource product.

#### Search / Filter System

The search system is broader than internal catalog search:

- Site search
- Common search engines
- SEO/tool searches
- Community searches
- Life-service searches

The listing pages rely more on sort and tag links than complex filters. This is simpler to build but can become noisy if the catalog grows.

#### Skill Cards

Directory items include:

- Title
- Description
- External domain
- Basic metrics
- Tags

The card pattern is lightweight and SEO-friendly. It does not show install commands, trust badges, compatibility, or versioning as prominently as the marketplace-style sites.

#### Footer

The footer includes:

- Platform description
- AIProductHub ecosystem links
- Community/submission links
- ICP/legal/privacy/sitemap
- Contact email
- Feedback/reporting widget

This is the strongest footer among the three for public directory governance.

### Content Organization And Discovery

skills.aiproducthub.cn uses:

- **Directory categories**
- **Tags**
- **Sort by publish/update/browse/like**
- **Featured rankings**
- **Supported platform lists**
- **Related navigation**
- **Long-form articles**
- **External source links**
- **Feedback/reporting**

Its discovery mechanism is mostly taxonomy + SEO + related links, rather than faceted marketplace filtering.

### Internal Relevance

The SEO and public-directory patterns in this platform are **not** part of Skill Hub v1. The only reusable ideas are stable authenticated detail URLs, visible source/reference links, tag-based discovery, and a future admin-side issue-reporting workflow if catalog maintenance becomes painful.

## Internal v1 Takeaways

### 1. Use the Internal Command-Center IA

Skill Hub v1 is not a public landing site. The MVP navigation should be:

- Login / Register
- Department-scoped catalog
- Skill detail
- Submit skill
- My submissions
- Admin review queue
- Department management
- Member management

No public homepage, rankings, tutorials, community, news, collections/stacks, public author pages, or public API docs belong in v1.

### 2. Keep Discovery Narrow and Authenticated

Supported v1 discovery modes are:

- **Keyword search** over skill name and summary.
- **Browse/filter** by category, tag, featured flag, and status where the caller is allowed to see that status.
- **Department scope** enforced server-side, with org-wide skills represented by an empty department assignment.
- **Owner scope** through "My submissions" for a member's own draft, pending, rejected, published, and unpublished records.

Natural-language search, popularity rankings, ratings, reviews, public SEO tag pages, and task bundles are explicitly out of scope.

### 3. Keep Skill Cards Operational

The v1 card/list row should show only fields the current model actually supports:

- Name
- Summary
- Category
- Tags
- Owner/submitter
- Status
- Featured badge when true
- Department scope summary for admins
- Copy/open detail action for published visible skills

Do not show ratings, downloads, compatibility matrices, license/version fields, or public popularity metrics until those fields exist in `schema.md`.

### 4. Make Detail Pages Trust-Building with Existing Fields

The v1 detail page should include:

- Name and summary
- Category and tags
- Owner/submitter
- Status and featured state
- Install command with copy feedback
- Source/reference link
- Usage notes
- Rejection reason for owner/admin when rejected
- Department assignment for admins
- Review-action history for owner/admin

Do not add reviews, comments, changelog, related skills, long-form editorial content, or public reporting to the v1 detail page.

### 5. Treat Trust as Review Workflow, Not Public Social Proof

Public hubs use ratings, audits, official badges, and download counts. Skill Hub v1 uses internal controls instead:

- Admin review before publication.
- Rejection reason and resubmission path.
- Featured flag controlled by admins.
- Source/reference link visible before publish.
- Department assignment controlled by admins.
- Append-only review-action history.

### 6. Preserve Post-v1 Ideas Separately

The following ideas may be revisited only after v1 is stable and should not leak into the v1 scope:

- Collections/stacks
- Public or SEO pages
- Ratings/reviews/comments
- Tutorials/news/community routes
- Compatibility matrices
- Version/license/changelog metadata
- Issue reporting or suggest-edit workflows

## Source List

[^club-home]: SkillHub.club homepage, <https://www.skillhub.club/>
[^club-list]: SkillHub.club all skills listing, <https://www.skillhub.club/skills>
[^club-detail]: SkillHub.club skill detail example, <https://www.skillhub.club/skills/davepoon-buildwithclaude-skill-creator>
[^club-stacks]: SkillHub.club skill stacks listing, <https://www.skillhub.club/skill-stacks>
[^swaggin-home]: SkillHub.swaggin.cn homepage, <https://skillhub.swaggin.cn/>
[^swaggin-list]: SkillHub.swaggin.cn skills listing, <https://skillhub.swaggin.cn/skills.html>
[^swaggin-detail]: SkillHub.swaggin.cn skill detail example, <https://skillhub.swaggin.cn/skill-detail.html>
[^swaggin-rankings]: SkillHub.swaggin.cn rankings page, <https://skillhub.swaggin.cn/rankings.html>
[^swaggin-tutorials]: SkillHub.swaggin.cn tutorials page, <https://skillhub.swaggin.cn/tutorials.html>
[^swaggin-community]: SkillHub.swaggin.cn community page, <https://skillhub.swaggin.cn/social.html>
[^aiph-home]: AIProductHub SkillHub homepage, <https://skills.aiproducthub.cn/>
[^aiph-list]: AIProductHub SkillHub AI skills and agents directory, <https://skills.aiproducthub.cn/favorites/ai-skills-and-agents/>
[^aiph-detail]: AIProductHub SkillHub detail example, <https://skills.aiproducthub.cn/sites/agent-browser.html>
[^aiph-tag]: AIProductHub SkillHub tag page example, <https://skills.aiproducthub.cn/sitetag/ai%E6%BC%94%E7%A4%BA/>
