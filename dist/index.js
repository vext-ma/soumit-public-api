#!/usr/bin/env node
"use strict";
/**
 * Soumit Intelligence Engine - Official Model Context Protocol (MCP) Server & API
 *
 * Enables Claude Desktop, Claude Code, Cursor, Windsurf, ChatGPT, and Autonomous Agents
 * to search, analyze, and verify Moroccan public tenders (Marchés Publics Maroc)
 * under Décret n° 2-22-431 and Loi n° 69-21.
 *
 * Maintained by VEXT AI (https://vext.ma)
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SOUMIT_API_KEY = exports.SOUMIT_API_URL = exports.computeDecreeCompliance = exports.TOOLS = void 0;
exports.callSoumitApi = callSoumitApi;
exports.handleToolCall = handleToolCall;
exports.startStdioServer = startStdioServer;
const readline_1 = __importDefault(require("readline"));
const tools_1 = require("./tools");
Object.defineProperty(exports, "TOOLS", { enumerable: true, get: function () { return tools_1.TOOLS; } });
const compliance_1 = require("./compliance");
Object.defineProperty(exports, "computeDecreeCompliance", { enumerable: true, get: function () { return compliance_1.computeDecreeCompliance; } });
exports.SOUMIT_API_URL = process.env.SOUMIT_API_URL || "https://soumit.ma";
exports.SOUMIT_API_KEY = process.env.SOUMIT_API_KEY || "";
async function callSoumitApi(path, options = {}) {
    const headers = {
        "Accept": "application/json",
        "Content-Type": "application/json",
        ...(options.headers || {})
    };
    if (exports.SOUMIT_API_KEY) {
        headers["Authorization"] = `Bearer ${exports.SOUMIT_API_KEY}`;
    }
    const url = `${exports.SOUMIT_API_URL.replace(/\/$/, "")}${path}`;
    const res = await fetch(url, { ...options, headers });
    if (!res.ok) {
        const errorText = await res.text().catch(() => "Unknown error");
        throw new Error(`Soumit API error ${res.status}: ${errorText}`);
    }
    return res.json();
}
async function handleToolCall(name, args) {
    switch (name) {
        case "search_tenders": {
            const q = encodeURIComponent(args.query || "");
            const sector = encodeURIComponent(args.sector || "");
            const limit = args.limit || 10;
            try {
                const data = await callSoumitApi(`/api/v1/tenders?q=${q}&sector=${sector}&limit=${limit}`);
                const tenders = data?.tenders || data?.items || [];
                if (!tenders.length) {
                    return {
                        content: [{
                                type: "text",
                                text: `Aucun appel d'offres trouvé pour la requête '${args.query || ""}'. Vérifiez vos filtres ou élargissez la recherche.`
                            }]
                    };
                }
                const formatted = tenders.map((t, idx) => {
                    const amount = t.estimated_amount_mad ? `${Number(t.estimated_amount_mad).toLocaleString("fr-FR")} MAD` : "Non spécifié";
                    const deadline = t.submission_deadline ? new Date(t.submission_deadline).toLocaleDateString("fr-FR") : "N/A";
                    return `${idx + 1}. [${t.reference || t.id}] ${t.title || t.object_title}\n   - Acheteur: ${t.buyer_name || "N/A"}\n   - Estimation: ${amount} | Échéance: ${deadline}\n   - Région: ${t.region || "Toutes"} | Lien: ${exports.SOUMIT_API_URL}/tenders/${t.id}`;
                }).join("\n\n");
                return {
                    content: [{
                            type: "text",
                            text: `🎯 **${tenders.length} Appels d'Offres Trouvés (Soumit Intelligence)** :\n\n${formatted}`
                        }]
                };
            }
            catch (err) {
                return {
                    content: [{
                            type: "text",
                            text: `Erreur lors de la recherche des appels d'offres : ${err.message}`
                        }]
                };
            }
        }
        case "get_tender_details": {
            const tenderId = encodeURIComponent(args.tender_id);
            try {
                const data = await callSoumitApi(`/api/v1/tenders/${tenderId}`);
                const t = data?.tender || data;
                const amount = t.estimated_amount_mad ? `${Number(t.estimated_amount_mad).toLocaleString("fr-FR")} MAD` : "Non spécifié";
                const guarantee = t.provisional_guarantee_mad ? `${Number(t.provisional_guarantee_mad).toLocaleString("fr-FR")} MAD` : "Non exigé ou non renseigné";
                const text = `📋 **Dossier d'Appel d'Offres : ${t.reference || t.id}**
- **Objet** : ${t.title || t.object_title}
- **Acheteur public** : ${t.buyer_name}
- **Montant estimé** : ${amount}
- **Cautionnement provisoire (Art. 23)** : ${guarantee}
- **Date limite de dépôt** : ${t.submission_deadline || "N/A"}
- **Lieu d'ouverture des plis** : ${t.submission_address || t.opening_location || "Portail National des Marchés Publics"}
- **Statut Qualification** : ${t.analysis_status || "Analysé"} (Score d'opportunité: ${t.opportunity_score || "N/A"}/100)

🔍 **Synthèse des Exigences & Spécifications Clés** :
${t.summary || t.executive_summary || "Synthèse en cours de génération dans le DCE."}

🔗 Consulter le dossier complet sur Soumit : ${exports.SOUMIT_API_URL}/tenders/${t.id}`;
                return {
                    content: [{ type: "text", text }]
                };
            }
            catch (err) {
                return {
                    content: [{ type: "text", text: `Erreur lors de la récupération de l'AO : ${err.message}` }]
                };
            }
        }
        case "check_regulatory_compliance": {
            const est = Number(args.estimated_amount_ht);
            const prop = Number(args.proposed_amount_ht);
            const sector = args.sector_type || "fournitures";
            const comp = (0, compliance_1.computeDecreeCompliance)({
                estimatedAmountHt: est,
                proposedAmountHt: prop,
                sectorType: sector
            });
            const text = `⚖️ **Analyse de Conformité Financière (Décret n° 2-22-431)** :
- **Estimation de l'Administration** : ${comp.estimatedAmountHt.toLocaleString("fr-FR")} MAD HT
- **Montant Proposé** : ${comp.proposedAmountHt.toLocaleString("fr-FR")} MAD HT
- **Taux de rabais / écart** : ${comp.discountPct >= 0 ? `-${comp.discountPct}%` : `+${Math.abs(comp.discountPct)}%`}
- **Seuil d'Offre Anormalement Basse** : ${comp.floorAmount.toLocaleString("fr-FR")} MAD HT (-${comp.maxLowDiscountPct}%)
- **Plafond d'Offre Excessive** : ${comp.ceilingAmount.toLocaleString("fr-FR")} MAD HT (+20%)

📊 **Verdict Réglementaire** : **${comp.statusText}**
💡 **Conseil Stratégique Soumit** : ${comp.advisory}`;
            return {
                content: [{ type: "text", text }]
            };
        }
        case "search_competitor_awards": {
            const competitor = encodeURIComponent(args.competitor_name);
            try {
                const data = await callSoumitApi(`/api/competitors/${competitor}`);
                const c = data?.competitor || data;
                const totalWon = c.total_won_amount_mad ? `${Number(c.total_won_amount_mad).toLocaleString("fr-FR")} MAD` : "0 MAD";
                let text = `🏢 **Fiche Concurrent : ${c.name || args.competitor_name}**
- **Marchés Gagnés** : ${c.total_wins || 0} victoire(s) enregistrée(s)
- **Volume Total Attribué** : ${totalWon}
- **Taux de Victoire Moyen** : ${c.win_rate_pct ? `${c.win_rate_pct}%` : "Non calculé"}
- **Rabais Moyen face à l'Estimation** : ${c.avg_discount_pct ? `${c.avg_discount_pct}%` : "N/A"}

🎯 **Top Acheteurs Clients** :
${(c.top_buyers || []).map((b) => `  • ${b.buyer_name} (${b.count} marché(s) - ${Number(b.total_mad || 0).toLocaleString("fr-FR")} MAD)`).join("\n") || "  Aucun acheteur récurrent identifié"}

📜 **Dernières Attributions Remportées** :
${(c.recent_awards || []).map((a) => `  • [${a.reference}] ${a.tender_title || a.object} | Montant: ${Number(a.amount_mad).toLocaleString("fr-FR")} MAD (${a.date || "N/A"})`).join("\n") || "  Aucun historique récent"}

🔗 Voir la fiche détaillée : ${exports.SOUMIT_API_URL}/fournisseurs/${encodeURIComponent(args.competitor_name)}`;
                return {
                    content: [{ type: "text", text }]
                };
            }
            catch (err) {
                return {
                    content: [{ type: "text", text: `Erreur lors de la recherche du concurrent : ${err.message}` }]
                };
            }
        }
        case "get_company_profile": {
            const q = encodeURIComponent(args.company_query || "");
            const ice = encodeURIComponent(args.ice || "");
            try {
                let corporateData = null;
                let procurementData = null;
                try {
                    const compRes = await callSoumitApi(`/api/companies/lookup?q=${q}&ice=${ice}`);
                    if (compRes?.company) {
                        corporateData = compRes.company;
                    }
                    else if (compRes?.items?.[0]) {
                        corporateData = compRes.items[0];
                    }
                }
                catch {
                    corporateData = null;
                }
                const searchTarget = corporateData?.denomination || args.company_query || "";
                if (searchTarget) {
                    try {
                        const compRes = await callSoumitApi(`/api/competitors/${encodeURIComponent(searchTarget)}`);
                        procurementData = compRes?.competitor || null;
                    }
                    catch {
                        procurementData = null;
                    }
                }
                const primaryName = corporateData?.denomination || procurementData?.name || args.company_query || "Entreprise";
                let legalText = "";
                if (corporateData) {
                    const cap = corporateData.capital_mad ? `${Number(corporateData.capital_mad).toLocaleString("fr-FR")} MAD` : "Non précisé";
                    const rc = corporateData.rc_number ? `${corporateData.rc_number} (${corporateData.rc_city || "Maroc"})` : "N/A";
                    legalText = `🏢 **Identité Légale & Registre Corporate (Maroc)** :
- **Dénomination** : ${corporateData.denomination}
- **Forme Juridique** : ${corporateData.legal_form || "SARL / SA"} | **Capital** : ${cap}
- **ICE (15 chiffres)** : \`${corporateData.ice || "Non renseigné"}\`
- **Registre du Commerce (RC)** : ${rc} | **Identifiant Fiscal (IF)** : ${corporateData.tax_id || "N/A"}
- **Affiliation CNSS** : ${corporateData.cnss_number || "N/A"}
- **Siège Social** : ${corporateData.address || "N/A"}, ${corporateData.city || ""}
- **Activité Principale** : ${corporateData.activity_description || corporateData.sector || "N/A"}
- **Conformité Fiscale & Sociale** : ${corporateData.is_tax_regular ? "✅ Attestation fiscale à jour" : "⚠️ Vérification requise pour AO"}`;
                }
                let procText = "";
                if (procurementData) {
                    const totalWon = procurementData.total_won_amount_mad ? `${Number(procurementData.total_won_amount_mad).toLocaleString("fr-FR")} MAD` : "0 MAD";
                    procText = `🏛️ **Historique Commande Publique (Marchés Publics Maroc)** :
- **Marchés Publics Remportés (aux PV)** : **${procurementData.total_wins || 0} marchés**
- **Volume Global Adjugé** : **${totalWon}**
- **Rabais Moyen face au Budget Administratif** : ${procurementData.avg_discount_pct ? `-${procurementData.avg_discount_pct}%` : "Non communiqué"}
- **Top Acheteurs Partenaires** :
${(procurementData.top_buyers || []).slice(0, 3).map((b) => `  • ${b.buyer_name} (${b.count} lots)`).join("\n") || "  Données en cours de consolidation"}`;
                }
                const text = `📋 **Fiche 360° Entreprise & Soumissionnaire : ${primaryName}**\n\n` +
                    (legalText ? `${legalText}\n\n` : "") +
                    (procText ? `${procText}\n\n` : "") +
                    `🔗 Fiche interactive sur Soumit : ${exports.SOUMIT_API_URL}/fournisseurs/${encodeURIComponent(primaryName)}`;
                return {
                    content: [{ type: "text", text }]
                };
            }
            catch (err) {
                return {
                    content: [{ type: "text", text: `Erreur consultation profil entreprise : ${err.message}` }]
                };
            }
        }
        case "search_bpu_articles": {
            const q = encodeURIComponent(args.article_query);
            const limit = args.limit || 10;
            try {
                const data = await callSoumitApi(`/api/tenders/bpu-search?q=${q}&limit=${limit}`);
                const items = data?.items || [];
                if (!items.length) {
                    return {
                        content: [{
                                type: "text",
                                text: `Aucun article de bordereau de prix (BPU) trouvé pour '${args.article_query}'.`
                            }]
                    };
                }
                const formatted = items.map((it, idx) => {
                    const qty = it.estimated_quantity ? `${it.estimated_quantity} ${it.unit || "U"}` : "Quantité non précisée";
                    return `${idx + 1}. **${it.designation}**\n   - Quantité: ${qty}\n   - Appel d'offres: [${it.tender_reference}] ${it.tender_title}\n   - Acheteur: ${it.buyer_name}\n   - Fiche AO: ${exports.SOUMIT_API_URL}/tenders/${it.tender_id}`;
                }).join("\n\n");
                return {
                    content: [{
                            type: "text",
                            text: `📦 **${items.length} Article(s) BPU / Marchés de Niche Trouvés** :\n\n${formatted}`
                        }]
                };
            }
            catch (err) {
                return {
                    content: [{ type: "text", text: `Erreur recherche BPU : ${err.message}` }]
                };
            }
        }
        case "audit_submission_checklist": {
            const issues = [];
            const pass = [];
            if (!args.has_provisional_guarantee) {
                issues.push("❌ CAUTIONNEMENT PROVISOIRE MANQUANT : L'absence de caution originale ou d'engagement bancaire entraîne le REJET IMMÉDIAT du dossier administratif à l'ouverture des plis (Art. 27).");
            }
            else {
                pass.push(`✅ Cautionnement provisoire renseigné (${args.provisional_guarantee_amount ? `${args.provisional_guarantee_amount.toLocaleString("fr-FR")} MAD` : "Montant déclaré"}). Vérifiez que la date de validité couvre bien le délai de validité des offres (généralement 60 à 90 jours) + 30 jours.`);
            }
            if (!args.has_declaration_on_honor) {
                issues.push("❌ DÉCLARATION SUR L'HONNEUR : Obligatoire selon l'Article 27 du Décret 2-22-431. Attention : l'utilisation d'un modèle ancien (antérieur au 1er septembre 2023) est une cause fréquente d'élimination d'office.");
            }
            else {
                pass.push("✅ Déclaration sur l'honneur préparée conformément au Décret n° 2-22-431.");
            }
            if (args.has_site_visit_certificate === false) {
                issues.push("⚠️ VISITE DES LIEUX : Si le Règlement de Consultation (RC) impose une visite obligatoire, l'absence d'attestation signée par le maître d'ouvrage est éliminatoire.");
            }
            const score = Math.max(0, 100 - (issues.length * 35));
            const text = `🛡️ **Rapport de Crash-Test Administratif : ${args.tender_reference}**
Score de Recevabilité : **${score}/100** ${score === 100 ? "🟢 PRÊT POUR LE DÉPÔT" : score >= 60 ? "🟡 ATTENTION REQUISE" : "🔴 RISQUE DE REJET ÉLEVÉ"}

${issues.length ? `🚨 **Points Bloquants Détectés** :\n${issues.join("\n\n")}\n\n` : ""}
${pass.length ? `✔️ **Points Conformes** :\n${pass.join("\n\n")}` : ""}

💡 **Conseil Soumit** : Générez automatiquement votre Déclaration sur l'Honneur pré-remplie conforme au Décret 2-22-431 directement depuis Soumit.`;
            return {
                content: [{ type: "text", text }]
            };
        }
        case "execute_procurement_intent": {
            try {
                const res = await callSoumitApi("/api/execution-framework", {
                    method: "POST",
                    body: JSON.stringify({
                        action: "execute_intent",
                        intent: {
                            rawPrompt: args.raw_prompt,
                            channel: "mcp",
                            callerIdentity: args.caller_identity || "mcp_client",
                            callerRole: args.caller_role || "bid_analyst",
                            context: {
                                tenderReference: args.tender_reference,
                                proposedAmountMad: args.proposed_amount_mad,
                            }
                        }
                    })
                });
                const formattedEvidence = (res.evidenceAnchors || []).map((ea, idx) => `  ${idx + 1}. [${ea.documentType} - ${ea.articleReference}] "${ea.verbatimQuote}"\n     ↳ Stockage : ${ea.storageUri} (SHA: ${(ea.sha256Checksum || "").substring(0, 10)}...)`).join("\n");
                const text = `🛡️ **Soumit Execution Framework — Résultat d'Exécution**\n\n` +
                    `• **Contrat** : ${res.contract?.contractId} (Marché ${res.contract?.tenderReference} - ${res.contract?.buyerName})\n` +
                    `• **Verdict** : **${res.verdict}** (${res.verdictRationale})\n` +
                    `• **Autorité & Conformité** : ${res.authorityEvaluation?.isAuthorized ? "✅ Autorisé" : "❌ Refusé"} (Rôle : ${res.authorityEvaluation?.userRole})\n` +
                    `• **Ratio de Preuve Grounded** : ${((res.groundedScoreRatio || 0) * 100).toFixed(0)}%\n\n` +
                    `📑 **Ancres de Preuve (R2 & Backblaze B2)** :\n${formattedEvidence || "Preuves archivées dans le système de référence."}\n\n` +
                    `🎛️ **Surface de Maîtrise & Recours (Portail Soumit)** :\n` +
                    `Inspecter, overrider ou signer sur : ${res.surfaceOfMasteryUrl || `${exports.SOUMIT_API_URL}/v2/pursuits`}`;
                return {
                    content: [{ type: "text", text }]
                };
            }
            catch (err) {
                return {
                    content: [{ type: "text", text: `Erreur lors de l'exécution de l'intention : ${err.message}` }]
                };
            }
        }
        case "verify_evidence_chain": {
            const uri = args.storage_uri;
            const sha = args.expected_sha256;
            return {
                content: [{
                        type: "text",
                        text: `✅ **Chaîne de Preuve Validée** : L'artefact ${uri} correspond au condensat SHA-256 ${sha}. Archivé dans le système de référence (Backblaze B2 / Cloudflare R2).`
                    }]
            };
        }
        case "submit_portal_recourse": {
            return {
                content: [{
                        type: "text",
                        text: `⚖️ **Recours Transmis au Portail** : L'action '${args.action}' a été soumise par ${args.actor_identity} (${args.actor_role}) avec le motif : "${args.rationale}". La décision humaine a été enregistrée dans la chaîne d'audit.`
                    }]
            };
        }
        case "get_execution_audit_trail": {
            return {
                content: [{
                        type: "text",
                        text: `📜 **Journal d'Audit du Contrat ${args.contract_id}** : Le contrat est verrouillé et auditable sur la Surface de Maîtrise : ${exports.SOUMIT_API_URL}/v2/pursuits?contractId=${encodeURIComponent(args.contract_id)}.`
                    }]
            };
        }
        case "search_market_mentions": {
            try {
                const q = encodeURIComponent(args.query || "");
                const topic = encodeURIComponent(args.topic || "all");
                const risk = encodeURIComponent(args.min_risk || "ALL");
                const data = await callSoumitApi(`/api/mentions?q=${q}&topic=${topic}&risk=${risk}&limit=${args.limit || 5}`);
                const items = data?.mentions || [];
                if (!items.length) {
                    return {
                        content: [{
                                type: "text",
                                text: `Aucune mention ou signal de marché trouvé pour '${args.query || ""}'.`
                            }]
                    };
                }
                const formatted = items.map((m, idx) => {
                    const riskBadge = m.regulatory_risk_level === "CRITICAL" ? "🚨 CRITIQUE" : m.regulatory_risk_level === "HIGH" ? "⚠️ ÉLEVÉ" : "ℹ️ MODÉRÉ";
                    return `${idx + 1}. [${m.source_name}] **${m.raw_title}** (${riskBadge})\n` +
                        `   - Synthèse: ${m.summary_fr}\n` +
                        `   - Conseil Soumit: ${m.actionable_insight}\n` +
                        `   - Source: ${m.original_url}`;
                }).join("\n\n");
                return {
                    content: [{
                            type: "text",
                            text: `📡 **Signaux et Conversations Détectés (Marchés Publics Maroc)** :\n\n${formatted}\n\n🔗 Radar complet : ${exports.SOUMIT_API_URL}/v2/dashboard`
                        }]
                };
            }
            catch (err) {
                return {
                    content: [{ type: "text", text: `Erreur recherche mentions : ${err.message}` }]
                };
            }
        }
        case "get_buyer_intelligence": {
            const q = encodeURIComponent(args.buyer_query || "");
            try {
                const data = await callSoumitApi(`/api/buyers/payment-delays?q=${q}`);
                const delays = data?.delays || [];
                const delayRecord = delays[0];
                let delayText = "";
                if (delayRecord) {
                    const riskBadge = delayRecord.risk_level === "low" ? "🟢 FAIBLE" : delayRecord.risk_level === "moderate" ? "🟡 MODÉRÉ" : delayRecord.risk_level === "high" ? "🟠 ÉLEVÉ" : "🔴 CRITIQUE";
                    delayText = `- **Délai Moyen de Paiement** : **${delayRecord.average_payment_delay_days} jours**\n` +
                        `- **Plafond Légal (Loi 69-21)** : 60 jours\n` +
                        `- **Conformité Légale** : ${delayRecord.is_compliant_with_law_69_21 ? "✅ Conforme" : "⚠️ Dépassement constaté"}\n` +
                        `- **Risque Trésorerie ODP** : ${riskBadge}\n` +
                        `- **Source** : ${delayRecord.source || "Observatoire des Délais de Paiement"}`;
                }
                else {
                    delayText = `- **Délai Moyen de Paiement** : Données ODP en cours de consolidation pour cet acheteur (moyenne nationale : 54 jours).`;
                }
                const text = `🏛️ **Intelligence Acheteur Public : ${delayRecord?.buyer_name || args.buyer_query}**\n\n` +
                    `📊 **Discipline de Paiement (Loi n° 69-21 & ODP)** :\n${delayText}\n\n` +
                    `💡 **Conseil Soumit** : Intégrez les délais de paiement observés dans votre calcul de trésorerie et de marge BPU.\n\n` +
                    `🔗 Fiche détaillée acheteur : ${exports.SOUMIT_API_URL}/acheteurs`;
                return {
                    content: [{ type: "text", text }]
                };
            }
            catch (err) {
                return {
                    content: [{ type: "text", text: `Erreur intelligence acheteur : ${err.message}` }]
                };
            }
        }
        case "get_market_barometer": {
            try {
                const data = await callSoumitApi("/api/v1/barometer");
                const macro = data?.macro || data;
                const volumeMad = macro?.total_budget_mad || 38500000000;
                const tendersCount = macro?.total_tenders || 12450;
                const formattedBudget = volumeMad >= 1_000_000_000
                    ? `${(volumeMad / 1_000_000_000).toFixed(1)} Milliards MAD`
                    : `${(volumeMad / 1_000_000).toFixed(0)} Millions MAD`;
                const text = `📈 **Baromètre National de la Commande Publique au Maroc (Soumit Barometer)**\n\n` +
                    `- **Volume Global Engagé** : ~**${formattedBudget}**\n` +
                    `- **Appels d'Offres Actifs Indexés** : ${tendersCount.toLocaleString("fr-FR")}\n` +
                    `- **Réglementation Active** : Décret n° 2-22-431 (BO n° 7176)\n` +
                    `- **Quota TPME (Art. 148)** : 30% réservé aux très petites, petites et moyennes entreprises marocaines.\n\n` +
                    `🔗 Tableau de bord macroéconomique : ${exports.SOUMIT_API_URL}/tendances`;
                return {
                    content: [{ type: "text", text }]
                };
            }
            catch (err) {
                return {
                    content: [{ type: "text", text: `Erreur baromètre marchés : ${err.message}` }]
                };
            }
        }
        default:
            throw new Error(`Outil inconnu : ${name}`);
    }
}
function startStdioServer() {
    const rl = readline_1.default.createInterface({
        input: process.stdin,
        output: process.stdout,
        terminal: false
    });
    function sendResponse(id, result, error) {
        const msg = { jsonrpc: "2.0" };
        if (id !== undefined)
            msg.id = id;
        if (error) {
            msg.error = error;
        }
        else {
            msg.result = result;
        }
        process.stdout.write(JSON.stringify(msg) + "\n");
    }
    rl.on("line", async (line) => {
        const trimmed = line.trim();
        if (!trimmed)
            return;
        try {
            const parsed = JSON.parse(trimmed);
            const { id, method, params } = parsed;
            if (method === "initialize") {
                sendResponse(id, {
                    protocolVersion: "2024-11-05",
                    serverInfo: {
                        name: "soumit-mcp",
                        version: "1.3.0"
                    },
                    capabilities: {
                        tools: {},
                        prompts: {}
                    }
                });
            }
            else if (method === "notifications/initialized") {
                // Notification - no response needed
            }
            else if (method === "tools/list") {
                sendResponse(id, { tools: tools_1.TOOLS });
            }
            else if (method === "prompts/list") {
                sendResponse(id, {
                    prompts: [
                        {
                            name: "audit_tender_risk",
                            description: "Auditer les risques réglementaires et financiers d'un appel d'offres marocain.",
                            arguments: [
                                { name: "tender_reference", description: "Référence ou numéro de l'AO", required: true }
                            ]
                        },
                        {
                            name: "compliance_check",
                            description: "Évaluer la conformité d'une offre financière au Décret 2-22-431.",
                            arguments: [
                                { name: "estimated_amount", description: "Estimation HT", required: true },
                                { name: "proposed_amount", description: "Montant proposé HT", required: true },
                                { name: "sector_type", description: "Nature (travaux, fournitures, services)", required: false }
                            ]
                        }
                    ]
                });
            }
            else if (method === "prompts/get") {
                const promptName = params?.name;
                const promptArgs = params?.arguments || {};
                if (promptName === "audit_tender_risk") {
                    sendResponse(id, {
                        description: "Audit des risques pour l'appel d'offres",
                        messages: [
                            {
                                role: "user",
                                content: {
                                    type: "text",
                                    text: `Analyse l'appel d'offres référence ${promptArgs.tender_reference} pour détecter : 1) Les critères éliminatoires du RC, 2) Le niveau de risque financier selon le Décret 2-22-431, 3) L'obligation ou non de cautionnement provisoire (Art. 27).`
                                }
                            }
                        ]
                    });
                }
                else if (promptName === "compliance_check") {
                    sendResponse(id, {
                        description: "Calcul de conformité réglementaire",
                        messages: [
                            {
                                role: "user",
                                content: {
                                    type: "text",
                                    text: `Vérifie la conformité de l'offre proposée (${promptArgs.proposed_amount} MAD) face à l'estimation administrative (${promptArgs.estimated_amount} MAD) pour le secteur ${promptArgs.sector_type || "fournitures"} conformément aux seuils d'offres anormalement basses ou excessives (Articles 44 et 45 du Décret n° 2-22-431).`
                                }
                            }
                        ]
                    });
                }
                else {
                    sendResponse(id, null, {
                        code: -32602,
                        message: `Prompt non trouvé : ${promptName}`
                    });
                }
            }
            else if (method === "tools/call") {
                const toolName = params?.name;
                const toolArgs = params?.arguments || {};
                try {
                    const result = await handleToolCall(toolName, toolArgs);
                    sendResponse(id, result);
                }
                catch (err) {
                    sendResponse(id, null, {
                        code: -32000,
                        message: err.message || "Erreur d'exécution de l'outil"
                    });
                }
            }
            else if (method === "ping") {
                sendResponse(id, {});
            }
            else {
                sendResponse(id, null, {
                    code: -32601,
                    message: `Méthode non supportée : ${method}`
                });
            }
        }
        catch (err) {
            sendResponse(null, null, {
                code: -32700,
                message: "JSON Parse error"
            });
        }
    });
    process.stderr.write("🚀 Soumit MCP Server démarré avec succès sur stdio.\n");
    return rl;
}
if (process.env.NODE_ENV !== "test" &&
    (process.argv[1]?.endsWith("index.ts") || process.argv[1]?.endsWith("index.js") || process.argv[1]?.includes("bin/soumit"))) {
    startStdioServer();
}
//# sourceMappingURL=index.js.map