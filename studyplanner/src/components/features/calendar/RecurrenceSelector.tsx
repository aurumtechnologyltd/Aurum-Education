import { useState, useEffect } from 'react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { CalendarIcon } from 'lucide-react'
import { format } from 'date-fns'
import { cn } from '@/lib/utils'
import { buildRRule, parseRRule } from '@/lib/calendarUtils'

type RecurrenceFrequency = 'none' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'custom'

interface RecurrenceSelectorProps {
  value: string | null
  onChange: (value: string | null) => void
  startDate?: Date
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars

const WEEKDAYS = [
  { value: 0, label: 'S', full: 'Sunday' },
  { value: 1, label: 'M', full: 'Monday' },
  { value: 2, label: 'T', full: 'Tuesday' },
  { value: 3, label: 'W', full: 'Wednesday' },
  { value: 4, label: 'T', full: 'Thursday' },
  { value: 5, label: 'F', full: 'Friday' },
  { value: 6, label: 'S', full: 'Saturday' },
]

export function RecurrenceSelector({ value, onChange }: RecurrenceSelectorProps) {
  const [frequency, setFrequency] = useState<RecurrenceFrequency>('none')
  const [interval, setInterval] = useState(1)
  const [selectedDays, setSelectedDays] = useState<number[]>([])
  const [endType, setEndType] = useState<'never' | 'count' | 'until'>('never')
  const [count, setCount] = useState(10)
  const [until, setUntil] = useState<Date | undefined>()

  // Parse existing value on mount
  useEffect(() => {
    if (!value) {
      setFrequency('none')
      return
    }

    const parsed = parseRRule(value)
    if (parsed) {
      setFrequency(parsed.frequency)
      setInterval(parsed.interval)
      if (parsed.byweekday) {
        setSelectedDays(parsed.byweekday)
      }
      if (parsed.count) {
        setEndType('count')
        setCount(parsed.count)
      } else if (parsed.until) {
        setEndType('until')
        setUntil(parsed.until)
      }
    }
  }, [])

  // Build RRULE when options change
  useEffect(() => {
    if (frequency === 'none') {
      onChange(null)
      return
    }

    const freq = frequency === 'custom' ? 'weekly' : frequency
    const options: Parameters<typeof buildRRule>[0] = {
      frequency: freq,
      interval,
    }

    if (frequency === 'custom' && selectedDays.length > 0) {
      options.byweekday = selectedDays
    }

    if (endType === 'count') {
      options.count = count
    } else if (endType === 'until' && until) {
      options.until = until
    }

    const rrule = buildRRule(options)
    onChange(rrule)
  }, [frequency, interval, selectedDays, endType, count, until])

  const toggleDay = (day: number) => {
    setSelectedDays(prev =>
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
    )
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Repeat</Label>
        <Select
          value={frequency}
          onValueChange={(v) => setFrequency(v as RecurrenceFrequency)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select frequency" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">Does not repeat</SelectItem>
            <SelectItem value="daily">Daily</SelectItem>
            <SelectItem value="weekly">Weekly</SelectItem>
            <SelectItem value="monthly">Monthly</SelectItem>
            <SelectItem value="custom">Custom</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {frequency !== 'none' && (
        <>
          <div className="flex items-center gap-2">
            <Label className="whitespace-nowrap">Every</Label>
            <Input
              type="number"
              min={1}
              max={99}
              value={interval}
              onChange={(e) => setInterval(parseInt(e.target.value) || 1)}
              className="w-20"
            />
            <span className="text-sm text-muted-foreground">
              {frequency === 'daily' && (interval === 1 ? 'day' : 'days')}
              {frequency === 'weekly' && (interval === 1 ? 'week' : 'weeks')}
              {frequency === 'monthly' && (interval === 1 ? 'month' : 'months')}
              {frequency === 'custom' && (interval === 1 ? 'week' : 'weeks')}
            </span>
          </div>

          {frequency === 'custom' && (
            <div className="space-y-2">
              <Label>Repeat on</Label>
              <div className="flex gap-1">
                {WEEKDAYS.map((day) => (
                  <Button
                    key={day.value}
                    type="button"
                    variant={selectedDays.includes(day.value) ? 'default' : 'outline'}
                    size="sm"
                    className="w-9 h-9 p-0"
                    onClick={() => toggleDay(day.value)}
                  >
                    {day.label}
                  </Button>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label>Ends</Label>
            <Select
              value={endType}
              onValueChange={(v) => setEndType(v as 'never' | 'count' | 'until')}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="never">Never</SelectItem>
                <SelectItem value="count">After</SelectItem>
                <SelectItem value="until">On date</SelectItem>
              </SelectContent>
            </Select>

            {endType === 'count' && (
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  min={1}
                  max={365}
                  value={count}
                  onChange={(e) => setCount(parseInt(e.target.value) || 1)}
                  className="w-20"
                />
                <span className="text-sm text-muted-foreground">occurrences</span>
              </div>
            )}

            {endType === 'until' && (
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      'w-full justify-start text-left font-normal',
                      !until && 'text-muted-foreground'
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {until ? format(until, 'PPP') : 'Pick a date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={until}
                    onSelect={setUntil}
                    disabled={(date) => date < new Date()}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            )}
          </div>
        </>
      )}
    </div>
  )
}

