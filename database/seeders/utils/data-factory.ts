/**
 * DataFactory provides utilities for generating test data
 */

export class DataFactory {
  /**
   * Generate a unique email address
   */
  static generateEmail(prefix = "test", domain = "example.com"): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 9);
    return `${prefix}-${timestamp}-${random}@${domain}`;
  }

  /**
   * Generate a unique member ID
   */
  static generateMemberId(prefix = "TEST"): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 9);
    return `${prefix}-${timestamp}-${random}`;
  }

  /**
   * Generate a random name
   */
  static generateName(): { firstName: string; lastName: string } {
    const firstNames = [
      "John",
      "Jane",
      "Bob",
      "Alice",
      "Charlie",
      "Diana",
      "Eve",
      "Frank",
      "Grace",
      "Henry",
      "Ivy",
      "Jack",
      "Kate",
      "Liam",
      "Mia",
    ];
    const lastNames = [
      "Doe",
      "Smith",
      "Johnson",
      "Williams",
      "Brown",
      "Davis",
      "Miller",
      "Wilson",
      "Moore",
      "Taylor",
      "Anderson",
      "Thomas",
      "Jackson",
      "White",
      "Harris",
    ];
    return {
      firstName: firstNames[Math.floor(Math.random() * firstNames.length)],
      lastName: lastNames[Math.floor(Math.random() * lastNames.length)],
    };
  }

  /** Male first names for seeded players */
  static readonly MALE_FIRST_NAMES = [
    "Adam", "Alexander", "Ben", "Bram", "Daan", "David", "Erik", "Finn",
    "Florian", "Hendrik", "Jasper", "Jens", "Joris", "Koen", "Lars", "Lucas",
    "Maarten", "Niels", "Pieter", "Ruben", "Simon", "Stijn", "Thomas", "Wout",
  ] as const;

  /** Female first names for seeded players */
  static readonly FEMALE_FIRST_NAMES = [
    "Anna", "Charlotte", "Emma", "Eva", "Femke", "Hannah", "Laura", "Lotte",
    "Lynn", "Marie", "Nina", "Noa", "Olivia", "Sara", "Sophie", "Lisa",
    "Julie", "Jade", "Amber", "Fien", "Lien", "Lore", "Nore", "Silke",
  ] as const;

  /** Last names for seeded players (shared across genders) */
  static readonly LAST_NAMES = [
    "Aerts", "Bakker", "Claes", "De Cock", "Dubois", "Jacobs", "Janssens",
    "Maes", "Martin", "Peeters", "Simon", "Thomas", "Wouters", "Willems",
    "Vandenberghe", "Verhoeven", "De Smet", "Hermans", "Lambert", "Laurent",
    "Leroy", "Moreau", "Petit", "Robert", "Bernard", "Bonnet", "Garnier",
    "Faure", "André", "Lefebvre",
  ] as const;

  /**
   * Generate a name from predefined lists (deterministic based on index).
   * First name is chosen from male or female list based on gender; last name from shared list.
   */
  static generateNameAtIndex(
    index: number,
    gender: "M" | "F"
  ): { firstName: string; lastName: string } {
    const firstNames =
      gender === "M" ? this.MALE_FIRST_NAMES : this.FEMALE_FIRST_NAMES;
    return {
      firstName: firstNames[index % firstNames.length],
      lastName: this.LAST_NAMES[index % this.LAST_NAMES.length],
    };
  }

  /**
   * Generate a club name
   */
  static generateClubName(index = 1): string {
    const names = ["Awesome", "Champions", "Victory", "Elite", "Premier", "United", "City"];
    return `${names[index % names.length]} Club ${index}`;
  }

  /**
   * Get current season (September to April)
   */
  static getSeason(date = new Date()): number {
    return date.getMonth() >= 8 ? date.getFullYear() : date.getFullYear() - 1;
  }

  /**
   * Generate a date for encounters
   */
  static generateDate(season: number, monthOffset = 0): Date {
    const month = ((9 + monthOffset - 1) % 12) + 1; // Wrap around 1-12
    const day = 15 + (monthOffset % 15); // Days 15-29
    return new Date(season, month - 1, day);
  }
}
