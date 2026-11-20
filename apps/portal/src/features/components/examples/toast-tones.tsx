import { Button } from "@/components/ui/button";
import { useToast } from "@/components/Toast";

export default function Example() {
  const toast = useToast();
  return (
    <>
      <Button
        variant="secondary"
        onClick={() =>
          toast.show({ tone: "success", title: "Priya Nair checked in", action: { label: "Undo", onClick: () => {} } })
        }
      >
        Success
      </Button>
      <Button variant="secondary" onClick={() => toast.show({ tone: "info", title: "Invoice sent", body: "To priya@example.com" })}>
        Info
      </Button>
      <Button
        variant="secondary"
        onClick={() =>
          toast.show({ tone: "error", title: "Check-in failed", body: "The connection dropped.", action: { label: "Try again", onClick: () => {} } })
        }
      >
        Error
      </Button>
    </>
  );
}
