import { useState } from "react";
import { ActivityFeed, CommentComposer, Subject, type FeedItem } from "@/components/parts/Activity";

const ITEMS: FeedItem[] = [
  { kind: "event", id: "1", tone: "good", time: "Today 09:43", children: <><Subject>Kennedy</Subject> fulfilled Monthly unlimited</> },
  { kind: "event", id: "2", tone: "good", time: "Today 09:42", children: <><Subject>Kennedy</Subject> recorded RM 120.00 cash</> },
  { kind: "comment", id: "3", author: "Daniel Wong", initials: "DW", time: "Today 09:41", children: "Collect the balance at the desk." },
  { kind: "event", id: "4", tone: "neutral", time: "Today 09:40", children: <><Subject>Kennedy</Subject> created the sale</> },
  { kind: "event", id: "5", tone: "warning", time: "Yesterday", children: <>Balance due <Subject>RM 410.00</Subject></> },
  { kind: "event", id: "6", tone: "neutral", time: "Yesterday", children: "Member joined" },
];

export default function Example() {
  const [added, setAdded] = useState<FeedItem[]>([]);
  return (
    <div className="gallery-stack" style={{ gap: 32 }}>
      <ActivityFeed
        visible={4}
        items={[...added, ...ITEMS]}
        composer={
          <CommentComposer
            initials="KW"
            onSubmit={(text) => setAdded((current) => [{ kind: "comment", id: `c${current.length}`, author: "Kennedy", initials: "KW", time: "Just now", children: text }, ...current])}
          />
        }
      />
      <p className="gallery-caption">Empty</p>
      <ActivityFeed items={[]} empty="Nothing has happened to this sale yet." />
      <p className="gallery-caption">Loading</p>
      <ActivityFeed items={[]} loading />
    </div>
  );
}
