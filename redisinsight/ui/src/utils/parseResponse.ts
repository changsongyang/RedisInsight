import { find, map, sortBy, omit, forEach } from 'lodash'
import { ModifiedSentinelMaster } from 'uiSrc/slices/interfaces'
import { initialStateSentinelStatus } from 'uiSrc/slices/instances/sentinel'

import { AddSentinelMasterResponse } from 'apiSrc/modules/instances/dto/redis-sentinel.dto'
import { SentinelMaster } from 'apiSrc/modules/redis-sentinel/models/sentinel'

const DEFAULT_NODE_ID = 'standalone'

export const parseMastersSentinel = (
  masters: SentinelMaster[]
): ModifiedSentinelMaster[] => map(sortBy(masters, 'name'), (master, i) => ({
  ...initialStateSentinelStatus,
  ...master,
  id: `${i + 1}`,
  alias: '',
  username: '',
  password: '',
}))

export const parseAddedMastersSentinel = (
  masters: ModifiedSentinelMaster[],
  statuses: AddSentinelMasterResponse[]
): ModifiedSentinelMaster[] => sortBy(masters, 'message').map((master) => ({
  ...master,
  ...find(statuses, (status) => master.name === status.name),
  loading: false,
}))

export const parseKeysListResponse = (prevShards = {}, data = []) => {
  console.time('parse')
  const shards = { ...prevShards }

  const result = {
    nextCursor: '0',
    total: 0,
    scanned: 0,
    keys: [],
    shardsMeta: {}
  }

  data.forEach((node) => {
    const id = node.host ? `${node.host}:${node.port}` : DEFAULT_NODE_ID
    const shard = (() => {
      if (!shards[id]) {
        shards[id] = omit(node, 'keys')
      } else {
        shards[id] = {
          ...omit(node, 'keys'),
          scanned: shards[id].scanned + node.scanned,
        }
      }
      return shards[id]
    })()

    // summarize shard values
    if (shard.scanned > shard.total || shard.cursor === 0) {
      shard.scanned = shard.total
    }

    // result.keys.push(...node.keys)

    console.time('keys')
    node.keys = node.keys.map((key) => {
      // console.log('el', element)
      if(key.name.type === 'Buffer') {
        key.name = {
          type: 'Buffer',
          data: new Uint8Array(key.name.data),
        }
      }

      return key;
    })
    console.timeEnd('keys')

    result.keys = result.keys.concat(node.keys)
  })

  // summarize result numbers
  const nextCursor = []
  forEach(shards, (shard, id) => {
    result.total += shard.total
    result.scanned += shard.scanned

    // ignore already scanned shards on get more call
    if (shard.cursor === 0) {
      return
    }

    if (id === DEFAULT_NODE_ID) {
      nextCursor.push(shard.cursor)
    } else {
      nextCursor.push(`${id}@${shard.cursor}`)
    }
  })

  result.nextCursor = nextCursor.join('||') || '0'
  result.shardsMeta = shards
  console.timeEnd('parse')

  return result
}
