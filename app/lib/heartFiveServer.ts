import type { Firestore } from "firebase-admin/firestore";
import { parseHeartFiveRecord } from "@/lib/heartFive";

export const recordCollection = (db: Firestore) => db.collection("heartFiveRecords");

/** Move records written by the earlier browser-only implementation behind server-only access. */
export async function migrateLegacyHeartFiveRecords(db: Firestore): Promise<void> {
  const marker = db.collection("appMigrations").doc("heartFiveRecordsV1");
  if ((await marker.get()).exists) return;
  const [rootRecords, nestedRecords] = await Promise.all([
    db.collection("clubs").where("kind", "==", "heartFive").get(),
    db.collection("clubs").doc("simgunghoe").collection("shotRecords").get(),
  ]);
  for (const old of [...rootRecords.docs, ...nestedRecords.docs]) {
    const parsed = parseHeartFiveRecord(old.id, old.data());
    if (!parsed) continue;
    const targetId = old.ref.parent.id === "shotRecords" ? `heartFive-${old.id}` : old.id;
    const target = recordCollection(db).doc(targetId);
    await db.runTransaction(async (transaction) => {
      const [source, destination] = await Promise.all([
        transaction.get(old.ref), transaction.get(target),
      ]);
      if (!source.exists) return;
      if (!destination.exists) {
        transaction.set(target, {
          ownerUid: parsed.ownerUid,
          memberId: parsed.memberId,
          memberName: parsed.memberName,
          date: parsed.date,
          place: parsed.place,
          mode: parsed.mode,
          finalized: true,
          createdAt: parsed.createdAt,
          shots: parsed.shots,
        });
      }
      transaction.delete(old.ref);
    });
  }
  await marker.set({ completedAt: new Date().toISOString() });
}
