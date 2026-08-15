// @vitest-environment happy-dom
import React from 'react';
import { describe, test, expect, vi, afterEach } from 'vitest';
import { render, waitFor } from '@testing-library/react';
import { SponsorSlot } from './SponsorSlot.jsx';

function mockBid(payload) {
  return vi.fn().mockResolvedValue({
    ok: true,
    json: async () => payload,
  });
}

afterEach(() => vi.unstubAllGlobals());

describe('SponsorSlot', () => {
  test('renders nothing when no publisher is configured', async () => {
    vi.stubGlobal('fetch', vi.fn());
    const { container } = render(<SponsorSlot publisherId="" />);
    expect(container.innerHTML).toBe('');
    expect(fetch).not.toHaveBeenCalled();
  });

  test('renders bid html with a Sponsored disclosure', async () => {
    vi.stubGlobal(
      'fetch',
      mockBid({
        html: '<a href="https://aep.io">AEP — enterprise agent controls</a>',
        impressionId: 'imp_1',
      })
    );
    const { findByText, findByRole } = render(<SponsorSlot publisherId="pub_1" />);
    expect(await findByText(/Sponsored/i)).toBeTruthy();
    expect(await findByRole('link')).toBeTruthy();
  });

  test('renders nothing on no-fill', async () => {
    vi.stubGlobal('fetch', mockBid({ html: null, impressionId: null }));
    const { container } = render(<SponsorSlot publisherId="pub_1" />);
    await waitFor(() => expect(container.innerHTML).toBe(''));
  });

  test('renders nothing when the bid request fails', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network')));
    const { container } = render(<SponsorSlot publisherId="pub_1" />);
    await new Promise((r) => setTimeout(r, 20));
    expect(container.innerHTML).toBe('');
  });

  test('confirms the impression after a fill', async () => {
    const fetchMock = mockBid({ html: '<span>ad</span>', impressionId: 'imp_9' });
    vi.stubGlobal('fetch', fetchMock);
    render(<SponsorSlot publisherId="pub_1" serveUrl="https://ads.example.com" />);
    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        'https://ads.example.com/api/ads/confirm?impressionId=imp_9',
        expect.anything()
      )
    );
  });
});
