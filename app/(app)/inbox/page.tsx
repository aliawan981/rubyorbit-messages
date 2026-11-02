export const metadata = { title: "Inbox · RubyOrbit Messages" };

export default function InboxPage() {
  return (
    <div className="p-6">
      <h1 className="text-xl font-semibold">Inbox</h1>
      <p className="text-muted-foreground mt-2 text-sm">
        No conversations yet. Messaging arrives in Phase 2.
      </p>
    </div>
  );
}
