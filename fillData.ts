import creds from "./creds.json";
import moment from "moment";
import _ from "lodash";
import { google } from "googleapis";
import { parseValue } from "./utils";

const client = new google.auth.JWT(creds.client_email, null, creds.private_key, [
  "https://www.googleapis.com/auth/spreadsheets",
]);

const startRow = 725;
const endRow = 878;

const features = [
  "Date",
  "HomeTeam",
  "AwayTeam",
  "HomeGoals",
  "AwayGoals",
  "FTR",
  "Over2.5",
  "HomeOdd",
  "DrawOdd",
  "AwayOdd",
  "Over2.5Odd",
  "Under2.5Odd",
];

type Game = {
  Date: any;
  HomeTeam: any;
  AwayTeam: any;
  HomeGoals: any;
  AwayGoals: any;
  FTR: any;
  "Over2.5": any;
  HomeOdd: any;
  DrawOdd: any;
  AwayOdd: any;
  "Over2.5Odd": any;
  "Under2.5Odd": any;
  previousGamesHomeTeam: [];
  previousGamesAwayTeam: [];
  last5gamesHomeTeam: [];
  last5gamesAwayTeam: [];
  HomeTeamTotalGoals: number;
  AwayTeamTotalGoals: number;
  AvgGoalsHomeTeam: number;
  AvgGoalsAwayTeam: number;
  HomeTeamTotalGoalsPerGame: number[],
  AwayTeamTotalGoalsPerGame: number[],
};

const gameToResult = (team, game) => {
  if (game.FTR === "D") return "D";

  if (game.HomeTeam === team) {
    if (game.HomeGoals > game.AwayGoals) return "W";
    else return "L";
  } else if (game.AwayTeam === team) {
    if (game.HomeGoals < game.AwayGoals) return "W";
    else return "L";
  }
};

const gameToTeamGoal = (team, game) => {
  if (game.HomeTeam === team) return game.HomeGoals;
  return game.AwayGoals;
};

