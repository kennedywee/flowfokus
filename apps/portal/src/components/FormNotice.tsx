import { Icon } from "@/components/ui/icon";
import { failureMessage } from "../lib/format";
import type { Failure } from "../lib/result";

/**
 * Paper's form-level notice: a bordered box with a 16px red icon, a title,
 * and one staff sentence. Use it when a form's request failed and the fields
 * keep their values, for example "The program was not saved".
 */
export function FormNotice({ title, error, text, after }: { title: string; error: Failure; text?: string; after?: string }) {
  return (
    <div className="form-notice" role="alert">
      <Icon name="notifications" className="form-notice__icon" aria-hidden="true" focusable="false" />
      <p className="form-notice__text">
        <span className="form-notice__title">{title}</span> · {text ?? failureMessage(error)}
        {after ? ` ${after}` : null}
      </p>
    </div>
  );
}
