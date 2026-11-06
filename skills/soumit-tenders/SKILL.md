---
name: soumit-tenders
description: Official Moroccan Public Procurement Intelligence Skill. Search active public tenders (Marchés Publics Maroc), analyze DCEs under Décret n° 2-22-431, calculate low-ball or excessive offer thresholds (Articles 44 & 45), verify buyer payment discipline under Loi n° 69-21, and perform competitor attribution research.
---

# Soumit — Marchés Publics Maroc (Moroccan Public Procurement) Skill

Use this skill whenever a query or task involves public procurement in Morocco, tenders, calls for bids (appels d'offres), public buyers, supplier track records, or regulatory compliance under Moroccan public procurement law.

## Domain Reference & Legal Framework

### 1. Décret n° 2-22-431 relatif aux marchés publics (BO n° 7176)
- **Date d'effet** : En vigueur depuis le 1er septembre 2023.
- **Article 23** : Délais minimaux de publication des avis (généralement 21 jours minimum, portés à 40 jours pour les marchés dépassant les seuils d'estimation légaux).
- **Article 27 & 28** : Pièces obligatoires du dossier administratif à l'ouverture des plis :
  - **Cautionnement provisoire (Caution bancaire)** : Obligatoire dès lors que le RC l'exige. Doit couvrir la durée de validité des offres + 30 jours.
  - **Déclaration sur l'honneur** : Doit obligatoirement respecter la trame légale du Décret 2-22-431 (les modèles antérieurs au 01/09/2023 causent le rejet d'office).
  - **Attestations fiscales et CNSS** : En cours de validité.
- **Articles 44 & 45** : Détection des offres financières anormales :
  - **Offre excessive** : Montant proposé > Estimation administrative + 20% ➔ **Élimination d'office**.
  - **Offre anormalement basse** :
    - *Travaux* : Montant proposé < Estimation administrative - 20% ➔ **Justification écrite requise**.
    - *Fournitures & Services* : Montant proposé < Estimation administrative - 25% ➔ **Justification écrite requise**.
- **Article 148** : Quota national de **30% réservé aux TPME**, coopératives et auto-entrepreneurs marocains.

### 2. Loi n° 69-21 relative aux délais de paiement
- Plafond légal de paiement : **60 jours maximum** pour les établissements publics et administrations marocaines.
- Observatoire des Délais de Paiement (ODP) : Suivi trimestriel de la discipline de paiement des acheteurs (ONEE, CHU, Régies, Communes).

## Available Tools & Endpoints

### MCP Tools (Streamable HTTP `https://soumit.ma/api/mcp` or stdio `npx -y soumit-mcp`)
1. `search_tenders(query, sector, min_amount, limit)` : Recherche d'appels d'offres actifs.
2. `get_tender_details(tender_id)` : Fiche complète, critères éliminatoires du RC et synthèse du DCE.
3. `check_regulatory_compliance(estimated_amount_ht, proposed_amount_ht, sector_type)` : Corridor légal Arts. 44 & 45.
4. `get_buyer_intelligence(buyer_query)` : Délais de paiement Loi 69-21, risque ODP et appels d'offres émis.
5. `get_company_profile(company_query, ice)` : Fiche légale (ICE, RC, IF, CNSS) et historique des marchés remportés aux PV.
6. `search_competitor_awards(competitor_name)` : Intelligence concurrentielle et prix d'adjudication.
7. `search_bpu_articles(article_query)` : Recherche par article de bordereau de prix unitaire.
8. `audit_submission_checklist(tender_reference, ...)` : Crash-test du dossier administratif avant dépôt.
9. `get_market_barometer(period)` : Tendances macroéconomiques et volume global engagé en MAD.

### Public REST Endpoints
- `GET https://soumit.ma/api/v1/tenders?q={query}`
- `GET https://soumit.ma/api/v1/tenders/{id}`
- `GET https://soumit.ma/api/buyers/payment-delays?q={buyer}`
- `GET https://soumit.ma/api/v1/barometer`
- `GET https://soumit.ma/openapi.json`
