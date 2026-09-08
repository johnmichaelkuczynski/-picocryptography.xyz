import type { AccessStage } from "./access";

type PublicUser = {
  id: number;
  displayName: string;
  email: string;
  isAdmin: boolean;
};

export function buildAccessState(input: {
  stage: AccessStage;
  user: PublicUser | null;
  activeSeconds: number;
  actionsUsed: number;
  secondsLimit: number;
  actionsLimit: number;
  csrfToken: string;
}) {
  return { ...input };
}

export function authenticatedOwnerCanRead(
  currentUserId: number,
  record: { userId: number | null; ownerId: string | null },
): boolean {
  return record.userId === currentUserId;
}

export function shouldReuseLoginOwner(
  priorUserId: number | null,
  nextUserId: number,
): boolean {
  return priorUserId == null || priorUserId === nextUserId;
}