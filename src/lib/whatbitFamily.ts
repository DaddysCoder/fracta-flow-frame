export const WHATBIT_FAMILY = [
  {
    id: 'frame',
    name: 'Frame',
    status: 'this app',
    role: 'Run the caseload: episode log, function screener, triangulation, flags, handoff.',
  },
  {
    id: 'vector',
    name: 'Vector',
    status: 'step 2',
    role: 'Author assessments. Import a Vector JSON file in Settings; Frame runs it on a behaviour and stores the result here.',
  },
  {
    id: 'field',
    name: 'Field',
    status: 'step 3',
    role: 'Capture in situ. Generate a Field QR on the episode log; imported episodes land on this same behaviour.',
  },
] as const
