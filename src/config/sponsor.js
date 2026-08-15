// Filled in by scripts/aep-gtm-provision.ps1 output (founder-plans).
// Disabled (empty publisherId) keeps statlab ad-free until the VoxelNetwork
// publisher is provisioned — the component renders null in that case.
export const SPONSOR = {
  serveUrl: 'https://api.hotadvert.com', // VoxelNetwork apps/web serve origin
  publisherId: '',                        // hp-provisioned publisher id
  zoneName: 'sidebar',
  vertical: 'data-tools',
  keywords: 'statistics,analytics,ap stats',
};
