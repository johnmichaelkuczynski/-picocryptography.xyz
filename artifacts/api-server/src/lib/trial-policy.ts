export function signedInLimitsAtFirstLogin(
  usage: { activeSeconds: number; actionsUsed: number },
  grants: { seconds: number; actions: number },
) {
  return {
    secondsLimit: usage.activeSeconds + grants.seconds,
    actionsLimit: usage.actionsUsed + grants.actions,
  };
}