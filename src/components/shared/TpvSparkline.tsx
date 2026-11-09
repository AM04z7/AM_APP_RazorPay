import React from 'react';
import type { Merchant } from '../../types/merchant';
import { formatSignedPct } from '../../lib/format';

interface TpvSparklineProps {
  merchant: Merchant;
  variant?: 'inline' | 'card';
  className?: string;
}

export const TpvSparkline: React.FC<TpvSparklineProps> = ({
  merchant,
  variant = 'inline',
  className = '',
}) => {
  const points = [
    merchant.tpv_m1_inr_lakh,
    merchant.tpv_m2_inr_lakh,
    merchant.tpv_m3_inr_lakh,
    merchant.tpv_m4_inr_lakh,
    merchant.tpv_m5_inr_lakh,
    merchant.tpv_m6_inr_lakh,
  ];

  const minVal = Math.min(...points);
  const maxVal = Math.max(...points);
  const range = Math.max(0.4, maxVal - minVal);

  if (variant === 'inline') {
    const w = 64;
    const h = 20;
    const padX = 3;
    const padY = 3;

    const coords = points.map((v, i) => {
      const x = padX + (i / 5) * (w - padX * 2);
      const y = h - padY - ((v - minVal) / range) * (h - padY * 2);
      return { x, y, v };
    });

    const solidPath = coords
      .slice(0, 5)
      .map((pt, idx) => `${idx === 0 ? 'M' : 'L'}${pt.x.toFixed(1)},${pt.y.toFixed(1)}`)
      .join(' ');

    const lastSeg = `M${coords[4].x.toFixed(1)},${coords[4].y.toFixed(1)} L${coords[5].x.toFixed(1)},${coords[5].y.toFixed(1)}`;

    const strokeColor =
      merchant.Cohort_Category === 'True Churn'
        ? '#43506B'
        : merchant.Cohort_Category === 'Fast Growers' || merchant.Cohort_Category === 'Seasonal V-Rebound'
        ? '#2F9E44'
        : '#8A94A8';

    return (
      <svg
        width={w}
        height={h}
        viewBox={`0 0 ${w} ${h}`}
        className={`overflow-visible shrink-0 ${className}`}
        aria-label={`6-month TPV trajectory from ₹${points[0]}L to ₹${points[5]}L`}
      >
        <path
          d={solidPath}
          fill="none"
          stroke={strokeColor}
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d={lastSeg}
          fill="none"
          stroke={strokeColor}
          strokeWidth="1.6"
          strokeDasharray="2 2"
          strokeLinecap="round"
        />
        <circle
          cx={coords[5].x}
          cy={coords[5].y}
          r="2"
          fill={strokeColor}
        />
      </svg>
    );
  }

  // Card variant (180x60 annotated for Cleared Accounts & Brief Clearance Card)
  const w = 184;
  const h = 62;
  const padX = 10;
  const padTop = 16;
  const padBottom = 12;
  const innerH = h - padTop - padBottom;

  const coords = points.map((v, i) => {
    const x = padX + (i / 5) * (w - padX * 2);
    const y = padTop + innerH - ((v - minVal) / range) * innerH;
    return { x, y, v };
  });

  const isSeasonal = merchant.Cohort_Category === 'Seasonal V-Rebound';
  const isGrower = merchant.Cohort_Category === 'Fast Growers';
  const isFlatline = merchant.Cohort_Category === 'Low-Volume Flatline';

  const fullPath = coords
    .map((pt, idx) => `${idx === 0 ? 'M' : 'L'}${pt.x.toFixed(1)},${pt.y.toFixed(1)}`)
    .join(' ');

  // For seasonal, split path at m4 (index 3) so rebound m4->m5->m6 is coloured --ok (#2F9E44)
  const preTroughPath = coords
    .slice(0, 4)
    .map((pt, idx) => `${idx === 0 ? 'M' : 'L'}${pt.x.toFixed(1)},${pt.y.toFixed(1)}`)
    .join(' ');

  const postTroughPath = coords
    .slice(3)
    .map((pt, idx) => `${idx === 0 ? 'M' : 'L'}${pt.x.toFixed(1)},${pt.y.toFixed(1)}`)
    .join(' ');

  const avgY =
    padTop +
    innerH -
    ((points.reduce((a, b) => a + b, 0) / 6 - minVal) / range) * innerH;

  return (
    <svg
      width={w}
      height={h}
      viewBox={`0 0 ${w} ${h}`}
      className={`overflow-visible ${className}`}
    >
      {/* Flatline tolerance band */}
      {isFlatline && (
        <g>
          <rect
            x={padX}
            y={Math.max(padTop - 2, avgY - 8)}
            width={w - padX * 2}
            height={16}
            rx={3}
            fill="rgba(138, 148, 168, 0.14)"
          />
          <line
            x1={padX}
            y1={avgY}
            x2={w - padX}
            y2={avgY}
            stroke="#8A94A8"
            strokeWidth="1"
            strokeDasharray="2 2"
          />
        </g>
      )}

      {isSeasonal ? (
        <>
          <path
            d={preTroughPath}
            fill="none"
            stroke="#8A94A8"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d={postTroughPath}
            fill="none"
            stroke="#2F9E44"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {/* Trough marker at m4 (index 3) */}
          <circle cx={coords[3].x} cy={coords[3].y} r="2.8" fill="#8A94A8" />
          <text
            x={coords[3].x - 6}
            y={Math.min(h - 1, coords[3].y + 10)}
            fontSize="9.5"
            fontFamily="JetBrains Mono, monospace"
            fill="#43506B"
            textAnchor="middle"
          >
            {formatSignedPct(merchant.v_m3_m4_pct, 0)}
          </text>
          {/* Rebound marker at m6 (index 5) */}
          <circle cx={coords[5].x} cy={coords[5].y} r="3" fill="#2F9E44" />
          <text
            x={coords[5].x - 4}
            y={Math.max(10, coords[5].y - 6)}
            fontSize="9.5"
            fontWeight="600"
            fontFamily="JetBrains Mono, monospace"
            fill="#2F9E44"
            textAnchor="end"
          >
            {formatSignedPct(merchant.v_m5_m6_pct, 1)}
          </text>
        </>
      ) : (
        <>
          <path
            d={fullPath}
            fill="none"
            stroke={isGrower ? '#2F9E44' : '#43506B'}
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {coords.map((pt, idx) => (
            <circle
              key={idx}
              cx={pt.x}
              cy={pt.y}
              r={idx === 5 ? 2.8 : 1.5}
              fill={isGrower ? '#2F9E44' : '#43506B'}
            />
          ))}
          {isGrower && (
            <text
              x={coords[5].x}
              y={Math.max(10, coords[5].y - 6)}
              fontSize="9.5"
              fontWeight="600"
              fontFamily="JetBrains Mono, monospace"
              fill="#2F9E44"
              textAnchor="end"
            >
              {formatSignedPct(merchant.c6_pct, 0)}
            </text>
          )}
          {isFlatline && (
            <text
              x={w - padX}
              y={11}
              fontSize="9.5"
              fontFamily="JetBrains Mono, monospace"
              fill="#43506B"
              textAnchor="end"
            >
              ±₹0.5L · steady ₹{merchant.tpv_m6_inr_lakh.toFixed(1)}L/mo
            </text>
          )}
        </>
      )}
    </svg>
  );
};
