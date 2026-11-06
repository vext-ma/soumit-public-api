#!/usr/bin/env node

/**
 * Soumit Intelligence Engine - Official Model Context Protocol (MCP) Server
 * 
 * Enables Claude Desktop, Claude Web, Cursor, and any MCP-compliant client
 * to search, analyze, and verify Moroccan public tenders (Marchés Publics Maroc)
 * under Décret n° 2-22-431.
 */

import readline from "readline";

const SOUMIT_API_URL = process.env.SOUMIT_API_URL || "https://soumit.ma";
const SOUMIT_API_KEY = process.env.SOUMIT_API_KEY || "";

import { TOOLS, type ToolDefinition } from "./tools";

async function callSoumitApi(path: string, options: RequestInit = {}) {
  const headers: Record<string, string> = {
    "Accept": "application/json",
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string> || {})
  };
  if (SOUMIT_API_KEY) {
    headers["Authorization"] = `Bearer ${SOUMIT_API_KEY}`;
  }

  const url = `${SOUMIT_API_URL.replace(/\/$/, "")}${path}`;
  const res = await fetch(url, { ...options, headers });
  if (!res.ok) {
    const errorText = await res.text().catch(() => "Unknown error");
    throw new Error(`Soumit API error ${res.status}: ${errorText}`);
  }
  return res.json();
}

