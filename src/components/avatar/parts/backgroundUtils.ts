export function getBackgroundFill(bg: string): string {
  switch (bg) {
    case 'retro_grid':
      return '#0f051d';
    case 'cyber_neon':
      return 'url(#cyber-bg)';
    case 'warm_amber':
      return 'url(#warm-bg)';
    case 'cosmic_purple':
      return 'url(#cosmic-bg)';
    case 'midnight_gradient':
      return 'url(#midnight-bg)';
    case 'emerald_matrix':
      return 'url(#emerald-bg)';
    case 'transparent':
      return 'transparent';
    case 'arcade_dark':
    default:
      return '#0b0f19';
  }
}
