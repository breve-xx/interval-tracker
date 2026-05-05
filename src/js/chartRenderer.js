/**
 * chartRenderer.js — Inline SVG interval chart.
 *
 * Renders a bar + line chart of the inter-occurrence interval series, with a
 * dashed regression trend line and a dotted mean reference line.  All colours
 * are read from CSS custom properties at call time so the chart is fully
 * theme-aware (light / dark switch re-renders automatically via renderChart()).
 *
 * DOM / styling dependencies only — excluded from DEC-0001 unit-test mandate.
 */

// ─── SVG namespace ─────────────────────────────────────────────────────────────

const SVG_NS = 'http://www.w3.org/2000/svg';

// ─── Layout constants ──────────────────────────────────────────────────────────

const VIEW_W = 600;
const VIEW_H = 240;
const PAD    = { top: 20, right: 24, bottom: 44, left: 56 };

// ─── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Create an SVG element in the SVG namespace with the given attributes.
 *
 * @param {string} tag
 * @param {Record<string, string|number>} attrs
 * @returns {SVGElement}
 */
function svgEl(tag, attrs = {}) {
  const el = document.createElementNS(SVG_NS, tag);
  for (const [k, v] of Object.entries(attrs)) {
    el.setAttribute(k, v);
  }
  return el;
}

/**
 * Read a CSS custom property from the document root at call time.
 *
 * @param {string} prop  e.g. '--color-trend-up'
 * @returns {string}
 */
function cssVar(prop) {
  return getComputedStyle(document.documentElement).getPropertyValue(prop).trim();
}

/**
 * Resolve the accent colour for the current trend direction.
 *
 * @param {'increasing'|'decreasing'|'stable'} trend
 * @returns {string}
 */
function accentForTrend(trend) {
  if (trend === 'increasing') return cssVar('--color-trend-up');
  if (trend === 'decreasing') return cssVar('--color-trend-down');
  return cssVar('--accent');
}

/**
 * Append a hex alpha suffix to a 6-digit hex colour string.
 * Used for bar fill opacity without requiring rgba().
 *
 * @param {string} hex   e.g. '#e67e22'
 * @param {number} alpha 0–1
 * @returns {string}
 */
function hexAlpha(hex, alpha) {
  // Convert alpha 0-1 to 0-255, then to 2-digit hex
  const a = Math.round(alpha * 255).toString(16).padStart(2, '0');
  return `${hex}${a}`;
}

// ─── Nice tick generator ───────────────────────────────────────────────────────

/**
 * Return an array of 4–5 evenly spaced "nice" tick values covering [0, max].
 *
 * @param {number} max
 * @returns {number[]}
 */
function niceTicks(max) {
  if (max <= 0) return [0];
  const rawStep = max / 4;
  const magnitude = Math.pow(10, Math.floor(Math.log10(rawStep)));
  const norm = rawStep / magnitude;
  const niceNorm = norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 5 ? 5 : 10;
  const step = niceNorm * magnitude;
  const ticks = [];
  for (let v = 0; v <= max * 1.01; v += step) {
    ticks.push(Math.round(v * 1000) / 1000);
  }
  return ticks;
}

// ─── Public API ────────────────────────────────────────────────────────────────

/**
 * Render an interval trend chart into `container`.
 *
 * @param {Element}  container  DOM element to render into (innerHTML is replaced).
 * @param {number[]} intervals  Interval values pre-converted to `unit`.
 * @param {string}   unit       'days' | 'hours' | 'minutes'
 * @param {object}   stats      Full object from computeStatistics().
 */
