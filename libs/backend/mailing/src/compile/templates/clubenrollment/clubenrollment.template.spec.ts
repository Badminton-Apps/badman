import path from "path";
 
const pug = require("pug");

const TEMPLATE_PATH = path.join(__dirname, "html.pug");

const baseLocals = {
  years: "2026-2027",
  locations: [],
  comments: [],
  settingsSlug: "test-slug",
  translate: (k: string) => k,
  moment: (d: Date | string) => ({ format: () => String(d) }),
};

describe("clubenrollment pug template", () => {
  let render: (locals: Record<string, unknown>) => string;

  beforeAll(() => {
    render = pug.compileFile(TEMPLATE_PATH);
  });

  it("renders successfully for a team with a complete entry", () => {
    const html = render({
      ...baseLocals,
      club: {
        teams: [
          {
            name: "Team A",
            type: "M",
            email: "captain@example.com",
            phone: "+32",
            entry: {
              subEventCompetition: {
                name: "Sub Sub",
                eventCompetition: { name: "Event Comp" },
              },
              meta: {
                competition: {
                  players: [
                    {
                      firstName: "Player",
                      lastName: "One",
                      memberId: "M1",
                      single: 5,
                      double: 5,
                    },
                  ],
                },
              },
            },
            captain: { firstName: "Cap", lastName: "Tain" },
          },
        ],
      },
    });

    expect(html).toContain("Event Comp - Sub Sub");
    expect(html).toContain("Player One");
    expect(html).not.toContain("Geen afdeling gekozen");
  });

  it("renders the fallback when entry is null", () => {
    const html = render({
      ...baseLocals,
      club: {
        teams: [
          {
            name: "Team B",
            type: "M",
            email: "captain@example.com",
            phone: "+32",
            entry: null,
            captain: { firstName: "Cap", lastName: "Tain" },
          },
        ],
      },
    });

    expect(html).toContain("Geen afdeling gekozen");
  });

  it("renders the fallback when entry.meta is null and an empty basisspelers list", () => {
    const html = render({
      ...baseLocals,
      club: {
        teams: [
          {
            name: "Team C",
            type: "MX",
            email: "captain@example.com",
            phone: "+32",
            entry: { subEventCompetition: null, meta: null },
            captain: null,
          },
        ],
      },
    });

    expect(html).toContain("Geen afdeling gekozen");
    expect(html).toContain("Kapitein niet ingevuld");
    expect(html).not.toContain("Player");
  });
});
