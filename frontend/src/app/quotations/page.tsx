'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  Plus, 
  Search, 
  Eye, 
  Copy, 
  CheckCircle, 
  XCircle, 
  Clock,
  Download
} from 'lucide-react';
import { useCrm } from '../../context/CrmContext';
import { Quotation } from '../../types/crm';
import { formatINR, formatDate } from '../../lib/formatters';
import { isDateInRange } from '../../lib/financialCalculations';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';

export default function QuotationsPage() {
  const router = useRouter();
  const { quotations, updateQuotationStatus, addQuotation, convertQuotationToInvoice } = useCrm();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [dateRangeFilter, setDateRangeFilter] = useState<string>('all');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [rejectModalQuoteId, setRejectModalQuoteId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [convertConfirmQuote, setConvertConfirmQuote] = useState<Quotation | null>(null);

  // Filter logic
  const filteredQuotations = quotations.filter(q => {
    const matchesSearch = 
      q.quotationNumber.toLowerCase().includes(search.toLowerCase()) ||
      q.clientName.toLowerCase().includes(search.toLowerCase()) ||
      q.projectTitle.toLowerCase().includes(search.toLowerCase());

    const matchesStatus = statusFilter === 'All' || q.status === statusFilter;
    const dateToCheck = q.quotationDate || q.createdAt?.slice(0, 10) || '';
    const matchesDate = isDateInRange(dateToCheck, dateRangeFilter, customStartDate, customEndDate);

    return matchesSearch && matchesStatus && matchesDate;
  });

  const handleDuplicate = async (quote: Quotation) => {
    try {
      const dupCount = quotations.length + 91;
      const dupNumber = `HEX/26-27/Q-${String(dupCount).padStart(4, '0')}`;
      const newQuote = await addQuotation({
        ...quote,
        quotationNumber: dupNumber,
        revisionNumber: 1,
        projectTitle: `${quote.projectTitle} (Copy)`,
        status: "Draft",
        quotationDate: new Date().toISOString().split('T')[0]
      });
      router.push(`/quotations/${newQuote.id}`);
    } catch (err: any) {
      alert(err?.message || 'Failed to duplicate quotation');
    }
  };

  const handleExportCSV = () => {
    const headers = ['Quotation #', 'Revision', 'Client Name', 'Project Title', 'Quotation Date', 'Valid Until', 'Taxable Amount', 'CGST', 'SGST', 'IGST', 'Grand Total', 'Status'];
    const rows = filteredQuotations.map(q => [
      q.quotationNumber,
      q.revisionNumber,
      `"${q.clientName.replace(/"/g, '""')}"`,
      `"${q.projectTitle.replace(/"/g, '""')}"`,
      q.quotationDate,
      q.validUntil,
      q.totalTaxableAmount,
      q.cgstAmount,
      q.sgstAmount,
      q.igstAmount,
      q.grandTotal,
      q.status
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `HEXNS_Quotations_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleRejectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectModalQuoteId) return;
    try {
      await updateQuotationStatus(rejectModalQuoteId, 'Rejected', rejectionReason);
      setRejectModalQuoteId(null);
      setRejectionReason('');
    } catch (err: any) {
      alert(err?.message || 'Failed to reject quotation');
    }
  };

  const handleConvertExecute = async () => {
    if (!convertConfirmQuote) return;
    try {
      const invoice = await convertQuotationToInvoice(convertConfirmQuote.id);
      setConvertConfirmQuote(null);
      router.push(`/invoices/${invoice.id}`);
    } catch (err: any) {
      alert(err?.message || 'Failed to convert quotation to invoice');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* Page Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '20px', fontWeight: 700, color: '#171717', letterSpacing: '-0.02em' }}>
            Quotations & Estimates
          </h1>
          <p style={{ fontSize: '13px', color: '#737373', marginTop: '2px' }}>
            Manage proposals, multi-tier pricing bids, client acceptance workflows, and invoice conversions.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <button
            onClick={handleExportCSV}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              backgroundColor: '#FFFFFF',
              color: '#374151',
              border: '1px solid #E5E7EB',
              padding: '0.45rem 0.85rem',
              borderRadius: '6px',
              fontSize: '13px',
              fontWeight: 500
            }}
          >
            <Download size={14} />
            <span>Export CSV</span>
          </button>
          <Link 
            href="/quotations/new"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              backgroundColor: '#171717',
              color: '#FFFFFF',
              padding: '0.45rem 0.9rem',
              borderRadius: '6px',
              fontSize: '13px',
              fontWeight: 600
            }}
          >
            <Plus size={15} />
            <span>+ New Quotation</span>
          </Link>
        </div>
      </div>

      {/* Filter Bar */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '0.75rem',
        backgroundColor: '#FFFFFF',
        padding: '0.75rem 1rem',
        borderRadius: '8px',
        border: '1px solid #E5E7EB'
      }}>
        {/* Search */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1, minWidth: '240px' }}>
          <Search size={15} color="#9CA3AF" />
          <input 
            type="text" 
            placeholder="Search quotation #, client name, or project title..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ border: 'none', outline: 'none', fontSize: '13px', width: '100%' }}
          />
        </div>

        {/* Date Filter & Status Pill Filters */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap' }}>
          <select 
            value={dateRangeFilter}
            onChange={(e) => setDateRangeFilter(e.target.value)}
            style={{ padding: '0.35rem 0.65rem', border: '1px solid #E5E7EB', borderRadius: '6px', fontSize: '12px', color: '#171717', backgroundColor: '#FFFFFF' }}
          >
            <option value="all">All Dates</option>
            <option value="this_month">This Month</option>
            <option value="last_month">Last Month</option>
            <option value="this_quarter">This Quarter</option>
            <option value="this_year">This FY (2026-27)</option>
            <option value="custom">Custom Range</option>
          </select>

          {dateRangeFilter === 'custom' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <input 
                type="date" 
                value={customStartDate} 
                onChange={(e) => setCustomStartDate(e.target.value)} 
                style={{ padding: '0.25rem 0.4rem', border: '1px solid #E5E7EB', borderRadius: '4px', fontSize: '11px' }} 
              />
              <span style={{ fontSize: '11px', color: '#737373' }}>to</span>
              <input 
                type="date" 
                value={customEndDate} 
                onChange={(e) => setCustomEndDate(e.target.value)} 
                style={{ padding: '0.25rem 0.4rem', border: '1px solid #E5E7EB', borderRadius: '4px', fontSize: '11px' }} 
              />
            </div>
          )}

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            {['All', 'Draft', 'Sent', 'Accepted', 'Converted', 'Rejected'].map(st => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                style={{
                  padding: '0.3rem 0.65rem',
                  borderRadius: '6px',
                  fontSize: '12px',
                  fontWeight: statusFilter === st ? 600 : 500,
                  backgroundColor: statusFilter === st ? '#171717' : '#F9FAFB',
                  color: statusFilter === st ? '#FFFFFF' : '#4B5563',
                  border: '1px solid',
                  borderColor: statusFilter === st ? '#171717' : '#E5E7EB',
                  cursor: 'pointer'
                }}
              >
                {st}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Quotations Table */}
      <div style={{
        backgroundColor: '#FFFFFF',
        border: '1px solid #E5E7EB',
        borderRadius: '8px',
        overflow: 'hidden',
        boxShadow: '0 1px 2px rgba(0,0,0,0.03)'
      }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
            <thead>
              <tr style={{ backgroundColor: '#F9FAFB', borderBottom: '1px solid #E5E7EB' }}>
                <th style={{ padding: '0.65rem 1rem', fontSize: '11.5px', color: '#737373', fontWeight: 600, textTransform: 'uppercase' }}>Quotation #</th>
                <th style={{ padding: '0.65rem 1rem', fontSize: '11.5px', color: '#737373', fontWeight: 600, textTransform: 'uppercase' }}>Client & Project</th>
                <th style={{ padding: '0.65rem 1rem', fontSize: '11.5px', color: '#737373', fontWeight: 600, textTransform: 'uppercase' }}>Issue Date</th>
                <th style={{ padding: '0.65rem 1rem', fontSize: '11.5px', color: '#737373', fontWeight: 600, textTransform: 'uppercase' }}>Valid Until</th>
                <th style={{ padding: '0.65rem 1rem', fontSize: '11.5px', color: '#737373', fontWeight: 600, textTransform: 'uppercase' }}>Taxable Base</th>
                <th style={{ padding: '0.65rem 1rem', fontSize: '11.5px', color: '#737373', fontWeight: 600, textTransform: 'uppercase' }}>GST</th>
                <th style={{ padding: '0.65rem 1rem', fontSize: '11.5px', color: '#737373', fontWeight: 600, textTransform: 'uppercase' }}>Grand Total</th>
                <th style={{ padding: '0.65rem 1rem', fontSize: '11.5px', color: '#737373', fontWeight: 600, textTransform: 'uppercase' }}>Status</th>
                <th style={{ padding: '0.65rem 1rem', fontSize: '11.5px', color: '#737373', fontWeight: 600, textTransform: 'uppercase', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredQuotations.map(quote => {
                const totalGst = quote.cgstAmount + quote.sgstAmount + quote.igstAmount;

                return (
                  <tr 
                    key={quote.id}
                    style={{ borderBottom: '1px solid #F3F4F6', transition: 'background-color 0.1s ease' }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#F9FAFB')}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#FFFFFF')}
                  >
                    <td style={{ padding: '0.85rem 1rem' }}>
                      <Link href={`/quotations/${quote.id}`} style={{ fontWeight: 700, color: '#2563EB' }}>
                        {quote.quotationNumber}
                      </Link>
                      <div style={{ fontSize: '11px', color: '#737373' }}>Rev {quote.revisionNumber}</div>
                    </td>
                    <td style={{ padding: '0.85rem 1rem' }}>
                      <div style={{ fontWeight: 600, color: '#171717' }}>{quote.clientName}</div>
                      <div style={{ fontSize: '11.5px', color: '#737373' }}>{quote.projectTitle}</div>
                    </td>
                    <td style={{ padding: '0.85rem 1rem', color: '#4B5563' }}>
                      {formatDate(quote.quotationDate)}
                    </td>
                    <td style={{ padding: '0.85rem 1rem', color: '#4B5563' }}>
                      {formatDate(quote.validUntil)}
                    </td>
                    <td style={{ padding: '0.85rem 1rem', fontWeight: 500 }}>
                      {formatINR(quote.totalTaxableAmount)}
                    </td>
                    <td style={{ padding: '0.85rem 1rem', fontSize: '12px', color: '#737373' }}>
                      {formatINR(totalGst)}
                      <span style={{ fontSize: '10px', display: 'block', color: quote.isInterState ? '#2563EB' : '#15803D' }}>
                        {quote.isInterState ? 'IGST 18%' : 'CGST+SGST 18%'}
                      </span>
                    </td>
                    <td style={{ padding: '0.85rem 1rem', fontWeight: 700, color: '#171717' }}>
                      {formatINR(quote.grandTotal)}
                    </td>
                    <td style={{ padding: '0.85rem 1rem' }}>
                      <Badge status={quote.status} />
                    </td>
                    <td style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                        <Link 
                          href={`/quotations/${quote.id}`}
                          title="View / Print A4"
                          style={{ padding: '4px', color: '#4B5563', borderRadius: '4px' }}
                        >
                          <Eye size={15} />
                        </Link>

                        <button 
                          onClick={() => handleDuplicate(quote)}
                          title="Duplicate Quotation"
                          style={{ padding: '4px', color: '#4B5563', borderRadius: '4px' }}
                        >
                          <Copy size={15} />
                        </button>

                        {quote.status === 'Draft' && (
                          <button 
                            onClick={() => updateQuotationStatus(quote.id, 'Sent')}
                            title="Mark as Sent to Client"
                            style={{ padding: '4px', color: '#2563EB', borderRadius: '4px' }}
                          >
                            <Clock size={15} />
                          </button>
                        )}

                        {quote.status === 'Sent' && (
                          <>
                            <button 
                              onClick={() => updateQuotationStatus(quote.id, 'Accepted')}
                              title="Mark as Accepted"
                              style={{ padding: '4px', color: '#15803D', borderRadius: '4px' }}
                            >
                              <CheckCircle size={15} />
                            </button>
                            <button 
                              onClick={() => setRejectModalQuoteId(quote.id)}
                              title="Mark as Rejected"
                              style={{ padding: '4px', color: '#EF4444', borderRadius: '4px' }}
                            >
                              <XCircle size={15} />
                            </button>
                          </>
                        )}

                        {quote.status === 'Accepted' && (
                          <button 
                            onClick={() => setConvertConfirmQuote(quote)}
                            title="Convert to Tax Invoice"
                            style={{
                              padding: '2px 8px',
                              backgroundColor: '#171717',
                              color: '#FFFFFF',
                              borderRadius: '4px',
                              fontSize: '11px',
                              fontWeight: 600
                            }}
                          >
                            Convert →
                          </button>
                        )}

                        {quote.status === 'Converted' && quote.convertedToInvoiceId && (
                          <Link 
                            href={`/invoices/${quote.convertedToInvoiceId}`}
                            title="View Linked Invoice"
                            style={{
                              padding: '2px 8px',
                              backgroundColor: '#FAF5FF',
                              color: '#7E22CE',
                              border: '1px solid #F3E8FF',
                              borderRadius: '4px',
                              fontSize: '11px',
                              fontWeight: 600
                            }}
                          >
                            View Inv
                          </Link>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filteredQuotations.length === 0 && (
                <tr>
                  <td colSpan={9} style={{ padding: '2rem', textAlign: 'center', color: '#737373' }}>
                    No quotations found matching your criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Reject Reason Modal */}
      <Modal
        isOpen={Boolean(rejectModalQuoteId)}
        onClose={() => setRejectModalQuoteId(null)}
        title="Mark Quotation as Rejected"
        subtitle="Log the reason for client decline to improve sales pipeline insights."
      >
        <form onSubmit={handleRejectSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label style={{ fontSize: '12px', fontWeight: 600, color: '#4B5563' }}>Decline Reason *</label>
            <textarea 
              required
              rows={3}
              placeholder="e.g. Budget constraints, chose competitor, deferred campaign to Q4..."
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              style={{ width: '100%', padding: '0.5rem', border: '1px solid #E5E7EB', borderRadius: '4px', marginTop: '4px' }}
            />
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
            <button 
              type="button" 
              onClick={() => setRejectModalQuoteId(null)}
              style={{ padding: '0.5rem 1rem', border: '1px solid #E5E7EB', borderRadius: '4px', background: '#FFFFFF' }}
            >
              Cancel
            </button>
            <button 
              type="submit" 
              style={{ padding: '0.5rem 1rem', background: '#DC2626', color: '#FFFFFF', borderRadius: '4px', fontWeight: 600 }}
            >
              Confirm Rejection
            </button>
          </div>
        </form>
      </Modal>

      {/* Convert to Invoice Confirmation Dialog */}
      <Modal
        isOpen={Boolean(convertConfirmQuote)}
        onClose={() => setConvertConfirmQuote(null)}
        title="Convert Accepted Quotation to Invoice"
        subtitle="Transform this accepted estimate into an official legal Tax Invoice."
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', fontSize: '13px' }}>
          {convertConfirmQuote && (
            <div style={{ padding: '0.75rem', backgroundColor: '#F9FAFB', border: '1px solid #E5E7EB', borderRadius: '6px' }}>
              <div><strong>Quotation:</strong> {convertConfirmQuote.quotationNumber}</div>
              <div><strong>Client:</strong> {convertConfirmQuote.clientName}</div>
              <div><strong>Taxable Amount:</strong> {formatINR(convertConfirmQuote.totalTaxableAmount)}</div>
              <div><strong>Grand Total Payable:</strong> <strong>{formatINR(convertConfirmQuote.grandTotal)}</strong></div>
            </div>
          )}

          <p style={{ color: '#4B5563' }}>
            This action will automatically generate consecutive Invoice number <strong>HEX/26-27/INV-0047</strong>, preserve all line item rates, discounts, SAC codes, and GST breakdown, and update this quotation&apos;s status to <strong>Converted</strong>.
          </p>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', borderTop: '1px solid #E5E7EB', paddingTop: '1rem' }}>
            <button 
              type="button" 
              onClick={() => setConvertConfirmQuote(null)}
              style={{ padding: '0.5rem 1rem', border: '1px solid #E5E7EB', borderRadius: '4px', background: '#FFFFFF' }}
            >
              Cancel
            </button>
            <button 
              type="button" 
              onClick={handleConvertExecute}
              style={{ padding: '0.5rem 1.25rem', background: '#171717', color: '#FFFFFF', borderRadius: '4px', fontWeight: 600 }}
            >
              Convert to Invoice Now
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
