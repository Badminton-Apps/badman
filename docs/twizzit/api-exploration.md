# API exploration

## Overview

Exploration notes for the Twizzit API (Badman sync): key observations, example endpoint responses, and a consolidated list of extra fields.

## Key observations

- Authentication works → JWT returned
- Use the JWT in the `Authorization` header on subsequent requests (`Bearer <token>`)
- In `memberships`, there is only one `club-id`
- There are `membershipTypes` as well (Youth, unbound, competitive, …)
- Extra fields live on a `contact` under `extra-field-values`
    - `extraField` defines which field it is
    - `value` contains the stored value (and optional attribute values)

## Endpoints & sample responses

### GET /organizations

Use the returned `id` to query other endpoints, e.g.:
`?organization-ids%5B%5D=34245'`

```jsx
[
  {
    "id": 34245,
    "name": "Badminton Belgium"
  }
]
```

### GET /contacts

```jsx
[
  {
    "id": 6348752,
    "name": "Pieter-Jan Caestecker",
    "date-of-birth": "1990-12-12",
    "gender": "M",
    "nationality": "BE",
    "language": "nl",
    "account-number": null,
    "registry-number": null,
    "number": null,
    "email-1": {
      "target": "Work",
      "email": "Pieterjan@badmintonvlaanderen.be"
    },
    "email-2": {
      "target": null,
      "email": "caestecker_pieter_jan@hotmail.com"
    },
    "email-3": {
      "target": null,
      "email": ""
    },
    "mobile-1": {
      "target": "Personal",
      "cc": "32",
      "number": "498789683"
    },
    "mobile-2": {
      "target": null,
      "cc": null,
      "number": ""
    },
    "mobile-3": {
      "target": null,
      "cc": null,
      "number": ""
    },
    "phone": {
      "target": "Home",
      "cc": null,
      "number": ""
    },
    "address": {
      "street": "Koningsbaan",
      "number": "11",
      "box": "002",
      "postalCode": "2580",
      "city": "Beerzel",
      "country": {
        "EN": "Belgium",
        "NL": "Belgium",
        "FR": "Belgium"
      }
    },
    "has-profile-image": false,
    "extra-field-values": [
      {
        "extraField": {
          "id": 41763,
          "name": {
            "EN": "Member ID",
            "NL": "Member ID",
            "FR": "Member ID"
          },
          "type": "Text",
          "location": "Contact",
          "extraFieldAttributes": []
        },
        "value": {
          "value": "50082790",
          "attributes": []
        }
      },
      {
        "extraField": {
          "id": 41297,
          "name": {
            "EN": "Responsable",
            "NL": "Wedstrijdleider",
            "FR": "Responsable interclubs"
          },
          "type": "Multiple select",
          "location": "Contact",
          "extraFieldAttributes": [
            {
              "id": 1907,
              "name": "Behaald op/Obtenu le",
              "type": "Date"
            }
          ]
        },
        "value": {
          "value": "Wedstrijdleider/Responsable interclubs",
          "attributes": [
            {
              "attribute-id": 1907,
              "value": "2021-08-04"
            }
          ]
        }
      },
      {
        "extraField": {
          "id": 41654,
          "name": {
            "EN": "VOTAS-ID",
            "NL": "VOTAS-ID",
            "FR": "VOTAS-ID"
          },
          "type": "Text",
          "location": "Contact",
          "extraFieldAttributes": []
        },
        "value": {
          "value": "22BB9651-9CF4-4454-B572-FF8BB00DE558",
          "attributes": []
        }
      },
      {
        "extraField": {
          "id": 41300,
          "name": {
            "EN": "API degree",
            "NL": "API-diploma",
            "FR": "Diplôme délégué éthique"
          },
          "type": "Multiple select",
          "location": "Contact",
          "extraFieldAttributes": [
            {
              "id": 1910,
              "name": "Behaald op/Obtenu le",
              "type": "Date"
            }
          ]
        },
        "value": {
          "value": "Club-API/Délégué éthique «	Vivons Sport	*",
          "attributes": []
        }
      }
    ]
  },
  {
    "id": 6349177,
    "name": "Morgane Demo",
    "date-of-birth": "2003-02-01",
    "gender": "F",
    "nationality": "BE",
    "language": "fr",
    "account-number": null,
    "registry-number": null,
    "number": null,
    "email-1": {
      "target": null,
      "email": "demo@twizzit.be"
    },
    "email-2": {
      "target": null,
      "email": ""
    },
    "email-3": {
      "target": null,
      "email": ""
    },
    "mobile-1": {
      "target": null,
      "cc": "32",
      "number": "478123456"
    },
    "mobile-2": {
      "target": null,
      "cc": null,
      "number": ""
    },
    "mobile-3": {
      "target": null,
      "cc": null,
      "number": ""
    },
    "phone": {
      "target": "Home",
      "cc": "0",
      "number": ""
    },
    "address": {
      "street": "Grand Place",
      "number": "1",
      "box": "",
      "postalCode": "1000",
      "city": "BXL",
      "country": {
        "EN": "Belgium",
        "NL": "Belgium",
        "FR": "Belgium"
      }
    },
    "has-profile-image": false,
    "extra-field-values": []
  }
]
```