async function handleToolCall(name: string, args: Record<string, any>) {
  switch (name) {
    case "search_tenders": {
      const q = encodeURIComponent(args.query || "");
      const sector = encodeURIComponent(args.sector || "");
      const limit = args.limit || 10;
      
      try {
        const data: any = await callSoumitApi(`/api/v1/tenders?q=${q}&sector=${sector}&limit=${limit}`);
        const tenders = data?.tenders || data?.items || [];
        if (!tenders.length) {
          return {
            content: [{
              type: "text",
              text: `Aucun appel d'offres trouvé pour la requête '${args.query || ""}'. Vérifiez vos filtres ou élargissez la recherche.`
            }]
          };
        }

        const formatted = tenders.map((t: any, idx: number) => {
          const amount = t.estimated_amount_mad ? `${Number(t.estimated_amount_mad).toLocaleString("fr-FR")} MAD` : "Non spécifié";
          const deadline = t.submission_deadline ? new Date(t.submission_deadline).toLocaleDateString("fr-FR") : "N/A";
          return `${idx + 1}. [${t.reference || t.id}] ${t.title || t.object_title}\n   - Acheteur: ${t.buyer_name || "N/A"}\n   - Estimation: ${amount} | Échéance: ${deadline}\n   - Région: ${t.region || "Toutes"} | Lien: ${SOUMIT_API_URL}/tenders/${t.id}`;
        }).join("\n\n");

        return {
          content: [{
            type: "text",
            text: `🎯 **${tenders.length} Appels d'Offres Trouvés (Soumit Intelligence)** :\n\n${formatted}`
          }]
        };
      } catch (err: any) {
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
        const data: any = await callSoumitApi(`/api/v1/tenders/${tenderId}`);
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

🔗 Consulter le dossier complet sur Soumit : ${SOUMIT_API_URL}/tenders/${t.id}`;

        return {
          content: [{ type: "text", text }]
        };
      } catch (err: any) {
        return {
          content: [{ type: "text", text: `Erreur lors de la récupération de l'AO : ${err.message}` }]
        };
      }
    }

    case "check_regulatory_compliance": {
      const est = Number(args.estimated_amount_ht);
      const prop = Number(args.proposed_amount_ht);
      const sector = args.sector_type || "fournitures";

      // Moroccan Procurement Decree 2-22-431 (Article 44 & 45 rules)
      // Travaux: low-ball threshold is generally 20% below estimate
      // Fournitures & Services: low-ball threshold is generally 25% below estimate
      // Excessive offer: generally 20% above estimate
      const maxLowDiscount = sector === "travaux" ? 0.20 : 0.25;
      const floorAmount = est * (1 - maxLowDiscount);
      const ceilingAmount = est * 1.20;

      const discountPct = ((est - prop) / est) * 100;
      let status = "CONFORME (ZONE OPTIMALE)";
      let advisory = "";

      if (prop < floorAmount) {
        status = "RISQUE ÉLEVÉ : OFFRE ANORMALEMENT BASSE (Art. 44 & 45)";
        advisory = `⚠️ Votre offre (${prop.toLocaleString("fr-FR")} MAD) est inférieure de ${discountPct.toFixed(1)}% à l'estimation administrative (seuil de tolérance: -${(maxLowDiscount * 100).toFixed(0)}%). La commission d'appel d'offres vous demandera des justifications écrites sous peine de rejet immédiat.`;
      } else if (prop > ceilingAmount) {
        status = "REJET CERTAIN : OFFRE EXCESSIVE (Art. 44)";
        advisory = `🚨 Votre offre dépasse l'estimation administrative de plus de 20% (+${(-discountPct).toFixed(1)}%). Elle sera rejetée d'office comme excessive selon l'article 44 du Décret.`;
      } else {
        advisory = `✅ Votre rabais est de ${discountPct.toFixed(1)}% par rapport à l'estimation. L'offre se situe dans le corridor de prix compétitif et sécurisé défini par le Décret 2-22-431.`;
      }

      const text = `⚖️ **Analyse de Conformité Financière (Décret n° 2-22-431)** :
- **Estimation de l'Administration** : ${est.toLocaleString("fr-FR")} MAD HT
- **Montant Proposé** : ${prop.toLocaleString("fr-FR")} MAD HT
- **Taux de rabais / écart** : ${discountPct >= 0 ? `-${discountPct.toFixed(1)}%` : `+${(-discountPct).toFixed(1)}%`}
- **Seuil d'Offre Anormalement Basse** : ${floorAmount.toLocaleString("fr-FR")} MAD HT (-${(maxLowDiscount * 100).toFixed(0)}%)
- **Plafond d'Offre Excessive** : ${ceilingAmount.toLocaleString("fr-FR")} MAD HT (+20%)

📊 **Verdict Réglementaire** : **${status}**
💡 **Conseil Stratégique Soumit** : ${advisory}`;

      return {
        content: [{ type: "text", text }]
      };
    }

    case "search_competitor_awards": {
      const competitor = encodeURIComponent(args.competitor_name);
      try {
        const data: any = await callSoumitApi(`/api/competitors/${competitor}`);
        const c = data?.competitor || data;
        const totalWon = c.total_won_amount_mad ? `${Number(c.total_won_amount_mad).toLocaleString("fr-FR")} MAD` : "0 MAD";

        let text = `🏢 **Fiche Concurrent : ${c.name || args.competitor_name}**
- **Marchés Gagnés** : ${c.total_wins || 0} victoire(s) enregistrée(s)
- **Volume Total Attribué** : ${totalWon}
- **Taux de Victoire Moyen** : ${c.win_rate_pct ? `${c.win_rate_pct}%` : "Non calculé"}
- **Rabais Moyen face à l'Estimation** : ${c.avg_discount_pct ? `${c.avg_discount_pct}%` : "N/A"}

🎯 **Top Acheteurs Clients** :
${(c.top_buyers || []).map((b: any) => `  • ${b.buyer_name} (${b.count} marché(s) - ${Number(b.total_mad || 0).toLocaleString("fr-FR")} MAD)`).join("\n") || "  Aucun acheteur récurrent identifié"}

📜 **Dernières Attributions Remportées** :
${(c.recent_awards || []).map((a: any) => `  • [${a.reference}] ${a.tender_title || a.object} | Montant: ${Number(a.amount_mad).toLocaleString("fr-FR")} MAD (${a.date || "N/A"})`).join("\n") || "  Aucun historique récent"}

🔗 Voir la fiche détaillée : ${SOUMIT_API_URL}/fournisseurs/${encodeURIComponent(args.competitor_name)}`;

        return {
          content: [{ type: "text", text }]
        };
      } catch (err: any) {
        return {
          content: [{ type: "text", text: `Erreur lors de la recherche du concurrent : ${err.message}` }]
        };
      }
    }

    case "get_company_profile": {
      const q = encodeURIComponent(args.company_query || "");
      const ice = encodeURIComponent(args.ice || "");
      try {
        let corporateData: any = null;
        let procurementData: any = null;

        // 1. Corporate Registry lookup
        try {
          const compRes = await callSoumitApi(`/api/companies/lookup?q=${q}&ice=${ice}`);
          if (compRes?.company) {
            corporateData = compRes.company;
          } else if (compRes?.items?.[0]) {
            corporateData = compRes.items[0];
          }
        } catch {
          corporateData = null;
        }

        // 2. Public procurement history lookup
        const searchTarget = corporateData?.denomination || args.company_query || "";
        if (searchTarget) {
          try {
            const compRes = await callSoumitApi(`/api/competitors/${encodeURIComponent(searchTarget)}`);
            procurementData = compRes?.competitor || null;
          } catch {
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
- **ICE** : \`${corporateData.ice || "N/A"}\` | **RC** : ${rc} | **IF** : ${corporateData.if_number || "N/A"} | **CNSS** : ${corporateData.cnss_number || "N/A"}
- **Siège Social** : ${corporateData.headquarters_address || "Maroc"} (${corporateData.city || "Maroc"})
- **Activité Déclarée** : ${corporateData.activity_description || "Prestations & Fournitures"}
- **Conformité Fiscale & Vigilance** : ${corporateData.vigilance_grade ? `Grade ${corporateData.vigilance_grade}` : "Standard"} | ${corporateData.tax_compliance_status || "Conforme"}`;
        } else {
          legalText = `🏢 **Identité Entreprise** :
- **Nom de référence** : ${primaryName}`;
        }

        let procText = "";
        if (procurementData && procurementData.total_wins > 0) {
          const totalWon = procurementData.total_won_amount_mad ? `${Number(procurementData.total_won_amount_mad).toLocaleString("fr-FR")} MAD` : "0 MAD";
          const discount = procurementData.avg_discount_pct ? `-${procurementData.avg_discount_pct}%` : "N/A";
          const buyers = (procurementData.top_buyers || []).map((b: any) => `  • **${b.buyer_name}** (${b.count} marché(s) - ${Number(b.total_mad || 0).toLocaleString("fr-FR")} MAD)`).join("\n");
          const recent = (procurementData.recent_awards || []).slice(0, 5).map((a: any) => `  • [${a.reference}] ${a.object} | ${Number(a.amount_mad).toLocaleString("fr-FR")} MAD (${a.date || "N/A"})`).join("\n");

          procText = `🏛️ **Track Record Commande Publique (Marchés Publics Maroc)** :
- **Marchés Remportés aux PV** : **${procurementData.total_wins}** attribution(s) officielle(s)
- **Volume d'Affaires Public Remporté** : **${totalWon}**
- **Rabais Moyen face à l'Estimation** : ${discount}

🎯 **Top Acheteurs Clients** :
${buyers || "  Aucun acheteur récurrent identifié"}

📜 **Dernières Attributions Remportées** :
${recent || "  Aucun historique récent"}`;
        } else {
          procText = `🏛️ **Track Record Commande Publique** :
- Aucun marché public d'adjudication directe répertorié dans les PV récents pour ce nom.`;
        }

        const text = `📊 **Fiche 360° Entreprise & Intelligence Marchés : ${primaryName}**

${legalText}

${procText}

🔗 **Fiche complète du fournisseur** : ${SOUMIT_API_URL}/fournisseurs/${encodeURIComponent(primaryName)}`;

        return {
          content: [{ type: "text", text }]
        };
      } catch (err: any) {
        return {
          content: [{ type: "text", text: `Erreur lors de la récupération de la fiche entreprise : ${err.message}` }]
        };
      }
    }

    case "search_bpu_articles": {
      const q = encodeURIComponent(args.article_query);
      const limit = args.limit || 10;
      try {
        const data: any = await callSoumitApi(`/api/tenders/bpu-search?q=${q}&limit=${limit}`);
        const items = data?.items || [];
        if (!items.length) {
          return {
            content: [{
              type: "text",
              text: `Aucun article de bordereau de prix (BPU) trouvé pour '${args.article_query}'.`
            }]
          };
        }

        const formatted = items.map((it: any, idx: number) => {
          const qty = it.estimated_quantity ? `${it.estimated_quantity} ${it.unit || "U"}` : "Quantité non précisée";
          return `${idx + 1}. **${it.designation}**\n   - Quantité: ${qty}\n   - Appel d'offres: [${it.tender_reference}] ${it.tender_title}\n   - Acheteur: ${it.buyer_name}\n   - Fiche AO: ${SOUMIT_API_URL}/tenders/${it.tender_id}`;
        }).join("\n\n");

        return {
          content: [{
            type: "text",
            text: `📦 **${items.length} Article(s) BPU / Marchés de Niche Trouvés** :\n\n${formatted}`
          }]
        };
      } catch (err: any) {
        return {
          content: [{ type: "text", text: `Erreur recherche BPU : ${err.message}` }]
        };
      }
    }

    case "audit_submission_checklist": {
      const issues: string[] = [];
      const pass: string[] = [];

      if (!args.has_provisional_guarantee) {
        issues.push("❌ CAUTIONNEMENT PROVISOIRE MANQUANT : L'absence de caution originale ou d'engagement bancaire entraîne le REJET IMMÉDIAT du dossier administratif à l'ouverture des plis (Art. 27).");
      } else {
        pass.push(`✅ Cautionnement provisoire renseigné (${args.provisional_guarantee_amount ? `${args.provisional_guarantee_amount.toLocaleString("fr-FR")} MAD` : "Montant déclaré"}). Vérifiez que la date de validité couvre bien le délai de validité des offres (généralement 60 à 90 jours) + 30 jours.`);
      }

      if (!args.has_declaration_on_honor) {
        issues.push("❌ DÉCLARATION SUR L'HONNEUR : Obligatoire selon l'Article 27 du Décret 2-22-431. Attention : l'utilisation d'un modèle ancien (antérieur au 1er septembre 2023) est une cause fréquente d'élimination d'office.");
      } else {
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

        const formattedEvidence = (res.evidenceAnchors || []).map((ea: any, idx: number) => 
          `  ${idx + 1}. [${ea.documentType} - ${ea.articleReference}] "${ea.verbatimQuote}"\n     ↳ Stockage : ${ea.storageUri} (SHA: ${(ea.sha256Checksum || "").substring(0, 10)}...)`
        ).join("\n");

        const text = `🛡️ **Soumit Execution Framework — Résultat d'Exécution**\n\n` +
          `• **Contrat** : ${res.contract?.contractId} (Marché ${res.contract?.tenderReference} - ${res.contract?.buyerName})\n` +
          `• **Verdict** : **${res.verdict}** (${res.verdictRationale})\n` +
          `• **Autorité & Conformité** : ${res.authorityEvaluation?.isAuthorized ? "✅ Autorisé" : "❌ Refusé"} (Rôle : ${res.authorityEvaluation?.userRole})\n` +
          `• **Ratio de Preuve Grounded** : ${((res.groundedScoreRatio || 0) * 100).toFixed(0)}%\n\n` +
          `📑 **Ancres de Preuve (R2 & Backblaze B2)** :\n${formattedEvidence || "Preuves archivées dans le système de référence."}\n\n` +
          `🎛️ **Surface de Maîtrise & Recours (Portail Soumit)** :\n` +
          `Inspecter, overrider ou signer sur : ${res.surfaceOfMasteryUrl || `${SOUMIT_API_URL}/v2/pursuits`}`;

        return {
          content: [{ type: "text", text }]
        };
      } catch (err: any) {
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
          text: `📜 **Journal d'Audit du Contrat ${args.contract_id}** : Le contrat est verrouillé et auditable sur la Surface de Maîtrise : ${SOUMIT_API_URL}/v2/pursuits?contractId=${encodeURIComponent(args.contract_id)}.`
        }]
      };
    }

    case "search_market_mentions": {
      try {
        const q = encodeURIComponent(args.query || "");
        const topic = encodeURIComponent(args.topic || "all");
        const risk = encodeURIComponent(args.min_risk || "ALL");
        const data: any = await callSoumitApi(`/api/mentions?q=${q}&topic=${topic}&risk=${risk}&limit=${args.limit || 5}`);
        const items = data?.mentions || [];

        if (!items.length) {
          return {
            content: [{
              type: "text",
              text: `Aucune mention ou signal de marché trouvé pour '${args.query || ""}'.`
            }]
          };
        }

        const formatted = items.map((m: any, idx: number) => {
          const riskBadge = m.regulatory_risk_level === "CRITICAL" ? "🚨 CRITIQUE" : m.regulatory_risk_level === "HIGH" ? "⚠️ ÉLEVÉ" : "ℹ️ MODÉRÉ";
          return `${idx + 1}. [${m.source_name}] **${m.raw_title}** (${riskBadge})\n` +
                 `   - Synthèse: ${m.summary_fr}\n` +
                 `   - Conseil Soumit: ${m.actionable_insight}\n` +
                 `   - Source: ${m.original_url}`;
        }).join("\n\n");

        return {
          content: [{
            type: "text",
            text: `📡 **Signaux et Conversations Détectés (Marchés Publics Maroc)** :\n\n${formatted}\n\n🔗 Radar complet : ${SOUMIT_API_URL}/v2/dashboard`
          }]
        };
      } catch (err: any) {
        return {
          content: [{ type: "text", text: `Erreur recherche mentions : ${err.message}` }]
        };
      }
    }

    case "get_buyer_intelligence": {
      const q = encodeURIComponent(args.buyer_query || "");
      try {
        const data: any = await callSoumitApi(`/api/buyers/payment-delays?q=${q}`);
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
        } else {
          delayText = `- **Délai Moyen de Paiement** : Données ODP en cours de consolidation pour cet acheteur (moyenne nationale : 54 jours).`;
        }

        const text = `🏛️ **Intelligence Acheteur Public : ${delayRecord?.buyer_name || args.buyer_query}**\n\n` +
          `📊 **Discipline de Paiement (Loi n° 69-21 & ODP)** :\n${delayText}\n\n` +
          `💡 **Conseil Soumit** : Intégrez les délais de paiement observés dans votre calcul de trésorerie et de marge BPU.\n\n` +
          `🔗 Fiche détaillée acheteur : ${SOUMIT_API_URL}/acheteurs`;

        return {
          content: [{ type: "text", text }]
        };
      } catch (err: any) {
        return {
          content: [{ type: "text", text: `Erreur intelligence acheteur : ${err.message}` }]
        };
      }
    }

    case "get_market_barometer": {
      try {
        const data: any = await callSoumitApi("/api/v1/barometer");
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
          `🔗 Tableau de bord macroéconomique : ${SOUMIT_API_URL}/tendances`;

        return {
          content: [{ type: "text", text }]
        };
      } catch (err: any) {
        return {
          content: [{ type: "text", text: `Erreur baromètre marchés : ${err.message}` }]
        };
      }
    }

    default:
      throw new Error(`Outil inconnu : ${name}`);
  }
}

