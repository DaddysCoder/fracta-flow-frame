import { type FormEvent, useEffect, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../lib/db'
import { updateParticipantProfile } from '../lib/actions'
import type { ParticipantContact } from '../lib/types'

interface FormState {
  preferredName: string
  legalName: string
  dob: string
  ndisNumber: string
  location: string
  contacts: ParticipantContact[]
  referrerIdentity: string
  practitionerIdentity: string
  providerDetails: string
}

const EMPTY_FORM: FormState = {
  preferredName: '',
  legalName: '',
  dob: '',
  ndisNumber: '',
  location: '',
  contacts: [],
  referrerIdentity: '',
  practitionerIdentity: '',
  providerDetails: '',
}

function fieldClass() {
  return 'mt-1 block w-full rounded-md border border-slate-300 dark:border-slate-700 dark:bg-slate-800 px-3 py-2 text-sm'
}

export function ParticipantProfilePanel({ participantId }: { participantId: string }) {
  const participant = useLiveQuery(() => db.participants.get(participantId), [participantId])
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!participant) return
    const p = participant.profile
    setForm(
      p
        ? {
            preferredName: p.preferredName,
            legalName: p.legalName,
            dob: p.dob,
            ndisNumber: p.ndisNumber,
            location: p.location ?? '',
            contacts: p.contacts,
            referrerIdentity: p.referrerIdentity,
            practitionerIdentity: p.practitionerIdentity ?? '',
            providerDetails: p.providerDetails ?? '',
          }
        : EMPTY_FORM,
    )
  }, [participant])

  if (!participant) return null
  const profile = participant.profile

  function updateContact(index: number, field: keyof ParticipantContact, value: string) {
    setForm((prev) => {
      const contacts = [...prev.contacts]
      contacts[index] = { ...contacts[index], [field]: value }
      return { ...prev, contacts }
    })
  }

  function addContact() {
    setForm((prev) => ({ ...prev, contacts: [...prev.contacts, { label: '', detail: '' }] }))
  }

  function removeContact(index: number) {
    setForm((prev) => ({ ...prev, contacts: prev.contacts.filter((_, i) => i !== index) }))
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    try {
      await updateParticipantProfile(participantId, {
        preferredName: form.preferredName.trim(),
        legalName: form.legalName.trim(),
        dob: form.dob,
        ndisNumber: form.ndisNumber.trim(),
        location: form.location.trim() || null,
        contacts: form.contacts
          .map((c) => ({ label: c.label.trim(), detail: c.detail.trim() }))
          .filter((c) => c.label || c.detail),
        referrerIdentity: form.referrerIdentity.trim(),
        practitionerIdentity: form.practitionerIdentity.trim() || null,
        providerDetails: form.providerDetails.trim() || null,
      })
      setEditing(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save profile')
    }
  }

  const provenance = !profile
    ? null
    : profile.importedAt
      ? `Imported from ${profile.sourceSystem ?? 'an external system'} on ${new Date(profile.importedAt).toLocaleString()}`
      : 'Entered manually'

  if (!editing) {
    return (
      <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-[#111111] dark:text-white">Participant profile</h2>
          <button
            onClick={() => setEditing(true)}
            className="rounded-md border border-slate-300 dark:border-slate-700 px-3 py-1.5 text-sm font-medium text-slate-700 dark:text-slate-200"
          >
            {profile ? 'Edit' : 'Add profile'}
          </button>
        </div>

        {!profile && (
          <p className="text-sm text-slate-500">
            No Tier 0 identity profile yet. Enter it here, or import one from the PBS system on the
            Participants list.
          </p>
        )}

        {profile && (
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-sm">
            <Field label="Preferred name" value={profile.preferredName} />
            <Field label="Legal name" value={profile.legalName} />
            <Field label="Date of birth" value={profile.dob} />
            <Field label="NDIS number" value={profile.ndisNumber} />
            <Field label="Location" value={profile.location} />
            <Field label="Referrer" value={profile.referrerIdentity} />
            <Field label="Practitioner" value={profile.practitionerIdentity} />
            <Field label="Provider" value={profile.providerDetails} />
            <div className="sm:col-span-2">
              <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">Contacts</dt>
              {profile.contacts.length === 0 ? (
                <dd className="text-slate-700 dark:text-slate-200">—</dd>
              ) : (
                <dd className="text-slate-700 dark:text-slate-200">
                  <ul className="space-y-0.5">
                    {profile.contacts.map((c, i) => (
                      <li key={i}>
                        <span className="font-medium">{c.label}:</span> {c.detail}
                      </li>
                    ))}
                  </ul>
                </dd>
              )}
            </div>
          </dl>
        )}

        {provenance && <p className="text-xs text-slate-400">{provenance}</p>}
      </div>
    )
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 space-y-3"
    >
      <h2 className="text-sm font-semibold text-[#111111] dark:text-white">Edit participant profile</h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">
          Preferred name
          <input
            required
            value={form.preferredName}
            onChange={(e) => setForm((p) => ({ ...p, preferredName: e.target.value }))}
            className={fieldClass()}
          />
        </label>
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">
          Legal name
          <input
            required
            value={form.legalName}
            onChange={(e) => setForm((p) => ({ ...p, legalName: e.target.value }))}
            className={fieldClass()}
          />
        </label>
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">
          Date of birth
          <input
            required
            type="date"
            value={form.dob}
            onChange={(e) => setForm((p) => ({ ...p, dob: e.target.value }))}
            className={fieldClass()}
          />
        </label>
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">
          NDIS number
          <input
            required
            value={form.ndisNumber}
            onChange={(e) => setForm((p) => ({ ...p, ndisNumber: e.target.value }))}
            className={fieldClass()}
          />
        </label>
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 sm:col-span-2">
          Location
          <input
            value={form.location}
            onChange={(e) => setForm((p) => ({ ...p, location: e.target.value }))}
            className={fieldClass()}
          />
        </label>
      </div>

      <div>
        <span className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">Contacts</span>
        <div className="space-y-2">
          {form.contacts.map((c, i) => (
            <div key={i} className="flex gap-2 items-start">
              <input
                placeholder="Label (e.g. Primary contact)"
                value={c.label}
                onChange={(e) => updateContact(i, 'label', e.target.value)}
                className={fieldClass()}
              />
              <input
                placeholder="Detail"
                value={c.detail}
                onChange={(e) => updateContact(i, 'detail', e.target.value)}
                className={fieldClass()}
              />
              <button
                type="button"
                onClick={() => removeContact(i)}
                className="mt-1 shrink-0 text-xs text-slate-500 hover:underline"
              >
                Remove
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={addContact}
            className="text-xs font-medium text-slate-700 dark:text-slate-200 hover:underline"
          >
            + Add contact
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">
          Referrer (name, role and organisation)
          <input
            required
            value={form.referrerIdentity}
            onChange={(e) => setForm((p) => ({ ...p, referrerIdentity: e.target.value }))}
            className={fieldClass()}
          />
        </label>
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">
          Practitioner (name, role and registration)
          <input
            value={form.practitionerIdentity}
            onChange={(e) => setForm((p) => ({ ...p, practitionerIdentity: e.target.value }))}
            className={fieldClass()}
          />
        </label>
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 sm:col-span-2">
          Provider details
          <input
            value={form.providerDetails}
            onChange={(e) => setForm((p) => ({ ...p, providerDetails: e.target.value }))}
            className={fieldClass()}
          />
        </label>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex gap-2">
        <button
          type="submit"
          className="rounded-md bg-[#111111] dark:bg-white text-white dark:text-slate-900 px-3 py-1.5 text-sm font-medium"
        >
          Save profile
        </button>
        <button
          type="button"
          onClick={() => setEditing(false)}
          className="rounded-md border border-slate-300 dark:border-slate-700 px-3 py-1.5 text-sm font-medium text-slate-700 dark:text-slate-200"
        >
          Cancel
        </button>
      </div>
    </form>
  )
}

function Field({ label, value }: { label: string; value: string | null }) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</dt>
      <dd className="text-slate-700 dark:text-slate-200">{value || '—'}</dd>
    </div>
  )
}
