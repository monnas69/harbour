-- Couple config keys — added when partner/couples feature built
-- Centrelink rates effective 20 March 2026
-- ASFA figures as at December 2025

INSERT INTO config (key, value, label, section, last_updated, next_due) VALUES
  ('pension_base_couple',        769.30, 'Base rate — couple (each) /fn',               'pension', '2026-03-20', '2026-09-20'),
  ('pension_supplement_couple',   63.00, 'Pension supplement — couple (each) /fn',       'pension', '2026-03-20', '2026-09-20'),
  ('pension_energy_couple',       14.10, 'Energy supplement — couple (each) /fn',        'pension', '2026-03-20', '2026-09-20'),
  ('assets_lower_couple_owner', 451500,  'Assets lower threshold — couple homeowner',    'assets',  '2026-03-20', '2026-09-20'),
  ('assets_upper_couple_owner', 864250,  'Assets upper threshold — couple homeowner',    'assets',  '2026-03-20', '2026-09-20'),
  ('income_free_area_couple',     384,   'Income free area — couple (combined) /fn',     'income',  '2026-03-20', '2026-09-20'),
  ('deeming_threshold_couple',  106200,  'Deeming threshold — couple (combined)',        'deeming', '2026-03-20', '2026-09-20'),
  ('asfa_comfortable_couple',    72663,  'ASFA comfortable standard — couple /yr',       'asfa',    '2025-12-01', '2026-03-01'),
  ('asfa_modest_couple',         52085,  'ASFA modest standard — couple /yr',            'asfa',    '2025-12-01', '2026-03-01')
ON CONFLICT (key) DO NOTHING;
