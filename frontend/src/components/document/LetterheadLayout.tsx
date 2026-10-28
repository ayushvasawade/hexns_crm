'use client';

import React from 'react';

interface LetterheadLayoutProps {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

/**
 * Reusable HTML/CSS Letterhead Component
 *
 * Modeled strictly from the authentic 'Hexns Letter Head (1).pdf' design reference:
 * - Sharp vector SVG logo (exact Wondra typography & geometric icon mark)
 * - Precision top divider bar (#1C2024)
 * - Standardized right-aligned Date & Reference area
 * - Full selectable HTML document content (never flattened)
 * - Authentic footer: Bottom divider bar, Hexns Mediaworks LLP | LLPIN: ACR-0880,
 *   Kolhapur registered office, icon badge contacts, and confidentiality disclaimer.
 * - Robust CSS table paged-media structure ensuring natural multi-page flow without
 *   header/footer collisions or blank first print page.
 */
export const LetterheadLayout: React.FC<LetterheadLayoutProps> = ({
  children,
  className = '',
  style = {}
}) => {
  return (
    <div className={`a4-document-container ${className}`} style={style}>
      <table className="letterhead-root-table">
        {/* Repeating Header on every printed page */}
        <thead className="letterhead-thead">
          <tr>
            <td style={{ padding: 0, border: 'none' }}>
              <div className="letterhead-header">
                <div className="letterhead-header-top">
                  {/* Exact Vector SVG Logo Artwork */}
                  <div className="letterhead-logo-wrap">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img 
                      src="/hexns_logo.svg" 
                      alt="HEXNS Mediaworks" 
                      className="letterhead-logo-img"
                    />
                  </div>
                </div>
                {/* Top Divider Line (from Hexns Letter Head reference) */}
                <div className="letterhead-top-divider" />
              </div>
            </td>
          </tr>
        </thead>

        {/* Document Content */}
        <tbody className="letterhead-tbody">
          <tr>
            <td style={{ padding: 0, border: 'none' }}>
              <div className="letterhead-content-body">
                {children}
              </div>
            </td>
          </tr>
        </tbody>

        {/* Repeating Footer on every printed page */}
        <tfoot className="letterhead-tfoot">
          <tr>
            <td style={{ padding: 0, border: 'none' }}>
              <div className="letterhead-footer">
                {/* Bottom Divider Line (from Hexns Letter Head reference) */}
                <div className="letterhead-bottom-divider" />
                
                {/* Company Name & LLPIN */}
                <div className="letterhead-footer-company">
                  Hexns Mediaworks LLP <span className="letterhead-footer-sep">|</span> LLPIN: ACR-0880
                </div>

                {/* Registered Office */}
                <div className="letterhead-footer-address">
                  Registered Office: Near Vasant Bahar Road, New Shahupuri, Kolhapur – 416002, Maharashtra
                </div>

                {/* Contact Information Row with circular vector badges */}
                <div className="letterhead-footer-contacts">
                  <span className="letterhead-contact-item">
                    <span className="letterhead-icon-badge" aria-hidden="true">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
                      </svg>
                    </span>
                    +91 90491 02142 | +91 98220 02142
                  </span>
                  <span className="letterhead-contact-item">
                    <span className="letterhead-icon-badge" aria-hidden="true">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <rect width="20" height="16" x="2" y="4" rx="2"/>
                        <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
                      </svg>
                    </span>
                    admin@hexnsmedia.com
                  </span>
                  <span className="letterhead-contact-item">
                    <span className="letterhead-icon-badge" aria-hidden="true">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="10"/>
                        <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/>
                        <path d="M2 12h20"/>
                      </svg>
                    </span>
                    www.hexnsmedia.com
                  </span>
                </div>

                {/* Thin Sub-Divider */}
                <div className="letterhead-disclaimer-divider" />

                {/* Confidentiality Disclaimer */}
                <div className="letterhead-footer-disclaimer">
                  <div>Disclaimer: This communication is confidential and intended only for the recipient.</div>
                  <div>Unauthorized use or disclosure is strictly prohibited.</div>
                </div>
              </div>
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
};
