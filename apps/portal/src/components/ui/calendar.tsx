"use client"

import * as React from "react"
import { ChevronDown, ChevronLeft, ChevronRight } from "lucide-react"
import { DayPicker, type DayButton, type Locale } from "react-day-picker"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"

/*
 * A month grid for picking a day or a range, from react-day-picker. It gives
 * the grid roles, arrow keys, and Page Up and Page Down for months. Styled by
 * the `.calendar` classes in styles/components.css. react-day-picker puts
 * `data-today`, `data-selected`, `data-outside`, and `data-disabled` on each
 * day cell; the CSS reads those. For a field, use DatePicker.
 */
function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  captionLayout = "label",
  locale,
  formatters,
  components,
  ...props
}: React.ComponentProps<typeof DayPicker>) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn("calendar", className)}
      captionLayout={captionLayout}
      locale={locale}
      formatters={{
        formatMonthDropdown: (date) => date.toLocaleString(locale?.code, { month: "short" }),
        ...formatters,
      }}
      classNames={{
        months: "calendar__months",
        month: "calendar__month",
        nav: "calendar__nav",
        button_previous: buttonVariants({ variant: "ghost", size: "icon-sm" }),
        button_next: buttonVariants({ variant: "ghost", size: "icon-sm" }),
        month_caption: "calendar__caption",
        dropdowns: "calendar__dropdowns",
        dropdown_root: "calendar__dropdown",
        dropdown: "calendar__dropdown-select",
        caption_label: cn("calendar__caption-label", captionLayout !== "label" && "calendar__caption-label--dropdown"),
        month_grid: "calendar__grid",
        weekdays: "calendar__weekdays",
        weekday: "calendar__weekday",
        week: "calendar__week",
        week_number_header: "calendar__week-number",
        week_number: "calendar__week-number",
        day: "calendar__cell",
        ...classNames,
      }}
      components={{
        Chevron: ({ className, orientation, ...props }) => {
          const Icon = orientation === "left" ? ChevronLeft : orientation === "right" ? ChevronRight : ChevronDown
          return <Icon strokeWidth={1.75} aria-hidden="true" focusable="false" className={className} {...props} />
        },
        DayButton: (props) => <CalendarDayButton locale={locale} {...props} />,
        ...components,
      }}
      {...props}
    />
  )
}

function CalendarDayButton({
  className,
  day,
  modifiers,
  locale,
  ...props
}: React.ComponentProps<typeof DayButton> & { locale?: Partial<Locale> }) {
  const ref = React.useRef<HTMLButtonElement>(null)
  React.useEffect(() => {
    if (modifiers.focused) ref.current?.focus()
  }, [modifiers.focused])

  return (
    <button
      ref={ref}
      data-day={day.date.toLocaleDateString(locale?.code)}
      data-selected-single={
        modifiers.selected && !modifiers.range_start && !modifiers.range_end && !modifiers.range_middle
      }
      data-range-start={modifiers.range_start}
      data-range-end={modifiers.range_end}
      data-range-middle={modifiers.range_middle}
      className={cn("calendar__day", className)}
      {...props}
    />
  )
}

export { Calendar, CalendarDayButton }
