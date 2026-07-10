const { ScanCommand } = require('@aws-sdk/lib-dynamodb');
const { docClient } = require('./dynamo');
const { NUM_COMPETITORS, TABLE_NAME } = require('./constants');
const { json } = require('./response');

exports.handler = async () => {
  const result = await docClient.send(new ScanCommand({ TableName: TABLE_NAME }));

  const byId = {};
  for (const item of result.Items || []) {
    byId[item.id] = item;
  }

  const ratings = {};
  for (let i = 1; i <= NUM_COMPETITORS; i++) {
    const item = byId[i] || {};
    ratings[i] = {
      referee1: item.referee1 ?? null,
      referee2: item.referee2 ?? null,
      referee3: item.referee3 ?? null,
    };
  }

  return json(200, { ratings, numCompetitors: NUM_COMPETITORS });
};
