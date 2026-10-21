import { useState } from "react";
import { Check, CheckCheck, ChevronLeft, Inbox as InboxIcon } from "lucide-react";
import { Avatar, Empty, Pill } from "../../components/ui";
import { initialInbox } from "./data";
import { Filters, PreviewPage } from "./shared";
import { Button, buttonVariants } from "@/components/ui/button";

export function Inbox() {
  const [items, setItems] = useState(initialInbox);
  const [filter, setFilter] = useState("All");
  const [selected, setSelected] = useState<string | null>("n1");
  const [detailOpen, setDetailOpen] = useState(false);
  const unread = items.filter((item) => item.unread && !item.resolved).length;
  const visible = items.filter((item) =>
    filter === "Resolved"
      ? item.resolved
      : !item.resolved && (filter === "All" || (filter === "Unread" ? item.unread : item.category === filter)),
  );
  const current = items.find((item) => item.id === selected);

  function open(id: string) {
    setSelected(id);
    setDetailOpen(true);
    setItems((items) => items.map((item) => (item.id === id ? { ...item, unread: false } : item)));
  }

  return (
    <PreviewPage
      title="Inbox"
      description="The things that need a person at the desk."
      actions={
        <Button
          variant="secondary"
          size="sm"
          type="button"
          disabled={!unread}
          onClick={() => setItems((items) => items.map((item) => ({ ...item, unread: false })))}
        >
          <CheckCheck aria-hidden="true" />
          Mark all read
        </Button>
      }
    >
      <section className="preview-inbox" aria-label="Inbox" data-detail-open={detailOpen}>
        <div className="preview-inbox__list">
          <div className="preview-panel-head">
            <h2>
              Updates <span className="preview-count">{unread}</span>
            </h2>
            <span className="muted">Today</span>
          </div>
          <Filters
            values={["All", "Unread", "Payments", "Memberships", "Desk", "Resolved"]}
            value={filter}
            onChange={setFilter}
            label="Filter updates"
          />
          <div className="preview-inbox__messages">
            {visible.length ? (
              visible.map((item) => (
                <button
                  type="button"
                  key={item.id}
                  className="preview-message"
                  data-selected={selected === item.id}
                  onClick={() => open(item.id)}
                >
                  <span
                    className="preview-message__dot"
                    data-unread={item.unread}
                    aria-label={item.unread ? "Unread" : undefined}
                  />
                  <span className="preview-message__copy">
                    <span className="preview-message__meta">
                      <b>{item.category}</b>
                      <time>{item.time}</time>
                    </span>
                    <strong>{item.title}</strong>
                    <span>
                      {item.name} · {item.detail}
                    </span>
                  </span>
                </button>
              ))
            ) : (
              <Empty title="You’re all caught up" icon={InboxIcon}>
                <p>No updates in this view.</p>
              </Empty>
            )}
          </div>
          <p className="preview-footnote">Preview updates. Actions reset when you leave this page.</p>
        </div>
        <div className="preview-inbox__detail" aria-label="Selected update">
          <button
            type="button"
            className={`${buttonVariants({ variant: "ghost", size: "sm" })} preview-inbox__back`}
            onClick={() => setDetailOpen(false)}
          >
            <ChevronLeft aria-hidden="true" />
            All updates
          </button>
          {current ? (
            <>
              <div className="preview-detail__meta">
                <Pill tone={current.resolved ? "good" : "neutral"}>
                  {current.resolved ? "Resolved" : current.category}
                </Pill>
                <span>{current.time}</span>
              </div>
              <h2 className="preview-detail__title">{current.title}</h2>
              <div className="preview-person">
                <Avatar name={current.name} />
                <div>
                  <strong>{current.name}</strong>
                  <p>Member update</p>
                </div>
              </div>
              <p className="preview-detail__body">{current.detail}</p>
              <div className="preview-detail__note">
                <InboxIcon aria-hidden="true" />
                <p>This is a sample update. No member will be contacted.</p>
              </div>
              <Button
                variant="secondary"
                type="button"
                onClick={() =>
                  setItems((items) =>
                    items.map((item) =>
                      item.id === current.id ? { ...item, resolved: !item.resolved, unread: false } : item,
                    ),
                  )
                }
              >
                <Check aria-hidden="true" />
                {current.resolved ? "Move back to inbox" : "Mark resolved"}
              </Button>
            </>
          ) : (
            <Empty title="Select an update">
              <p>Its details will appear here.</p>
            </Empty>
          )}
        </div>
      </section>
    </PreviewPage>
  );
}
