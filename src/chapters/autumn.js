export const autumn = {
  kind: 'works',
  palette: { background: '#FFAF60', fog: '#FFAF60', ground: '#65401f', structure: '#503019', accent: '#e5ad54' },
  spawn: { x: -22.5, y: 2 },
  colliders: [
    { x: -16.1, y: -.5, w: 15.6, h: 1 },
    { x: -24.2, y: 1.5, w: .6, h: 4 },
    { x: 24.2, y: 1.5, w: .6, h: 4 },
    { x: -7.5, y: .55, w: 1.5, h: 1.1 },
    { x: 14, y: 12.8, w: 19.6, h: .3 },
    { x: 9.5, y: -13.8, w: 10.6, h: .3 },
  ],
  backgrounds: [],
  checkpoints: [{ x: -22.5, y: 2 }, { x: -14, y: 2 }, { x: -8, y: 2 }, { x: 14, y: 14.2 }, { x: 20.5, y: 14.2 }],
  crushers: [{ x: -5.5, y: 3.4, w: 1.3 }, { x: -3.6, y: 5.75, w: 1.3, minY: 3.4, phase: Math.PI * 1.5 }, { x: -1.7, y: 8.1, w: 1.3, minY: 5.75 }, { x: .2, y: 10.45, w: 1.3, minY: 8.1, phase: Math.PI * 1.5 }, { x: 2.1, y: 12.8, w: 1.3, minY: 10.45 }],
  key: { id: 'autumn', x: 9.5, y: -13.35 },
  returnPortalX: -23,
  exitX: 21,
}