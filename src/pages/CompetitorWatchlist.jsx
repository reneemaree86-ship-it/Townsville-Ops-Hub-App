import React, { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Plus, Globe, Target } from 'lucide-react';
import PageHeader from '@/components/shared/PageHeader';
import CompetitorSiteModal from '@/components/competitors/CompetitorSiteModal';

export default function CompetitorWatchlist() {
  const { activeBusiness } = useOutletContext();
  const qc = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [editCompetitor, setEditCompetitor] = useState(null);

  const { data: competitors = [], isLoading } = useQuery({
    queryKey: ['competitors', activeBusiness?.id],
    queryFn: () => activeBusiness ? base44.entities.CompetitorSite.filter({ business_id: activeBusiness.id }) : [],
    enabled: !!activeBusiness?.id,
  });

  const handleSaved = () => {
    qc.invalidateQueries(['competitors', activeBusiness?.id]);
    setShowModal(false);
    setEditCompetitor(null);
  };

  const openEdit = (competitor) => { setEditCompetitor(competitor); setShowModal(true); };
  const openNew = () => { setEditCompetitor(null); setShowModal(true); };

  return (
    <div>
      <PageHeader
        title="Competitor Watchlist"
        description={`${competitors.length} competitor${competitors.length !== 1 ? 's' : ''} tracked`}
        business={activeBusiness}
        actions={
          <Button size="sm" onClick={openNew}>
            <Plus className="w-3.5 h-3.5 mr-1" /> Add Competitor
          </Button>
        }
      />

      {isLoading ? (
        <p className="text-xs text-muted-foreground">Loading...</p>
      ) : competitors.length === 0 ? (
        <Card>
          <CardContent className="py-14 text-center">
            <Target className="w-9 h-9 text-muted-foreground mx-auto mb-3" />
            <p className="font-semibold mb-1">No competitors yet</p>
            <p className="text-xs text-muted-foreground mb-4">Add competitor businesses to keep an eye on their pricing and services</p>
            <Button size="sm" onClick={openNew}><Plus className="w-3.5 h-3.5 mr-1" />Add First Competitor</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {competitors.map(competitor => (
            <Card key={competitor.id} onClick={() => openEdit(competitor)}
              className="hover:border-primary/30 cursor-pointer transition-colors hover:shadow-sm">
              <CardContent className="p-4">
                <p className="font-semibold text-sm truncate">{competitor.business_name}</p>
                {competitor.website_url && (
                  <a href={competitor.website_url} target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()}
                    className="flex items-center gap-1.5 text-xs text-primary mt-1 truncate hover:underline">
                    <Globe className="w-3 h-3 flex-shrink-0" />
                    <span className="truncate">{competitor.website_url}</span>
                  </a>
                )}
                {competitor.notes && <p className="text-xs text-muted-foreground mt-2 line-clamp-3">{competitor.notes}</p>}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {showModal && (
        <CompetitorSiteModal
          competitor={editCompetitor}
          business={activeBusiness}
          onSaved={handleSaved}
          onClose={() => { setShowModal(false); setEditCompetitor(null); }}
        />
      )}
    </div>
  );
}