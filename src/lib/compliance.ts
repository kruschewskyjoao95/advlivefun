export const COMPLIANCE_POLICY_VERSION = "oab-publicidade-v1";

const prohibitedExpressions = [
  /\bgarant(?:imos|ido|ida|e)\b/i,
  /\b\d+\s?%\s*(?:de\s*)?(?:sucesso|ganhos?)\b/i,
  /\b(?:ganhamos|vencemos)\s+(?:todos?|qualquer)/i,
  /\b(?:desconto|promo[cç][aã]o|menor\s+pre[cç]o)\b/i,
  /\b(?:ligue\s+agora|contrate\s+agora|vagas\s+limitadas)\b/i,
  /\b(?:melhor|n[ºo]\.?1|n[uú]mero\s+um)\s+(?:advogad|profissional)/i,
];

export type ProfileComplianceResult =
  | { approved: true; violations: [] }
  | { approved: false; violations: string[] };

export function validateInformativeProfile(
  text: string,
): ProfileComplianceResult {
  const violations = prohibitedExpressions
    .filter((expression) => expression.test(text))
    .map(() => "O texto contém linguagem promocional ou promessa vedada.");

  return violations.length === 0
    ? { approved: true, violations: [] }
    : { approved: false, violations: [...new Set(violations)] };
}

export type ChargePurpose = "platform_subscription" | "legal_fees";

export function assertPlatformCharge(purpose: ChargePurpose) {
  if (purpose !== "platform_subscription") {
    throw new Error(
      "A plataforma não pode cobrar, reter ou repassar honorários advocatícios.",
    );
  }
}
