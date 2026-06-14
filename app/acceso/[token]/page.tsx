import { BlockedView } from "./blocked-view"
import { ClaimView } from "./claim-view"
import { loadPaseByToken } from "./load"
import { PaseView } from "./pase-view"

export default async function Page({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params
  const result = await loadPaseByToken(token)

  if (result.kind === "blocked") {
    return <BlockedView reason={result.reason} message={result.message} />
  }

  if (result.kind === "claim") {
    return (
      <ClaimView
        token={token}
        areaNombre={result.areaNombre}
        asamblea={result.asamblea}
      />
    )
  }

  return <PaseView pase={result.pase} />
}
