# Soumit Public API & Model Context Protocol (MCP) Server

[![MIT License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![OpenAPI 3.1](https://img.shields.io/badge/OpenAPI-3.1-6BA539?logo=openapiinitiative&logoColor=white)](openapi.json)
[![Décret 2-22-431](https://img.shields.io/badge/Maroc-Décret_2--22--431-008751)](https://soumit.ma)
[![MCP Protocol](https://img.shields.io/badge/MCP-2024--11--05-7B1FA2?logo=anthropic&logoColor=white)](https://modelcontextprotocol.io/)
[![CI Status](https://github.com/vext-ma/soumit-public-api/actions/workflows/ci.yml/badge.svg)](https://github.com/vext-ma/soumit-public-api/actions)
[![VEXT AI](https://img.shields.io/badge/Organization-vext--ma-black)](https://vext.ma)

Official Public API, Model Context Protocol (MCP) server, and Autonomous Agent toolkits for **[Soumit](https://soumit.ma)** — Morocco's Public Procurement & Tender Intelligence Engine, built and operated by **[VEXT AI](https://vext.ma)**.

Soumit connects Large Language Models (**Claude 3.7 / Opus 3.5**, **ChatGPT / GPT-4o**, **Gemini 2.0 / 3.8**, **Cursor**, **Windsurf**, and **Autonomous Agents**) directly to Morocco's public procurement corpus (*Marchés Publics Maroc*), statutory compliance calculators under **Décret n° 2-22-431**, and buyer payment delay telemetry under **Loi n° 69-21**.

---

## 📦 What is in this Repository

| Asset | Description | Path |
| :--- | :--- | :--- |
| **MCP Server (14 Tools)** | Stdio JSON-RPC 2.0 & Streamable HTTP Model Context Protocol server | [`src/index.ts`](src/index.ts), [`mcp-server/`](mcp-server/) |
| **OpenAPI 3.1 Contract** | Full REST contract for all 24 Soumit public endpoints | [`openapi.json`](openapi.json) |
| **ChatGPT OpenAPI Spec** | OpenAPI 3.0 specification optimized for ChatGPT Custom GPT Actions | [`chatgpt-openapi.json`](chatgpt-openapi.json) |
| **OpenAPI v3.0 Spec** | Lightweight OpenAPI 3.0 contract | [`openapi-v3.0.json`](openapi-v3.0.json) |
| **Postman Collection v2.1** | Ready-to-import Postman test collection with sample payloads | [`soumit-procurement-api.postman_collection.json`](soumit-procurement-api.postman_collection.json) |
| **Claude Code Skill** | Skill definition for Anthropic's Claude Code CLI | [`.claude/skills/soumit-tenders/SKILL.md`](.claude/skills/soumit-tenders/SKILL.md) |
| **Claude Desktop Config** | Plug-and-play desktop configuration for Claude Desktop | [`docs/claude/claude_desktop_config.json`](docs/claude/claude_desktop_config.json) |
| **Custom GPT Instructions** | Master system prompt, instructions, and conversation starters | [`docs/chatgpt/CUSTOM_GPT_INSTRUCTIONS.md`](docs/chatgpt/CUSTOM_GPT_INSTRUCTIONS.md) |
| **Antigravity / Gemini Skill** | Skill file for Antigravity & Google Gemini workflows | [`skills/soumit-tenders/SKILL.md`](skills/soumit-tenders/SKILL.md) |
| **Cursor MCP Config** | Stdio MCP configuration for Cursor IDE | [`.cursor/mcp.json`](.cursor/mcp.json) |
| **Windsurf MCP Config** | Stdio MCP configuration for Windsurf IDE | [`.codeium/windsurf/mcp_config.json`](.codeium/windsurf/mcp_config.json) |
| **Smithery 1-Click Install** | Registry configuration for Smithery.ai | [`smithery.yaml`](smithery.yaml) |

---

## ⚖️ Moroccan Legal Framework (Décret n° 2-22-431 & Loi n° 69-21)

Every tool and calculation strictly adheres to the statutory provisions published in the *Bulletin Officiel du Royaume du Maroc* (BO n° 7176):

| Rule / Subject | Statutory Article | Formula / Criteria | Legal Consequence |
| :--- | :--- | :--- | :--- |
| **Offre Excessive** | **Article 44 § 4** | $\text{Offre} > 1.20 \times \text{Estimation Administrative}$ | **Rejet d'office immédiat** |
| **Offre Anormalement Basse (Travaux)** | **Article 44 § 1 & 45** | $\text{Offre} < 0.80 \times \text{Estimation Administrative}$ (-20%) | Justifications écrites obligatoires sous peine de rejet |
| **Offre Anormalement Basse (Fournitures & Services)** | **Article 44 § 2 & 45** | $\text{Offre} < 0.75 \times \text{Estimation Administrative}$ (-25%) | Justifications écrites obligatoires sous peine de rejet |
| **Cautionnement Provisoire (Caution bancaire)** | **Articles 23 & 27** | Exigé par le Règlement de Consultation (RC) | Rejet d'office si manquant ou non conforme |
| **Modèle Déclaration sur l'Honneur** | **Article 27 § A** | Conforme au Décret 2-22-431 (post-01/09/2023) | Rejet immédiat si utilisation des anciens modèles |
| **Plafond Délais de Paiement** | **Loi n° 69-21** | Maximum légal : **60 jours** | Suivi ODP et pénalités de retard |
| **Quota TPME Marocaines** | **Article 148** | **30% minimum** réservé aux TPME / coopératives | Obligation nationale pour les acheteurs publics |

---

## 🚀 Quick Setup & Integrations

### 1. Claude Desktop

Add `@vext-ma/soumit-public-api` (or `soumit-mcp`) to your `claude_desktop_config.json`:

- **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "soumit-procurement": {
      "command": "npx",
      "args": ["-y", "@vext-ma/soumit-public-api"],
      "env": {
        "SOUMIT_API_URL": "https://soumit.ma",
        "SOUMIT_API_KEY": ""
      }
    }
  }
}
```

Or connect directly over **Streamable HTTP**:
```json
{
  "mcpServers": {
    "soumit-direct": {
      "url": "https://soumit.ma/api/mcp",
      "transport": "streamable-http"
    }
  }
}
```

---

### 2. Claude Code CLI

Link the Soumit skill into Claude Code:

```bash
mkdir -p ~/.claude/skills
cp -r .claude/skills/soumit-tenders ~/.claude/skills/
```

Test it in Claude Code:
> *"Audit the compliance of an offer of 850,000 MAD HT for a supplies tender estimated at 1,200,000 MAD HT under Décret 2-22-431."*

---

### 3. Cursor IDE

Place [`.cursor/mcp.json`](.cursor/mcp.json) in your project root or configure in **Cursor Settings → Features → MCP**:

```json
{
  "mcpServers": {
    "soumit": {
      "command": "npx",
      "args": ["-y", "@vext-ma/soumit-public-api"],
      "env": {
        "SOUMIT_API_URL": "https://soumit.ma",
        "SOUMIT_API_KEY": ""
      }
    }
  }
}
```

---

### 4. Windsurf IDE

Place [`.codeium/windsurf/mcp_config.json`](.codeium/windsurf/mcp_config.json) in your workspace:

```json
{
  "mcpServers": {
    "soumit": {
      "command": "node",
      "args": ["dist/index.js"],
      "env": {
        "SOUMIT_API_URL": "https://soumit.ma",
        "SOUMIT_API_KEY": ""
      }
    }
  }
}
```

---

### 5. ChatGPT Custom GPT

1. Create a Custom GPT in OpenAI GPT Builder.
2. Copy the system prompt and conversation starters from [`docs/chatgpt/CUSTOM_GPT_INSTRUCTIONS.md`](docs/chatgpt/CUSTOM_GPT_INSTRUCTIONS.md).
3. Under **Actions**, click **Import from URL** or paste [`chatgpt-openapi.json`](chatgpt-openapi.json).
4. Save and publish.

---

### 6. Smithery 1-Click Install

Install automatically via [Smithery.ai](https://smithery.ai):

```bash
npx -y @smithery/cli install @vext-ma/soumit-public-api --client claude
```

---

## 🛠️ Complete Catalog of 14 MCP Tools

### 1. `search_tenders`
Search active Moroccan public procurement notices by keyword, sector (`travaux`, `fournitures`, `services`, `sante`, `it`), and estimated budget.
- **Parameters**: `query` (string), `sector` (string), `min_amount` (number), `limit` (number).

### 2. `get_tender_details`
Retrieve comprehensive consultation package summary (DCE), estimated budget, required provisional guarantee (Art. 23), eliminatory criteria, and Go/No-Go score.
- **Parameters**: `tender_id` (string, required).

### 3. `check_regulatory_compliance`
Compute statutory price corridors under Décret n° 2-22-431 (Articles 44 & 45). Automatically evaluates whether a proposed bid is compliant, abnormally low, or excessive.
- **Parameters**: `estimated_amount_ht` (number, required), `proposed_amount_ht` (number, required), `sector_type` (`"travaux"` | `"fournitures"` | `"services"`).

### 4. `search_competitor_awards`
Competitive intelligence on Moroccan suppliers: historical wins, winning amounts, public buyer partners, and disqualification reasons.
- **Parameters**: `competitor_name` (string, required), `limit` (number).

### 5. `get_company_profile`
360° company lookup combining official Moroccan corporate registry identity (15-digit ICE, RC, IF, CNSS, legal form, capital) with public procurement award history.
- **Parameters**: `company_query` (string), `ice` (string).

### 6. `search_bpu_articles`
Search tenders by specific line items or materials in unit price schedules (BPU / CPS), including technical standards, medical equipment, and specifications.
- **Parameters**: `article_query` (string, required), `limit` (number).

### 7. `audit_submission_checklist`
Crash-test administrative submission packages before bid opening to eliminate immediate disqualification risks under Articles 27 & 28.
- **Parameters**: `tender_reference` (string, required), `has_provisional_guarantee` (boolean), `provisional_guarantee_amount` (number), `has_declaration_on_honor` (boolean), `has_site_visit_certificate` (boolean).

### 8. `execute_procurement_intent`
Agentic execution framework: converts business intent into a typed contract, verifies regulatory authority, extracts grounded evidence anchors, and returns a governance portal URL.
- **Parameters**: `raw_prompt` (string, required), `caller_role` (enum), `proposed_amount_mad` (number), `tender_reference` (string).

### 9. `verify_evidence_chain`
Cryptographically verify SHA-256 integrity of consultation artifacts (CPS, RC, PV) archived in sovereign storage (Backblaze B2 / Cloudflare R2).
- **Parameters**: `storage_uri` (string, required), `expected_sha256` (string, required).

### 10. `submit_portal_recourse`
Action a recourse on the portal: human verdict override, ambiguity alert, or Article 22 clarification request with audit logging.
- **Parameters**: `contract_id` (string, required), `action` (enum, required), `rationale` (string, required), `actor_identity` (string, required).

### 11. `get_execution_audit_trail`
Inspect tamper-evident execution audit log for compliance and corporate governance.
- **Parameters**: `contract_id` (string, required).

### 12. `search_market_mentions`
Social and market signal detection: monitor disputes, legal jurisprudence, delayed payment allegations, and regulatory updates.
- **Parameters**: `query` (string), `topic` (enum), `min_risk` (enum), `limit` (number).

### 13. `get_buyer_intelligence`
Public buyer profile: historical purchasing volume, payment delay track record under **Loi n° 69-21**, 60-day legal ceiling compliance, and cashflow risk score from the Observatoire des Délais de Paiement (ODP).
- **Parameters**: `buyer_query` (string, required).

### 14. `get_market_barometer`
Macroeconomic barometer of public procurement in Morocco: total active budget volume in MAD, regional breakdown, and Article 148 TPME 30% quota compliance.
- **Parameters**: `period` (string).

---

## 💻 Programmatic TypeScript / Node.js SDK Usage

You can also import the regulatory compliance engine directly into your code:

```typescript
import { computeDecreeCompliance } from "@vext-ma/soumit-public-api";

// 1. Test a supplies offer (-15% discount)
const result = computeDecreeCompliance({
  estimatedAmountHt: 2_000_000,
  proposedAmountHt: 1_700_000,
  sectorType: "fournitures"
});

console.log(result.status); 
// "CONFORME"
console.log(result.floorAmount); 
// 1500000 MAD (-25%)
console.log(result.ceilingAmount); 
// 2400000 MAD (+20%)

// 2. Test a construction / works offer (-24% discount)
const lowWorks = computeDecreeCompliance({
  estimatedAmountHt: 5_000_000,
  proposedAmountHt: 3_800_000,
  sectorType: "travaux"
});

console.log(lowWorks.status); 
// "OFFRE_ANORMALEMENT_BASSE"
console.log(lowWorks.advisory); 
// "⚠️ Votre offre est inférieure de 24.0% à l'estimation administrative (seuil de tolérance: -20%)..."
```

---

## 🔒 Tenancy, Privacy & Data Sovereignty

- **Moroccan Law n° 09-08 (CNDP) Compliance**: Sourced exclusively from lawful administrative notices, gazettes, and official procurement records.
- **Zero Raw Document Egress**: Third-party consultation files (DCE) are processed and indexed within secure, sovereign edge boundaries.
- **Fail-Closed Privacy**: Prompts, catalogue items, and internal pricing strategies are never logged, cached, or used for model training.

---

## 🧪 Testing & CI

Run the automated test suite locally:

```bash
npm install
npm test
```

All 7 test suites validate tool schemas, Décret 2-22-431 corridor calculations, checklist crash tests, and evidence verification.

---

## 🏢 Company & Resources

- **Official Platform**: [https://soumit.ma](https://soumit.ma)
- **VEXT AI**: [https://vext.ma](https://vext.ma)
- **GitHub Organization**: [https://github.com/vext-ma](https://github.com/vext-ma)
- **Email Inquiries**: [contact@vext.ma](mailto:contact@vext.ma)

---

## 📄 License

This repository and all associated toolkits are released under the [MIT License](LICENSE).  
Copyright © 2026 **VEXT AI**. Casablanca, Morocco.
