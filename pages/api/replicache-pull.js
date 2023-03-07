import {tx} from '../../db.js';
import {defaultSpaceID} from './init.js';
import {getLastMutationID} from './replicache-push.js';

export default handlePull;

async function handlePull(req, res) {
  const pull = req.body;
  console.log(`Processing pull`, JSON.stringify(pull));
  const t0 = Date.now();

  try {
    // Read all data in a single transaction so it's consistent.
    await tx(async t => {
      // Get current version for space.
      const version = (
        await t.one('select version from space where key = $1', defaultSpaceID)
      ).version;

      // Get lmid for requesting client.
      const isExistingClient = pull.lastMutationID > 0;
      const lastMutationID = await getLastMutationID(
        t,
        pull.clientID,
        isExistingClient,
      );

      // Get changed domain objects since requested version.
      const fromVersion = pull.cookie ?? 0;
      const changed = await t.manyOrNone(
        'select id, sender, content, ord, deleted from message where version > $1',
        fromVersion,
      );

      // Build and return response.
      const patch = [];
      for (const row of changed) {
        if (row.deleted) {
          if (fromVersion > 0) {
            patch.push({
              op: 'del',
              key: `message/${row.id}`,
            });
          }
        } else {
          patch.push({
            op: 'put',
            key: `message/${row.id}`,
            value: {
              from: row.sender,
              content: row.content,
              order: parseInt(row.ord),
            },
          });
        }
      }

      res.json({
        lastMutationID,
        cookie: version,
        patch,
      });
      res.end();
    });
  } catch (e) {
    console.error(e);
    res.status(500).send(e.toString());
  } finally {
    console.log('Processed pull in', Date.now() - t0);
  }
}