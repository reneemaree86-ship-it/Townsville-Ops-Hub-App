import React from 'react';

export default function PageHeader({ title, description, actions, business }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-6">
      <div>
        <h1 className="text-xl font-bold tracking-tight">{title}</h1>
        {description && <p className="text-xs text-muted-foreground mt-1">{description}</p>}
        {business && <p className="text-[10px] text-primary font-medium mt-1">{business.name}</p>}
      </div>
      {actions && <div className="flex items-center gap-2 flex-shrink-0">{actions}</div>}
    </div>
  );
}
