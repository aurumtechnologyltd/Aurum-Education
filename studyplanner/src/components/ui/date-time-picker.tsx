import * as React from "react"
import { format } from "date-fns"
import { Calendar as CalendarIcon, Clock } from "lucide-react"
import { Calendar } from "@/components/ui/calendar"
import { Button } from "@/components/ui/button"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"

interface DateTimePickerProps {
  value?: Date
  onChange?: (date: Date | undefined) => void
  placeholder?: string
  disabled?: boolean
  minDate?: Date
  maxDate?: Date
  defaultTime?: { hour: number; minute: number }
}

export function DateTimePicker({
  value,
  onChange,
  placeholder = "Pick a date and time",
  disabled = false,
  minDate,
  maxDate,
  defaultTime = { hour: 23, minute: 59 }, // Default to 11:59 PM
}: DateTimePickerProps) {
  const [open, setOpen] = React.useState(false)
  const [selectedDate, setSelectedDate] = React.useState<Date | undefined>(value)
  const [hour, setHour] = React.useState<string>(
    value ? String(value.getHours() % 12 || 12) : String(defaultTime.hour % 12 || 12)
  )
  const [minute, setMinute] = React.useState<string>(
    value ? String(value.getMinutes()).padStart(2, "0") : String(defaultTime.minute).padStart(2, "0")
  )
  const [amPm, setAmPm] = React.useState<"AM" | "PM">(
    value ? (value.getHours() >= 12 ? "PM" : "AM") : (defaultTime.hour >= 12 ? "PM" : "AM")
  )

  React.useEffect(() => {
    if (value) {
      setSelectedDate(value)
      setHour(String(value.getHours() % 12 || 12))
      setMinute(String(value.getMinutes()).padStart(2, "0"))
      setAmPm(value.getHours() >= 12 ? "PM" : "AM")
    }
  }, [value])

  const handleDateSelect = (date: Date | undefined) => {
    if (!date) {
      setSelectedDate(undefined)
      onChange?.(undefined)
      return
    }

    // Combine selected date with current time
    const newDate = new Date(date)
    const hour24 = amPm === "PM" 
      ? (parseInt(hour) === 12 ? 12 : parseInt(hour) + 12)
      : (parseInt(hour) === 12 ? 0 : parseInt(hour))
    
    newDate.setHours(hour24, parseInt(minute), 0, 0)
    setSelectedDate(newDate)
    onChange?.(newDate)
  }


  const handleHourChange = (newHour: string) => {
    setHour(newHour)
    // Update time immediately
    const hour24 = amPm === "PM" 
      ? (parseInt(newHour) === 12 ? 12 : parseInt(newHour) + 12)
      : (parseInt(newHour) === 12 ? 0 : parseInt(newHour))
    
    if (selectedDate) {
      const newDate = new Date(selectedDate)
      newDate.setHours(hour24, parseInt(minute), 0, 0)
      setSelectedDate(newDate)
      onChange?.(newDate)
    }
  }

  const handleMinuteChange = (newMinute: string) => {
    setMinute(newMinute)
    // Update time immediately
    const hour24 = amPm === "PM" 
      ? (parseInt(hour) === 12 ? 12 : parseInt(hour) + 12)
      : (parseInt(hour) === 12 ? 0 : parseInt(hour))
    
    if (selectedDate) {
      const newDate = new Date(selectedDate)
      newDate.setHours(hour24, parseInt(newMinute), 0, 0)
      setSelectedDate(newDate)
      onChange?.(newDate)
    }
  }

  const handleAmPmChange = (newAmPm: "AM" | "PM") => {
    setAmPm(newAmPm)
    // Update time immediately
    const hour24 = newAmPm === "PM" 
      ? (parseInt(hour) === 12 ? 12 : parseInt(hour) + 12)
      : (parseInt(hour) === 12 ? 0 : parseInt(hour))
    
    if (selectedDate) {
      const newDate = new Date(selectedDate)
      newDate.setHours(hour24, parseInt(minute), 0, 0)
      setSelectedDate(newDate)
      onChange?.(newDate)
    }
  }

  const hours = Array.from({ length: 12 }, (_, i) => i + 1)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "w-full justify-start text-left font-normal",
            !selectedDate && "text-muted-foreground"
          )}
          disabled={disabled}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {selectedDate ? (
            format(selectedDate, "PPP 'at' h:mm a")
          ) : (
            <span>{placeholder}</span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <div className="flex flex-col gap-4 p-4">
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={handleDateSelect}
            disabled={(date) => {
              if (minDate && date < minDate) return true
              if (maxDate && date > maxDate) return true
              return false
            }}
            initialFocus
          />
          
          <div className="border-t pt-4">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <Label className="text-sm font-medium">Time</Label>
            </div>
            <div className="flex items-center gap-2 mt-3">
              <Select value={hour} onValueChange={handleHourChange}>
                <SelectTrigger className="w-20">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {hours.map((h) => (
                    <SelectItem key={h} value={String(h)}>
                      {String(h).padStart(2, "0")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <span className="text-muted-foreground">:</span>
              
              <Input
                type="text"
                value={minute}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, '').slice(0, 2)
                  if (val === '' || (parseInt(val) >= 0 && parseInt(val) <= 59)) {
                    setMinute(val.padStart(2, '0'))
                    if (val.length === 2) {
                      handleMinuteChange(val.padStart(2, '0'))
                    }
                  }
                }}
                onBlur={() => {
                  const val = minute.padStart(2, '0')
                  if (parseInt(val) > 59) {
                    setMinute('59')
                    handleMinuteChange('59')
                  } else {
                    handleMinuteChange(val)
                  }
                }}
                className="w-20 text-center"
                placeholder="00"
              />
              
              <Select value={amPm} onValueChange={handleAmPmChange}>
                <SelectTrigger className="w-20">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="AM">AM</SelectItem>
                  <SelectItem value="PM">PM</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}

