---
description: Unified standard for SSRN white paper formatting, typesetting, and production.
---

# SSRN Production Protocol (Standardized)

This document is the **Canonical Build Pipeline** and **Layout Standard** for all SSRN-ready white papers. It integrates formatting rules, LaTeX specifications, and the modular production workflow.

## 1. Modular Production Strategy
To ensure content velocity and correctness, papers are authored in modular Markdown files.

*   **Path**: `sections/*.md`
*   **Safety Rule**: Every markdown file MUST end with **two hard returns** to prevent header collisions during concatenation.
*   **Ordering**: Files should be numbered (e.g., `00_frontmatter_p1.md`, `01_frontmatter_p2.md`) to maintain logical flow.

## 2. Formatting & Partitioning (Mandatory)
Every paper MUST follow this 3-page front matter split:

*   **Page 1 (Title/Abstract)**: Contains `# Title` and `## Abstract` only.
*   **Page 2 (Metadata)**: Contains `## Keywords` and `## JEL Classification` (Primary/Secondary).
*   **Page 3 (Notes/Citations)**: Contains `## Document Type`, `## SSRN Classifications`, `## Author Note`, and `## Citation`.
*   **Page 4 (Executive Summary)**: standalone `# Executive Summary`.
*   **Navigation**: Use `\newpage` at the end of each front matter file.

## 3. LaTeX Typesetting Standard (`header.tex`)
The build must implement these hardcoded settings via a preamble:

*   **Geometry**: `0.75in` margins on all sides.
*   **Line Density**: `\setstretch{1.15}` spacing.
*   **Hyphenation**: Strictly disabled (`\hyphenpenalty=10000`).
*   **Alignment**: `RaggedRight` (Left-aligned). Never use full justification.
*   **Paragraphs**: Block Style (`parindent=0pt`, `parskip=1em`).
*   **Header Hierarchy (Numbered)**: 
    *   L1 (`#`): `\large\bfseries\raggedright` with section numbering.
    *   L2 (`##`): `\normalsize\bfseries\raggedright` with subsection numbering.
    *   L3 (`###`): `\normalsize\bfseries\raggedright` with sub-subsection numbering.

## 4. Linguistic Authority
All content must adhere to the **Academic Writing Protocol** (`academic_writing_protocol.md`) for tone, word choice (No "utilize," No em-dashes), and the "Engineer's Stance."

## 5. Execution Pipeline
```bash
cat sections/*.md > final_concatenated.md
pandoc final_concatenated.md -s -o final.tex -H header.tex --variable fontsize=12pt
pdflatex -interaction=nonstopmode final.tex
pdflatex -interaction=nonstopmode final.tex
```

*Note: This document merges and supersedes all previous 'SSRN Protocol' or 'Formatting Canonical' files.*
