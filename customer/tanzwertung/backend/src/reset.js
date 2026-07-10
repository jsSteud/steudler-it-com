const { BatchWriteCommand } = require('@aws-sdk/lib-dynamodb');
const { docClient } = require('./dynamo');
const { NUM_COMPETITORS, TABLE_NAME } = require('./constants');
const { json } = require('./response');

function chunk(arr, size) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

exports.handler = async () => {
  const ids = Array.from({ length: NUM_COMPETITORS }, (_, i) => i + 1);
  const batches = chunk(ids, 25); // BatchWriteItem allows max 25 requests per call

  for (const batch of batches) {
    await docClient.send(new BatchWriteCommand({
      RequestItems: {
        [TABLE_NAME]: batch.map((id) => ({ DeleteRequest: { Key: { id } } })),
      },
    }));
  }

  return json(200, { ok: true });
};
