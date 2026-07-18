import React, { useState } from 'react';
import { Badge } from '@/badge';
import { Button } from '@/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/card';
import { Separator } from '@/separator';
import { Dialog, DialogContent } from '@/dialog';
import {
  MapPin, Globe, Facebook, Mail, Building2,
  Sparkles, CheckCircle2, ExternalLink, MessageCircle, CalendarCheck, ClipboardList, Eye
} from 'lucide-react';
import CleaningEnquiryForm from '@/CleaningEnquiryForm';

const SERVICES = [
  { name: 'Regular Home Cleaning', rate: '$75/hr', min: '2hr min' },
  { name: 'Detailed Refresh Clean', rate: '$85/hr', min: '2hr min' },
  { name: 'Deep / Spring Clean', rate: '$95/hr', min: '2hr min' },
  { name: 'Office & Commercial Cleaning', rate: '$98/hr', min: '2hr min' },
  { name: 'Pressure Washing', rate: '$90/hr', min: '2hr min' },
  { name: 'Pre-Sale / Rental Inspection Rescue', rate: '$92/hr', min: '2hr min' },
  { name: 'Windows & Glass (Security Screens)', rate: '$8 ea', min: null },
  { name: 'Windows & Glass (Sliding Doors)', rate: '$25 ea', min: null },
  { name: 'Oven Clean', rate: '$85', min: null },
  { name: 'Rangehood Clean', rate: '$65', min: null },
  { name: 'Fridge Internal Clean', rate: '$55', min: null },
  { name: 'Fridge/Freezer Combo', rate: '$85', min: null },
  { name: 'Airbnb / Short-Stay Reset', rate: '$75/hr', min: '2hr min' },
  { name: 'WorkCover / Support Home Help', rate: 'Quote required', min: null },
];

const SEARCH_TAGS = [
  'cleaning', 'cleaner', 'house cleaning', 'deep clean', 'office cleaning',
  'airbnb cleaning', 'windows', 'pressure washing', 'townsville cleaner',
  'bond clean', 'spring clean', 'commercial cleaning', 'residential cleaning',
];

const MANUAL_APPROVAL = [
  'Bond Cleans',
  'NDIS Clients',
  'DVA Clients',
  'Hazardous / Biohazard Cleans',
  'Hoarder / Heavy Cleans',
];

