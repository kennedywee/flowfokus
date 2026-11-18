import { CircleAlert } from "lucide-react";
import { failureMessage } from "../lib/format";
import type { Failure } from "../lib/result";

/**
 * Paper's form-level notice: a bordered box with a 16px red icon, a title,
 * and one staff sentence. Use it when a form's request failed and the fields
 * keep their values, for example "The program was not saved".
 */
export function FormNotice({ title, error, after }: { title: string; error: Failure; after?: string }) {
  return (
    <div className="form-notice" role="alert">
      <CircleAlert className="form-notice__icon" strokeWidth={1.75} aria-hidden="true" focusable="false" />
      <p className="form-notice__text">
        <span className="form-notice__title">{title}</span> · {failureMessage(error)}
        {after ? ` ${after}` : null}
      </p>
    </div>
  );
}
