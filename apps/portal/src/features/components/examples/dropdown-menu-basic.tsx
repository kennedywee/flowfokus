import { Ellipsis } from "lucide-react";
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
        <Ellipsis strokeWidth={1.75} aria-hidden="true" focusable="false" />
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
