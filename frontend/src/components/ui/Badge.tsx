import React from 'react';

interface BadgeProps {
  status: string;
}

export const Badge: React.FC<BadgeProps> = ({ status }) => {
  let bg = '#F3F4F6';
  let color = '#4B5563';
  let border = '#E5E7EB';

  const normalized = status.toLowerCase();

  if (normalized === 'accepted' || normalized === 'paid' || normalized === 'active' || normalized === 'completed') {
    bg = '#F0FDF4';
    color = '#15803D';
    border = '#DCFCE7';
  } else if (normalized === 'sent' || normalized === 'viewed') {
    bg = '#EFF6FF';
    color = '#1D4ED8';
    border = '#DBEAFE';
  } else if (normalized === 'partially paid' || normalized === 'pending') {
    bg = '#FFFBEB';
    color = '#B45309';
    border = '#FEF3C7';
  } else if (normalized === 'overdue' || normalized === 'rejected' || normalized === 'cancelled' || normalized === 'expired') {
    bg = '#FEF2F2';
    color = '#B91C1C';
    border = '#FEE2E2';
  } else if (normalized === 'converted') {
    bg = '#FAF5FF';
    color = '#7E22CE';
    border = '#F3E8FF';
  }

  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      padding: '2px 8px',
      borderRadius: '9999px',
      fontSize: '11.5px',
      fontWeight: 600,
      backgroundColor: bg,
      color: color,
      border: `1px solid ${border}`,
      letterSpacing: '0.01em',
      whiteSpace: 'nowrap'
    }}>
      {status}
    </span>
  );
};
