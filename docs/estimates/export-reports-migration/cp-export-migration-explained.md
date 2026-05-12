# CP File Export: What's Changing and Why

## The Current Situation

The CP file is a special file used by **Competition Planner**, the desktop software that schedules badminton competitions. This file contains all the competition data: events, clubs, teams, players, locations, and validation notes.

Currently, generating this file **only works on a Windows computer**. This is because the file format (Microsoft Access database) requires a Windows-specific technology to create. In practice, this means:

- A developer with a Windows machine had to generate the file manually
- It could not be done from the website
- If that person was unavailable, the export couldn't happen
- There was no way to automate or self-service this process

## What We're Moving To

The new approach lets anyone with the right permissions **generate the CP file directly from the website**, without needing a Windows computer or developer involvement.

### How It Works (simplified)

When you click "Export CP" on the website:

1. The backend server collects all the competition data from the database
2. It sends that data to a temporary Windows machine in the cloud (provided free by GitHub)
3. That cloud machine creates the CP file
4. You receive an email with a download link when it's ready
5. You click the link and download the file

The whole process takes a few minutes.

```
┌─────────────────────────────────────────────────────────────┐
│                        NEW SITUATION                        │
│                                                             │
│  ┌──────────┐    ┌──────────────┐    ┌───────────────────┐  │
│  │          │    │              │    │  Cloud Machine    │  │
│  │ Website  │───>│   Backend    │───>│  (Windows)        │  │
│  │          │    │   Server     │    │                   │  │
│  │ Click    │    │              │    │  Creates the      │  │
│  │ "Export" │    │ Collects all │    │  .cp file         │  │
│  │          │    │ competition  │    │                   │  │
│  └──────────┘    │ data         │    └────────┬──────────┘  │
│                  └──────────────┘             │             │
│                                               │             │
│                  ┌──────────────┐             │             │
│                  │              │<────────────┘             │
│                  │  Email with  │  File ready!              │
│                  │  download    │                           │
│                  │  link        │                           │
│                  │              │                           │
│                  └──────┬───────┘                           │
│                         │                                   │
│                  ┌──────▼───────┐                           │
│                  │              │                           │
│                  │  Download    │                           │
│                  │  .cp file    │                           │
│                  │              │                           │
│                  └──────────────┘                           │
└─────────────────────────────────────────────────────────────┘
```

## Advantages

- **Self-service:** No developer needed. Anyone with the right permissions can generate the file.
- **Available from anywhere:** Works from any computer with a browser -- no Windows required on your end.
- **Reliable:** The process is automated and tested. No manual steps that could introduce human error.
- **Secure:** Only authorized users can trigger the export and download the file.
- **Auditable:** Every generation is logged, so you can see who generated what and when.

## Possible Drawbacks

- **Not instant:** The generation takes a few minutes (typically 2-5 minutes) because the cloud machine needs to start up and process the data. You receive an email when it's done.
- **Download expires after 30 days:** The generated file is available for download for 30 days. After that, you would need to generate it again.
- **Internet required:** Since the generation happens in the cloud, you need an internet connection. The old process (running locally on a Windows machine) could theoretically work offline.

## What Data Is in the CP File?

The CP file contains everything Competition Planner needs to schedule a competition:

| Data | Description | Example |
|------|-------------|---------|
| **Events** | The competition categories | "Heren A", "Dames B", "Gemengd C" |
| **Clubs** | All participating clubs | Club name, club number, abbreviation |
| **Locations** | Playing venues | Address, postal code, city, phone number |
| **Teams** | All enrolled teams | Team name, contact person, phone, email, preferred playing day and time, preferred location |
| **Players** | All registered players per team | First name, last name, gender, member ID, ranking levels (single/double/mixed) |
| **Entries** | Which team plays in which event | Links teams to their competition category |
| **Validation Notes** | Automated checks on team enrollment | Errors found during validation (e.g., ranking issues), club comments, availability information |
| **Settings** | Competition metadata | Tournament name, director contact details |

## Frequently Asked Questions

**Q: Will the generated file be different from before?**
A: The file contains the same data in the same format. Competition Planner will read it exactly the same way.

**Q: What if the generation fails?**
A: You'll receive an email letting you know it failed. You can try again, or contact support if the problem persists.

**Q: Can multiple people generate the file at the same time?**
A: To prevent confusion, only one generation per competition can run at a time. If someone else already started one, you'll be asked to wait.

**Q: How often can I generate the file?**
A: As often as you need. There are no limits. Typically this is done once per season when all enrollments are finalized.
