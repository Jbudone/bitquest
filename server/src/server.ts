import fs from 'fs';
import path from 'path';
import { WorldManager } from './world';
import { ClientPacket, ServerPacket } from '../../shared/src/types';
import { STARTER_DIALOGUES } from '../../content/dialogues';
import { runAssetIngestion } from '../../tools/ingest_assets';

const PORT = Number(process.env.PORT) || 3001;
const world = new WorldManager();

interface SocketData {
  id: string;
  authenticated: boolean;
}

const sockets = new Map<string, any>();

function broadcast(packet: ServerPacket, excludeId?: string) {
  const payload = JSON.stringify(packet);
  for (const [id, ws] of sockets.entries()) {
    if (excludeId && id === excludeId) continue;
    try {
      ws.send(payload);
    } catch (e) {
      console.error(`[Server] Error sending to ${id}`, e);
    }
  }
}

// Wire world manager callbacks to broadcast updates
world.onEntityStateChanged = (entity) => {
  broadcast({
    type: 'entity_updated',
    entity
  });
};

world.onWorldFlagChanged = (key, value) => {
  broadcast({
    type: 'world_flag_updated',
    key,
    value
  });
};

world.onItemSpawned = (item) => {
  broadcast({
    type: 'item_spawned',
    item
  });
};

world.onItemCollected = (itemId, collectorId, itemType, value) => {
  broadcast({
    type: 'item_collected',
    itemId,
    collectorId,
    itemType,
    value
  });
};

world.onPlayerStatsUpdated = (player) => {
  broadcast({
    type: 'player_stats_updated',
    id: player.id,
    health: player.health,
    maxHealth: player.maxHealth,
    coins: player.coins || 0,
    acorns: player.acorns || 0
  });
};

world.onBossEvent = (event) => {
  broadcast(event);
};

// 25Hz World Tick Loop for smooth player sync
setInterval(() => {
  if (world.players.size === 0) return;
  
  const playerUpdates = Array.from(world.players.values()).map(p => ({
    id: p.id,
    x: Math.round(p.x * 10) / 10,
    y: Math.round(p.y * 10) / 10,
    direction: p.direction,
    anim: p.anim,
    carryingItem: p.carryingItem
  }));

  broadcast({
    type: 'world_tick',
    players: playerUpdates,
    serverTime: Date.now()
  });
}, 40);

