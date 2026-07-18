import React, { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, Receipt, Paperclip } from 'lucide-react';
import PageHeader from '@/components/shared/PageHeader';
import ExpenseModal from '@/components/expenses/ExpenseModal';

const CATEGORY_LABELS = {
  supplies: 'Supplies',
  fuel_travel: 'Fuel / Travel',
  equipment: 'Equipment',
  wages: 'Wages',
  insurance: 'Insurance',
  marketing: 'Marketing',
  software_subscriptions: 'Software / Subscriptions',
  vehicle: 'Vehicle',
  other: 'Other',
};

export default function Expenses() {
  const { activeBusiness } = useOutletContext();
  const qc = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [editExpense, setEditExpense] = useState(null);

  const { data: expenses = [], isLoading } = useQuery({
    queryKey: ['expenses', activeBusiness?.id],
    queryFn: () => activeBusiness ? base44.entities.Expense.filter({ business_id: activeBusiness.id }, '-date') : [],
    enabled: !!activeBusiness?.id,
  });

  const total = expenses.reduce((sum, e) => sum + (e.amount || 0), 0);
  const thisMonth = expenses.filter(e => e.date && e.date.startsWith(format(new Date(), 'yyyy-MM')))
    .reduce((sum, e) => sum + (e.amount || 0), 0);

  const handleSaved = () => {
    qc.invalidateQueries(['expenses', activeBusiness?.id]);
    setShowModal(false);
    setEditExpense(null);
  };

  const openEdit = (expense) => { setEditExpense(expense); setShowModal(true); };
  const openNew = () => { setEditExpense(null); setShowModal(true); };

  return (
    <div>
      <PageHeader
        title="Expenses"
        description={`${expenses.length} expense${expenses.length !== 1 ? 's' : ''} logged`}
        business={activeBusiness}
        actions={
          <Button size="sm" onClick={openNew}>
            <Plus className="w-3.5 h-3.5 mr-1" /> Add Expense
          </Button>
        }
      />

      <div className="grid grid-cols-2 gap-3 mb-6">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Total Expenses</p>
            <p className="text-2xl font-bold mt-0.5">${total.toFixed(2)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">This Month</p>
            <p className="text-2xl font-bold mt-0.5">${thisMonth.toFixed(2)}</p>
          </CardContent>
        </Card>
      </div>

      {isLoading ? (
        <p className="text-xs text-muted-foreground">Loading...</p>
      ) : expenses.length === 0 ? (
        <Card>
          <CardContent className="py-14 text-center">
            <Receipt className="w-9 h-9 text-muted-foreground mx-auto mb-3" />
            <p className="font-semibold mb-1">No expenses yet</p>
            <p className="text-xs text-muted-foreground mb-4">Log your first expense to start tracking spending</p>
            <Button size="sm" onClick={openNew}><Plus className="w-3.5 h-3.5 mr-1" />Add First Expense</Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-2">
            <div className="space-y-1">
              {expenses.map(expense => (
                <div key={expense.id} onClick={() => openEdit(expense)}
                  className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors">
                  <div className="text-center min-w-[52px] flex-shrink-0">
                    <p className="text-[10px] text-muted-foreground uppercase">{expense.date ? format(new Date(expense.date + 'T12:00:00'), 'MMM') : ''}</p>
                    <p className="text-sm font-bold">{expense.date ? format(new Date(expense.date + 'T12:00:00'), 'd') : '-'}</p>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium truncate">{expense.description || 'Expense'}</span>
                      <Badge variant="outline" className="text-[10px]">{CATEGORY_LABELS[expense.category] || expense.category}</Badge>
                      {expense.receipt_url && <Paperclip className="w-3 h-3 text-muted-foreground" />}
                    </div>
                  </div>
                  <span className="text-sm font-semibold flex-shrink-0">${(expense.amount || 0).toFixed(2)}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {showModal && (
        <ExpenseModal
          expense={editExpense}
          business={activeBusiness}
          onSaved={handleSaved}
          onClose={() => { setShowModal(false); setEditExpense(null); }}
        />
      )}
    </div>
  );
}