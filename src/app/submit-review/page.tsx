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
  AlertCircle,
  Loader2,
  X,
  Link2,
  FileCheck,
} from 'lucide-react';

export default function SubmitReviewPage() {
  // Submission Mode: 'review' | 'rating'
  const [submissionType, setSubmissionType] = useState<'review' | 'rating'>('review');

  // Common Fields
  const [orderId, setOrderId] = useState('');
  const [customerName, setCustomerName] = useState('');

  // Mode 1: By Review Fields
  const [reviewLink, setReviewLink] = useState('');
  const [reviewUrl, setReviewUrl] = useState('');
  const [isUploadingReview, setIsUploadingReview] = useState(false);
  const [reviewUploadInfo, setReviewUploadInfo] = useState<string | null>(null);
  const [showReviewUrlInput, setShowReviewUrlInput] = useState(false);
  const reviewFileRef = useRef<HTMLInputElement>(null);

  // Mode 2: By Rating Fields
  const [ratingUrl, setRatingUrl] = useState('');
  const [isUploadingRating, setIsUploadingRating] = useState(false);
  const [ratingUploadInfo, setRatingUploadInfo] = useState<string | null>(null);
  const [showRatingUrlInput, setShowRatingUrlInput] = useState(false);
  const ratingFileRef = useRef<HTMLInputElement>(null);

  // Delivered Screenshot Fields (Required for both modes)
  const [deliveredUrl, setDeliveredUrl] = useState('');
  const [isUploadingDelivered, setIsUploadingDelivered] = useState(false);
  const [deliveredUploadInfo, setDeliveredUploadInfo] = useState<string | null>(null);
  const [showDeliveredUrlInput, setShowDeliveredUrlInput] = useState(false);
  const deliveredFileRef = useRef<HTMLInputElement>(null);

  // Form submission state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string; matched?: boolean } | null>(null);

  // Upload handler for Cloudinary or fallback storage
  const handleFileUpload = async (
    file: File,
    type: 'delivered' | 'review' | 'rating'
  ) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('folder', 'rway_reviews');

    if (type === 'delivered') {
      setIsUploadingDelivered(true);
      setDeliveredUploadInfo(null);
    } else if (type === 'review') {
      setIsUploadingReview(true);
      setReviewUploadInfo(null);
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

      const infoText = data.isCloudinary ? 'Uploaded to Cloudinary' : 'Uploaded (Local storage)';

      if (type === 'delivered') {
        setDeliveredUrl(data.url);
        setDeliveredUploadInfo(infoText);
      } else if (type === 'review') {
        setReviewUrl(data.url);
        setReviewUploadInfo(infoText);
      } else {
        setRatingUrl(data.url);
        setRatingUploadInfo(infoText);
      }
    } catch (err: any) {
      alert(`Upload error: ${err.message}`);
    } finally {
      if (type === 'delivered') setIsUploadingDelivered(false);
      else if (type === 'review') setIsUploadingReview(false);
      else setIsUploadingRating(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orderId.trim()) {
      alert('Please enter your Amazon Order ID');
      return;
    }

    if (submissionType === 'review') {
      if (!reviewLink.trim()) {
        alert('Please enter your Amazon Review Link');
        return;
      }
      if (!deliveredUrl.trim()) {
        alert('Please upload your Delivered Screenshot');
        return;
      }
      if (!reviewUrl.trim()) {
        alert('Please upload your Review Screenshot');
        return;
      }
    } else {
      if (!deliveredUrl.trim()) {
        alert('Please upload your Delivered Screenshot');
        return;
      }
      if (!ratingUrl.trim()) {
        alert('Please upload your Rating Screenshot');
        return;
      }
    }

    setIsSubmitting(true);
    setResult(null);

    try {
      const payload: any = {
        orderId: orderId.trim(),
        customerName: customerName.trim() || undefined,
        submissionType,
        deliveredScreenshotUrl: deliveredUrl.trim() || undefined,
        source: submissionType === 'review' ? 'PORTAL_REVIEW' : 'PORTAL_RATING',
      };

      payload.rating = 5;
      if (submissionType === 'review') {
        payload.reviewLink = reviewLink.trim();
        payload.reviewScreenshotUrl = reviewUrl.trim();
      } else {
        payload.ratingScreenshotUrl = ratingUrl.trim();
      }

      const res = await fetch('/api/reviews/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to submit verification');
      }

      setResult({
        success: true,
        message: data.matched
          ? `Thank you! Your Amazon Order (${orderId.trim()}) has been verified and marked as Review Submitted!`
          : `Submission details received for Order ${orderId.trim()}. Our campaign team will verify your submission.`,
        matched: data.matched,
      });

      // Clear fields
      setOrderId('');
      setCustomerName('');
      setReviewLink('');
      setDeliveredUrl('');
      setReviewUrl('');
      setRatingUrl('');
      setDeliveredUploadInfo(null);
      setReviewUploadInfo(null);
      setRatingUploadInfo(null);
    } catch (err: any) {
      setResult({
        success: false,
        message: err.message || 'Error submitting details. Please check your Order ID.',
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
      <header className="rway-navbar" style={{ padding: '0.85rem 0' }}>
        <div
          className="rway-container"
          style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 1.5rem' }}
        >
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
            maxWidth: '640px',
            width: '100%',
            padding: '2.5rem 2rem',
            borderTop: '5px solid var(--rway-gold-500)',
          }}
        >
          <div style={{ textAlign: 'center', marginBottom: '1.75rem' }}>
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
            <h1 style={{ fontSize: '1.75rem', color: 'var(--rway-teal-950)', marginBottom: '0.4rem' }}>
              Submit Order Verification
            </h1>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
              Choose your verification method below and upload required proofs.
            </p>
          </div>

          {/* Mode Switcher Tabs */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '0.5rem',
              padding: '0.35rem',
              backgroundColor: '#f1f5f9',
              borderRadius: 'var(--radius-lg)',
              marginBottom: '1.75rem',
            }}
          >
            <button
              type="button"
              onClick={() => {
                setSubmissionType('review');
                setResult(null);
              }}
              style={{
                padding: '0.75rem 1rem',
                borderRadius: 'var(--radius-md)',
                border: submissionType === 'review' ? '1px solid #cbd5e1' : '1px solid transparent',
                backgroundColor: submissionType === 'review' ? '#ffffff' : 'transparent',
                color: submissionType === 'review' ? 'var(--rway-teal-950)' : 'var(--text-secondary)',
                boxShadow: submissionType === 'review' ? 'var(--shadow-sm)' : 'none',
                fontWeight: 700,
                fontSize: '0.925rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                transition: 'all 0.15s ease',
              }}
            >
              <FileCheck size={18} color={submissionType === 'review' ? 'var(--rway-gold-600)' : 'currentColor'} />
              <span>Option 1: By Review</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setSubmissionType('rating');
                setResult(null);
              }}
              style={{
                padding: '0.75rem 1rem',
                borderRadius: 'var(--radius-md)',
                border: submissionType === 'rating' ? '1px solid #cbd5e1' : '1px solid transparent',
                backgroundColor: submissionType === 'rating' ? '#ffffff' : 'transparent',
                color: submissionType === 'rating' ? 'var(--rway-teal-950)' : 'var(--text-secondary)',
                boxShadow: submissionType === 'rating' ? 'var(--shadow-sm)' : 'none',
                fontWeight: 700,
                fontSize: '0.925rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                transition: 'all 0.15s ease',
              }}
            >
              <Star size={18} color={submissionType === 'rating' ? '#eab308' : 'currentColor'} />
              <span>Option 2: By Rating</span>
            </button>
          </div>

          {/* Submission Result Notification */}
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

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.35rem' }}>
            {/* 1. Amazon Order ID */}
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
                Format: 17 digits with dashes (xxx-xxxxxxx-xxxxxxx) from your Amazon orders page.
              </span>
            </div>

            {/* 2. Customer Name */}
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
                Your Name / WhatsApp Name *
              </label>
              <input
                type="text"
                required
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="e.g. Vicky Sharma"
                className="rway-input"
              />
            </div>

            {/* 3. MODE-SPECIFIC: Review Link (Only in 'By Review' Mode) */}
            {submissionType === 'review' && (
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
                  Amazon Review Link *
                </label>
                <input
                  type="url"
                  required
                  value={reviewLink}
                  onChange={(e) => setReviewLink(e.target.value)}
                  placeholder="https://www.amazon.in/gp/customer-reviews/R..."
                  className="rway-input"
                  style={{ fontSize: '0.875rem' }}
                />
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px', display: 'block' }}>
                  Click "Share" on your published Amazon review to copy and paste the public link.
                </span>
              </div>
            )}


            {/* 5. Delivered Screenshot Proof (Required for Both Modes) */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                <label
                  style={{
                    fontSize: '0.85rem',
                    fontWeight: 700,
                    color: 'var(--rway-teal-950)',
                  }}
                >
                  Delivered Screenshot Proof *
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
                            Shows your delivered package status on Amazon
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* 6. MODE-SPECIFIC: Review Screenshot (In 'By Review' Mode) */}
            {submissionType === 'review' && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                  <label
                    style={{
                      fontSize: '0.85rem',
                      fontWeight: 700,
                      color: 'var(--rway-teal-950)',
                    }}
                  >
                    Review Screenshot Proof *
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowReviewUrlInput(!showReviewUrlInput)}
                    style={{ border: 'none', background: 'none', color: 'var(--rway-teal-700)', fontSize: '0.75rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '3px' }}
                  >
                    <Link2 size={12} />
                    <span>{showReviewUrlInput ? 'Switch to File Upload' : 'Paste Direct URL'}</span>
                  </button>
                </div>

                {showReviewUrlInput ? (
                  <input
                    type="url"
                    value={reviewUrl}
                    onChange={(e) => setReviewUrl(e.target.value)}
                    placeholder="https://res.cloudinary.com/... or image URL"
                    className="rway-input"
                  />
                ) : (
                  <div>
                    <input
                      type="file"
                      ref={reviewFileRef}
                      accept="image/*"
                      style={{ display: 'none' }}
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          handleFileUpload(e.target.files[0], 'review');
                        }
                      }}
                    />

                    {reviewUrl ? (
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
                          <img
                            src={reviewUrl}
                            alt="Review preview"
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
                              Review Screenshot Ready
                            </span>
                            <span style={{ fontSize: '0.72rem', color: '#15803d', wordBreak: 'break-all' }}>
                              {reviewUploadInfo || 'Image saved'}
                            </span>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setReviewUrl('');
                            setReviewUploadInfo(null);
                          }}
                          style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#dc2626' }}
                        >
                          <X size={18} />
                        </button>
                      </div>
                    ) : (
                      <div
                        onClick={() => reviewFileRef.current?.click()}
                        style={{
                          border: '2px dashed var(--border-subtle)',
                          borderRadius: 'var(--radius-md)',
                          padding: '1.25rem',
                          textAlign: 'center',
                          cursor: 'pointer',
                          backgroundColor: '#ffffff',
                          transition: 'border-color 0.15s ease',
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'var(--rway-gold-600)')}
                        onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'var(--border-subtle)')}
                      >
                        {isUploadingReview ? (
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', color: 'var(--rway-teal-800)' }}>
                            <Loader2 size={20} className="animate-spin" />
                            <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>Uploading Review Screenshot...</span>
                          </div>
                        ) : (
                          <div>
                            <UploadCloud size={24} color="var(--rway-gold-600)" style={{ margin: '0 auto 0.35rem' }} />
                            <p style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--rway-teal-950)' }}>
                              Click to upload Amazon Review Screenshot
                            </p>
                            <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                              Shows your written Amazon review with title and text
                            </span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* 7. MODE-SPECIFIC: Rating Screenshot (In 'By Rating' Mode) */}
            {submissionType === 'rating' && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                  <label
                    style={{
                      fontSize: '0.85rem',
                      fontWeight: 700,
                      color: 'var(--rway-teal-950)',
                    }}
                  >
                    Rating Screenshot Proof *
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
                        onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'var(--rway-gold-600)')}
                        onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'var(--border-subtle)')}
                      >
                        {isUploadingRating ? (
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', color: 'var(--rway-teal-800)' }}>
                            <Loader2 size={20} className="animate-spin" />
                            <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>Uploading Rating Screenshot...</span>
                          </div>
                        ) : (
                          <div>
                            <UploadCloud size={24} color="var(--rway-gold-600)" style={{ margin: '0 auto 0.35rem' }} />
                            <p style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--rway-teal-950)' }}>
                              Click to upload Rating Screenshot
                            </p>
                            <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                              Shows your 5-star rating submitted on Amazon
                            </span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting || isUploadingDelivered || isUploadingReview || isUploadingRating}
              className="btn btn-gold btn-lg"
              style={{ width: '100%', marginTop: '0.5rem' }}
            >
              {isSubmitting ? (
                <span>Submitting Verification...</span>
              ) : (
                <>
                  <span>{submissionType === 'review' ? 'Submit Amazon Review' : 'Submit Amazon Rating'}</span>
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