const server = Bun.serve<SocketData>({
  port: PORT,
  hostname: '0.0.0.0',
  fetch(req, s) {
    const url = new URL(req.url);

    // CORS Preflight
    if (req.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type'
        }
      });
    }

    if (url.pathname === '/health' || url.pathname === '/status') {
      return new Response(JSON.stringify({
        status: 'ok',
        onlinePlayers: world.players.size,
        entitiesCount: world.entities.size,
        uptime: process.uptime()
      }), {
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      });
    }

    // Asset Import Endpoint for Dev Suite
    if (url.pathname === '/api/import-asset' && req.method === 'POST') {
      return (async () => {
        try {
          const body: any = await req.json();
          const { name, dataUrl, category } = body;
          if (!name || !dataUrl) {
            return new Response(JSON.stringify({ error: 'Missing name or dataUrl' }), {
              status: 400,
              headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
            });
          }

          const base64Data = dataUrl.replace(/^data:image\/\w+;base64,/, '');
          const buffer = Buffer.from(base64Data, 'base64');

          const subDir = category === 'tile' ? 'tiles' : 'sprites';
          const targetDir = path.resolve(import.meta.dir, `../../assets/raw/${subDir}`);
          if (!fs.existsSync(targetDir)) fs.mkdirSync(targetDir, { recursive: true });

          const filePath = path.join(targetDir, `${name}.png`);
          fs.writeFileSync(filePath, buffer);

          // Also write to client public folder so it's instantly servable via HTTP
          const clientTargetDir = path.resolve(import.meta.dir, `../../client/public/assets/${subDir}`);
          if (!fs.existsSync(clientTargetDir)) fs.mkdirSync(clientTargetDir, { recursive: true });
          fs.writeFileSync(path.join(clientTargetDir, `${name}.png`), buffer);

          console.log(`[Asset Importer] Saved asset "${name}" to ${filePath}`);

          // Re-synchronize TypeScript definitions
          try {
            runAssetIngestion();
          } catch (e) {
            console.error('[Asset Importer] Failed to run asset ingestion:', e);
          }

          return new Response(JSON.stringify({ success: true, name, filePath }), {
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
          });
        } catch (err: any) {
          return new Response(JSON.stringify({ error: err.message }), {
            status: 500,
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
          });
        }
      })();
    }

    const clientId = `p_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 6)}`;
    const upgraded = s.upgrade(req, {
      data: {
        id: clientId,
        authenticated: false
      }
    });

    if (upgraded) return undefined;

    return new Response("BitQuest Multiplayer Server (Running on Bun)", {
      headers: { 'Content-Type': 'text/plain', 'Access-Control-Allow-Origin': '*' }
    });
  },
  websocket: {
    open(ws) {
      const id = ws.data.id;
      sockets.set(id, ws);
      console.log(`[Server] Player socket opened: ${id} (Total: ${sockets.size})`);
    },
    message(ws, rawMessage) {
      try {
        const id = ws.data.id;
        const msg: ClientPacket = JSON.parse(rawMessage.toString());

        switch (msg.type) {
          case 'join': {
            const player = world.addPlayer(id, msg.name, msg.color, msg.paletteIndex);
            ws.data.authenticated = true;

            // Send full initial state to joined player
            const initPacket: ServerPacket = {
              type: 'init',
              yourId: id,
              players: Array.from(world.players.values()),
              entities: Array.from(world.entities.values()),
              items: Array.from(world.items.values()),
              worldFlags: world.db.getAllFlags(),
              serverTime: Date.now()
            };
            ws.send(JSON.stringify(initPacket));

            // Announce new player to everyone else
            broadcast({
              type: 'player_joined',
              player
            }, id);

            console.log(`[Server] Player "${player.name}" (${id}) joined Oakhaven`);
            break;
          }

          case 'move': {
            world.updatePlayerMove(id, msg.x, msg.y, msg.direction, msg.anim, msg.carryingItem);
            break;
          }

          case 'interact': {
            world.handleInteract(id, msg.targetId, msg.action, msg.x, msg.y, msg.damage);

            // Handle NPC and Boss dialogues
            const entity = world.entities.get(msg.targetId);
            if (entity && (entity.type === 'npc' || entity.type === 'sign' || entity.type === 'wildlife' || entity.type === 'boss')) {
              const diagKey = entity.state.dialogueKey;
              if (diagKey && STARTER_DIALOGUES[diagKey]) {
                const node = STARTER_DIALOGUES[diagKey]['greeting'];
                if (node) {
                  ws.send(JSON.stringify({
                    type: 'dialogue_event',
                    npcId: msg.targetId,
                    speaker: node.speaker,
                    portrait: node.portrait || 'default',
                    text: node.text,
                    responses: node.responses
                  }));
                }
              }
            }
            break;
          }

          case 'dialogue_choice': {
            const entity = world.entities.get(msg.npcId);
            if (!entity) break;
            const diagKey = entity.state.dialogueKey;
            if (!diagKey || !STARTER_DIALOGUES[diagKey]) break;

            const current = STARTER_DIALOGUES[diagKey]['greeting']; // for now first-level responses
            const chosen = current?.responses?.[msg.choiceIndex];
            if (chosen) {
              if (chosen.action === 'pet_dog') {
                world.handleInteract(id, msg.npcId, 'pet');
                const emote = world.setPlayerEmote(id, 'heart');
                broadcast({ type: 'emote_broadcast', emote });
              }

              if (chosen.nextDialogueKey && STARTER_DIALOGUES[diagKey][chosen.nextDialogueKey]) {
                const nextNode = STARTER_DIALOGUES[diagKey][chosen.nextDialogueKey];
                ws.send(JSON.stringify({
                  type: 'dialogue_event',
                  npcId: msg.npcId,
                  speaker: nextNode.speaker,
                  portrait: nextNode.portrait || 'default',
                  text: nextNode.text,
                  responses: nextNode.responses
                }));
              }
            }
            break;
          }

          case 'chat': {
            if (!msg.text || !msg.text.trim()) break;
            const chatMsg = world.createChatMessage(id, msg.text.trim());
            broadcast({
              type: 'chat_broadcast',
              chat: chatMsg
            });
            break;
          }

          case 'emote': {
            const emoteEvent = world.setPlayerEmote(id, msg.emote);
            broadcast({
              type: 'emote_broadcast',
              emote: emoteEvent
            });
            break;
          }

          case 'collect_item': {
            world.collectItem(id, msg.itemId);
            break;
          }

          case 'admin_command': {
            world.handleAdminCommand(id, msg.action, msg.payload);
            break;
          }
        }
      } catch (err) {
        console.error('[Server] Failed to handle message:', err);
      }
    },
    close(ws) {
      const id = ws.data.id;
      sockets.delete(id);
      world.removePlayer(id);
      broadcast({
        type: 'player_left',
        id
      });
      console.log(`[Server] Player disconnected: ${id} (Remaining: ${sockets.size})`);
    }
  }
});

console.log(`🌲 BitQuest Server running on http://localhost:${PORT} (WebSocket ready)`);
