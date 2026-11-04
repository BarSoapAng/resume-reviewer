import { expect, it } from "vitest";
import { readReviewStream } from "./api";

it("parses UTF-8 and JSON across arbitrary network chunks, ignoring duplicate events", async () => {
  const events = [{ type: "turn_start", turnId: "t", eventId: "1", reviewId: "r" }, { type: "text_delta", turnId: "t", eventId: "2", delta: "résumé" }, { type: "text_delta", turnId: "t", eventId: "2", delta: "résumé" }, { type: "turn_final", turnId: "t", eventId: "3", turn: {} }];
  const bytes = new TextEncoder().encode(events.map((e) => JSON.stringify(e)).join("\n"));
  const response = new Response(new ReadableStream({ start(controller) { for (let i = 0; i < bytes.length; i += 3) controller.enqueue(bytes.slice(i, i + 3)); controller.close(); } }));
  const received: string[] = [];
  await readReviewStream(response, (e) => received.push(e.type));
  expect(received).toEqual(["turn_start", "text_delta", "turn_final"]);
});

it("rejects interrupted streams and mismatched turn IDs", async () => {
  await expect(readReviewStream(new Response('{"type":"turn_start","turnId":"t","eventId":"1","reviewId":"r"}\n'), () => undefined)).rejects.toThrow("interrupted");
  const body = [{ type: "turn_start", turnId: "t", eventId: "1" }, { type: "turn_final", turnId: "other", eventId: "2" }].map((v) => JSON.stringify(v)).join("\n");
  await expect(readReviewStream(new Response(body), () => undefined)).rejects.toThrow("Invalid review stream");
});
