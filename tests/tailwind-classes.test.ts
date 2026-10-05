import assert from "node:assert/strict";
import test from "node:test";
import { cx } from "@/lib/ui/classes";

test("caller utilities override component defaults without dropping document markers", () => {
  const classes = cx("card tw:pt-[24px] tw:rounded-[10px]", "arena-cash-panel tw:pt-[22px] tw:rounded-[12px]").split(" ");
  assert.ok(classes.includes("card"));
  assert.ok(classes.includes("arena-cash-panel"));
  assert.ok(classes.includes("tw:pt-[22px]"));
  assert.ok(classes.includes("tw:rounded-[12px]"));
  assert.ok(!classes.includes("tw:pt-[24px]"));
  assert.ok(!classes.includes("tw:rounded-[10px]"));
});

test("resizing a panel heading retains its explicit line height", () => {
  const classes = cx("tw:[&_h2]:text-[1.35rem] tw:[&_h2]:leading-[1.2]", "tw:[&_h2]:text-[1rem]");
  assert.match(classes, /tw:\[&_h2\]:leading-\[1\.2\]/);
  assert.match(classes, /tw:\[&_h2\]:text-\[1rem\]/);
  assert.doesNotMatch(classes, /1\.35rem/);
});
