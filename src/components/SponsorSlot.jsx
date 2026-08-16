import { useEffect, useState } from 'react';
import { SPONSOR } from '../config/sponsor.js';

const BID_TIMEOUT_MS = 2000;

// Direct consumer of VoxelNetwork's public bid endpoint (same wire contract
// as VoxelConversion's ad_slot fill). Any failure or no-fill stays invisible.
export function SponsorSlot({
  publisherId = SPONSOR.publisherId,
  serveUrl = SPONSOR.serveUrl,
  zoneName = SPONSOR.zoneName,
  vertical = SPONSOR.vertical,
  keywords = SPONSOR.keywords,
}) {
  const [adHtml, setAdHtml] = useState(null);

  useEffect(() => {
    if (!publisherId || !serveUrl) return;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), BID_TIMEOUT_MS);

    const base = serveUrl.replace(/\/$/, '');
    const bidUrl = new URL(`${base}/api/ads/bid`);
    bidUrl.searchParams.set('publisherId', publisherId);
    bidUrl.searchParams.set('zoneName', zoneName);
    if (vertical) bidUrl.searchParams.set('vertical', vertical);
    if (keywords) bidUrl.searchParams.set('keywords', keywords);

    fetch(bidUrl.toString(), { signal: controller.signal, headers: { Accept: 'application/json' } })
      .then((res) => (res.ok ? res.json() : null))
      .then((bid) => {
        clearTimeout(timeout);
        if (!bid || !bid.html) return;
        setAdHtml(bid.html);
        if (bid.impressionId) {
          const confirmUrl = new URL(`${base}/api/ads/confirm`);
          confirmUrl.searchParams.set('impressionId', bid.impressionId);
          fetch(confirmUrl.toString(), { method: 'POST', keepalive: true }).catch(() => {});
        }
      })
      .catch(() => {});

    return () => {
      clearTimeout(timeout);
      controller.abort();
    };
  }, [publisherId, serveUrl, zoneName, vertical, keywords]);

  if (!adHtml) return null;

  return (
    <div style={{ marginTop: 12, padding: '8px 10px', borderTop: '1px solid #30363d', fontSize: 12 }}>
      <div style={{ fontSize: 10, letterSpacing: 1, opacity: 0.55, marginBottom: 4 }}>SPONSORED</div>
      <div dangerouslySetInnerHTML={{ __html: adHtml }} />
    </div>
  );
}
