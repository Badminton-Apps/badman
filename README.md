

# Badman


## dev

We greatly improved the development of the bodman.

you now only need docker installed

### 1. Environment values
copy `.env.example` to `.env`

And fill in the values
### 2. Install dependencies (in /code)
run: `npm run dev:install`

### 3. Start (in /code)
run: `npm run dev:up`

#### 3a First time running (in /database):
- run the migration and seeding `npx --yes sequelize-cli db:migrate && npx --yes sequelize-cli db:seed:all`
- open: http://localhost:4200/player/admin
- login with your badman credentials
- Claim the admin account

### 4. Profit
badman should be availible @ http://localhost:4000