'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Navbar } from '@/components/Navbar';
import {
  Layers,
  FileSpreadsheet,
  Plus,
  UploadCloud,
  Search,
  Filter,
  ArrowUpDown,
  Calendar,
  CheckCircle2,
  Clock,
  Tag,
  Copy,
  Check,
  ExternalLink,
  Edit2,
  Trash2,
  Eye,
  X,
  Sparkles,
  BarChart3,
  TrendingUp,
} from 'lucide-react';

interface BrandStat {
  id: string;
  name: string;
  slug: string;
  description?: string;
  totalOrders: number;
  reviewPending: number;
  reviewSubmitted: number;
  totalAmount: number;
  completionRate: number;
}

interface OrderItem {
  id: string;
  orderId: string;
  brandId: string;
  dealId?: string | null;
  customerName: string;
  customerPhone?: string | null;
  amount: number;
  status: 'PENDING_REVIEW' | 'REVIEW_SUBMITTED';
  orderDate: string;
  reviewSubmittedAt?: string | null;
  reviewRating?: number | null;
  deliveredProofUrl?: string | null;
  ratingProofUrl?: string | null;
  notes?: string | null;
  brand: {
    id: string;
    name: string;
    slug: string;
  };
  deal?: {
    id: string;
    dealCode: string;
    title: string;
  } | null;
}

