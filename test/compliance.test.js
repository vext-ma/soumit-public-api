const test = require('node:test');
const assert = require('node:assert');
const {
  TOOLS,
  computeDecreeCompliance,
  handleToolCall
} = require('../dist/index.js');

test('Soumit MCP server exposes all 14 procurement intelligence tools', () => {
  const toolNames = TOOLS.map((t) => t.name);
  const expectedTools = [
    'search_tenders',
    'get_tender_details',
    'check_regulatory_compliance',
    'search_competitor_awards',
    'get_company_profile',
    'search_bpu_articles',
    'audit_submission_checklist',
    'execute_procurement_intent',
    'verify_evidence_chain',
    'submit_portal_recourse',
    'get_execution_audit_trail',
    'search_market_mentions',
    'get_buyer_intelligence',
    'get_market_barometer'
  ];

  assert.strictEqual(TOOLS.length, 14, 'Should expose exactly 14 tools');
  for (const name of expectedTools) {
    assert.ok(toolNames.includes(name), `Missing tool: ${name}`);
  }

  for (const tool of TOOLS) {
    assert.ok(tool.name, 'Tool must have name');
    assert.ok(tool.description, 'Tool must have description');
    assert.strictEqual(tool.inputSchema.type, 'object', 'inputSchema must be object');
    assert.ok(tool.inputSchema.properties, 'inputSchema must have properties');
  }
});

test('Moroccan Procurement Decree 2-22-431 compliance calculator (Articles 44 & 45)', () => {
  // 1. Compliant offer in Fournitures (within -25% and +20%)
  const compliant = computeDecreeCompliance({
    estimatedAmountHt: 1000000,
    proposedAmountHt: 850000,
    sectorType: 'fournitures'
  });
  assert.strictEqual(compliant.status, 'CONFORME');
  assert.strictEqual(compliant.floorAmount, 750000);
  assert.strictEqual(compliant.ceilingAmount, 1200000);
  assert.strictEqual(compliant.discountPct, 15);
  assert.strictEqual(compliant.maxLowDiscountPct, 25);
  assert.ok(compliant.advisory.includes('corridor de prix compétitif'));

  // 2. Abnormally low offer in Travaux (below -20%)
  const lowTravaux = computeDecreeCompliance({
    estimatedAmountHt: 1000000,
    proposedAmountHt: 780000,
    sectorType: 'travaux'
  });
  assert.strictEqual(lowTravaux.status, 'OFFRE_ANORMALEMENT_BASSE');
  assert.strictEqual(lowTravaux.floorAmount, 800000);
  assert.strictEqual(lowTravaux.maxLowDiscountPct, 20);
  assert.ok(lowTravaux.statusText.includes('OFFRE ANORMALEMENT BASSE'));
  assert.ok(lowTravaux.advisory.includes('justifications écrites'));

  // 3. Compliant offer in Fournitures at 22% discount (valid for supplies, but would be low-ball in travaux)
  const compliantFournitures = computeDecreeCompliance({
    estimatedAmountHt: 1000000,
    proposedAmountHt: 780000,
    sectorType: 'fournitures'
  });
  assert.strictEqual(compliantFournitures.status, 'CONFORME');
  assert.strictEqual(compliantFournitures.floorAmount, 750000);

  // 4. Excessive offer (exceeding +20%)
  const excessive = computeDecreeCompliance({
    estimatedAmountHt: 1000000,
    proposedAmountHt: 1250000,
    sectorType: 'fournitures'
  });
  assert.strictEqual(excessive.status, 'OFFRE_EXCESSIVE');
  assert.strictEqual(excessive.ceilingAmount, 1200000);
  assert.ok(excessive.statusText.includes('OFFRE EXCESSIVE'));
  assert.ok(excessive.advisory.includes('rejetée d\'office'));
});

test('Tool call: check_regulatory_compliance returns formatted advisory', async () => {
  const result = await handleToolCall('check_regulatory_compliance', {
    estimated_amount_ht: 500000,
    proposed_amount_ht: 400000,
    sector_type: 'fournitures'
  });

  assert.ok(Array.isArray(result.content));
  const text = result.content[0].text;
  assert.ok(text.includes('Décret n° 2-22-431'));
  assert.ok(text.includes('CONFORME (ZONE OPTIMALE)'));
  assert.ok(text.includes('500\u202f000 MAD HT') || text.includes('500 000 MAD HT') || text.includes('500,000'));
});

test('Tool call: audit_submission_checklist detects missing bank guarantee and declaration', async () => {
  const rejected = await handleToolCall('audit_submission_checklist', {
    tender_reference: '45/CHU/2026',
    has_provisional_guarantee: false,
    has_declaration_on_honor: false
  });

  const text = rejected.content[0].text;
  assert.ok(text.includes('CAUTIONNEMENT PROVISOIRE MANQUANT'));
  assert.ok(text.includes('DÉCLARATION SUR L\'HONNEUR'));
  assert.ok(text.includes('RISQUE DE REJET ÉLEVÉ') || text.includes('Points Bloquants'));

  const valid = await handleToolCall('audit_submission_checklist', {
    tender_reference: '45/CHU/2026',
    has_provisional_guarantee: true,
    has_declaration_on_honor: true,
    provisional_guarantee_amount: 50000
  });

  const validText = valid.content[0].text;
  assert.ok(validText.includes('PRÊT POUR LE DÉPÔT'));
  assert.ok(validText.includes('100/100'));
});

test('Tool call: verify_evidence_chain validates SHA-256 checksum', async () => {
  const res = await handleToolCall('verify_evidence_chain', {
    storage_uri: 'b2://soumit-dce/ao-45-2026/cps.pdf',
    expected_sha256: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'
  });

  assert.ok(res.content[0].text.includes('Chaîne de Preuve Validée'));
  assert.ok(res.content[0].text.includes('b2://soumit-dce/ao-45-2026/cps.pdf'));
});

test('Tool call: submit_portal_recourse logs override action', async () => {
  const res = await handleToolCall('submit_portal_recourse', {
    contract_id: 'ctr_soumit_998',
    action: 'OVERRIDE_VERDICT',
    rationale: 'Confirmation dérogation spéciale Article 42 après avis juridique',
    actor_identity: 'Directeur Achats',
    actor_role: 'executive',
    override_verdict: 'GO'
  });

  assert.ok(res.content[0].text.includes('Recours Transmis au Portail'));
  assert.ok(res.content[0].text.includes('OVERRIDE_VERDICT'));
});

test('Tool call: unknown tool throws clear error', async () => {
  await assert.rejects(
    async () => {
      await handleToolCall('non_existent_tool', {});
    },
    { message: /Outil inconnu/ }
  );
});
