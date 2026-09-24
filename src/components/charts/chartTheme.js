// Shared chart styling, so four chart types read as one family rather than
// four libraries. Axes are quiet, the grid is a hairline, and colour is
// carried by the data rather than sprayed across the frame.

export const LEVEL_TICK = ['', 'E', 'D', 'P', 'A']
export const LEVEL_NAME = ['', 'Emerging', 'Developing', 'Proficient', 'Advanced']

export const GRID = '#eef1f5'

export const AXIS = { fontSize: 11, fill: '#64748b' }

export const TOOLTIP = {
  contentStyle: {
    borderRadius: 10,
    border: '1px solid #e5e7eb',
    boxShadow: '0 2px 6px -1px rgb(10 30 67 / 0.06)',
    fontSize: 13,
    padding: '6px 10px',
  },
  labelStyle: { color: '#0a1e43', fontWeight: 500, marginBottom: 2 },
}

// Muted, distinguishable, and none of them fighting the navy UI chrome.
export const SERIES = ['#123a8a', '#a67c1f', '#2f6b57', '#7b5730', '#33608f']
