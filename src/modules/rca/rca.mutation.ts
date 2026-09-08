import { randomUUID } from "crypto";
import RCA from "./rca.model";
import { validId } from "./rca.validation";

/**
 * Standalone MongoDB cannot transact across RCA and action collections. Every
 * RCA/child mutation acquires this database lock, including approval/deletion.
 * No lease expiry: a paused writer must never outlive its lock and write after
 * approval. A process crash fails closed. Recover an abandoned lock only after
 * stopping its owning process and checking the parent/children; retry deletion
 * to finish any partial child cleanup. Reads never expose the lock token.
 */
export async function withRCAMutation<T>(id: string, organizationId: string, mutate: () => Promise<T>): Promise<T> {
  if (!validId(id)) throw new Error("Invalid RCA ID");
  if (!validId(organizationId)) throw new Error("Invalid organization ID");
  const token = randomUUID();
  const parent = await RCA.findOneAndUpdate(
    { _id: id, organizationId, mutationLock: { $exists: false } },
    { $set: { mutationLock: token } },
    { returnDocument: "after", timestamps: false },
  );
  if (!parent) {
    if (await RCA.exists({ _id: id, organizationId })) {
      throw new Error("RCA is being modified; retry after the current operation completes");
    }
    // Preserve existing not-found handling in each service.
    return mutate();
  }
  try {
    return await mutate();
  } finally {
    await RCA.updateOne(
      { _id: id, organizationId, mutationLock: token },
      { $unset: { mutationLock: 1 } },
      { timestamps: false },
    );
  }
}
