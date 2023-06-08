/* eslint-disable @typescript-eslint/no-var-requires */
'use strict';

const NodeGeocoder = require('node-geocoder');
const geocoder = NodeGeocoder({
  provider: 'google',
  apiKey: 'AIzaSyDXVu9H8XXk5rOY9DhP48PHyAij0MCADZI',
});

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  up: async (queryInterface, sequelize) => {
    return queryInterface.sequelize.transaction(async (t) => {
      try {
        // add PostGIS extension
        await queryInterface.sequelize.query(
          'CREATE EXTENSION IF NOT EXISTS postgis;',
          { transaction: t }
        );

        //  add a geo point column to the locations table
        await queryInterface.addColumn(
          {
            tableName: 'Locations',
            schema: 'event',
          },
          'coordinates',
          {
            type: sequelize.DataTypes.GEOMETRY('POINT', 4326),
            allowNull: true,
          },
          { transaction: t }
        );

        console.log('Getting locations');

        // get all locations
        const [locations] = await queryInterface.sequelize.query(
          'select "id", "city", "postalcode", "state", "street", "streetNumber" from "event"."Locations" where "city" is not null and "street" is not null and "clubId" is not null;',
          { transaction: t }
        );

        console.log(`We have ${locations.length} locations`);

        // batch in groups of 20

        const batches = [];
        const batchSize = 50;

        for (let i = 0; i < locations.length; i += batchSize) {
          batches.push(locations.slice(i, i + batchSize));
        }

        console.log(`We have ${batches.length} batches`);

        // get geo points for each batch
        const results = [];

        for (const batch of batches) {
          console.log(`We are processing a batch #${batches.indexOf(batch)}`);

          const result = await geocoder.batchGeocode(
            batch.map((location) => {
              return `${location.street} ${location.streetNumber}, ${location.postalcode} ${location.city}, ${location.state}`;
            })
          );

          results.push(...result);
        }

        console.log(`We have ${results.length} results`);

        // update all locations with geo points
        const queries = results.map((result, index) => {
          const location = locations[index];

          if (!result.value.length) {
            console.log(
              `We could not find a location for ${location.street} ${location.streetNumber}, ${location.city}, ${location.state} ${location.postalcode}`
            );
            return;
          }

          return `UPDATE "event"."Locations" SET "coordinates" = ST_SetSRID(ST_MakePoint(${result.value[0].longitude}, ${result.value[0].latitude}), 4326) WHERE "id" = '${location.id}';`;
        });

        console.log(`We have ${queries.length} queries`);

        await queryInterface.sequelize.query(queries.join('\n'), {
          transaction: t,
        });
      } catch (err) {
        console.error('We errored with', err?.message ?? err);
        t.rollback();
      }
    });
  },

  down: async (queryInterface) => {
    return queryInterface.sequelize.transaction(async (t) => {
      try {

        // remove the geo point column from the locations table
        await queryInterface.removeColumn(
          {
            tableName: 'Locations',
            schema: 'event',
          },
          'coordinates',
          { transaction: t }
        );

        // remove PostGIS extension
        await queryInterface.sequelize.query(
          'DROP EXTENSION IF EXISTS postgis;',
          { transaction: t }
        );
        
      } catch (err) {
        console.error('We errored with', err);
        t.rollback();
      }
    });
  },
};
