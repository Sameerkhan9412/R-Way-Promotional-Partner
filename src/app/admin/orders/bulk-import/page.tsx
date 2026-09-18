'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Navbar } from '@/components/Navbar';
import { parseWhatsAppMessage, ParsedDeal, ParsedOrderItem } from '@/lib/whatsapp-parser';
import {
  UploadCloud,
  Wand2,
  CheckCircle2,
  AlertTriangle,
  Plus,
  Trash2,
  Calendar,
  Tag,
  Hash,
  ArrowRight,
  RotateCcw,
  Sparkles,
  Info,
} from 'lucide-react';

const SAMPLE_1 = `16/09/2026 Deal 50
Tagas kids night suit (05 orders)
Total 1432

402-3773401-7723540 Nitesh 363
408-7068348-7712307 MANGI lal 289
403-5365709-9153157 Vicky sharma 363
403-3265425-2321961 Vicky sharma 363
402-4112007-8633966 Gunjan 304`;

const SAMPLE_2 = `16/09/2026 Deal 100
Tagas women's kurta set (07 orders)
Total 4955

403-8206728-9709145 Vicky sharma 813
404-7163279-0184319 nitin 804
408-0926607-1110711 Vinod 813
407-1920978-9101913 Mahendra kumar 804
404-2265885-0461907 ar 813
403-9097418-3002725 Keshav singh 804
402-7094765-5833565 Gunjan 804`;

const SAMPLE_3 = `16/09/2026 Deal 80
Celary women co ord set (07 orders)
Total 4795

405-3826494-3818769 Robin sair 793
408-6053637-9765139 Vinod 793
408-9932450-0190727 Ashish ar 793
406-2527724-8333131 Vikas rohi
406-6088399-6185101 Arun kum
404-2083786-6252352 nitin 793
402-8649734-1331566 Gunjan 784`;

const SAMPLE_ALL = `${SAMPLE_1}\n\n${SAMPLE_2}\n\n${SAMPLE_3}`;