export default function ReneesCleaningProfile() {
  const [dialogMode, setDialogMode] = useState(null); // 'book' | 'quote' | null

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-4xl mx-auto">

      {/* Booking / Quote Dialog */}
      <Dialog open={!!dialogMode} onOpenChange={open => !open && setDialogMode(null)}>
        <DialogContent className="max-w-md w-full p-5">
          {dialogMode && (
            <CleaningEnquiryForm
              mode={dialogMode}
              onClose={() => setDialogMode(null)}
              onSuccess={() => {
                setTimeout(() => setDialogMode(null), 3000);
              }}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-start gap-4">
        <div className="w-16 h-16 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
          <Sparkles className="w-8 h-8 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <h1 className="text-xl font-bold text-foreground">Renee's Cleaning Services</h1>
            <Badge className="bg-primary text-primary-foreground text-[10px] px-2 py-0.5">⭐ Featured</Badge>
            <Badge variant="outline" className="text-[10px] px-2 py-0.5 text-emerald-600 border-emerald-300">Active</Badge>
          </div>
          <p className="text-sm text-muted-foreground mb-2">Cleaning Services · Townsville, QLD</p>
          <p className="text-sm text-foreground leading-relaxed">
            Renee's Cleaning Services provides reliable, detailed residential and commercial cleaning across Townsville.
            Trusted by homeowners, landlords, businesses, and property managers for over-and-above results every time.
          </p>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
        <Button
          className="flex items-center gap-1.5 text-xs"
          onClick={() => setDialogMode('book')}
        >
          <CalendarCheck className="w-3.5 h-3.5" />
          Book a Clean
        </Button>
        <Button
          variant="outline"
          className="flex items-center gap-1.5 text-xs"
          onClick={() => setDialogMode('quote')}
        >
          <ClipboardList className="w-3.5 h-3.5" />
          Get a Quote
        </Button>
        <Button
          variant="outline"
          className="flex items-center gap-1.5 text-xs"
          onClick={() => {
            document.getElementById('services-section')?.scrollIntoView({ behavior: 'smooth' });
          }}
        >
          <Eye className="w-3.5 h-3.5" />
          View Services
        </Button>
        <Button
          variant="outline"
          className="flex items-center gap-1.5 text-xs"
          onClick={() => window.open('https://www.reneescleaningservicestsv.com', '_blank')}
        >
          <Globe className="w-3.5 h-3.5" />
          Visit Website
        </Button>
        <Button
          variant="outline"
          className="flex items-center gap-1.5 text-xs"
          onClick={() => window.open('https://www.facebook.com/profile.php?id=61576372084664', '_blank')}
        >
          <MessageCircle className="w-3.5 h-3.5" />
          Message on Facebook
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

        {/* Business Details */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Building2 className="w-4 h-4 text-primary" />
              Business Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2.5 text-sm">
            <div className="flex items-start gap-2">
              <MapPin className="w-3.5 h-3.5 text-muted-foreground mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-foreground font-medium">Townsville, Queensland</p>
                <p className="text-xs text-muted-foreground">Townsville & surrounding suburbs</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Mail className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
              <a href="mailto:reneescleaningservices.tsv@gmail.com" className="text-primary hover:underline text-xs truncate">
                reneescleaningservices.tsv@gmail.com
              </a>
            </div>
            <div className="flex items-center gap-2">
              <Globe className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
              <a href="https://www.reneescleaningservicestsv.com" target="_blank" rel="noreferrer" className="text-primary hover:underline text-xs">
                reneescleaningservicestsv.com <ExternalLink className="inline w-2.5 h-2.5" />
              </a>
            </div>
            <div className="flex items-center gap-2">
              <Facebook className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
              <a href="https://www.facebook.com/profile.php?id=61576372084664" target="_blank" rel="noreferrer" className="text-primary hover:underline text-xs">
                Facebook Page <ExternalLink className="inline w-2.5 h-2.5" />
              </a>
            </div>
            <Separator />
            <div className="text-xs text-muted-foreground">
              <span className="font-medium text-foreground">ABN:</span> 35 572 084 098
            </div>
            <div className="text-xs text-muted-foreground">
              <span className="font-medium text-foreground">Category:</span> Cleaning Services
            </div>
            <div className="text-xs text-muted-foreground">
              <span className="font-medium text-foreground">Travel:</span> First 10km free, then $1/km
            </div>
          </CardContent>
        </Card>

        {/* Manual Approval Required */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-primary" />
              Manual Approval Required
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1.5">
            <p className="text-xs text-muted-foreground mb-2">The following service types require Renee's personal approval before booking:</p>
            {MANUAL_APPROVAL.map(item => (
              <div key={item} className="flex items-center gap-2 text-xs text-foreground">
                <div className="w-1.5 h-1.5 rounded-full bg-amber-500 flex-shrink-0" />
                {item}
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Services */}
      <Card id="services-section">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary" />
            Services & Pricing
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {SERVICES.map(svc => (
              <div key={svc.name} className="flex items-center justify-between rounded-lg border bg-muted/30 px-3 py-2">
                <div>
                  <p className="text-xs font-medium text-foreground">{svc.name}</p>
                  {svc.min && <p className="text-[10px] text-muted-foreground">{svc.min}</p>}
                </div>
                <Badge variant="outline" className="text-[10px] font-semibold flex-shrink-0 ml-2">{svc.rate}</Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Search Tags */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">Search Tags</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-1.5">
            {SEARCH_TAGS.map(tag => (
              <Badge key={tag} variant="secondary" className="text-[10px]">{tag}</Badge>
            ))}
          </div>
          <p className="text-[10px] text-muted-foreground mt-2">
            This listing appears first for all cleaning-related searches within the Ops Hub.
          </p>
        </CardContent>
      </Card>

    </div>
  );
                }
