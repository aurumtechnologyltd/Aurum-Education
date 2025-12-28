import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Calendar, Loader2 } from 'lucide-react'

export default function SetupSemester() {
  const navigate = useNavigate()
  const { user, refreshSemesters } = useAuth()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!user) return

    setLoading(true)
    setError(null)

    const formData = new FormData(e.currentTarget)
    const name = formData.get('name') as string
    const startDate = formData.get('startDate') as string
    const endDate = formData.get('endDate') as string

    const { error } = await supabase.from('semesters').insert({
      user_id: user.id,
      name,
      start_date: startDate,
      end_date: endDate,
      is_active: true,
    })

    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      await refreshSemesters()
      navigate('/dashboard')
    }
  }

  // Calculate suggested dates for current semester
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth()
  
  // Suggest current semester based on month
  let suggestedName = ''
  let suggestedStart = ''
  let suggestedEnd = ''
  
  if (month >= 0 && month <= 4) {
    suggestedName = `Spring ${year}`
    suggestedStart = `${year}-01-15`
    suggestedEnd = `${year}-05-15`
  } else if (month >= 5 && month <= 7) {
    suggestedName = `Summer ${year}`
    suggestedStart = `${year}-06-01`
    suggestedEnd = `${year}-08-15`
  } else {
    suggestedName = `Fall ${year}`
    suggestedStart = `${year}-08-25`
    suggestedEnd = `${year}-12-15`
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-50 via-slate-50 to-amber-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 p-4">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-emerald-100/40 via-transparent to-transparent dark:from-emerald-900/20" />
      
      <Card className="w-full max-w-md relative z-10 shadow-xl border-slate-200/50 dark:border-slate-800/50">
        <CardHeader className="text-center space-y-4">
          <img src="/logo.png" alt="Aurum Education" className="mx-auto w-20 h-20 object-contain" />
          <div>
            <CardTitle className="text-2xl font-bold tracking-tight">Set Up Your Semester</CardTitle>
            <CardDescription className="mt-2">
              Let&apos;s get you organized for the term ahead
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent>
          {error && (
            <div className="mb-4 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Semester Name</Label>
              <Input
                id="name"
                name="name"
                type="text"
                placeholder="Fall 2025"
                defaultValue={suggestedName}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="startDate">Start Date</Label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="startDate"
                    name="startDate"
                    type="date"
                    className="pl-10"
                    defaultValue={suggestedStart}
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="endDate">End Date</Label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="endDate"
                    name="endDate"
                    type="date"
                    className="pl-10"
                    defaultValue={suggestedEnd}
                    required
                  />
                </div>
              </div>
            </div>

            <Button type="submit" className="w-full mt-6" disabled={loading}>
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Get Started'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