export default function BulkImportPage() {
  const router = useRouter();
  const [rawText, setRawText] = useState('');
  const [parsedDeals, setParsedDeals] = useState<ParsedDeal[]>([]);
  const [existingBrands, setExistingBrands] = useState<{ id: string; name: string }[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    // Load existing brands from DB for selector
    fetch('/api/brands')
      .then((res) => res.json())
      .then((data) => {
        if (data.brands) {
          setExistingBrands(data.brands.map((b: any) => ({ id: b.id, name: b.name })));
        }
      })
      .catch(() => {});
  }, []);

  const handleParse = () => {
    if (!rawText.trim()) {
      setNotification({ type: 'error', message: 'Please paste WhatsApp deal text first.' });
      return;
    }

    const result = parseWhatsAppMessage(rawText);
    if (result.deals.length === 0) {
      setNotification({
        type: 'error',
        message: 'Could not find any Amazon Order IDs in the text. Please check the pasted format.',
      });
      return;
    }

    setParsedDeals(result.deals);
    setNotification({
      type: 'success',
      message: `Successfully parsed ${result.deals.length} deal(s) containing ${result.totalOrdersFound} total orders! Review and save below.`,
    });
  };

  const handleUpdateDealBrand = (dealIndex: number, newBrand: string) => {
    const updated = [...parsedDeals];
    updated[dealIndex].brandName = newBrand;
    setParsedDeals(updated);
  };

  const handleUpdateDealDate = (dealIndex: number, newDateStr: string) => {
    const updated = [...parsedDeals];
    updated[dealIndex].dateStr = newDateStr;
    try {
      updated[dealIndex].date = new Date(newDateStr);
    } catch {}
    setParsedDeals(updated);
  };

  const handleUpdateDealCode = (dealIndex: number, newCode: string) => {
    const updated = [...parsedDeals];
    updated[dealIndex].dealCode = newCode;
    setParsedDeals(updated);
  };

  const handleUpdateOrderItem = (
    dealIndex: number,
    orderIndex: number,
    field: keyof ParsedOrderItem,
    value: any
  ) => {
    const updated = [...parsedDeals];
    const order = updated[dealIndex].orders[orderIndex];
    if (field === 'amount') {
      order.amount = parseFloat(value) || 0;
      order.hasExplicitAmount = true;
    } else if (field === 'customerName') {
      order.customerName = value;
    } else if (field === 'orderId') {
      order.orderId = value;
    }
    // Recompute deal calculated total
    updated[dealIndex].calculatedTotal = updated[dealIndex].orders.reduce(
      (sum, o) => sum + (o.amount || 0),
      0
    );
    setParsedDeals(updated);
  };

  const handleRemoveOrder = (dealIndex: number, orderIndex: number) => {
    const updated = [...parsedDeals];
    updated[dealIndex].orders.splice(orderIndex, 1);
    updated[dealIndex].calculatedTotal = updated[dealIndex].orders.reduce(
      (sum, o) => sum + (o.amount || 0),
      0
    );
    setParsedDeals(updated);
  };

  const handleAddOrderToDeal = (dealIndex: number) => {
    const updated = [...parsedDeals];
    updated[dealIndex].orders.push({
      orderId: '40' + Math.floor(100000000000000 + Math.random() * 900000000000000).toString().replace(/(\d{3})(\d{7})(\d{7})/, '$1-$2-$3'),
      customerName: 'New Buyer',
      amount: 0,
      hasExplicitAmount: false,
      rawLine: '',
    });
    setParsedDeals(updated);
  };

  const handleSaveToDatabase = async () => {
    if (parsedDeals.length === 0) return;
    setIsSaving(true);
    setNotification(null);

    try {
      const payload = {
        deals: parsedDeals.map((d) => ({
          brandName: d.brandName,
          dealCode: d.dealCode,
          productTitle: d.productTitle || `${d.brandName} Deal`,
          date: d.date,
          expectedOrderCount: d.expectedOrderCount,
          statedTotal: d.statedTotal,
          orders: d.orders.map((o) => ({
            orderId: o.orderId,
            customerName: o.customerName,
            amount: o.amount,
          })),
        })),
      };

      const res = await fetch('/api/orders/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to save orders');
      }

      setNotification({
        type: 'success',
        message: data.message || 'All orders saved to database successfully! Redirecting...',
      });

      setTimeout(() => {
        router.push('/admin/orders');
      }, 1200);
    } catch (err: any) {
      setNotification({
        type: 'error',
        message: err.message || 'Failed to save orders. Please try again.',
      });
      setIsSaving(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--bg-canvas)' }}>
      <Navbar />

      <main className="rway-container" style={{ padding: '2rem 1.5rem 4rem' }}>
        {/* Breadcrumb & Header */}
        <div style={{ marginBottom: '2rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
            <span>Admin</span>
            <span>/</span>
            <span>Orders</span>
            <span>/</span>
            <span style={{ color: 'var(--rway-teal-800)', fontWeight: 600 }}>Bulk Import</span>
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem' }}>
            <div>
              <h1 style={{ fontSize: '2rem', color: 'var(--rway-teal-950)', marginBottom: '0.25rem' }}>
                Bulk Order Import
              </h1>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
                Paste the order/deal message copied from WhatsApp.
              </p>
            </div>

            {/* Helper quick loaders */}
            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)' }}>
                Test Samples:
              </span>
              <button
                type="button"
                onClick={() => setRawText(SAMPLE_1)}
                className="btn btn-outline btn-sm"
              >
                Tagas (5 orders)
              </button>
              <button
                type="button"
                onClick={() => setRawText(SAMPLE_2)}
                className="btn btn-outline btn-sm"
              >
                Tagas (7 orders)
              </button>
              <button
                type="button"
                onClick={() => setRawText(SAMPLE_3)}
                className="btn btn-outline btn-sm"
              >
                Celary (7 orders)
              </button>
              <button
                type="button"
                onClick={() => setRawText(SAMPLE_ALL)}
                className="btn btn-secondary btn-sm"
              >
                <Sparkles size={14} /> Paste All 3 Deals
              </button>
            </div>
          </div>
        </div>

        {/* Notification Banner */}
        {notification && (
          <div
            style={{
              padding: '1rem 1.25rem',
              borderRadius: 'var(--radius-md)',
              marginBottom: '1.5rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              backgroundColor: notification.type === 'success' ? '#f0fdf4' : '#fef2f2',
              border: `1px solid ${notification.type === 'success' ? '#bbf7d0' : '#fecaca'}`,
              color: notification.type === 'success' ? '#166534' : '#991b1b',
              fontWeight: 500,
              fontSize: '0.9rem',
            }}
          >
            {notification.type === 'success' ? (
              <CheckCircle2 size={20} color="#16a34a" style={{ flexShrink: 0 }} />
            ) : (
              <AlertTriangle size={20} color="#dc2626" style={{ flexShrink: 0 }} />
            )}
            <span>{notification.message}</span>
          </div>
        )}

        {/* Textarea Import Section */}
        <div className="rway-card" style={{ padding: '1.75rem', marginBottom: '2.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
            <label
              style={{
                fontSize: '0.925rem',
                fontWeight: 700,
                color: 'var(--rway-teal-950)',
                display: 'flex',
                alignItems: 'center',
                gap: '0.45rem',
              }}
            >
              <UploadCloud size={18} color="var(--rway-teal-700)" />
              <span>WhatsApp Deal Text Message</span>
            </label>
            {rawText && (
              <button
                type="button"
                onClick={() => setRawText('')}
                className="btn btn-outline btn-sm"
                style={{ fontSize: '0.75rem', padding: '0.25rem 0.6rem' }}
              >
                <RotateCcw size={13} /> Clear
              </button>
            )}
          </div>

          <textarea
            rows={9}
            value={rawText}
            onChange={(e) => setRawText(e.target.value)}
            placeholder="Paste WhatsApp deal message here...

Example:
16/09/2026 Deal 50
Tagas kids night suit (05 orders)
Total 1432

402-3773401-7723540 Nitesh 363
408-7068348-7712307 MANGI lal 289
403-5365709-9153157 Vicky sharma 363"
            className="rway-textarea"
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '0.885rem',
              lineHeight: 1.6,
              resize: 'vertical',
            }}
          />

          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginTop: '1.25rem',
              gap: '1rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)', fontSize: '0.825rem' }}>
              <Info size={16} />
              <span>
                Engine extracts Date, Deal Code, Brand Name, Order IDs, Buyer Names & Offer Prices.
              </span>
            </div>

            <button
              type="button"
              onClick={handleParse}
              className="btn btn-gold btn-lg"
              style={{ minWidth: '180px' }}
            >
              <Wand2 size={18} />
              <span>Parse Orders</span>
            </button>
          </div>
        </div>

        {/* Parsed Results Preview */}
        {parsedDeals.length > 0 && (
          <div>
            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '1.5rem',
                gap: '1rem',
              }}
            >
              <div>
                <h2 style={{ fontSize: '1.4rem', color: 'var(--rway-teal-950)' }}>
                  Extracted Campaigns ({parsedDeals.length} Deals,{' '}
                  {parsedDeals.reduce((sum, d) => sum + d.orders.length, 0)} Orders)
                </h2>
                <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                  Verify brand assignment, customer details, and offer amounts before saving to database.
                </p>
              </div>

              <button
                type="button"
                disabled={isSaving}
                onClick={handleSaveToDatabase}
                className="btn btn-primary btn-lg"
                style={{
                  backgroundColor: 'var(--rway-teal-800)',
                  boxShadow: 'var(--shadow-md)',
                }}
              >
                {isSaving ? (
                  <span>Saving to Database...</span>
                ) : (
                  <>
                    <CheckCircle2 size={18} />
                    <span>Save Orders to Database</span>
                    <ArrowRight size={16} />
                  </>
                )}
              </button>
            </div>

            {/* Deal Cards */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
              {parsedDeals.map((deal, dealIdx) => (
                <div
                  key={deal.id || dealIdx}
                  className="rway-card rway-card-highlight"
                  style={{ padding: '1.75rem' }}
                >
                  {/* Deal Header Configuration Bar */}
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                      gap: '1rem',
                      paddingBottom: '1.25rem',
                      marginBottom: '1.25rem',
                      borderBottom: '1px solid var(--border-light)',
                      backgroundColor: 'var(--bg-card-muted)',
                      padding: '1rem',
                      borderRadius: 'var(--radius-md)',
                    }}
                  >
                    {/* Brand Name Input / Selector */}
                    <div>
                      <label
                        style={{
                          display: 'block',
                          fontSize: '0.78rem',
                          fontWeight: 700,
                          color: 'var(--rway-teal-900)',
                          marginBottom: '0.3rem',
                          textTransform: 'uppercase',
                        }}
                      >
                        <Tag size={13} style={{ display: 'inline', marginRight: '4px' }} />
                        Brand (Categorization)
                      </label>
                      <input
                        type="text"
                        value={deal.brandName}
                        onChange={(e) => handleUpdateDealBrand(dealIdx, e.target.value)}
                        placeholder="Brand Name (e.g. Tagas, Celary)"
                        className="rway-input"
                        style={{ fontWeight: 600, color: 'var(--rway-teal-900)' }}
                      />
                    </div>

                    {/* Deal Code */}
                    <div>
                      <label
                        style={{
                          display: 'block',
                          fontSize: '0.78rem',
                          fontWeight: 700,
                          color: 'var(--rway-teal-900)',
                          marginBottom: '0.3rem',
                          textTransform: 'uppercase',
                        }}
                      >
                        <Hash size={13} style={{ display: 'inline', marginRight: '4px' }} />
                        Deal Code
                      </label>
                      <input
                        type="text"
                        value={deal.dealCode}
                        onChange={(e) => handleUpdateDealCode(dealIdx, e.target.value)}
                        placeholder="Deal 50"
                        className="rway-input"
                      />
                    </div>

                    {/* Deal Date */}
                    <div>
                      <label
                        style={{
                          display: 'block',
                          fontSize: '0.78rem',
                          fontWeight: 700,
                          color: 'var(--rway-teal-900)',
                          marginBottom: '0.3rem',
                          textTransform: 'uppercase',
                        }}
                      >
                        <Calendar size={13} style={{ display: 'inline', marginRight: '4px' }} />
                        Date
                      </label>
                      <input
                        type="text"
                        value={deal.dateStr}
                        onChange={(e) => handleUpdateDealDate(dealIdx, e.target.value)}
                        placeholder="16/09/2026"
                        className="rway-input"
                      />
                    </div>

                    {/* Total & Verification Status */}
                    <div>
                      <label
                        style={{
                          display: 'block',
                          fontSize: '0.78rem',
                          fontWeight: 700,
                          color: 'var(--rway-teal-900)',
                          marginBottom: '0.3rem',
                          textTransform: 'uppercase',
                        }}
                      >
                        Sum & Verification
                      </label>
                      <div
                        style={{
                          padding: '0.55rem 0.85rem',
                          borderRadius: 'var(--radius-md)',
                          fontSize: '0.825rem',
                          backgroundColor: '#ffffff',
                          border: '1px solid var(--border-subtle)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                        }}
                      >
                        <div>
                          <span style={{ color: 'var(--text-secondary)' }}>Sum: </span>
                          <b style={{ color: 'var(--rway-teal-950)' }}>₹{deal.calculatedTotal}</b>
                          {deal.statedTotal !== null && (
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginLeft: '6px' }}>
                              (Msg: ₹{deal.statedTotal})
                            </span>
                          )}
                        </div>
                        <span className="badge badge-brand">
                          {deal.orders.length} orders
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Product Title Tag */}
                  {deal.productTitle && (
                    <div style={{ marginBottom: '1rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                      <b>Extracted Product:</b> {deal.productTitle}
                    </div>
                  )}

                  {/* Orders Table */}
                  <div className="table-container" style={{ marginBottom: '1rem' }}>
                    <table className="rway-table">
                      <thead>
                        <tr>
                          <th style={{ width: '40px' }}>#</th>
                          <th>Amazon Order ID</th>
                          <th>Customer Name</th>
                          <th>Offer Amount (₹)</th>
                          <th style={{ textAlign: 'right' }}>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {deal.orders.map((ord, ordIdx) => (
                          <tr key={ordIdx}>
                            <td style={{ color: 'var(--text-muted)', fontWeight: 600 }}>
                              {ordIdx + 1}
                            </td>
                            <td>
                              <input
                                type="text"
                                value={ord.orderId}
                                onChange={(e) =>
                                  handleUpdateOrderItem(dealIdx, ordIdx, 'orderId', e.target.value)
                                }
                                className="rway-input"
                                style={{
                                  fontFamily: 'var(--font-mono)',
                                  fontSize: '0.84rem',
                                  padding: '0.4rem 0.65rem',
                                  maxWidth: '260px',
                                }}
                              />
                            </td>
                            <td>
                              <input
                                type="text"
                                value={ord.customerName}
                                onChange={(e) =>
                                  handleUpdateOrderItem(dealIdx, ordIdx, 'customerName', e.target.value)
                                }
                                className="rway-input"
                                style={{
                                  fontSize: '0.84rem',
                                  padding: '0.4rem 0.65rem',
                                  maxWidth: '240px',
                                }}
                              />
                            </td>
                            <td>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <input
                                  type="number"
                                  value={ord.amount}
                                  onChange={(e) =>
                                    handleUpdateOrderItem(dealIdx, ordIdx, 'amount', e.target.value)
                                  }
                                  className="rway-input"
                                  style={{
                                    fontSize: '0.84rem',
                                    padding: '0.4rem 0.65rem',
                                    maxWidth: '120px',
                                    borderColor: !ord.hasExplicitAmount && ord.amount === 0 ? '#f59e0b' : undefined,
                                  }}
                                />
                                {!ord.hasExplicitAmount && ord.amount === 0 && (
                                  <span
                                    className="badge badge-pending"
                                    style={{ fontSize: '0.68rem', whiteSpace: 'nowrap' }}
                                    title="No explicit price on line in WhatsApp"
                                  >
                                    Check Price
                                  </span>
                                )}
                              </div>
                            </td>
                            <td style={{ textAlign: 'right' }}>
                              <button
                                type="button"
                                onClick={() => handleRemoveOrder(dealIdx, ordIdx)}
                                className="btn btn-outline btn-sm"
                                title="Delete order row"
                                style={{ color: '#dc2626', padding: '0.35rem' }}
                              >
                                <Trash2 size={15} />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Add order button */}
                  <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                    <button
                      type="button"
                      onClick={() => handleAddOrderToDeal(dealIdx)}
                      className="btn btn-outline btn-sm"
                    >
                      <Plus size={15} /> Add Order to this Deal
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Bottom Save Action Bar */}
            <div
              style={{
                marginTop: '2rem',
                display: 'flex',
                justifyContent: 'flex-end',
                alignItems: 'center',
                gap: '1rem',
              }}
            >
              <button
                type="button"
                onClick={() => setParsedDeals([])}
                className="btn btn-outline btn-lg"
              >
                Cancel & Clear
              </button>
              <button
                type="button"
                disabled={isSaving}
                onClick={handleSaveToDatabase}
                className="btn btn-gold btn-lg"
                style={{ minWidth: '220px' }}
              >
                {isSaving ? (
                  <span>Saving to Database...</span>
                ) : (
                  <>
                    <CheckCircle2 size={20} />
                    <span>Save All to Database</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
