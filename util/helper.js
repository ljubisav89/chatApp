const createRoom = async function (client, name) {
    try {
        const newCollection = await client.createCollection(name);
        return newCollection
    } catch (e) { return e.response.body }

}

module.exports = { createRoom, }