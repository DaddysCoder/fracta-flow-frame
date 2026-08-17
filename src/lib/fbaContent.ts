import type { AntecedentTag, ConsequenceTag } from './types'

// Sourced, adapted content for Phase 1.3 (brief Part B, step 4).
//
// Source: Guide to Functional Behaviour Assessment for Schools, Queensland
// Department of Education. Problem Behaviour Inventory items adapted from
// LaVigna & Willis; FACTS items adapted from March, Horner, Lewis-Palmer,
// Brown, Crone & Todd (1999).
//
// The source guide is school/child-context (classrooms, homework, siblings).
// Every item below has been reworded for general disability-support and
// NDIS settings, item by item — not bulk-imported verbatim. No QABF, MAS,
// or BPI-01 wording is used anywhere in this module (licensing risk).

export interface ContentOption {
  id: string
  label: string
}

export interface BehaviourCategory {
  id: string
  label: string
  items: ContentOption[]
}

// "Behaviours of Concern" — grouped, not a flat 60-item list.
export const BEHAVIOUR_CATEGORIES: BehaviourCategory[] = [
  {
    id: 'aggression',
    label: 'Aggression / harm to others',
    items: [
      { id: 'aggression-hitting', label: 'Hitting another person' },
      { id: 'aggression-kicking', label: 'Kicking another person' },
      { id: 'aggression-biting', label: 'Biting another person' },
      { id: 'aggression-pushing-grabbing', label: 'Pushing or grabbing another person' },
      { id: 'aggression-throwing-at-person', label: 'Throwing an object at another person' },
      { id: 'aggression-verbal-threats', label: 'Verbal threats of harm toward another person' },
    ],
  },
  {
    id: 'property',
    label: 'Property / environment',
    items: [
      { id: 'property-throwing-items', label: 'Throwing items' },
      { id: 'property-breaking-items', label: 'Breaking or damaging items' },
      { id: 'property-tipping-furniture', label: 'Tipping over furniture' },
      { id: 'property-marking-surfaces', label: 'Marking or damaging walls/surfaces' },
    ],
  },
  {
    id: 'self-directed',
    label: 'Self-directed',
    items: [
      { id: 'self-directed-hitting-self', label: 'Hitting self' },
      { id: 'self-directed-biting-self', label: 'Biting self' },
      { id: 'self-directed-head-directed', label: 'Head-directed self-injury' },
      { id: 'self-directed-scratching-self', label: 'Scratching or picking at self' },
    ],
  },
  {
    id: 'elopement',
    label: 'Elopement / unsafe wandering',
    items: [
      { id: 'elopement-leaving-supervised-area', label: 'Leaving a supervised area without permission' },
      { id: 'elopement-moving-unsafely', label: 'Moving around the environment unsafely' },
      { id: 'elopement-leaving-vehicle', label: 'Attempting to exit a moving vehicle' },
    ],
  },
  {
    id: 'verbal-vocal',
    label: 'Verbal / vocal',
    items: [
      { id: 'verbal-yelling', label: 'Yelling or shouting' },
      { id: 'verbal-swearing', label: 'Swearing' },
      { id: 'verbal-repetitive-vocalising', label: 'Repetitive or prolonged vocalising' },
      { id: 'verbal-verbal-refusal', label: 'Verbal refusal / argument with support staff' },
    ],
  },
  {
    id: 'non-compliance',
    label: 'Non-compliance / avoidance',
    items: [
      { id: 'non-compliance-ignoring-instruction', label: 'Ignoring an instruction' },
      { id: 'non-compliance-refusing-task', label: 'Refusing to start or continue a task' },
      { id: 'non-compliance-leaving-activity', label: 'Leaving an activity or space without engaging' },
    ],
  },
  {
    id: 'repetitive-unusual',
    label: 'Repetitive / unusual',
    items: [
      { id: 'repetitive-repeating-actions', label: 'Repeating an action or phrase for an extended period' },
      { id: 'repetitive-fixating-on-item', label: 'Fixating on a specific item or topic' },
      { id: 'repetitive-ritualised-routine', label: 'Insisting on a ritualised routine' },
    ],
  },
]

export interface AntecedentOption extends ContentOption {
  suggestedTag: AntecedentTag
}

