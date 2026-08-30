import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

// All names and identifiers below are fictional. This produces repeatable demo data only.
const departments = [
  ['Public Works Department', 'MH'], ['Health Department', 'KA'], ['Education Department', 'TN'],
  ['Transport Department', 'GJ'], ['Rural Development Department', 'RJ'], ['Water Resources Department', 'MP'],
  ['Urban Development Department', 'UP'], ['Power Department', 'TS'], ['Social Welfare Department', 'WB'],
];
const vendors = [
  'Aarav Infra Systems Pvt. Ltd.', 'Swasthya Medical Supplies Pvt. Ltd.', 'EduServe Digital Services Pvt. Ltd.',
  'Narmada Equipment Works Pvt. Ltd.', 'Pragati Engineering Solutions Pvt. Ltd.', 'CivicBuild Projects Pvt. Ltd.',
  'Bharat Office Systems Pvt. Ltd.', 'Kaveri Health Logistics LLP', 'Suryodaya Roadworks Limited',
  'NexGen Learning Technologies Pvt. Ltd.', 'Vindhya Water Solutions LLP', 'JanKalyan Facility Services Pvt. Ltd.',
  'Western Grid Components Limited', 'Sampoorna Safety Equipment LLP', 'Dakshin Data Networks Pvt. Ltd.',
  'Shakti Civil Contractors Limited', 'National Public Procurement Services LLP', 'Greenfield Urban Systems Pvt. Ltd.',
];
const categories = [
  ['Construction', 82000, 168000], ['Medical supplies', 2400, 18000], ['IT services', 38000, 110000],
  ['Equipment', 14000, 92000], ['Water infrastructure', 54000, 150000], ['Road maintenance', 26000, 86000],
  ['Training services', 9000, 34000], ['Electrical materials', 6500, 42000], ['Facility management', 18000, 58000],
];
const countArgument = process.argv.find(value => value.startsWith('--count='));
const requestedCount = Number(countArgument?.slice('--count='.length) || process.env.DATASET_SIZE || 150);
const totalCount = Number.isInteger(requestedCount) && requestedCount >= 100 ? requestedCount : 150;
const fixedScenarioCount = 2;
const rowCount = totalCount - fixedScenarioCount;
let seed = 20260829;
const random = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
const integer = (min, max) => Math.floor(random() * (max - min + 1)) + min;
const dateFor = index => new Date(Date.UTC(2026, 3, 1) + ((index * 17 + integer(0, 16)) % 150) * 86400000).toISOString().slice(0, 10);

const rows = [];
for (let index = 1; index <= rowCount; index += 1) {
  const [department, region] = departments[(index * 5 + integer(0, departments.length - 1)) % departments.length];
  const [category, lowUnitPrice, highUnitPrice] = categories[(index * 7 + integer(0, categories.length - 1)) % categories.length];
  const vendor = vendors[(index * 11 + integer(0, vendors.length - 1)) % vendors.length];
  const quantity = integer(4, 70);
  const unitPrice = integer(lowUnitPrice, highUnitPrice);
  const amount = Math.round(unitPrice * quantity);
  const paymentMismatch = index % 47 === 0;
  const duplicatePattern = index % 59 === 0;
  rows.push({
    id: `TX${String(20000 + index).padStart(5, '0')}`,
    invoice: `INV-${region}-${String(850000 + index).padStart(6, '0')}`,
    contract: `CNT-${region}-${String(410000 + ((index * 13) % 85000)).padStart(6, '0')}`,
    date: dateFor(index), department, vendor, category, region, amount, invoiceAmount: amount,
    paymentAmount: paymentMismatch ? amount + Math.round(amount * (0.04 + random() * 0.11)) : amount,
    unitPrice: index % 137 === 0 ? Math.round(unitPrice * 2.2) : unitPrice, quantity,
    approvalHours: index % 97 === 0 ? integer(1, 5) : integer(18, 120),
    referenceGroup: duplicatePattern ? `REF-DUP-${Math.floor(index / 211)}` : `REF-${20000 + index}`,
  });
}
rows.push(
  { id: 'TX10291', invoice: 'INV-MH-008832', contract: 'CNT-MH-022091', date: '2026-08-18', department: 'Public Works Department', vendor: 'Aarav Infra Systems Pvt. Ltd.', category: 'Construction', region: 'MH', amount: 1840000, invoiceAmount: 1840000, paymentAmount: 2140000, unitPrice: 92000, quantity: 20, approvalHours: 3, referenceGroup: 'REF-TX10291' },
  { id: 'TX10292', invoice: 'INV-MH-008833', contract: 'CNT-MH-022092', date: '2026-08-20', department: 'Public Works Department', vendor: 'Aarav Infra Systems Pvt. Ltd.', category: 'Construction', region: 'MH', amount: 1810000, invoiceAmount: 1810000, paymentAmount: 1810000, unitPrice: 90500, quantity: 20, approvalHours: 6, referenceGroup: 'REF-TX10291' },
);
await mkdir(path.resolve('data'), { recursive: true });
await writeFile(path.resolve('data', 'transactions.json'), `${JSON.stringify({ generatedAt: new Date().toISOString(), synthetic: true, recordCount: rows.length, transactions: rows }, null, 2)}\n`);
console.log(`Generated ${rows.length} fictional transactions in data/transactions.json`);
