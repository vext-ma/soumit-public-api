export interface ToolDefinition {
  name: string;
  description: string;
  inputSchema: {
    type: "object";
    properties: Record<string, unknown>;
    required?: string[];
  };
}

export const TOOLS: ToolDefinition[] = [
  {
    name: "search_tenders",
    description: "Rechercher des appels d'offres publics marocains récents et actifs par mot-clé, secteur ou montant minimum.",
    inputSchema: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "Mots-clés de recherche (ex: 'scanner médical', 'fibre optique', 'travaux assainissement', 'gardiennage')."
        },
        sector: {
          type: "string",
          description: "Secteur d'activité optionnel (ex: 'travaux', 'fournitures', 'services', 'sante', 'it')."
        },
        min_amount: {
          type: "number",
          description: "Montant estimé minimum en Dirhams (MAD)."
        },
        limit: {
          type: "number",
          description: "Nombre maximum de résultats (par défaut 10, max 50)."
        }
      }
    }
  },
  {
    name: "get_tender_details",
    description: "Obtenir la fiche complète, la synthèse du DCE, les critères éliminatoires et le statut Go/No-Go d'un appel d'offres.",
    inputSchema: {
      type: "object",
      properties: {
        tender_id: {
          type: "string",
          description: "Identifiant unique de l'appel d'offres (ID Soumit ou référence marché)."
        }
      },
      required: ["tender_id"]
    }
  },
  {
    name: "check_regulatory_compliance",
    description: "Calculer la conformité d'une offre financière avec le Décret n° 2-22-431 : détection d'offre anormalement basse ou excessive (Articles 44 & 45), et vérification des délais d'affichage (Article 23).",
    inputSchema: {
      type: "object",
      properties: {
        tender_id: {
          type: "string",
          description: "Identifiant du marché ou référence."
        },
        estimated_amount_ht: {
          type: "number",
          description: "Estimation administrative du marché en Dirhams HT."
        },
        proposed_amount_ht: {
          type: "number",
          description: "Montant de l'offre proposée par le soumissionnaire en Dirhams HT."
        },
        sector_type: {
          type: "string",
          enum: ["travaux", "fournitures", "services"],
          description: "Nature de la prestation pour appliquer le bon corridor légal (ex: -20% travaux vs -25% fournitures/services)."
        }
      },
      required: ["estimated_amount_ht", "proposed_amount_ht"]
    }
  },
  {
    name: "search_competitor_awards",
    description: "Intelligence concurrentielle : rechercher l'historique d'un concurrent ou d'un attributaire au Maroc (marchés gagnés, montants, acheteurs clients, motifs d'éviction).",
    inputSchema: {
      type: "object",
      properties: {
        competitor_name: {
          type: "string",
          description: "Raison sociale ou mot-clé du concurrent (ex: 'SOCIETE MAROCAINE DE...', 'IBT', 'MEDTRONIC', 'SOMADIR')."
        },
        limit: {
          type: "number",
          description: "Nombre de résultats (défaut: 15)."
        }
      },
      required: ["competitor_name"]
    }
  },
  {
    name: "get_company_profile",
    description: "Obtenir la fiche 360° complète d'une entreprise ou fournisseur au Maroc : identité légale officielle (ICE 15 chiffres, RC, IF, CNSS, forme juridique, capital MAD, adresse, ville, activité, conformité fiscale) croisée avec son historique de la commande publique (volume total remporté en MAD, nombre d'attributions aux PV, rabais moyen consenti vs budget administratif, top acheteurs publics clients, dernières attributions remportées).",
    inputSchema: {
      type: "object",
      properties: {
        company_query: {
          type: "string",
          description: "Nom de l'entreprise, raison sociale, acronyme ou marque (ex: 'LPEE', 'Promamec', 'Perfect Industry', 'Diamond Diagnostics')."
        },
        ice: {
          type: "string",
          description: "Numéro ICE marocain à 15 chiffres si connu (ex: '001588990000012') pour une identification exacte au registre des sociétés."
        }
      }
    }
  },
  {
    name: "search_bpu_articles",
    description: "Rechercher des marchés publics par article ou spécification ligne par ligne dans les bordereaux des prix (BPU / CPS) : références matérielles, normes, désignations techniques.",
    inputSchema: {
      type: "object",
      properties: {
        article_query: {
          type: "string",
          description: "Désignation de l'article, marque, norme ou référence équipement (ex: 'Cathéter double J', 'Pompe immergée 15kW', 'Switch PoE 24 ports')."
        },
        limit: {
          type: "number",
          description: "Nombre de résultats (défaut: 10)."
        }
      },
      required: ["article_query"]
    }
  },
  {
    name: "audit_submission_checklist",
    description: "Crash-test administratif : vérifier la liste des pièces obligatoires pour éviter l'élimination d'office à l'ouverture des plis (Articles 27 & 28 du Décret 2-22-431).",
    inputSchema: {
      type: "object",
      properties: {
        tender_reference: {
          type: "string",
          description: "Référence de l'appel d'offres."
        },
        has_provisional_guarantee: {
          type: "boolean",
          description: "Le cautionnement provisoire original ou récépissé de caution bancaire est-il prêt ?"
        },
        provisional_guarantee_amount: {
          type: "number",
          description: "Montant de la caution bancaire préparée."
        },
        has_declaration_on_honor: {
          type: "boolean",
          description: "La déclaration sur l'honneur est-elle conforme au modèle Décret 2-22-431 Article 27 ?"
        },
        has_site_visit_certificate: {
          type: "boolean",
          description: "Le certificat de visite des lieux est-il requis et obtenu ?"
        }
      },
      required: ["tender_reference"]
    }
  },
  {
    name: "execute_procurement_intent",
    description: "Cadre d'exécution agentique (Soumit Execution Framework) : transforme une intention métier en contrat typé, vérifie l'autorité (Décret 2-22-431), extrait les preuves textuelles (Backblaze B2/R2) et fournit le lien de gouvernance portail.",
    inputSchema: {
      type: "object",
      properties: {
        raw_prompt: {
          type: "string",
          description: "Intention métier exprimée par l'utilisateur ou l'agent (ex: 'Qualifier le marché de scanner au CHU Fès 14/CHU/2026')."
        },
        caller_role: {
          type: "string",
          enum: ["viewer", "bid_analyst", "procurement_officer", "executive", "system_agent"],
          description: "Rôle de l'appelant pour le contrôle d'autorité (défaut: 'bid_analyst')."
        },
        proposed_amount_mad: {
          type: "number",
          description: "Montant envisagé de l'offre en MAD HT pour le test de conformité aux couloirs légaux (Arts. 44 & 45)."
        },
        tender_reference: {
          type: "string",
          description: "Référence explicite de l'appel d'offres si connue."
        }
      },
      required: ["raw_prompt"]
    }
  },
  {
    name: "verify_evidence_chain",
    description: "Vérifier la chaîne de preuve cryptographique (SHA-256) d'un extrait de CPS, RC ou PV stocké sous Backblaze B2 ou Cloudflare R2.",
    inputSchema: {
      type: "object",
      properties: {
        storage_uri: {
          type: "string",
          description: "URI de l'artefact (ex: 'b2://soumit-dce/...' ou 'r2://...')."
        },
        expected_sha256: {
          type: "string",
          description: "Somme de contrôle SHA-256 attendue."
        }
      },
      required: ["storage_uri", "expected_sha256"]
    }
  },
  {
    name: "submit_portal_recourse",
    description: "Actionner un recours sur le portail : override humain de verdict, signalement d'ambiguïté, ou demande d'éclaircissement Art. 22.",
    inputSchema: {
      type: "object",
      properties: {
        contract_id: {
          type: "string",
          description: "Identifiant du contrat d'exécution généré par execute_procurement_intent."
        },
        action: {
          type: "string",
          enum: ["OVERRIDE_VERDICT", "FLAG_AMBIGUITY", "DISPATCH_ARTICLE_22_REQUEST", "EXECUTIVE_SIGN_OFF"],
          description: "Action de recours à effectuer."
        },
        rationale: {
          type: "string",
          description: "Justification obligatoire de la décision humaine."
        },
        actor_identity: {
          type: "string",
          description: "Nom ou identifiant du collaborateur humain."
        },
        actor_role: {
          type: "string",
          enum: ["bid_analyst", "procurement_officer", "executive"],
          description: "Rôle du signataire."
        },
        override_verdict: {
          type: "string",
          enum: ["GO", "WATCH", "NO_GO"],
          description: "Nouveau verdict (requis pour OVERRIDE_VERDICT)."
        }
      },
      required: ["contract_id", "action", "rationale", "actor_identity"]
    }
  },
  {
    name: "get_execution_audit_trail",
    description: "Consulter le journal d'audit infalsifiable (hash-chain) d'un contrat d'exécution pour la gouvernance et le contrôle.",
    inputSchema: {
      type: "object",
      properties: {
        contract_id: {
          type: "string",
          description: "Identifiant du contrat d'exécution."
        }
      },
      required: ["contract_id"]
    }
  },
  {
    name: "search_market_mentions",
    description: "Rechercher les conversations, articles de presse et signaux sociaux récents sur les marchés publics marocains (controverses, litiges, réformes, acheteurs, retards de paiement, allégations).",
    inputSchema: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "Mots-clés de recherche (nom d'acheteur, fournisseur, référence d'AO ou terme juridique)."
        },
        topic: {
          type: "string",
          enum: ["all", "tender_controversy", "legal_jurisprudence", "delayed_payment", "price_dispute", "tender_announcement", "policy_regulation", "market_intelligence"],
          description: "Filtrer par catégorie thématique."
        },
        min_risk: {
          type: "string",
          enum: ["ALL", "LOW", "MEDIUM", "HIGH", "CRITICAL"],
          description: "Filtrer par niveau de risque réglementaire."
        },
        limit: {
          type: "number",
          description: "Nombre maximum de résultats (défaut 10)."
        }
      }
    }
  },
  {
    name: "get_buyer_intelligence",
    description: "Intelligence acheteur public au Maroc : historique de commande publique, profil de paiement sous la Loi n° 69-21 (délai moyen de paiement en jours, conformité légale au plafond de 60 jours, niveau de risque trésorerie ODP) et derniers appels d'offres émis.",
    inputSchema: {
      type: "object",
      properties: {
        buyer_query: {
          type: "string",
          description: "Nom de l'acheteur public, ministère, collectivité territoriale ou acronyme (ex: 'ONEE', 'CHU Ibn Sina', 'Ministère de la Santé', 'Région Casablanca')."
        }
      },
      required: ["buyer_query"]
    }
  },
  {
    name: "get_market_barometer",
    description: "Baromètre macroéconomique de la commande publique au Maroc (Soumit Barometer) : volume budgétaire global engagé en Dirhams (MAD), nombre d'opportunités actives, ventilation par pôle régional et conformité au quota TPME de 30% (Article 148 du Décret 2-22-431).",
    inputSchema: {
      type: "object",
      properties: {
        period: {
          type: "string",
          description: "Période d'analyse souhaitée (ex: 'current', 'quarterly', '2026')."
        }
      }
    }
  }
];
