const fs = require('fs');
const path = require('path');

// Polyfill for Node environment
global.window = global;
global.self = global;
global.navigator = { userAgent: 'node' };
if (!global.atob) {
  global.atob = (str) => Buffer.from(str, 'base64').toString('binary');
}
if (!global.btoa) {
  global.btoa = (str) => Buffer.from(str, 'binary').toString('base64');
}

const { generateInvoicePDF, generateQuotationPDF } = require('./dist/lib/exportUtils');

// Sample invoice testing all user test requirements:
// ₹6,018
// ₹900 discount
// ₹459 GST
// ₹10,000
// ₹1,00,000
// ₹1,234.50
const sampleInvoice = {
  id: 'inv-test-001',
  invoiceNumber: 'INV-2026-TEST',
  quotationNumber: 'Q-2026-TEST',
  clientName: 'Apex Brands India Pvt Ltd',
  clientGstin: '27AAACA1234A1Z5',
  clientAddress: '101 Cyber City, Pune, Maharashtra 411014',
  placeOfSupply: 'Maharashtra (27)',
  invoiceDate: '2026-10-31',
  dueDate: '2026-11-15',
  currency: 'INR',
  lineItems: [
    {
      serviceName: 'Enterprise Brand Strategy',
      description: 'Comprehensive brand positioning & architecture',
      sacCode: '998311',
      quantity: 1,
      billingUnit: 'Project',
      negotiatedUnitPrice: 100000,
      taxableAmount: 100000,
      gstRate: 18,
      lineTotal: 118000
    },
    {
      serviceName: 'Digital Campaign Assets',
      description: 'Creative direction and assets delivery',
      sacCode: '998311',
      quantity: 1,
      billingUnit: 'Campaign',
      negotiatedUnitPrice: 10000,
      taxableAmount: 10000,
      gstRate: 18,
      lineTotal: 11800
    },
    {
      serviceName: 'Custom Analytics Retainer',
      description: 'Detailed analytics and monthly tracking',
      sacCode: '998311',
      quantity: 1,
      billingUnit: 'Month',
      negotiatedUnitPrice: 1234.50,
      taxableAmount: 1234.50,
      gstRate: 18,
      lineTotal: 1456.71
    },
    {
      serviceName: 'Targeted Production Services',
      description: 'Subtotal 6000, Discount 900 -> 5100, GST 9% + 9% (459 + 459 = 918) -> Grand 6018',
      sacCode: '998311',
      quantity: 1,
      billingUnit: 'Item',
      negotiatedUnitPrice: 6000,
      taxableAmount: 6000,
      gstRate: 18,
      lineTotal: 7080
    }
  ],
  taxableSubtotal: 6000, // Scenario: subtotal 6000, discount 900 -> taxable 5100, CGST 459, SGST 459 -> grand total 6018
  discountType: 'percentage',
  discountValue: 15,
  discountAmount: 900,
  taxableAmount: 5100,
  cgstAmount: 459,
  sgstAmount: 459,
  igstAmount: 0,
  grandTotal: 6018,
  amountReceived: 1000,
  balanceOutstanding: 5018,
  paymentTerms: 'Due within 15 days of invoice date',
  status: 'sent'
};

const companySettings = {
  companyName: 'Hexns Mediaworks LLP',
  address: 'Near Vasant Bahar Road, New Shahupuri, Kolhapur – 416002, Maharashtra',
  pan: 'ABCDE1234F',
  gstin: '27AAGCH7890J1Z2',
  cinLlpIn: 'ACR-0880',
  bank: {
    bankName: 'HDFC Bank Ltd',
    accountNumber: '50200012345678',
    ifsc: 'HDFC0000123',
    branch: 'Shahupuri, Kolhapur',
    upiVpa: 'hexns@hdfcbank'
  },
  invoiceStatutoryNote: 'Tax payable under reverse charge: No.'
};

// Monkey-patch jsPDF.prototype.save to write to a local file
const { jsPDF } = require('jspdf');
const originalSave = jsPDF.prototype.save;
jsPDF.prototype.save = function(filename) {
  const outputPath = path.join(__dirname, filename || 'output.pdf');
  const buffer = Buffer.from(this.output('arraybuffer'));
  fs.writeFileSync(outputPath, buffer);
  console.log(`Saved PDF to: ${outputPath} (${buffer.length} bytes)`);
  return this;
};

console.log('Generating test invoice PDF...');
generateInvoicePDF(sampleInvoice, companySettings);
console.log('Invoice PDF generated successfully!');
