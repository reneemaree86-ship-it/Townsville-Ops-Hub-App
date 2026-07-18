import React from 'react';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

// One task per line — converted to/from a string array.
export default function TaskListInput({ label, value = [], onChange, placeholder }) {
  return (
    <div>
      <Label className="text-xs">{label}</Label>
      <Textarea
        className="text-xs mt-1 min-h-[90px]"
        value={(value || []).join('\n')}
        onChange={e => onChange(e.target.value.split('\n').filter(l => l.trim() !== ''))}
        placeholder={placeholder || 'One item per line...'}
      />
    </div>
  );
}