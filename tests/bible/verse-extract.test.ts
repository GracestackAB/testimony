import assert from "node:assert/strict";
import { parseHelloAoVerses } from "../../lib/bible/verse-extract";

const sample = [
  { type: "heading", content: ["Jesus and Nicodemus"] },
  {
    type: "verse",
    number: 16,
    content: [
      "For God so loved the world that he gave his one and only Son,",
      { noteId: 1 },
      " that whoever believes in him shall not perish but have eternal life.",
    ],
  },
];

const verses = parseHelloAoVerses(sample as Parameters<typeof parseHelloAoVerses>[0]);
assert.equal(verses.length, 1);
assert.equal(verses[0].verse, 16);
assert.ok(verses[0].text.includes("God so loved"));
assert.ok(!verses[0].text.includes("noteId"));

assert.equal(parseHelloAoVerses([]).length, 0);

console.log("verse-extract.test.ts: ok");
