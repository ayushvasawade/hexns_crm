'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown, Plus, Search } from 'lucide-react';
import { ServiceItem } from '../../types/crm';
import { formatINR } from '../../lib/formatters';

interface ServiceAutocompleteProps {
  services: ServiceItem[];
  onSelect: (service: ServiceItem) => void;
  onSelectOther?: (customName?: string) => void;
  isLoading?: boolean;
  placeholder?: string;
}

export function ServiceAutocomplete({
  services,
  onSelect,
  onSelectOther,
  isLoading = false,
  placeholder = 'Search services by name, category or keyword...',
}: ServiceAutocompleteProps) {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const filteredServices = useMemo(() => {
    const terms = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
    if (terms.length === 0) return services;

    return services.filter(service => {
      const searchableText = [
        service.serviceName,
        service.category,
        service.groupCategory,
        service.description,
        service.billingUnit,
        service.sacCode,
      ].filter(Boolean).join(' ').toLowerCase();

      return terms.every(term => searchableText.includes(term));
    });
  }, [query, services]);

  useEffect(() => {
    setHighlightedIndex(0);
  }, [query]);

  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const selectService = (service: ServiceItem) => {
    onSelect(service);
    setQuery('');
    setIsOpen(false);
    setHighlightedIndex(0);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setIsOpen(true);
      if (filteredServices.length > 0) {
        setHighlightedIndex(index => Math.min(index + 1, filteredServices.length - 1));
      }
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setHighlightedIndex(index => Math.max(index - 1, 0));
    } else if (event.key === 'Enter' && isOpen && filteredServices[highlightedIndex]) {
      event.preventDefault();
      selectService(filteredServices[highlightedIndex]);
    } else if (event.key === 'Escape') {
      setIsOpen(false);
    }
  };

  return (
    <div ref={containerRef} style={{ position: 'relative', width: '100%' }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
        padding: '0.55rem 0.65rem',
        background: '#FFFFFF',
        border: `1px solid ${isOpen ? '#2563EB' : '#D1D5DB'}`,
        borderRadius: isOpen ? '6px 6px 0 0' : '6px',
        boxShadow: isOpen ? '0 0 0 3px rgba(37, 99, 235, 0.1)' : 'none',
      }}>
        <Search size={15} color="#737373" aria-hidden="true" />
        <input
          type="search"
          value={query}
          placeholder={placeholder}
          aria-label="Search service catalogue"
          aria-expanded={isOpen}
          aria-controls="service-autocomplete-options"
          role="combobox"
          onFocus={() => setIsOpen(true)}
          onChange={event => {
            setQuery(event.target.value);
            setIsOpen(true);
          }}
          onKeyDown={handleKeyDown}
          style={{
            width: '100%',
            border: 'none',
            outline: 'none',
            background: 'transparent',
            fontSize: '13px',
          }}
        />
        <ChevronDown size={15} color="#737373" style={{ transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform 120ms ease' }} aria-hidden="true" />
      </div>

      {isOpen && (
        <div
          id="service-autocomplete-options"
          role="listbox"
          style={{
            position: 'absolute',
            zIndex: 30,
            left: 0,
            right: 0,
            maxHeight: '280px',
            overflowY: 'auto',
            background: '#FFFFFF',
            border: '1px solid #D1D5DB',
            borderTop: 'none',
            borderRadius: '0 0 6px 6px',
            boxShadow: '0 8px 18px rgba(23, 23, 23, 0.12)',
          }}
        >
          {isLoading ? (
            <div style={{ padding: '0.75rem', color: '#737373', fontSize: '12px' }}>Loading services...</div>
          ) : services.length === 0 ? (
            <div style={{ padding: '0.75rem', color: '#B45309', fontSize: '12px' }}>
              <div>Service catalogue is unavailable.</div>
              {onSelectOther && (
                <button
                  type="button"
                  onMouseDown={event => event.preventDefault()}
                  onClick={() => {
                    onSelectOther(query.trim());
                    setQuery('');
                    setIsOpen(false);
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    marginTop: '0.5rem',
                    padding: '0.45rem 0.65rem',
                    backgroundColor: '#EFF6FF',
                    border: '1px solid #BFDBFE',
                    borderRadius: '4px',
                    fontSize: '12px',
                    fontWeight: 600,
                    color: '#1D4ED8',
                    cursor: 'pointer'
                  }}
                >
                  <Plus size={13} />
                  <span>+ Add as Other / Custom Service</span>
                </button>
              )}
            </div>
          ) : filteredServices.length === 0 ? (
            <div style={{ padding: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <div style={{ color: '#737373', fontSize: '12px' }}>No catalogue services match “{query}”.</div>
              {onSelectOther && (
                <button
                  type="button"
                  onMouseDown={event => event.preventDefault()}
                  onClick={() => {
                    onSelectOther(query.trim());
                    setQuery('');
                    setIsOpen(false);
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '0.5rem 0.75rem',
                    backgroundColor: '#EFF6FF',
                    border: '1px dashed #2563EB',
                    borderRadius: '6px',
                    fontSize: '12px',
                    fontWeight: 600,
                    color: '#1D4ED8',
                    cursor: 'pointer',
                    textAlign: 'left'
                  }}
                >
                  <Plus size={14} color="#2563EB" />
                  <span>Add “{query.trim() || 'Custom Service'}” as Other / Custom Service</span>
                </button>
              )}
            </div>
          ) : (
            <>
              {filteredServices.map((service, index) => {
                const isZeroRate = service.defaultPrice === 0 && service.minPrice === 0;
                return (
                  <button
                    type="button"
                    key={service.id}
                    role="option"
                    aria-selected={index === highlightedIndex}
                    onMouseDown={event => event.preventDefault()}
                    onClick={() => selectService(service)}
                    onMouseEnter={() => setHighlightedIndex(index)}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'minmax(0, 1fr) auto',
                      width: '100%',
                      gap: '0.75rem',
                      padding: '0.6rem 0.7rem',
                      textAlign: 'left',
                      background: index === highlightedIndex ? '#EFF6FF' : '#FFFFFF',
                      borderBottom: '1px solid #F3F4F6',
                      color: '#171717',
                    }}
                  >
                    <span style={{ minWidth: 0 }}>
                      <span style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '12.5px', fontWeight: 650 }}>
                        {service.serviceName}
                      </span>
                      <span style={{ display: 'block', marginTop: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: '#737373', fontSize: '11px' }}>
                        {service.category}{service.groupCategory ? ` · ${service.groupCategory}` : ''}
                      </span>
                    </span>
                    <span style={{ alignSelf: 'center', whiteSpace: 'nowrap', color: isZeroRate ? '#B45309' : '#171717', fontSize: '12px', fontWeight: 650 }}>
                      {isZeroRate ? 'Custom rate' : formatINR(service.defaultPrice)}
                    </span>
                  </button>
                );
              })}
              {onSelectOther && (
                <button
                  type="button"
                  onMouseDown={event => event.preventDefault()}
                  onClick={() => {
                    onSelectOther(query.trim());
                    setQuery('');
                    setIsOpen(false);
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    width: '100%',
                    padding: '0.65rem 0.75rem',
                    textAlign: 'left',
                    background: '#F9FAFB',
                    borderTop: '1px solid #E5E7EB',
                    color: '#2563EB',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  <Plus size={14} />
                  <span>
                    {query.trim() ? `+ Add “${query.trim()}” as Other / Custom Service` : '+ Add Other / Custom Service (Not in list)'}
                  </span>
                </button>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