export default function OrdersDashboardPage() {
  // Parent Filter Tabs: 'all' | 'brands' | 'pending' | 'submitted'
  const [parentFilter, setParentFilter] = useState<'all' | 'brands' | 'pending' | 'submitted'>('all');

  // Child Filters
  const [selectedBrandId, setSelectedBrandId] = useState<string>('all');
  const [timeRange, setTimeRange] = useState<string>('all'); // all | today | yesterday | week | custom
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortBy, setSortBy] = useState<string>('orderDate');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Data states
  const [orders, setOrders] = useState<OrderItem[]>([]);
  const [brandStats, setBrandStats] = useState<BrandStat[]>([]);
  const [counts, setCounts] = useState({ totalOrders: 0, pendingReview: 0, submittedReview: 0 });
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [viewProofOrder, setViewProofOrder] = useState<OrderItem | null>(null);
  const [editingOrder, setEditingOrder] = useState<OrderItem | null>(null);

  // Toast
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [copiedOrderId, setCopiedOrderId] = useState<string | null>(null);
  const [googleFormUrl, setGoogleFormUrl] = useState('');

  // Single Order Form State
  const [singleForm, setSingleForm] = useState({
    orderId: '',
    brandId: '',
    newBrandName: '',
    dealCode: '',
    customerName: '',
    amount: '',
    orderDate: new Date().toISOString().split('T')[0],
    status: 'PENDING_REVIEW',
  });

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Fetch Brands
  const fetchBrands = useCallback(async () => {
    try {
      const res = await fetch('/api/brands');
      const data = await res.json();
      if (data.brands) {
        setBrandStats(data.brands);
      }
    } catch (e) {
      console.error(e);
    }
  }, []);

  // Fetch Orders
  const fetchOrders = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();

      if (parentFilter === 'pending') params.set('parentFilter', 'pending');
      else if (parentFilter === 'submitted') params.set('parentFilter', 'submitted');
      else params.set('parentFilter', 'all');

      if (selectedBrandId && selectedBrandId !== 'all') {
        params.set('brandId', selectedBrandId);
      }

      params.set('timeRange', timeRange);
      if (timeRange === 'custom') {
        if (startDate) params.set('startDate', startDate);
        if (endDate) params.set('endDate', endDate);
      }

      if (searchQuery.trim()) {
        params.set('search', searchQuery.trim());
      }

      params.set('sortBy', sortBy);
      params.set('sortOrder', sortOrder);

      const res = await fetch(`/api/orders?${params.toString()}`);
      const data = await res.json();

      if (data.orders) {
        setOrders(data.orders);
        setCounts(data.counts);
        setTotalRevenue(data.totalRevenue || 0);
      }
    } catch (e) {
      console.error(e);
      showToast('Error loading orders');
    } finally {
      setIsLoading(false);
    }
  }, [parentFilter, selectedBrandId, timeRange, startDate, endDate, searchQuery, sortBy, sortOrder]);

  // Load Settings
  useEffect(() => {
    fetch('/api/settings')
      .then((res) => res.json())
      .then((data) => {
        if (data.settings?.google_form_url) {
          setGoogleFormUrl(data.settings.google_form_url);
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetchBrands();
  }, [fetchBrands]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  // Toggle order status
  const handleToggleStatus = async (order: OrderItem) => {
    const newStatus = order.status === 'PENDING_REVIEW' ? 'REVIEW_SUBMITTED' : 'PENDING_REVIEW';
    try {
      const res = await fetch('/api/orders', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: order.id, status: newStatus }),
      });

      if (res.ok) {
        showToast(`Order ${order.orderId} updated to ${newStatus === 'REVIEW_SUBMITTED' ? 'Review Submitted' : 'Pending Review'}`);
        fetchOrders();
        fetchBrands();
      }
    } catch {
      showToast('Failed to toggle status');
    }
  };

  // Delete order
  const handleDeleteOrder = async (orderId: string) => {
    if (!confirm(`Are you sure you want to delete order ${orderId}?`)) return;

    try {
      const res = await fetch(`/api/orders?orderId=${encodeURIComponent(orderId)}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        showToast(`Order ${orderId} deleted successfully`);
        fetchOrders();
        fetchBrands();
      }
    } catch {
      showToast('Failed to delete order');
    }
  };

  // Copy Amazon Order ID
  const handleCopyOrderId = (id: string) => {
    navigator.clipboard.writeText(id);
    setCopiedOrderId(id);
    setTimeout(() => setCopiedOrderId(null), 2000);
  };

  // Export Excel
  const handleExportExcel = (brandId: string = 'all') => {
    const params = new URLSearchParams();
    if (brandId !== 'all') params.set('brandId', brandId);
    else if (selectedBrandId !== 'all') params.set('brandId', selectedBrandId);

    if (parentFilter === 'pending') params.set('status', 'pending');
    else if (parentFilter === 'submitted') params.set('status', 'submitted');

    params.set('timeRange', timeRange);
    if (timeRange === 'custom') {
      if (startDate) params.set('startDate', startDate);
      if (endDate) params.set('endDate', endDate);
    }

    window.open(`/api/export/excel?${params.toString()}`, '_blank');
  };

  // Handle single order submission
  const handleCreateSingleOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: singleForm.orderId,
          brandId: singleForm.brandId || undefined,
          brandName: singleForm.newBrandName || undefined,
          dealCode: singleForm.dealCode || undefined,
          customerName: singleForm.customerName,
          amount: singleForm.amount,
          orderDate: singleForm.orderDate,
          status: singleForm.status,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to create order');
      }

      showToast(`Order ${singleForm.orderId} added successfully!`);
      setIsAddModalOpen(false);
      setSingleForm({
        orderId: '',
        brandId: '',
        newBrandName: '',
        dealCode: '',
        customerName: '',
        amount: '',
        orderDate: new Date().toISOString().split('T')[0],
        status: 'PENDING_REVIEW',
      });
      fetchOrders();
      fetchBrands();
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Save updated Google Form URL
  const handleSaveSettings = async (newUrl: string) => {
    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: 'google_form_url', value: newUrl }),
      });
      if (res.ok) {
        setGoogleFormUrl(newUrl);
        showToast('Google Form link updated successfully!');
        setIsSettingsModalOpen(false);
      }
    } catch {
      showToast('Failed to update Google Form link');
    }
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--bg-canvas)' }}>
      <Navbar onOpenSettings={() => setIsSettingsModalOpen(true)} />

      <main className="rway-container" style={{ padding: '2rem 1.5rem 4rem' }}>
        {/* Top Header & Fast Actions */}
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '1.25rem',
            marginBottom: '1.75rem',
          }}
        >
          <div>
            <h1 style={{ fontSize: '2rem', color: 'var(--rway-teal-950)', marginBottom: '0.25rem' }}>
              Campaign & Orders Management
            </h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.925rem' }}>
              Track WhatsApp campaign orders, Amazon review submissions, and brand analytics.
            </p>
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '0.75rem' }}>
            {/* 1-Click Excel Export for current view */}
            <button
              onClick={() => handleExportExcel(selectedBrandId)}
              className="btn btn-outline"
              title="Download Excel sheet of current filtered orders"
            >
              <FileSpreadsheet size={17} color="#166534" />
              <span>Export Excel (.xlsx)</span>
            </button>

            {/* Add Single Order Modal Trigger */}
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="btn btn-secondary"
            >
              <Plus size={17} />
              <span>Add Single Order</span>
            </button>

            {/* Bulk WhatsApp Import Button */}
            <Link href="/admin/orders/bulk-import" className="btn btn-gold">
              <UploadCloud size={17} />
              <span>Bulk WhatsApp Import</span>
            </Link>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* PARENT FILTERS (Tabs) */}
        {/* ========================================================================= */}
        <div style={{ marginBottom: '1.25rem' }}>
          <div className="filter-tabs">
            <button
              onClick={() => setParentFilter('all')}
              className={`filter-tab-btn ${parentFilter === 'all' ? 'active' : ''}`}
            >
              <Layers size={16} />
              <span>All Orders</span>
              <span className="tab-badge">{counts.totalOrders}</span>
            </button>

            <button
              onClick={() => setParentFilter('brands')}
              className={`filter-tab-btn ${parentFilter === 'brands' ? 'active' : ''}`}
            >
              <BarChart3 size={16} />
              <span>All Brands Overview</span>
              <span className="tab-badge">{brandStats.length}</span>
            </button>

            <button
              onClick={() => setParentFilter('pending')}
              className={`filter-tab-btn ${parentFilter === 'pending' ? 'active' : ''}`}
            >
              <Clock size={16} />
              <span>Reviews Pending</span>
              <span className="tab-badge" style={{ backgroundColor: 'var(--status-pending-bg)', color: 'var(--status-pending-text)' }}>
                {counts.pendingReview}
              </span>
            </button>

            <button
              onClick={() => setParentFilter('submitted')}
              className={`filter-tab-btn ${parentFilter === 'submitted' ? 'active' : ''}`}
            >
              <CheckCircle2 size={16} />
              <span>Reviews Submitted</span>
              <span className="tab-badge" style={{ backgroundColor: 'var(--status-submitted-bg)', color: 'var(--status-submitted-text)' }}>
                {counts.submittedReview}
              </span>
            </button>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* BRAND SUMMARY CARDS (Required Feature) */}
        {/* ========================================================================= */}
        {(parentFilter === 'brands' || selectedBrandId === 'all') && (
          <div style={{ marginBottom: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.85rem' }}>
              <h2 style={{ fontSize: '1.15rem', color: 'var(--rway-teal-950)' }}>
                Brand Performance & Export ({brandStats.length} Brands)
              </h2>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                Click Export Excel on any brand for dedicated report
              </span>
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(310px, 1fr))',
                gap: '1.25rem',
              }}
            >
              {brandStats.map((b) => (
                <div
                  key={b.id}
                  className="rway-card"
                  style={{
                    padding: '1.4rem',
                    borderLeft: selectedBrandId === b.id ? '4px solid var(--rway-teal-700)' : '4px solid var(--rway-gold-500)',
                    position: 'relative',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.85rem' }}>
                    <div>
                      <h3 style={{ fontSize: '1.2rem', color: 'var(--rway-teal-950)' }}>{b.name}</h3>
                      {b.description && (
                        <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                          {b.description}
                        </p>
                      )}
                    </div>
                    <button
                      onClick={() => handleExportExcel(b.id)}
                      className="btn btn-outline btn-sm"
                      title={`Export ${b.name} Orders to Excel`}
                      style={{
                        padding: '0.35rem 0.65rem',
                        fontSize: '0.75rem',
                        borderColor: 'var(--rway-teal-300)',
                        backgroundColor: 'var(--rway-teal-50)',
                        color: 'var(--rway-teal-900)',
                      }}
                    >
                      <FileSpreadsheet size={14} color="#166534" />
                      <span>Export Excel</span>
                    </button>
                  </div>

                  {/* Brand Counts */}
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(3, 1fr)',
                      gap: '0.5rem',
                      textAlign: 'center',
                      backgroundColor: 'var(--bg-canvas)',
                      padding: '0.75rem',
                      borderRadius: 'var(--radius-md)',
                      marginBottom: '1rem',
                    }}
                  >
                    <div>
                      <span style={{ display: 'block', fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                        ORDERS
                      </span>
                      <b style={{ fontSize: '1.1rem', color: 'var(--rway-teal-950)' }}>{b.totalOrders}</b>
                    </div>
                    <div>
                      <span style={{ display: 'block', fontSize: '0.72rem', color: 'var(--status-pending-text)', fontWeight: 600 }}>
                        PENDING
                      </span>
                      <b style={{ fontSize: '1.1rem', color: 'var(--status-pending-text)' }}>{b.reviewPending}</b>
                    </div>
                    <div>
                      <span style={{ display: 'block', fontSize: '0.72rem', color: 'var(--status-submitted-text)', fontWeight: 600 }}>
                        SUBMITTED
                      </span>
                      <b style={{ fontSize: '1.1rem', color: 'var(--status-submitted-text)' }}>{b.reviewSubmitted}</b>
                    </div>
                  </div>

                  {/* Review Completion Progress Bar */}
                  <div style={{ marginBottom: '0.75rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: '0.25rem' }}>
                      <span style={{ color: 'var(--text-muted)' }}>Review Completion</span>
                      <b style={{ color: 'var(--rway-teal-800)' }}>{b.completionRate}%</b>
                    </div>
                    <div style={{ height: '6px', borderRadius: '4px', backgroundColor: '#e2ece9', overflow: 'hidden' }}>
                      <div
                        style={{
                          height: '100%',
                          width: `${b.completionRate}%`,
                          backgroundColor: b.completionRate > 50 ? 'var(--rway-teal-600)' : 'var(--rway-gold-500)',
                          borderRadius: '4px',
                          transition: 'width 0.4s ease',
                        }}
                      />
                    </div>
                  </div>

                  {/* Filter click shortcut */}
                  <button
                    onClick={() => {
                      setSelectedBrandId(b.id);
                      setParentFilter('all');
                    }}
                    style={{
                      border: 'none',
                      background: 'none',
                      fontSize: '0.78rem',
                      color: 'var(--rway-teal-700)',
                      cursor: 'pointer',
                      fontWeight: 600,
                      padding: 0,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.25rem',
                    }}
                  >
                    <span>View {b.name} Orders</span> →
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* CHILD FILTERS BAR (Required Feature) */}
        {/* ========================================================================= */}
        <div className="child-filters-bar" style={{ marginBottom: '1.5rem' }}>
          {/* Brand Selector Dropdown */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', minWidth: '200px' }}>
            <Tag size={16} color="var(--rway-teal-700)" />
            <select
              value={selectedBrandId}
              onChange={(e) => setSelectedBrandId(e.target.value)}
              className="rway-select"
              style={{ fontSize: '0.85rem', padding: '0.5rem 0.75rem' }}
            >
              <option value="all">All Brands ({brandStats.length})</option>
              {brandStats.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name} ({b.totalOrders} orders)
                </option>
              ))}
            </select>
          </div>

          {/* Time Presets & Custom Range */}
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '0.5rem' }}>
            <Calendar size={16} color="var(--rway-gold-600)" />
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value)}
              className="rway-select"
              style={{ fontSize: '0.85rem', padding: '0.5rem 0.75rem', width: 'auto' }}
            >
              <option value="all">All Time</option>
              <option value="today">Today</option>
              <option value="yesterday">Yesterday</option>
              <option value="week">This Week (Last 7 Days)</option>
              <option value="custom">Custom Date Range</option>
            </select>

            {timeRange === 'custom' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="rway-input"
                  style={{ fontSize: '0.82rem', padding: '0.45rem 0.6rem', width: '135px' }}
                />
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>to</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="rway-input"
                  style={{ fontSize: '0.82rem', padding: '0.45rem 0.6rem', width: '135px' }}
                />
              </div>
            )}
          </div>

          {/* Sorting */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <ArrowUpDown size={16} color="var(--text-muted)" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="rway-select"
              style={{ fontSize: '0.85rem', padding: '0.5rem 0.75rem', width: 'auto' }}
            >
              <option value="orderDate">Sort: Order Date</option>
              <option value="amount">Sort: Offer Amount</option>
              <option value="customerName">Sort: Customer Name</option>
              <option value="status">Sort: Review Status</option>
            </select>

            <button
              onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
              className="btn btn-outline btn-sm"
              title={`Toggle Order (${sortOrder.toUpperCase()})`}
              style={{ padding: '0.45rem 0.65rem' }}
            >
              {sortOrder === 'desc' ? 'Desc' : 'Asc'}
            </button>
          </div>

          {/* Search Input */}
          <div style={{ position: 'relative', flex: '1', minWidth: '220px' }}>
            <Search
              size={16}
              style={{
                position: 'absolute',
                left: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--text-muted)',
              }}
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search Order ID, Customer, Brand..."
              className="rway-input"
              style={{ paddingLeft: '2.4rem', fontSize: '0.85rem', padding: '0.5rem 0.75rem 0.5rem 2.4rem' }}
            />
          </div>
        </div>

        {/* ========================================================================= */}
        {/* ORDERS TABLE */}
        {/* ========================================================================= */}
        <div className="table-container">
          <div
            style={{
              padding: '1rem 1.25rem',
              borderBottom: '1px solid var(--border-light)',
              display: 'flex',
              flexWrap: 'wrap',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: '0.75rem',
            }}
          >
            <div>
              <span style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--rway-teal-950)' }}>
                Orders ({orders.length} found)
              </span>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginLeft: '0.75rem' }}>
                Total Order Value: <b>₹{totalRevenue.toLocaleString('en-IN')}</b>
              </span>
            </div>

            {selectedBrandId !== 'all' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span className="badge badge-brand">
                  Filtered: {brandStats.find((b) => b.id === selectedBrandId)?.name}
                </span>
                <button
                  onClick={() => setSelectedBrandId('all')}
                  style={{ border: 'none', background: 'none', color: '#dc2626', cursor: 'pointer', fontSize: '0.78rem' }}
                >
                  Clear Brand Filter
                </button>
              </div>
            )}
          </div>

          <table className="rway-table">
            <thead>
              <tr>
                <th style={{ width: '40px' }}>#</th>
                <th>Amazon Order ID</th>
                <th>Brand</th>
                <th>Buyer / Customer</th>
                <th>Amount (₹)</th>
                <th>Deal Info</th>
                <th>Date</th>
                <th>Review Status</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={9} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                    Loading orders...
                  </td>
                </tr>
              ) : orders.length === 0 ? (
                <tr>
                  <td colSpan={9} style={{ textAlign: 'center', padding: '3.5rem 1rem' }}>
                    <div style={{ maxWidth: '380px', margin: '0 auto', textAlign: 'center' }}>
                      <Clock size={36} color="var(--rway-teal-400)" style={{ margin: '0 auto 0.75rem' }} />
                      <h4 style={{ fontSize: '1.1rem', marginBottom: '0.35rem' }}>No Orders Found</h4>
                      <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1.25rem' }}>
                        No orders match the selected filters or date range. Paste a deal message to import orders.
                      </p>
                      <Link href="/admin/orders/bulk-import" className="btn btn-gold btn-sm">
                        <UploadCloud size={15} /> Paste WhatsApp Deal
                      </Link>
                    </div>
                  </td>
                </tr>
              ) : (
                orders.map((ord, idx) => (
                  <tr key={ord.id}>
                    <td style={{ color: 'var(--text-muted)', fontWeight: 600 }}>{idx + 1}</td>

                    {/* Order ID with Copy Button */}
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <span
                          style={{
                            fontFamily: 'var(--font-mono)',
                            fontWeight: 600,
                            color: 'var(--rway-teal-950)',
                            fontSize: '0.85rem',
                          }}
                        >
                          {ord.orderId}
                        </span>
                        <button
                          onClick={() => handleCopyOrderId(ord.orderId)}
                          style={{
                            border: 'none',
                            background: 'transparent',
                            cursor: 'pointer',
                            padding: '2px',
                            color: copiedOrderId === ord.orderId ? '#16a34a' : 'var(--text-muted)',
                          }}
                          title="Copy Amazon Order ID"
                        >
                          {copiedOrderId === ord.orderId ? <Check size={14} /> : <Copy size={14} />}
                        </button>
                      </div>
                    </td>

                    {/* Brand */}
                    <td>
                      <span className="badge badge-brand">{ord.brand?.name || 'General'}</span>
                    </td>

                    {/* Customer */}
                    <td style={{ fontWeight: 500 }}>{ord.customerName}</td>

                    {/* Amount */}
                    <td style={{ fontWeight: 700, color: 'var(--rway-teal-950)' }}>
                      ₹{ord.amount}
                    </td>

                    {/* Deal Code */}
                    <td>
                      <span className="badge badge-gold">
                        {ord.deal?.dealCode || 'Deal'}
                      </span>
                    </td>

                    {/* Date */}
                    <td style={{ fontSize: '0.825rem', color: 'var(--text-secondary)' }}>
                      {new Date(ord.orderDate).toLocaleDateString('en-GB')}
                    </td>

                    {/* Status Badge with Click to Toggle */}
                    <td>
                      <button
                        onClick={() => handleToggleStatus(ord)}
                        style={{ border: 'none', background: 'transparent', cursor: 'pointer', padding: 0 }}
                        title="Click to toggle status between Pending and Submitted"
                      >
                        {ord.status === 'REVIEW_SUBMITTED' ? (
                          <span className="badge badge-submitted">
                            <CheckCircle2 size={12} /> Submitted
                          </span>
                        ) : (
                          <span className="badge badge-pending">
                            <Clock size={12} /> Pending Review
                          </span>
                        )}
                      </button>
                    </td>

                    {/* Actions */}
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                        {ord.status === 'REVIEW_SUBMITTED' && (
                          <button
                            onClick={() => setViewProofOrder(ord)}
                            className="btn btn-outline btn-sm"
                            title="View Review Screenshots & Proof"
                            style={{ padding: '0.35rem 0.5rem', color: 'var(--rway-teal-700)' }}
                          >
                            <Eye size={14} />
                          </button>
                        )}

                        <button
                          onClick={() => handleDeleteOrder(ord.orderId)}
                          className="btn btn-outline btn-sm"
                          title="Delete Order"
                          style={{ padding: '0.35rem 0.5rem', color: '#dc2626', borderColor: '#fecaca' }}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </main>

      {/* ========================================================================= */}
      {/* MODAL: ADD SINGLE ORDER */}
      {/* ========================================================================= */}
      {isAddModalOpen && (
        <div className="modal-backdrop" onClick={() => setIsAddModalOpen(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()} style={{ padding: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h3 style={{ fontSize: '1.3rem', color: 'var(--rway-teal-950)' }}>
                Add Single Order
              </h3>
              <button
                onClick={() => setIsAddModalOpen(false)}
                style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--text-muted)' }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateSingleOrder} style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: '0.35rem' }}>
                  Amazon Order ID *
                </label>
                <input
                  type="text"
                  required
                  placeholder="402-3773401-7723540"
                  value={singleForm.orderId}
                  onChange={(e) => setSingleForm({ ...singleForm, orderId: e.target.value })}
                  className="rway-input"
                  style={{ fontFamily: 'var(--font-mono)' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: '0.35rem' }}>
                    Brand
                  </label>
                  <select
                    value={singleForm.brandId}
                    onChange={(e) => setSingleForm({ ...singleForm, brandId: e.target.value })}
                    className="rway-select"
                  >
                    <option value="">Select Existing Brand</option>
                    {brandStats.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: '0.35rem' }}>
                    Or Create New Brand
                  </label>
                  <input
                    type="text"
                    placeholder="New Brand Name"
                    value={singleForm.newBrandName}
                    onChange={(e) => setSingleForm({ ...singleForm, newBrandName: e.target.value })}
                    className="rway-input"
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: '0.35rem' }}>
                    Buyer / Customer Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Vicky sharma"
                    value={singleForm.customerName}
                    onChange={(e) => setSingleForm({ ...singleForm, customerName: e.target.value })}
                    className="rway-input"
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: '0.35rem' }}>
                    Offer Amount (₹) *
                  </label>
                  <input
                    type="number"
                    required
                    placeholder="363"
                    value={singleForm.amount}
                    onChange={(e) => setSingleForm({ ...singleForm, amount: e.target.value })}
                    className="rway-input"
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: '0.35rem' }}>
                    Deal Code
                  </label>
                  <input
                    type="text"
                    placeholder="Deal 50"
                    value={singleForm.dealCode}
                    onChange={(e) => setSingleForm({ ...singleForm, dealCode: e.target.value })}
                    className="rway-input"
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: '0.35rem' }}>
                    Order Date
                  </label>
                  <input
                    type="date"
                    value={singleForm.orderDate}
                    onChange={(e) => setSingleForm({ ...singleForm, orderDate: e.target.value })}
                    className="rway-input"
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: '0.35rem' }}>
                  Initial Status
                </label>
                <select
                  value={singleForm.status}
                  onChange={(e) => setSingleForm({ ...singleForm, status: e.target.value })}
                  className="rway-select"
                >
                  <option value="PENDING_REVIEW">Pending Review</option>
                  <option value="REVIEW_SUBMITTED">Review Submitted</option>
                </select>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem' }}>
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="btn btn-outline"
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Save Order
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: VIEW PROOF / REVIEW DETAILS */}
      {/* ========================================================================= */}
      {viewProofOrder && (
        <div className="modal-backdrop" onClick={() => setViewProofOrder(null)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()} style={{ padding: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <div>
                <h3 style={{ fontSize: '1.25rem', color: 'var(--rway-teal-950)' }}>
                  Review Proof Details
                </h3>
                <span style={{ fontSize: '0.825rem', color: 'var(--text-muted)' }}>
                  Order: {viewProofOrder.orderId}
                </span>
              </div>
              <button
                onClick={() => setViewProofOrder(null)}
                style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--text-muted)' }}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.75rem', backgroundColor: 'var(--bg-canvas)', borderRadius: 'var(--radius-md)' }}>
                <span>Buyer Name:</span>
                <b>{viewProofOrder.customerName}</b>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.75rem', backgroundColor: 'var(--bg-canvas)', borderRadius: 'var(--radius-md)' }}>
                <span>Review Rating:</span>
                <b>⭐ {viewProofOrder.reviewRating || 5} / 5 Stars</b>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.75rem', backgroundColor: 'var(--bg-canvas)', borderRadius: 'var(--radius-md)' }}>
                <span>Submitted At:</span>
                <b>
                  {viewProofOrder.reviewSubmittedAt
                    ? new Date(viewProofOrder.reviewSubmittedAt).toLocaleString('en-GB')
                    : 'Recorded'}
                </b>
              </div>

              {/* Delivered Screenshot */}
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: '0.35rem' }}>
                  Delivered Screenshot Proof:
                </label>
                {viewProofOrder.deliveredProofUrl ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={viewProofOrder.deliveredProofUrl}
                      alt="Delivered proof"
                      style={{
                        maxHeight: '180px',
                        maxWidth: '100%',
                        objectFit: 'contain',
                        borderRadius: '8px',
                        border: '1px solid var(--border-subtle)',
                        backgroundColor: '#f8fafc',
                      }}
                    />
                    <a
                      href={viewProofOrder.deliveredProofUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="btn btn-outline btn-sm"
                      style={{ wordBreak: 'break-all', display: 'inline-flex', alignSelf: 'flex-start' }}
                    >
                      <ExternalLink size={14} /> Open Full Size Screenshot
                    </a>
                  </div>
                ) : (
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                    Verified via Buyer Review Sync
                  </span>
                )}
              </div>

              {/* Rating Screenshot */}
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: '0.35rem' }}>
                  Rating Screenshot Proof:
                </label>
                {viewProofOrder.ratingProofUrl ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={viewProofOrder.ratingProofUrl}
                      alt="Rating proof"
                      style={{
                        maxHeight: '180px',
                        maxWidth: '100%',
                        objectFit: 'contain',
                        borderRadius: '8px',
                        border: '1px solid var(--border-subtle)',
                        backgroundColor: '#f8fafc',
                      }}
                    />
                    <a
                      href={viewProofOrder.ratingProofUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="btn btn-outline btn-sm"
                      style={{ wordBreak: 'break-all', display: 'inline-flex', alignSelf: 'flex-start' }}
                    >
                      <ExternalLink size={14} /> Open Full Size Screenshot
                    </a>
                  </div>
                ) : (
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                    Verified via Buyer Review Sync
                  </span>
                )}
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button onClick={() => setViewProofOrder(null)} className="btn btn-primary">
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: GOOGLE FORM SETTINGS & APPS SCRIPT WEBHOOK */}
      {/* ========================================================================= */}
      {isSettingsModalOpen && (
        <div className="modal-backdrop" onClick={() => setIsSettingsModalOpen(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()} style={{ padding: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h3 style={{ fontSize: '1.3rem', color: 'var(--rway-teal-950)' }}>
                Google Form & Review Mapping Configuration
              </h3>
              <button
                onClick={() => setIsSettingsModalOpen(false)}
                style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--text-muted)' }}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 700, marginBottom: '0.35rem' }}>
                  Google Form Share Link (Copied by &quot;Copy Google Form Link&quot; button):
                </label>
                <input
                  type="url"
                  value={googleFormUrl}
                  onChange={(e) => setGoogleFormUrl(e.target.value)}
                  placeholder="https://docs.google.com/forms/d/e/.../viewform"
                  className="rway-input"
                />
                <button
                  type="button"
                  onClick={() => handleSaveSettings(googleFormUrl)}
                  className="btn btn-primary btn-sm"
                  style={{ marginTop: '0.5rem' }}
                >
                  Save Form URL
                </button>
              </div>

              <div
                style={{
                  backgroundColor: 'var(--bg-canvas)',
                  padding: '1rem',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-light)',
                }}
              >
                <h4 style={{ fontSize: '0.9rem', marginBottom: '0.35rem', color: 'var(--rway-teal-900)' }}>
                  Google Apps Script Auto-Sync Snippet (Optional)
                </h4>
                <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
                  Paste this script into your Google Form or linked Google Sheet under <i>Extensions &gt; Apps Script</i> so new responses automatically trigger order status updates:
                </p>
                <pre
                  style={{
                    backgroundColor: '#111827',
                    color: '#e5e7eb',
                    padding: '0.75rem',
                    borderRadius: '6px',
                    fontSize: '0.75rem',
                    overflowX: 'auto',
                    fontFamily: 'var(--font-mono)',
                  }}
                >
{`function onFormSubmit(e) {
  var itemResponses = e.response.getItemResponses();
  var payload = {};
  for (var i = 0; i < itemResponses.length; i++) {
    payload[itemResponses[i].getItem().getTitle()] = itemResponses[i].getResponse();
  }
  UrlFetchApp.fetch("${typeof window !== 'undefined' ? window.location.origin : ''}/api/reviews/sync", {
    method: "post",
    contentType: "application/json",
    payload: JSON.stringify(payload)
  });
}`}
                </pre>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1.25rem' }}>
              <button onClick={() => setIsSettingsModalOpen(false)} className="btn btn-outline">
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast notice */}
      {toastMessage && (
        <div className="toast-notice">
          <Sparkles size={18} color="var(--rway-gold-400)" />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
}
