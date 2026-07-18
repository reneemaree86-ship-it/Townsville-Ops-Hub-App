import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Loader2, CheckCircle2, XCircle } from 'lucide-react';

export default function GoogleBusinessCallback() {
  const navigate = useNavigate();
  const [status, setStatus] = useState('processing');
  const [message, setMessage] = useState('Connecting your Google Business Profile...');

  useEffect(() => {
    const run = async () => {
      const params = new URLSearchParams(window.location.search);
      const code = params.get('code');
      const business_id = params.get('state') || '';
      const error = params.get('error');

      if (error) {
        setStatus('error');
        setMessage('Google sign-in was cancelled or denied.');
        return;
      }
      if (!code) {
        setStatus('error');
        setMessage('Missing authorization code from Google.');
        return;
      }

      try {
        const redirect_uri = `${window.location.origin}/google-business-callback`;
        const res = await base44.functions.invoke('googleBusinessOAuthExchange', { code, redirect_uri, business_id });
        if (res.data?.error) {
          setStatus('error');
          setMessage(res.data.error);
        } else {
          setStatus('success');
          setMessage(`Connected: ${res.data.account_label}`);
          setTimeout(() => navigate('/settings'), 1500);
        }
      } catch (e) {
        setStatus('error');
        setMessage(e.message || 'Connection failed.');
      }
    };
    run();
  }, [navigate]);

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-background">
      <div className="text-center space-y-3 max-w-sm px-4">
        {status === 'processing' && <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" />}
        {status === 'success' && <CheckCircle2 className="w-8 h-8 mx-auto text-emerald-500" />}
        {status === 'error' && <XCircle className="w-8 h-8 mx-auto text-destructive" />}
        <p className="text-sm text-muted-foreground">{message}</p>
        {status === 'error' && (
          <button onClick={() => navigate('/settings')} className="text-xs text-primary underline">
            Back to Business Settings
          </button>
        )}
      </div>
    </div>
  );
}