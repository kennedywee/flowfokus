# List table (members)
- row "Member Plan Member since Spent Balance due":
  - columnheader "Member":
    - button "Member"
  - columnheader "Plan"
  - columnheader "Member since":
    - button "Member since"
  - columnheader "Spent":
    - button "Spent"
  - columnheader "Balance due"

# Floating bar
- toolbar "Bulk actions":
  - text: 6 selected
  - button "Check in"
  - button "No-show"
  - button "Clear selection"

# Groups
- table "Bookings by arrival (sample data)":
  - row "Member Booked with Last visit":
    - columnheader "Member"
    - columnheader "Booked with"
    - columnheader "Last visit"
  - rowgroup:
    - row "Here 2":
      - cell "Here 2":
        - button "Here 2" [expanded]
    - rowgroup:
      - row "Priya Nair Monthly unlimited 06:32":
        - cell "Priya Nair"
        - cell "Monthly unlimited"
        - cell "06:32"
      - row "Ahmad Faiz Monthly unlimited 06:35":
        - cell "Ahmad Faiz"
        - cell "Monthly unlimited"
        - cell "06:35"
  - rowgroup:
    - row "To arrive 4":
      - cell "To arrive 4":
        - button "To arrive 4" [expanded]
    - rowgroup:
      - row "Ben Tan 10-class pass Yesterday":
        - cell "Ben Tan"
        - cell "10-class pass"
        - cell "Yesterday"
      - row "Sara Lee Drop-in Today":
        - cell "Sara Lee"
        - cell "Drop-in"
        - cell "Today"
      - row "Jason Teo 10-class pass Mon":
        - cell "Jason Teo"
        - cell "10-class pass"
        - cell "Mon"
      - row "Nurul Huda Monthly unlimited Today":
        - cell "Nurul Huda"
        - cell "Monthly unlimited"
        - cell "Today"
  - rowgroup:
    - row "Cancelled 1":
      - cell "Cancelled 1":
        - button "Cancelled 1" [expanded]
    - rowgroup:
      - row "Lim Wei Jie Monthly unlimited Today":
        - cell "Lim Wei Jie"
        - cell "Monthly unlimited"
        - cell "Today"

# Filter bar
- group "Filters":
  - button "Filter"
  - group "Tag is Staff":
    - text: Tag
    - button "Tag is. Change to is not": is
    - 'button "Tag values: Staff. Change"': Staff
    - button "Remove the tag filter"
  - search:
    - text: Search members
    - searchbox "Search members"

# Display popover
- dialog "Display":
  - heading "Display" [level=2]
  - text: Sort by
  - combobox "Sort by":
    - option "Name" [selected]
    - option "Member since"
    - option "Spent"
  - button "Ascending. Switch to descending"
  - text: Show ended members
  - switch "Show ended members"
  - group "Columns":
    - paragraph: Columns
    - button "ID" [pressed]
    - button "Phone" [pressed]
    - button "Tags" [pressed]
    - button "Member since" [pressed]
    - button "Spent" [pressed]
    - button "Email" [pressed]
  - button "Reset to default"

# Segmented control
- radiogroup "Show":
  - radio "All"
  - radio "Comments" [checked]
  - radio "Activity"
