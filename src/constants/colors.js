// FarmEasy Seller Portal — Orange-amber theme (distinct from farmer app green)
export const COLORS = {
  // Primary brand (harvest orange)
  primary:       '#E65100',
  primaryMedium: '#F4511E',
  primaryLight:  '#FF7043',
  primaryPale:   '#FBE9E7',

  // Accent (forest green for success)
  accent:        '#1B5E20',
  accentLight:   '#43A047',
  accentPale:    '#E8F5E9',

  // Surfaces
  background:    '#FFF8F4',
  surface:       '#FFFFFF',
  surfaceRaised: '#FFF3EE',
  border:        '#FFDDD0',
  divider:       '#F5F5F5',

  // Text
  textDark:      '#1C1917',
  textBody:      '#44403C',
  textMedium:    '#78716C',
  textLight:     '#A8A29E',
  textWhite:     '#FFFFFF',

  // Status
  success:       '#43A047',
  error:         '#EF4444',
  warning:       '#F59E0B',
  info:          '#0288D1',

  // Order status colors
  pending:       '#F59E0B',
  confirmed:     '#0288D1',
  shipped:       '#7C3AED',
  delivered:     '#43A047',
  cancelled:     '#EF4444',
};

export const RADIUS = {
  xs:   4,
  sm:   8,
  md:   12,
  lg:   16,
  xl:   20,
  xxl:  24,
  full: 999,
};

// Order status → color mapping (shared by Dashboard + Orders screens)
export const STATUS_COLOR = {
  PENDING:   '#F59E0B',
  CONFIRMED: '#0288D1',
  SHIPPED:   '#7C3AED',
  DELIVERED: '#43A047',
  CANCELLED: '#EF4444',
  REFUNDED:  '#6B7280',
};

export const SHADOWS = {
  small: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
  },
  medium: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.10,
    shadowRadius: 8,
    elevation: 5,
  },
  large: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.14,
    shadowRadius: 16,
    elevation: 8,
  },
};
