import creds from "./creds.json";
import moment from "moment";
import _ from "lodash";
import { google } from "googleapis";
import axios from 'axios';
import cheerio from 'cheerio';

const startRow = process.argv[2];
const url = `${process.argv[3]}`;

const client = new google.auth.JWT(creds.client_email, null, creds.private_key, [
  "https://www.googleapis.com/auth/spreadsheets",
]);

async function run(url){
  const res1 = await axios(url);
  const html = res1.data;
  const $ = cheerio.load(html);
  const links = Array.from($('.arrow-details')).map((a) => `https://www.slgr.gr${$(a).attr('href')}statistics/`);
  console.log(links)
  const requests = links.map(link => axios(link));

  const responses = await Promise.all(requests);

  responses.forEach((response, i) => {
    const html = response.data;
    const $ = cheerio.load(html);
    const columns = $('.t-col');

    const scrap = {
      TotalAttemptsHomeTeam: +$(columns[9]).text().trim(),
      TotalAttemptsAwayTeam: +$(columns[11]).text().trim(),
      KicksInsideAreaHomeTeam: +$(columns[12]).text().trim(),
      KicksInsideAreaAwayTeam: +$(columns[14]).text().trim(),
      KicksOutsideAreaHomeTeam: +$(columns[15]).text().trim(),
      KicksOutsideAreaAwayTeam: +$(columns[17]).text().trim(),
      HeadersHomeTeam: +$(columns[18]).text().trim(),
      HeadersAwayTeam: +$(columns[20]).text().trim(),
      StealsHomeTeam: +$(columns[27]).text().trim(),
      StealsAwayTeam: +$(columns[29]).text().trim(),
      FoulsHomeTeam: +$(columns[30]).text().trim(),
      FoulsAwayTeam: +$(columns[32]).text().trim(),
      CornersHomeTeam: +$(columns[36]).text().trim(),
      CornersAwayTeam: +$(columns[38]).text().trim(),
      ErrorsHomeTeam: +$(columns[39]).text().trim(),
      ErrorsAwayTeam: +$(columns[41]).text().trim(),
    }

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

      const updateAwayTeamTotalGoals = {
        spreadsheetId: "1WsV2i8pJMkaU476lhClufsev6olvF_z70fDhkonC1JY",
        range: `TrainingSet!Q${+startRow + i}`,
        valueInputOption: "USER_ENTERED",
        resource: {
          values: [
            Object.keys(scrap).map(key => scrap[key])
          ],
        },
      };
    
      var updateResponse = await sheets.spreadsheets.values.update(updateAwayTeamTotalGoals);
      console.log(updateResponse.status);
    });

    console.log(scrap);
  })
}

run(url)
