import crypto from 'node:crypto';
import cors from 'cors';
import express from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import jwt from 'jsonwebtoken';
import { z } from 'zod';

const PORT = Number(process.env.PORT || 8787);
const JWT_SECRET = process.env.JWT_SECRET || 'local-demo-secret-change-before-production';
const ORIGIN = process.env.ALLOWED_ORIGIN || 'http://localhost:5173';
const DEMO_CREDENTIALS = Object.freeze({ departmentId: 'PWD-MH-204', officerId: 'AUD-ASH-204', password: 'GovSpend@2026' });
const POLICY_WEIGHTS = Object.freeze({
  price_deviation: 0.30,
  vendor_graph_risk: 0.20,
  duplicate_fuzzy: 0.20,
  contract_splitting: 0.15,
  timing_anomaly: 0.10,
  approval_velocity: 0.05,
});

const app = express();
app.disable('x-powered-by');
app.use(helmet({ crossOriginResourcePolicy: false }));
app.use(cors({ origin: ORIGIN, methods: ['GET', 'POST'] }));
app.use(express.json({ limit: '250kb' }));
app.use('/api', rateLimit({ windowMs: 60_000, limit: 120, standardHeaders: true, legacyHeaders: false }));

const now = () => new Date().toISOString();
const hash = (value) => crypto.createHash('sha256').update(value).digest('hex');
const token = (value) => `VEND-${crypto.createHmac('sha256', JWT_SECRET).update(value).digest('hex').slice(0, 8).toUpperCase()}`;
const auditLog = [];
const appendAudit = (actorId, action, resourceToken, payload = {}) => {
  const previousHash = auditLog.at(-1)?.entryHash || '0'.repeat(64);
  const timestamp = now();
  const payloadHash = hash(JSON.stringify(payload));
  const entryHash = hash(`${previousHash}|${actorId}|${action}|${resourceToken}|${payloadHash}|${timestamp}`);
  const entry = { id: `LOG-${String(auditLog.length + 1).padStart(5, '0')}`, previousHash, entryHash, actorId, action, resourceToken, payloadHash, timestamp };
  auditLog.push(entry);
  return entry;
};

const computeRisk = (signals) => {
  const weighted = signals.reduce((sum, signal) => sum + (POLICY_WEIGHTS[signal.type] || 0) * signal.value, 0);
  const confidence = signals.reduce((sum, signal) => sum + signal.confidence, 0) / signals.length;
  const score = Math.min(1, Number((weighted * confidence).toFixed(2)));
  return { score, confidenceFactor: Number(confidence.toFixed(2)), tier: score >= 0.75 ? 'HIGH' : score >= 0.4 ? 'BORDERLINE' : 'LOW', weightsVersion: 'v1.0' };
};

const primarySignals = [
  { type: 'price_deviation', value: 1, confidence: 0.98, evidenceIds: ['EV-1001'], label: 'Price deviation', detail: 'Unit price is 2.7× the peer median.' },
  { type: 'duplicate_fuzzy', value: 0.95, confidence: 0.98, evidenceIds: ['EV-1023'], label: 'Duplicate similarity', detail: 'A similar invoice was identified within 48 hours.' },
  { type: 'vendor_graph_risk', value: 1, confidence: 0.98, evidenceIds: ['EV-1054'], label: 'Vendor concentration', detail: 'Vendor accounts for 71% of related department spend.' },
  { type: 'contract_splitting', value: 0.95, confidence: 0.96, evidenceIds: ['EV-1088'], label: 'Purchase pattern', detail: 'Related sub-threshold purchases clustered in ten days.' },
  { type: 'timing_anomaly', value: 0.9, confidence: 0.96, evidenceIds: ['EV-1092'], label: 'Timing anomaly', detail: 'Approval timing differs from the department baseline.' },
  { type: 'approval_velocity', value: 0.85, confidence: 0.98, evidenceIds: ['EV-1101'], label: 'Approval velocity', detail: 'Approval completed faster than comparable purchases.' },
];
const primaryRisk = computeRisk(primarySignals);
const vendorToken = token('ABC Infrastructure Pvt. Ltd.');
const cases = [{
  id: 'AUD-2026-00182', transactionId: 'TX10291', status: 'OPEN', assignedAuditorId: 'asharma', jurisdiction: 'MH-PWD', department: 'Public Works Department', vendorToken,
  amount: 1840000, invoiceAmount: 1840000, paymentAmount: 2140000, invoice: 'INV-8832', contract: 'CNT-22091', createdAt: '2026-08-19T08:30:00.000Z', signals: primarySignals, risk: primaryRisk,
  evidence: { peerMedian: 681500, paymentDifference: 300000, weightsVersion: 'v1.0', policyCitations: ['GFR-4.3', 'PROC-7.1'] },
}, {
  id: 'AUD-2026-00176', transactionId: 'TX10418', status: 'IN_REVIEW', assignedAuditorId: 'asharma', jurisdiction: 'MH-HEALTH', department: 'Health Department', vendorToken: token('MedSupply India'), amount: 1280000, createdAt: '2026-08-19T11:20:00.000Z', signals: primarySignals.slice(0, 2), risk: { score: 0.91, confidenceFactor: 0.96, tier: 'HIGH', weightsVersion: 'v1.0' }, evidence: { weightsVersion: 'v1.0' },
}];
const unmaskRequests = [];

