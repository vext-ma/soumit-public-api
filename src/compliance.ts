/**
 * Soumit Intelligence Engine - Moroccan Procurement Décret n° 2-22-431
 * Compliance Calculator (Articles 44 & 45)
 *
 * Enforces statutory corridors for:
 * - Offre excessive (> +20% administrative estimate)
 * - Offre anormalement basse (< -20% travaux, < -25% fournitures & services)
 */

export interface DecreeComplianceInput {
  estimatedAmountHt: number;
  proposedAmountHt: number;
  sectorType?: "travaux" | "fournitures" | "services" | string;
}

export interface DecreeComplianceResult {
  estimatedAmountHt: number;
  proposedAmountHt: number;
  sectorType: string;
  discountPct: number;
  floorAmount: number;
  ceilingAmount: number;
  maxLowDiscountPct: number;
  status: "CONFORME" | "OFFRE_ANORMALEMENT_BASSE" | "OFFRE_EXCESSIVE";
  statusText: string;
  advisory: string;
}

export function computeDecreeCompliance(input: DecreeComplianceInput): DecreeComplianceResult {
  const est = Number(input.estimatedAmountHt);
  const prop = Number(input.proposedAmountHt);
  const sector = (input.sectorType || "fournitures").toLowerCase();

  // Moroccan Procurement Decree 2-22-431 (Article 44 & 45 rules)
  // Travaux: low-ball threshold is 20% below estimate
  // Fournitures & Services: low-ball threshold is 25% below estimate
  // Excessive offer: 20% above estimate across all sectors
  const maxLowDiscount = sector === "travaux" ? 0.20 : 0.25;
  const floorAmount = est * (1 - maxLowDiscount);
  const ceilingAmount = est * 1.20;

  const discountPct = est > 0 ? ((est - prop) / est) * 100 : 0;
  let status: "CONFORME" | "OFFRE_ANORMALEMENT_BASSE" | "OFFRE_EXCESSIVE" = "CONFORME";
  let statusText = "CONFORME (ZONE OPTIMALE)";
  let advisory = "";

  if (prop < floorAmount) {
    status = "OFFRE_ANORMALEMENT_BASSE";
    statusText = "RISQUE ÉLEVÉ : OFFRE ANORMALEMENT BASSE (Art. 44 & 45)";
    advisory = `⚠️ Votre offre (${prop.toLocaleString("fr-FR")} MAD) est inférieure de ${discountPct.toFixed(1)}% à l'estimation administrative (seuil de tolérance: -${(maxLowDiscount * 100).toFixed(0)}%). La commission d'appel d'offres vous demandera des justifications écrites sous peine de rejet immédiat.`;
  } else if (prop > ceilingAmount) {
    status = "OFFRE_EXCESSIVE";
    statusText = "REJET CERTAIN : OFFRE EXCESSIVE (Art. 44)";
    advisory = `🚨 Votre offre dépasse l'estimation administrative de plus de 20% (+${(-discountPct).toFixed(1)}%). Elle sera rejetée d'office comme excessive selon l'article 44 du Décret.`;
  } else {
    status = "CONFORME";
    statusText = "CONFORME (ZONE OPTIMALE)";
    advisory = `✅ Votre rabais est de ${discountPct.toFixed(1)}% par rapport à l'estimation. L'offre se situe dans le corridor de prix compétitif et sécurisé défini par le Décret 2-22-431.`;
  }

  return {
    estimatedAmountHt: est,
    proposedAmountHt: prop,
    sectorType: sector,
    discountPct: Number(discountPct.toFixed(1)),
    floorAmount,
    ceilingAmount,
    maxLowDiscountPct: maxLowDiscount * 100,
    status,
    statusText,
    advisory
  };
}
