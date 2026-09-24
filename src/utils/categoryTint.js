// The database ships vivid category colours because charts need the contrast.
// Badges need a quieter register, so the muted pair lives here rather than
// desaturating at source and flattening the charts.
//
// Kept out of the component file so fast refresh keeps working: a module that
// exports both a component and a plain function loses it.

const CATEGORY_TINT = {
  Thinking:          { bg: '#eef2fb', fg: '#2c4a86' },
  Communication:     { bg: '#faf3e6', fg: '#8a661a' },
  Research:          { bg: '#eef4fb', fg: '#33608f' },
  Social:            { bg: '#ecf5f1', fg: '#2f6b57' },
  'Self-management': { bg: '#f7f1ea', fg: '#7b5730' },
}

export function categoryTint(name) {
  return CATEGORY_TINT[name] ?? { bg: '#f1f5f9', fg: '#475569' }
}