const toMaskedCase = (item) => ({
  id: item.id, transactionId: item.transactionId, status: item.status, assignedAuditorId: item.assignedAuditorId, jurisdiction: item.jurisdiction, department: item.department,
  vendorToken: item.vendorToken, amount: item.amount, invoiceAmount: item.invoiceAmount, paymentAmount: item.paymentAmount, invoice: item.invoice, contract: item.contract, createdAt: item.createdAt,
  risk: item.risk, signals: item.signals, evidence: item.evidence,
});
const authenticate = (req, res, next) => {
  const bearer = req.headers.authorization?.replace(/^Bearer\s+/i, '');
  if (!bearer) return res.status(401).json({ error: 'Authentication required' });
  try { req.user = jwt.verify(bearer, JWT_SECRET); return next(); } catch { return res.status(401).json({ error: 'Invalid or expired session' }); }
};
const allow = (...permissions) => (req, res, next) => permissions.some((permission) => req.user.permissions.includes(permission)) ? next() : res.status(403).json({ error: 'Missing required permission' });
const inScope = (req, item) => req.user.jurisdictions.includes('NATIONAL') || req.user.jurisdictions.includes(item.jurisdiction);

app.get('/api/health', (_req, res) => res.json({ status: 'ok', service: 'govspend-local-mvp', time: now() }));
app.post('/api/auth/login', (req, res) => {
  const input = z.object({ departmentId: z.string().min(3), officerId: z.string().min(3), password: z.string().min(4) }).safeParse(req.body);
  if (!input.success) return res.status(400).json({ error: 'Department ID, Officer ID and password are required.' });
  if (input.data.departmentId !== DEMO_CREDENTIALS.departmentId || input.data.officerId !== DEMO_CREDENTIALS.officerId || input.data.password !== DEMO_CREDENTIALS.password) return res.status(401).json({ error: 'The issued demo credentials were not recognized.' });
  const user = { id: input.data.officerId.toLowerCase(), name: 'A. Sharma', role: 'Senior Audit Officer', jurisdictions: ['MH-PWD', 'MH-HEALTH'], permissions: ['READ_MASKED', 'READ_BENCHMARK', 'READ_AUDIT', 'WRITE_EXECUTE', 'WRITE_UNMASK'] };
  const accessToken = jwt.sign(user, JWT_SECRET, { expiresIn: '8h', issuer: 'govspend-local-mvp' });
  appendAudit(user.id, 'AUTH_LOGIN', `USER-${user.id}`);
  res.json({ accessToken, user });
});

