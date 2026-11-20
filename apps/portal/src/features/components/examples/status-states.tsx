import { Status } from "@/components/ui";

export default function Example() {
  return (
    <>
      <Status state="active">Active</Status>
      <Status state="paid">Paid</Status>
      <Status state="due">Unpaid</Status>
      <Status state="waiting">Awaiting payment</Status>
      <Status state="denied">Denied</Status>
      <Status state="off">Expired</Status>
    </>
  );
}