### GET /memberships

```jsx
[
  {
    "id": 6437054,
    "contact-id": 6613364,
    "membership-type-id": 51779,
    "season-id": null,
    "start-date": "2023-09-27",
    "end-date": "2024-11-07",
    "club-id": 25280,
    "extra-field-values": []
  },
  {
    "id": 6437057,
    "contact-id": 6613367,
    "membership-type-id": 51774,
    "season-id": null,
    "start-date": "2014-11-26",
    "end-date": "",
    "club-id": 25154,
    "extra-field-values": []
  },
  {
    "id": 6437060,
    "contact-id": 6463865,
    "membership-type-id": 58449,
    "season-id": null,
    "start-date": "2018-11-30",
    "end-date": "2024-11-03",
    "club-id": 24799,
    "extra-field-values": []
  }
]
```

### GET /membershipTypes

```jsx
[
  {
    "id": 51774,
    "name": {
      "EN": "Competitive member",
      "NL": "Competitiespeler",
      "FR": "Compétiteur"
    },
    "type": "Continuously",
    "duration": null,
    "duration-unit": null,
    "end-date": null,
    "transfer-date": null
  },
  {
    "id": 51779,
    "name": {
      "EN": "Recreative member",
      "NL": "Recreant",
      "FR": "Loisir"
    },
    "type": "Continuously",
    "duration": null,
    "duration-unit": null,
    "end-date": null,
    "transfer-date": null
  },
  {
    "id": 57915,
    "name": {
      "EN": "Loan player",
      "NL": "Uitgeleende speler",
      "FR": "Joueur prêté"
    },
    "type": "Seasonal",
    "duration": null,
    "duration-unit": null,
    "end-date": null,
    "transfer-date": null
  },
  {
    "id": 57920,
    "name": {
      "EN": "Non-player",
      "NL": "Niet-speler",
      "FR": "Non-joueur"
    },
    "type": "Continuously",
    "duration": null,
    "duration-unit": null,
    "end-date": null,
    "transfer-date": null
  },
  {
    "id": 57922,
    "name": {
      "EN": "Trial membership",
      "NL": "Proeflidmaatschap",
      "FR": "Affiliation à l’essai"
    },
    "type": "Fixed length",
    "duration": 21,
    "duration-unit": "Days",
    "end-date": null,
    "transfer-date": null
  },
  {
    "id": 58449,
    "name": {
      "EN": "Youth",
      "NL": "Jeugd",
      "FR": "Jeune"
    },
    "type": "Continuously",
    "duration": null,
    "duration-unit": null,
    "end-date": null,
    "transfer-date": null
  },
  {
    "id": 72908,
    "name": {
      "EN": "Unbound summer player",
      "NL": "Niet gebonden zomerspeler",
      "FR": "Joueur d'été non lié"
    },
    "type": "Fixed end date",
    "duration": null,
    "duration-unit": null,
    "end-date": "09-07",
    "transfer-date": "04-01"
  }
]
```

### GET /extra-fields (sample excerpt)

```jsx
[
  {
    "id": 40736,
    "name": {
      "EN": "Excluded until",
      "NL": "Uitgesloten tot",
      "FR": "Exclu jusqu'à"
    },
    "type": "Date",
    "location": "Contact",
    "options": [],
    "attributes": []
  },
  {
    "id": 40740,
    "name": {
      "EN": "Uittreksel strafregister geldig tot",
      "NL": "Uittreksel strafregister geldig tot",
      "FR": "Extrait de casier judiciaire valable jusqu'au"
    },
    "type": "Date",
    "location": "Contact",
    "options": [],
    "attributes": []
  }
]
```

## Extra fields — consolidated summary

### 🗓️ Date Fields (no options)

- **Excluded until** – `[]`
- **Uittreksel strafregister geldig tot** – `[]`
- **Date of affiliation to federation** – `[]`
- **Founding date** – `[]`
- **Date - Formation DEA** – `[]`

### ✅ Checkbox

- **2nd club** – `[]`

### 🔽 Single Select

- **Rechtsvorm**
    
    Options:
    
    - VZW / ASBL
    - Feit. vereniging /association de fait
- **District (LFBB)**
    
    Options:
    
    - Bruxelles-Brabant-Wallon
    - Hainaut-Namur
    - Liège-Luxembourg