export function renderIntervalChart(container, intervals, unit, stats) {
  container.innerHTML = '';

  const n = intervals.length;
  if (n < 1) return;

  // ── Colour tokens ────────────────────────────────────────────────────────────

  const trend   = stats.advanced.trend;
  const accent  = accentForTrend(trend);
  const muted   = cssVar('--color-muted');
  const textCol = cssVar('--text');
  const subtle  = cssVar('--text-subtle');
  const border  = cssVar('--border');

  // ── Derived geometry ─────────────────────────────────────────────────────────

  const plotW = VIEW_W - PAD.left - PAD.right;
  const plotH = VIEW_H - PAD.top  - PAD.bottom;

  const yMax   = Math.max(...intervals) * 1.18;
  const ticks  = niceTicks(yMax);
  const yDomain = ticks[ticks.length - 1] || 1;

  const barW   = Math.max(4, Math.min(36, (plotW / n) * 0.55));
  const gap    = plotW / n;

  /** X pixel for the centre of bar i (0-indexed). */
  const xScale = (i) => PAD.left + gap * i + gap / 2;

  /** Y pixel for value v. */
  const yScale = (v) => PAD.top + plotH - (v / yDomain) * plotH;

  // ── Build SVG ────────────────────────────────────────────────────────────────

  const svg = svgEl('svg', {
    viewBox           : `0 0 ${VIEW_W} ${VIEW_H}`,
    preserveAspectRatio: 'xMidYMid meet',
    'aria-hidden'     : 'true',
    role              : 'img',
  });

  // ── Y-axis grid lines + tick labels ──────────────────────────────────────────

  for (const tick of ticks) {
    const y = yScale(tick);

    // Grid line
    svg.appendChild(svgEl('line', {
      x1           : PAD.left,
      y1           : y,
      x2           : PAD.left + plotW,
      y2           : y,
      stroke       : border,
      'stroke-width': '1',
    }));

    // Tick label
    const label = svgEl('text', {
      x          : PAD.left - 6,
      y          : y,
      'text-anchor'    : 'end',
      'dominant-baseline': 'middle',
      fill       : subtle,
      'font-size': '10',
      'font-family': 'inherit',
    });
    label.textContent = tick % 1 === 0 ? String(tick) : tick.toFixed(1);
    svg.appendChild(label);
  }

  // ── Mean reference line (dotted) ─────────────────────────────────────────────

  const meanVal  = stats.basic.mean;
  const yMean    = yScale(meanVal);

  svg.appendChild(svgEl('line', {
    x1                : PAD.left,
    y1                : yMean,
    x2                : PAD.left + plotW,
    y2                : yMean,
    stroke            : muted,
    'stroke-width'    : '1',
    'stroke-dasharray': '3 4',
  }));

  // ── X-axis baseline ───────────────────────────────────────────────────────────

  svg.appendChild(svgEl('line', {
    x1           : PAD.left,
    y1           : PAD.top + plotH,
    x2           : PAD.left + plotW,
    y2           : PAD.top + plotH,
    stroke       : border,
    'stroke-width': '1',
  }));

  // ── Bars ─────────────────────────────────────────────────────────────────────

  const barFill = accent.startsWith('#') && accent.length === 7
    ? hexAlpha(accent, 0.28)
    : accent;   // fallback if CSS var resolved to something non-hex (e.g. rgba)

  for (let i = 0; i < n; i++) {
    const cx     = xScale(i);
    const yTop   = yScale(intervals[i]);
    const barH   = PAD.top + plotH - yTop;

    svg.appendChild(svgEl('rect', {
      x             : cx - barW / 2,
      y             : yTop,
      width         : barW,
      height        : Math.max(barH, 1),
      fill          : barFill,
      rx            : '3',
      ry            : '3',
    }));
  }

  // ── Connecting polyline ───────────────────────────────────────────────────────

  const linePoints = intervals.map((v, i) => `${xScale(i)},${yScale(v)}`).join(' ');

  svg.appendChild(svgEl('polyline', {
    points        : linePoints,
    fill          : 'none',
    stroke        : accent,
    'stroke-width': '2',
    'stroke-linejoin': 'round',
    'stroke-linecap' : 'round',
  }));

  // ── Dots ─────────────────────────────────────────────────────────────────────

  for (let i = 0; i < n; i++) {
    svg.appendChild(svgEl('circle', {
      cx   : xScale(i),
      cy   : yScale(intervals[i]),
      r    : '4',
      fill : accent,
    }));
  }

  // ── Trend line (linear regression, dashed) ────────────────────────────────────

  const slope     = stats.nerd.regressionSlope;
  const intercept = stats.nerd.regressionIntercept;

  // Regression was computed over the interval indices 0…n-1.
  // Map those to screen x/y.
  const trendY0 = yScale(Math.max(0, intercept));
  const trendYn = yScale(Math.max(0, intercept + slope * (n - 1)));

  svg.appendChild(svgEl('line', {
    x1                : xScale(0),
    y1                : trendY0,
    x2                : xScale(n - 1),
    y2                : trendYn,
    stroke            : accent,
    'stroke-width'    : '1.5',
    'stroke-dasharray': '6 3',
    'stroke-linecap'  : 'round',
  }));

  // ── X-axis index labels ───────────────────────────────────────────────────────

  // Show at most 12 labels to avoid crowding; skip some when n is large.
  const labelEvery = Math.ceil(n / 12);

  for (let i = 0; i < n; i++) {
    if (i % labelEvery !== 0 && i !== n - 1) continue;

    const lbl = svgEl('text', {
      x          : xScale(i),
      y          : PAD.top + plotH + 16,
      'text-anchor'      : 'middle',
      'dominant-baseline': 'hanging',
      fill       : subtle,
      'font-size': '10',
      'font-family': 'inherit',
    });
    lbl.textContent = String(i + 1);
    svg.appendChild(lbl);
  }

  // ── Y-axis label ("interval (unit)") ─────────────────────────────────────────

  const axisLabel = svgEl('text', {
    x          : 10,
    y          : PAD.top + plotH / 2,
    'text-anchor'      : 'middle',
    'dominant-baseline': 'auto',
    fill       : subtle,
    'font-size': '10',
    'font-family': 'inherit',
    transform  : `rotate(-90, 10, ${PAD.top + plotH / 2})`,
  });
  axisLabel.textContent = unit;
  svg.appendChild(axisLabel);

  // ── X-axis label ("gap #") ────────────────────────────────────────────────────

  const xLabel = svgEl('text', {
    x          : PAD.left + plotW / 2,
    y          : VIEW_H - 4,
    'text-anchor'      : 'middle',
    'dominant-baseline': 'auto',
    fill       : subtle,
    'font-size': '10',
    'font-family': 'inherit',
  });
  xLabel.textContent = 'gap #';
  svg.appendChild(xLabel);

  container.appendChild(svg);
}
