import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function TelnyxPanel({
  configured,
  phoneNumber,
  webhookUrl,
  hasPublicKey,
}: {
  configured: boolean;
  phoneNumber: string | null;
  webhookUrl: string;
  hasPublicKey: boolean;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Telnyx messaging</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        <p>
          Status:{" "}
          <strong>{configured ? "Connected" : "Mock mode (messages are saved, not sent)"}</strong>
        </p>
        {phoneNumber ? <p>Number: {phoneNumber}</p> : null}
        <p>
          Webhook URL for your Telnyx messaging profile:
          <br />
          <code className="bg-muted rounded px-1.5 py-0.5 break-all">{webhookUrl}</code>
        </p>
        {!hasPublicKey ? (
          <p className="text-muted-foreground">
            Add TELNYX_PUBLIC_KEY to .env.local so incoming webhooks are verified.
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}
