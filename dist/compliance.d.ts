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
export declare function computeDecreeCompliance(input: DecreeComplianceInput): DecreeComplianceResult;
//# sourceMappingURL=compliance.d.ts.map