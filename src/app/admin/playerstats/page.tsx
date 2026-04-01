import { redirect } from 'next/navigation'

export default function PlayerStatsRedirect() {
  redirect('/admin/analytics?tab=playerstats')
}
