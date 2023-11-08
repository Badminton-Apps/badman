select "Players"."id", "Players"."memberId","Players"."firstName","Players"."lastName", "Players"."gender",
"ranking"."RankingLastPlaces"."single",  "ranking"."RankingLastPlaces"."singlePoints", "ranking"."RankingLastPlaces"."singlePointsDowngrade",
"ranking"."RankingLastPlaces"."double",  "ranking"."RankingLastPlaces"."doublePoints", "ranking"."RankingLastPlaces"."doublePointsDowngrade",
"ranking"."RankingLastPlaces"."mix",  "ranking"."RankingLastPlaces"."mixPoints", "ranking"."RankingLastPlaces"."mixPointsDowngrade"

from "Players"

inner join "ranking"."RankingLastPlaces" on "Players"."id" = "ranking"."RankingLastPlaces"."playerId"

where "Players"."competitionPlayer" = true and  "ranking"."RankingLastPlaces"."systemId" = '46fc7983-669d-4e8e-a49c-a9ae5a22cbeb'
order by "Players"."memberId"