import { Icon } from "@/components/ui/icon";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

export default function Example() {
  return (
    <Tooltip>
      <TooltipTrigger render={<Button size="icon-compact" variant="secondary" aria-label="More actions" />}>
        <Icon name="more" aria-hidden="true" focusable="false" />
      </TooltipTrigger>
      <TooltipContent>More actions</TooltipContent>
    </Tooltip>
  );
}
