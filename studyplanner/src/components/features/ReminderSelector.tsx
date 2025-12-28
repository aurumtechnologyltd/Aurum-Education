import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Plus, X, Bell } from 'lucide-react'
import type { ReminderConfig, ReminderUnit, ReminderMethod } from '@/types/database'

interface ReminderSelectorProps {
  value: ReminderConfig[]
  onChange: (reminders: ReminderConfig[]) => void
  maxReminders?: number
}

const UNITS: { value: ReminderUnit; label: string }[] = [
  { value: 'minutes', label: 'minutes' },
  { value: 'hours', label: 'hours' },
  { value: 'days', label: 'days' },
  { value: 'weeks', label: 'weeks' },
]

const METHODS: { value: ReminderMethod; label: string }[] = [
  { value: 'popup', label: 'Notification' },
  { value: 'email', label: 'Email' },
]

export function ReminderSelector({
  value,
  onChange,
  maxReminders = 5,
}: ReminderSelectorProps) {
  const addReminder = () => {
    if (value.length >= maxReminders) return
    onChange([...value, { value: 30, unit: 'minutes', method: 'popup' }])
  }

  const removeReminder = (index: number) => {
    onChange(value.filter((_, i) => i !== index))
  }

  const updateReminder = (index: number, updates: Partial<ReminderConfig>) => {
    onChange(
      value.map((reminder, i) =>
        i === index ? { ...reminder, ...updates } : reminder
      )
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium flex items-center gap-2">
          <Bell className="w-4 h-4" />
          Reminders
        </label>
        {value.length < maxReminders && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addReminder}
          >
            <Plus className="w-4 h-4 mr-1" />
            Add
          </Button>
        )}
      </div>

      {value.length === 0 ? (
        <p className="text-sm text-muted-foreground">No reminders set</p>
      ) : (
        <div className="space-y-2">
          {value.map((reminder, index) => (
            <div key={index} className="flex items-center gap-2">
              <Input
                type="number"
                min={1}
                max={999}
                value={reminder.value}
                onChange={(e) =>
                  updateReminder(index, { value: parseInt(e.target.value) || 1 })
                }
                className="w-20"
              />
              <Select
                value={reminder.unit}
                onValueChange={(v) =>
                  updateReminder(index, { unit: v as ReminderUnit })
                }
              >
                <SelectTrigger className="w-28">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {UNITS.map((unit) => (
                    <SelectItem key={unit.value} value={unit.value}>
                      {unit.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <span className="text-sm text-muted-foreground">before via</span>
              <Select
                value={reminder.method}
                onValueChange={(v) =>
                  updateReminder(index, { method: v as ReminderMethod })
                }
              >
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {METHODS.map((method) => (
                    <SelectItem key={method.value} value={method.value}>
                      {method.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => removeReminder(index)}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

