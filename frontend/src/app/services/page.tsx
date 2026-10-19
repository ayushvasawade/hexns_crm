'use client';

import React, { useState } from 'react';
import { 
  Layers, 
  Search, 
  Plus, 
  Filter, 
  Tag, 
  Check, 
  Copy, 
  Edit, 
  Power,
  ChevronRight,
  Info
} from 'lucide-react';
import { useCrm } from '../../context/CrmContext';
import { ServiceItem } from '../../types/crm';
import { formatINR } from '../../lib/formatters';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';

export default function ServicesPage() {
  const { services, addService, updateService } = useCrm();

  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingService, setEditingService] = useState<ServiceItem | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    serviceName: '',
    category: 'Social Media Management',
    description: '',
    billingUnit: 'Per Month',
    sacCode: '998311',
    minPrice: 15000,
    defaultPrice: 25000,
    maxPrice: 40000,
    internalCostPrice: 10000,
    gstRate: 18,
    status: 'Active' as 'Active' | 'Inactive'
  });

  // 16 Service Verticals from Rate Master
  const categories = [
    'All',
    'Social Media Management',
    'Reels & Video Content',
    'Photography',
    'Videography & Production',
    'Video Editing',
    'Graphic Design',
    'Branding',
    'Packaging & Product Design',
    'Meta Ads / Performance Marketing',
    'Google Ads',
    'Content Writing',
    'AI Services',
    'Website & Digital',
    'Marketing Strategy',
    'Influencer & Creator Marketing',
    'Events & Launches'
  ];

  // Filter services
  const filteredServices = services.filter(s => {
    const matchesSearch = 
      s.serviceName.toLowerCase().includes(search.toLowerCase()) ||
      s.description.toLowerCase().includes(search.toLowerCase()) ||
      s.sacCode.includes(search);

    let matchesCategory = true;
    if (selectedCategory !== 'All') {
      matchesCategory = s.category === selectedCategory;
    }

    return matchesSearch && matchesCategory;
  });

  const handleSaveService = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.serviceName) return;

    if (editingService) {
      updateService(editingService.id, formData);
      setEditingService(null);
    } else {
      addService(formData);
    }

    setIsAddModalOpen(false);
    setFormData({
      serviceName: '',
      category: 'Social Media Management',
      description: '',
      billingUnit: 'Per Month',
      sacCode: '998311',
      minPrice: 15000,
      defaultPrice: 25000,
      maxPrice: 40000,
      internalCostPrice: 10000,
      gstRate: 18,
      status: 'Active'
    });
  };

  const handleEditClick = (service: ServiceItem) => {
    setEditingService(service);
    setFormData({
      serviceName: service.serviceName,
      category: service.category,
      description: service.description,
      billingUnit: service.billingUnit,
      sacCode: service.sacCode,
      minPrice: service.minPrice,
      defaultPrice: service.defaultPrice,
      maxPrice: service.maxPrice,
      internalCostPrice: service.internalCostPrice,
      gstRate: service.gstRate,
      status: service.status
    });
    setIsAddModalOpen(true);
  };

  const handleDuplicate = (service: ServiceItem) => {
    addService({
      ...service,
      serviceName: `${service.serviceName} (Copy)`
    });
  };

  const toggleStatus = (service: ServiceItem) => {
    updateService(service.id, {
      status: service.status === 'Active' ? 'Inactive' : 'Active'
    });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* Top Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '20px', fontWeight: 700, color: '#171717', letterSpacing: '-0.02em' }}>
            Service Catalogue & Pricing Master
          </h1>
          <p style={{ fontSize: '13px', color: '#737373', marginTop: '2px' }}>
            Browse and manage all 16 FRS service verticals with Min, Default, and Max price bands.
          </p>
        </div>

        <button 
          onClick={() => {
            setEditingService(null);
            setIsAddModalOpen(true);
          }}
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
          <span>+ Add Service</span>
        </button>
      </div>

      {/* Main Layout: Category Sidebar + Service Table */}
      <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', gap: '1.25rem', alignItems: 'flex-start' }}>
        {/* Category List Sidebar */}
        <div style={{
          backgroundColor: '#FFFFFF',
          border: '1px solid #E5E7EB',
          borderRadius: '8px',
          padding: '0.75rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '2px'
        }}>
          <span style={{ fontSize: '11px', fontWeight: 700, color: '#737373', textTransform: 'uppercase', padding: '0.5rem 0.75rem' }}>
            16 Service Verticals ({services.length} Total)
          </span>
          <div style={{ maxHeight: '720px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '2px' }}>
            {categories.map(cat => {
              const count = cat === 'All' 
                ? services.length 
                : services.filter(s => s.category === cat).length;

              const isSelected = selectedCategory === cat;

              return (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.45rem 0.75rem',
                    borderRadius: '6px',
                    fontSize: '12.5px',
                    fontWeight: isSelected ? 600 : 500,
                    backgroundColor: isSelected ? '#F3F4F6' : 'transparent',
                    color: isSelected ? '#171717' : '#4B5563',
                    textAlign: 'left',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {cat}
                  </span>
                  <span style={{ fontSize: '11px', color: '#9CA3AF' }}>{count}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Services Main View */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {/* Search Bar & Banner */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '1rem',
            backgroundColor: '#FFFFFF',
            padding: '0.65rem 1rem',
            border: '1px solid #E5E7EB',
            borderRadius: '8px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1 }}>
              <Search size={15} color="#9CA3AF" />
              <input 
                type="text" 
                placeholder="Search by service name, description, or SAC code..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{ border: 'none', outline: 'none', fontSize: '13px', width: '100%' }}
              />
            </div>
            <span style={{ fontSize: '12px', color: '#737373' }}>
              Showing <strong>{filteredServices.length}</strong> items
            </span>
          </div>

          {/* Pricing Guidelines Box */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            padding: '0.65rem 1rem',
            backgroundColor: '#F9FAFB',
            border: '1px solid #E5E7EB',
            borderRadius: '6px',
            fontSize: '12px',
            color: '#4B5563'
          }}>
            <Info size={16} color="#2563EB" style={{ flexShrink: 0 }} />
            <span>
              <strong>Selling Price Tiers:</strong> Each service defines Min, Default, and Max benchmarks. In quotation builders, users can quick-pick tier rates with authorization warnings if discounted below Min.
            </span>
          </div>

          {/* Table */}
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
                    <th style={{ padding: '0.65rem 1rem', fontSize: '11.5px', color: '#737373', fontWeight: 600, textTransform: 'uppercase' }}>Service Name & Vertical</th>
                    <th style={{ padding: '0.65rem 1rem', fontSize: '11.5px', color: '#737373', fontWeight: 600, textTransform: 'uppercase' }}>Billing Unit & SAC</th>
                    <th style={{ padding: '0.65rem 1rem', fontSize: '11.5px', color: '#737373', fontWeight: 600, textTransform: 'uppercase' }}>Min Price</th>
                    <th style={{ padding: '0.65rem 1rem', fontSize: '11.5px', color: '#737373', fontWeight: 600, textTransform: 'uppercase' }}>Default Price</th>
                    <th style={{ padding: '0.65rem 1rem', fontSize: '11.5px', color: '#737373', fontWeight: 600, textTransform: 'uppercase' }}>Max Price</th>
                    <th style={{ padding: '0.65rem 1rem', fontSize: '11.5px', color: '#737373', fontWeight: 600, textTransform: 'uppercase' }}>GST</th>
                    <th style={{ padding: '0.65rem 1rem', fontSize: '11.5px', color: '#737373', fontWeight: 600, textTransform: 'uppercase' }}>Status</th>
                    <th style={{ padding: '0.65rem 1rem', fontSize: '11.5px', color: '#737373', fontWeight: 600, textTransform: 'uppercase', textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredServices.map(srv => (
                    <tr 
                      key={srv.id}
                      style={{ borderBottom: '1px solid #F3F4F6' }}
                    >
                      <td style={{ padding: '0.75rem 1rem' }}>
                        <div style={{ fontWeight: 600, color: '#171717' }}>{srv.serviceName}</div>
                        <div style={{ fontSize: '11.5px', color: '#737373', maxWidth: '280px', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                          {srv.description}
                        </div>
                        <span style={{ fontSize: '10.5px', fontWeight: 600, color: '#2563EB', backgroundColor: '#EFF6FF', padding: '1px 6px', borderRadius: '4px', marginTop: '3px', display: 'inline-block' }}>
                          {srv.category}
                        </span>
                      </td>
                      <td style={{ padding: '0.75rem 1rem' }}>
                        <div>{srv.billingUnit}</div>
                        <div style={{ fontSize: '11.5px', color: '#737373', fontFamily: 'monospace' }}>SAC {srv.sacCode}</div>
                      </td>
                      <td style={{ padding: '0.75rem 1rem', color: '#B45309', fontWeight: 600 }}>
                        {formatINR(srv.minPrice)}
                      </td>
                      <td style={{ padding: '0.75rem 1rem', color: '#171717', fontWeight: 700 }}>
                        {formatINR(srv.defaultPrice)}
                      </td>
                      <td style={{ padding: '0.75rem 1rem', color: '#15803D', fontWeight: 600 }}>
                        {formatINR(srv.maxPrice)}
                      </td>
                      <td style={{ padding: '0.75rem 1rem' }}>{srv.gstRate}%</td>
                      <td style={{ padding: '0.75rem 1rem' }}>
                        <Badge status={srv.status} />
                      </td>
                      <td style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
                          <button 
                            onClick={() => handleEditClick(srv)}
                            title="Edit Service"
                            style={{ padding: '4px', color: '#4B5563' }}
                          >
                            <Edit size={15} />
                          </button>
                          <button 
                            onClick={() => handleDuplicate(srv)}
                            title="Duplicate Service"
                            style={{ padding: '4px', color: '#4B5563' }}
                          >
                            <Copy size={15} />
                          </button>
                          <button 
                            onClick={() => toggleStatus(srv)}
                            title={srv.status === 'Active' ? 'Deactivate' : 'Activate'}
                            style={{ padding: '4px', color: srv.status === 'Active' ? '#15803D' : '#9CA3AF' }}
                          >
                            <Power size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filteredServices.length === 0 && (
                    <tr>
                      <td colSpan={8} style={{ padding: '2rem', textAlign: 'center', color: '#737373' }}>
                        No services found in this category.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Add / Edit Service Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title={editingService ? "Edit Service" : "Add Master Service"}
        subtitle="Configure service scope, unit rates and SAC code."
        maxWidth="640px"
      >
        <form onSubmit={handleSaveService} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label style={{ fontSize: '12px', fontWeight: 600, color: '#4B5563' }}>Service Name *</label>
            <input 
              type="text" 
              required
              placeholder="e.g. 4K Drone Aerial Cinematography"
              value={formData.serviceName}
              onChange={(e) => setFormData({ ...formData, serviceName: e.target.value })}
              style={{ width: '100%', padding: '0.5rem', border: '1px solid #E5E7EB', borderRadius: '4px', marginTop: '4px' }}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 600, color: '#4B5563' }}>Vertical Category</label>
              <select 
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                style={{ width: '100%', padding: '0.5rem', border: '1px solid #E5E7EB', borderRadius: '4px', marginTop: '4px' }}
              >
                {categories.filter(c => c !== 'All' && !c.includes('Grouped')).map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 600, color: '#4B5563' }}>Billing Unit</label>
              <select 
                value={formData.billingUnit}
                onChange={(e) => setFormData({ ...formData, billingUnit: e.target.value })}
                style={{ width: '100%', padding: '0.5rem', border: '1px solid #E5E7EB', borderRadius: '4px', marginTop: '4px' }}
              >
                <option>Per Month</option>
                <option>Per Reel</option>
                <option>Per Shoot</option>
                <option>Per SKU</option>
                <option>Per Day</option>
                <option>Per Project</option>
                <option>Per Episode</option>
                <option>Turnkey</option>
                <option>One-Off</option>
              </select>
            </div>
          </div>

          <div>
            <label style={{ fontSize: '12px', fontWeight: 600, color: '#4B5563' }}>Scope of Work & Description</label>
            <textarea 
              rows={2}
              placeholder="Detailed deliverable specifications..."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              style={{ width: '100%', padding: '0.5rem', border: '1px solid #E5E7EB', borderRadius: '4px', marginTop: '4px', resize: 'vertical' }}
            />
          </div>

          {/* Pricing Tiers */}
          <div style={{
            padding: '1rem',
            backgroundColor: '#F9FAFB',
            border: '1px solid #E5E7EB',
            borderRadius: '6px',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.75rem'
          }}>
            <span style={{ fontSize: '12px', fontWeight: 700, color: '#171717', textTransform: 'uppercase' }}>
              Selling Price Bands (₹)
            </span>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem' }}>
              <div>
                <label style={{ fontSize: '11px', fontWeight: 600, color: '#B45309' }}>Min Selling Price *</label>
                <input 
                  type="number" 
                  required
                  value={formData.minPrice}
                  onChange={(e) => setFormData({ ...formData, minPrice: Number(e.target.value) })}
                  style={{ width: '100%', padding: '0.45rem', border: '1px solid #E5E7EB', borderRadius: '4px', marginTop: '2px' }}
                />
              </div>
              <div>
                <label style={{ fontSize: '11px', fontWeight: 600, color: '#171717' }}>Default Price *</label>
                <input 
                  type="number" 
                  required
                  value={formData.defaultPrice}
                  onChange={(e) => setFormData({ ...formData, defaultPrice: Number(e.target.value) })}
                  style={{ width: '100%', padding: '0.45rem', border: '1px solid #E5E7EB', borderRadius: '4px', marginTop: '2px' }}
                />
              </div>
              <div>
                <label style={{ fontSize: '11px', fontWeight: 600, color: '#15803D' }}>Max Price *</label>
                <input 
                  type="number" 
                  required
                  value={formData.maxPrice}
                  onChange={(e) => setFormData({ ...formData, maxPrice: Number(e.target.value) })}
                  style={{ width: '100%', padding: '0.45rem', border: '1px solid #E5E7EB', borderRadius: '4px', marginTop: '2px' }}
                />
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 600, color: '#4B5563' }}>SAC Code</label>
              <input 
                type="text" 
                value={formData.sacCode}
                onChange={(e) => setFormData({ ...formData, sacCode: e.target.value })}
                style={{ width: '100%', padding: '0.5rem', border: '1px solid #E5E7EB', borderRadius: '4px', marginTop: '4px' }}
              />
            </div>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 600, color: '#4B5563' }}>Internal Cost (₹)</label>
              <input 
                type="number" 
                value={formData.internalCostPrice}
                onChange={(e) => setFormData({ ...formData, internalCostPrice: Number(e.target.value) })}
                style={{ width: '100%', padding: '0.5rem', border: '1px solid #E5E7EB', borderRadius: '4px', marginTop: '4px' }}
              />
            </div>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 600, color: '#4B5563' }}>GST Rate (%)</label>
              <select 
                value={formData.gstRate}
                onChange={(e) => setFormData({ ...formData, gstRate: Number(e.target.value) })}
                style={{ width: '100%', padding: '0.5rem', border: '1px solid #E5E7EB', borderRadius: '4px', marginTop: '4px' }}
              >
                <option value={18}>18% (Standard GST)</option>
                <option value={12}>12%</option>
                <option value={5}>5%</option>
                <option value={0}>0% (Exempt)</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem', borderTop: '1px solid #E5E7EB', paddingTop: '1rem' }}>
            <button 
              type="button" 
              onClick={() => setIsAddModalOpen(false)}
              style={{ padding: '0.5rem 1rem', border: '1px solid #E5E7EB', borderRadius: '4px', background: '#FFFFFF' }}
            >
              Cancel
            </button>
            <button 
              type="submit" 
              style={{ padding: '0.5rem 1.25rem', background: '#171717', color: '#FFFFFF', borderRadius: '4px', fontWeight: 600 }}
            >
              {editingService ? "Update Service" : "Save Service"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
