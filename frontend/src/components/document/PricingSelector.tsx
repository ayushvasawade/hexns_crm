'use client';

import React from 'react';
import { formatINR } from '../../lib/formatters';
import { DocumentLineItem, PriceTier } from '../../types/crm';

interface PricingSelectorProps {
  item: Pick<DocumentLineItem, 'minPrice' | 'defaultPrice' | 'selectedTier' | 'negotiatedUnitPrice' | 'isBelowMinWarning' | 'serviceName'>;
  onSelect: (tier: PriceTier) => void;
  onCustomChange: (value: number) => void;
}

export function PricingSelector({ item, onSelect, onCustomChange }: PricingSelectorProps) {
  const hasMinimum = item.minPrice > 0;
  const hasBase = item.defaultPrice > 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
      <label style={{ fontSize: '11px', fontWeight: 600, color: '#4B5563' }}>Pricing</label>
      <select
        value={item.selectedTier === 'MAX' ? 'CUSTOM' : item.selectedTier}
        onChange={(event) => onSelect(event.target.value as PriceTier)}
        style={{ minWidth: '190px', padding: '0.4rem', border: '1px solid #D1D5DB', borderRadius: '4px', fontSize: '12px' }}
      >
        {hasBase && <option value="DEFAULT">Base Rate — {formatINR(item.defaultPrice)}</option>}
        {hasMinimum && <option value="MIN">Minimum Rate — {formatINR(item.minPrice)}</option>}
        <option value="CUSTOM">Custom Rate</option>
      </select>
      {item.selectedTier === 'CUSTOM' && (
        <input
          type="number"
          min="0.01"
          step="0.01"
          value={item.negotiatedUnitPrice > 0 ? item.negotiatedUnitPrice : ''}
          placeholder="Enter rate greater than ₹0"
          aria-label={`Custom rate for ${item.serviceName}`}
          onChange={(event) => onCustomChange(Number(event.target.value))}
          style={{
            padding: '0.4rem',
            border: item.isBelowMinWarning ? '1px solid #DC2626' : '1px solid #D1D5DB',
            borderRadius: '4px',
            fontSize: '12px',
          }}
        />
      )}
      {item.isBelowMinWarning && (
        <span style={{ fontSize: '11px', color: '#B45309' }}>
          Below minimum rate; authorization may be required.
        </span>
      )}
    </div>
  );
}
