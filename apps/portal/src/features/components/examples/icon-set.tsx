import { ICON_NAMES, Icon } from "@/components/ui/icon";

export default function Example() {
  return (
    <ul className="gallery-icons">
      {ICON_NAMES.map((name) => (
        <li key={name}>
          <Icon name={name} size={24} />
          <span>{name}</span>
        </li>
      ))}
    </ul>
  );
}
