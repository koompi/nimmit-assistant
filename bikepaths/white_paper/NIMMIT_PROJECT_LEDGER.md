# NIMMIT PROJECT LEDGER

This document serves as the central "Source of Truth" for the Nimmit platform evolution. It tracks the technical architecture, strategic milestones, and document locations.

---

## 1. Project Pillars
- **Micro-Entity Economy**: Scaling one-person businesses without traditional employment.
- **Context Cloud**: Decoupling institutional memory from labor using Vector Databases (**Transactive Memory**).
- **Agentic Orchestration**: The 80/20 division of labor between AI (Friction) and Humans (Judgment).
- **Reliability Arbitrage**: Competing on consistent high-quality outcomes rather than low-cost labor.

> [!IMPORTANT]
> **Dynamic Development**: All project documents (White Paper, Blog Series, and Notes) are **Dynamic Drafts**. As we gather new notes and synthesize big ideas, they are continuously incorporated into all core documents. Everything is evolving in real-time.

> [!NOTE]
> **Style Protocol (Minimalist v4)**:
> - **Header Level**: Title Case for `###` headers.
> - **Emphasis**: *Italics* for mid-sentence conceptual terms (ESL special meaning signal).
> - **List Anchors**: **Bold and Title Case** for the lead term in any list (e.g., **1. Infinite Capacity**).
> - **Engineer's Stance**:
    - **Affirmative Framing**: Define what a concept IS. Never use "not just about" or "is not X."
    - **No Contractions**: Write all words in full (e.g., "do not" instead of "don't").
    - **No Dashes**: Never use em-dashes (—) or en-dashes (–). Use commas or periods.
    - **Vocabulary**: Use skill-based verbs (*precision*, *orchestration*). Avoid machine language.
- **Glossary Style**: **Bold Title Case**: followed by the definition.
- **Zero Quotation**: No quotation marks.

---

## 2. Infrastructure & Architecture Map

### Access Points (Local Workspace)
- **Consolidated Nimmit Hub**: `/home/user0/files/workspace/inbox/nimmit`
- **White Paper Sub-Path**: `/home/user0/files/workspace/inbox/nimmit/white_paper`
- **Article Series Sub-Path**: `/home/user0/files/workspace/inbox/nimmit/article_series`
- **Archive Sub-Path**: `/home/user0/files/workspace/inbox/nimmit/archive`
- **External Protocol**: `/home/user0/files/workspace/htmly/system/external_communication_protocol.md`

### Publication Strategy (Series Lock)
- **Rule**: No articles from the 6-part series shall be published until the **entire series is complete** and verified for consistency.
- **Exception**: A single "Introductory Teaser" article may be released early to introduce Nimmit and build anticipation.

### Git Repository (Branch: `bikepaths`)
- **Base Directory**: `/home/user0/git/nimmit`
- **Top-Level Content Path**: `bikepaths/`
- **White Paper Path**: `bikepaths/white_paper/`
- **Article Series Path**: `bikepaths/article_series/`
- **Archive Path**: `bikepaths/archive/`

---

## 3. Resource Index
- **Final WP Draft**: [Nimmit_Whitepaper_v2_Simplification_Draft.md](file:///home/user0/files/workspace/inbox/nimmit/white_paper/Nimmit_Whitepaper_v2_Simplification_Draft.md)
- **Living Glossary**: [glossary.md](file:///home/user0/files/workspace/inbox/nimmit/white_paper/source/glossary.md)
- **Foundation Research**: [2026-01-31_nimmit_research_notes.md](file:///home/user0/files/workspace/inbox/nimmit/white_paper/source/2026-01-31_nimmit_research_notes.md)
- **Blog Series Plan**: [2026-01-31_blog_series_plan_v1.md](file:///home/user0/files/workspace/inbox/nimmit/article_series/notes/2026-01-31_blog_series_plan_v1.md)

---

## 4. Action Log

| Date | Action | Description | Pointer |
| :--- | :--- | :--- | :--- |
| 2026-01-31 | **System Closure** | Hardened repository and synchronized all refinements for transfer to subsequent agent. Series locked at Minimalist v5. | `bikepaths` branch |
| 2026-01-31 | **Foil Audit** | Completed "Engineer's Stance" audit (v5). Removed contractions, em-dashes, and negative framing. | `article_series/` |
| 2026-01-31 | **Article 6 PD** | [x] Track 14: Blog Production (Article 6) <!-- id: 71 --> <br> &nbsp;&nbsp;&nbsp;&nbsp;- [x] Draft Article 6 PD: "Your Global Team" <!-- id: 72 --> <br> &nbsp;&nbsp;&nbsp;&nbsp;- [x] Perform style audit (Minimalist v4) <!-- id: 73 --> <br> &nbsp;&nbsp;&nbsp;&nbsp;- [x] Sync FD to repository <!-- id: 74 --> | `article_series/` |
| 2026-01-31 | **Article 5 PD** | Drafted "Why Cheap is Expensive" (Reliability intro). | `article_series/` |
| 2026-01-31 | **Article 4 PD** | Drafted "Piloting Your Pod" (Human-AI synergy). | `article_series/` |
| 2026-01-31 | **Glossary Norm** | Standardized glossary style (Bold Title Case + Colon) across all articles. | `article_series/` |
| 2026-01-31 | **WP Hardening** | Added Academic Anchors (Coase, Licklider, Wegner) and ESL Simplification. | v2_Finalized |
| 2026-01-31 | **Glossary Init** | Created living glossary with simplified terminology. | `source/glossary.md` |
| 2026-01-31 | **Blog Series** | Approved 6-part "Future of Solo Work" outline. | `article_series/notes/` |
| 2026-01-31 | **CMS Rescue** | Corrected `config.ini` GTM misconfiguration on remote server. | `Remote CMS Fix` |
| 2026-01-31| **Protocol Set** | Hardcoded date slugging and symlink recognition rules. | `htmly/system/` |
| 2026-01-31 | **Foundation Notes** | Standardized `reandom-noetes.md` into `2026-01-31_nimmit_research_notes.md`. | `source/research/` |
| 2026-01-31 | **Ledger Update** | Formalized Publication Strategy and Dynamic Draft status. | `NIMMIT_PROJECT_LEDGER.md` |
| 2026-01-31 | **Article 2 PD** | Drafted "The Management Tax" (Transaction Costs intro). | `article_series/` |
| 2026-01-31 | **Article 3 PD** | Drafted "The Context Cloud" (System memory intro). | `article_series/` |
| 2026-01-31 | **Style Norm** | Performed "Zero Quote / Minimalist" normalization across all docs. | `article_series/` |
| 2026-01-31 | **Style Codified** | Established "Italicized Minimalist" formatting protocol (Italics/Pedagogy). | `NIMMIT_PROJECT_LEDGER.md` |
| 2026-01-31 | **Article 1 Final** | Finalized Title and Tone adjustments based on user feedback. | `article_series/` |
| 2026-01-31 | **Article 1 PD** | Drafted "The New Way to Work" (Micro-Entity introduction). | `article_series/` |
| 2026-01-31 | **Ledger Genesis** | Initialized this Project Ledger for permanent tracking. | `NIMMIT_PROJECT_LEDGER.md` |