client.authorize(async function(err, token) {
  if (err) {
    console.error(err);
    return;
  } else {
    console.log("Connected to Google Sheets");
  }

  const sheets = google.sheets({
    version: "v4",
    auth: client,
  });

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: "1WsV2i8pJMkaU476lhClufsev6olvF_z70fDhkonC1JY",
    range: `TrainingSet!A${startRow}:L${endRow}`,
  });

  let games = response.data.values.map(d =>
    features.reduce((obj, key, index) => {
      obj[key] = d[index];
      return obj;
    }, {}),
  );

  games = games.map((obj: Game) => ({
    ...obj,
    HomeOdd: parseValue(obj.HomeOdd),
    AwayOdd: parseValue(obj.AwayOdd),
    DrawOdd: parseValue(obj.DrawOdd),
    HomeGoals: parseInt(obj.HomeGoals),
    AwayGoals: parseInt(obj.AwayGoals),
    "Over2.5Odd": parseValue(obj["Over2.5Odd"]),
    "Under2.5Odd": parseValue(obj["Under2.5Odd"]),
  }));

  const gamesPerTeam = {};

  games.forEach((game: Game) => {
    gamesPerTeam[game.HomeTeam] = gamesPerTeam[game.HomeTeam] || [];
    gamesPerTeam[game.HomeTeam].push(game);
    gamesPerTeam[game.AwayTeam] = gamesPerTeam[game.AwayTeam] || [];
    gamesPerTeam[game.AwayTeam].push(game);
  });

  games = games.map((game: Game) => ({
    ...game,
    dateTimeStamp: moment(game.Date, "D/M/Y").toISOString(),
    previousGamesHomeTeam: gamesPerTeam[game.HomeTeam]
      .filter(g => moment(g.Date, "D/M/Y").isBefore(moment(game.Date, "D/M/Y"))),
    previousGamesAwayTeam: gamesPerTeam[game.AwayTeam].filter(g =>
      moment(g.Date, "D/M/Y").isBefore(moment(game.Date, "D/M/Y")),
    ),
  }));

  games = games.map((game: Game) => ({
    ...game,
    last5gamesHomeTeam: game.previousGamesHomeTeam.slice(-5),
    last5gamesAwayTeam: game.previousGamesAwayTeam.slice(-5),
  }));

  games = games.map((game: Game) => ({
    ...game,
    HomeTeamTotalGoalsPerGame: game.previousGamesHomeTeam.map((g: Game) => gameToTeamGoal(game.HomeTeam, g)),
    AwayTeamTotalGoalsPerGame: game.previousGamesAwayTeam.map((g: Game) => gameToTeamGoal(game.AwayTeam, g)),
  }));

  games = games.map((game: Game) => ({
    ...game,
    last5gamesHomeTeamResults: game.last5gamesHomeTeam.map((g: Game) => gameToResult(game.HomeTeam, g)),
    last5gamesAwayTeamResults: game.last5gamesAwayTeam.map((g: Game) => gameToResult(game.AwayTeam, g)),
    HomeTeamTotalGoals: _.sum(game.HomeTeamTotalGoalsPerGame, 0),
    AwayTeamTotalGoals: _.sum(game.AwayTeamTotalGoalsPerGame, 0),
  }));

  games = games.map((game: Game) => ({
    ...game,
    AvgGoalsHomeTeam: game.previousGamesHomeTeam.length
      ? game.HomeTeamTotalGoals / game.previousGamesHomeTeam.length
      : 0,
    AvgGoalsAwayTeam: game.previousGamesAwayTeam.length
      ? game.AwayTeamTotalGoals / game.previousGamesAwayTeam.length
      : 0,
  }));

  const updateHomeTeamTotalGoals = {
    spreadsheetId: "1WsV2i8pJMkaU476lhClufsev6olvF_z70fDhkonC1JY",
    range: `TrainingSet!M${startRow}`,
    valueInputOption: "USER_ENTERED",
    resource: {
      values: [...games.map((g: Game, i) => [g.HomeTeamTotalGoals])],
    },
  };

  var updateResponse = await sheets.spreadsheets.values.update(updateHomeTeamTotalGoals);
  console.log(updateResponse.status);

  const updateAwayTeamTotalGoals = {
    spreadsheetId: "1WsV2i8pJMkaU476lhClufsev6olvF_z70fDhkonC1JY",
    range: `TrainingSet!N${startRow}`,
    valueInputOption: "USER_ENTERED",
    resource: {
      values: [...games.map((g: Game, i) => [g.AwayTeamTotalGoals])],
    },
  };

  var updateResponse = await sheets.spreadsheets.values.update(updateAwayTeamTotalGoals);
  console.log(updateResponse.status);

  const updateGoalsPerGameHomeTeamBeforeTheGame = {
    spreadsheetId: "1WsV2i8pJMkaU476lhClufsev6olvF_z70fDhkonC1JY",
    range: `TrainingSet!O${startRow}`,
    valueInputOption: "USER_ENTERED",
    resource: {
      values: [...games.map((g: Game, i) => [g.AvgGoalsHomeTeam])],
    },
  };

  var updateResponse = await sheets.spreadsheets.values.update(updateGoalsPerGameHomeTeamBeforeTheGame);
  console.log(updateResponse.status);

  const updateGoalsPerGameAwayTeamBeforeTheGame = {
    spreadsheetId: "1WsV2i8pJMkaU476lhClufsev6olvF_z70fDhkonC1JY",
    range: `TrainingSet!P${startRow}`,
    valueInputOption: "USER_ENTERED",
    resource: {
      values: [...games.map((g: Game, i) => [g.AvgGoalsAwayTeam])],
    },
  };

  var updateResponse = await sheets.spreadsheets.values.update(updateGoalsPerGameAwayTeamBeforeTheGame);
  console.log(updateResponse.status);
});
