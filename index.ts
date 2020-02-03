import * as tf from '@tensorflow/tfjs';
import creds from './creds.json';
import _ from 'lodash';
import { google } from 'googleapis';
import model from './model';
import trainModel from './trainModel';
import { parseValue } from './utils';

const client = new google.auth.JWT(
  creds.client_email,
  null,
  creds.private_key,
  ['https://www.googleapis.com/auth/spreadsheets']
)

client.authorize(async function(err, token){
  if(err) { 
    console.error(err);
    return;
  } else {
    console.log('Connected to Google Sheets');
  }

  const sheets = google.sheets({
    version: 'v4',
    auth: client,
  });


  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: '1WsV2i8pJMkaU476lhClufsev6olvF_z70fDhkonC1JY',
    range: "TrainingSet!A1:L868",
  });

  const features = response.data.values[0]; // first spreadsheet row
  let data = response.data.values.slice(1);
  tf.util.shuffle(data); // shuffle data inplace

  let dataToTrain = data.map(d => features.reduce((obj, key, index) => {
    obj[key] = d[index];
    return obj;
  }, {}));

  dataToTrain = dataToTrain.map(obj => ({
    ...obj,
    HomeOdd: parseValue(obj.HomeOdd),
    AwayOdd: parseValue(obj.AwayOdd),
    DrawOdd: parseValue(obj.DrawOdd),
    'Over2.5Odd': parseValue(obj['Over2.5Odd']),
    'Under2.5Odd': parseValue(obj['Under2.5Odd']),
  }))

  const teams = _.uniq(dataToTrain.map(d => d.HomeTeam));

  const trainTensor = tf.tensor2d(dataToTrain.map(d => [
    ...teams.map(t => d.HomeTeam === t),
    ...teams.map(t => d.AwayTeam === t),

  ]));

  const outputTensor = tf.tensor2d(dataToTrain.map(d => [
    d.HomeGoals + d.AwayGoals > 2.5,
  ]))

  console.log(dataToTrain[0]);
});



