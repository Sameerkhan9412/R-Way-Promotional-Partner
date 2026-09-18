'use client';

import React, { useState, useRef } from 'react';
import Link from 'next/link';
import { RwayLogo } from '@/components/RwayLogo';
import {
  CheckCircle2,
  UploadCloud,
  Star,
  ShieldCheck,
  ArrowRight,
  Sparkles,
  AlertCircle,
  Image as ImageIcon,
  Loader2,
  X,
  Link2,
  FileCheck,
} from 'lucide-react';

export default function SubmitReviewPage() {
  const [orderId, setOrderId] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [rating, setRating] = useState(5);

  // Delivered Screenshot States
  const [deliveredUrl, setDeliveredUrl] = useState('');
  const [isUploadingDelivered, setIsUploadingDelivered] = useState(false);
  const [deliveredUploadInfo, setDeliveredUploadInfo] = useState<string | null>(null);
  const [showDeliveredUrlInput, setShowDeliveredUrlInput] = useState(false);
  const deliveredFileRef = useRef<HTMLInputElement>(null);

  // Rating Screenshot States
  const [ratingUrl, setRatingUrl] = useState('');
  const [isUploadingRating, setIsUploadingRating] = useState(false);
  const [ratingUploadInfo, setRatingUploadInfo] = useState<string | null>(null);
  const [showRatingUrlInput, setShowRatingUrlInput] = useState(false);
  const ratingFileRef = useRef<HTMLInputElement>(null);

  // Submission States
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string; matched?: boolean } | null>(null);

  // Upload handler for Cloudinary
  const handleFileUpload = async (
    file: File,
    type: 'delivered' | 'rating'
  ) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('folder', 'rway_reviews');

    if (type === 'delivered') {
      setIsUploadingDelivered(true);
      setDeliveredUploadInfo(null);
    } else {
      setIsUploadingRating(true);
      setRatingUploadInfo(null);
    }

    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to upload image');
      }

      if (type === 'delivered') {
        setDeliveredUrl(data.url);
        setDeliveredUploadInfo(
          data.isCloudinary ? 'Uploaded to Cloudinary' : 'Uploaded (Local mode)'
        );
      } else {
        setRatingUrl(data.url);
        setRatingUploadInfo(
          data.isCloudinary ? 'Uploaded to Cloudinary' : 'Uploaded (Local mode)'
        );
      }
    } catch (err: any) {
      alert(`Upload error: ${err.message}`);
    } finally {
      if (type === 'delivered') setIsUploadingDelivered(false);
      else setIsUploadingRating(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orderId.trim()) return;

    setIsSubmitting(true);
    setResult(null);

    try {
      const res = await fetch('/api/reviews/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: orderId.trim(),
          customerName: customerName.trim() || undefined,
          rating,
          deliveredScreenshotUrl: deliveredUrl.trim() || undefined,
          ratingScreenshotUrl: ratingUrl.trim() || undefined,
          source: 'DIRECT_PORTAL',
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to submit review');
      }

      setResult({
        success: true,
        message: data.matched
          ? `Thank you! Your Amazon Order (${orderId.trim()}) has been verified and marked as Review Submitted!`
          : `Review details received for Order ${orderId.trim()}. Our campaign team will verify your submission.`,
        matched: data.matched,
      });

      setOrderId('');
      setCustomerName('');
      setDeliveredUrl('');
      setRatingUrl('');
      setDeliveredUploadInfo(null);
      setRatingUploadInfo(null);
    } catch (err: any) {
      setResult({
        success: false,
        message: err.message || 'Error submitting review. Please check your Order ID.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: 'var(--bg-canvas)',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Top Navbar */}
      <header className="rway-navbar" style={{ padding: '1rem 0' }}>
        <div className="rway-container" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <RwayLogo size="md" />
          <Link href="/admin/login" className="btn btn-outline btn-sm">
            Admin Portal
          </Link>
        </div>
      </header>

      {/* Main Review Form */}
      <main style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2.5rem 1rem' }}>
        <div
          className="rway-card"
          style={{
            maxWidth: '620px',
            width: '100%',
            padding: '2.5rem 2rem',
            borderTop: '5px solid var(--rway-gold-500)',
          }}
        >
          <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
                fontSize: '0.8rem',
                fontWeight: 700,
                color: 'var(--rway-gold-700)',
                backgroundColor: 'var(--rway-gold-50)',
                padding: '0.35rem 0.85rem',
                borderRadius: '9999px',
                marginBottom: '0.75rem',
              }}
            >
              <ShieldCheck size={15} /> Verified Buyer Review Portal
            </span>
            <h1 style={{ fontSize: '1.75rem', color: 'var(--rway-teal-950)', marginBottom: '0.5rem' }}>
              Submit Order Review
            </h1>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
              Upload your Amazon delivered & rating screenshots to verify your campaign deal.
            </p>
          </div>

          {result && (
            <div
              style={{
                padding: '1.25rem',
                borderRadius: 'var(--radius-md)',
                marginBottom: '1.75rem',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '0.75rem',
                backgroundColor: result.success ? '#f0fdf4' : '#fef2f2',
                border: `1px solid ${result.success ? '#bbf7d0' : '#fecaca'}`,
                color: result.success ? '#166534' : '#991b1b',
                fontSize: '0.925rem',
              }}
            >
              {result.success ? (
                <CheckCircle2 size={22} color="#16a34a" style={{ flexShrink: 0, marginTop: '2px' }} />
              ) : (
                <AlertCircle size={22} color="#dc2626" style={{ flexShrink: 0, marginTop: '2px' }} />
              )}
              <div>
                <p style={{ fontWeight: 600, marginBottom: '0.25rem' }}>
                  {result.success ? 'Submission Successful!' : 'Submission Failed'}
                </p>
                <p style={{ fontSize: '0.85rem' }}>{result.message}</p>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.4rem' }}>
            {/* Amazon Order ID */}
            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: '0.85rem',
                  fontWeight: 700,
                  color: 'var(--rway-teal-950)',
                  marginBottom: '0.4rem',
                }}
              >
                Amazon Order ID *
              </label>
              <input
                type="text"
                required
                value={orderId}
                onChange={(e) => setOrderId(e.target.value)}
                placeholder="e.g. 402-3773401-7723540"
                className="rway-input"
                style={{ fontFamily: 'var(--font-mono)', fontSize: '0.925rem' }}
              />
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px', display: 'block' }}>
                Format: 17 digits with dashes (xxx-xxxxxxx-xxxxxxx) from your Amazon Orders history.
              </span>
            </div>

            {/* Buyer Name */}
            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: '0.85rem',
                  fontWeight: 700,
                  color: 'var(--rway-teal-950)',
                  marginBottom: '0.4rem',
                }}
              >
                Your Name / WhatsApp Name
              </label>
              <input
                type="text"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="e.g. Vicky Sharma"
                className="rway-input"
              />
            </div>

            {/* Star Rating */}
            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: '0.85rem',
                  fontWeight: 700,
                  color: 'var(--rway-teal-950)',
                  marginBottom: '0.4rem',
                }}
              >
                Rating Given on Amazon
              </label>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    style={{
                      border: 'none',
                      background: 'transparent',
                      cursor: 'pointer',
                      padding: '4px',
                    }}
                  >
                    <Star
                      size={28}
                      fill={star <= rating ? '#eab308' : 'none'}
                      color={star <= rating ? '#eab308' : '#cbd5e1'}
                    />
                  </button>
                ))}
                <span style={{ fontSize: '0.9rem', fontWeight: 600, marginLeft: '0.5rem', color: 'var(--rway-gold-700)' }}>
                  {rating} Star{rating > 1 ? 's' : ''}
                </span>
              </div>
            </div>

            {/* ========================================================================= */}
            {/* CLOUDINARY UPLOAD 1: DELIVERED SCREENSHOT */}
            {/* ========================================================================= */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                <label
                  style={{
                    fontSize: '0.85rem',
                    fontWeight: 700,
                    color: 'var(--rway-teal-950)',
                  }}
                >
                  1. Delivered Screenshot Proof
                </label>
                <button
                  type="button"
                  onClick={() => setShowDeliveredUrlInput(!showDeliveredUrlInput)}
                  style={{ border: 'none', background: 'none', color: 'var(--rway-teal-700)', fontSize: '0.75rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '3px' }}
                >
                  <Link2 size={12} />
                  <span>{showDeliveredUrlInput ? 'Switch to File Upload' : 'Paste Direct URL'}</span>
                </button>
              </div>

              {showDeliveredUrlInput ? (
                <input
                  type="url"
                  value={deliveredUrl}
                  onChange={(e) => setDeliveredUrl(e.target.value)}
                  placeholder="https://res.cloudinary.com/... or image URL"
                  className="rway-input"
                />
              ) : (
                <div>
                  <input
                    type="file"
                    ref={deliveredFileRef}
                    accept="image/*"
                    style={{ display: 'none' }}
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        handleFileUpload(e.target.files[0], 'delivered');
                      }
                    }}
                  />

                  {deliveredUrl ? (
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '0.75rem 1rem',
                        backgroundColor: '#f0fdf4',
                        border: '1px solid #bbf7d0',
                        borderRadius: 'var(--radius-md)',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={deliveredUrl}
                          alt="Delivered preview"
                          style={{
                            width: '48px',
                            height: '48px',
                            objectFit: 'cover',
                            borderRadius: '6px',
                            border: '1px solid #86efac',
                          }}
                        />
                        <div>
                          <span style={{ display: 'block', fontSize: '0.825rem', fontWeight: 600, color: '#166534' }}>
                            Delivered Screenshot Ready
                          </span>
                          <span style={{ fontSize: '0.72rem', color: '#15803d', wordBreak: 'break-all' }}>
                            {deliveredUploadInfo || 'Image saved'}
                          </span>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setDeliveredUrl('');
                          setDeliveredUploadInfo(null);
                        }}
                        style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#dc2626' }}
                      >
                        <X size={18} />
                      </button>
                    </div>
                  ) : (
                    <div
                      onClick={() => deliveredFileRef.current?.click()}
                      style={{
                        border: '2px dashed var(--border-subtle)',
                        borderRadius: 'var(--radius-md)',
                        padding: '1.25rem',
                        textAlign: 'center',
                        cursor: 'pointer',
                        backgroundColor: '#ffffff',
                        transition: 'border-color 0.15s ease',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'var(--rway-teal-600)')}
                      onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'var(--border-subtle)')}
                    >
                      {isUploadingDelivered ? (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', color: 'var(--rway-teal-800)' }}>
                          <Loader2 size={20} className="animate-spin" />
                          <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>Uploading to Cloudinary...</span>
                        </div>
                      ) : (
                        <div>
                          <UploadCloud size={24} color="var(--rway-teal-700)" style={{ margin: '0 auto 0.35rem' }} />
                          <p style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--rway-teal-950)' }}>
                            Click to upload Delivered Screenshot
                          </p>
                          <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                            JPG, PNG, WebP up to 10MB (Cloudinary storage)
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* ========================================================================= */}
            {/* CLOUDINARY UPLOAD 2: RATING SCREENSHOT */}
            {/* ========================================================================= */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                <label
                  style={{
                    fontSize: '0.85rem',
                    fontWeight: 700,
                    color: 'var(--rway-teal-950)',
                  }}
                >
                  2. Rating / Review Screenshot Proof
                </label>
                <button
                  type="button"
                  onClick={() => setShowRatingUrlInput(!showRatingUrlInput)}
                  style={{ border: 'none', background: 'none', color: 'var(--rway-teal-700)', fontSize: '0.75rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '3px' }}
                >
                  <Link2 size={12} />
                  <span>{showRatingUrlInput ? 'Switch to File Upload' : 'Paste Direct URL'}</span>
                </button>
              </div>

              {showRatingUrlInput ? (
                <input
                  type="url"
                  value={ratingUrl}
                  onChange={(e) => setRatingUrl(e.target.value)}
                  placeholder="https://res.cloudinary.com/... or image URL"
                  className="rway-input"
                />
              ) : (
                <div>
                  <input
                    type="file"
                    ref={ratingFileRef}
                    accept="image/*"
                    style={{ display: 'none' }}
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        handleFileUpload(e.target.files[0], 'rating');
                      }
                    }}
                  />

                  {ratingUrl ? (
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '0.75rem 1rem',
                        backgroundColor: '#f0fdf4',
                        border: '1px solid #bbf7d0',
                        borderRadius: 'var(--radius-md)',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={ratingUrl}
                          alt="Rating preview"
                          style={{
                            width: '48px',
                            height: '48px',
                            objectFit: 'cover',
                            borderRadius: '6px',
                            border: '1px solid #86efac',
                          }}
                        />
                        <div>
                          <span style={{ display: 'block', fontSize: '0.825rem', fontWeight: 600, color: '#166534' }}>
                            Rating Screenshot Ready
                          </span>
                          <span style={{ fontSize: '0.72rem', color: '#15803d', wordBreak: 'break-all' }}>
                            {ratingUploadInfo || 'Image saved'}
                          </span>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setRatingUrl('');
                          setRatingUploadInfo(null);
                        }}
                        style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#dc2626' }}
                      >
                        <X size={18} />
                      </button>
                    </div>
                  ) : (
                    <div
                      onClick={() => ratingFileRef.current?.click()}
                      style={{
                        border: '2px dashed var(--border-subtle)',
                        borderRadius: 'var(--radius-md)',
                        padding: '1.25rem',
                        textAlign: 'center',
                        cursor: 'pointer',
                        backgroundColor: '#ffffff',
                        transition: 'border-color 0.15s ease',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'var(--rway-teal-600)')}
                      onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'var(--border-subtle)')}
                    >
                      {isUploadingRating ? (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', color: 'var(--rway-teal-800)' }}>
                          <Loader2 size={20} className="animate-spin" />
                          <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>Uploading to Cloudinary...</span>
                        </div>
                      ) : (
                        <div>
                          <UploadCloud size={24} color="var(--rway-gold-600)" style={{ margin: '0 auto 0.35rem' }} />
                          <p style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--rway-teal-950)' }}>
                            Click to upload Rating Screenshot
                          </p>
                          <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                            JPG, PNG, WebP up to 10MB (Cloudinary storage)
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={isSubmitting || isUploadingDelivered || isUploadingRating}
              className="btn btn-gold btn-lg"
              style={{ width: '100%', marginTop: '0.5rem' }}
            >
              {isSubmitting ? (
                <span>Submitting Verification...</span>
              ) : (
                <>
                  <span>Submit Review Verification</span>
                  <ArrowRight size={18} />
                </>
              )}
            </button>
          </form>
        </div>
      </main>

      <footer style={{ borderTop: '1px solid var(--border-light)', padding: '1.25rem 0', backgroundColor: '#ffffff', textAlign: 'center', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
        <div className="rway-container">
          RWAY Promotion Partners • Amazon Deal Verification System • Powered by Cloudinary
        </div>
      </footer>
    </div>
  );
}
