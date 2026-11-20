import { Link } from "@tanstack/react-router";
import { buttonVariants } from "@/components/ui/button";

export default function Example() {
  return (
    <Link to="/components/$name" params={{ name: "button" }} className={buttonVariants({ variant: "secondary" })}>
      Open the Button page
    </Link>
  );
}
