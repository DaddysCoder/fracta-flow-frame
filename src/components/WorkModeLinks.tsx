import { Link } from 'react-router-dom'
import { BEHAVIOUR_TABS } from '../lib/workModes'

export function WorkModeLinks({ behaviourId }: { behaviourId: string }) {
  return (
    <div className="flex flex-wrap gap-1.5 mt-3">
      {BEHAVIOUR_TABS.map((tab) => (
        <Link
          key={tab.id}
          to={`/behaviours/${behaviourId}?tab=${tab.id}`}
          className="rounded-full bg-[#F0F0F0] dark:bg-slate-800 px-2.5 py-1 text-[11px] font-semibold text-[#0B0B0C] dark:text-slate-200 hover:bg-[#0B0B0C] hover:text-white dark:hover:bg-white dark:hover:text-[#0B0B0C]"
        >
          {tab.short}
        </Link>
      ))}
    </div>
  )
}
