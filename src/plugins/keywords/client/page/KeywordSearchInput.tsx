import { Search } from "lucide-react";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupTextarea,
} from "@/client/components/ui/input-group";
import { useLocale } from "@/plugins/client/context";

export function KeywordSearchInput({
  value,
  onChange,
  onSubmit,
  onBlur,
  invalid,
  disabled,
}: {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  onBlur: () => void;
  invalid?: boolean;
  disabled?: boolean;
}) {
  const { t } = useLocale();
  return (
    <InputGroup className="w-full has-[>textarea]:h-10 lg:max-w-md lg:min-w-0 lg:flex-1">
      <InputGroupAddon>
        <Search />
      </InputGroupAddon>
      <InputGroupTextarea
        className="h-full min-h-0 field-sizing-fixed overflow-y-auto py-[7px] leading-6"
        rows={1}
        placeholder={t("Enter a keyword")}
        aria-label={t("Keywords")}
        aria-invalid={invalid || undefined}
        disabled={disabled}
        value={value}
        onBlur={onBlur}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={(event) => {
          // Keep the toolbar height stable; pasted/Shift+Enter lines scroll.
          if (
            event.key === "Enter" &&
            !event.shiftKey &&
            !event.nativeEvent.isComposing
          ) {
            event.preventDefault();
            onSubmit();
          }
        }}
      />
    </InputGroup>
  );
}
