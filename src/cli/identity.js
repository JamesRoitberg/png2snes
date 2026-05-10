const ANSI = Object.freeze({
  reset: "\x1b[0m",
  brightWhite: "\x1b[97m",
  red: "\x1b[31m",
  gray: "\x1b[90m",
});

const KONVERT2SNES_IDENTITY_PARTS = Object.freeze([
  [" _  __                          _   ", "____  ", "____  _   _ _____ ____"],
  ["| |/ /___  _ ____   _____ _ __ | |_", "|___ \\", "/ ___|| \\ | | ____/ ___|"],
  ["| ' // _ \\| '_ \\ \\ / / _ \\ '__|| __|", " __) ", "\\___ \\|  \\| |  _| \\___ \\"],
  ["| . \\ (_) | | | \\ V /  __/ |   | |_", " / __/", " ___) | |\\  | |___ ___) |"],
  ["|_|\\_\\___/|_| |_|\\_/ \\___|_|    \\__|", "_____|", "____/|_| \\_|_____|____/"],
]);

const SIGNATURE = "by J.Roitberg";

export const KONVERT2SNES_IDENTITY = [
  ...KONVERT2SNES_IDENTITY_PARTS.map((parts) => parts.join("")),
  SIGNATURE,
].join("\n");

function shouldUseColor(stream) {
  return stream?.isTTY === true && !Object.hasOwn(process.env, "NO_COLOR");
}

function colorize(text, color, useColor) {
  if (!useColor) return text;
  return `${color}${text}${ANSI.reset}`;
}

export function formatKonvert2SnesIdentity(stream = process.stdout) {
  const useColor = shouldUseColor(stream);
  if (!useColor) return KONVERT2SNES_IDENTITY;

  const banner = KONVERT2SNES_IDENTITY_PARTS
    .map(([konvert, two, snes]) => [
      colorize(konvert, ANSI.brightWhite, useColor),
      colorize(two, ANSI.red, useColor),
      colorize(snes, ANSI.gray, useColor),
    ].join(""))
    .join("\n");

  return `${banner}\n${colorize(SIGNATURE, ANSI.gray, useColor)}`;
}

export function printKonvert2SnesIdentity(stream = process.stdout) {
  stream.write(`${formatKonvert2SnesIdentity(stream)}\n\n`);
}
