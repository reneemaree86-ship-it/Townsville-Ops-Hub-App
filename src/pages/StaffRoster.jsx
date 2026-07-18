import React, { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Plus, Phone, Users } from 'lucide-react';
import PageHeader from '@/components/shared/PageHeader';
import StatusBadge from '@/components/shared/StatusBadge';
import StaffModal from '@/components/staff/StaffModal';

export default function StaffRoster() {
  const { activeBusiness } = useOutletContext();
  const qc = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [editStaff, setEditStaff] = useState(null);

  const { data: staff = [], isLoading } = useQuery({
    queryKey: ['staff', activeBusiness?.id],
    queryFn: () => activeBusiness ? base44.entities.Staff.filter({ business_id: activeBusiness.id }) : [],
    enabled: !!activeBusiness?.id,
  });

  const handleSaved = () => {
    qc.invalidateQueries(['staff', activeBusiness?.id]);
    setShowModal(false);
    setEditStaff(null);
  };

  const openEdit = (member) => { setEditStaff(member); setShowModal(true); };
  const openNew = () => { setEditStaff(null); setShowModal(true); };

  return (
    <div>
      <PageHeader
        title="Staff Roster"
        description={`${staff.length} staff member${staff.length !== 1 ? 's' : ''} on file`}
        business={activeBusiness}
        actions={
          <Button size="sm" onClick={openNew}>
            <Plus className="w-3.5 h-3.5 mr-1" /> Add Staff
          </Button>
        }
      />

      {isLoading ? (
        <p className="text-xs text-muted-foreground">Loading...</p>
      ) : staff.length === 0 ? (
        <Card>
          <CardContent className="py-14 text-center">
            <Users className="w-9 h-9 text-muted-foreground mx-auto mb-3" />
            <p className="font-semibold mb-1">No staff yet</p>
            <p className="text-xs text-muted-foreground mb-4">Add your first staff member to build your roster</p>
            <Button size="sm" onClick={openNew}><Plus className="w-3.5 h-3.5 mr-1" />Add First Staff Member</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {staff.map(member => (
            <Card key={member.id} onClick={() => openEdit(member)}
              className="hover:border-primary/30 cursor-pointer transition-colors hover:shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <div className="min-w-0">
                    <p className="font-semibold text-sm truncate">{member.full_name}</p>
                    {member.role && <p className="text-xs text-muted-foreground mt-0.5">{member.role}</p>}
                  </div>
                  <StatusBadge status={member.status || 'active'} />
                </div>
                {member.phone && (
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-2">
                    <Phone className="w-3 h-3 flex-shrink-0" />
                    <span>{member.phone}</span>
                  </div>
                )}
                {member.notes && <p className="text-xs text-muted-foreground mt-2 line-clamp-2">{member.notes}</p>}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {showModal && (
        <StaffModal
          staff={editStaff}
          business={activeBusiness}
          onSaved={handleSaved}
          onClose={() => { setShowModal(false); setEditStaff(null); }}
        />
      )}
    </div>
  );
}