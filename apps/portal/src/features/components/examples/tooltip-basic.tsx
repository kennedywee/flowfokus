import { Ellipsis } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

export default function Example() {
  return (
    <Tooltip>
      <TooltipTrigger render={<Button size="icon-compact" variant="secondary" aria-label="More actions" />}>
        <Ellipsis strokeWidth={1.75} aria-hidden="true" focusable="false" />
      </TooltipTrigger>
      <TooltipContent>More actions</TooltipContent>
    </Tooltip>
  );
}