app.get('/api/cases', authenticate, allow('READ_MASKED'), (req, res) => {
  const tier = req.query.tier?.toString().toUpperCase();
  const visible = cases.filter((item) => inScope(req, item) && (!tier || item.risk.tier === tier)).map(toMaskedCase);
  appendAudit(req.user.id, 'READ_CASE_QUEUE', 'CASE_QUEUE', { count: visible.length });
  res.json({ data: visible, page: 1, pageSize: 25, total: visible.length });
});
app.get('/api/cases/:id', authenticate, allow('READ_MASKED'), (req, res) => {
  const item = cases.find((entry) => entry.id === req.params.id || entry.transactionId === req.params.id);
  if (!item) return res.status(404).json({ error: 'Case not found' });
  if (!inScope(req, item)) return res.status(403).json({ error: 'Jurisdiction access denied' });
  appendAudit(req.user.id, 'READ_MASKED_CASE', item.id);
  res.json({ data: toMaskedCase(item) });
});
app.get('/api/benchmark/price', authenticate, allow('READ_BENCHMARK'), (req, res) => {
  appendAudit(req.user.id, 'READ_BENCHMARK', req.query.category?.toString() || 'UNKNOWN');
  res.json({ data: { category: req.query.category || 'Construction', region: req.query.region || 'MH', sampleSize: 92, median: 681500, q1: 621000, q3: 745000, iqr: 124000, upperFence: 931000 } });
});
app.get('/api/vendors/:vendorToken/graph', authenticate, allow('READ_MASKED'), (req, res) => {
  appendAudit(req.user.id, 'READ_VENDOR_GRAPH', req.params.vendorToken);
  res.json({ data: { nodes: [{ id: req.params.vendorToken, type: 'vendor', label: req.params.vendorToken }, { id: 'DEPT-PWD', type: 'department', label: 'Public Works Department' }, { id: 'TND-22091', type: 'tender', label: 'CNT-22091' }, { id: 'PAY-TX10291', type: 'payment', label: 'TX10291' }], edges: [{ source: 'DEPT-PWD', target: 'TND-22091', label: 'raises' }, { source: 'TND-22091', target: req.params.vendorToken, label: 'awarded to' }, { source: req.params.vendorToken, target: 'PAY-TX10291', label: 'receives' }] } });
});
app.post('/api/cases/:id/actions', authenticate, allow('WRITE_EXECUTE'), (req, res) => {
  const parsed = z.object({ action: z.enum(['APPROVE', 'REJECT', 'ESCALATE', 'RECALIBRATE']), justification: z.string().min(5).max(500) }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'A permitted action and justification of at least five characters are required.' });
  const item = cases.find((entry) => entry.id === req.params.id);
  if (!item) return res.status(404).json({ error: 'Case not found' });
  if (!inScope(req, item)) return res.status(403).json({ error: 'Jurisdiction access denied' });
  item.status = parsed.data.action === 'APPROVE' ? 'APPROVED' : parsed.data.action === 'REJECT' ? 'REJECTED' : parsed.data.action === 'ESCALATE' ? 'ESCALATED' : 'IN_REVIEW';
  const audit = appendAudit(req.user.id, `CASE_${parsed.data.action}`, item.id, { justification: parsed.data.justification });
  res.status(201).json({ data: { case: toMaskedCase(item), auditId: audit.id } });
});
app.post('/api/unmask/request', authenticate, allow('WRITE_UNMASK'), (req, res) => {
  const parsed = z.object({ caseId: z.string(), entity: z.enum(['VENDOR', 'CONTRACT']), reason: z.string().min(12).max(500) }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'A case, supported entity, and detailed justification are required.' });
  const item = cases.find((entry) => entry.id === parsed.data.caseId);
  if (!item) return res.status(404).json({ error: 'Case not found' });
  if (!inScope(req, item)) return res.status(403).json({ error: 'Jurisdiction access denied' });
  const request = { id: `UNM-${String(unmaskRequests.length + 1).padStart(5, '0')}`, caseId: item.id, entity: parsed.data.entity, reason: parsed.data.reason, requesterId: req.user.id, jurisdiction: item.jurisdiction, status: 'PENDING', createdAt: now() };
  unmaskRequests.push(request); appendAudit(req.user.id, 'REQUEST_UNMASK', request.id, { caseId: item.id, entity: request.entity });
  res.status(201).json({ data: request });
});
app.post('/api/unmask/:id/approve', authenticate, allow('WRITE_UNMASK'), (req, res) => {
  const request = unmaskRequests.find((entry) => entry.id === req.params.id);
  if (!request) return res.status(404).json({ error: 'Unmask request not found' });
  if (request.requesterId === req.user.id) return res.status(403).json({ error: 'Maker-checker control: requester cannot approve their own unmask request.' });
  if (request.status !== 'PENDING') return res.status(409).json({ error: 'Unmask request is not pending.' });
  request.status = 'APPROVED'; request.approverId = req.user.id; request.approvedAt = now(); appendAudit(req.user.id, 'APPROVE_UNMASK', request.id);
  res.json({ data: { ...request, reveal: 'Sensitive identity data is not available in the local MVP ledger.' } });
});
app.get('/api/audit-log', authenticate, allow('READ_AUDIT'), (req, res) => res.json({ data: auditLog }));
app.post('/api/ai/explain', authenticate, allow('READ_MASKED'), (req, res) => {
  const caseId = req.body?.caseId || 'AUD-2026-00182'; const item = cases.find((entry) => entry.id === caseId);
  if (!item || !inScope(req, item)) return res.status(404).json({ error: 'Sufficient authorized evidence was not found.' });
  appendAudit(req.user.id, 'READ_GROUNDED_EXPLANATION', item.id);
  res.json({ data: { rationale: 'This case is prioritized because payment exceeds the invoice by ₹3,00,000, the unit price is above the peer benchmark, a similar invoice was found within 48 hours, and the masked vendor shows high related-department concentration.', groundingRate: 1, citations: [{ evidenceId: 'EV-1001', policyId: 'GFR-4.3' }, { evidenceId: 'EV-1023', policyId: 'PROC-7.1' }] } });
});

if (process.argv[1]?.endsWith('index.js')) app.listen(PORT, () => console.log(`GovSpend local MVP API listening on http://localhost:${PORT}`));
export { app, computeRisk, token };
