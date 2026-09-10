import path from "path";

const pug = require("pug");

const TEMPLATE_PATH = path.join(__dirname, "html.pug");

const baseLocals = {
  contact: "Jeroen Casier",
  date: "zondag 6 september 2026 13:00",
  encounter: { home: { name: "Den Dijk 2G" }, away: { name: "W&L BV 5G" } },
  settingsSlug: "jeroen",
  comments: [],
  externalLink: false,
  translate: (k: string) => k,
};

describe("hasComment pug template", () => {
  let render: (locals: Record<string, unknown>) => string;

  beforeAll(() => {
    render = pug.compileFile(TEMPLATE_PATH);
  });

  it("links to the encounter itself for a comment placed in badman", () => {
    const html = render({
      ...baseLocals,
      url: "https://badman.app/my-club/club-1/change-encounter/enc-1",
    });

    expect(html).toContain("Ga naar ontmoeting");
    expect(html).not.toContain("toernooi.nl");
  });

  it("labels the link as toernooi.nl when the comment lives there", () => {
    const html = render({
      ...baseLocals,
      externalLink: true,
      url: "https://www.toernooi.nl/sport/teammatch.aspx?id=E0230E0A&match=752",
      comments: [
        {
          message: "Scores manueel ingegeven",
          user: "BC Den Dijk",
          date: "zo 6-9-2026 16:16",
        },
      ],
    });

    expect(html).toContain("Bekijk de opmerking op toernooi.nl");
    expect(html).not.toContain("Ga naar ontmoeting");
  });

  it("renders the comment content when it is known", () => {
    const html = render({
      ...baseLocals,
      url: "https://www.toernooi.nl/sport/teammatch.aspx?id=E0230E0A&match=750",
      externalLink: true,
      comments: [
        { message: "Badman app werkte niet goed", user: "LoB bc", date: "ma 7-9-2026 12:10" },
      ],
    });

    expect(html).toContain("Badman app werkte niet goed");
    expect(html).toContain("LoB bc");
    expect(html).toContain("ma 7-9-2026 12:10");
  });

  it("renders without comments (chat notification, or comment could not be read)", () => {
    const html = render({
      ...baseLocals,
      url: "https://badman.app/my-club/club-1/change-encounter/enc-1",
    });

    expect(html).toContain("heeft een opmerking");
    expect(html).toContain("Den Dijk 2G");
  });
});
