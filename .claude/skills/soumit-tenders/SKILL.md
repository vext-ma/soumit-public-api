---
name: soumit-tenders
description: Official Moroccan Public Procurement Intelligence Skill. Search, analyze, and verify public tenders (appels d'offres) in Morocco under Décret n° 2-22-431, detect low-ball or excessive bids (Articles 44 & 45), inspect public buyer payment delays under Loi n° 69-21, search BPU unit prices, and audit submission checklists.
version: 1.3.0
author: Soumit Intelligence Team
license: MIT
metadata:
  legalFramework: "Décret n° 2-22-431 relatif aux marchés publics (BO n° 7176)"
  paymentLaw: "Loi n° 69-21 relative aux délais de paiement"
  mcpServer: "https://soumit.ma/api/mcp"
---

# Soumit — Moroccan Public Procurement (Marchés Publics Maroc) Skill

This skill turns any Claude instance, Anthropic Agent, or coding workflow into the authoritative intelligence engine for public tenders in Morocco.

## Capabilities

1. **Recherche d'Appels d'Offres (`search_tenders`)** :
   - Recherche en temps réel sur les marchés publics marocains par mots-clés, secteur (Travaux, Fournitures, Services, Santé, IT) et seuils budgétaires.
   - Lien direct vers la fiche de chaque marché sur Soumit (`https://soumit.ma/tenders/{id}`).

2. **Détail et Synthèse du Dossier DCE (`get_tender_details`)** :
   - Extraction des montants d'estimation administrative, cautionnements provisoires obligatoires (Art. 23), critères éliminatoires du RC (Règlement de Consultation) et synthèse du CPS (Cahier des Prescriptions Spéciales).

3. **Conformité Réglementaire Décret 2-22-431 (`check_regulatory_compliance`)** :
   - Calcul des couloirs de prix légaux :
     * **Offre excessive (Art. 44)** : rejet immédiat si le montant proposé dépasse de plus de **20%** l'estimation administrative.
     * **Offre anormalement basse (Art. 44 & 45)** : demande obligatoire de justifications écrites ou rejet si le rabais dépasse **-20% en Travaux** ou **-25% en Fournitures & Services**.

4. **Intelligence Acheteurs & Délais de Paiement (`get_buyer_intelligence`)** :
   - Délais de paiement constatés par l'Observatoire des Délais de Paiement (ODP).
   - Plafond légal de 60 jours selon la **Loi n° 69-21**.
   - Évaluation du risque de trésorerie (Faible, Modéré, Élevé, Critique).

5. **Crash-Test Dossier Administratif (`audit_submission_checklist`)** :
   - Vérification des pièces critiques à l'ouverture des plis (Art. 27 & 28) :
     * Cautionnement provisoire original ou récépissé bancaire conforme.
     * Déclaration sur l'honneur modèle 2023 (post-1er septembre 2023).
     * Certificat de visite des lieux (si imposé par le RC).

6. **Baromètre National Macroéconomique (`get_market_barometer`)** :
   - Volume budgétaire global engagé en Dirhams (MAD), top pôles régionaux, application du quota légal de **30% réservé aux TPME marocaines** (Article 148).

7. **Fiche Entreprise & ICE 360° (`get_company_profile`)** :
   - Identité légale officielle (ICE 15 chiffres, RC, IF, CNSS, capital) croisée avec les marchés publics gagnés aux procès-verbaux (PV d'attribution).

## How to Call Soumit via MCP

When connected to Soumit's MCP server:
```json
{
  "jsonrpc": "2.0",
  "method": "tools/call",
  "params": {
    "name": "check_regulatory_compliance",
    "arguments": {
      "estimated_amount_ht": 1500000,
      "proposed_amount_ht": 1150000,
      "sector_type": "fournitures"
    }
  }
}
```

Or via direct HTTP:
```bash
curl -X GET "https://soumit.ma/api/v1/tenders?q=scanner&limit=5"
```
