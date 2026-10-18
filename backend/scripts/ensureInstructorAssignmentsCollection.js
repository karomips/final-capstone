const {
  databases,
  databaseId,
  instructorAssignmentsCollectionId
} = require('../config/appwrite');
const { IndexType, OrderBy } = require('node-appwrite');

const collectionId = instructorAssignmentsCollectionId;
const attributes = [
  { key: 'userId', size: 255 },
  { key: 'instructorId', size: 255 },
  { key: 'createdAt', size: 50 },
  { key: 'updatedAt', size: 50 }
];

const waitFor = async (description, getResource) => {
  const deadline = Date.now() + 60_000;

  while (Date.now() < deadline) {
    const resource = await getResource();
    if (resource.status === 'available') return resource;
    if (resource.status === 'failed' || resource.status === 'stuck') {
      throw new Error(`${description} is ${resource.status}.`);
    }
    await new Promise((resolve) => setTimeout(resolve, 1_000));
  }

  throw new Error(`Timed out while waiting for ${description}.`);
};

const ensureCollection = async () => {
  try {
    await databases.getCollection(databaseId, collectionId);
    console.log(`Collection "${collectionId}" already exists.`);
  } catch (error) {
    if (Number(error.code) !== 404) throw error;

    try {
      await databases.createCollection(
        databaseId,
        collectionId,
        'User Instructor Assignments',
        [],
        false
      );
      console.log(`Created private collection "${collectionId}".`);
    } catch (createError) {
      if (Number(createError.code) !== 409) throw createError;
    }
  }
};

const ensureAttribute = async ({ key, size }) => {
  try {
    await databases.getAttribute(databaseId, collectionId, key);
  } catch (error) {
    if (Number(error.code) !== 404) throw error;
    await databases.createStringAttribute(databaseId, collectionId, key, size, true);
  }

  const attribute = await waitFor(`attribute "${key}"`, () =>
    databases.getAttribute(databaseId, collectionId, key)
  );

  if (attribute.type !== 'string' || attribute.size !== size || attribute.required !== true) {
    throw new Error(`Attribute "${key}" exists with an incompatible schema.`);
  }
};

const ensureInstructorIndex = async () => {
  try {
    await databases.getIndex(databaseId, collectionId, 'instructorId');
  } catch (error) {
    if (Number(error.code) !== 404) throw error;
    await databases.createIndex(
      databaseId,
      collectionId,
      'instructorId',
      IndexType.Key,
      ['instructorId'],
      [OrderBy.Asc]
    );
  }

  const index = await waitFor('index "instructorId"', () =>
    databases.getIndex(databaseId, collectionId, 'instructorId')
  );
  if (index.type !== IndexType.Key || index.attributes?.[0] !== 'instructorId') {
    throw new Error('Index "instructorId" exists with an incompatible schema.');
  }
};

const main = async () => {
  await ensureCollection();
  for (const attribute of attributes) await ensureAttribute(attribute);
  await ensureInstructorIndex();
  console.log('Assigned-user storage is ready.');
};

main().catch((error) => {
  console.error(`Could not set up assigned-user storage: ${error.message}`);
  process.exitCode = 1;
});
