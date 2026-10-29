import { buildKeywordMembershipInputs } from "@/plugins/keywords/membership";
import { expect, it } from "vitest";
import type { KeywordDimension } from "@/types/schemas/keyword-dimensions";
import { decisionInputSchema } from "@/types/schemas/decision";

function dimension(
  count = 1,
  instructions = "Does the keyword explicitly belong to this category?",
): KeywordDimension {
  return {
    id: crypto.randomUUID(),
    name: "Equipment",
    labelZh: "设备",
    children: Array.from({ length: count }, (_, index) => ({
      id: crypto.randomUUID(),
      name: `Category ${index}`,
      labelZh: `分类 ${index}`,
      active: true,
      decision: { instructions },
    })),
  };
}

it("keeps independent authored membership questions and excludes inactive or unconfigured children", () => {
  const field = dimension(4);
  field.children[0].decision = {
    instructions: "Is this a coffee machine?",
    criteria: {
      true: "Explicit machine terms.",
      false: "Only a brand or root term.",
    },
  };
  field.children[1].decision = { instructions: "Is this for commercial use?" };
  field.children[2].active = false;
  field.children[3].decision = undefined;
  expect(
    buildKeywordMembershipInputs([field], "commercial espresso machine"),
  ).toEqual([
    {
      state: { keyword: "commercial espresso machine" },
      questions: Object.fromEntries(
        field.children
          .slice(0, 2)
          .map((child) => [
            `d_${child.id}`,
            { type: "noul", ...child.decision },
          ]),
      ),
    },
  ]);
});

it("splits large taxonomies at the shared question limit without dropping questions", () => {
  const field = dimension(70);
  const requests = buildKeywordMembershipInputs([field], "coffee");
  expect(
    requests.map((request) => Object.keys(request.questions).length),
  ).toEqual([32, 32, 6]);
  expect(requests.flatMap((request) => Object.keys(request.questions))).toEqual(
    field.children.map((child) => `d_${child.id}`),
  );
});

it("splits long questions by serialized size even before the question limit", () => {
  const field = dimension(20, "问".repeat(8_000));
  const requests = buildKeywordMembershipInputs([field], "coffee");
  expect(requests.length).toBeGreaterThan(1);
  expect(
    requests.flatMap((request) => Object.keys(request.questions)),
  ).toHaveLength(20);
  expect(
    requests.every((request) => decisionInputSchema.safeParse(request).success),
  ).toBe(true);
});
