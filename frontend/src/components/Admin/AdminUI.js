import React from 'react';

export function AdminPageHeader({ eyebrow, title, description, children }) {
  return (
    <header className="page-header admin-page-header">
      <div className="admin-heading-copy">
        <span className="admin-eyebrow">{eyebrow}</span>
        <h1 className="admin-page-title">{title}</h1>
        <p className="admin-page-description">{description}</p>
      </div>
      {children && <div className="header-actions">{children}</div>}
    </header>
  );
}

export function AdminMetricCard({ icon: Icon, label, value, detail, tone = 'blue' }) {
  return (
    <div className={`stat-card admin-metric admin-metric--${tone}`}>
      <div className="stat-content">
        <h3>{label}</h3>
        <div className="stat-number">{value}</div>
        {detail && <p className="admin-metric-detail">{detail}</p>}
      </div>
      <span className="stat-icon"><Icon size={22} strokeWidth={1.7} aria-hidden="true" /></span>
    </div>
  );
}

export function AdminEmptyState({ icon: Icon, title, description }) {
  return (
    <div className="empty-state admin-empty-state">
      <span className="admin-empty-icon"><Icon size={28} strokeWidth={1.5} aria-hidden="true" /></span>
      <h3>{title}</h3>
      <p>{description}</p>
    </div>
  );
}
