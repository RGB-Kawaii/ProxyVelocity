var mc = require('minecraft-protocol'); // mandatory to use the library
const states = mc.states; // we declare the var states

const srv = mc.createServer({
    'online-mode': true, // put that to false if u wanna use on cracked server
    host: '0.0.0.0', // localhost ip
    port: 25565, // server port
    keepAlive: false, // dont touch
    version: '1.8.9' // version again
})

srv.on('login', function(client) {
    console.log(client.profile.properties)
    const addr = client.socket.remoteAddress
    console.log('Incoming connection', '(' + addr + ')')
    let endedClient = false
    let endedTargetClient = false
    client.on('end', function() {
        endedClient = true
        console.log('Connection closed by client', '(' + addr + ')')
        if (!endedTargetClient) {
            targetClient.end('End')
        }
    })
    client.on('error', function(err) {
        endedClient = true
        console.log('Connection error by client', '(' + addr + ')')
        console.log(err.stack)
        if (!endedTargetClient) {
            targetClient.end('Error')
        }
    })

    // above, we log every incoming connection, closed connections & connections errors.

    const targetClient = mc.createClient({
        host: 'revils.eu', // ip address of the server u wanna play on
        port: 25565, // port of the server u wanna play on, most of them use the port 25565
        username: "", // email of the account
        password: "", // password of the account
        keepAlive: false, // dont touch that
        version: '1.8.9' // the version of ur client, there's might be an error for 1.7.10, just fix it urself
        // https://github.com/PrismarineJS/node-minecraft-protocol is the link if u wanna create an issue
        //
    })
    client.on('packet', function(data, meta) {
        if (targetClient.state === states.PLAY && meta.state === states.PLAY) {
            if (!endedTargetClient) {
                targetClient.write(meta.name, data)
            }
        }
    })
    let entityid;
    //let players = [];
    targetClient.on('packet', function(data, meta) {
        if (meta.state === states.PLAY && client.state === states.PLAY) {
            if (!endedClient) {
                client.write(meta.name, data)
                if(meta.name === 'login')
                    entityid = data.entityId; // so here we log the entityId of your Entity when you login into the server, you will see, it'll be usefull for the next part

                if (meta.name === 'set_compression') {
                    client.compressionThreshold = data.threshold
                }

                if(meta.name === 'entity_velocity' && data.entityId === entityid) // now we detect when the packet is "entity_velocity" which is the packet of the knockback.
                // we have to check if the entityid of the packet is our entityid, if we dont, some entities like the enderpearl n other shit will have some visual problems
                {
                    client.write('entity_velocity', { entityId: data.entityId, velocityX: 0, velocityY: data.velocityY, velocityZ: 0 } );
                    // we write the velocity, dont touch entity id,
                    // change VelocityX & VelocityZ for horizontal velocity 
                    // change velocityY for vertical one
                }
                
                
                /// this was some test with the entities location n shit, dont remove the line comment here
                
                // if(meta.name === 'named_entity_spawn')
                // {
                //     if (data.entityId != entityid)
                //     {
                //         if (players.some(player => player.entityId === data.entityId))
                //         {
                //             players.forEach((player) =>
                //             {
                //                 if (player.entityId == data.entityId)
                //                 {
                //                     player.x = data.x;
                //                     player.y = data.y;
                //                     player.z = data.z;
                //                 }
                //             });
                //         }
                //         else
                //         {
                //             players.push({ entityId: data.entityId, x: data.x, y: data.y, z: data.z});
                //         }
                //     }
                // }

                // if (meta.name == 'rel_entity_move')
                // {
                //     if (data.entityId != entityid)
                //     {
                //         if (players.some(player => player.entityId === data.entityId))
                //         {
                //             players.forEach((player) =>
                //             {
                //                 if (player.entityId == data.entityId)
                //                 {
                //                     player.x += data.dX;
                //                     player.y += data.dY;
                //                     player.z += data.dZ;
                //                 }
                //             });
                //         }
                //         else
                //         {
                //             players.push({ entityId: data.entityId, x: data.dX, y: data.dY, z: data.dZ});
                //         }
                //     }

                    // players.forEach((player) =>
                    // {
                    //     if (player.entityId === data.entityId)
                    //     {
                    //         player.x += data.dX;
                    //         player.y += data.dY;
                    //         player.z += data.dZ;
                    //     }
                    //     console.log(player);
                    // });
                //}
            }
        }
    })

    // some shit of https://github.com/PrismarineJS/node-minecraft-protocol/blob/master/examples/proxy/proxy.js, dont touch that except if u know what ur doing
    const bufferEqual = require('buffer-equal')
    targetClient.on('raw', function(buffer, meta) {
        if (client.state !== states.PLAY || meta.state !== states.PLAY) {
            return
        }
        const packetData = targetClient.deserializer.parsePacketBuffer(buffer).data.params
        const packetBuff = client.serializer.createPacketBuffer({
            name: meta.name,
            params: packetData
        })
        if (!bufferEqual(buffer, packetBuff)) {
            console.log('client<-server: Error in packet ' + meta.state + '.' + meta.name)
            console.log('received buffer', buffer.toString('hex'))
            console.log('produced buffer', packetBuff.toString('hex'))
            console.log('received length', buffer.length)
            console.log('produced length', packetBuff.length)
        }
    })
    client.on('raw', function(buffer, meta) {
        if (meta.state !== states.PLAY || targetClient.state !== states.PLAY) {
            return
        }
        const packetData = client.deserializer.parsePacketBuffer(buffer).data.params
        const packetBuff = targetClient.serializer.createPacketBuffer({
            name: meta.name,
            params: packetData
        })
        if (!bufferEqual(buffer, packetBuff)) {
            console.log('client->server: Error in packet ' + meta.state + '.' + meta.name)
            console.log('received buffer', buffer.toString('hex'))
            console.log('produced buffer', packetBuff.toString('hex'))
            console.log('received length', buffer.length)
            console.log('produced length', packetBuff.length)
        }
    })
    targetClient.on('end', function() {
        endedTargetClient = true
        console.log('Connection closed by server', '(' + addr + ')')
        if (!endedClient) {
            client.end('End')
        }
    })
    targetClient.on('error', function(err) {
        endedTargetClient = true
        console.log('Connection error by server', '(' + addr + ') ', err)
        console.log(err.stack)
        if (!endedClient) {
            client.end('Error')
        }
    })
});