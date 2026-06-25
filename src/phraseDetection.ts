const confusedCharacters = [
  ["l", "i", "1"],
  ["o", "0"],
  ["z", "2"],
  ["1", "7"],
];

const escapeRegExp = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const regexAdjustments = (rawRegexString: string) => {
  // Escape the phrase so we treat it as literal text, then replace
  // confused characters using a case-insensitive global regexp.
  let str = escapeRegExp(rawRegexString);

  confusedCharacters.forEach((list) => {
    const replacement = `(?:${list.map(escapeRegExp).join("|")})`;

    list.forEach((character) => {
      const charRe = new RegExp(escapeRegExp(character), "gi");
      str = str.replace(charRe, replacement);
    });
  });

  return str;
};

const shadowPhrases = [
  `Shield us from your shadow`,
  `shield us from your shadow`
];

export const detectShieldPhrase = (text: string) => {
  const normalized = text.trim();
  const expression = shadowPhrases.map((phrase) => regexAdjustments(phrase)).join("|");
  const regex = new RegExp(`(${expression})`, "i");

  return regex.test(normalized) || /shield.*shadow/i.test(normalized);
};

export const nextDefenseForCall = (count: number) => {
  const map: Record<number, string> = {
    1: "Block",
    2: "Block",
    3: "Res",
    4: "Block",
    5: "Block",
    6: "Disrupt",
    7: "Block",
    8: "Res",
    9: "Block",
    10: "Cade (early)",
    11: "Block",
    12: "Res",
    13: "Immort",
    14: "Disrupt",
    15: "Res",
    16: "Cade",
    17: "Cade",
  };

  return map[count] ?? "Block";
};
