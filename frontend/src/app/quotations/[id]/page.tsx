'use client';

import React, { use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  ArrowLeft, 
  Printer, 
  ArrowRight,
  Download
} from 'lucide-react';
import { useCrm } from '../../../context/CrmContext';
import { formatINR, formatDate, numberToWordsINR } from '../../../lib/formatters';
import { Badge } from '../../../components/ui/Badge';
import { generateQuotationPDF } from '../../../lib/exportUtils';

export default function QuotationDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const resolvedParams = use(params);
  const { quotations, settings, updateQuotationStatus, convertQuotationToInvoice } = useCrm();

  const quote = quotations.find(q => q.id === resolvedParams.id);

  if (!quote) {
    return (
      <div style={{ padding: '3rem', textAlign: 'center' }}>
        <h2>Quotation Not Found</h2>
        <Link href="/quotations" style={{ color: '#2563EB', marginTop: '1rem', display: 'inline-block' }}>
          ← Back to Quotations List
        </Link>
      </div>
    );
  }

  const handleConvert = async () => {
    try {
      const inv = await convertQuotationToInvoice(quote.id);
      router.push(`/invoices/${inv.id}`);
    } catch (err: any) {
      alert(err?.message || 'Failed to convert quotation');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', paddingBottom: '3rem' }}>
      {/* Top Action Bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }} className="no-print">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <Link href="/quotations" style={{ padding: '6px', border: '1px solid #E5E7EB', borderRadius: '6px', color: '#4B5563', display: 'flex' }}>
            <ArrowLeft size={16} />
          </Link>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <h1 style={{ fontSize: '20px', fontWeight: 800, color: '#171717' }}>{quote.quotationNumber}</h1>
              <Badge status={quote.status} />
            </div>
            <p style={{ fontSize: '13px', color: '#737373' }}>
              Client: <strong>{quote.clientName}</strong> • Revision {quote.revisionNumber}
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button 
            type="button"
            onClick={() => generateQuotationPDF(quote, settings)}
            style={{
              padding: '0.45rem 0.85rem',
              border: '1px solid #E5E7EB',
              borderRadius: '6px',
              fontSize: '12.5px',
              fontWeight: 600,
              backgroundColor: '#FFFFFF',
              color: '#DC2626',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              cursor: 'pointer'
            }}
          >
            <Download size={14} />
            <span>Download PDF</span>
          </button>

          <button 
            type="button"
            onClick={() => window.print()}
            style={{
              padding: '0.45rem 0.85rem',
              border: '1px solid #E5E7EB',
              borderRadius: '6px',
              fontSize: '12.5px',
              fontWeight: 600,
              backgroundColor: '#FFFFFF',
              color: '#171717',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              cursor: 'pointer'
            }}
          >
            <Printer size={14} />
            <span>Print Preview</span>
          </button>

          {quote.status === 'Draft' && (
            <button 
              onClick={() => updateQuotationStatus(quote.id, 'Sent')}
              style={{ padding: '0.45rem 0.85rem', backgroundColor: '#2563EB', color: '#FFFFFF', borderRadius: '6px', fontSize: '12.5px', fontWeight: 600 }}
            >
              Mark as Sent
            </button>
          )}

          {quote.status === 'Sent' && (
            <>
              <button 
                onClick={() => updateQuotationStatus(quote.id, 'Accepted')}
                style={{ padding: '0.45rem 0.85rem', backgroundColor: '#15803D', color: '#FFFFFF', borderRadius: '6px', fontSize: '12.5px', fontWeight: 600 }}
              >
                Accept Quotation
              </button>
              <button 
                onClick={() => updateQuotationStatus(quote.id, 'Rejected', 'Client requested changes')}
                style={{ padding: '0.45rem 0.85rem', backgroundColor: '#DC2626', color: '#FFFFFF', borderRadius: '6px', fontSize: '12.5px', fontWeight: 600 }}
              >
                Reject
              </button>
            </>
          )}

          {quote.status === 'Accepted' && (
            <button 
              onClick={handleConvert}
              style={{
                padding: '0.45rem 1rem',
                backgroundColor: '#171717',
                color: '#FFFFFF',
                borderRadius: '6px',
                fontSize: '12.5px',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <span>Convert to Tax Invoice</span>
              <ArrowRight size={14} />
            </button>
          )}

          {quote.status === 'Converted' && quote.convertedToInvoiceId && (
            <Link 
              href={`/invoices/${quote.convertedToInvoiceId}`}
              style={{
                padding: '0.45rem 1rem',
                backgroundColor: '#FAF5FF',
                color: '#7E22CE',
                border: '1px solid #F3E8FF',
                borderRadius: '6px',
                fontSize: '12.5px',
                fontWeight: 600
              }}
            >
              View Generated Invoice →
            </Link>
          )}
        </div>
      </div>

      {/* A4 Document View */}
      <div style={{
        backgroundColor: '#FFFFFF',
        border: '1px solid #E5E7EB',
        borderRadius: '8px',
        padding: '3rem',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)',
        display: 'flex',
        flexDirection: 'column',
        gap: '1.75rem',
        maxWidth: '850px',
        margin: '0 auto',
        width: '100%'
      }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '2px solid #171717', paddingBottom: '1.25rem' }}>
          <div>
            <h2 style={{ fontSize: '22px', fontWeight: 800, color: '#171717', letterSpacing: '-0.02em' }}>
              {settings.legalEntityName}
            </h2>
            <div style={{ fontSize: '12px', color: '#4B5563', marginTop: '4px', lineHeight: '1.4' }}>
              {settings.registeredAddress}, {settings.city}, {settings.state} — {settings.pinCode}<br />
              GSTIN: <strong>{settings.gstin}</strong> | PAN: {settings.pan}<br />
              Email: {settings.corporateEmail} | Web: {settings.website}
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <span style={{ fontSize: '18px', fontWeight: 800, color: '#171717', letterSpacing: '0.05em' }}>
              ESTIMATE / QUOTATION
            </span>
            <div style={{ fontSize: '14px', fontWeight: 700, marginTop: '4px', fontFamily: 'monospace' }}>
              {quote.quotationNumber}
            </div>
            <div style={{ fontSize: '12px', color: '#737373' }}>Date: {formatDate(quote.quotationDate)}</div>
            <div style={{ fontSize: '12px', color: '#737373' }}>Valid Until: {formatDate(quote.validUntil)}</div>
          </div>
        </div>

        {/* Client & Scope */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', fontSize: '13px' }}>
          <div>
            <span style={{ fontSize: '11px', fontWeight: 700, color: '#737373', textTransform: 'uppercase' }}>Billed To:</span>
            <div style={{ fontSize: '15px', fontWeight: 700, color: '#171717', marginTop: '2px' }}>
              {quote.clientName}
            </div>
            <div style={{ color: '#4B5563' }}>Place of Supply: <strong>{quote.placeOfSupply}</strong></div>
            <div style={{ color: '#4B5563' }}>Tax Type: {quote.isInterState ? 'Inter-State (IGST)' : 'Intra-State (CGST+SGST)'}</div>
          </div>
          <div>
            <span style={{ fontSize: '11px', fontWeight: 700, color: '#737373', textTransform: 'uppercase' }}>Campaign & Terms:</span>
            <div style={{ fontSize: '14px', fontWeight: 700, color: '#171717', marginTop: '2px' }}>{quote.projectTitle}</div>
            <div style={{ color: '#4B5563', marginTop: '4px' }}>Delivery Timeline: {quote.deliveryTimeline}</div>
            <div style={{ color: '#4B5563' }}>Payment Terms: {quote.paymentTerms}</div>
          </div>
        </div>

        {/* Deliverables Table */}
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12.5px', textAlign: 'left' }}>
          <thead>
            <tr style={{ backgroundColor: '#F9FAFB', borderTop: '1px solid #171717', borderBottom: '1px solid #171717' }}>
              <th style={{ padding: '8px' }}>#</th>
              <th style={{ padding: '8px' }}>Service Deliverables</th>
              <th style={{ padding: '8px' }}>SAC</th>
              <th style={{ padding: '8px', textAlign: 'center' }}>Qty</th>
              <th style={{ padding: '8px', textAlign: 'right' }}>Negotiated Rate</th>
              <th style={{ padding: '8px', textAlign: 'right' }}>Discount</th>
              <th style={{ padding: '8px', textAlign: 'right' }}>Amount (₹)</th>
            </tr>
          </thead>
          <tbody>
            {quote.lineItems.map((item, idx) => (
              <tr key={item.id} style={{ borderBottom: '1px solid #E5E7EB' }}>
                <td style={{ padding: '8px', color: '#737373' }}>{idx + 1}</td>
                <td style={{ padding: '8px' }}>
                  <div style={{ fontWeight: 600 }}>{item.serviceName}</div>
                  <div style={{ fontSize: '11.5px', color: '#737373' }}>{item.description}</div>
                </td>
                <td style={{ padding: '8px', fontFamily: 'monospace' }}>{item.sacCode}</td>
                <td style={{ padding: '8px', textAlign: 'center' }}>{item.quantity} {item.billingUnit}</td>
                <td style={{ padding: '8px', textAlign: 'right' }}>{formatINR(item.negotiatedUnitPrice)}</td>
                <td style={{ padding: '8px', textAlign: 'right', color: item.itemDiscountAmount > 0 ? '#DC2626' : '#737373' }}>
                  {item.itemDiscountAmount > 0 ? `−${formatINR(item.itemDiscountAmount)}` : '—'}
                </td>
                <td style={{ padding: '8px', textAlign: 'right', fontWeight: 600 }}>
                  {formatINR(item.taxableAmount)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Summary & Totals */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div style={{ maxWidth: '420px', fontSize: '12px', color: '#4B5563' }}>
            <span style={{ fontWeight: 700, textTransform: 'uppercase', color: '#171717' }}>Scope Notes & Exclusions:</span>
            <p style={{ marginTop: '2px', whiteSpace: 'pre-line' }}>{quote.scopeNotes}</p>
            <div style={{ marginTop: '6px' }}><strong>Exclusions:</strong> {quote.exclusions}</div>
          </div>

          <div style={{ width: '280px', display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '13px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Taxable Subtotal:</span>
              <span style={{ fontWeight: 600 }}>{formatINR(quote.totalTaxableAmount)}</span>
            </div>
            {!quote.isInterState ? (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#4B5563' }}>
                  <span>CGST (9%):</span>
                  <span>{formatINR(quote.cgstAmount)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#4B5563' }}>
                  <span>SGST (9%):</span>
                  <span>{formatINR(quote.sgstAmount)}</span>
                </div>
              </>
            ) : (
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#2563EB' }}>
                <span>IGST (18%):</span>
                <span>{formatINR(quote.igstAmount)}</span>
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '2px solid #171717', paddingTop: '6px', marginTop: '4px' }}>
              <span style={{ fontWeight: 800 }}>Total Payable:</span>
              <span style={{ fontWeight: 800, fontSize: '16px' }}>{formatINR(quote.grandTotal)}</span>
            </div>
            <span style={{ fontSize: '10.5px', color: '#737373', textAlign: 'right', marginTop: '2px' }}>
              {numberToWordsINR(quote.grandTotal)}
            </span>
          </div>
        </div>

        {/* Bank & Signatures */}
        <div style={{
          borderTop: '1px solid #E5E7EB',
          paddingTop: '1rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-end',
          fontSize: '12px'
        }}>
          <div>
            <strong>Bank Settlement Account:</strong><br />
            Bank: {settings.bank.bankName} | A/C: {settings.bank.accountNumber}<br />
            IFSC: {settings.bank.ifsc} | UPI: {settings.bank.upiVpa}
          </div>

          <div style={{ textAlign: 'center', minWidth: '160px' }}>
            <div style={{ height: '35px', borderBottom: '1px dashed #737373', marginBottom: '4px' }} />
            <span>Authorized Signatory</span><br />
            <strong style={{ fontSize: '11px' }}>{settings.legalEntityName}</strong>
          </div>
        </div>
      </div>
    </div>
  );
}
