const { UpdateCommand } = require('@aws-sdk/lib-dynamodb');
const { docClient } = require('./dynamo');
const { NUM_COMPETITORS, VALID_REFS, TABLE_NAME } = require('./constants');
const { json } = require('./response');
const { isValidRating } = require('./validate');

exports.handler = async (event) => {
  let body;
  try {
    body = JSON.parse(event.body || '{}');
  } catch {
    return json(400, { error: 'invalid_json' });
  }

  const competitorId = parseInt(body.competitorId, 10);
  const refereeId = body.refereeId;
  const score = body.score;

  if (!isValidRating({ competitorId, refereeId, score }, NUM_COMPETITORS, VALID_REFS)) {
    return json(400, { error: 'invalid_rating' });
  }

  if (score === null) {
    await docClient.send(new UpdateCommand({
      TableName: TABLE_NAME,
      Key: { id: competitorId },
      UpdateExpression: 'REMOVE #ref',
      ExpressionAttributeNames: { '#ref': refereeId },
    }));
  } else {
    await docClient.send(new UpdateCommand({
      TableName: TABLE_NAME,
      Key: { id: competitorId },
      UpdateExpression: 'SET #ref = :score',
      ExpressionAttributeNames: { '#ref': refereeId },
      ExpressionAttributeValues: { ':score': score },
    }));
  }

  return json(200, { competitorId, refereeId, score });
};
