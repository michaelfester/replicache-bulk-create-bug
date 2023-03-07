import {tx} from '../../db.js';

// For this tutorial, we will use just one space. For a real application, you
// should partition your data into spaces as makes sense for your application.
export const defaultSpaceID = 'default';

export default async function init(_, res) {
  await tx(async t => {
    await t.none('drop table if exists replicache_client');
    await t.none('drop table if exists message');
    await t.none('drop table if exists space');

    // We will store our chat messages within "spaces".
    // Each space has a version that increments for each push processed.
    // Note that in many applications there is already some domain object that
    // already fills the role of a "space". In that case, that table can double
    // as the space table.
    await t.none(`create table space (
        key text not null unique primary key,
        version integer)`);
    await t.none(
      `insert into space (key, version) values ('${defaultSpaceID}', 0)`,
    );

    // Stores chat messages.
    await t.none(`create table message (
      id text primary key not null,
      space_id text not null references space(key),
      sender varchar(255) not null,
      content text not null,
      ord integer not null,
      deleted boolean not null,
      version integer not null)`);

    // Stores last mutationID processed for each Replicache client.
    await t.none(`create table replicache_client (
      id varchar(36) primary key not null,
      last_mutation_id integer not null)`);
  });
  res.send('ok');
}