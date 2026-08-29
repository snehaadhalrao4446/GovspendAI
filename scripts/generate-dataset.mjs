import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const departments = ['Public Works Department', 'Health Department', 'Education Department', 'Transport Department', 'Rural Development Department', 'Water Resources Department', 'Urban Development Department'];
const vendors = ['Aarav Infra Systems Pvt. Ltd.', 'Swasthya Medical Supplies Pvt. Ltd.', 'EduServe Digital Services Pvt. Ltd.', 'Narmada Equipment Works Pvt. Ltd.', 'Pragati Engineering Solutions Pvt. Ltd.', 'CivicBuild Projects Pvt. Ltd.', 'Bharat Office Systems Pvt. Ltd.'];
const categories = ['Construction', 'Medical supplies', 'IT services', 'Equipment', 'Water infrastructure', 'Road maintenance', 'Training services'];
const baseAmounts = [184000, 228000, 352000, 468000, 612000, 785000, 924000];
const rows = [];
for (let index = 1; index <= 126; index += 1) {
  const departmentIndex = index % departments.length;
  const vendorIndex = (index * 3 + 1) % vendors.length;
  const amount = baseAmounts[index % baseAmounts.length] + ((index * 1379) % 51000);
  const day = String((index % 26) + 1).padStart(2, '0');
  rows.push({
    id: `TX${String(10000 + index).padStart(5, '0')}`,
    invoice: `INV-${String(7000 + index).padStart(4, '0')}`,
    contract: `CNT-${String(22000 + index).padStart(5, '0')}`,
    date: `2026-08-${day}`,
    department: departments[departmentIndex],
    vendor: vendors[vendorIndex],
    category: categories[departmentIndex],
    region: 'MH',
    amount,
    invoiceAmount: amount,
    paymentAmount: amount,
    unitPrice: Math.round(amount / (20 + (index % 15))),
    quantity: 20 + (index % 15),
    approvalHours: 18 + (index % 52),
    referenceGroup: `REF-${index}`,
  });
}
rows.push({ id: 'TX10291', invoice: 'INV-8832', contract: 'CNT-22091', date: '2026-08-18', department: 'Public Works Department', vendor: 'Aarav Infra Systems Pvt. Ltd.', category: 'Construction', region: 'MH', amount: 1840000, invoiceAmount: 1840000, paymentAmount: 2140000, unitPrice: 92000, quantity: 20, approvalHours: 3, referenceGroup: 'REF-TX10291' });
rows.push({ id: 'TX10292', invoice: 'INV-8833', contract: 'CNT-22092', date: '2026-08-20', department: 'Public Works Department', vendor: 'Aarav Infra Systems Pvt. Ltd.', category: 'Construction', region: 'MH', amount: 1810000, invoiceAmount: 1810000, paymentAmount: 1810000, unitPrice: 90500, quantity: 20, approvalHours: 6, referenceGroup: 'REF-TX10291' });
await mkdir(path.resolve('data'), { recursive: true });
await writeFile(path.resolve('data', 'transactions.json'), `${JSON.stringify({ generatedAt: new Date().toISOString(), transactions: rows }, null, 2)}\n`);
console.log(`Generated ${rows.length} synthetic transactions in data/transactions.json`);
