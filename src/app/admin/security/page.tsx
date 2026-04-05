import { redirect } from 'next/navigation'

export default function SecurityRedirect() {
  redirect('/admin/settings?tab=security')
}