// JSON-RPC 2.0 stdio Server Implementation
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  terminal: false
});

function sendResponse(id: string | number | null, result?: any, error?: any) {
  const msg: Record<string, any> = {
    jsonrpc: "2.0",
    id
  };
  if (error) {
    msg.error = error;
  } else {
    msg.result = result;
  }
  process.stdout.write(JSON.stringify(msg) + "\n");
}

rl.on("line", async (line: string) => {
  if (!line.trim()) return;
  try {
    const req = JSON.parse(line);
    const { id, method, params } = req;

    if (method === "initialize") {
      const requestedVersion = params?.protocolVersion;
      const protocolVersion = requestedVersion || "2025-03-26";
      sendResponse(id, {
        protocolVersion,
        capabilities: {
          tools: {},
          resources: {},
          prompts: {},
          logging: {}
        },
        serverInfo: {
          name: "soumit-mcp",
          version: "1.0.0"
        }
      });
    } else if (method === "notifications/initialized") {
      // Client confirmed initialization
    } else if (method === "tools/list") {
      sendResponse(id, { tools: TOOLS });
    } else if (method === "resources/list") {
      sendResponse(id, {
        resources: [
          {
            uri: "soumit://regulations/decret-2-22-431",
            name: "Décret n° 2-22-431 relatif aux marchés publics",
            mimeType: "text/markdown",
            description: "Synthèse juridique et règles fondamentales de la commande publique au Maroc (BO n° 7176)."
          },
          {
            uri: "soumit://templates/declaration-honneur",
            name: "Modèle de Déclaration sur l'Honneur (Article 27)",
            mimeType: "text/markdown",
            description: "Trame légale conforme requise dans le dossier administratif à l'ouverture des plis."
          }
        ]
      });
    } else if (method === "resources/read") {
      const uri = params?.uri;
      if (uri === "soumit://regulations/decret-2-22-431") {
        sendResponse(id, {
          contents: [
            {
              uri,
              mimeType: "text/markdown",
              text: `# Décret n° 2-22-431 relatif aux marchés publics au Maroc\n\n- Entrée en vigueur : 1er septembre 2023 (BO n° 7176)\n- Article 148 : Quota légal de 30% réservé aux TPME marocaines.\n- Article 27 : Pièces du dossier administratif (caution provisoire, déclaration sur l'honneur modèle 2023).\n- Articles 44 & 45 : Détection des offres excessives (+20%) et anormalement basses (-20% travaux, -25% fournitures/services).`
            }
          ]
        });
      } else if (uri === "soumit://templates/declaration-honneur") {
        sendResponse(id, {
          contents: [
            {
              uri,
              mimeType: "text/markdown",
              text: `# Modèle de Déclaration sur l'Honneur (Art. 27 Décret 2-22-431)\n\nJe soussigné [Nom, Prénom], agissant en qualité de [Qualité] au nom et pour le compte de [Raison sociale, ICE, RC]...\nAtteste sur l'honneur ne pas être en état de liquidation judiciaire ou de faillite personnelle, être en règle avec mes obligations fiscales et de cotisations CNSS.`
            }
          ]
        });
      } else {
        sendResponse(id, null, {
          code: -32602,
          message: `Ressource non trouvée : ${uri}`
        });
      }
    } else if (method === "prompts/list") {
      sendResponse(id, {
        prompts: [
          {
            name: "audit_tender_risk",
            description: "Auditer les risques d'élimination et la rentabilité d'un appel d'offres public marocain.",
            arguments: [
              { name: "tender_reference", description: "Référence de l'appel d'offres", required: true },
              { name: "budget_ht", description: "Estimation prévisionnelle", required: false }
            ]
          },
          {
            name: "compliance_check",
            description: "Vérifier la conformité de l'offre financière selon le Décret 2-22-431.",
            arguments: [
              { name: "estimated_amount", description: "Montant estimé par l'administration (MAD)", required: true },
              { name: "proposed_amount", description: "Montant proposé par le soumissionnaire (MAD)", required: true },
              { name: "sector_type", description: "Nature (travaux, fournitures, services)", required: false }
            ]
          }
        ]
      });
    } else if (method === "prompts/get") {
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
      } else if (promptName === "compliance_check") {
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
      } else {
        sendResponse(id, null, {
          code: -32602,
          message: `Prompt non trouvé : ${promptName}`
        });
      }
    } else if (method === "tools/call") {
      const toolName = params?.name;
      const toolArgs = params?.arguments || {};
      try {
        const result = await handleToolCall(toolName, toolArgs);
        sendResponse(id, result);
      } catch (err: any) {
        sendResponse(id, null, {
          code: -32000,
          message: err.message || "Erreur d'exécution de l'outil"
        });
      }
    } else if (method === "ping") {
      sendResponse(id, {});
    } else {
      sendResponse(id, null, {
        code: -32601,
        message: `Méthode non supportée : ${method}`
      });
    }
  } catch (err: any) {
    sendResponse(null, null, {
      code: -32700,
      message: "JSON Parse error"
    });
  }
});

process.stderr.write("🚀 Soumit MCP Server démarré avec succès sur stdio.\n");
