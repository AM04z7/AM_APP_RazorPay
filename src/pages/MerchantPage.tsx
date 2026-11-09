import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useRetainOps } from '../context/RetainOpsContext';
import { MerchantBriefContent } from '../components/brief/MerchantBriefDrawer';

export const MerchantPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { merchants } = useRetainOps();

  const merchant = merchants.find(
    (m) => m.merchant_id.toLowerCase() === (id || '').toLowerCase()
  );

  if (!merchant) {
    return (
      <div className="rounded-panel bg-surface border border-hairline p-8 text-center space-y-3">
        <div className="font-mono text-sm text-ink-400">404 · MERCHANT NOT FOUND</div>
        <p className="text-sm text-ink-600">
          No merchant with ID &ldquo;{id}&rdquo; exists in the November 2026 roster.
        </p>
        <button
          type="button"
          onClick={() => navigate('/queue')}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-chip bg-rzp-blue text-white text-xs font-semibold"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Outreach Queue</span>
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-ink-600 hover:text-ink-900"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back</span>
        </button>
        <span className="font-mono text-xs text-ink-400">
          Deep-link route · /merchant/{merchant.merchant_id}
        </span>
      </div>

      <div className="rounded-panel border border-hairline bg-surface shadow-sm overflow-hidden">
        <MerchantBriefContent merchant={merchant} isFullPage />
      </div>
    </div>
  );
};
