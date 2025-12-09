"use strict";
/**
 * DataFactory provides utilities for generating test data
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.DataFactory = void 0;
class DataFactory {
    /**
     * Generate a unique email address
     */
    static generateEmail(prefix = "test", domain = "example.com") {
        const timestamp = Date.now();
        const random = Math.random().toString(36).substring(2, 9);
        return `${prefix}-${timestamp}-${random}@${domain}`;
    }
    /**
     * Generate a unique member ID
     */
    static generateMemberId(prefix = "TEST") {
        const timestamp = Date.now();
        const random = Math.random().toString(36).substring(2, 9);
        return `${prefix}-${timestamp}-${random}`;
    }
    /**
     * Generate a random name
     */
    static generateName() {
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
    /**
     * Generate a name from predefined lists (deterministic based on index)
     */
    static generateNameAtIndex(index) {
        const firstNames = [
            "Alice",
            "Bob",
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
            "Noah",
            "Olivia",
        ];
        const lastNames = [
            "Johnson",
            "Smith",
            "Brown",
            "Williams",
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
            "Martin",
        ];
        return {
            firstName: firstNames[index % firstNames.length],
            lastName: lastNames[index % lastNames.length],
        };
    }
    /**
     * Generate a club name
     */
    static generateClubName(index = 1) {
        const names = ["Awesome", "Champions", "Victory", "Elite", "Premier", "United", "City"];
        return `${names[index % names.length]} Club ${index}`;
    }
    /**
     * Get current season (September to April)
     */
    static getSeason(date = new Date()) {
        return date.getMonth() >= 8 ? date.getFullYear() : date.getFullYear() - 1;
    }
    /**
     * Generate a date for encounters
     */
    static generateDate(season, monthOffset = 0) {
        const month = ((9 + monthOffset - 1) % 12) + 1; // Wrap around 1-12
        const day = 15 + (monthOffset % 15); // Days 15-29
        return new Date(season, month - 1, day);
    }
}
exports.DataFactory = DataFactory;
