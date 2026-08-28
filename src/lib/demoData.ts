import { db } from './db'
import { createBehaviour, createEpisode, createParticipant } from './actions'

const DEMO_PARTICIPANT_LABEL = 'Demo Participant'
const DEMO_BEHAVIOUR_NAME = 'Leaving the activity area'

/** Synthetic caseload for local screenshots — never runs in production builds. */
export async function seedDemoDataIfEmpty(): Promise<void> {
  if (import.meta.env.PROD || import.meta.env.VITEST) return

  const participantCount = await db.participants.count()
  if (participantCount > 0) return

  const participantId = await createParticipant({
    identifyingDetails: DEMO_PARTICIPANT_LABEL,
    consentAttested: true,
    practitionerName: 'Demo practitioner',
  })

  const behaviourId = await createBehaviour({
    participantId,
    name: DEMO_BEHAVIOUR_NAME,
    operationalDefinition:
      'Participant moves more than one body length away from the designated activity zone without staff permission, within 30 seconds of the transition cue.',
    createdBy: 'Demo practitioner',
  })

  const base = new Date()
  base.setDate(base.getDate() - 3)

  await createEpisode({
    behaviourId,
    dateTime: new Date(base.getTime() + 2 * 60 * 60 * 1000).toISOString(),
    durationMinutes: 4,
    severityRating: 1,
    frequencyContext: 2,
    settingEvent: 'Group art session after morning tea',
    antecedentText: 'Staff gave a two-minute transition warning to pack up materials',
    antecedentTag: 'transition',
    consequenceText: 'Staff redirected back to the table; peer attention during redirection',
    consequenceTag: 'attention',
    riskFlags: [],
    loggedBy: 'Demo practitioner',
  })

  await createEpisode({
    behaviourId,
    dateTime: new Date(base.getTime() + 26 * 60 * 60 * 1000).toISOString(),
    durationMinutes: 2,
    severityRating: 2,
    frequencyContext: 3,
    settingEvent: 'Outdoor play following a demand to share equipment',
    antecedentText: 'Asked to return the scooter to another participant',
    antecedentTag: 'demand',
    consequenceText: 'Left the fenced area; staff followed and used calm blocking',
    consequenceTag: 'escape',
    riskFlags: ['elopement'],
    loggedBy: 'Demo practitioner',
  })
}
