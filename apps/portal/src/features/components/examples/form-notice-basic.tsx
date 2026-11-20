import { FormNotice } from "@/components/FormNotice";

export default function Example() {
  return (
    <div className="gallery-fill">
      <FormNotice
        title="The program was not saved"
        error={{ status: 503, code: "api_unreachable", message: "Rails did not answer." }}
        text="The connection dropped. Your changes are still here; try again."
      />
    </div>
  );
}
