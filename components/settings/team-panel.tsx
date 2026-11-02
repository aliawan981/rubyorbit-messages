"use client";

import { Loader2 } from "lucide-react";
import { useActionState } from "react";
import {
  addAgentAction,
  resetPasswordAction,
  setActiveAction,
  setRoleAction,
  type ActionState,
} from "@/app/(app)/settings/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { TeamMember } from "@/lib/team/service";

const selectClass =
  "h-9 rounded-md border border-input bg-transparent px-2 text-base md:text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

function Feedback({ state }: { state: ActionState }) {
  if (state.error)
    return (
      <p role="alert" className="text-destructive text-sm">
        {state.error}
      </p>
    );
  if (state.ok)
    return (
      <p role="status" className="text-sm text-green-700 dark:text-green-400">
        Saved.
      </p>
    );
  return null;
}

function AddAgentForm() {
  const [state, action, pending] = useActionState<ActionState, FormData>(addAgentAction, {});
  return (
    <form
      key={state.ok ? "saved" : "editing"}
      action={action}
      className="grid gap-3 sm:grid-cols-2"
    >
      <div className="space-y-1.5">
        <Label htmlFor="displayName">Name</Label>
        <Input id="displayName" name="displayName" required />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="email">Email</Label>
        <Input id="email" name="email" type="email" required />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="tmp">Temporary password</Label>
        <Input id="tmp" name="password" type="text" minLength={8} autoComplete="off" required />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="role">Role</Label>
        <select id="role" name="role" defaultValue="agent" className={`${selectClass} w-full`}>
          <option value="agent">Agent</option>
          <option value="admin">Admin</option>
        </select>
      </div>
      <div className="flex items-center gap-3 sm:col-span-2">
        <Button type="submit" disabled={pending}>
          {pending && <Loader2 className="size-4 animate-spin" />}Add team member
        </Button>
        <Feedback state={state} />
      </div>
      <p className="text-muted-foreground text-xs sm:col-span-2">
        Share the temporary password with them directly. They will be asked to choose their own at
        first sign-in.
      </p>
    </form>
  );
}

function MemberRow({ m, isSelf }: { m: TeamMember; isSelf: boolean }) {
  const [roleState, roleAction] = useActionState<ActionState, FormData>(setRoleAction, {});
  const [activeState, activeAction, activePending] = useActionState<ActionState, FormData>(
    setActiveAction,
    {},
  );
  const [pwState, pwAction, pwPending] = useActionState<ActionState, FormData>(
    resetPasswordAction,
    {},
  );
  return (
    <li className="space-y-2 rounded-lg border p-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium">
            {m.displayName}
            {isSelf && " (you)"}
          </p>
          <p className="text-muted-foreground truncate text-sm">{m.email}</p>
        </div>
        {!m.isActive && <Badge variant="secondary">Deactivated</Badge>}
        {m.mustChangePassword && <Badge variant="outline">Temp password</Badge>}
        <form action={roleAction}>
          <input type="hidden" name="userId" value={m.userId} />
          <select
            name="role"
            defaultValue={m.role}
            onChange={(e) => e.currentTarget.form?.requestSubmit()}
            className={selectClass}
            aria-label={`Role for ${m.displayName}`}
          >
            <option value="agent">Agent</option>
            <option value="admin">Admin</option>
          </select>
        </form>
        <form action={activeAction}>
          <input type="hidden" name="userId" value={m.userId} />
          <input type="hidden" name="active" value={String(!m.isActive)} />
          <Button type="submit" variant="outline" size="sm" disabled={activePending}>
            {m.isActive ? "Deactivate" : "Reactivate"}
          </Button>
        </form>
      </div>
      <form action={pwAction} className="flex flex-wrap items-center gap-2">
        <input type="hidden" name="userId" value={m.userId} />
        <Input
          name="password"
          type="text"
          minLength={8}
          placeholder="New temporary password"
          autoComplete="off"
          className="h-9 max-w-64"
          required
        />
        <Button type="submit" variant="outline" size="sm" disabled={pwPending}>
          Reset password
        </Button>
      </form>
      <Feedback
        state={
          roleState.error || roleState.ok
            ? roleState
            : activeState.error || activeState.ok
              ? activeState
              : pwState
        }
      />
    </li>
  );
}

export function TeamPanel({ members, selfId }: { members: TeamMember[]; selfId: string }) {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Add team member</CardTitle>
        </CardHeader>
        <CardContent>
          <AddAgentForm />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Team</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-3">
            {members.map((m) => (
              <MemberRow key={m.userId} m={m} isSelf={m.userId === selfId} />
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
