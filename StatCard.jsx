import React from 'react';
import { Card } from '@/components/ui/card';

export default function StatCard({ label, value, icon: Icon, color = 'text-primary', subtext }) {
  return (
    <Card className="p-4">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">{label}</p>
          <p className="text-2xl font-bold mt-1">{value}</p>
          {subtext && <p className="text-[10px] text-muted-foreground mt-1">{subtext}</p>}
        </div>
        {Icon && (
          <div className={`p-2 rounded-lg bg-muted/60 ${color}`}>
            <Icon className="w-4 h-4" />
          </div>
        )}
      </div>
    </Card>
  );
}