// Antecedent / context.
export const ANTECEDENT_CONTEXT_OPTIONS: AntecedentOption[] = [
  { id: 'antecedent-given-instruction', label: 'Given an instruction or demand', suggestedTag: 'demand' },
  { id: 'antecedent-correction-reprimand', label: 'Given a correction or reprimand', suggestedTag: 'demand' },
  { id: 'antecedent-alone', label: 'Alone (no attention or activity available)', suggestedTag: 'social' },
  { id: 'antecedent-with-others', label: 'With peers or others present', suggestedTag: 'social' },
  { id: 'antecedent-doing-activity', label: 'Doing an activity', suggestedTag: 'unknown' },
  { id: 'antecedent-item-removed', label: 'Activity or item removed', suggestedTag: 'sensory' },
  { id: 'antecedent-transition', label: 'Transition between activities or settings', suggestedTag: 'transition' },
  { id: 'antecedent-task-too-hard', label: 'Task was too hard', suggestedTag: 'demand' },
  { id: 'antecedent-task-too-long', label: 'Task went on too long', suggestedTag: 'demand' },
  { id: 'antecedent-unstructured-time', label: 'Unstructured time', suggestedTag: 'unknown' },
]

export interface ConsequenceOption extends ContentOption {
  suggestedTag: ConsequenceTag
  // Adult/peer attention are separate options for display and audit, but
  // both roll up to the single 'attention' FAST domain for
  // FunctionHypothesis matching — see fbaContent.test.ts.
  attentionSubtype?: 'adult' | 'peer'
}

// Consequence (maps to FAST domains via suggestedTag).
export const CONSEQUENCE_OPTIONS: ConsequenceOption[] = [
  {
    id: 'consequence-adult-attention-given',
    label: 'Adult attention given',
    suggestedTag: 'attention',
    attentionSubtype: 'adult',
  },
  {
    id: 'consequence-adult-attention-avoided',
    label: 'Adult attention avoided or withdrawn',
    suggestedTag: 'attention',
    attentionSubtype: 'adult',
  },
  {
    id: 'consequence-peer-attention-given',
    label: 'Peer attention given',
    suggestedTag: 'attention',
    attentionSubtype: 'peer',
  },
  {
    id: 'consequence-peer-attention-avoided',
    label: 'Peer attention avoided or withdrawn',
    suggestedTag: 'attention',
    attentionSubtype: 'peer',
  },
  { id: 'consequence-activity-item-provided', label: 'Activity or item provided', suggestedTag: 'tangible' },
  { id: 'consequence-sensory-obtained', label: 'Sensory outcome obtained', suggestedTag: 'automatic' },
  { id: 'consequence-sensory-avoided', label: 'Sensory outcome avoided', suggestedTag: 'automatic' },
  { id: 'consequence-task-avoided', label: 'Task or activity avoided', suggestedTag: 'escape' },
]

// Setting events.
export const SETTING_EVENT_OPTIONS: ContentOption[] = [
  { id: 'setting-hunger', label: 'Hunger' },
  { id: 'setting-conflict', label: 'Recent conflict' },
  { id: 'setting-missed-medication', label: 'Missed medication' },
  { id: 'setting-illness', label: 'Illness' },
  { id: 'setting-lack-of-sleep', label: 'Lack of sleep' },
  { id: 'setting-routine-change', label: 'Routine change' },
  { id: 'setting-recent-failure', label: 'Recent failure or setback' },
]

// Plain-language terminology, used for tooltips across the Formulation and
// ABC screens (brief Part B, step 4).
export const TERMINOLOGY: Record<string, string> = {
  antecedent: 'What happens immediately before a behaviour — often a trigger, but not always the cause.',
  'alternative behaviour':
    'A safer or more appropriate behaviour that could achieve the same function as the behaviour of concern.',
  behaviour: 'An observable, measurable action — described without interpreting intent or cause.',
  consequence: 'What happens immediately after a behaviour — including how others respond.',
  function:
    'The purpose a behaviour serves for the person — for example, gaining attention, escaping a demand, obtaining an item, or a sensory outcome.',
  hypothesis: 'A best-current-understanding statement about a behaviour’s function, not a confirmed diagnosis.',
  reinforcement: 'Anything that follows a behaviour and makes that behaviour more likely to happen again.',
  'setting event':
    'A broader condition (e.g. poor sleep, illness, routine change) that makes a behaviour more likely, without directly triggering it.',
  'summary statement':
    'A single sentence describing the relationship between routine, antecedent, behaviour, consequence and function.',
}
