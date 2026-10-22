import { describe, expect, it } from "vitest";
import {
  searchGoogleLanguages,
  searchGoogleLocations,
} from "./googleTargetingSearch";
import type { GoogleKeywordLocation } from "@/types/schemas/google-keyword-targeting";

const languages = [
  { id: "1000", name: "English", code: "en", targetable: true },
  { id: "1001", name: "German", code: "de", targetable: true },
];

const translate = (name: string) => (name === "United States" ? "美国" : name);

describe("Google targeting search", () => {
  it.each(["英文", "英语", "en", " ENGLISH ", "engish"])(
    "resolves %s to the English API target without changing its ID",
    (query) => {
      expect(searchGoogleLanguages(languages, query, (name) => name)).toEqual([
        languages[0],
      ]);
    },
  );

  it("does not offer a non-targetable language even if its alias matches", () => {
    expect(
      searchGoogleLanguages(
        [{ ...languages[0], targetable: false }],
        "英文",
        (name) => name,
      ),
    ).toEqual([]);
  });

  it("ranks a country's alias ahead of partial city matches and removes duplicate aliases", () => {
    const city: GoogleKeywordLocation = {
      id: "1016367",
      name: "New York",
      canonicalName: "New York,New York,United States",
      targetType: "City",
      countryCode: "US",
      status: "ENABLED",
    };
    const country: GoogleKeywordLocation = {
      ...city,
      id: "2840",
      name: "United States",
      canonicalName: "United States",
      targetType: "Country",
    };
    expect(searchGoogleLocations([city, country], "USA", translate)).toEqual([
      country,
    ]);
    expect(searchGoogleLocations([city, country], "美国", translate)).toEqual([
      country,
    ]);
    expect(
      searchGoogleLocations([city, country], "United States", translate).map(
        (item) => item.id,
      ),
    ).toEqual([country.id, city.id]);
  });
});
