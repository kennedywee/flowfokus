import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandShortcut } from "@/components/ui/command";

export default function Example() {
  return (
    <div className="gallery-fill">
      <Command>
        <CommandInput placeholder="Search" aria-label="Search commands" />
        <CommandList>
          <CommandGroup heading="Actions">
            <CommandItem value="check-in">
              Check in <CommandShortcut>C</CommandShortcut>
            </CommandItem>
            <CommandItem value="new-sale">New sale</CommandItem>
            <CommandItem value="add-member">Add member</CommandItem>
          </CommandGroup>
        </CommandList>
        <CommandEmpty>Nothing matches.</CommandEmpty>
      </Command>
    </div>
  );
}
