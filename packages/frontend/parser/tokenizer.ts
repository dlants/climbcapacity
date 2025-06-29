import type {Token} from './types'

export function tokenize(input: string): Token[] {
  const tokens: Token[] = [];
  let pos = 0;

  while (pos < input.length) {
    let char = input[pos];

    if (char.match(/\s/)) {
      pos++;
      continue;
    }

    if (char.match(/[0-9]/)) {
      let num = "";
      while (char && char.match(/[0-9.]/)) {
        num += char;
        char = input[++pos];
      }
      tokens.push({ type: "number", value: num });
      continue;
    }

    if (char.match(/[a-z]/i)) {
      let id = "";
      while (char && char.match(/[a-z]/i)) {
        id += char;
        char = input[++pos];
      }
      tokens.push({ type: "identifier", value: id });
      continue;
    }

    if ("+-*/^".includes(char)) {
      tokens.push({ type: "operator", value: char });
      pos++;
      continue;
    }

    if (char === "(") {
      tokens.push({ type: "lparen", value: "(" });
      pos++;
      continue;
    }

    if (char === ")") {
      tokens.push({ type: "rparen", value: ")" });
      pos++;
      continue;
    }

    throw new Error(`Unexpected character: ${char}`);
  }

  tokens.push({ type: "eof", value: "" });
  return tokens;
}
