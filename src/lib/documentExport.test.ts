import { describe, expect, it } from 'vitest'
import { renderDocumentationExport, resolveStrategyLookupDomain } from './documentExport'
import type {
  Behaviour,
  FunctionHypothesis,
  MatchedStrategy,
  Participant,
} from './types'

function makeHypothesis(overrides: Partial<FunctionHypothesis> = {}): FunctionHypothesis {
  return {
    id: 'h1',
    behaviourId: 'b1',
    computedAt: '2026-01-01T00:00:00.000Z',
    screenerFunctionResult: ['attention'],
    episodePatternResult: 'attention',
    episodeCount: 5,
    distinctDayCount: 3,
    agreementStatus: 'match',
    confidenceLevel: 'moderate',
    screenerDisagreement: false,
    contributingEpisodeIds: [],
    contributingScreenerIds: [],
    ...overrides,
  }
}

describe('resolveStrategyLookupDomain', () => {
  it('returns null when there is no hypothesis yet', () => {
    expect(resolveStrategyLookupDomain(null)).toBeNull()
  })

  it('prefers the observed episode pattern over the screener result', () => {
    const h = makeHypothesis({ episodePatternResult: 'escape', screenerFunctionResult: ['attention'] })
    expect(resolveStrategyLookupDomain(h)).toBe('escape')
  })

  it('falls back to a single unambiguous screener domain when there is no episode pattern', () => {
    const h = makeHypothesis({ episodePatternResult: null, screenerFunctionResult: ['tangible'] })
    expect(resolveStrategyLookupDomain(h)).toBe('tangible')
  })

  it('returns null rather than guessing when the screener result is tied and there is no episode pattern', () => {
    const h = makeHypothesis({ episodePatternResult: null, screenerFunctionResult: ['attention', 'escape'] })
    expect(resolveStrategyLookupDomain(h)).toBeNull()
  })
})

describe('renderDocumentationExport — staff_training_summary strategy seam', () => {
  const behaviour: Behaviour = {
    id: 'b1',
    participantId: 'p1',
    name: 'Exit-seeking',
    operationalDefinition: 'Leaves designated area without permission.',
    status: 'active',
    createdBy: 'tester',
    createdAt: '2026-01-01T00:00:00.000Z',
  }
  const participant: Participant = {
    id: 'p1',
    identifyingDetails: 'Test participant',
    consentAttested: true,
    consentAttestedAt: '2026-01-01T00:00:00.000Z',
    consentAttestedBy: 'tester',
    createdAt: '2026-01-01T00:00:00.000Z',
  }

  function render(matchedStrategies?: MatchedStrategy[]) {
    return renderDocumentationExport({
      format: 'staff_training_summary',
      participant,
      generatedBy: 'tester',
      generatedAt: '2026-01-02T00:00:00.000Z',
      behaviours: [
        {
          behaviour,
          episodes: [],
          screeners: [],
          latestHypothesis: null,
          flags: [],
          matchedStrategies,
        },
      ],
    })
  }

  it('falls back to the existing stub note when no strategies are supplied', () => {
    const html = render(undefined)
    expect(html).toContain('Matched support strategies are not included here')
    expect(html).not.toContain('Matched support strategies</h3>')
  })

  it('falls back to the stub note when an empty strategy list is supplied', () => {
    const html = render([])
    expect(html).toContain('Matched support strategies are not included here')
  })

  it('renders supplied strategies ranked, and drops the stub note', () => {
    const html = render([
      { id: 's2', name: 'Second choice', summary: 'B', rationale: 'because B', evidenceRef: 'Ref B', rank: 2 },
      { id: 's1', name: 'First choice', summary: 'A', rationale: 'because A', evidenceRef: 'Ref A', rank: 1 },
    ])
    expect(html).toContain('Matched support strategies</h3>')
    expect(html).not.toContain('Matched support strategies are not included here')
    expect(html.indexOf('First choice')).toBeLessThan(html.indexOf('Second choice'))
  })
})