- **Internationale**
    
    Options:
    
    - WH1
    - WH2
    - SL3
    - SL4
    - SU5
    - SH6
- **Classification**
    
    Options:
    
    - Sporter met autisme/Athlète avec trouble du spectre autistique
    - Blinde of slechtziende sporter/Athlète atteint d’une déficience visuelle
    - Sporter met chronische aandoening/Athlète souffrant d’une maladie chronique
    - Dove of slechthorende sporter/Athlète atteint d’une déficience auditive
    - Sporter met fysieke beperking – rolstoel/Athlète en situation d’handicap moteur - en fauteuil roulant
    - Sporter met fysieke beperking – zonder rolstoel/Athlète en situation d’handicap moteur - sans fauteuil roulant
    - Sporter met psychische kwetsbaarheid/Athlète avec trouble psychique
    - Sporter met verstandelijke beperking/Athlète en situation de déficience mentale (légère à sévere)
    - Sporter met achondroplasie/Athlète atteint d’achondroplasie
- **Province**
    
    Options:
    
    - Bruxelles
    - Brabant-Wallon
    - Hainaut
    - Namur
    - Liège
    - Luxembourg
    - West-Vlaanderen
    - Oost-Vlaanderen
    - Limburg
    - Antwerpen
    - Vlaam-Brabant

### ✅ Multiple Select

- **Club type**
    
    Options:
    
    - Competitieclub
    - Recreantenclub
- **Line judge**
    
    Options:
    
    - Lijnrechter BWF/Juge de ligne BWF
    - Lijnrechter Internationaal/Juge de ligne International
    - Lijnrechter KBBF/Juge de ligne National
    - Lijnrechter BV/Juge de ligne de Ligue
- **Assessor Referee**
    
    Options:
    
    - Assessor Referee BE/Assesseur juge-arbitre BEC Continental
    - Assessor National Referee/Assesseur juge-arbitre national
    - Assessor BV Referee/Assesseur juge-arbitre de ligue
- **Referee**
    
    Options:
    
    - Referee BWF/Juge-arbitre BWF
    - Referee BEC/Juge-arbitre BEC Continental
    - Referee A/Juge-arbitre International
    - Referee B/Juge-arbitre National
    - Referee C/Juge-arbitre de Ligue
    - Referee D/Juge-arbitre provincial
- **Umpire**
    
    Options:
    
    - Umpire A1/Arbitre BWF Certificated
    - Umpire A2/Arbitre BWF Accredited
    - Umpire A3/Arbitre BEC Certificated
    - Umpire A4/Arbitre BEC Accredited
    - Umpire A5/Arbitre International
    - Umpire B/Arbitre National
    - Umpire C/Arbitre de Ligue
    - Umpire D/Arbitre provincial
- **Assessor Umpire**
    
    Options:
    
    - Assessor Umpire BE/Assesseur arbitre BEC
    - Assessor National Umpire/Assesseur arbitre national
    - Assessor BV Umpire/Assesseur de ligue
- **Responsable**
    
    Options:
    
    - Wedstrijdleider/Responsable interclubs
- **API degree**
    
    Options:
    
    - Club-API/Délégué éthique « Vivons Sport »*
- **Coach**
    
    Options:
    
    - BWF Coach Educators - Tutor / Trainers
    - BWF coach Level 4
    - BWF coach Level 3
    - BWF coach Level 2
    - BWF coach Level 1
    - BWF Badminton Teaching certificate
- **Entraîneur LFBB**
    
    Options:
    
    - Start2Coach
    - Niveau 3
    - Entraîneur
    - Niveau 2
    - Moniteur
    - Niveau 1
    - Aide-moniteur
    - Initiateur
    - Moniteur sportif Entraîneur Badminton
    - Moniteur sportif Educateur Badminton
    - Moniteur sportif Initiateur Badminton
    - Moniteur sportif Animateur Badminton
    - Moniteur ParaBadminton
- **Degree**
    
    Options:
    
    - Bachelor LO/Régent / Bachelier en éducation physique
    - Master LO/Master en éducation physique
    - Professional children education : Psychomot’
- **Shuttle Kids**
    
    Options:
    
    - Shuttle Kids Geel
    - Shuttle Kids Oranje
    - Shuttle Kids Rood
    - Shuttle Kids Blauw
    - Shuttle Kids Paars
- **Trainer BV**
    
    Options:
    
    - Trainer A
    - Trainer B
    - Instructeur
    - Initiator
    - Start2Coach
    - Initiator G-Badminton
    - Multimovebegeleider

### ✏️ Text Fields (no options)

- **Name + address sports hall 1**
- **Name + address sports hall 2**
- **Name + address sports hall 3**
- **Email 2**
- **VOTAS-ID**
- **Member ID**
- **Migratie**