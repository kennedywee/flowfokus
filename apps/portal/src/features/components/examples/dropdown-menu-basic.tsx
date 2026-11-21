import { Icon } from "@/components/ui/icon";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function Example() {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button size="icon-compact" variant="secondary" aria-label="Sale actions" />}>
        <Icon name="more" aria-hidden="true" focusable="false" />
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuItem>
          Record payment <DropdownMenuShortcut>P</DropdownMenuShortcut>
        </DropdownMenuItem>
        <DropdownMenuItem>Send invoice</DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem>Void sale</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
